package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRequestIDMiddleware(t *testing.T) {
	t.Run("adds request ID to response header", func(t *testing.T) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		middleware := RequestIDMiddleware(handler)

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		requestID := w.Header().Get("X-Request-ID")
		assert.NotEmpty(t, requestID)
		assert.Len(t, requestID, 36)
	})

	t.Run("adds request ID to context", func(t *testing.T) {
		var capturedRequestID string

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			capturedRequestID = GetRequestID(r)
			w.WriteHeader(http.StatusOK)
		})

		middleware := RequestIDMiddleware(handler)

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		assert.NotEmpty(t, capturedRequestID)
		assert.Equal(t, w.Header().Get("X-Request-ID"), capturedRequestID)
	})

	t.Run("generates unique request IDs", func(t *testing.T) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		middleware := RequestIDMiddleware(handler)

		requestIDs := make(map[string]bool)
		for range 10 {
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			w := httptest.NewRecorder()

			middleware.ServeHTTP(w, req)

			requestID := w.Header().Get("X-Request-ID")
			require.NotEmpty(t, requestID)

			assert.False(t, requestIDs[requestID], "Request IDs should be unique")
			requestIDs[requestID] = true
		}

		assert.Len(t, requestIDs, 10)
	})

	t.Run("calls next handler", func(t *testing.T) {
		handlerCalled := false

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			w.WriteHeader(http.StatusOK)
		})

		middleware := RequestIDMiddleware(handler)

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

func TestGetRequestID(t *testing.T) {
	t.Run("returns request ID from context", func(t *testing.T) {
		var retrievedID string

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			retrievedID = GetRequestID(r)
			w.WriteHeader(http.StatusOK)
		})

		middleware := RequestIDMiddleware(handler)

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		assert.NotEmpty(t, retrievedID)
		assert.Equal(t, w.Header().Get("X-Request-ID"), retrievedID)
	})

	t.Run("returns empty string when no request ID in context", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		requestID := GetRequestID(req)

		assert.Empty(t, requestID)
	})
}
