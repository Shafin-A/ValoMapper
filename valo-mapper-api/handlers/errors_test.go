package handlers

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"valo-mapper-api/services"

	"github.com/stretchr/testify/assert"
)

func TestSendServiceError(t *testing.T) {
	tests := []struct {
		name   string
		err    error
		status int
	}{
		{"known not found", services.ErrStrategyNotFound, http.StatusNotFound},
		{"known forbidden", services.ErrStrategyAccessDenied, http.StatusForbidden},
		{"known conflict", services.ErrStrategyAlreadySaved, http.StatusConflict},
		{"unknown", errors.New("boom"), http.StatusInternalServerError},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/strategies", nil)
			w := httptest.NewRecorder()

			sendServiceError(w, req, test.err, "Unable to list strategies")

			assert.Equal(t, test.status, w.Code)
		})
	}
}
