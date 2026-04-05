package utils

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
)

type HTTPError struct {
	Status  int
	Message string
	Err     error
}

func (he *HTTPError) Error() string {
	if he.Err != nil {
		return fmt.Sprintf("status=%d message=%s internal=%v", he.Status, he.Message, he.Err)
	}
	return fmt.Sprintf("status=%d message=%s", he.Status, he.Message)
}

func NewInternal(msg string, err error) *HTTPError {
	return &HTTPError{Status: http.StatusInternalServerError, Message: msg, Err: err}
}

func NewBadRequest(msg string) *HTTPError {
	return &HTTPError{Status: http.StatusBadRequest, Message: msg}
}

func NewNotFound(msg string) *HTTPError {
	return &HTTPError{Status: http.StatusNotFound, Message: msg}
}

func NewConflict(msg string, err error) *HTTPError {
	return &HTTPError{Status: http.StatusConflict, Message: msg, Err: err}
}

func NewUnauthorized(msg string) *HTTPError {
	return &HTTPError{Status: http.StatusUnauthorized, Message: msg}
}

func NewForbidden(msg string) *HTTPError {
	return &HTTPError{Status: http.StatusForbidden, Message: msg}
}

func SendJSONError(w http.ResponseWriter, he *HTTPError, requestID string) {
	if he.Err != nil {
		slog.Error("request error", "request_id", requestID, "status", he.Status, "error", he.Err)
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Request-ID", requestID)
	w.WriteHeader(he.Status)

	response := map[string]string{
		"error": he.Message,
	}
	if requestID != "" {
		response["requestId"] = requestID
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		slog.Error("failed to encode error response", "request_id", requestID, "error", err)
	}
}

func SendJSON(w http.ResponseWriter, statusCode int, data any, requestID string) bool {
	encoded, err := json.Marshal(data)
	if err != nil {
		slog.Error("failed to encode JSON response", "request_id", requestID, "error", err)
		SendJSONError(w, NewInternal("Failed to encode response", err), requestID)
		return false
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Request-ID", requestID)
	w.WriteHeader(statusCode)
	_, _ = w.Write(encoded)
	return true
}
