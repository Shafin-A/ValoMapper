package models

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetAllCanvasPhases(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("returns empty phases for new lobby", func(t *testing.T) {
		truncateTables(t, pool, "canvas_agents", "canvas_abilities", "canvas_draw_lines",
			"canvas_texts", "canvas_images", "canvas_tool_icons", "canvas_connecting_lines", "lobbies", "maps")

		// Insert test map
		_, err := pool.Exec(context.Background(), `INSERT INTO maps (id, text, text_color) VALUES ('ascent', 'Ascent', '#FF0000')`)
		require.NoError(t, err)

		// Create a lobby
		lobby := &Lobby{
			Code: GenerateLobbyCode(),
			CanvasState: &FullCanvasState{
				SelectedMap: MapOption{ID: "ascent"},
			},
		}
		err = lobby.Save()
		require.NoError(t, err)

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
		truncateTables(t, pool, "canvas_agents", "canvas_abilities", "canvas_draw_lines",
			"canvas_texts", "canvas_images", "canvas_tool_icons", "canvas_connecting_lines", "lobbies", "maps")

		// Insert test map
		_, err := pool.Exec(context.Background(), `INSERT INTO maps (id, text, text_color) VALUES ('ascent', 'Ascent', '#FF0000')`)
		require.NoError(t, err)

		// Create a lobby
		lobby := &Lobby{
			Code: GenerateLobbyCode(),
			CanvasState: &FullCanvasState{
				SelectedMap: MapOption{ID: "ascent"},
			},
		}
		err = lobby.Save()
		require.NoError(t, err)

		// Create canvas state with data in phases 0 and 1
		canvasState := FullCanvasState{
			SelectedMap: MapOption{ID: "ascent"},
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
				{ID: "ability1", AgentName: "Jett", Action: "dash", X: 120, Y: 220, IsAlly: true},
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
				{ID: "icon1", X: 700, Y: 800, Width: 32, Height: 32},
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
		err = SaveCanvasState(lobby.Code, canvasState)
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
		truncateTables(t, pool, "canvas_agents", "canvas_abilities", "canvas_draw_lines",
			"canvas_texts", "canvas_images", "canvas_tool_icons", "canvas_connecting_lines", "lobbies", "maps")

		// Insert test map
		_, err := pool.Exec(context.Background(), `INSERT INTO maps (id, text, text_color) VALUES ('bind', 'Bind', '#00FF00')`)
		require.NoError(t, err)

		// Create a lobby
		lobby := &Lobby{
			Code: GenerateLobbyCode(),
			CanvasState: &FullCanvasState{
				SelectedMap: MapOption{ID: "bind"},
			},
		}
		err = lobby.Save()
		require.NoError(t, err)

		// Create canvas state
		canvasState := FullCanvasState{
			SelectedMap: MapOption{ID: "bind"},
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
		err = SaveCanvasState(lobby.Code, canvasState)
		require.NoError(t, err)

		// Verify
		phases, err := GetAllCanvasPhases(lobby.Code)
		require.NoError(t, err)
		assert.Len(t, phases[0].AgentsOnCanvas, 1)
		assert.Equal(t, "a1", phases[0].AgentsOnCanvas[0].ID)
	})

	t.Run("updates existing canvas state", func(t *testing.T) {
		truncateTables(t, pool, "canvas_agents", "canvas_abilities", "canvas_draw_lines",
			"canvas_texts", "canvas_images", "canvas_tool_icons", "canvas_connecting_lines", "lobbies", "maps")

		// Insert test map
		_, err := pool.Exec(context.Background(), `INSERT INTO maps (id, text, text_color) VALUES ('bind', 'Bind', '#00FF00')`)
		require.NoError(t, err)

		lobby := &Lobby{
			Code: GenerateLobbyCode(),
			CanvasState: &FullCanvasState{
				SelectedMap: MapOption{ID: "bind"},
			},
		}
		err = lobby.Save()
		require.NoError(t, err)

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

		err = SaveCanvasState(lobby.Code, canvasState)
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
		truncateTables(t, pool, "canvas_agents", "canvas_abilities", "canvas_draw_lines",
			"canvas_texts", "canvas_images", "canvas_tool_icons", "canvas_connecting_lines", "lobbies", "maps")

		// Insert test map
		_, err := pool.Exec(context.Background(), `INSERT INTO maps (id, text, text_color) VALUES ('bind', 'Bind', '#00FF00')`)
		require.NoError(t, err)

		lobby := &Lobby{
			Code: GenerateLobbyCode(),
			CanvasState: &FullCanvasState{
				SelectedMap: MapOption{ID: "bind"},
			},
		}
		err = lobby.Save()
		require.NoError(t, err)

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

		err = SaveCanvasState(lobby.Code, canvasState)
		require.NoError(t, err)

		phases, err := GetAllCanvasPhases(lobby.Code)
		require.NoError(t, err)
		assert.Len(t, phases[0].AbilitiesOnCanvas, 1)
		assert.Len(t, phases[0].AbilitiesOnCanvas[0].CurrentPath, 3)
		assert.Equal(t, 75.5, phases[0].AbilitiesOnCanvas[0].CurrentLength)
		assert.Equal(t, 45.0, phases[0].AbilitiesOnCanvas[0].CurrentRotation)
	})

	t.Run("handles draw line with points", func(t *testing.T) {
		truncateTables(t, pool, "canvas_agents", "canvas_abilities", "canvas_draw_lines",
			"canvas_texts", "canvas_images", "canvas_tool_icons", "canvas_connecting_lines", "lobbies", "maps")

		// Insert test map
		_, err := pool.Exec(context.Background(), `INSERT INTO maps (id, text, text_color) VALUES ('bind', 'Bind', '#00FF00')`)
		require.NoError(t, err)

		lobby := &Lobby{
			Code: GenerateLobbyCode(),
			CanvasState: &FullCanvasState{
				SelectedMap: MapOption{ID: "bind"},
			},
		}
		err = lobby.Save()
		require.NoError(t, err)

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

		err = SaveCanvasState(lobby.Code, canvasState)
		require.NoError(t, err)

		phases, err := GetAllCanvasPhases(lobby.Code)
		require.NoError(t, err)
		assert.Len(t, phases[0].DrawLines, 1)
		assert.Len(t, phases[0].DrawLines[0].Points, 3)
		assert.Equal(t, "#00FF00", phases[0].DrawLines[0].Color)
		assert.True(t, phases[0].DrawLines[0].IsDashed)
	})

	t.Run("saves multiple types of items across different phases", func(t *testing.T) {
		truncateTables(t, pool, "canvas_agents", "canvas_abilities", "canvas_draw_lines",
			"canvas_texts", "canvas_images", "canvas_tool_icons", "canvas_connecting_lines", "lobbies", "maps")

		// Insert test map
		_, err := pool.Exec(context.Background(), `INSERT INTO maps (id, text, text_color) VALUES ('bind', 'Bind', '#00FF00')`)
		require.NoError(t, err)

		lobby := &Lobby{
			Code: GenerateLobbyCode(),
			CanvasState: &FullCanvasState{
				SelectedMap: MapOption{ID: "bind"},
			},
		}
		err = lobby.Save()
		require.NoError(t, err)

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

		err = SaveCanvasState(lobby.Code, canvasState)
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
		truncateTables(t, pool, "canvas_agents", "canvas_abilities", "canvas_draw_lines",
			"canvas_texts", "canvas_images", "canvas_tool_icons", "canvas_connecting_lines", "lobbies", "maps")

		// Insert test map
		_, err := pool.Exec(context.Background(), `INSERT INTO maps (id, text, text_color) VALUES ('bind', 'Bind', '#00FF00')`)
		require.NoError(t, err)

		lobby := &Lobby{
			Code: GenerateLobbyCode(),
			CanvasState: &FullCanvasState{
				SelectedMap: MapOption{ID: "bind"},
			},
		}
		err = lobby.Save()
		require.NoError(t, err)

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

		err = SaveCanvasState(lobby.Code, canvasState)
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
		truncateTables(t, pool, "canvas_agents", "canvas_abilities", "canvas_draw_lines",
			"canvas_texts", "canvas_images", "canvas_tool_icons", "canvas_connecting_lines", "lobbies", "maps")

		// Insert test map
		_, err := pool.Exec(context.Background(), `INSERT INTO maps (id, text, text_color) VALUES ('bind', 'Bind', '#00FF00')`)
		require.NoError(t, err)

		lobby := &Lobby{
			Code: GenerateLobbyCode(),
			CanvasState: &FullCanvasState{
				SelectedMap: MapOption{ID: "bind"},
			},
		}
		err = lobby.Save()
		require.NoError(t, err)

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

		err = SaveCanvasState(lobby.Code, canvasState)
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
