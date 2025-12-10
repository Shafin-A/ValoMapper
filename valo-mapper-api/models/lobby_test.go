package models

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateLobbyCode(t *testing.T) {
	t.Run("generates lobby code", func(t *testing.T) {
		code := GenerateLobbyCode()
		assert.NotEmpty(t, code)
		assert.Greater(t, len(code), 0)
	})

	t.Run("generates unique codes", func(t *testing.T) {
		codes := make(map[string]bool)
		for range 100 {
			code := GenerateLobbyCode()
			assert.NotEmpty(t, code)
			// Check uniqueness (very unlikely to collide in 100 iterations)
			if codes[code] {
				t.Errorf("Duplicate code generated: %s", code)
			}
			codes[code] = true
		}
	})

	t.Run("generates codes without padding", func(t *testing.T) {
		code := GenerateLobbyCode()
		// base32 without padding should not contain '='
		assert.NotContains(t, code, "=")
	})

	t.Run("generates uppercase codes", func(t *testing.T) {
		code := GenerateLobbyCode()
		// base32 encoding produces uppercase letters
		assert.Equal(t, strings.ToUpper(code), code)
	})
}

func TestLobbySave(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("creates new lobby successfully", func(t *testing.T) {
		truncateTables(t, pool, "lobbies", "maps")

		// Insert a test map
		_, err := pool.Exec(context.Background(), `
			INSERT INTO maps (id, text, text_color) 
			VALUES ('ascent', 'Ascent', '#FF0000')
		`)
		require.NoError(t, err)

		lobby := &Lobby{
			Code:      GenerateLobbyCode(),
			CreatedAt: time.Now(),
			CanvasState: &FullCanvasState{
				SelectedMap: MapOption{
					ID:        "ascent",
					Text:      "Ascent",
					TextColor: "#FF0000",
				},
				MapSide:           "attack",
				CurrentPhaseIndex: 0,
				EditedPhases:      []int{},
			},
		}

		err = lobby.Save()
		require.NoError(t, err)

		// Verify lobby was created
		retrievedLobby, err := GetLobbyByCode(lobby.Code)
		require.NoError(t, err)
		require.NotNil(t, retrievedLobby)
		assert.Equal(t, lobby.Code, retrievedLobby.Code)
		assert.Equal(t, "attack", retrievedLobby.CanvasState.MapSide)
		assert.Equal(t, 0, retrievedLobby.CanvasState.CurrentPhaseIndex)
	})

	t.Run("updates existing lobby", func(t *testing.T) {
		truncateTables(t, pool, "lobbies", "maps")

		// Insert a test map
		_, err := pool.Exec(context.Background(), `
			INSERT INTO maps (id, text, text_color) 
			VALUES ('bind', 'Bind', '#00FF00')
		`)
		require.NoError(t, err)

		// Create initial lobby
		lobby := &Lobby{
			Code:      GenerateLobbyCode(),
			CreatedAt: time.Now(),
			CanvasState: &FullCanvasState{
				SelectedMap: MapOption{
					ID:        "bind",
					Text:      "Bind",
					TextColor: "#00FF00",
				},
				MapSide:           "attack",
				CurrentPhaseIndex: 0,
				EditedPhases:      []int{},
			},
		}

		err = lobby.Save()
		require.NoError(t, err)

		// Update lobby
		lobby.CanvasState.MapSide = "defend"
		lobby.CanvasState.CurrentPhaseIndex = 3
		lobby.CanvasState.EditedPhases = []int{0, 1, 2}

		err = lobby.Save()
		require.NoError(t, err)

		// Verify updates
		retrievedLobby, err := GetLobbyByCode(lobby.Code)
		require.NoError(t, err)
		require.NotNil(t, retrievedLobby)
		assert.Equal(t, "defend", retrievedLobby.CanvasState.MapSide)
		assert.Equal(t, 3, retrievedLobby.CanvasState.CurrentPhaseIndex)
		assert.Equal(t, []int{0, 1, 2}, retrievedLobby.CanvasState.EditedPhases)
	})

	t.Run("saves lobby with icon settings", func(t *testing.T) {
		truncateTables(t, pool, "lobbies", "maps")

		// Insert a test map
		_, err := pool.Exec(context.Background(), `
			INSERT INTO maps (id, text, text_color) 
			VALUES ('split', 'Split', '#0000FF')
		`)
		require.NoError(t, err)

		lobby := &Lobby{
			Code:      GenerateLobbyCode(),
			CreatedAt: time.Now(),
			CanvasState: &FullCanvasState{
				SelectedMap: MapOption{
					ID:        "split",
					Text:      "Split",
					TextColor: "#0000FF",
				},
				MapSide:           "attack",
				CurrentPhaseIndex: 0,
				EditedPhases:      []int{},
				AgentsSettings: &IconSettings{
					Scale:         100,
					BorderOpacity: 0.8,
					BorderWidth:   2,
					Radius:        10,
					AllyColor:     "#00FF00",
					EnemyColor:    "#FF0000",
				},
				AbilitiesSettings: &IconSettings{
					Scale:         80,
					BorderOpacity: 0.6,
					BorderWidth:   1,
					Radius:        8,
					AllyColor:     "#0000FF",
					EnemyColor:    "#FFFF00",
				},
			},
		}

		err = lobby.Save()
		require.NoError(t, err)

		// Verify icon settings were saved
		retrievedLobby, err := GetLobbyByCode(lobby.Code)
		require.NoError(t, err)
		require.NotNil(t, retrievedLobby)
		require.NotNil(t, retrievedLobby.CanvasState.AgentsSettings)
		require.NotNil(t, retrievedLobby.CanvasState.AbilitiesSettings)
		assert.Equal(t, 100, retrievedLobby.CanvasState.AgentsSettings.Scale)
		assert.Equal(t, 80, retrievedLobby.CanvasState.AbilitiesSettings.Scale)
	})
}

func TestGetLobbyByCode(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("retrieves existing lobby", func(t *testing.T) {
		truncateTables(t, pool, "lobbies", "maps")

		// Insert a test map
		_, err := pool.Exec(context.Background(), `
			INSERT INTO maps (id, text, text_color) 
			VALUES ('haven', 'Haven', '#FFFFFF')
		`)
		require.NoError(t, err)

		// Create lobby
		code := GenerateLobbyCode()
		lobby := &Lobby{
			Code:      code,
			CreatedAt: time.Now(),
			CanvasState: &FullCanvasState{
				SelectedMap: MapOption{
					ID:        "haven",
					Text:      "Haven",
					TextColor: "#FFFFFF",
				},
				MapSide:           "defend",
				CurrentPhaseIndex: 2,
				EditedPhases:      []int{0, 1},
			},
		}

		err = lobby.Save()
		require.NoError(t, err)

		// Retrieve lobby
		retrievedLobby, err := GetLobbyByCode(code)
		require.NoError(t, err)
		require.NotNil(t, retrievedLobby)
		assert.Equal(t, code, retrievedLobby.Code)
		assert.Equal(t, "defend", retrievedLobby.CanvasState.MapSide)
		assert.Equal(t, 2, retrievedLobby.CanvasState.CurrentPhaseIndex)
		assert.Equal(t, []int{0, 1}, retrievedLobby.CanvasState.EditedPhases)
		assert.NotNil(t, retrievedLobby.CanvasState.Phases)
		assert.Len(t, retrievedLobby.CanvasState.Phases, 10)
	})

	t.Run("returns nil for non-existent lobby", func(t *testing.T) {
		truncateTables(t, pool, "lobbies")

		lobby, err := GetLobbyByCode("NONEXIST")
		require.NoError(t, err)
		assert.Nil(t, lobby)
	})

	t.Run("retrieves lobby with icon settings", func(t *testing.T) {
		truncateTables(t, pool, "lobbies", "maps")

		// Insert a test map
		_, err := pool.Exec(context.Background(), `
			INSERT INTO maps (id, text, text_color) 
			VALUES ('breeze', 'Breeze', '#AABBCC')
		`)
		require.NoError(t, err)

		lobby := &Lobby{
			Code:      GenerateLobbyCode(),
			CreatedAt: time.Now(),
			CanvasState: &FullCanvasState{
				SelectedMap: MapOption{
					ID:        "breeze",
					Text:      "Breeze",
					TextColor: "#AABBCC",
				},
				MapSide:           "attack",
				CurrentPhaseIndex: 0,
				EditedPhases:      []int{},
				AgentsSettings: &IconSettings{
					Scale:         110,
					BorderOpacity: 0.9,
					BorderWidth:   3,
					Radius:        12,
					AllyColor:     "#11FF11",
					EnemyColor:    "#FF1111",
				},
			},
		}

		err = lobby.Save()
		require.NoError(t, err)

		retrievedLobby, err := GetLobbyByCode(lobby.Code)
		require.NoError(t, err)
		require.NotNil(t, retrievedLobby)
		require.NotNil(t, retrievedLobby.CanvasState.AgentsSettings)
		assert.Equal(t, 110, retrievedLobby.CanvasState.AgentsSettings.Scale)
		assert.Equal(t, 0.9, retrievedLobby.CanvasState.AgentsSettings.BorderOpacity)
	})

	t.Run("retrieves lobby with canvas phases", func(t *testing.T) {
		truncateTables(t, pool, "canvas_agents", "lobbies", "maps")

		// Insert a test map
		_, err := pool.Exec(context.Background(), `
			INSERT INTO maps (id, text, text_color) 
			VALUES ('icebox', 'Icebox', '#000000')
		`)
		require.NoError(t, err)

		lobby := &Lobby{
			Code:      GenerateLobbyCode(),
			CreatedAt: time.Now(),
			CanvasState: &FullCanvasState{
				SelectedMap: MapOption{
					ID:        "icebox",
					Text:      "Icebox",
					TextColor: "#000000",
				},
				MapSide:           "attack",
				CurrentPhaseIndex: 0,
				EditedPhases:      []int{},
			},
		}

		err = lobby.Save()
		require.NoError(t, err)

		// Add some canvas data
		canvasState := FullCanvasState{
			Phases: make([]PhaseState, 10),
		}
		canvasState.Phases[0] = PhaseState{
			AgentsOnCanvas: []CanvasAgent{
				{ID: "a1", AgentName: "Jett", Role: "Duelist", X: 10, Y: 20},
			},
		}
		for i := 1; i < 10; i++ {
			canvasState.Phases[i] = PhaseState{
				AgentsOnCanvas:    []CanvasAgent{},
				AbilitiesOnCanvas: []CanvasAbility{},
				DrawLines:         []CanvasDrawLine{},
				TextsOnCanvas:     []CanvasText{},
				ImagesOnCanvas:    []CanvasImage{},
				ToolIconsOnCanvas: []CanvasToolIcon{},
			}
		}
		err = SaveCanvasState(lobby.Code, canvasState)
		require.NoError(t, err)

		retrievedLobby, err := GetLobbyByCode(lobby.Code)
		require.NoError(t, err)
		require.NotNil(t, retrievedLobby)
		assert.Len(t, retrievedLobby.CanvasState.Phases, 10)
		assert.Len(t, retrievedLobby.CanvasState.Phases[0].AgentsOnCanvas, 1)
	})
}

func TestGetLobbiesByCodes(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("retrieves multiple lobbies", func(t *testing.T) {
		truncateTables(t, pool, "lobbies", "maps")

		// Insert test maps
		_, err := pool.Exec(context.Background(), `
			INSERT INTO maps (id, text, text_color) 
			VALUES ('ascent', 'Ascent', '#FF0000'),
			       ('bind', 'Bind', '#00FF00')
		`)
		require.NoError(t, err)

		// Create lobbies
		code1 := GenerateLobbyCode()
		lobby1 := &Lobby{
			Code:      code1,
			CreatedAt: time.Now(),
			CanvasState: &FullCanvasState{
				SelectedMap:       MapOption{ID: "ascent"},
				MapSide:           "attack",
				CurrentPhaseIndex: 0,
				EditedPhases:      []int{},
			},
		}
		err = lobby1.Save()
		require.NoError(t, err)

		code2 := GenerateLobbyCode()
		lobby2 := &Lobby{
			Code:      code2,
			CreatedAt: time.Now(),
			CanvasState: &FullCanvasState{
				SelectedMap:       MapOption{ID: "bind"},
				MapSide:           "defend",
				CurrentPhaseIndex: 1,
				EditedPhases:      []int{},
			},
		}
		err = lobby2.Save()
		require.NoError(t, err)

		// Retrieve lobbies
		lobbies, err := GetLobbiesByCodes([]string{code1, code2})
		require.NoError(t, err)
		assert.Len(t, lobbies, 2)

		// Verify lobbies
		codes := make(map[string]bool)
		for _, lobby := range lobbies {
			codes[lobby.Code] = true
		}
		assert.True(t, codes[code1])
		assert.True(t, codes[code2])
	})

	t.Run("returns empty slice for empty codes", func(t *testing.T) {
		lobbies, err := GetLobbiesByCodes([]string{})
		require.NoError(t, err)
		assert.Empty(t, lobbies)
	})

	t.Run("handles some non-existent codes", func(t *testing.T) {
		truncateTables(t, pool, "lobbies", "maps")

		// Insert a test map
		_, err := pool.Exec(context.Background(), `
			INSERT INTO maps (id, text, text_color) 
			VALUES ('split', 'Split', '#0000FF')
		`)
		require.NoError(t, err)

		// Create one lobby
		code1 := GenerateLobbyCode()
		lobby := &Lobby{
			Code:      code1,
			CreatedAt: time.Now(),
			CanvasState: &FullCanvasState{
				SelectedMap:       MapOption{ID: "split"},
				MapSide:           "attack",
				CurrentPhaseIndex: 0,
				EditedPhases:      []int{},
			},
		}
		err = lobby.Save()
		require.NoError(t, err)

		// Retrieve with one valid and one invalid code
		lobbies, err := GetLobbiesByCodes([]string{code1, "NONEXIST"})
		require.NoError(t, err)
		assert.Len(t, lobbies, 1)
		assert.Equal(t, code1, lobbies[0].Code)
	})
}
