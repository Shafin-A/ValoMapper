package middleware

import (
	"net/http"
	"strings"
)

const defaultMaxBodyBytes = 64 << 10

func BodyLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Body != nil && !bodyLimitBypassed(r.URL.Path) {
			r.Body = http.MaxBytesReader(w, r.Body, defaultMaxBodyBytes)
		}
		next.ServeHTTP(w, r)
	})
}

func bodyLimitBypassed(path string) bool {
	return path == "/api/replays" ||
		path == "/api/images/upload" ||
		path == "/api/billing/webhook" ||
		path == "/api/lobbies" ||
		strings.HasPrefix(path, "/api/lobbies/")
}
