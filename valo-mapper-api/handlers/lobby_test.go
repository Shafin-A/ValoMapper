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

func TestCreateLobby(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	// Clean up
	testutils.TruncateTables(t, pool, "lobbies", "maps")

	// Create test map and lobby
	_, err := pool.Exec(context.Background(),
		`INSERT INTO maps (id, text, text_color) VALUES ($1, $2, $3)
		ON CONFLICT (id) DO NOTHING`,
		models.DefaultMapID, "Default Map", "#FFFFFF",
	)
	require.NoError(t, err)

	t.Run("successfully creates lobby", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/lobbies", nil)
		w := httptest.NewRecorder()

		CreateLobby(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)
		testutils.AssertJSONContentType(t, w)

		var lobby models.Lobby
		testutils.ParseJSONResponse(t, w, &lobby)

		assert.NotEmpty(t, lobby.Code)
		assert.Len(t, lobby.Code, 7, "Lobby code should be 7 characters")
		assert.NotZero(t, lobby.CreatedAt)
		assert.NotNil(t, lobby.CanvasState)
		assert.Equal(t, models.DefaultMapID, lobby.CanvasState.SelectedMap.ID)
		assert.Equal(t, "defense", lobby.CanvasState.MapSide)
		assert.Equal(t, 0, lobby.CanvasState.CurrentPhaseIndex)
	})
}

func TestGetLobby(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "lobbies", "maps")

	_, err := pool.Exec(context.Background(),
		`INSERT INTO maps (id, text, text_color) VALUES ($1, $2, $3)
		ON CONFLICT (id) DO NOTHING`,
		"ascent", "Ascent", "#FFFFFF",
	)
	require.NoError(t, err)

	testLobby := testutils.CreateTestLobby(t, pool)

	t.Run("successfully retrieves existing lobby", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/lobbies/"+testLobby.Code, nil)
		w := httptest.NewRecorder()

		GetLobby(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		testutils.AssertJSONContentType(t, w)

		var lobby models.Lobby
		testutils.ParseJSONResponse(t, w, &lobby)

		assert.Equal(t, testLobby.Code, lobby.Code)
		assert.NotNil(t, lobby.CanvasState)
		assert.Len(t, lobby.CanvasState.Phases, 10)
	})

	t.Run("returns 404 for non-existent lobby", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/lobbies/INVALID", nil)
		w := httptest.NewRecorder()

		GetLobby(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
		testutils.AssertJSONContentType(t, w)

		var errResp testutils.ErrorResponse
		testutils.ParseJSONResponse(t, w, &errResp)
		assert.Contains(t, errResp.Error, "not found")
	})

	t.Run("rejects non-GET methods", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/lobbies/"+testLobby.Code, nil)
		w := httptest.NewRecorder()

		GetLobby(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestUpdateLobby(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "lobbies", "maps")

	_, err := pool.Exec(context.Background(),
		`INSERT INTO maps (id, text, text_color) VALUES ($1, $2, $3)
		ON CONFLICT (id) DO NOTHING`,
		"ascent", "Ascent", "#FFFFFF",
	)
	require.NoError(t, err)

	testLobby := testutils.CreateTestLobby(t, pool)

	t.Run("successfully updates lobby", func(t *testing.T) {
		updateReq := UpdateLobbyRequest{
			CanvasState: &models.FullCanvasState{
				SelectedMap: models.MapOption{
					ID:        "ascent",
					Text:      "Ascent",
					TextColor: "#FFFFFF",
				},
				MapSide:           "attack",
				CurrentPhaseIndex: 2,
				EditedPhases:      []int{0, 1, 2},
				Phases:            make([]models.PhaseState, 10),
			},
		}

		for i := range updateReq.CanvasState.Phases {
			updateReq.CanvasState.Phases[i] = models.PhaseState{
				AgentsOnCanvas:    []models.CanvasAgent{},
				AbilitiesOnCanvas: []models.CanvasAbility{},
				DrawLines:         []models.CanvasDrawLine{},
				TextsOnCanvas:     []models.CanvasText{},
				ImagesOnCanvas:    []models.CanvasImage{},
				ToolIconsOnCanvas: []models.CanvasToolIcon{},
			}
		}

		body, err := json.Marshal(updateReq)
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodPatch, "/api/lobbies/"+testLobby.Code, strings.NewReader(string(body)))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		UpdateLobby(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		testutils.AssertJSONContentType(t, w)

		var lobby models.Lobby
		testutils.ParseJSONResponse(t, w, &lobby)

		assert.Equal(t, testLobby.Code, lobby.Code)
		assert.Equal(t, "attack", lobby.CanvasState.MapSide)
		assert.Equal(t, 2, lobby.CanvasState.CurrentPhaseIndex)
		assert.Equal(t, []int{0, 1, 2}, lobby.CanvasState.EditedPhases)
	})

	t.Run("returns 404 for non-existent lobby", func(t *testing.T) {
		updateReq := UpdateLobbyRequest{
			CanvasState: &models.FullCanvasState{
				SelectedMap: models.MapOption{ID: "ascent", Text: "Ascent", TextColor: "#FFFFFF"},
				MapSide:     "defense",
			},
		}

		body, err := json.Marshal(updateReq)
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodPatch, "/api/lobbies/INVALID", strings.NewReader(string(body)))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		UpdateLobby(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("rejects non-PATCH methods", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/lobbies/"+testLobby.Code, nil)
		w := httptest.NewRecorder()

		UpdateLobby(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("rejects invalid JSON", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPatch, "/api/lobbies/"+testLobby.Code, strings.NewReader("invalid json"))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		UpdateLobby(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("rejects missing canvas state", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPatch, "/api/lobbies/"+testLobby.Code, strings.NewReader("{}"))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		UpdateLobby(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}
