package handlers

import (
	"context"
	"net/http"
	"time"
	"valo-mapper-api/db"
)

// HandleHealth godoc
// @Summary Health check
// @Description Checks API and database connectivity.
// @Tags health
// @Produce plain
// @Success 200 {string} string "OK"
// @Failure 503 {string} string "Database unavailable"
// @Router /health [get]
func HandleHealth(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	if err := db.EnsureConnection(ctx); err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		_, _ = w.Write([]byte("Database unavailable"))
		return
	}

	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("OK"))
}
