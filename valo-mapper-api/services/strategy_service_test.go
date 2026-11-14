package services

import (
	"testing"
	"time"
	"valo-mapper-api/models"

	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockStrategyRepo struct {
	getLobbyByCodeFn               func(code string) (*models.Lobby, error)
	strategyExistsByUserAndLobbyFn func(userID int, lobbyCode string) (bool, error)
	countStrategiesByUserIDFn      func(userID int) (int, error)
	getStrategySummariesFn         func(userID int, folderID *int) ([]models.StrategySummary, error)
	getStrategyByIDFn              func(id int) (*models.Strategy, error)
	saveStrategyFn                 func(s *models.Strategy) error
	updateStrategyFn               func(s *models.Strategy) error
	deleteStrategyFn               func(s *models.Strategy) error
}

func (m *mockStrategyRepo) GetLobbyByCode(code string) (*models.Lobby, error) {
	if m.getLobbyByCodeFn == nil {
		return nil, nil
	}
	return m.getLobbyByCodeFn(code)
}
func (m *mockStrategyRepo) StrategyExistsByUserAndLobby(userID int, lobbyCode string) (bool, error) {
	if m.strategyExistsByUserAndLobbyFn == nil {
		return false, nil
	}
	return m.strategyExistsByUserAndLobbyFn(userID, lobbyCode)
}
func (m *mockStrategyRepo) CountStrategiesByUserID(userID int) (int, error) {
	if m.countStrategiesByUserIDFn == nil {
		return 0, nil
	}
	return m.countStrategiesByUserIDFn(userID)
}
func (m *mockStrategyRepo) GetStrategySummariesByUserID(userID int, folderID *int) ([]models.StrategySummary, error) {
	if m.getStrategySummariesFn == nil {
		return nil, nil
	}
	return m.getStrategySummariesFn(userID, folderID)
}
func (m *mockStrategyRepo) GetStrategyByID(id int) (*models.Strategy, error) {
	if m.getStrategyByIDFn == nil {
		return nil, nil
	}
	return m.getStrategyByIDFn(id)
}
func (m *mockStrategyRepo) SaveStrategy(s *models.Strategy) error {
	if m.saveStrategyFn == nil {
		return nil
	}
	return m.saveStrategyFn(s)
}
func (m *mockStrategyRepo) UpdateStrategy(s *models.Strategy) error {
	if m.updateStrategyFn == nil {
		return nil
	}
	return m.updateStrategyFn(s)
}
func (m *mockStrategyRepo) DeleteStrategy(s *models.Strategy) error {
	if m.deleteStrategyFn == nil {
		return nil
	}
	return m.deleteStrategyFn(s)
}

func newStrategyService(repo StrategyRepository) *StrategyService {
	return NewStrategyService(StrategyServiceDependencies{Repo: repo})
}

func TestStrategyService_CreateStrategy(t *testing.T) {
	testLobby := &models.Lobby{
		Code:          "AAAAA",
		SelectedMapId: "ascent",
		UpdatedAt:     time.Now(),
	}

	t.Run("returns error when lobby code is empty", func(t *testing.T) {
		svc := newStrategyService(&mockStrategyRepo{})

		_, err := svc.CreateStrategy(&models.User{ID: 1}, CreateStrategyRequest{Name: "Test"})

		assert.ErrorIs(t, err, ErrLobbyCodeRequired)
	})

	t.Run("returns error when lobby not found", func(t *testing.T) {
		repo := &mockStrategyRepo{
			getLobbyByCodeFn: func(code string) (*models.Lobby, error) { return nil, nil },
		}
		svc := newStrategyService(repo)

		_, err := svc.CreateStrategy(&models.User{ID: 1}, CreateStrategyRequest{LobbyCode: "AAAAA", Name: "Test"})

		assert.ErrorIs(t, err, ErrStrategyLobbyNotFound)
	})

	t.Run("returns error when free user is at the strategy limit", func(t *testing.T) {
		repo := &mockStrategyRepo{
			getLobbyByCodeFn:          func(code string) (*models.Lobby, error) { return testLobby, nil },
			countStrategiesByUserIDFn: func(userID int) (int, error) { return FreeStrategyLimit, nil },
		}
		svc := newStrategyService(repo)

		_, err := svc.CreateStrategy(
			&models.User{ID: 1, IsSubscribed: false},
			CreateStrategyRequest{LobbyCode: "AAAAA", Name: "Test"},
		)

		assert.ErrorIs(t, err, ErrStrategyFreePlanLimit)
	})

	t.Run("subscribed user bypasses free tier limit", func(t *testing.T) {
		repo := &mockStrategyRepo{
			getLobbyByCodeFn: func(code string) (*models.Lobby, error) { return testLobby, nil },
			saveStrategyFn:   func(s *models.Strategy) error { return nil },
		}
		svc := newStrategyService(repo)

		resp, err := svc.CreateStrategy(
			&models.User{ID: 1, IsSubscribed: true},
			CreateStrategyRequest{LobbyCode: "AAAAA", Name: "Test"},
		)

		require.NoError(t, err)
		assert.Equal(t, "AAAAA", resp.LobbyCode)
	})

	t.Run("returns error on duplicate lobby code for same user", func(t *testing.T) {
		repo := &mockStrategyRepo{
			getLobbyByCodeFn:          func(code string) (*models.Lobby, error) { return testLobby, nil },
			countStrategiesByUserIDFn: func(userID int) (int, error) { return 0, nil },
			saveStrategyFn: func(s *models.Strategy) error {
				return &pgconn.PgError{Code: pgerrcode.UniqueViolation}
			},
		}
		svc := newStrategyService(repo)

		_, err := svc.CreateStrategy(
			&models.User{ID: 1, IsSubscribed: false},
			CreateStrategyRequest{LobbyCode: "AAAAA", Name: "Test"},
		)

		assert.ErrorIs(t, err, ErrStrategyAlreadySaved)
	})
}

func TestStrategyService_GetStrategies(t *testing.T) {
	t.Run("returns empty non-nil slice when user has no strategies", func(t *testing.T) {
		repo := &mockStrategyRepo{
			getStrategySummariesFn: func(userID int, folderID *int) ([]models.StrategySummary, error) {
				return []models.StrategySummary{}, nil
			},
		}
		svc := newStrategyService(repo)

		result, err := svc.GetStrategies(1, nil)

		require.NoError(t, err)
		assert.NotNil(t, result)
		assert.Empty(t, result)
	})

	t.Run("maps joined summaries to responses", func(t *testing.T) {
		now := time.Now()
		folderID := 7
		repo := &mockStrategyRepo{
			getStrategySummariesFn: func(userID int, filter *int) ([]models.StrategySummary, error) {
				return []models.StrategySummary{
					{ID: 1, UserID: 1, Name: "First", LobbyCode: "AAA", SelectedMapID: "ascent", UpdatedAt: now},
					{ID: 2, UserID: 1, FolderID: &folderID, Name: "Second", LobbyCode: "CCC", SelectedMapID: "bind", UpdatedAt: now},
				}, nil
			},
		}
		svc := newStrategyService(repo)

		results, err := svc.GetStrategies(1, nil)

		require.NoError(t, err)
		require.Len(t, results, 2)
		assert.Equal(t, "AAA", results[0].LobbyCode)
		assert.Equal(t, "ascent", results[0].SelectedMapID)
		assert.Equal(t, "CCC", results[1].LobbyCode)
		assert.Equal(t, "bind", results[1].SelectedMapID)
		assert.Equal(t, folderID, *results[1].FolderID)
		assert.Equal(t, now, results[1].UpdatedAt)
	})

	t.Run("passes folder filter to repository", func(t *testing.T) {
		folderID := 42
		var received *int
		repo := &mockStrategyRepo{
			getStrategySummariesFn: func(userID int, filter *int) ([]models.StrategySummary, error) {
				received = filter
				return nil, nil
			},
		}
		svc := newStrategyService(repo)

		_, err := svc.GetStrategies(1, &folderID)

		require.NoError(t, err)
		require.NotNil(t, received)
		assert.Equal(t, folderID, *received)
	})
}
