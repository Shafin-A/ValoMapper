package replay

import (
	"testing"
	"time"
)

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
