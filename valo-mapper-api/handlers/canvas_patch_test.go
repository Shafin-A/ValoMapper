package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"valo-mapper-api/models"
	"valo-mapper-api/testutils"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestApplyCanvasPatch(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "lobbies", "maps", "canvas_agents", "canvas_abilities", "canvas_draw_lines", "canvas_texts", "canvas_images", "canvas_tool_icons", "canvas_connecting_lines")

	_, err := pool.Exec(context.Background(),
		`INSERT INTO maps (id, text, text_color) VALUES ($1, $2, $3)`,
		models.DefaultMapID, "Default Map", "#FFFFFF",
	)
	require.NoError(t, err)

	lobby := testutils.CreateTestLobby(t, pool)

	t.Run("rejects non-POST", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/lobbies/"+lobby.Code+"/canvas-patches", nil)
		w := httptest.NewRecorder()

		ApplyCanvasPatch(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("rejects invalid JSON", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/lobbies/"+lobby.Code+"/canvas-patches", strings.NewReader("invalid json"))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		ApplyCanvasPatch(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("returns 404 for non-existent lobby", func(t *testing.T) {
		payload := models.CanvasPatch{Entries: []models.CanvasPatchEntry{{Entity: "agent", Action: "add", PhaseIndex: 0, ID: "a1", Payload: map[string]any{"id": "a1"}}}}
		body, err := json.Marshal(payload)
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodPost, "/api/lobbies/INVALID/canvas-patches", strings.NewReader(string(body)))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		ApplyCanvasPatch(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("applies patch for existing lobby", func(t *testing.T) {
		payload := models.CanvasPatch{Entries: []models.CanvasPatchEntry{{Entity: "agent", Action: "upsert", PhaseIndex: 0, ID: "a1", Payload: map[string]any{"id": "a1", "name": "Jett"}}}}
		body, err := json.Marshal(payload)
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodPost, "/api/lobbies/"+lobby.Code+"/canvas-patches", strings.NewReader(string(body)))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		ApplyCanvasPatch(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var returnedLobby models.Lobby
		testutils.ParseJSONResponse(t, w, &returnedLobby)
		assert.Equal(t, lobby.Code, returnedLobby.Code)
	})

	t.Run("preserves image src after update without src", func(t *testing.T) {
		// Add an image anchor with src
		addPayload := models.CanvasPatch{Entries: []models.CanvasPatchEntry{{Entity: "image", Action: "add", PhaseIndex: 0, ID: "img1", Payload: map[string]any{"id": "img1", "src": "https://example.com/pic.png", "x": 100, "y": 100, "width": 150, "height": 150}}}}
		addBody, err := json.Marshal(addPayload)
		require.NoError(t, err)

		addReq := httptest.NewRequest(http.MethodPost, "/api/lobbies/"+lobby.Code+"/canvas-patches", strings.NewReader(string(addBody)))
		addReq.Header.Set("Content-Type", "application/json")
		addW := httptest.NewRecorder()

		ApplyCanvasPatch(addW, addReq)
		assert.Equal(t, http.StatusOK, addW.Code)

		// Move image without src payload
		updatePayload := models.CanvasPatch{Entries: []models.CanvasPatchEntry{{Entity: "image", Action: "update", PhaseIndex: 0, ID: "img1", Payload: map[string]any{"id": "img1", "x": 200, "y": 220, "width": 150, "height": 150}}}}
		updateBody, err := json.Marshal(updatePayload)
		require.NoError(t, err)

		updateReq := httptest.NewRequest(http.MethodPost, "/api/lobbies/"+lobby.Code+"/canvas-patches", strings.NewReader(string(updateBody)))
		updateReq.Header.Set("Content-Type", "application/json")
		updateW := httptest.NewRecorder()

		ApplyCanvasPatch(updateW, updateReq)
		assert.Equal(t, http.StatusOK, updateW.Code)

		phases, err := models.GetAllCanvasPhases(lobby.Code)
		require.NoError(t, err)
		assert.NotEmpty(t, phases[0].ImagesOnCanvas)
		assert.Equal(t, "https://example.com/pic.png", phases[0].ImagesOnCanvas[0].Src)
		assert.Equal(t, 200.0, phases[0].ImagesOnCanvas[0].X)
		assert.Equal(t, 220.0, phases[0].ImagesOnCanvas[0].Y)
	})
}
