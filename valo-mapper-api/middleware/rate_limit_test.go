package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"golang.org/x/time/rate"
)

func TestGetIP(t *testing.T) {
	tests := []struct {
		name          string
		xForwardedFor string
		xRealIP       string
		remoteAddr    string
		expectedIP    string
	}{
		{
			name:          "X-Forwarded-For with single IP",
			xForwardedFor: "192.168.1.1",
			expectedIP:    "192.168.1.1",
		},
		{
			name:          "X-Forwarded-For with multiple IPs",
			xForwardedFor: "192.168.1.1, 10.0.0.1, 172.16.0.1",
			expectedIP:    "192.168.1.1",
		},
		{
			name:       "X-Real-IP only",
			xRealIP:    "10.0.0.5",
			expectedIP: "10.0.0.5",
		},
		{
			name:       "CF-Connecting-IP fallback",
			xRealIP:    "",
			expectedIP: "203.0.113.10",
		},
		{
			name:       "Fly-Client-IP fallback",
			xRealIP:    "",
			expectedIP: "198.51.100.22",
		},
		{
			name:       "RemoteAddr fallback",
			remoteAddr: "127.0.0.1:8080",
			expectedIP: "127.0.0.1",
		},
		{
			name:          "X-Forwarded-For takes precedence over X-Real-IP",
			xForwardedFor: "192.168.1.1",
			xRealIP:       "10.0.0.5",
			expectedIP:    "192.168.1.1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/", nil)
			if tt.xForwardedFor != "" {
				req.Header.Set("X-Forwarded-For", tt.xForwardedFor)
			}
			if tt.xRealIP != "" {
				req.Header.Set("X-Real-IP", tt.xRealIP)
			}
			if tt.name == "CF-Connecting-IP fallback" {
				req.Header.Set("CF-Connecting-IP", "203.0.113.10")
			}
			if tt.name == "Fly-Client-IP fallback" {
				req.Header.Set("Fly-Client-IP", "198.51.100.22")
			}
			if tt.remoteAddr != "" {
				req.RemoteAddr = tt.remoteAddr
			}

			ip := getIP(req)
			if ip != tt.expectedIP {
				t.Errorf("expected IP %q, got %q", tt.expectedIP, ip)
			}
		})
	}
}

func TestIPRateLimiter(t *testing.T) {
	limiter := NewIPRateLimiter(rate.Limit(2), 2)

	ip := "192.168.1.1"

	for i := range 2 {
		l := limiter.GetLimiter(ip)
		if !l.Allow() {
			t.Errorf("request %d should be allowed", i+1)
		}
	}

	l := limiter.GetLimiter(ip)
	if l.Allow() {
		t.Error("3rd request should be denied")
	}
}

func TestRateLimitMiddleware(t *testing.T) {
	limiter := NewIPRateLimiter(rate.Limit(1), 1)

	handler := RateLimitMiddleware(limiter)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req1 := httptest.NewRequest("GET", "/", nil)
	req1.RemoteAddr = "192.168.1.1:1234"
	rr1 := httptest.NewRecorder()
	handler.ServeHTTP(rr1, req1)

	if rr1.Code != http.StatusOK {
		t.Errorf("first request expected status 200, got %d", rr1.Code)
	}

	req2 := httptest.NewRequest("GET", "/", nil)
	req2.RemoteAddr = "192.168.1.1:1234"
	rr2 := httptest.NewRecorder()
	handler.ServeHTTP(rr2, req2)

	if rr2.Code != http.StatusTooManyRequests {
		t.Errorf("second request expected status 429, got %d", rr2.Code)
	}

	req3 := httptest.NewRequest("GET", "/", nil)
	req3.RemoteAddr = "192.168.1.2:1234"
	rr3 := httptest.NewRecorder()
	handler.ServeHTTP(rr3, req3)

	if rr3.Code != http.StatusOK {
		t.Errorf("request from different IP expected status 200, got %d", rr3.Code)
	}
}

func TestRateLimitMiddleware_RetryAfterHeader(t *testing.T) {
	limiter := NewIPRateLimiter(rate.Limit(1), 1)

	handler := RateLimitMiddleware(limiter)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req1 := httptest.NewRequest("GET", "/", nil)
	req1.RemoteAddr = "10.0.0.1:1234"
	rr1 := httptest.NewRecorder()
	handler.ServeHTTP(rr1, req1)

	req2 := httptest.NewRequest("GET", "/", nil)
	req2.RemoteAddr = "10.0.0.1:1234"
	rr2 := httptest.NewRecorder()
	handler.ServeHTTP(rr2, req2)

	if rr2.Header().Get("Retry-After") == "" {
		t.Error("expected Retry-After header on rate limited response")
	}
}

func TestRateLimitMiddleware_ExemptsStripeWebhook(t *testing.T) {
	limiter := NewIPRateLimiter(rate.Limit(1), 1)

	handler := RateLimitMiddleware(limiter)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	for i := range 3 {
		req := httptest.NewRequest("POST", "/api/billing/webhook", nil)
		req.RemoteAddr = "10.10.10.10:1234"
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("webhook request %d expected status 200, got %d", i+1, rr.Code)
		}
	}
}
