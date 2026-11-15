package testutils

import (
	"context"
	"fmt"
	"testing"
	"time"
	"valo-mapper-api/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

func strPtr(s string) *string {
	return &s
}

func CreateTestUser(t testing.TB, pool *pgxpool.Pool, firebaseUID string) *models.User {
	t.Helper()

	user := &models.User{
		FirebaseUID:   strPtr(firebaseUID),
		Email:         strPtr("test@example.com"),
		Name:          strPtr("Test User"),
		EmailVerified: true,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	err := pool.QueryRow(context.Background(),
		`INSERT INTO users (firebase_uid, email, name, email_verified, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`,
		user.FirebaseUID, user.Email, user.Name, user.EmailVerified, user.CreatedAt, user.UpdatedAt,
	).Scan(&user.ID)

	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	return user
}

func CreateTestLobby(t testing.TB, pool *pgxpool.Pool) *models.Lobby {
	return CreateTestLobbyWithCode(t, pool, models.GenerateLobbyCode())
}

func CreateTestLobbyWithCode(t testing.TB, pool *pgxpool.Pool, code string) *models.Lobby {
	t.Helper()

	lobby := &models.Lobby{
		Code:      code,
		CreatedAt: time.Now(),
		CanvasState: &models.FullCanvasState{
			SelectedMap: models.MapOption{
				ID:        "ascent",
				Text:      "Ascent",
				TextColor: "#FFFFFF",
			},
			MapSide:           "defense",
			CurrentPhaseIndex: 0,
			EditedPhases:      []int{0},
			Phases:            models.NewEmptyPhaseStates(),
		},
	}

	ctx := context.Background()

	// ensure selected map exists to satisfy foreign key
	if _, err := pool.Exec(ctx,
		`INSERT INTO maps (id, text)
		VALUES ($1, $2)
		ON CONFLICT (id) DO NOTHING`,
		lobby.CanvasState.SelectedMap.ID,
		lobby.CanvasState.SelectedMap.Text,
	); err != nil {
		t.Fatalf("Failed to ensure map exists: %v", err)
	}

	err := pool.QueryRow(ctx,
		`INSERT INTO lobbies (code, selected_map_id, map_side, current_phase_index, edited_phases, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING updated_at`,
		lobby.Code,
		lobby.CanvasState.SelectedMap.ID,
		lobby.CanvasState.MapSide,
		lobby.CanvasState.CurrentPhaseIndex,
		lobby.CanvasState.EditedPhases,
		lobby.CreatedAt,
		lobby.CreatedAt,
	).Scan(&lobby.UpdatedAt)

	if err != nil {
		t.Fatalf("Failed to create test lobby: %v", err)
	}

	return lobby
}

func CreateTestStrategy(t testing.TB, pool *pgxpool.Pool, userID int, lobbyCode string) *models.Strategy {
	t.Helper()

	strategy := &models.Strategy{
		UserID:    userID,
		LobbyCode: lobbyCode,
		Name:      "Test Strategy",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err := pool.QueryRow(context.Background(),
		`INSERT INTO strategies (user_id, lobby_code, name, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`,
		strategy.UserID, strategy.LobbyCode, strategy.Name, strategy.CreatedAt, strategy.UpdatedAt,
	).Scan(&strategy.ID)

	if err != nil {
		t.Fatalf("Failed to create test strategy: %v", err)
	}

	return strategy
}

// BuildCanvasState returns a deterministic canvas snapshot for benchmarks.
func BuildCanvasState(mapID string, populatedPhases, perType int) *models.FullCanvasState {
	phases := models.NewEmptyPhaseStates()

	if populatedPhases > len(phases) {
		populatedPhases = len(phases)
	}

	for phase := 0; phase < populatedPhases; phase++ {
		for i := 0; i < perType; i++ {
			x := float64(10 + i*5)
			y := float64(20 + i*5)

			phases[phase].AgentsOnCanvas = append(phases[phase].AgentsOnCanvas, models.CanvasAgent{
				ID:        fmt.Sprintf("bench-agent-%d-%d", phase, i),
				AgentName: "Jett",
				IsAlly:    true,
				X:         x,
				Y:         y,
			})
			phases[phase].AbilitiesOnCanvas = append(phases[phase].AbilitiesOnCanvas, models.CanvasAbility{
				ID:              fmt.Sprintf("bench-ability-%d-%d", phase, i),
				AgentName:       "Jett",
				Action:          "dash",
				X:               x,
				Y:               y,
				CurrentPath:     []models.Position{{X: x, Y: y}},
				CurrentRotation: 45,
				CurrentLength:   120,
				IsAlly:          true,
			})
			phases[phase].DrawLines = append(phases[phase].DrawLines, models.CanvasDrawLine{
				ID:          fmt.Sprintf("bench-line-%d-%d", phase, i),
				Tool:        "pen",
				Points:      []models.Position{{X: x, Y: y}, {X: x + 20, Y: y + 20}},
				Color:       "#FF0000",
				Size:        2,
				IsArrowHead: true,
				Opacity:     1,
			})
			phases[phase].TextsOnCanvas = append(phases[phase].TextsOnCanvas, models.CanvasText{
				ID:       fmt.Sprintf("bench-text-%d-%d", phase, i),
				Text:     "bench",
				FontSize: 16,
				X:        x,
				Y:        y,
				Width:    100,
				Height:   30,
			})
			phases[phase].ImagesOnCanvas = append(phases[phase].ImagesOnCanvas, models.CanvasImage{
				ID:     fmt.Sprintf("bench-image-%d-%d", phase, i),
				Src:    "images/bench.png",
				X:      x,
				Y:      y,
				Width:  64,
				Height: 64,
			})
			phases[phase].ToolIconsOnCanvas = append(phases[phase].ToolIconsOnCanvas, models.CanvasToolIcon{
				ID:     fmt.Sprintf("bench-icon-%d-%d", phase, i),
				Name:   "smoke",
				X:      x,
				Y:      y,
				Width:  32,
				Height: 32,
			})
		}
	}

	return &models.FullCanvasState{
		SelectedMap:       models.MapOption{ID: mapID, Text: "Benchmark Map", TextColor: "text-white"},
		MapSide:           "defense",
		CurrentPhaseIndex: 0,
		EditedPhases:      []int{0},
		Phases:            phases,
	}
}

func CreateTestFolder(t testing.TB, pool *pgxpool.Pool, userID int, name string) *models.Folder {
	t.Helper()

	folder := &models.Folder{
		UserID:    userID,
		Name:      name,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err := pool.QueryRow(context.Background(),
		`INSERT INTO folders (user_id, name, created_at, updated_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id`,
		folder.UserID, folder.Name, folder.CreatedAt, folder.UpdatedAt,
	).Scan(&folder.ID)

	if err != nil {
		t.Fatalf("Failed to create test folder: %v", err)
	}

	return folder
}
