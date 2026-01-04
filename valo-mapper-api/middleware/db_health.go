package middleware

import (
	"context"
	"log"
	"net/http"
	"time"

	"valo-mapper-api/db"
	"valo-mapper-api/utils"
)

func DBHealthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" {
			next.ServeHTTP(w, r)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()

		if err := db.EnsureConnection(ctx); err != nil {
			log.Printf("[request=%s] Database connection unhealthy, attempting recovery: %v", GetRequestID(r), err)

			time.Sleep(100 * time.Millisecond)

			if err := db.EnsureConnection(ctx); err != nil {
				utils.SendJSONError(w, utils.NewInternal("Database temporarily unavailable", err), GetRequestID(r))
				return
			}
			log.Printf("[request=%s] Database connection recovered", GetRequestID(r))
		}

		next.ServeHTTP(w, r)
	})
}
