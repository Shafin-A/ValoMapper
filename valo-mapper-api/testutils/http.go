package testutils

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

// MakeRequest creates an HTTP request for testing
func MakeRequest(t *testing.T, method, path string, body any, authToken string) *http.Request {
	t.Helper()

	var bodyReader io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("Failed to marshal request body: %v", err)
		}
		bodyReader = bytes.NewReader(jsonBody)
	}

	req := httptest.NewRequest(method, path, bodyReader)
	req.Header.Set("Content-Type", "application/json")

	if authToken != "" {
		req.Header.Set("Authorization", "Bearer "+authToken)
	}

	return req
}

// ParseJSONResponse parses the JSON response from a ResponseRecorder
func ParseJSONResponse(t *testing.T, w *httptest.ResponseRecorder, v any) {
	t.Helper()

	if err := json.NewDecoder(w.Body).Decode(v); err != nil {
		t.Fatalf("Failed to decode response body: %v\nBody: %s", err, w.Body.String())
	}
}

// AssertStatusCode checks if the response has the expected status code
func AssertStatusCode(t *testing.T, w *httptest.ResponseRecorder, expected int) {
	t.Helper()

	if w.Code != expected {
		t.Errorf("Expected status code %d, got %d. Body: %s", expected, w.Code, w.Body.String())
	}
}

// AssertJSONContentType checks if the response has JSON content type
func AssertJSONContentType(t *testing.T, w *httptest.ResponseRecorder) {
	t.Helper()

	contentType := w.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("Expected Content-Type 'application/json', got '%s'", contentType)
	}
}

// ErrorResponse represents an error response from the API
type ErrorResponse struct {
	Error     string `json:"error"`
	RequestID string `json:"requestId,omitempty"`
}
