package replay

import (
	"context"
	"strings"
	"testing"
	"time"
)

func TestServiceMetricsRecordParseAndCache(t *testing.T) {
	exporter := &fakeExporter{
		build: "13.08",
		export: func(dir string) error {
			writeSyntheticExport(t, dir)
			return nil
		},
	}
	service := newTestService(exporter)
	hash := strings.Repeat("a", 64)
	file := testFilePath(t)

	if _, err := service.Parse(context.Background(), file, hash); err != nil {
		t.Fatalf("first Parse: %v", err)
	}
	metrics := service.Metrics()
	if metrics.ParsesStarted != 1 || metrics.ParsesSucceeded != 1 {
		t.Fatalf("parse counters = %d/%d, want 1/1",
			metrics.ParsesStarted, metrics.ParsesSucceeded)
	}
	if len(metrics.ParsesFailed) != 0 {
		t.Fatalf("failed parses = %v, want none", metrics.ParsesFailed)
	}
	if metrics.CacheMisses == 0 || metrics.CacheHits != 0 {
		t.Fatalf("cache hits/misses = %d/%d, want 0/non-zero",
			metrics.CacheHits, metrics.CacheMisses)
	}
	if metrics.LastJSONBytes <= 0 || metrics.LastGzipBytes <= 0 {
		t.Fatalf("response bytes = %d/%d, want non-zero",
			metrics.LastJSONBytes, metrics.LastGzipBytes)
	}
	if metrics.CacheEntries != 1 || metrics.CacheBytes != metrics.LastGzipBytes {
		t.Fatalf("cache entries/bytes = %d/%d, want 1/%d",
			metrics.CacheEntries, metrics.CacheBytes, metrics.LastGzipBytes)
	}

	if _, err := service.Parse(context.Background(), file, hash); err != nil {
		t.Fatalf("second Parse: %v", err)
	}
	metrics = service.Metrics()
	if metrics.ParsesStarted != 1 || metrics.ParsesSucceeded != 1 {
		t.Fatalf("cache hit parsed again: counters = %d/%d",
			metrics.ParsesStarted, metrics.ParsesSucceeded)
	}
	if metrics.CacheHits == 0 {
		t.Fatal("cache hit was not counted")
	}
}

func TestServiceMetricsRecordFailureByCode(t *testing.T) {
	service := newTestService(&fakeExporter{
		build:  "13.99",
		export: func(string) error { return nil },
	})

	_, err := service.Parse(context.Background(), testFilePath(t), strings.Repeat("b", 64))
	if code := CodeOf(err); code != CodeUnsupportedBuild {
		t.Fatalf("code = %q, want %q", code, CodeUnsupportedBuild)
	}

	metrics := service.Metrics()
	if metrics.ParsesStarted != 1 || metrics.ParsesSucceeded != 0 {
		t.Fatalf("parse counters = %d/%d, want 1/0",
			metrics.ParsesStarted, metrics.ParsesSucceeded)
	}
	if metrics.ParsesFailed[string(CodeUnsupportedBuild)] != 1 {
		t.Fatalf("failed parses = %v, want one unsupported_build",
			metrics.ParsesFailed)
	}
}

func TestServiceMetricsRecordParserBusy(t *testing.T) {
	started := make(chan struct{})
	release := make(chan struct{})
	exporter := &fakeExporter{
		build: "13.08",
		export: func(string) error {
			close(started)
			<-release
			return nil
		},
	}
	service := NewService(Config{
		Exporter:       exporter,
		MaxUploadBytes: 1 << 20,
		CacheTTL:       time.Minute,
		MaxConcurrent:  1,
		QueueWait:      50 * time.Millisecond,
		ParseTimeout:   time.Minute,
	})
	file := testFilePath(t)

	done := make(chan struct{})
	go func() {
		defer close(done)
		_, _ = service.Parse(context.Background(), file, strings.Repeat("a", 64))
	}()
	<-started

	_, err := service.Parse(context.Background(), file, strings.Repeat("b", 64))
	if code := CodeOf(err); code != CodeParserBusy {
		t.Fatalf("code = %q, want %q", code, CodeParserBusy)
	}
	if metrics := service.Metrics(); metrics.ParserBusy != 1 {
		t.Fatalf("parser busy = %d, want 1", metrics.ParserBusy)
	}

	close(release)
	<-done
}
