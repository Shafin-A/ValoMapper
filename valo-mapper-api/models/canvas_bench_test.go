package models_test

import (
	"testing"
	"valo-mapper-api/models"
	"valo-mapper-api/testutils"
)

func BenchmarkGetAllCanvasPhases(b *testing.B) {
	pool := testutils.SetupTestDB(b)
	defer testutils.CleanupTestDB(b, pool)

	testutils.TruncateTables(b, pool,
		"lobbies", "maps", "canvas_agents", "canvas_abilities",
		"canvas_draw_lines", "canvas_texts", "canvas_images",
		"canvas_tool_icons", "canvas_connecting_lines",
	)

	lobby := testutils.CreateTestLobby(b, pool)
	state := testutils.BuildCanvasState(lobby.CanvasState.SelectedMap.ID, 5, 10)
	if err := models.SaveCanvasState(lobby.Code, *state); err != nil {
		b.Fatalf("seed canvas state: %v", err)
	}

	b.ReportAllocs()
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		phases, err := models.GetAllCanvasPhases(lobby.Code)
		if err != nil {
			b.Fatalf("GetAllCanvasPhases: %v", err)
		}
		if len(phases) != 10 {
			b.Fatalf("expected 10 phases, got %d", len(phases))
		}
	}
}

func BenchmarkApplyCanvasPatch20(b *testing.B) {
	pool := testutils.SetupTestDB(b)
	defer testutils.CleanupTestDB(b, pool)

	testutils.TruncateTables(b, pool,
		"lobbies", "maps", "canvas_agents", "canvas_abilities",
		"canvas_draw_lines", "canvas_texts", "canvas_images",
		"canvas_tool_icons", "canvas_connecting_lines",
	)

	lobby := testutils.CreateTestLobby(b, pool)
	patch := buildBenchmarkPatch()

	b.ReportAllocs()
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		if err := models.ApplyCanvasPatch(lobby.Code, patch); err != nil {
			b.Fatalf("ApplyCanvasPatch: %v", err)
		}
	}
}

func buildBenchmarkPatch() models.CanvasPatch {
	entries := make([]models.CanvasPatchEntry, 0, 20)

	for i := 0; i < 6; i++ {
		id := "agent-" + string(rune('a'+i))
		entries = append(entries, models.CanvasPatchEntry{
			Entity: "agent", Action: "upsert", PhaseIndex: 0, ID: id,
			Payload: map[string]any{
				"id": id, "name": "Jett", "isAlly": true, "x": 100 + i, "y": 200 + i,
			},
		})
	}

	for i := 0; i < 4; i++ {
		id := "ability-" + string(rune('a'+i))
		entries = append(entries, models.CanvasPatchEntry{
			Entity: "ability", Action: "upsert", PhaseIndex: 0, ID: id,
			Payload: map[string]any{
				"id": id, "name": "Jett", "action": "dash", "x": 300 + i, "y": 400 + i,
				"currentPath": []map[string]any{{"x": 300, "y": 400}},
			},
		})
	}

	for i := 0; i < 4; i++ {
		id := "line-" + string(rune('a'+i))
		entries = append(entries, models.CanvasPatchEntry{
			Entity: "drawline", Action: "upsert", PhaseIndex: 0, ID: id,
			Payload: map[string]any{
				"id": id, "tool": "pen", "color": "#FF0000", "size": 2,
				"points": []map[string]any{{"x": 10, "y": 20}, {"x": 30, "y": 40}},
			},
		})
	}

	for i := 0; i < 2; i++ {
		id := "text-" + string(rune('a'+i))
		entries = append(entries, models.CanvasPatchEntry{
			Entity: "text", Action: "upsert", PhaseIndex: 0, ID: id,
			Payload: map[string]any{
				"id": id, "text": "execute", "x": 50, "y": 60, "width": 100, "height": 30,
			},
		})
	}

	for i := 0; i < 2; i++ {
		id := "image-" + string(rune('a'+i))
		entries = append(entries, models.CanvasPatchEntry{
			Entity: "image", Action: "upsert", PhaseIndex: 0, ID: id,
			Payload: map[string]any{
				"id": id, "src": "images/bench.png", "x": 70, "y": 80, "width": 64, "height": 64,
			},
		})
	}

	for i := 0; i < 2; i++ {
		id := "icon-" + string(rune('a'+i))
		entries = append(entries, models.CanvasPatchEntry{
			Entity: "toolicon", Action: "upsert", PhaseIndex: 0, ID: id,
			Payload: map[string]any{
				"id": id, "name": "smoke", "x": 90, "y": 100, "width": 32, "height": 32,
			},
		})
	}

	return models.CanvasPatch{Entries: entries}
}
