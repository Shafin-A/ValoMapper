package middleware

import (
	"log/slog"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

type IPRateLimiter struct {
	ips     map[string]*rateLimiterEntry
	mu      sync.RWMutex
	rate    rate.Limit
	burst   int
	cleanup time.Duration
}

type rateLimiterEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

func NewIPRateLimiter(r rate.Limit, b int) *IPRateLimiter {
	limiter := &IPRateLimiter{
		ips:     make(map[string]*rateLimiterEntry),
		rate:    r,
		burst:   b,
		cleanup: 10 * time.Minute,
	}

	go limiter.cleanupLoop()

	return limiter
}

func (i *IPRateLimiter) GetLimiter(ip string) *rate.Limiter {
	i.mu.Lock()
	defer i.mu.Unlock()

	entry, exists := i.ips[ip]
	if !exists {
		limiter := rate.NewLimiter(i.rate, i.burst)
		i.ips[ip] = &rateLimiterEntry{
			limiter:  limiter,
			lastSeen: time.Now(),
		}
		return limiter
	}

	entry.lastSeen = time.Now()
	return entry.limiter
}

func (i *IPRateLimiter) cleanupLoop() {
	ticker := time.NewTicker(i.cleanup)
	defer ticker.Stop()

	for range ticker.C {
		i.mu.Lock()
		for ip, entry := range i.ips {
			if time.Since(entry.lastSeen) > i.cleanup {
				delete(i.ips, ip)
			}
		}
		i.mu.Unlock()
	}
}

func getIP(r *http.Request) string {
	parseCandidateIP := func(value string) string {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			return ""
		}

		if host, _, err := net.SplitHostPort(trimmed); err == nil {
			return strings.TrimSpace(host)
		}

		return trimmed
	}

	forwarded := r.Header.Get("X-Forwarded-For")

	if forwarded != "" {
		parts := strings.Split(forwarded, ",")
		if len(parts) > 0 {
			if parsed := parseCandidateIP(parts[0]); parsed != "" {
				return parsed
			}
		}
	}

	cfConnectingIP := parseCandidateIP(r.Header.Get("CF-Connecting-IP"))
	if cfConnectingIP != "" {
		return cfConnectingIP
	}

	flyClientIP := parseCandidateIP(r.Header.Get("Fly-Client-IP"))
	if flyClientIP != "" {
		return flyClientIP
	}

	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		if parsed := parseCandidateIP(realIP); parsed != "" {
			return parsed
		}
	}

	if parsed := parseCandidateIP(r.RemoteAddr); parsed != "" {
		return parsed
	}

	return r.RemoteAddr
}

func RateLimitMiddleware(limiter *IPRateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/api/billing/webhook" || r.URL.Path == "/api/billing/webhook/" {
				next.ServeHTTP(w, r)
				return
			}

			ip := getIP(r)
			ipLimiter := limiter.GetLimiter(ip)

			if !ipLimiter.Allow() {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Retry-After", "1")
				w.WriteHeader(http.StatusTooManyRequests)
				if _, err := w.Write([]byte(`{"error":"Too many requests. Please slow down."}`)); err != nil {
					slog.Error("failed to write rate limit response", "error", err)
				}
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
