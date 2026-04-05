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
	getLobbyByCodeFn          func(code string) (*models.Lobby, error)
	countStrategiesByUserIDFn func(userID int) (int, error)
	getStrategiesByUserIDFn   func(userID int) ([]models.Strategy, error)
	getStrategiesByFolderIDFn func(userID, folderID int) ([]models.Strategy, error)
	getLobbiesByCodesFn       func(codes []string) ([]models.Lobby, error)
	getStrategyByIDFn         func(id int) (*models.Strategy, error)
	saveStrategyFn            func(s *models.Strategy) error
	updateStrategyFn          func(s *models.Strategy) error
	deleteStrategyFn          func(s *models.Strategy) error
}

func (m *mockStrategyRepo) GetLobbyByCode(code string) (*models.Lobby, error) {
	if m.getLobbyByCodeFn == nil {
		return nil, nil
	}
	return m.getLobbyByCodeFn(code)
}
func (m *mockStrategyRepo) CountStrategiesByUserID(userID int) (int, error) {
	if m.countStrategiesByUserIDFn == nil {
		return 0, nil
	}
	return m.countStrategiesByUserIDFn(userID)
}
func (m *mockStrategyRepo) GetStrategiesByUserID(userID int) ([]models.Strategy, error) {
	if m.getStrategiesByUserIDFn == nil {
		return nil, nil
	}
	return m.getStrategiesByUserIDFn(userID)
}
func (m *mockStrategyRepo) GetStrategiesByFolderID(userID, folderID int) ([]models.Strategy, error) {
	if m.getStrategiesByFolderIDFn == nil {
		return nil, nil
	}
	return m.getStrategiesByFolderIDFn(userID, folderID)
}
func (m *mockStrategyRepo) GetLobbiesByCodes(codes []string) ([]models.Lobby, error) {
	if m.getLobbiesByCodesFn == nil {
		return nil, nil
	}
	return m.getLobbiesByCodesFn(codes)
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
			getStrategiesByUserIDFn: func(userID int) ([]models.Strategy, error) {
				return []models.Strategy{}, nil
			},
		}
		svc := newStrategyService(repo)

		result, err := svc.GetStrategies(1, nil)

		require.NoError(t, err)
		assert.NotNil(t, result)
		assert.Empty(t, result)
	})

	t.Run("skips strategies whose lobby no longer exists", func(t *testing.T) {
		now := time.Now()
		repo := &mockStrategyRepo{
			getStrategiesByUserIDFn: func(userID int) ([]models.Strategy, error) {
				return []models.Strategy{
					{ID: 1, LobbyCode: "AAA"},
					{ID: 2, LobbyCode: "BBB"}, // this lobby will be missing
					{ID: 3, LobbyCode: "CCC"},
				}, nil
			},
			getLobbiesByCodesFn: func(codes []string) ([]models.Lobby, error) {
				return []models.Lobby{
					{Code: "AAA", SelectedMapId: "ascent", UpdatedAt: now},
					{Code: "CCC", SelectedMapId: "bind", UpdatedAt: now},
				}, nil
			},
		}
		svc := newStrategyService(repo)

		results, err := svc.GetStrategies(1, nil)

		require.NoError(t, err)
		require.Len(t, results, 2)
		assert.Equal(t, "AAA", results[0].LobbyCode)
		assert.Equal(t, "CCC", results[1].LobbyCode)
	})
}
