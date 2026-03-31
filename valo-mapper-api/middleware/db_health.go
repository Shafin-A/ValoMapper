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
			log.Printf("[request=%s] Database connection unhealthy: %v", GetRequestID(r), err)
			utils.SendJSONError(w, utils.NewInternal("Database temporarily unavailable", err), GetRequestID(r))
			return
		}

		next.ServeHTTP(w, r)
	})
}
