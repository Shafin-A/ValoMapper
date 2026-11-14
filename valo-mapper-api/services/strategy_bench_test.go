package services

import (
	"context"
	"testing"
	"valo-mapper-api/models"
	"valo-mapper-api/testutils"
)

func BenchmarkGetStrategies50(b *testing.B) {
	const strategyCount = 50

	pool := testutils.SetupTestDB(b)
	defer testutils.CleanupTestDB(b, pool)

	testutils.TruncateTables(b, pool,
		"strategies", "folders", "lobbies", "users", "maps",
		"canvas_agents", "canvas_abilities", "canvas_draw_lines",
		"canvas_texts", "canvas_images", "canvas_tool_icons",
		"canvas_connecting_lines",
	)

	user := testutils.CreateTestUser(b, pool, "bench-strategies-user")

	for i := 0; i < strategyCount; i++ {
		lobby := testutils.CreateTestLobby(b, pool)
		state := testutils.BuildCanvasState(lobby.CanvasState.SelectedMap.ID, 2, 2)
		if err := models.SaveCanvasState(lobby.Code, *state); err != nil {
			b.Fatalf("seed canvas state: %v", err)
		}
		testutils.CreateTestStrategy(b, pool, user.ID, lobby.Code)
	}

	if _, err := pool.Exec(context.Background(),
		`SELECT COUNT(*) FROM strategies WHERE user_id = $1`, user.ID); err != nil {
		b.Fatalf("verify seed: %v", err)
	}

	service := NewStrategyService(StrategyServiceDependencies{})

	b.ReportAllocs()
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		strategies, err := service.GetStrategies(user.ID, nil)
		if err != nil {
			b.Fatalf("GetStrategies: %v", err)
		}
		if len(strategies) != strategyCount {
			b.Fatalf("expected %d strategies, got %d", strategyCount, len(strategies))
		}
	}
}
