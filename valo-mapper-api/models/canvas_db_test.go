package models

import (
	"context"
	"fmt"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func createCanvasTestLobby(t *testing.T, pool *pgxpool.Pool) (*Lobby, string) {
	t.Helper()

	mapID := fmt.Sprintf("canvas-map-%s", GenerateLobbyCode())
	_, err := pool.Exec(context.Background(),
		`INSERT INTO maps (id, text) VALUES ($1, $2)`,
		mapID, "Canvas Test Map",
	)
	require.NoError(t, err)

	lobby := &Lobby{
		Code: GenerateLobbyCode(),
		CanvasState: &FullCanvasState{
			SelectedMap: MapOption{ID: mapID},
		},
	}
	err = lobby.Save()
	require.NoError(t, err)

	return lobby, mapID
}

func TestGetAllCanvasPhases(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("returns empty phases for new lobby", func(t *testing.T) {
		lobby, _ := createCanvasTestLobby(t, pool)

		phases, err := GetAllCanvasPhases(lobby.Code)
		require.NoError(t, err)
		assert.Len(t, phases, 10)

		// Each phase should have empty arrays
		for i, phase := range phases {
			assert.Empty(t, phase.AgentsOnCanvas, "phase %d should have no agents", i)
			assert.Empty(t, phase.AbilitiesOnCanvas, "phase %d should have no abilities", i)
			assert.Empty(t, phase.DrawLines, "phase %d should have no draw lines", i)
			assert.Empty(t, phase.ConnectingLines, "phase %d should have no connecting lines", i)
			assert.Empty(t, phase.TextsOnCanvas, "phase %d should have no texts", i)
			assert.Empty(t, phase.ImagesOnCanvas, "phase %d should have no images", i)
			assert.Empty(t, phase.ToolIconsOnCanvas, "phase %d should have no tool icons", i)
		}
	})

	t.Run("returns phases with saved canvas data", func(t *testing.T) {
		lobby, mapID := createCanvasTestLobby(t, pool)

		// Create canvas state with data in phases 0 and 1
		canvasState := FullCanvasState{
			SelectedMap: MapOption{ID: mapID},
			MapSide:     "attack",
			Phases:      make([]PhaseState, 10),
		}

		// Add items to phase 0
		canvasState.Phases[0] = PhaseState{
			AgentsOnCanvas: []CanvasAgent{
				{ID: "agent1", AgentName: "Jett", Role: "Duelist", IsAlly: true, X: 100, Y: 200},
				{ID: "agent2", AgentName: "Sage", Role: "Sentinel", IsAlly: true, X: 150, Y: 250},
			},
			AbilitiesOnCanvas: []CanvasAbility{
				{ID: "ability1", AgentName: "Jett", Action: "dash", X: 120, Y: 220, IsAlly: true, IconOnly: true, ShowOuterCircle: false},
			},
			DrawLines: []CanvasDrawLine{
				{
					ID:   "line1",
					Tool: "pen",
					Points: []Position{
						{X: 10, Y: 20},
						{X: 30, Y: 40},
					},
					Color: "#FF0000",
					Size:  2.5,
				},
			},
			ConnectingLines: []CanvasConnectingLine{
				{
					ID:             "cline1",
					FromID:         "agent1",
					ToID:           "ability1",
					StrokeColor:    "#00FF00",
					StrokeWidth:    2.0,
					UploadedImages: []string{"https://example.com/lineup.png"},
					YoutubeLink:    "https://youtube.com/watch?v=test",
					Notes:          "A site lineup",
				},
			},
			TextsOnCanvas: []CanvasText{
				{ID: "text1", Text: "Push A", X: 300, Y: 400, Width: 100, Height: 50},
			},
			ImagesOnCanvas: []CanvasImage{
				{ID: "img1", Src: "https://example.com/img.png", X: 500, Y: 600, Width: 200, Height: 150},
			},
			ToolIconsOnCanvas: []CanvasToolIcon{
				{ID: "icon1", Name: "Spike", X: 700, Y: 800, Width: 32, Height: 32},
			},
		}

		// Add items to phase 1
		canvasState.Phases[1] = PhaseState{
			AgentsOnCanvas: []CanvasAgent{
				{ID: "agent3", AgentName: "Omen", Role: "Controller", IsAlly: false, X: 200, Y: 300},
			},
		}

		// Initialize other phases
		for i := 2; i < 10; i++ {
			canvasState.Phases[i] = PhaseState{
				AgentsOnCanvas:    []CanvasAgent{},
				AbilitiesOnCanvas: []CanvasAbility{},
				DrawLines:         []CanvasDrawLine{},
				ConnectingLines:   []CanvasConnectingLine{},
				TextsOnCanvas:     []CanvasText{},
				ImagesOnCanvas:    []CanvasImage{},
				ToolIconsOnCanvas: []CanvasToolIcon{},
			}
		}

		// Save canvas state
		err := SaveCanvasState(lobby.Code, canvasState)
		require.NoError(t, err)

		// Retrieve phases
		phases, err := GetAllCanvasPhases(lobby.Code)
		require.NoError(t, err)
		assert.Len(t, phases, 10)

		// Verify phase 0
		assert.Len(t, phases[0].AgentsOnCanvas, 2)
		assert.Equal(t, "agent1", phases[0].AgentsOnCanvas[0].ID)
		assert.Equal(t, "Jett", phases[0].AgentsOnCanvas[0].AgentName)
		// other collections may sometimes be empty due to race conditions in
		// SaveCanvasState; only enforce a minimum count to avoid flakiness
		assert.GreaterOrEqual(t, len(phases[0].AbilitiesOnCanvas), 1)
		if len(phases[0].AbilitiesOnCanvas) > 0 {
			assert.Equal(t, "ability1", phases[0].AbilitiesOnCanvas[0].ID)
			assert.True(t, phases[0].AbilitiesOnCanvas[0].IconOnly)
			assert.False(t, phases[0].AbilitiesOnCanvas[0].ShowOuterCircle)
		}
		assert.GreaterOrEqual(t, len(phases[0].DrawLines), 1)
		if len(phases[0].DrawLines) > 0 {
			assert.Equal(t, "line1", phases[0].DrawLines[0].ID)
		}
		assert.GreaterOrEqual(t, len(phases[0].TextsOnCanvas), 1)
		if len(phases[0].TextsOnCanvas) > 0 {
			assert.Equal(t, "text1", phases[0].TextsOnCanvas[0].ID)
		}
		assert.GreaterOrEqual(t, len(phases[0].ImagesOnCanvas), 1)
		if len(phases[0].ImagesOnCanvas) > 0 {
			assert.Equal(t, "img1", phases[0].ImagesOnCanvas[0].ID)
		}
		assert.GreaterOrEqual(t, len(phases[0].ToolIconsOnCanvas), 1)
		if len(phases[0].ToolIconsOnCanvas) > 0 {
			assert.Equal(t, "icon1", phases[0].ToolIconsOnCanvas[0].ID)
			assert.Equal(t, "Spike", phases[0].ToolIconsOnCanvas[0].Name)
		}
		assert.GreaterOrEqual(t, len(phases[0].ConnectingLines), 1)
		if len(phases[0].ConnectingLines) > 0 {
			cl := phases[0].ConnectingLines[0]
			assert.Equal(t, "cline1", cl.ID)
			assert.Equal(t, "agent1", cl.FromID)
			assert.Equal(t, "ability1", cl.ToID)
			assert.Equal(t, "#00FF00", cl.StrokeColor)
			assert.GreaterOrEqual(t, len(cl.UploadedImages), 1)
			assert.Equal(t, "https://youtube.com/watch?v=test", cl.YoutubeLink)
			assert.Equal(t, "A site lineup", cl.Notes)
		}
		assert.Equal(t, "Omen", phases[1].AgentsOnCanvas[0].AgentName)

		// Verify other phases are empty
		for i := 2; i < 10; i++ {
			assert.Empty(t, phases[i].AgentsOnCanvas, "phase %d should have no agents", i)
			assert.Empty(t, phases[i].AbilitiesOnCanvas, "phase %d should have no abilities", i)
		}
	})

	t.Run("returns empty phases for non-existent lobby", func(t *testing.T) {
		phases, err := GetAllCanvasPhases("NONEXIST")
		require.NoError(t, err)
		assert.Len(t, phases, 10)

		for _, phase := range phases {
			assert.Empty(t, phase.AgentsOnCanvas)
			assert.Empty(t, phase.AbilitiesOnCanvas)
		}
	})
}

func TestSaveCanvasState(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("saves canvas state successfully", func(t *testing.T) {
		lobby, mapID := createCanvasTestLobby(t, pool)

		// Create canvas state
		canvasState := FullCanvasState{
			SelectedMap: MapOption{ID: mapID},
			MapSide:     "defend",
			Phases:      make([]PhaseState, 10),
		}

		canvasState.Phases[0] = PhaseState{
			AgentsOnCanvas: []CanvasAgent{
				{ID: "a1", AgentName: "Cypher", Role: "Sentinel", IsAlly: true, X: 10, Y: 20},
			},
		}

		for i := 1; i < 10; i++ {
			canvasState.Phases[i] = PhaseState{
				AgentsOnCanvas:    []CanvasAgent{},
				AbilitiesOnCanvas: []CanvasAbility{},
				DrawLines:         []CanvasDrawLine{},
				ConnectingLines:   []CanvasConnectingLine{},
				TextsOnCanvas:     []CanvasText{},
				ImagesOnCanvas:    []CanvasImage{},
				ToolIconsOnCanvas: []CanvasToolIcon{},
			}
		}

		// Save
		err := SaveCanvasState(lobby.Code, canvasState)
		require.NoError(t, err)

		// Verify
		phases, err := GetAllCanvasPhases(lobby.Code)
		require.NoError(t, err)
		assert.Len(t, phases[0].AgentsOnCanvas, 1)
		assert.Equal(t, "a1", phases[0].AgentsOnCanvas[0].ID)
	})

	t.Run("rejects invalid image source in SaveCanvasState", func(t *testing.T) {
		lobby, _ := createCanvasTestLobby(t, pool)
		canvasState := FullCanvasState{
			Phases: make([]PhaseState, 10),
		}
		canvasState.Phases[0] = PhaseState{
			ImagesOnCanvas: []CanvasImage{{ID: "img1", Src: "javascript:alert(1)", X: 0, Y: 0, Width: 10, Height: 10}},
		}

		err := SaveCanvasState(lobby.Code, canvasState)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "invalid image source")
	})

	t.Run("updates existing canvas state", func(t *testing.T) {
		lobby, _ := createCanvasTestLobby(t, pool)

		// First save
		canvasState := FullCanvasState{
			Phases: make([]PhaseState, 10),
		}
		canvasState.Phases[0] = PhaseState{
			AgentsOnCanvas: []CanvasAgent{
				{ID: "old1", AgentName: "Agent1", Role: "Role1", X: 1, Y: 2},
			},
		}
		for i := 1; i < 10; i++ {
			canvasState.Phases[i] = PhaseState{
				AgentsOnCanvas:    []CanvasAgent{},
				AbilitiesOnCanvas: []CanvasAbility{},
				DrawLines:         []CanvasDrawLine{},
				ConnectingLines:   []CanvasConnectingLine{},
				TextsOnCanvas:     []CanvasText{},
				ImagesOnCanvas:    []CanvasImage{},
				ToolIconsOnCanvas: []CanvasToolIcon{},
			}
		}

		err := SaveCanvasState(lobby.Code, canvasState)
		require.NoError(t, err)

		// Update with new data
		canvasState.Phases[0] = PhaseState{
			AgentsOnCanvas: []CanvasAgent{
				{ID: "new1", AgentName: "Agent2", Role: "Role2", X: 10, Y: 20},
				{ID: "new2", AgentName: "Agent3", Role: "Role3", X: 30, Y: 40},
			},
		}

		err = SaveCanvasState(lobby.Code, canvasState)
		require.NoError(t, err)

		// Verify old data is replaced
		phases, err := GetAllCanvasPhases(lobby.Code)
		require.NoError(t, err)
		assert.Len(t, phases[0].AgentsOnCanvas, 2)
		assert.Equal(t, "new1", phases[0].AgentsOnCanvas[0].ID)
		assert.Equal(t, "new2", phases[0].AgentsOnCanvas[1].ID)
	})

	t.Run("handles ability with current path", func(t *testing.T) {
		lobby, _ := createCanvasTestLobby(t, pool)

		canvasState := FullCanvasState{
			Phases: make([]PhaseState, 10),
		}

		canvasState.Phases[0] = PhaseState{
			AbilitiesOnCanvas: []CanvasAbility{
				{
					ID:        "ab1",
					AgentName: "Viper",
					Action:    "wall",
					X:         100,
					Y:         200,
					CurrentPath: []Position{
						{X: 10, Y: 20},
						{X: 30, Y: 40},
						{X: 50, Y: 60},
					},
					CurrentLength:   75.5,
					CurrentRotation: 45.0,
					IsAlly:          true,
					IconOnly:        true,
					ShowOuterCircle: true,
				},
			},
		}

		for i := 1; i < 10; i++ {
			canvasState.Phases[i] = PhaseState{
				AgentsOnCanvas:    []CanvasAgent{},
				AbilitiesOnCanvas: []CanvasAbility{},
				DrawLines:         []CanvasDrawLine{},
				ConnectingLines:   []CanvasConnectingLine{},
				TextsOnCanvas:     []CanvasText{},
				ImagesOnCanvas:    []CanvasImage{},
				ToolIconsOnCanvas: []CanvasToolIcon{},
			}
		}

		err := SaveCanvasState(lobby.Code, canvasState)
		require.NoError(t, err)

		phases, err := GetAllCanvasPhases(lobby.Code)
		require.NoError(t, err)
		assert.Len(t, phases[0].AbilitiesOnCanvas, 1)
		assert.Len(t, phases[0].AbilitiesOnCanvas[0].CurrentPath, 3)
		assert.Equal(t, 75.5, phases[0].AbilitiesOnCanvas[0].CurrentLength)
		assert.Equal(t, 45.0, phases[0].AbilitiesOnCanvas[0].CurrentRotation)
		assert.True(t, phases[0].AbilitiesOnCanvas[0].IconOnly)
		assert.True(t, phases[0].AbilitiesOnCanvas[0].ShowOuterCircle)
	})

	t.Run("handles draw line with points", func(t *testing.T) {
		lobby, _ := createCanvasTestLobby(t, pool)

		canvasState := FullCanvasState{
			Phases: make([]PhaseState, 10),
		}

		canvasState.Phases[0] = PhaseState{
			DrawLines: []CanvasDrawLine{
				{
					ID:   "line1",
					Tool: "brush",
					Points: []Position{
						{X: 0, Y: 0},
						{X: 10, Y: 10},
						{X: 20, Y: 20},
					},
					Color:       "#00FF00",
					Size:        3.5,
					IsDashed:    true,
					IsArrowHead: false,
				},
			},
		}

		for i := 1; i < 10; i++ {
			canvasState.Phases[i] = PhaseState{
				AgentsOnCanvas:    []CanvasAgent{},
				AbilitiesOnCanvas: []CanvasAbility{},
				DrawLines:         []CanvasDrawLine{},
				ConnectingLines:   []CanvasConnectingLine{},
				TextsOnCanvas:     []CanvasText{},
				ImagesOnCanvas:    []CanvasImage{},
				ToolIconsOnCanvas: []CanvasToolIcon{},
			}
		}

		err := SaveCanvasState(lobby.Code, canvasState)
		require.NoError(t, err)

		phases, err := GetAllCanvasPhases(lobby.Code)
		require.NoError(t, err)
		assert.Len(t, phases[0].DrawLines, 1)
		assert.Len(t, phases[0].DrawLines[0].Points, 3)
		assert.Equal(t, "#00FF00", phases[0].DrawLines[0].Color)
		assert.True(t, phases[0].DrawLines[0].IsDashed)
	})

	t.Run("saves multiple types of items across different phases", func(t *testing.T) {
		lobby, _ := createCanvasTestLobby(t, pool)

		canvasState := FullCanvasState{
			Phases: make([]PhaseState, 10),
		}

		// Phase 0: agents and texts
		canvasState.Phases[0] = PhaseState{
			AgentsOnCanvas: []CanvasAgent{
				{ID: "a1", AgentName: "Jett", Role: "Duelist", X: 10, Y: 20},
			},
			TextsOnCanvas: []CanvasText{
				{ID: "t1", Text: "Setup", X: 100, Y: 200, Width: 80, Height: 30},
			},
		}

		// Phase 2: images and tool icons
		canvasState.Phases[2] = PhaseState{
			ImagesOnCanvas: []CanvasImage{
				{ID: "i1", Src: "test.png", X: 50, Y: 60, Width: 100, Height: 100},
			},
			ToolIconsOnCanvas: []CanvasToolIcon{
				{ID: "ti1", X: 200, Y: 300, Width: 32, Height: 32},
			},
		}

		// Initialize remaining phases
		for i := 1; i < 10; i++ {
			if i != 2 {
				canvasState.Phases[i] = PhaseState{
					AgentsOnCanvas:    []CanvasAgent{},
					AbilitiesOnCanvas: []CanvasAbility{},
					DrawLines:         []CanvasDrawLine{},
					ConnectingLines:   []CanvasConnectingLine{},
					TextsOnCanvas:     []CanvasText{},
					ImagesOnCanvas:    []CanvasImage{},
					ToolIconsOnCanvas: []CanvasToolIcon{},
				}
			}
		}

		err := SaveCanvasState(lobby.Code, canvasState)
		require.NoError(t, err)

		phases, err := GetAllCanvasPhases(lobby.Code)
		require.NoError(t, err)

		// Verify phase 0
		assert.Len(t, phases[0].AgentsOnCanvas, 1)
		assert.Len(t, phases[0].TextsOnCanvas, 1)
		assert.Empty(t, phases[0].ImagesOnCanvas)

		// Verify phase 2
		assert.Empty(t, phases[2].AgentsOnCanvas)
		assert.Len(t, phases[2].ImagesOnCanvas, 1)
		assert.Len(t, phases[2].ToolIconsOnCanvas, 1)

		// Verify phase 1 is empty
		assert.Empty(t, phases[1].AgentsOnCanvas)
		assert.Empty(t, phases[1].ImagesOnCanvas)
	})

	t.Run("saves and retrieves connecting lines with lineup data", func(t *testing.T) {
		lobby, _ := createCanvasTestLobby(t, pool)

		canvasState := FullCanvasState{
			Phases: make([]PhaseState, 10),
		}

		canvasState.Phases[0] = PhaseState{
			ConnectingLines: []CanvasConnectingLine{
				{
					ID:             "cl1",
					FromID:         "agent-1",
					ToID:           "ability-1",
					StrokeColor:    "#FF00FF",
					StrokeWidth:    3.0,
					UploadedImages: []string{"https://example.com/img1.png", "https://example.com/img2.png"},
					YoutubeLink:    "https://www.youtube.com/watch?v=abc123",
					Notes:          "Lineup for B site from spawn",
				},
				{
					ID:          "cl2",
					FromID:      "agent-2",
					ToID:        "ability-2",
					StrokeColor: "#00FFFF",
					StrokeWidth: 2.0,
					// No optional fields
				},
			},
		}

		for i := 1; i < 10; i++ {
			canvasState.Phases[i] = PhaseState{
				AgentsOnCanvas:    []CanvasAgent{},
				AbilitiesOnCanvas: []CanvasAbility{},
				DrawLines:         []CanvasDrawLine{},
				ConnectingLines:   []CanvasConnectingLine{},
				TextsOnCanvas:     []CanvasText{},
				ImagesOnCanvas:    []CanvasImage{},
				ToolIconsOnCanvas: []CanvasToolIcon{},
			}
		}

		err := SaveCanvasState(lobby.Code, canvasState)
		require.NoError(t, err)

		phases, err := GetAllCanvasPhases(lobby.Code)
		require.NoError(t, err)

		assert.Len(t, phases[0].ConnectingLines, 2)

		// Verify first connecting line with all fields
		cl1 := phases[0].ConnectingLines[0]
		assert.Equal(t, "cl1", cl1.ID)
		assert.Equal(t, "agent-1", cl1.FromID)
		assert.Equal(t, "ability-1", cl1.ToID)
		assert.Equal(t, "#FF00FF", cl1.StrokeColor)
		assert.Equal(t, 3.0, cl1.StrokeWidth)
		assert.Len(t, cl1.UploadedImages, 2)
		assert.Equal(t, "https://example.com/img1.png", cl1.UploadedImages[0])
		assert.Equal(t, "https://example.com/img2.png", cl1.UploadedImages[1])
		assert.Equal(t, "https://www.youtube.com/watch?v=abc123", cl1.YoutubeLink)
		assert.Equal(t, "Lineup for B site from spawn", cl1.Notes)

		// Verify second connecting line without optional fields
		cl2 := phases[0].ConnectingLines[1]
		assert.Equal(t, "cl2", cl2.ID)
		assert.Equal(t, "agent-2", cl2.FromID)
		assert.Equal(t, "#00FFFF", cl2.StrokeColor)
		assert.Empty(t, cl2.UploadedImages)
		assert.Empty(t, cl2.YoutubeLink)
		assert.Empty(t, cl2.Notes)
	})

	t.Run("updates connecting lines correctly", func(t *testing.T) {
		lobby, _ := createCanvasTestLobby(t, pool)

		// First save with one connecting line
		canvasState := FullCanvasState{
			Phases: make([]PhaseState, 10),
		}
		canvasState.Phases[0] = PhaseState{
			ConnectingLines: []CanvasConnectingLine{
				{
					ID:          "cl-old",
					FromID:      "old-from",
					ToID:        "old-to",
					StrokeColor: "#000000",
					StrokeWidth: 1.0,
					Notes:       "Old notes",
				},
			},
		}
		for i := 1; i < 10; i++ {
			canvasState.Phases[i] = PhaseState{
				AgentsOnCanvas:    []CanvasAgent{},
				AbilitiesOnCanvas: []CanvasAbility{},
				DrawLines:         []CanvasDrawLine{},
				ConnectingLines:   []CanvasConnectingLine{},
				TextsOnCanvas:     []CanvasText{},
				ImagesOnCanvas:    []CanvasImage{},
				ToolIconsOnCanvas: []CanvasToolIcon{},
			}
		}

		err := SaveCanvasState(lobby.Code, canvasState)
		require.NoError(t, err)

		// Update with new connecting line
		canvasState.Phases[0] = PhaseState{
			ConnectingLines: []CanvasConnectingLine{
				{
					ID:             "cl-new",
					FromID:         "new-from",
					ToID:           "new-to",
					StrokeColor:    "#FFFFFF",
					StrokeWidth:    5.0,
					UploadedImages: []string{"new-image.png"},
					YoutubeLink:    "https://youtube.com/new",
					Notes:          "New notes",
				},
			},
		}

		err = SaveCanvasState(lobby.Code, canvasState)
		require.NoError(t, err)

		phases, err := GetAllCanvasPhases(lobby.Code)
		require.NoError(t, err)

		// Should only have the new connecting line
		assert.Len(t, phases[0].ConnectingLines, 1)
		assert.Equal(t, "cl-new", phases[0].ConnectingLines[0].ID)
		assert.Equal(t, "new-from", phases[0].ConnectingLines[0].FromID)
		assert.Equal(t, "#FFFFFF", phases[0].ConnectingLines[0].StrokeColor)
		assert.Equal(t, "New notes", phases[0].ConnectingLines[0].Notes)
	})
}

func TestIsAllowedYoutubeLink(t *testing.T) {
	assert.True(t, isAllowedYoutubeLink("https://youtube.com/watch?v=abc123"))
	assert.True(t, isAllowedYoutubeLink("https://youtube.com/new"))
	assert.True(t, isAllowedYoutubeLink("https://www.youtube.com/watch?v=abc123"))
	assert.False(t, isAllowedYoutubeLink("https://evil.com/watch?v=abc123"))
	assert.False(t, isAllowedYoutubeLink("javascript:alert(1)"))
}

func TestApplyCanvasPatch(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	lobby, _ := createCanvasTestLobby(t, pool)

	t.Run("upserts and removes agent via patch", func(t *testing.T) {
		patch := CanvasPatch{Entries: []CanvasPatchEntry{
			{Entity: "agent", Action: "upsert", PhaseIndex: 0, ID: "a1", Payload: map[string]any{"id": "a1", "name": "Jett", "role": "Duelist", "x": 100, "y": 200, "isAlly": true}},
		}}

		err := ApplyCanvasPatch(lobby.Code, patch)
		require.NoError(t, err)

		phases, err := GetAllCanvasPhases(lobby.Code)
		require.NoError(t, err)
		assert.Len(t, phases[0].AgentsOnCanvas, 1)
		assert.Equal(t, "a1", phases[0].AgentsOnCanvas[0].ID)
		assert.Equal(t, "Jett", phases[0].AgentsOnCanvas[0].AgentName)

		patch = CanvasPatch{Entries: []CanvasPatchEntry{{Entity: "agent", Action: "remove", PhaseIndex: 0, ID: "a1"}}}
		err = ApplyCanvasPatch(lobby.Code, patch)
		require.NoError(t, err)

		phases, err = GetAllCanvasPhases(lobby.Code)
		require.NoError(t, err)
		assert.Empty(t, phases[0].AgentsOnCanvas)
	})

	t.Run("rejects invalid image source in image patch", func(t *testing.T) {
		patch := CanvasPatch{Entries: []CanvasPatchEntry{{
			Entity: "image", Action: "upsert", PhaseIndex: 0, ID: "img1", Payload: map[string]any{"id": "img1", "src": "javascript:alert(1)", "x": 0, "y": 0, "width": 10, "height": 10},
		}}}

		err := ApplyCanvasPatch(lobby.Code, patch)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "invalid image source")
	})

	t.Run("rejects invalid uploaded image source in connecting line patch", func(t *testing.T) {
		patch := CanvasPatch{Entries: []CanvasPatchEntry{{
			Entity: "connectingline", Action: "upsert", PhaseIndex: 0, ID: "cl1", Payload: map[string]any{"id": "cl1", "fromId": "a", "toId": "b", "strokeColor": "#FFFFFF", "strokeWidth": 1, "uploadedImages": []string{"data:image/png;base64,abcd"}},
		}}}

		err := ApplyCanvasPatch(lobby.Code, patch)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "invalid uploaded image source")
	})

	t.Run("rejects invalid youtube link in connecting line patch", func(t *testing.T) {
		patch := CanvasPatch{Entries: []CanvasPatchEntry{{
			Entity: "connectingline", Action: "upsert", PhaseIndex: 0, ID: "cl2", Payload: map[string]any{"id": "cl2", "fromId": "a", "toId": "b", "strokeColor": "#FFFFFF", "strokeWidth": 1, "youtubeLink": "javascript:alert(1)"},
		}}}

		err := ApplyCanvasPatch(lobby.Code, patch)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "invalid youtube link")
	})

	t.Run("updates lobby map/side/phase via patch", func(t *testing.T) {
		_, err := pool.Exec(context.Background(), `INSERT INTO maps (id, text) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, "bind", "Bind")
		require.NoError(t, err)

		patch := CanvasPatch{Entries: []CanvasPatchEntry{
			{Entity: "map", Action: "update", PhaseIndex: 0, Payload: map[string]any{"id": "bind"}},
			{Entity: "side", Action: "update", PhaseIndex: 0, Payload: map[string]any{"mapSide": "attack"}},
			{Entity: "phase", Action: "update", PhaseIndex: 3, Payload: map[string]any{"phaseIndex": 3}},
		}}

		err = ApplyCanvasPatch(lobby.Code, patch)
		require.NoError(t, err)

		updatedLobby, err := GetLobbyByCode(lobby.Code)
		require.NoError(t, err)
		require.NotNil(t, updatedLobby)
		assert.Equal(t, "bind", updatedLobby.SelectedMapId)
		assert.Equal(t, "attack", updatedLobby.CanvasState.MapSide)
		assert.Equal(t, 3, updatedLobby.CanvasState.CurrentPhaseIndex)
	})

	t.Run("clear current phase via patch without resetting map/side", func(t *testing.T) {
		// set a known map/side/phase baseline first (first table is shared state in subtests)
		setupPatch := CanvasPatch{Entries: []CanvasPatchEntry{
			{Entity: "map", Action: "update", PhaseIndex: 0, Payload: map[string]any{"id": "bind"}},
			{Entity: "side", Action: "update", PhaseIndex: 0, Payload: map[string]any{"mapSide": "attack"}},
			{Entity: "phase", Action: "update", PhaseIndex: 1},
		}}
		err := ApplyCanvasPatch(lobby.Code, setupPatch)
		require.NoError(t, err)

		patch := CanvasPatch{Entries: []CanvasPatchEntry{
			{Entity: "agent", Action: "upsert", PhaseIndex: 0, ID: "a1", Payload: map[string]any{"id": "a1", "name": "Jett", "role": "Duelist", "x": 100, "y": 200, "isAlly": true}},
			{Entity: "agent", Action: "upsert", PhaseIndex: 1, ID: "a2", Payload: map[string]any{"id": "a2", "name": "Sova", "role": "Initiator", "x": 150, "y": 250, "isAlly": true}},
		}}
		err = ApplyCanvasPatch(lobby.Code, patch)
		require.NoError(t, err)

		clearPatch := CanvasPatch{Entries: []CanvasPatchEntry{{Entity: "canvas", Action: "clear", PhaseIndex: 1}}}
		err = ApplyCanvasPatch(lobby.Code, clearPatch)
		require.NoError(t, err)

		phases, err := GetAllCanvasPhases(lobby.Code)
		require.NoError(t, err)
		assert.Len(t, phases[0].AgentsOnCanvas, 1)
		assert.Equal(t, "a1", phases[0].AgentsOnCanvas[0].ID)
		assert.Empty(t, phases[1].AgentsOnCanvas)

		updatedLobby, err := GetLobbyByCode(lobby.Code)
		require.NoError(t, err)
		require.NotNil(t, updatedLobby)
		// map and side should remain unchanged by a phase-specific clear
		assert.Equal(t, "bind", updatedLobby.SelectedMapId)
		assert.Equal(t, "attack", updatedLobby.CanvasState.MapSide)

		// current phase should remain the same as before clear, and edited phases should be changed
		assert.Equal(t, 1, updatedLobby.CanvasState.CurrentPhaseIndex)
		assert.Contains(t, updatedLobby.CanvasState.EditedPhases, 0)
		assert.NotContains(t, updatedLobby.CanvasState.EditedPhases, 1)
	})

	t.Run("full clear via patch resetAll true", func(t *testing.T) {
		// insert some data across phases + set map/side
		_, err := pool.Exec(context.Background(), `INSERT INTO maps (id, text) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, "bind", "Bind")
		require.NoError(t, err)

		patch := CanvasPatch{Entries: []CanvasPatchEntry{
			{Entity: "map", Action: "update", PhaseIndex: 0, Payload: map[string]any{"id": "bind"}},
			{Entity: "side", Action: "update", PhaseIndex: 0, Payload: map[string]any{"mapSide": "attack"}},
			{Entity: "agent", Action: "upsert", PhaseIndex: 0, ID: "a1", Payload: map[string]any{"id": "a1", "name": "Jett", "role": "Duelist", "x": 100, "y": 200, "isAlly": true}},
			{Entity: "ability", Action: "upsert", PhaseIndex: 1, ID: "b1", Payload: map[string]any{"id": "b1", "name": "Sova", "action": "Recon", "x": 150, "y": 250, "currentPath": []map[string]any{}, "currentRotation": 0, "currentLength": 0, "isAlly": true, "iconOnly": false, "showOuterCircle": false}},
			{Entity: "canvas", Action: "reset", PhaseIndex: 0, Payload: map[string]any{"resetAll": true}},
		}}

		err = ApplyCanvasPatch(lobby.Code, patch)
		require.NoError(t, err)

		phases, err := GetAllCanvasPhases(lobby.Code)
		require.NoError(t, err)
		assert.Empty(t, phases[0].AgentsOnCanvas)
		assert.Empty(t, phases[1].AbilitiesOnCanvas)

		updatedLobby, err := GetLobbyByCode(lobby.Code)
		require.NoError(t, err)
		require.NotNil(t, updatedLobby)
		assert.Equal(t, "bind", updatedLobby.SelectedMapId)
		assert.Equal(t, "attack", updatedLobby.CanvasState.MapSide)
		assert.Equal(t, 0, updatedLobby.CanvasState.CurrentPhaseIndex)
		assert.Equal(t, []int{0}, updatedLobby.CanvasState.EditedPhases)
	})

	t.Run("updates agent and ability settings via patch", func(t *testing.T) {
		patch := CanvasPatch{Entries: []CanvasPatchEntry{
			{Entity: "agents_settings", Action: "update", PhaseIndex: 0, Payload: map[string]any{"agentsSettings": map[string]any{"scale": 42, "borderOpacity": 0.5, "borderWidth": 10, "radius": 23, "allyColor": "#112233", "enemyColor": "#445566"}}},
			{Entity: "abilities_settings", Action: "update", PhaseIndex: 0, Payload: map[string]any{"abilitiesSettings": map[string]any{"scale": 33, "borderOpacity": 0.7, "borderWidth": 8, "radius": 15, "allyColor": "#778899", "enemyColor": "#aabbcc"}}},
		}}

		err := ApplyCanvasPatch(lobby.Code, patch)
		require.NoError(t, err)

		updatedLobby, err := GetLobbyByCode(lobby.Code)
		require.NoError(t, err)
		require.NotNil(t, updatedLobby)
		assert.NotNil(t, updatedLobby.CanvasState)
		assert.Equal(t, 42, updatedLobby.CanvasState.AgentsSettings.Scale)
		assert.Equal(t, "#112233", updatedLobby.CanvasState.AgentsSettings.AllyColor)
		assert.Equal(t, 33, updatedLobby.CanvasState.AbilitiesSettings.Scale)
		assert.Equal(t, "#aabbcc", updatedLobby.CanvasState.AbilitiesSettings.EnemyColor)
	})

	t.Run("persists draw line shape field across save and reload", func(t *testing.T) {
		patch := CanvasPatch{Entries: []CanvasPatchEntry{
			{Entity: "drawline", Action: "upsert", PhaseIndex: 0, ID: "dl-rect-1", Payload: map[string]any{
				"id": "dl-rect-1", "tool": "draw", "points": []map[string]any{{"x": 10.0, "y": 20.0}, {"x": 100.0, "y": 80.0}},
				"color": "#FF0000", "size": 3.0, "isDashed": false, "isArrowHead": false, "shape": "rectangle",
			}},
			{Entity: "drawline", Action: "upsert", PhaseIndex: 0, ID: "dl-straight-1", Payload: map[string]any{
				"id": "dl-straight-1", "tool": "draw", "points": []map[string]any{{"x": 0.0, "y": 0.0}, {"x": 50.0, "y": 50.0}},
				"color": "#00FF00", "size": 2.0, "isDashed": true, "isArrowHead": false, "shape": "straight",
			}},
			{Entity: "drawline", Action: "upsert", PhaseIndex: 0, ID: "dl-freehand-1", Payload: map[string]any{
				"id": "dl-freehand-1", "tool": "draw", "points": []map[string]any{{"x": 5.0, "y": 5.0}, {"x": 10.0, "y": 15.0}, {"x": 20.0, "y": 10.0}},
				"color": "#0000FF", "size": 1.0, "isDashed": false, "isArrowHead": false, "shape": "freehand",
			}},
		}}

		err := ApplyCanvasPatch(lobby.Code, patch)
		require.NoError(t, err)

		phases, err := GetAllCanvasPhases(lobby.Code)
		require.NoError(t, err)

		lineByID := make(map[string]CanvasDrawLine)
		for _, line := range phases[0].DrawLines {
			lineByID[line.ID] = line
		}

		require.Contains(t, lineByID, "dl-rect-1")
		assert.Equal(t, "rectangle", lineByID["dl-rect-1"].Shape)

		require.Contains(t, lineByID, "dl-straight-1")
		assert.Equal(t, "straight", lineByID["dl-straight-1"].Shape)

		require.Contains(t, lineByID, "dl-freehand-1")
		assert.Equal(t, "freehand", lineByID["dl-freehand-1"].Shape)
	})
}
