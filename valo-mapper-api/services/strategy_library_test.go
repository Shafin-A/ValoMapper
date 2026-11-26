package services

import (
	"errors"
	"testing"
	"time"
	"valo-mapper-api/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockStrategyLibraryRepo struct {
	searchFn       func(params models.StrategySearchParams) (*models.StrategySearchResult, error)
	listTagsFn     func(userID int) ([]string, error)
	getStrategyFn  func(id int) (*models.Strategy, error)
	getLobbyMetaFn func(code string) (*models.LobbyMeta, error)
	countFn        func(userID int) (int, error)
	saveFn         func(s *models.Strategy) error
	copyLobbyFn    func(sourceCode string) (string, error)
	deleteLobbyFn  func(code string) error
	getFolderFn    func(folderID int) (*models.Folder, error)
	getTagsByIDsFn func(userID int, ids []int) (map[int][]string, error)
	bulkUpdateFn   func(params models.BulkUpdateStrategyParams) (int64, error)
	bulkDeleteFn   func(userID int, ids []int) (int64, error)
}

func (m *mockStrategyLibraryRepo) SearchStrategySummaries(params models.StrategySearchParams) (*models.StrategySearchResult, error) {
	if m.searchFn == nil {
		return &models.StrategySearchResult{}, nil
	}
	return m.searchFn(params)
}
func (m *mockStrategyLibraryRepo) ListStrategyTags(userID int) ([]string, error) {
	if m.listTagsFn == nil {
		return nil, nil
	}
	return m.listTagsFn(userID)
}
func (m *mockStrategyLibraryRepo) GetStrategyByID(id int) (*models.Strategy, error) {
	if m.getStrategyFn == nil {
		return nil, nil
	}
	return m.getStrategyFn(id)
}
func (m *mockStrategyLibraryRepo) GetLobbyMetaByCode(code string) (*models.LobbyMeta, error) {
	if m.getLobbyMetaFn == nil {
		return nil, nil
	}
	return m.getLobbyMetaFn(code)
}
func (m *mockStrategyLibraryRepo) CountStrategiesByUserID(userID int) (int, error) {
	if m.countFn == nil {
		return 0, nil
	}
	return m.countFn(userID)
}
func (m *mockStrategyLibraryRepo) SaveStrategy(s *models.Strategy) error {
	if m.saveFn == nil {
		return nil
	}
	return m.saveFn(s)
}
func (m *mockStrategyLibraryRepo) CopyLobby(sourceCode string) (string, error) {
	if m.copyLobbyFn == nil {
		return "", nil
	}
	return m.copyLobbyFn(sourceCode)
}
func (m *mockStrategyLibraryRepo) DeleteLobby(code string) error {
	if m.deleteLobbyFn == nil {
		return nil
	}
	return m.deleteLobbyFn(code)
}
func (m *mockStrategyLibraryRepo) GetFolderByID(folderID int) (*models.Folder, error) {
	if m.getFolderFn == nil {
		return nil, nil
	}
	return m.getFolderFn(folderID)
}
func (m *mockStrategyLibraryRepo) GetStrategyTagsByIDs(userID int, ids []int) (map[int][]string, error) {
	if m.getTagsByIDsFn == nil {
		result := make(map[int][]string, len(ids))
		for _, id := range ids {
			result[id] = []string{}
		}
		return result, nil
	}
	return m.getTagsByIDsFn(userID, ids)
}
func (m *mockStrategyLibraryRepo) BulkUpdateStrategies(params models.BulkUpdateStrategyParams) (int64, error) {
	if m.bulkUpdateFn == nil {
		return int64(len(params.IDs)), nil
	}
	return m.bulkUpdateFn(params)
}
func (m *mockStrategyLibraryRepo) BulkDeleteStrategies(userID int, ids []int) (int64, error) {
	if m.bulkDeleteFn == nil {
		return int64(len(ids)), nil
	}
	return m.bulkDeleteFn(userID, ids)
}

func newStrategyLibraryService(repo StrategyLibraryRepository) *StrategyLibraryService {
	return NewStrategyLibraryService(StrategyLibraryServiceDependencies{Repo: repo})
}

func TestStrategyLibraryService_SearchStrategies(t *testing.T) {
	t.Run("normalizes filters and clamps paging", func(t *testing.T) {
		var received models.StrategySearchParams
		repo := &mockStrategyLibraryRepo{
			searchFn: func(params models.StrategySearchParams) (*models.StrategySearchResult, error) {
				received = params
				return &models.StrategySearchResult{
					Strategies: []models.StrategySummary{
						{ID: 1, UserID: 1, Name: "One", Tags: []string{"a"}, IsFavorite: true},
					},
					Total: 1,
				}, nil
			},
		}
		service := newStrategyLibraryService(repo)

		result, err := service.SearchStrategies(1, SearchStrategiesRequest{
			Query:   "  rush  ",
			Tags:    []string{"B Site", "b site"},
			TagMode: "ANY",
			Side:    "defend",
			Sort:    "name",
			Limit:   500,
			Offset:  -5,
		})

		require.NoError(t, err)
		assert.Equal(t, "rush", received.Query)
		assert.Equal(t, []string{"b site"}, received.Tags)
		assert.Equal(t, "any", received.TagMode)
		assert.Equal(t, "defense", received.Side)
		assert.Equal(t, "name", received.Sort)
		assert.Equal(t, StrategyLibraryMaxLimit, received.Limit)
		assert.Equal(t, 0, received.Offset)
		require.Len(t, result.Strategies, 1)
		assert.True(t, result.Strategies[0].IsFavorite)
	})

	t.Run("rejects invalid filters", func(t *testing.T) {
		service := newStrategyLibraryService(&mockStrategyLibraryRepo{})

		_, err := service.SearchStrategies(1, SearchStrategiesRequest{Side: "mid"})
		assert.ErrorIs(t, err, ErrStrategyInvalidSide)

		_, err = service.SearchStrategies(1, SearchStrategiesRequest{Sort: "random"})
		assert.ErrorIs(t, err, ErrStrategyInvalidSort)

		_, err = service.SearchStrategies(1, SearchStrategiesRequest{TagMode: "some"})
		assert.ErrorIs(t, err, ErrStrategyInvalidTagMode)

		_, err = service.SearchStrategies(1, SearchStrategiesRequest{Tags: []string{"bad!"}})
		assert.ErrorIs(t, err, ErrStrategyInvalidTag)
	})
}

func TestStrategyLibraryService_DuplicateStrategy(t *testing.T) {
	t.Run("deep copies a strategy", func(t *testing.T) {
		now := time.Now()
		var saved *models.Strategy
		repo := &mockStrategyLibraryRepo{
			getStrategyFn: func(id int) (*models.Strategy, error) {
				return &models.Strategy{
					ID:         id,
					UserID:     7,
					FolderID:   intPtr(3),
					LobbyCode:  "OLD123",
					Name:       "B Site Rush",
					Tags:       []string{"post-plant"},
					IsFavorite: true,
				}, nil
			},
			copyLobbyFn: func(sourceCode string) (string, error) {
				assert.Equal(t, "OLD123", sourceCode)
				return "NEW123", nil
			},
			saveFn: func(strategy *models.Strategy) error {
				strategy.ID = 42
				saved = strategy
				return nil
			},
			getLobbyMetaFn: func(code string) (*models.LobbyMeta, error) {
				return &models.LobbyMeta{
					Code:          code,
					SelectedMapID: "ascent",
					MapSide:       "defense",
					UpdatedAt:     now,
				}, nil
			},
		}
		service := newStrategyLibraryService(repo)

		response, err := service.DuplicateStrategy(&models.User{ID: 7, IsSubscribed: true}, 9)

		require.NoError(t, err)
		require.NotNil(t, saved)
		assert.Equal(t, "B Site Rush (copy)", saved.Name)
		assert.Equal(t, "NEW123", saved.LobbyCode)
		assert.Equal(t, []string{"post-plant"}, saved.Tags)
		assert.True(t, saved.IsFavorite)
		require.NotNil(t, saved.FolderID)
		assert.Equal(t, 3, *saved.FolderID)
		assert.Equal(t, 42, response.ID)
		assert.Equal(t, "NEW123", response.LobbyCode)
		assert.Equal(t, "defense", response.MapSide)
	})

	t.Run("rejects another user's strategy", func(t *testing.T) {
		service := newStrategyLibraryService(&mockStrategyLibraryRepo{
			getStrategyFn: func(id int) (*models.Strategy, error) {
				return &models.Strategy{ID: id, UserID: 9}, nil
			},
		})

		_, err := service.DuplicateStrategy(&models.User{ID: 7}, 9)
		assert.ErrorIs(t, err, ErrStrategyAccessDenied)
	})

	t.Run("enforces the free plan limit", func(t *testing.T) {
		copyCalled := false
		service := newStrategyLibraryService(&mockStrategyLibraryRepo{
			getStrategyFn: func(id int) (*models.Strategy, error) {
				return &models.Strategy{ID: id, UserID: 7, LobbyCode: "OLD123"}, nil
			},
			countFn: func(userID int) (int, error) { return FreeStrategyLimit, nil },
			copyLobbyFn: func(sourceCode string) (string, error) {
				copyCalled = true
				return "NEW123", nil
			},
		})

		_, err := service.DuplicateStrategy(&models.User{ID: 7, IsSubscribed: false}, 9)
		assert.ErrorIs(t, err, ErrStrategyFreePlanLimit)
		assert.False(t, copyCalled)
	})

	t.Run("cleans up the copied lobby when saving fails", func(t *testing.T) {
		deletedCode := ""
		service := newStrategyLibraryService(&mockStrategyLibraryRepo{
			getStrategyFn: func(id int) (*models.Strategy, error) {
				return &models.Strategy{ID: id, UserID: 7, LobbyCode: "OLD123", Name: "Test"}, nil
			},
			copyLobbyFn: func(sourceCode string) (string, error) { return "NEW123", nil },
			saveFn:      func(s *models.Strategy) error { return errors.New("db down") },
			deleteLobbyFn: func(code string) error {
				deletedCode = code
				return nil
			},
		})

		_, err := service.DuplicateStrategy(&models.User{ID: 7, IsSubscribed: true}, 9)
		require.Error(t, err)
		assert.Equal(t, "NEW123", deletedCode)
	})
}

func TestStrategyLibraryService_BulkUpdate(t *testing.T) {
	t.Run("validates ownership and merges tags", func(t *testing.T) {
		var received models.BulkUpdateStrategyParams
		repo := &mockStrategyLibraryRepo{
			getTagsByIDsFn: func(userID int, ids []int) (map[int][]string, error) {
				return map[int][]string{1: {"a"}, 2: {"a"}}, nil
			},
			bulkUpdateFn: func(params models.BulkUpdateStrategyParams) (int64, error) {
				received = params
				return 2, nil
			},
		}
		service := newStrategyLibraryService(repo)

		updated, err := service.BulkUpdate(&models.User{ID: 7}, BulkUpdateStrategiesRequest{
			IDs:        []int{1, 2, 2},
			IsFavorite: boolPtr(true),
			AddTags:    []string{"B Site"},
			RemoveTags: []string{"a"},
		})

		require.NoError(t, err)
		assert.Equal(t, int64(2), updated)
		assert.Equal(t, []int{1, 2}, received.IDs)
		assert.Equal(t, []string{"b site"}, received.AddTags)
		assert.Equal(t, []string{"a"}, received.RemoveTags)
	})

	t.Run("rejects strategies not owned by the user", func(t *testing.T) {
		service := newStrategyLibraryService(&mockStrategyLibraryRepo{
			getTagsByIDsFn: func(userID int, ids []int) (map[int][]string, error) {
				return map[int][]string{1: {}}, nil
			},
		})

		_, err := service.BulkUpdate(&models.User{ID: 7}, BulkUpdateStrategiesRequest{IDs: []int{1, 2}})
		assert.ErrorIs(t, err, ErrStrategyAccessDenied)
	})

	t.Run("rejects adding past the tag limit", func(t *testing.T) {
		service := newStrategyLibraryService(&mockStrategyLibraryRepo{
			getTagsByIDsFn: func(userID int, ids []int) (map[int][]string, error) {
				return map[int][]string{1: {"a", "b", "c", "d", "e", "f", "g"}}, nil
			},
		})

		_, err := service.BulkUpdate(&models.User{ID: 7}, BulkUpdateStrategiesRequest{
			IDs:     []int{1},
			AddTags: []string{"h", "i"},
		})
		assert.ErrorIs(t, err, ErrStrategyTooManyTags)
	})

	t.Run("rejects an empty selection", func(t *testing.T) {
		service := newStrategyLibraryService(&mockStrategyLibraryRepo{})

		_, err := service.BulkUpdate(&models.User{ID: 7}, BulkUpdateStrategiesRequest{})
		assert.ErrorIs(t, err, ErrStrategyInvalidSelection)
	})
}

func TestStrategyLibraryService_BulkDelete(t *testing.T) {
	t.Run("deletes owned strategies", func(t *testing.T) {
		service := newStrategyLibraryService(&mockStrategyLibraryRepo{
			getTagsByIDsFn: func(userID int, ids []int) (map[int][]string, error) {
				return map[int][]string{1: {}, 2: {}}, nil
			},
			bulkDeleteFn: func(userID int, ids []int) (int64, error) {
				return 2, nil
			},
		})

		deleted, err := service.BulkDelete(&models.User{ID: 7}, []int{1, 2})
		require.NoError(t, err)
		assert.Equal(t, int64(2), deleted)
	})

	t.Run("rejects strategies not owned by the user", func(t *testing.T) {
		service := newStrategyLibraryService(&mockStrategyLibraryRepo{
			getTagsByIDsFn: func(userID int, ids []int) (map[int][]string, error) {
				return map[int][]string{1: {}}, nil
			},
		})

		_, err := service.BulkDelete(&models.User{ID: 7}, []int{1, 2})
		assert.ErrorIs(t, err, ErrStrategyAccessDenied)
	})
}

func intPtr(value int) *int {
	return &value
}

func boolPtr(value bool) *bool {
	return &value
}
