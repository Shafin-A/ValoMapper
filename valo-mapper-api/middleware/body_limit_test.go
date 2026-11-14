package middleware

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBodyLimitMiddleware(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, err := io.ReadAll(r.Body); err != nil {
			w.WriteHeader(http.StatusRequestEntityTooLarge)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	oversized := strings.Repeat("a", defaultMaxBodyBytes+1)

	t.Run("allows small bodies", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/strategies", strings.NewReader("{}"))
		w := httptest.NewRecorder()

		BodyLimitMiddleware(next).ServeHTTP(w, req)

		assert.Equal(t, http.StatusNoContent, w.Code)
	})

	t.Run("rejects oversized bodies", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/strategies", strings.NewReader(oversized))
		w := httptest.NewRecorder()

		BodyLimitMiddleware(next).ServeHTTP(w, req)

		assert.Equal(t, http.StatusRequestEntityTooLarge, w.Code)
	})

	t.Run("bypasses upload and lobby routes", func(t *testing.T) {
		for _, path := range []string{"/api/lobbies", "/api/lobbies/ABC/", "/api/replays", "/api/images/upload", "/api/billing/webhook"} {
			req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(oversized))
			w := httptest.NewRecorder()

			BodyLimitMiddleware(next).ServeHTTP(w, req)

			assert.Equal(t, http.StatusNoContent, w.Code, path)
		}
	})
}
