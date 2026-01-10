package routes

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"valo-mapper-api/testutils"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
)

func TestHealthEndpoint(t *testing.T) {
	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	r := mux.NewRouter()
	RegisterHealthRoutes(r)

	t.Run("returns 200 OK when database is connected", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		w := httptest.NewRecorder()

		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "OK", w.Body.String())
	})

	t.Run("returns 503 Service Unavailable when database is disconnected", func(t *testing.T) {
		testutils.CleanupTestDB(t, pool)

		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		w := httptest.NewRecorder()

		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusServiceUnavailable, w.Code)
		assert.Equal(t, "Database unavailable", w.Body.String())
	})
}
