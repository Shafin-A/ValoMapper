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

func TestFirstRequestLogger(t *testing.T) {
	var logs bytes.Buffer
	original := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&logs, nil)))
	defer slog.SetDefault(original)

	handler := FirstRequestLogger(time.Now().Add(-time.Second))(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/health", nil))
	handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/api/strategies", nil))

	output := logs.String()
	assert.Equal(t, 1, strings.Count(output, `"msg":"first request"`))
	assert.Contains(t, output, `"path":"/health"`)
	assert.Contains(t, output, `"elapsed_ms":`)
}
