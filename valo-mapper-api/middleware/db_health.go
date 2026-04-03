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

const transientDBRetryDelay = 200 * time.Millisecond

func DBHealthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" {
			next.ServeHTTP(w, r)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()

		if err := ensureDBConnection(ctx); err != nil {
			if db.IsRetryableError(err) {
				select {
				case <-time.After(transientDBRetryDelay):
				case <-r.Context().Done():
					log.Printf("[request=%s] Request canceled while waiting for database retry: %v", GetRequestID(r), r.Context().Err())
					utils.SendJSONError(w, utils.NewInternal("Database temporarily unavailable", r.Context().Err()), GetRequestID(r))
					return
				}

				if retryErr := ensureDBConnection(ctx); retryErr == nil {
					next.ServeHTTP(w, r)
					return
				} else {
					err = retryErr
				}
			}

			log.Printf("[request=%s] Database connection unhealthy: %v", GetRequestID(r), err)
			utils.SendJSONError(w, utils.NewInternal("Database temporarily unavailable", err), GetRequestID(r))
			return
		}

		next.ServeHTTP(w, r)
	})
}
