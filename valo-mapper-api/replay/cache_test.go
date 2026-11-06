package replay

import (
	"testing"
	"time"
)

func TestCacheKeyIncludesParserVersionAndFrameRate(t *testing.T) {
	eight := NewService(Config{FrameHz: 8, Exporter: &fakeExporter{build: "13.08", export: func(string) error { return nil }}})
	fifteen := NewService(Config{FrameHz: 15, Exporter: &fakeExporter{build: "13.08", export: func(string) error { return nil }}})

	eightKey := eight.cacheKey("abc")
	if eightKey != "abc:"+ParserVersion+":8" {
		t.Fatalf("cache key = %q", eightKey)
	}
	if fifteen.cacheKey("abc") == eightKey {
		t.Fatal("frame rate is not part of the cache key")
	}
	if eight.cacheKey("def") == eightKey {
		t.Fatal("file hash is not part of the cache key")
	}
}

func TestReplayCacheExpiresEntries(t *testing.T) {
	now := time.Unix(0, 0)
	cache := newReplayCache(time.Minute, 4, 1<<20)
	cache.now = func() time.Time { return now }

	cache.put("a", []byte("one"))
	if _, ok := cache.get("a"); !ok {
		t.Fatal("entry was not stored")
	}

	now = now.Add(time.Minute)
	if _, ok := cache.get("a"); ok {
		t.Fatal("entry survived its TTL")
	}
	if cache.len() != 0 {
		t.Fatalf("cache length = %d", cache.len())
	}
}

func TestReplayCacheEvictsLeastRecentlyUsed(t *testing.T) {
	now := time.Unix(0, 0)
	cache := newReplayCache(time.Hour, 2, 1<<20)
	cache.now = func() time.Time { return now }

	cache.put("a", []byte("one"))
	cache.put("b", []byte("two"))
	if _, ok := cache.get("a"); !ok {
		t.Fatal("a missing")
	}

	cache.put("c", []byte("three"))

	if _, ok := cache.get("b"); ok {
		t.Fatal("least recently used entry was not evicted")
	}
	if _, ok := cache.get("a"); !ok {
		t.Fatal("recently used entry was evicted")
	}
	if _, ok := cache.get("c"); !ok {
		t.Fatal("new entry was not stored")
	}
}

func TestReplayCacheTracksStats(t *testing.T) {
	cache := newReplayCache(time.Hour, 1, 1<<20)
	cache.put("a", []byte("one"))
	if _, ok := cache.get("a"); !ok {
		t.Fatal("expected a cache hit")
	}
	if _, ok := cache.get("missing"); ok {
		t.Fatal("expected a cache miss")
	}
	cache.put("b", []byte("two"))

	stats := cache.stats()
	if stats.hits != 1 || stats.misses != 1 {
		t.Fatalf("hits/misses = %d/%d, want 1/1", stats.hits, stats.misses)
	}
	if stats.evictions != 1 {
		t.Fatalf("evictions = %d, want 1", stats.evictions)
	}
	if stats.entries != 1 || stats.bytes != 3 {
		t.Fatalf("entries/bytes = %d/%d, want 1/3", stats.entries, stats.bytes)
	}
}

func TestReplayCacheCapsBytes(t *testing.T) {
	cache := newReplayCache(time.Hour, 8, 5)
	cache.put("a", []byte("123"))
	cache.put("b", []byte("456"))
	cache.put("c", []byte("789"))

	if cache.bytes != 3 {
		t.Fatalf("cache bytes = %d, want 3", cache.bytes)
	}
	if _, ok := cache.get("a"); ok {
		t.Fatal("oldest entry was not evicted to satisfy the byte cap")
	}
	if _, ok := cache.get("c"); !ok {
		t.Fatal("newest entry is missing")
	}
}
