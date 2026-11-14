package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestStatusRecorder(t *testing.T) {
	inner := httptest.NewRecorder()
	recorder := &statusRecorder{ResponseWriter: inner}

	recorder.WriteHeader(http.StatusCreated)
	recorder.WriteHeader(http.StatusInternalServerError)

	assert.Equal(t, http.StatusCreated, recorder.status)
	assert.Same(t, inner, recorder.Unwrap())
}

func TestStatusRecorderWriteDefaultsToOK(t *testing.T) {
	recorder := &statusRecorder{ResponseWriter: httptest.NewRecorder()}

	_, err := recorder.Write([]byte("ok"))

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, recorder.status)
}

func TestAccessLogMiddlewarePassesThrough(t *testing.T) {
	handler := AccessLogMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/strategies", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNoContent, w.Code)
}
