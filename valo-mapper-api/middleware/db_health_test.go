package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDBHealthMiddleware_BypassesHealthEndpoint(t *testing.T) {
	originalEnsure := ensureDBConnection
	defer func() { ensureDBConnection = originalEnsure }()

	calls := 0
	ensureDBConnection = func(ctx context.Context) error {
		calls++
		return nil
	}

	handlerCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
		w.WriteHeader(http.StatusOK)
	})

	middleware := DBHealthMiddleware(next)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	middleware.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.True(t, handlerCalled)
	assert.Equal(t, 0, calls)
}

func TestDBHealthMiddleware_RetriesTransientErrorOnce(t *testing.T) {
	originalEnsure := ensureDBConnection
	defer func() { ensureDBConnection = originalEnsure }()

	calls := 0
	ensureDBConnection = func(ctx context.Context) error {
		calls++
		if calls == 1 {
			return errors.New("failed to receive message: unexpected EOF")
		}
		return nil
	}

	handlerCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
		w.WriteHeader(http.StatusCreated)
	})

	middleware := DBHealthMiddleware(next)

	req := httptest.NewRequest(http.MethodPost, "/api/lobbies", nil)
	w := httptest.NewRecorder()
	middleware.ServeHTTP(w, req)

	assert.Equal(t, 2, calls)
	assert.True(t, handlerCalled)
	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestDBHealthMiddleware_Returns500WhenDBUnavailable(t *testing.T) {
	originalEnsure := ensureDBConnection
	defer func() { ensureDBConnection = originalEnsure }()

	errUnavailable := errors.New("database connection not initialized")
	ensureDBConnection = func(ctx context.Context) error {
		return errUnavailable
	}

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	middleware := DBHealthMiddleware(next)

	req := httptest.NewRequest(http.MethodPost, "/api/lobbies", nil)
	w := httptest.NewRecorder()
	middleware.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Database temporarily unavailable")
}
