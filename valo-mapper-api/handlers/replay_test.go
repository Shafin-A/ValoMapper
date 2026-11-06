package handlers

import (
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"valo-mapper-api/middleware"
	"valo-mapper-api/replay"

	"github.com/gorilla/mux"
	"golang.org/x/time/rate"
)

type fakeReplayParser struct {
	available  bool
	maxBytes   int64
	envelope   *replay.Envelope
	parseErr   error
	parseCalls int
	lastHash   string
	cached     map[string]*replay.Envelope
	cachedGz   map[string][]byte
}

func (f *fakeReplayParser) Available() bool { return f.available }

func (f *fakeReplayParser) MaxUploadBytes() int64 {
	if f.maxBytes <= 0 {
		return 1 << 20
	}
	return f.maxBytes
}

func (f *fakeReplayParser) Parse(_ context.Context, filePath, hash string) (*replay.Envelope, error) {
	f.parseCalls++
	f.lastHash = hash
	if f.parseErr != nil {
		return nil, f.parseErr
	}
	return f.envelope, nil
}

func (f *fakeReplayParser) GetCached(id string) (*replay.Envelope, []byte, bool) {
	envelope, ok := f.cached[id]
	if !ok {
		return nil, nil, false
	}
	return envelope, f.cachedGz[id], true
}

func testEnvelope() *replay.Envelope {
	return &replay.Envelope{
		ReplayID: strings.Repeat("a", 64),
		Match: &replay.Match{
			MatchID:     "12345678-9ABC-DEF0-1122-334455667788",
			MapID:       "ascent",
			MapName:     "Ascent",
			QueueLabel:  "Replay",
			GameStartAt: "2024-01-01T00:00:00Z",
			TotalRounds: 1,
			Players:     []replay.Player{},
			Rounds:      []replay.Round{},
		},
	}
}

func magicContent(extra string) []byte {
	return append([]byte{0xDD, 0xEF, 0xF4, 0x43}, []byte(extra)...)
}

func multipartReplay(t *testing.T, fields ...multipartField) (*bytes.Buffer, string) {
	t.Helper()

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	for _, field := range fields {
		var part io.Writer
		var err error
		if field.filename == "" {
			part, err = writer.CreateFormField(field.name)
		} else {
			part, err = writer.CreateFormFile(field.name, field.filename)
		}
		if err != nil {
			t.Fatalf("create part: %v", err)
		}
		if _, err := part.Write(field.content); err != nil {
			t.Fatalf("write part: %v", err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart: %v", err)
	}
	return &body, writer.FormDataContentType()
}

type multipartField struct {
	name     string
	filename string
	content  []byte
}

func postReplay(t *testing.T, handler *ReplayHandler, body *bytes.Buffer, contentType string) *httptest.ResponseRecorder {
	t.Helper()
	request := httptest.NewRequest(http.MethodPost, "/api/replays", body)
	request.Header.Set("Content-Type", contentType)
	recorder := httptest.NewRecorder()
	handler.Post(recorder, request)
	return recorder
}

func TestReplayHandlerPostSuccess(t *testing.T) {
	tests := []struct {
		name             string
		acceptEncoding   string
		responseEncoding string
	}{
		{name: "plain", acceptEncoding: "", responseEncoding: ""},
		{name: "gzip", acceptEncoding: "gzip, deflate", responseEncoding: "gzip"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			parser := &fakeReplayParser{available: true, envelope: testEnvelope()}
			handler := NewReplayHandler(parser, WithParseRate(0, 0))
			content := magicContent("payload")
			body, contentType := multipartReplay(t, multipartField{
				name: "file", filename: "match.vrf", content: content,
			})

			request := httptest.NewRequest(http.MethodPost, "/api/replays", body)
			request.Header.Set("Content-Type", contentType)
			request.Header.Set("Accept-Encoding", test.acceptEncoding)
			recorder := httptest.NewRecorder()
			handler.Post(recorder, request)

			if recorder.Code != http.StatusOK {
				t.Fatalf("status = %d, body = %s", recorder.Code, recorder.Body.String())
			}
			if encoding := recorder.Header().Get("Content-Encoding"); encoding != test.responseEncoding {
				t.Errorf("Content-Encoding = %q, want %q", encoding, test.responseEncoding)
			}
			if handlerVersion := recorder.Header().Get("X-Parser-Version"); handlerVersion != replay.ParserVersion {
				t.Errorf("X-Parser-Version = %q", handlerVersion)
			}
			if cacheControl := recorder.Header().Get("Cache-Control"); cacheControl != "no-store" {
				t.Errorf("Cache-Control = %q", cacheControl)
			}

			sum := sha256.Sum256(content)
			wantHash := hex.EncodeToString(sum[:])
			if parser.lastHash != wantHash {
				t.Errorf("hash = %q, want %q", parser.lastHash, wantHash)
			}

			payload := recorder.Body.Bytes()
			if test.responseEncoding == "gzip" {
				reader, err := gzip.NewReader(bytes.NewReader(payload))
				if err != nil {
					t.Fatalf("gzip reader: %v", err)
				}
				payload, err = io.ReadAll(reader)
				if err != nil {
					t.Fatalf("gunzip: %v", err)
				}
			}

			var envelope replay.Envelope
			if err := json.Unmarshal(payload, &envelope); err != nil {
				t.Fatalf("decode response: %v", err)
			}
			if envelope.ReplayID != testEnvelope().ReplayID {
				t.Errorf("replayId = %q", envelope.ReplayID)
			}
		})
	}
}

func TestReplayHandlerPostRejectsBadInput(t *testing.T) {
	parser := &fakeReplayParser{available: true, envelope: testEnvelope(), maxBytes: 10}
	handler := NewReplayHandler(parser, WithParseRate(0, 0))

	tests := []struct {
		name       string
		fields     []multipartField
		wantStatus int
		wantCode   string
	}{
		{
			name:       "bad magic",
			fields:     []multipartField{{name: "file", filename: "match.vrf", content: []byte("NOPE")}},
			wantStatus: http.StatusBadRequest,
			wantCode:   string(replay.CodeNotAReplay),
		},
		{
			name:       "empty file",
			fields:     []multipartField{{name: "file", filename: "match.vrf", content: nil}},
			wantStatus: http.StatusBadRequest,
			wantCode:   string(replay.CodeNotAReplay),
		},
		{
			name:       "missing file",
			fields:     []multipartField{{name: "other", filename: "", content: []byte("x")}},
			wantStatus: http.StatusBadRequest,
			wantCode:   string(replay.CodeInvalidRequest),
		},
		{
			name: "second file",
			fields: []multipartField{
				{name: "file", filename: "one.vrf", content: magicContent("a")},
				{name: "file", filename: "two.vrf", content: magicContent("b")},
			},
			wantStatus: http.StatusBadRequest,
			wantCode:   string(replay.CodeInvalidRequest),
		},
		{
			name:       "too large",
			fields:     []multipartField{{name: "file", filename: "match.vrf", content: magicContent(strings.Repeat("x", 20))}},
			wantStatus: http.StatusRequestEntityTooLarge,
			wantCode:   string(replay.CodeTooLarge),
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			body, contentType := multipartReplay(t, test.fields...)
			recorder := postReplay(t, handler, body, contentType)

			if recorder.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d (body: %s)", recorder.Code, test.wantStatus, recorder.Body.String())
			}
			var response map[string]any
			if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
				t.Fatalf("decode error body: %v", err)
			}
			if response["code"] != test.wantCode {
				t.Errorf("code = %v, want %s", response["code"], test.wantCode)
			}
			if response["error"] == "" || response["error"] == nil {
				t.Errorf("error message is empty: %v", response)
			}
			if parser.parseCalls != 0 {
				t.Errorf("parser was called for an invalid upload")
			}
		})
	}
}

func TestReplayHandlerMapsParserErrors(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantStatus int
		wantCode   string
		retryAfter string
	}{
		{
			name:       "unsupported build",
			err:        replay.NewError(replay.CodeUnsupportedBuild, "", nil),
			wantStatus: http.StatusUnprocessableEntity,
			wantCode:   string(replay.CodeUnsupportedBuild),
		},
		{
			name:       "busy",
			err:        &replay.Error{Code: replay.CodeParserBusy, Message: replay.DefaultMessage(replay.CodeParserBusy), RetryAfter: 5 * time.Second},
			wantStatus: http.StatusServiceUnavailable,
			wantCode:   string(replay.CodeParserBusy),
			retryAfter: "5",
		},
		{
			name:       "unavailable",
			err:        replay.NewError(replay.CodeParserUnavailable, "", nil),
			wantStatus: http.StatusServiceUnavailable,
			wantCode:   string(replay.CodeParserUnavailable),
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			parser := &fakeReplayParser{available: true, parseErr: test.err}
			handler := NewReplayHandler(parser, WithParseRate(0, 0))
			body, contentType := multipartReplay(t, multipartField{
				name: "file", filename: "match.vrf", content: magicContent("x"),
			})
			recorder := postReplay(t, handler, body, contentType)

			if recorder.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, test.wantStatus)
			}
			var response map[string]any
			if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
				t.Fatalf("decode body: %v", err)
			}
			if response["code"] != test.wantCode {
				t.Errorf("code = %v, want %s", response["code"], test.wantCode)
			}
			if got := recorder.Header().Get("Retry-After"); got != test.retryAfter {
				t.Errorf("Retry-After = %q, want %q", got, test.retryAfter)
			}
		})
	}
}

func TestReplayHandlerUnavailable(t *testing.T) {
	handler := NewReplayHandler(&fakeReplayParser{available: false}, WithParseRate(0, 0))
	body, contentType := multipartReplay(t, multipartField{
		name: "file", filename: "match.vrf", content: magicContent("x"),
	})
	recorder := postReplay(t, handler, body, contentType)

	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d", recorder.Code)
	}
	var response map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if response["code"] != string(replay.CodeParserUnavailable) {
		t.Errorf("code = %v", response["code"])
	}
}

func TestReplayHandlerRateLimited(t *testing.T) {
	handler := NewReplayHandler(&fakeReplayParser{available: true, envelope: testEnvelope()}, WithParseRate(0, 0))
	handler.limiter = middleware.NewIPRateLimiter(rate.Limit(0), 0)

	body, contentType := multipartReplay(t, multipartField{
		name: "file", filename: "match.vrf", content: magicContent("x"),
	})
	recorder := postReplay(t, handler, body, contentType)

	if recorder.Code != http.StatusTooManyRequests {
		t.Fatalf("status = %d", recorder.Code)
	}
	if recorder.Header().Get("Retry-After") == "" {
		t.Error("Retry-After header is missing")
	}
	var response map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if response["code"] != string(replay.CodeRateLimited) {
		t.Errorf("code = %v", response["code"])
	}
}

func TestReplayHandlerRateLimitedDrainsUpload(t *testing.T) {
	handler := NewReplayHandler(&fakeReplayParser{available: true, envelope: testEnvelope()}, WithParseRate(0, 0))
	handler.limiter = middleware.NewIPRateLimiter(rate.Limit(0), 0)

	body, contentType := multipartReplay(t, multipartField{
		name: "file", filename: "match.vrf",
		content: magicContent(strings.Repeat("x", 128<<10)),
	})
	reader := &countingReadCloser{reader: bytes.NewReader(body.Bytes())}
	request := httptest.NewRequest(http.MethodPost, "/api/replays", nil)
	request.Body = reader
	request.ContentLength = int64(body.Len())
	request.Header.Set("Content-Type", contentType)
	recorder := httptest.NewRecorder()

	handler.Post(recorder, request)

	if recorder.Code != http.StatusTooManyRequests {
		t.Fatalf("status = %d, want 429", recorder.Code)
	}
	if reader.read != body.Len() {
		t.Fatalf("drained %d of %d body bytes; the client may see a network error",
			reader.read, body.Len())
	}
}

type countingReadCloser struct {
	reader io.Reader
	read   int
}

func (c *countingReadCloser) Read(p []byte) (int, error) {
	n, err := c.reader.Read(p)
	c.read += n
	return n, err
}

func (c *countingReadCloser) Close() error { return nil }

func TestReplayHandlerGet(t *testing.T) {
	envelope := testEnvelope()
	gz, err := gzipBytes([]byte(`{"replayId":"` + envelope.ReplayID + `","match":null}`))
	if err != nil {
		t.Fatalf("gzip: %v", err)
	}

	parser := &fakeReplayParser{
		available: true,
		cached:    map[string]*replay.Envelope{envelope.ReplayID: envelope},
		cachedGz:  map[string][]byte{envelope.ReplayID: gz},
	}
	handler := NewReplayHandler(parser, WithParseRate(0, 0))

	tests := []struct {
		name             string
		acceptEncoding   string
		responseEncoding string
	}{
		{name: "gzip", acceptEncoding: "gzip", responseEncoding: "gzip"},
		{name: "plain", acceptEncoding: "", responseEncoding: ""},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, "/api/replays/"+envelope.ReplayID, nil)
			request.Header.Set("Accept-Encoding", test.acceptEncoding)
			request = mux.SetURLVars(request, map[string]string{"id": envelope.ReplayID})
			recorder := httptest.NewRecorder()

			handler.Get(recorder, request)

			if recorder.Code != http.StatusOK {
				t.Fatalf("status = %d (body: %s)", recorder.Code, recorder.Body.String())
			}
			if encoding := recorder.Header().Get("Content-Encoding"); encoding != test.responseEncoding {
				t.Errorf("Content-Encoding = %q, want %q", encoding, test.responseEncoding)
			}
			payload := recorder.Body.Bytes()
			if test.responseEncoding == "gzip" {
				reader, err := gzip.NewReader(bytes.NewReader(payload))
				if err != nil {
					t.Fatalf("gzip reader: %v", err)
				}
				payload, err = io.ReadAll(reader)
				if err != nil {
					t.Fatalf("gunzip: %v", err)
				}
			}
			var decoded map[string]any
			if err := json.Unmarshal(payload, &decoded); err != nil {
				t.Fatalf("decode body: %v", err)
			}
			if decoded["replayId"] != envelope.ReplayID {
				t.Errorf("replayId = %v", decoded["replayId"])
			}
		})
	}
}

func TestReplayHandlerGetNotFound(t *testing.T) {
	handler := NewReplayHandler(&fakeReplayParser{available: true}, WithParseRate(0, 0))
	request := httptest.NewRequest(http.MethodGet, "/api/replays/"+strings.Repeat("f", 64), nil)
	request = mux.SetURLVars(request, map[string]string{"id": strings.Repeat("f", 64)})
	recorder := httptest.NewRecorder()

	handler.Get(recorder, request)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("status = %d", recorder.Code)
	}
	var response map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if response["code"] != string(replay.CodeNotFound) {
		t.Errorf("code = %v", response["code"])
	}
}
