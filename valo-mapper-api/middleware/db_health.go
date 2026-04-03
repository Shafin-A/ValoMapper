package middleware

import (
	"context"
	"log"
	"net/http"
	"time"

	"valo-mapper-api/db"
	"valo-mapper-api/utils"
)

var ensureDBConnection = db.EnsureConnection

const (
	transientDBRetryDelay  = 200 * time.Millisecond
	transientDBMaxAttempts = 3
)

func DBHealthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" {
			next.ServeHTTP(w, r)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		if err := ensureDBHealthyWithRetry(ctx, r); err != nil {
			log.Printf("[request=%s] Database connection unhealthy: %v", GetRequestID(r), err)
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

		log.Printf("[request=%s] Retryable database health error (attempt %d/%d): %v", GetRequestID(r), attempt, transientDBMaxAttempts, lastErr)

		select {
		case <-time.After(retryDelay):
			retryDelay *= 2
		case <-ctx.Done():
			return ctx.Err()
		}
	}

	return lastErr
}
