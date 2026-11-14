package middleware

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

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

func TestShouldLogRequest(t *testing.T) {
	tests := []struct {
		name    string
		path    string
		status  int
		elapsed time.Duration
		want    bool
	}{
		{"health is skipped", "/health", http.StatusOK, time.Millisecond, false},
		{"fast patch success is skipped", "/api/lobbies/ABC/canvas-patches", http.StatusNoContent, 10 * time.Millisecond, false},
		{"failed patch is logged", "/api/lobbies/ABC/canvas-patches", http.StatusBadRequest, 10 * time.Millisecond, true},
		{"slow patch is logged", "/api/lobbies/ABC/canvas-patches", http.StatusNoContent, 300 * time.Millisecond, true},
		{"other requests are logged", "/api/strategies", http.StatusOK, time.Millisecond, true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			assert.Equal(t, test.want, shouldLogRequest(test.path, test.status, test.elapsed))
		})
	}
}

func TestAccessLogIncludesRequestID(t *testing.T) {
	var logs bytes.Buffer
	original := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&logs, nil)))
	defer slog.SetDefault(original)

	handler := RequestIDMiddleware(AccessLogMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})))

	req := httptest.NewRequest(http.MethodGet, "/api/strategies", nil)
	handler.ServeHTTP(httptest.NewRecorder(), req)

	assert.Contains(t, logs.String(), `"request_id":"`)
	assert.NotContains(t, logs.String(), `"request_id":""`)
	assert.True(t, strings.Contains(logs.String(), `"path":"/api/strategies"`))
}
