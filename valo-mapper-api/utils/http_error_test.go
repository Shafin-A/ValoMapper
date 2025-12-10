package utils

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewInternal(t *testing.T) {
	err := errors.New("internal error")
	httpErr := NewInternal("something went wrong", err)

	assert.Equal(t, http.StatusInternalServerError, httpErr.Status)
	assert.Equal(t, "something went wrong", httpErr.Message)
	assert.Equal(t, err, httpErr.Err)
}

func TestNewBadRequest(t *testing.T) {
	httpErr := NewBadRequest("invalid input")

	assert.Equal(t, http.StatusBadRequest, httpErr.Status)
	assert.Equal(t, "invalid input", httpErr.Message)
	assert.Nil(t, httpErr.Err)
}

func TestNewNotFound(t *testing.T) {
	httpErr := NewNotFound("resource not found")

	assert.Equal(t, http.StatusNotFound, httpErr.Status)
	assert.Equal(t, "resource not found", httpErr.Message)
	assert.Nil(t, httpErr.Err)
}

func TestNewConflict(t *testing.T) {
	err := errors.New("duplicate key")
	httpErr := NewConflict("resource already exists", err)

	assert.Equal(t, http.StatusConflict, httpErr.Status)
	assert.Equal(t, "resource already exists", httpErr.Message)
	assert.Equal(t, err, httpErr.Err)
}

func TestNewUnauthorized(t *testing.T) {
	httpErr := NewUnauthorized("authentication required")

	assert.Equal(t, http.StatusUnauthorized, httpErr.Status)
	assert.Equal(t, "authentication required", httpErr.Message)
	assert.Nil(t, httpErr.Err)
}

func TestNewForbidden(t *testing.T) {
	httpErr := NewForbidden("access denied")

	assert.Equal(t, http.StatusForbidden, httpErr.Status)
	assert.Equal(t, "access denied", httpErr.Message)
	assert.Nil(t, httpErr.Err)
}

func TestHTTPError_Error(t *testing.T) {
	tests := []struct {
		name     string
		httpErr  *HTTPError
		expected string
	}{
		{
			name: "with internal error",
			httpErr: &HTTPError{
				Status:  500,
				Message: "server error",
				Err:     errors.New("database connection failed"),
			},
			expected: "status=500 message=server error internal=database connection failed",
		},
		{
			name: "without internal error",
			httpErr: &HTTPError{
				Status:  400,
				Message: "bad request",
				Err:     nil,
			},
			expected: "status=400 message=bad request",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.httpErr.Error()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestSendJSONError(t *testing.T) {
	tests := []struct {
		name           string
		httpErr        *HTTPError
		requestID      string
		expectedStatus int
		checkBody      func(t *testing.T, body string)
	}{
		{
			name:           "with request ID",
			httpErr:        NewBadRequest("invalid input"),
			requestID:      "req-123",
			expectedStatus: http.StatusBadRequest,
			checkBody: func(t *testing.T, body string) {
				assert.Contains(t, body, `"error":"invalid input"`)
				assert.Contains(t, body, `"requestId":"req-123"`)
			},
		},
		{
			name:           "without request ID",
			httpErr:        NewNotFound("not found"),
			requestID:      "",
			expectedStatus: http.StatusNotFound,
			checkBody: func(t *testing.T, body string) {
				assert.Contains(t, body, `"error":"not found"`)
				assert.NotContains(t, body, "requestId")
			},
		},
		{
			name:           "with internal error",
			httpErr:        NewInternal("server error", errors.New("db error")),
			requestID:      "req-456",
			expectedStatus: http.StatusInternalServerError,
			checkBody: func(t *testing.T, body string) {
				assert.Contains(t, body, `"error":"server error"`)
				assert.Contains(t, body, `"requestId":"req-456"`)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			SendJSONError(w, tt.httpErr, tt.requestID)

			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Equal(t, "application/json", w.Header().Get("Content-Type"))

			if tt.requestID != "" {
				assert.Equal(t, tt.requestID, w.Header().Get("X-Request-ID"))
			}

			tt.checkBody(t, w.Body.String())
		})
	}
}

func TestSendJSONError_ResponseFormat(t *testing.T) {
	w := httptest.NewRecorder()
	httpErr := NewBadRequest("test error")
	requestID := "test-req-id"

	SendJSONError(w, httpErr, requestID)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	body := w.Body.String()
	assert.Contains(t, body, "{")
	assert.Contains(t, body, "}")
	assert.Contains(t, body, "error")
	assert.Contains(t, body, "test error")
}
