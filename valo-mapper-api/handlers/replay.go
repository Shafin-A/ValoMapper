package handlers

import (
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"valo-mapper-api/middleware"
	"valo-mapper-api/replay"
	"valo-mapper-api/utils"

	"github.com/gorilla/mux"
	"golang.org/x/time/rate"
)

const (
	replayUploadReadDeadline  = 5 * time.Minute
	replayUploadWriteDeadline = 5 * time.Minute
	replayMultipartSlack      = 1 << 20
	replayParseBudget         = 10 * time.Minute
	replayParseBurst          = 3
)

var replayMagic = []byte{0xDD, 0xEF, 0xF4, 0x43}

// ReplayParser is the handler's view of replay.Service. Keeping it an interface
// lets HTTP tests use a fake without VRFKit or Parquet.
type ReplayParser interface {
	Available() bool
	MaxUploadBytes() int64
	Parse(ctx context.Context, filePath, hash string) (*replay.Envelope, error)
	GetCached(id string) (*replay.Envelope, []byte, bool)
}

type ReplayHandler struct {
	parser  ReplayParser
	limiter *middleware.IPRateLimiter
}

type ReplayHandlerOption func(*ReplayHandler)

// WithParseRate overrides the per-IP parse budget. Tests use a high rate; the
// default is 3 parses per 10 minutes with a burst of 3.
func WithParseRate(limit rate.Limit, burst int) ReplayHandlerOption {
	return func(h *ReplayHandler) {
		if limit <= 0 || burst <= 0 {
			h.limiter = nil
			return
		}
		h.limiter = middleware.NewIPRateLimiter(limit, burst)
	}
}

func NewReplayHandler(parser ReplayParser, options ...ReplayHandlerOption) *ReplayHandler {
	handler := &ReplayHandler{
		parser:  parser,
		limiter: middleware.NewIPRateLimiter(rate.Every(replayParseBudget/replayParseBurst), replayParseBurst),
	}
	for _, option := range options {
		option(handler)
	}
	return handler
}

// Post accepts exactly one multipart file part named "file" and streams it to a
// temp file while hashing. VRFKit never sees the client filename.
func (h *ReplayHandler) Post(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r)

	if h.parser == nil || !h.parser.Available() {
		h.sendError(w, requestID, replay.NewError(replay.CodeParserUnavailable, "", nil))
		return
	}

	if h.limiter != nil && !h.limiter.GetLimiter(middleware.GetIP(r)).Allow() {
		h.sendError(w, requestID, &replay.Error{
			Code:       replay.CodeRateLimited,
			Message:    replay.DefaultMessage(replay.CodeRateLimited),
			RetryAfter: 60 * time.Second,
		})
		return
	}

	controller := http.NewResponseController(w)
	_ = controller.SetReadDeadline(time.Now().Add(replayUploadReadDeadline))
	_ = controller.SetWriteDeadline(time.Now().Add(replayUploadWriteDeadline))

	maxBytes := h.parser.MaxUploadBytes()
	if maxBytes <= 0 {
		maxBytes = 250 << 20
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBytes+replayMultipartSlack)
	reader, err := r.MultipartReader()
	if err != nil {
		h.sendError(w, requestID, replay.NewError(replay.CodeInvalidRequest, "", err))
		return
	}

	tempDir, err := os.MkdirTemp("", "valomapper-replay-*")
	if err != nil {
		h.sendError(w, requestID, replay.NewError(replay.CodeInternal, "", err))
		return
	}
	defer os.RemoveAll(tempDir)

	var filePath, hash string
	fileSeen := false

	for {
		part, err := reader.NextPart()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			h.sendError(w, requestID, mapMultipartReadError(err))
			return
		}

		if part.FileName() == "" {
			_ = part.Close()
			continue
		}
		if fileSeen {
			_ = part.Close()
			h.sendError(w, requestID, replay.NewError(replay.CodeInvalidRequest,
				"Upload exactly one replay file.", nil))
			return
		}
		fileSeen = true

		filePath, hash, err = saveReplayUpload(part, tempDir, maxBytes)
		_ = part.Close()
		if err != nil {
			h.sendError(w, requestID, err)
			return
		}
	}

	if !fileSeen {
		h.sendError(w, requestID, replay.NewError(replay.CodeInvalidRequest,
			"The request did not contain a replay file.", nil))
		return
	}

	started := time.Now()
	envelope, err := h.parser.Parse(r.Context(), filePath, hash)
	if err != nil {
		if errors.Is(err, context.Canceled) {
			slog.Info("replay upload cancelled", "request_id", requestID,
				"replay_hash_prefix", hashPrefix(hash))
			return
		}
		h.sendError(w, requestID, err)
		return
	}

	writeReplayEnvelope(w, r, requestID, envelope, nil, time.Since(started).Milliseconds())
}

// Get is the reload fallback. It only reads the short-TTL LRU cache; it never
// re-parses or touches disk.
func (h *ReplayHandler) Get(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r)

	if h.parser == nil || !h.parser.Available() {
		h.sendError(w, requestID, replay.NewError(replay.CodeParserUnavailable, "", nil))
		return
	}

	id := strings.ToLower(strings.TrimSpace(mux.Vars(r)["id"]))
	if len(id) != 64 || !isLowerHex(id) {
		h.sendError(w, requestID, replay.NewError(replay.CodeNotFound, "", nil))
		return
	}

	envelope, gz, ok := h.parser.GetCached(id)
	if !ok || envelope == nil {
		h.sendError(w, requestID, replay.NewError(replay.CodeNotFound, "", nil))
		return
	}

	writeReplayEnvelope(w, r, requestID, envelope, gz, -1)
}

func saveReplayUpload(part *multipart.Part, dir string, maxBytes int64) (string, string, error) {
	path := filepath.Join(dir, "replay.vrf")
	file, err := os.Create(path)
	if err != nil {
		return "", "", replay.NewError(replay.CodeInternal, "", err)
	}
	defer file.Close()

	header := make([]byte, len(replayMagic))
	read, err := io.ReadFull(part, header)
	if err != nil {
		if errors.Is(err, io.EOF) || errors.Is(err, io.ErrUnexpectedEOF) {
			return "", "", replay.NewError(replay.CodeNotAReplay, "", err)
		}
		return "", "", replay.NewError(replay.CodeInvalidRequest, "", err)
	}
	if read != len(replayMagic) || !bytes.Equal(header, replayMagic) {
		return "", "", replay.NewError(replay.CodeNotAReplay, "", nil)
	}

	hasher := sha256.New()
	written, err := file.Write(header)
	if err != nil {
		return "", "", replay.NewError(replay.CodeInternal, "", err)
	}
	_, _ = hasher.Write(header)

	copied, err := io.Copy(io.MultiWriter(file, hasher), io.LimitReader(part, maxBytes+1-int64(written)))
	written += int(copied)
	if err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			return "", "", replay.NewError(replay.CodeTooLarge, "", err)
		}
		return "", "", replay.NewError(replay.CodeInvalidRequest, "", err)
	}
	if int64(written) > maxBytes {
		return "", "", replay.NewError(replay.CodeTooLarge, "", nil)
	}

	if err := file.Close(); err != nil {
		return "", "", replay.NewError(replay.CodeInternal, "", err)
	}

	return path, hex.EncodeToString(hasher.Sum(nil)), nil
}

func mapMultipartReadError(err error) *replay.Error {
	var maxErr *http.MaxBytesError
	if errors.As(err, &maxErr) {
		return replay.NewError(replay.CodeTooLarge, "", err)
	}
	if errors.Is(err, multipart.ErrMessageTooLarge) {
		return replay.NewError(replay.CodeTooLarge, "", err)
	}
	return replay.NewError(replay.CodeInvalidRequest, "", err)
}

func (h *ReplayHandler) sendError(w http.ResponseWriter, requestID string, err error) {
	replayErr, ok := replay.AsError(err)
	if !ok {
		replayErr = replay.NewError(replay.CodeInternal, "", err)
	}
	utils.SendJSONError(w, &utils.HTTPError{
		Status:     replay.HTTPStatus(replayErr.Code),
		Message:    replayErr.Message,
		Err:        replayErr.Err,
		Code:       string(replayErr.Code),
		RetryAfter: replayErr.RetryAfter,
	}, requestID)
}

func writeReplayEnvelope(
	w http.ResponseWriter,
	r *http.Request,
	requestID string,
	envelope *replay.Envelope,
	gz []byte,
	parseMS int64,
) {
	body := gz
	encoding := ""
	if len(body) == 0 {
		encoded, err := json.Marshal(envelope)
		if err != nil {
			utils.SendJSONError(w, utils.NewInternal("Failed to encode replay", err), requestID)
			return
		}
		if acceptsGzip(r) {
			body, err = gzipBytes(encoded)
			if err != nil {
				utils.SendJSONError(w, utils.NewInternal("Failed to encode replay", err), requestID)
				return
			}
			encoding = "gzip"
		} else {
			body = encoded
		}
	} else if acceptsGzip(r) {
		encoding = "gzip"
	} else {
		decoded, err := gunzipBytes(gz)
		if err != nil {
			utils.SendJSONError(w, utils.NewInternal("Failed to decode cached replay", err), requestID)
			return
		}
		body = decoded
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Vary", "Accept-Encoding")
	w.Header().Set("X-Parser-Version", replay.ParserVersion)
	w.Header().Set("X-Request-ID", requestID)
	if parseMS >= 0 {
		w.Header().Set("X-Replay-Parse-Ms", strconv.FormatInt(parseMS, 10))
	}
	if encoding != "" {
		w.Header().Set("Content-Encoding", encoding)
	}

	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(body)
}

func acceptsGzip(r *http.Request) bool {
	for _, token := range strings.Split(r.Header.Get("Accept-Encoding"), ",") {
		parts := strings.Split(strings.TrimSpace(token), ";")
		if !strings.EqualFold(strings.TrimSpace(parts[0]), "gzip") {
			continue
		}
		if len(parts) > 1 {
			quality := strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(parts[1]), "q="))
			if quality == "0" || quality == "0.0" || quality == "0.00" || quality == "0.000" {
				return false
			}
		}
		return true
	}
	return false
}

func gzipBytes(data []byte) ([]byte, error) {
	var buffer bytes.Buffer
	writer := gzip.NewWriter(&buffer)
	if _, err := writer.Write(data); err != nil {
		_ = writer.Close()
		return nil, err
	}
	if err := writer.Close(); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}

func gunzipBytes(data []byte) ([]byte, error) {
	reader, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	defer reader.Close()
	return io.ReadAll(reader)
}

func isLowerHex(value string) bool {
	for _, char := range value {
		if (char < '0' || char > '9') && (char < 'a' || char > 'f') {
			return false
		}
	}
	return true
}

func hashPrefix(hash string) string {
	if len(hash) > 12 {
		return hash[:12]
	}
	return hash
}
