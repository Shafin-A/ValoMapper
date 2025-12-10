package testutils

import (
	"context"
	"testing"
	"time"
	"valo-mapper-api/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

// CreateTestUser creates a test user in the database
func CreateTestUser(t *testing.T, pool *pgxpool.Pool, firebaseUID string) *models.User {
	t.Helper()

	user := &models.User{
		FirebaseUID:   firebaseUID,
		Email:         "test@example.com",
		Name:          "Test User",
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

// CreateTestLobby creates a test lobby in the database
func CreateTestLobby(t *testing.T, pool *pgxpool.Pool) *models.Lobby {
	t.Helper()

	lobby := &models.Lobby{
		Code:      models.GenerateLobbyCode(),
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
			Phases:            make([]models.PhaseState, 10),
		},
	}

	for i := range lobby.CanvasState.Phases {
		lobby.CanvasState.Phases[i] = models.PhaseState{
			AgentsOnCanvas:    []models.CanvasAgent{},
			AbilitiesOnCanvas: []models.CanvasAbility{},
			DrawLines:         []models.CanvasDrawLine{},
			TextsOnCanvas:     []models.CanvasText{},
			ImagesOnCanvas:    []models.CanvasImage{},
			ToolIconsOnCanvas: []models.CanvasToolIcon{},
		}
	}

	ctx := context.Background()

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

// CreateTestStrategy creates a test strategy in the database
func CreateTestStrategy(t *testing.T, pool *pgxpool.Pool, userID int, lobbyCode string) *models.Strategy {
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

// CreateTestFolder creates a test folder in the database
func CreateTestFolder(t *testing.T, pool *pgxpool.Pool, userID int, name string) *models.Folder {
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
