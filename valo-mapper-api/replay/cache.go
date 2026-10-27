package replay

import (
	"container/list"
	"sync"
	"time"
)

// cache stores gzipped response bodies, never Go match structs. Responses are
// tiny today, but caching the compressed bytes keeps the payload budget honest
// as frames grow.
type cacheEntry struct {
	key       string
	gz        []byte
	createdAt time.Time
}

type replayCache struct {
	mu         sync.Mutex
	entries    map[string]*list.Element
	order      *list.List
	ttl        time.Duration
	maxEntries int
	maxBytes   int64
	bytes      int64
	now        func() time.Time
}

func newReplayCache(ttl time.Duration, maxEntries int, maxBytes int64) *replayCache {
	if ttl <= 0 {
		ttl = 30 * time.Minute
	}
	if maxEntries <= 0 {
		maxEntries = 8
	}
	if maxBytes <= 0 {
		maxBytes = 64 << 20
	}
	return &replayCache{
		entries:    make(map[string]*list.Element, maxEntries),
		order:      list.New(),
		ttl:        ttl,
		maxEntries: maxEntries,
		maxBytes:   maxBytes,
		now:        time.Now,
	}
}

// get returns the cached gzip body. The returned slice is immutable; eviction
// removes the map entry but never rewrites the bytes.
func (c *replayCache) get(key string) ([]byte, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.pruneLocked()

	element, ok := c.entries[key]
	if !ok {
		return nil, false
	}
	entry := element.Value.(*cacheEntry)
	if c.expiredLocked(entry) {
		c.removeLocked(element)
		return nil, false
	}
	c.order.MoveToFront(element)
	return entry.gz, true
}

func (c *replayCache) put(key string, gz []byte) {
	if key == "" || len(gz) == 0 {
		return
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	c.pruneLocked()

	if element, ok := c.entries[key]; ok {
		entry := element.Value.(*cacheEntry)
		c.bytes -= int64(len(entry.gz))
		entry.gz = gz
		entry.createdAt = c.now()
		c.bytes += int64(len(gz))
		c.order.MoveToFront(element)
	} else {
		entry := &cacheEntry{key: key, gz: gz, createdAt: c.now()}
		c.entries[key] = c.order.PushFront(entry)
		c.bytes += int64(len(gz))
	}

	for c.order.Len() > c.maxEntries || c.bytes > c.maxBytes {
		oldest := c.order.Back()
		if oldest == nil {
			break
		}
		c.removeLocked(oldest)
	}
}

func (c *replayCache) delete(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if element, ok := c.entries[key]; ok {
		c.removeLocked(element)
	}
}

func (c *replayCache) len() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.pruneLocked()
	return c.order.Len()
}

func (c *replayCache) pruneLocked() {
	if c.order.Len() == 0 {
		return
	}
	now := c.now()
	for element := c.order.Back(); element != nil; {
		previous := element.Prev()
		entry := element.Value.(*cacheEntry)
		if now.Sub(entry.createdAt) >= c.ttl {
			c.removeLocked(element)
		}
		element = previous
	}
}

func (c *replayCache) expiredLocked(entry *cacheEntry) bool {
	return c.now().Sub(entry.createdAt) >= c.ttl
}

func (c *replayCache) removeLocked(element *list.Element) {
	entry := element.Value.(*cacheEntry)
	c.order.Remove(element)
	delete(c.entries, entry.key)
	c.bytes -= int64(len(entry.gz))
	if c.bytes < 0 {
		c.bytes = 0
	}
}
