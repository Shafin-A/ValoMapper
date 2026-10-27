package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"valo-mapper-api/db"
	"valo-mapper-api/utils"
)

var ensureDBConnection = db.EnsureConnection

const (
	transientDBRetryDelay  = 200 * time.Millisecond
	transientDBMaxAttempts = 3
)

// bypassesDBHealth reports the endpoints that do not read or write PostgreSQL.
// Replay parsing keeps its output in memory, so a database hiccup must not take
// the replay player down with it.
func bypassesDBHealth(path string) bool {
	return path == "/health" ||
		path == "/api/replays" ||
		strings.HasPrefix(path, "/api/replays/")
}

func DBHealthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if bypassesDBHealth(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		if err := ensureDBHealthyWithRetry(ctx, r); err != nil {
			slog.Error("database connection unhealthy", "request_id", GetRequestID(r), "error", err)
			utils.SendJSONError(w, utils.NewInternal("Database temporarily unavailable", err), GetRequestID(r))
			return
		}

		next.ServeHTTP(w, r)
	})
}

func ensureDBHealthyWithRetry(ctx context.Context, r *http.Request) error {
	var lastErr error
	retryDelay := transientDBRetryDelay

	for attempt := 1; attempt <= transientDBMaxAttempts; attempt++ {
		lastErr = ensureDBConnection(ctx)
		if lastErr == nil {
			return nil
		}

		if !db.IsRetryableError(lastErr) || attempt == transientDBMaxAttempts {
			return lastErr
		}

		slog.Warn("retryable database health error", "request_id", GetRequestID(r), "attempt", attempt, "max_attempts", transientDBMaxAttempts, "error", lastErr)

		select {
		case <-time.After(retryDelay):
			retryDelay *= 2
		case <-ctx.Done():
			return ctx.Err()
		}
	}

	return lastErr
}
