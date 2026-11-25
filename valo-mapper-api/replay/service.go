package replay

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"golang.org/x/sync/singleflight"

	"valo-mapper-api/valorant"
)

const (
	defaultParseTimeout  = 3 * time.Minute
	defaultQueueWait     = 30 * time.Second
	defaultMaxUploadSize = 250 << 20
	defaultMaxConcurrent = 1
)

// Config is the replay service's deployment knobs; the zero value uses the
// production defaults. Tests override Exporter to avoid VRFKit.
type Config struct {
	VRFKitBin       string
	InspectTimeout  time.Duration
	ExportTimeout   time.Duration
	ParseTimeout    time.Duration
	QueueWait       time.Duration
	MaxUploadBytes  int64
	CacheTTL        time.Duration
	CacheMaxEntries int
	CacheMaxBytes   int64
	MaxConcurrent   int
	FrameHz         int
	Exporter        Exporter
}

// Service orchestrates inspect -> export -> normalise -> gzip cache. It owns no
// HTTP and returns replay.Error values the handler can map directly.
type Service struct {
	exporter Exporter
	cache    *replayCache
	group    singleflight.Group
	sem      chan struct{}
	config   Config
	metrics  *serviceMetrics
}

func NewService(config Config) *Service {
	if config.ParseTimeout <= 0 {
		config.ParseTimeout = defaultParseTimeout
	}
	if config.QueueWait <= 0 {
		config.QueueWait = defaultQueueWait
	}
	if config.MaxUploadBytes <= 0 {
		config.MaxUploadBytes = defaultMaxUploadSize
	}
	if config.MaxConcurrent <= 0 {
		config.MaxConcurrent = defaultMaxConcurrent
	}
	frameHz, valid := NormaliseFrameHz(config.FrameHz)
	if !valid {
		slog.Warn("unsupported replay frame rate; using the default",
			"requested_hz", config.FrameHz,
			"frame_hz", frameHz,
		)
	}
	config.FrameHz = frameHz

	exporter := config.Exporter
	if exporter == nil {
		exporter = NewVRFKit(config.VRFKitBin, config.InspectTimeout, config.ExportTimeout)
	}

	service := &Service{
		exporter: exporter,
		cache:    newReplayCache(config.CacheTTL, config.CacheMaxEntries, config.CacheMaxBytes),
		sem:      make(chan struct{}, config.MaxConcurrent),
		config:   config,
		metrics:  newServiceMetrics(),
	}

	if !service.Available() {
		slog.Warn("vrfkit is not available; replay parsing is disabled", "bin", config.VRFKitBin)
	}
	return service
}

func (s *Service) Available() bool {
	if s == nil || s.exporter == nil {
		return false
	}
	if vrfkit, ok := s.exporter.(*VRFKit); ok {
		return vrfkit.Available()
	}
	return true
}

func (s *Service) MaxUploadBytes() int64 {
	if s == nil || s.config.MaxUploadBytes <= 0 {
		return defaultMaxUploadSize
	}
	return s.config.MaxUploadBytes
}

// cacheKey binds a cached body to the normaliser version and the frame rate.
// A parser bump or a rate change must never serve a stale timeline.
func (s *Service) cacheKey(hash string) string {
	return fmt.Sprintf("%s:%s:%d", hash, ParserVersion, s.config.FrameHz)
}

// GetCached returns a parsed replay from the short-lived cache. gz is the exact
// gzip body to write for a GET; env is supplied for callers that need a struct.
func (s *Service) GetCached(id string) (*Envelope, []byte, bool) {
	if s == nil {
		return nil, nil, false
	}
	key := s.cacheKey(id)
	gz, ok := s.cache.get(key)
	if !ok {
		return nil, nil, false
	}
	envelope, err := decodeEnvelope(gz)
	if err != nil {
		s.cache.delete(key)
		return nil, nil, false
	}
	return envelope, gz, true
}

// Parse normalises the uploaded file at filePath. hash is the SHA-256 of the
// file and doubles as replayId. Concurrent uploads of the same hash share one
// parse.
func (s *Service) Parse(ctx context.Context, filePath, hash string) (*Envelope, error) {
	if s == nil || !s.Available() {
		return nil, NewError(CodeParserUnavailable, "", nil)
	}
	if hash == "" {
		return nil, NewError(CodeInternal, "The replay id could not be computed.", nil)
	}

	if envelope, _, ok := s.GetCached(hash); ok {
		slog.Info("replay cache hit",
			"replay_hash_prefix", hashPrefix(hash),
			"parser_version", ParserVersion,
		)
		return envelope, nil
	}

	result, err, _ := s.group.Do(s.cacheKey(hash), func() (any, error) {
		if envelope, _, ok := s.GetCached(hash); ok {
			slog.Info("replay cache hit",
				"replay_hash_prefix", hashPrefix(hash),
				"parser_version", ParserVersion,
			)
			return envelope, nil
		}

		if err := s.acquire(ctx); err != nil {
			return nil, err
		}
		defer func() { <-s.sem }()

		parseCtx, cancel := context.WithTimeout(ctx, s.config.ParseTimeout)
		defer cancel()

		envelope, gz, _, err := s.parseOnce(parseCtx, filePath, hash)
		if err != nil {
			return nil, err
		}
		s.cache.put(s.cacheKey(hash), gz)
		return envelope, nil
	})
	if err != nil {
		return nil, err
	}
	envelope, ok := result.(*Envelope)
	if !ok || envelope == nil {
		return nil, NewError(CodeInternal, "", nil)
	}
	return envelope, nil
}

func (s *Service) acquire(ctx context.Context) error {
	timer := time.NewTimer(s.config.QueueWait)
	defer timer.Stop()

	select {
	case s.sem <- struct{}{}:
		return nil
	case <-timer.C:
		s.metrics.recordParserBusy()
		return &Error{
			Code:       CodeParserBusy,
			Message:    DefaultMessage(CodeParserBusy),
			RetryAfter: 5 * time.Second,
		}
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (s *Service) parseOnce(ctx context.Context, filePath, hash string) (envelope *Envelope, gz []byte, jsonBytes int, parseErr *Error) {
	started := time.Now()
	s.metrics.startParse()
	defer func() {
		if parseErr != nil {
			s.metrics.failParse(parseErr.Code)
		}
	}()

	var inputBytes int64
	if fileInfo, statErr := os.Stat(filePath); statErr == nil {
		inputBytes = fileInfo.Size()
	}

	exportDir, err := os.MkdirTemp(filepath.Dir(filePath), "export-*")
	if err != nil {
		return nil, nil, 0, NewError(CodeInternal, "", err)
	}
	defer func() { _ = os.RemoveAll(exportDir) }()

	inspectStarted := time.Now()
	inspect, err := s.exporter.Inspect(ctx, filePath)
	if err != nil {
		return nil, nil, 0, asReplayError(err, CodeParseFailed)
	}
	inspectDuration := time.Since(inspectStarted)

	build := inspect.Build
	if build == "" {
		return nil, nil, 0, NewError(CodeParseFailed,
			"The replay's game build could not be determined.", nil)
	}
	if !valorant.IsSupportedBuild(build) {
		return nil, nil, 0, NewError(CodeUnsupportedBuild,
			fmt.Sprintf("This replay was recorded on game build %s, which is not supported yet.", build), nil)
	}

	exportStarted := time.Now()
	if err := s.exporter.Export(ctx, filePath, exportDir); err != nil {
		return nil, nil, 0, asReplayError(err, CodeParseFailed)
	}
	exportDuration := time.Since(exportStarted)

	sources, sourceErr := scanReplaySources(exportDir, s.config.FrameHz)
	if sourceErr != nil {
		return nil, nil, 0, sourceErr
	}
	manifest := sources.manifest
	quality := sources.quality
	warnings := sources.warnings
	agents := sources.agents
	index := sources.index
	fields := sources.fields
	events := sources.events
	players := sources.players
	puuidBySubject := sources.puuidBySubject
	state := sources.state
	windows := sources.windows
	movement := sources.movement
	mapInfo := sources.mapInfo
	fieldsDuration := sources.fieldsDuration
	eventsDuration := sources.eventsDuration
	stateDuration := sources.stateDuration
	movementDuration := sources.movementDuration

	logs := buildRoundLogs(windows, players, index, events, fields, state, warnings)
	applyRoundStats(windows, players, index, puuidBySubject, state, &fields.State, logs, warnings)
	spike := buildSpikeTimeline(fields, state, index, windows, events, warnings)
	utilities, utilityWarnings, utilityCount, utilitiesDuration, utilityErr := scanReplayUtilities(
		exportDir,
		build,
		manifest.DurationMS,
		windows,
		index,
		puuidBySubject,
		state,
		fields,
		agents,
		movement,
	)
	if utilityErr != nil {
		return nil, nil, 0, utilityErr
	}

	framesStarted := time.Now()
	framesByRound, timeline := buildTimelineFrames(
		players, puuidBySubject, windows, movement, state, logs, spike, warnings,
	)

	rounds := buildReplayRounds(windows, framesByRound, utilities, logs, players)
	framesDuration := time.Since(framesStarted)

	match := buildReplayMatch(
		manifest,
		mapInfo,
		build,
		players,
		rounds,
		warnings,
		utilityWarnings,
	)

	envelope = &Envelope{
		ReplayID: hash,
		Match:    match,
		Warnings: match.Warnings,
	}

	gzipStarted := time.Now()
	encoded, err := json.Marshal(envelope)
	if err != nil {
		return nil, nil, 0, NewError(CodeInternal, "", err)
	}
	gz, err = gzipBytes(encoded)
	if err != nil {
		return nil, nil, 0, NewError(CodeInternal, "", err)
	}
	gzipDuration := time.Since(gzipStarted)

	parseReport{
		hash:              hash,
		inputBytes:        inputBytes,
		build:             build,
		frameHz:           s.config.FrameHz,
		playerCount:       len(players),
		started:           started,
		inspectDuration:   inspectDuration,
		exportDuration:    exportDuration,
		fieldsDuration:    fieldsDuration,
		eventsDuration:    eventsDuration,
		stateDuration:     stateDuration,
		movementDuration:  movementDuration,
		utilitiesDuration: utilitiesDuration,
		framesDuration:    framesDuration,
		gzipDuration:      gzipDuration,
		rounds:            len(rounds),
		timeline:          timeline,
		movement:          movement,
		state:             state,
		spike:             spike,
		utilityCount:      utilityCount,
		utilityWarnings:   utilityWarnings,
		encoded:           encoded,
		gz:                gz,
		quality:           quality,
	}.log()

	s.metrics.finishParse(len(encoded), len(gz), time.Since(started))
	return envelope, gz, len(encoded), nil
}

func asReplayError(err error, fallback Code) *Error {
	if replayErr, ok := AsError(err); ok {
		return replayErr
	}
	return NewError(fallback, "", err)
}

func decodeEnvelope(gz []byte) (*Envelope, error) {
	reader, err := gzip.NewReader(bytes.NewReader(gz))
	if err != nil {
		return nil, err
	}
	defer func() { _ = reader.Close() }()

	var envelope Envelope
	if err := json.NewDecoder(reader).Decode(&envelope); err != nil {
		return nil, err
	}
	return &envelope, nil
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

func matchID(guid [4]uint32) string {
	return fmt.Sprintf("%08X-%04X-%04X-%04X-%04X%08X",
		guid[0], guid[1]>>16, guid[1]&0xffff, guid[2]>>16, guid[2]&0xffff, guid[3])
}

func gameStartAt(ticks uint64) string {
	const epochTicks = uint64(621355968000000000)
	if ticks <= epochTicks {
		return ""
	}
	delta := ticks - epochTicks
	seconds := int64(delta / 10_000_000)
	nanos := int64(delta%10_000_000) * 100
	return time.Unix(seconds, nanos).UTC().Format(time.RFC3339Nano)
}

func hashPrefix(hash string) string {
	if len(hash) > 12 {
		return hash[:12]
	}
	return hash
}

// CleanStaleTempDirs removes upload/export directories left by a crash. Called
// once at startup; an active request is never old enough to match.
func CleanStaleTempDirs(maxAge time.Duration) {
	if maxAge <= 0 {
		maxAge = time.Hour
	}
	entries, err := filepath.Glob(filepath.Join(os.TempDir(), "valomapper-replay-*"))
	if err != nil {
		return
	}
	cutoff := time.Now().Add(-maxAge)
	for _, entry := range entries {
		info, err := os.Stat(entry)
		if err != nil || !info.IsDir() {
			continue
		}
		if info.ModTime().Before(cutoff) {
			_ = os.RemoveAll(entry)
		}
	}
}
