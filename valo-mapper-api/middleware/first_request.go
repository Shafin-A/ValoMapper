package middleware

import (
	"log/slog"
	"net/http"
	"sync"
	"time"
)

func FirstRequestLogger(started time.Time) func(http.Handler) http.Handler {
	var once sync.Once

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			once.Do(func() {
				slog.Info("first request",
					"method", r.Method,
					"path", r.URL.Path,
					"elapsed_ms", time.Since(started).Milliseconds(),
				)
			})

			next.ServeHTTP(w, r)
		})
	}
}
