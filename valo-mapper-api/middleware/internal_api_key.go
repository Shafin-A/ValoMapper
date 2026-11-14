package middleware

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"valo-mapper-api/utils"
)

func InternalAPIKeyMiddleware(key string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			configured := strings.TrimSpace(key)
			if configured == "" {
				utils.SendJSONError(w, utils.NewInternal("Internal API key is not configured", nil), GetRequestID(r))
				return
			}

			provided := r.Header.Get("X-Internal-API-Key")
			if subtle.ConstantTimeCompare([]byte(provided), []byte(configured)) != 1 {
				utils.SendJSONError(w, utils.NewForbidden("Forbidden"), GetRequestID(r))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
