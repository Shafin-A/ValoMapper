package replay

import (
	"sync"
	"sync/atomic"
	"time"
)

// Metrics is a point-in-time snapshot of replay parsing and cache counters. It
// is safe to serialize directly into the observability endpoint.
type Metrics struct {
	ParsesStarted   uint64            `json:"parses_started"`
	ParsesSucceeded uint64            `json:"parses_succeeded"`
	ParsesFailed    map[string]uint64 `json:"parses_failed,omitempty"`
	CacheHits       uint64            `json:"cache_hits"`
	CacheMisses     uint64            `json:"cache_misses"`
	CacheEvictions  uint64            `json:"cache_evictions"`
	CacheEntries    int               `json:"cache_entries"`
	CacheBytes      int64             `json:"cache_bytes"`
	ParserBusy      uint64            `json:"parser_busy"`
	RateLimited     uint64            `json:"rate_limited"`
	TotalParseMS    uint64            `json:"total_parse_ms"`
	LastJSONBytes   int64             `json:"last_json_bytes"`
	LastGzipBytes   int64             `json:"last_gzip_bytes"`
}

type serviceMetrics struct {
	parsesStarted   atomic.Uint64
	parsesSucceeded atomic.Uint64
	parserBusy      atomic.Uint64
	rateLimited     atomic.Uint64
	totalParseMS    atomic.Uint64
	lastJSONBytes   atomic.Int64
	lastGzipBytes   atomic.Int64

	failedMu sync.Mutex
	failed   map[Code]uint64
}

func newServiceMetrics() *serviceMetrics {
	return &serviceMetrics{failed: make(map[Code]uint64)}
}

func (m *serviceMetrics) startParse() {
	if m == nil {
		return
	}
	m.parsesStarted.Add(1)
}

func (m *serviceMetrics) finishParse(jsonBytes, gzipBytes int, elapsed time.Duration) {
	if m == nil {
		return
	}
	m.parsesSucceeded.Add(1)
	m.totalParseMS.Add(uint64(elapsed.Milliseconds()))
	m.lastJSONBytes.Store(int64(jsonBytes))
	m.lastGzipBytes.Store(int64(gzipBytes))
}

func (m *serviceMetrics) failParse(code Code) {
	if m == nil {
		return
	}
	m.failedMu.Lock()
	m.failed[code]++
	m.failedMu.Unlock()
}

func (m *serviceMetrics) recordParserBusy() {
	if m == nil {
		return
	}
	m.parserBusy.Add(1)
}

func (m *serviceMetrics) recordRateLimited() {
	if m == nil {
		return
	}
	m.rateLimited.Add(1)
}

func (m *serviceMetrics) snapshot(cache *replayCache) Metrics {
	snapshot := Metrics{}
	if m != nil {
		snapshot.ParsesStarted = m.parsesStarted.Load()
		snapshot.ParsesSucceeded = m.parsesSucceeded.Load()
		snapshot.ParserBusy = m.parserBusy.Load()
		snapshot.RateLimited = m.rateLimited.Load()
		snapshot.TotalParseMS = m.totalParseMS.Load()
		snapshot.LastJSONBytes = m.lastJSONBytes.Load()
		snapshot.LastGzipBytes = m.lastGzipBytes.Load()

		m.failedMu.Lock()
		if len(m.failed) > 0 {
			snapshot.ParsesFailed = make(map[string]uint64, len(m.failed))
			for code, count := range m.failed {
				snapshot.ParsesFailed[string(code)] = count
			}
		}
		m.failedMu.Unlock()
	}
	if cache != nil {
		stats := cache.stats()
		snapshot.CacheHits = stats.hits
		snapshot.CacheMisses = stats.misses
		snapshot.CacheEvictions = stats.evictions
		snapshot.CacheEntries = stats.entries
		snapshot.CacheBytes = stats.bytes
	}
	return snapshot
}

func countUtilityIntervals(utilities [][]Utility) int {
	total := 0
	for _, roundUtilities := range utilities {
		total += len(roundUtilities)
	}
	return total
}

// Metrics returns the replay service's current counters. It never mutates the
// cache or starts a parse.
func (s *Service) Metrics() Metrics {
	if s == nil {
		return Metrics{}
	}
	return s.metrics.snapshot(s.cache)
}

// RecordRateLimited counts a request rejected by the replay HTTP rate limiter.
func (s *Service) RecordRateLimited() {
	if s == nil {
		return
	}
	s.metrics.recordRateLimited()
}
