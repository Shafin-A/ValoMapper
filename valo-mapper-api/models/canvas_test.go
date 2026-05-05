package models

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFullCanvasStateSerialization(t *testing.T) {
	t.Run("serializes and deserializes complete canvas state", func(t *testing.T) {
		state := FullCanvasState{
			SelectedMap: MapOption{
				ID:        "ascent",
				Text:      "Ascent",
				TextColor: "#FF0000",
			},
			MapSide:           "attack",
			CurrentPhaseIndex: 2,
			EditedPhases:      []int{0, 1, 2},
			Phases: []PhaseState{
				{
					AgentsOnCanvas: []CanvasAgent{
						{
							ID:        "agent1",
							AgentName: "Jett",
							Role:      "Duelist",
							IsAlly:    true,
							X:         100.5,
							Y:         200.5,
						},
					},
					DrawLines: []CanvasDrawLine{
						{
							ID:   "line1",
							Tool: "pen",
							Points: []Position{
								{X: 10, Y: 20},
								{X: 30, Y: 40},
							},
							Color:       "#FF0000",
							Size:        2.5,
							IsDashed:    true,
							IsArrowHead: false,
						},
					},
				},
			},
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
		}

		// Serialize
		jsonData, err := json.Marshal(state)
		require.NoError(t, err)
		assert.NotEmpty(t, jsonData)

		// Deserialize
		var decoded FullCanvasState
		err = json.Unmarshal(jsonData, &decoded)
		require.NoError(t, err)

		// Verify
		assert.Equal(t, state.SelectedMap.ID, decoded.SelectedMap.ID)
		assert.Equal(t, state.MapSide, decoded.MapSide)
		assert.Equal(t, state.CurrentPhaseIndex, decoded.CurrentPhaseIndex)
		assert.Equal(t, state.EditedPhases, decoded.EditedPhases)
		assert.Len(t, decoded.Phases, len(state.Phases))
		assert.NotNil(t, decoded.AgentsSettings)
		assert.NotNil(t, decoded.AbilitiesSettings)
	})

	t.Run("handles nil settings gracefully", func(t *testing.T) {
		state := FullCanvasState{
			SelectedMap: MapOption{ID: "split"},
			Phases:      []PhaseState{},
			// AgentsSettings and AbilitiesSettings are nil
		}

		jsonData, err := json.Marshal(state)
		require.NoError(t, err)

		var decoded FullCanvasState
		err = json.Unmarshal(jsonData, &decoded)
		require.NoError(t, err)

		assert.Nil(t, decoded.AgentsSettings)
		assert.Nil(t, decoded.AbilitiesSettings)
	})
}

func TestPhaseStateSerialization(t *testing.T) {
	t.Run("serializes phase with all canvas items", func(t *testing.T) {
		phase := PhaseState{
			AgentsOnCanvas: []CanvasAgent{
				{ID: "a1", AgentName: "Sage", Role: "Sentinel", IsAlly: true, X: 50, Y: 60},
			},
			AbilitiesOnCanvas: []CanvasAbility{
				{ID: "ab1", AgentName: "Sage", Action: "heal", X: 70, Y: 80, IsAlly: true},
			},
			DrawLines: []CanvasDrawLine{
				{ID: "l1", Tool: "brush", Color: "#FF0000", Size: 3.0},
			},
			ConnectingLines: []CanvasConnectingLine{
				{ID: "cl1", FromID: "a1", ToID: "ab1", StrokeColor: "#FFFFFF", StrokeWidth: 2.0},
			},
			TextsOnCanvas: []CanvasText{
				{ID: "t1", Text: "A site", X: 100, Y: 100, Width: 50, Height: 20},
			},
			ImagesOnCanvas: []CanvasImage{
				{ID: "i1", Src: "image.png", X: 150, Y: 150, Width: 100, Height: 100},
			},
			ToolIconsOnCanvas: []CanvasToolIcon{
				{ID: "ti1", Name: "Spike", X: 200, Y: 200, Width: 30, Height: 30},
			},
		}

		jsonData, err := json.Marshal(phase)
		require.NoError(t, err)

		var decoded PhaseState
		err = json.Unmarshal(jsonData, &decoded)
		require.NoError(t, err)

		assert.Len(t, decoded.AgentsOnCanvas, 1)
		assert.Len(t, decoded.AbilitiesOnCanvas, 1)
		assert.Len(t, decoded.DrawLines, 1)
		assert.Len(t, decoded.ConnectingLines, 1)
		assert.Len(t, decoded.TextsOnCanvas, 1)
		assert.Len(t, decoded.ImagesOnCanvas, 1)
		assert.Len(t, decoded.ToolIconsOnCanvas, 1)
	})

	t.Run("handles empty phase", func(t *testing.T) {
		phase := PhaseState{
			AgentsOnCanvas:    []CanvasAgent{},
			AbilitiesOnCanvas: []CanvasAbility{},
			DrawLines:         []CanvasDrawLine{},
			ConnectingLines:   []CanvasConnectingLine{},
			TextsOnCanvas:     []CanvasText{},
			ImagesOnCanvas:    []CanvasImage{},
			ToolIconsOnCanvas: []CanvasToolIcon{},
		}

		jsonData, err := json.Marshal(phase)
		require.NoError(t, err)

		var decoded PhaseState
		err = json.Unmarshal(jsonData, &decoded)
		require.NoError(t, err)

		assert.Empty(t, decoded.AgentsOnCanvas)
		assert.Empty(t, decoded.AbilitiesOnCanvas)
		assert.Empty(t, decoded.DrawLines)
		assert.Empty(t, decoded.ConnectingLines)
		assert.Empty(t, decoded.TextsOnCanvas)
		assert.Empty(t, decoded.ImagesOnCanvas)
		assert.Empty(t, decoded.ToolIconsOnCanvas)
	})
}

func TestCanvasAgentSerialization(t *testing.T) {
	t.Run("serializes agent with all fields", func(t *testing.T) {
		agent := CanvasAgent{
			ID:        "agent-123",
			AgentName: "Omen",
			Role:      "Controller",
			IsAlly:    false,
			X:         150.75,
			Y:         250.25,
		}

		jsonData, err := json.Marshal(agent)
		require.NoError(t, err)

		var decoded CanvasAgent
		err = json.Unmarshal(jsonData, &decoded)
		require.NoError(t, err)

		assert.Equal(t, agent.ID, decoded.ID)
		assert.Equal(t, agent.AgentName, decoded.AgentName)
		assert.Equal(t, agent.Role, decoded.Role)
		assert.Equal(t, agent.IsAlly, decoded.IsAlly)
		assert.Equal(t, agent.X, decoded.X)
		assert.Equal(t, agent.Y, decoded.Y)
	})
}

func TestCanvasAbilitySerialization(t *testing.T) {
	t.Run("serializes ability with optional fields", func(t *testing.T) {
		ability := CanvasAbility{
			ID:           "ability-1",
			AgentName:    "Viper",
			Action:       "smoke",
			X:            100,
			Y:            200,
			AttachedToID: "agent-1",
			CurrentPath: []Position{
				{X: 10, Y: 20},
				{X: 30, Y: 40},
			},
			CurrentLength:   50.5,
			CurrentRotation: 45.0,
			IsAlly:          true,
		}

		jsonData, err := json.Marshal(ability)
		require.NoError(t, err)

		var decoded CanvasAbility
		err = json.Unmarshal(jsonData, &decoded)
		require.NoError(t, err)

		assert.Equal(t, ability.ID, decoded.ID)
		assert.Equal(t, ability.AgentName, decoded.AgentName)
		assert.Equal(t, ability.AttachedToID, decoded.AttachedToID)
		assert.Len(t, decoded.CurrentPath, 2)
		assert.Equal(t, ability.CurrentLength, decoded.CurrentLength)
		assert.Equal(t, ability.CurrentRotation, decoded.CurrentRotation)
	})

	t.Run("handles ability without optional fields", func(t *testing.T) {
		ability := CanvasAbility{
			ID:        "ability-2",
			AgentName: "Brimstone",
			Action:    "molly",
			X:         50,
			Y:         100,
			IsAlly:    false,
		}

		jsonData, err := json.Marshal(ability)
		require.NoError(t, err)

		var decoded CanvasAbility
		err = json.Unmarshal(jsonData, &decoded)
		require.NoError(t, err)

		assert.Equal(t, ability.ID, decoded.ID)
		assert.Empty(t, decoded.AttachedToID)
		assert.Nil(t, decoded.CurrentPath)
		assert.Zero(t, decoded.CurrentLength)
		assert.Zero(t, decoded.CurrentRotation)
	})
}

func TestCanvasDrawLineSerialization(t *testing.T) {
	t.Run("serializes draw line with all properties", func(t *testing.T) {
		line := CanvasDrawLine{
			ID:   "line-1",
			Tool: "pen",
			Points: []Position{
				{X: 0, Y: 0},
				{X: 10, Y: 10},
				{X: 20, Y: 5},
			},
			Color:       "#00FF00",
			Size:        5.0,
			IsDashed:    true,
			IsArrowHead: true,
		}

		jsonData, err := json.Marshal(line)
		require.NoError(t, err)

		var decoded CanvasDrawLine
		err = json.Unmarshal(jsonData, &decoded)
		require.NoError(t, err)

		assert.Equal(t, line.ID, decoded.ID)
		assert.Equal(t, line.Tool, decoded.Tool)
		assert.Len(t, decoded.Points, 3)
		assert.Equal(t, line.Color, decoded.Color)
		assert.Equal(t, line.Size, decoded.Size)
		assert.True(t, decoded.IsDashed)
		assert.True(t, decoded.IsArrowHead)
	})
}

func TestCanvasTextSerialization(t *testing.T) {
	t.Run("serializes text element", func(t *testing.T) {
		text := CanvasText{
			ID:     "text-1",
			Text:   "Push A",
			X:      100,
			Y:      200,
			Width:  150,
			Height: 50,
		}

		jsonData, err := json.Marshal(text)
		require.NoError(t, err)

		var decoded CanvasText
		err = json.Unmarshal(jsonData, &decoded)
		require.NoError(t, err)

		assert.Equal(t, text.ID, decoded.ID)
		assert.Equal(t, text.Text, decoded.Text)
		assert.Equal(t, text.X, decoded.X)
		assert.Equal(t, text.Y, decoded.Y)
		assert.Equal(t, text.Width, decoded.Width)
		assert.Equal(t, text.Height, decoded.Height)
	})
}

func TestCanvasImageSerialization(t *testing.T) {
	t.Run("serializes image element", func(t *testing.T) {
		image := CanvasImage{
			ID:     "img-1",
			Src:    "https://example.com/image.png",
			X:      50,
			Y:      75,
			Width:  200,
			Height: 150,
		}

		jsonData, err := json.Marshal(image)
		require.NoError(t, err)

		var decoded CanvasImage
		err = json.Unmarshal(jsonData, &decoded)
		require.NoError(t, err)

		assert.Equal(t, image.ID, decoded.ID)
		assert.Equal(t, image.Src, decoded.Src)
		assert.Equal(t, image.X, decoded.X)
		assert.Equal(t, image.Y, decoded.Y)
		assert.Equal(t, image.Width, decoded.Width)
		assert.Equal(t, image.Height, decoded.Height)
	})
}

func TestCanvasToolIconSerialization(t *testing.T) {
	t.Run("serializes tool icon element", func(t *testing.T) {
		icon := CanvasToolIcon{
			ID:     "icon-1",
			Name:   "Spike",
			X:      300,
			Y:      400,
			Width:  32,
			Height: 32,
		}

		jsonData, err := json.Marshal(icon)
		require.NoError(t, err)

		var decoded CanvasToolIcon
		err = json.Unmarshal(jsonData, &decoded)
		require.NoError(t, err)

		assert.Equal(t, icon.ID, decoded.ID)
		assert.Equal(t, icon.Name, decoded.Name)
		assert.Equal(t, icon.X, decoded.X)
		assert.Equal(t, icon.Y, decoded.Y)
		assert.Equal(t, icon.Width, decoded.Width)
		assert.Equal(t, icon.Height, decoded.Height)
	})
}

func TestPositionSerialization(t *testing.T) {
	t.Run("serializes position coordinates", func(t *testing.T) {
		pos := Position{
			X: 123.45,
			Y: 678.90,
		}

		jsonData, err := json.Marshal(pos)
		require.NoError(t, err)

		var decoded Position
		err = json.Unmarshal(jsonData, &decoded)
		require.NoError(t, err)

		assert.Equal(t, pos.X, decoded.X)
		assert.Equal(t, pos.Y, decoded.Y)
	})
}

func TestMapOptionSerialization(t *testing.T) {
	t.Run("serializes map option", func(t *testing.T) {
		mapOpt := MapOption{
			ID:        "haven",
			Text:      "Haven",
			TextColor: "#FFFFFF",
		}

		jsonData, err := json.Marshal(mapOpt)
		require.NoError(t, err)

		var decoded MapOption
		err = json.Unmarshal(jsonData, &decoded)
		require.NoError(t, err)

		assert.Equal(t, mapOpt.ID, decoded.ID)
		assert.Equal(t, mapOpt.Text, decoded.Text)
		assert.Equal(t, mapOpt.TextColor, decoded.TextColor)
	})
}

func TestIconSettingsSerialization(t *testing.T) {
	t.Run("serializes icon settings", func(t *testing.T) {
		settings := IconSettings{
			Scale:         120,
			BorderOpacity: 0.75,
			BorderWidth:   3,
			Radius:        15,
			AllyColor:     "#00FF00",
			EnemyColor:    "#FF0000",
		}

		jsonData, err := json.Marshal(settings)
		require.NoError(t, err)

		var decoded IconSettings
		err = json.Unmarshal(jsonData, &decoded)
		require.NoError(t, err)

		assert.Equal(t, settings.Scale, decoded.Scale)
		assert.Equal(t, settings.BorderOpacity, decoded.BorderOpacity)
		assert.Equal(t, settings.BorderWidth, decoded.BorderWidth)
		assert.Equal(t, settings.Radius, decoded.Radius)
		assert.Equal(t, settings.AllyColor, decoded.AllyColor)
		assert.Equal(t, settings.EnemyColor, decoded.EnemyColor)
	})
}

func TestCanvasConnectingLineSerialization(t *testing.T) {
	t.Run("serializes connecting line with all fields", func(t *testing.T) {
		line := CanvasConnectingLine{
			ID:             "cl-1",
			FromID:         "agent-1",
			ToID:           "ability-1",
			StrokeColor:    "#FF00FF",
			StrokeWidth:    3.0,
			UploadedImages: []string{"https://example.com/img1.png", "https://example.com/img2.png"},
			YoutubeLink:    "https://www.youtube.com/watch?v=abc123",
			Notes:          "Lineup for A site",
		}

		jsonData, err := json.Marshal(line)
		require.NoError(t, err)

		var decoded CanvasConnectingLine
		err = json.Unmarshal(jsonData, &decoded)
		require.NoError(t, err)

		assert.Equal(t, line.ID, decoded.ID)
		assert.Equal(t, line.FromID, decoded.FromID)
		assert.Equal(t, line.ToID, decoded.ToID)
		assert.Equal(t, line.StrokeColor, decoded.StrokeColor)
		assert.Equal(t, line.StrokeWidth, decoded.StrokeWidth)
		assert.Equal(t, line.UploadedImages, decoded.UploadedImages)
		assert.Equal(t, line.YoutubeLink, decoded.YoutubeLink)
		assert.Equal(t, line.Notes, decoded.Notes)
	})

	t.Run("serializes connecting line without optional fields", func(t *testing.T) {
		line := CanvasConnectingLine{
			ID:          "cl-2",
			FromID:      "agent-2",
			ToID:        "ability-2",
			StrokeColor: "#FFFFFF",
			StrokeWidth: 2.0,
		}

		jsonData, err := json.Marshal(line)
		require.NoError(t, err)

		var decoded CanvasConnectingLine
		err = json.Unmarshal(jsonData, &decoded)
		require.NoError(t, err)

		assert.Equal(t, line.ID, decoded.ID)
		assert.Equal(t, line.FromID, decoded.FromID)
		assert.Equal(t, line.ToID, decoded.ToID)
		assert.Nil(t, decoded.UploadedImages)
		assert.Empty(t, decoded.YoutubeLink)
		assert.Empty(t, decoded.Notes)
	})

	t.Run("omits empty optional fields in JSON", func(t *testing.T) {
		line := CanvasConnectingLine{
			ID:          "cl-3",
			FromID:      "agent-3",
			ToID:        "ability-3",
			StrokeColor: "#000000",
			StrokeWidth: 1.0,
		}

		jsonData, err := json.Marshal(line)
		require.NoError(t, err)

		jsonStr := string(jsonData)
		assert.NotContains(t, jsonStr, "uploadedImages")
		assert.NotContains(t, jsonStr, "youtubeLink")
		assert.NotContains(t, jsonStr, "notes")
	})
}
