package middleware

import (
	"crypto/subtle"
	"net/http"
	"os"
)

const swaggerUsername = "swagger"

// SwaggerBasicAuth gates the docs behind Basic Auth and returns 404 when SWAGGER_PASSWORD is unset.
func SwaggerBasicAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		password := os.Getenv("SWAGGER_PASSWORD")
		if password == "" {
			http.NotFound(w, r)
			return
		}

		user, pass, ok := r.BasicAuth()
		if !ok ||
			subtle.ConstantTimeCompare([]byte(user), []byte(swaggerUsername)) != 1 ||
			subtle.ConstantTimeCompare([]byte(pass), []byte(password)) != 1 {
			w.Header().Set("WWW-Authenticate", `Basic realm="ValoMapper API Docs"`)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}
