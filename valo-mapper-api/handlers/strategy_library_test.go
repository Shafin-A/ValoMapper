package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	"valo-mapper-api/models"
	"valo-mapper-api/testutils"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetStrategyLibrary(t *testing.T) {
	user := newTestAuthenticatedUser()
	now := time.Now()

	t.Run("parses filters and returns items", func(t *testing.T) {
		var received models.StrategySearchParams
		useStrategyLibraryRepo(t, &mockStrategyLibraryHandlerRepo{
			searchFn: func(params models.StrategySearchParams) (*models.StrategySearchResult, error) {
				received = params
				return &models.StrategySearchResult{
					Strategies: []models.StrategySummary{
						{
							ID:            1,
							UserID:        user.ID,
							Name:          "B Site Rush",
							LobbyCode:     "AAA",
							SelectedMapID: "ascent",
							MapSide:       "defense",
							Tags:          []string{"a-site", "post-plant"},
							IsFavorite:    true,
							UpdatedAt:     now,
						},
					},
					Total: 1,
				}, nil
			},
		})

		req := authedRequest(t, user, http.MethodGet, "/api/strategies/library?q=b%20site&tags=post-plant,a-site&tagMode=any&favorite=true&mapId=ascent&side=defense&sort=name&limit=25&offset=50", nil)
		w := httptest.NewRecorder()
		GetStrategyLibrary(w, req)

		require.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "b site", received.Query)
		assert.Equal(t, []string{"a-site", "post-plant"}, received.Tags)
		assert.Equal(t, "any", received.TagMode)
		require.NotNil(t, received.Favorite)
		assert.True(t, *received.Favorite)
		assert.Equal(t, "ascent", received.MapID)
		assert.Equal(t, "defense", received.Side)
		assert.Equal(t, "name", received.Sort)
		assert.Equal(t, 25, received.Limit)
		assert.Equal(t, 50, received.Offset)

		var response StrategyLibraryResponse
		testutils.ParseJSONResponse(t, w, &response)
		assert.Equal(t, 1, response.Total)
		require.Len(t, response.Items, 1)
		assert.Equal(t, []string{"a-site", "post-plant"}, response.Items[0].Tags)
		assert.True(t, response.Items[0].IsFavorite)
		assert.Equal(t, "defense", response.Items[0].MapSide)
	})

	t.Run("rejects invalid query values", func(t *testing.T) {
		useStrategyLibraryRepo(t, &mockStrategyLibraryHandlerRepo{})

		req := authedRequest(t, user, http.MethodGet, "/api/strategies/library?limit=abc", nil)
		w := httptest.NewRecorder()
		GetStrategyLibrary(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("requires authentication", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/strategies/library", nil)
		w := httptest.NewRecorder()
		GetStrategyLibrary(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

func TestGetStrategyTags(t *testing.T) {
	user := newTestAuthenticatedUser()

	t.Run("returns tags", func(t *testing.T) {
		useStrategyLibraryRepo(t, &mockStrategyLibraryHandlerRepo{
			listTagsFn: func(userID int) ([]string, error) {
				return []string{"a-site", "post-plant"}, nil
			},
		})

		w := httptest.NewRecorder()
		GetStrategyTags(w, authedRequest(t, user, http.MethodGet, "/api/strategies/tags", nil))

		require.Equal(t, http.StatusOK, w.Code)
		var response StrategyTagsResponse
		testutils.ParseJSONResponse(t, w, &response)
		assert.Equal(t, []string{"a-site", "post-plant"}, response.Tags)
	})

	t.Run("returns an empty array when there are no tags", func(t *testing.T) {
		useStrategyLibraryRepo(t, &mockStrategyLibraryHandlerRepo{})

		w := httptest.NewRecorder()
		GetStrategyTags(w, authedRequest(t, user, http.MethodGet, "/api/strategies/tags", nil))

		require.Equal(t, http.StatusOK, w.Code)
		var response StrategyTagsResponse
		testutils.ParseJSONResponse(t, w, &response)
		assert.NotNil(t, response.Tags)
		assert.Empty(t, response.Tags)
	})
}

func TestDuplicateStrategy(t *testing.T) {
	user := newTestAuthenticatedUser()

	duplicateRequest := func(t *testing.T, id string) *http.Request {
		t.Helper()
		req := authedRequest(t, user, http.MethodPost, "/api/strategies/"+id+"/duplicate", nil)
		return mux.SetURLVars(req, map[string]string{"id": id})
	}

	t.Run("duplicates a strategy", func(t *testing.T) {
		useStrategyLibraryRepo(t, &mockStrategyLibraryHandlerRepo{
			getStrategyFn: func(id int) (*models.Strategy, error) {
				return &models.Strategy{
					ID:         id,
					UserID:     user.ID,
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
				strategy.ID = 99
				return nil
			},
			getLobbyMetaFn: func(code string) (*models.LobbyMeta, error) {
				return &models.LobbyMeta{
					Code:          code,
					SelectedMapID: "ascent",
					MapSide:       "defense",
					UpdatedAt:     time.Now(),
				}, nil
			},
		})

		w := httptest.NewRecorder()
		DuplicateStrategy(w, duplicateRequest(t, "5"))

		require.Equal(t, http.StatusCreated, w.Code)
		var response StrategyResponse
		testutils.ParseJSONResponse(t, w, &response)
		assert.Equal(t, 99, response.ID)
		assert.Equal(t, "B Site Rush (copy)", response.Name)
		assert.Equal(t, "NEW123", response.LobbyCode)
		assert.Equal(t, []string{"post-plant"}, response.Tags)
		assert.True(t, response.IsFavorite)
	})

	t.Run("rejects invalid id", func(t *testing.T) {
		useStrategyLibraryRepo(t, &mockStrategyLibraryHandlerRepo{})

		w := httptest.NewRecorder()
		DuplicateStrategy(w, duplicateRequest(t, "abc"))

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("rejects another user's strategy", func(t *testing.T) {
		useStrategyLibraryRepo(t, &mockStrategyLibraryHandlerRepo{
			getStrategyFn: func(id int) (*models.Strategy, error) {
				return &models.Strategy{ID: id, UserID: user.ID + 1}, nil
			},
		})

		w := httptest.NewRecorder()
		DuplicateStrategy(w, duplicateRequest(t, "5"))

		assert.Equal(t, http.StatusForbidden, w.Code)
	})
}

func TestBulkUpdateStrategies(t *testing.T) {
	user := newTestAuthenticatedUser()

	t.Run("updates selected strategies", func(t *testing.T) {
		var received models.BulkUpdateStrategyParams
		useStrategyLibraryRepo(t, &mockStrategyLibraryHandlerRepo{
			getTagsByIDsFn: func(userID int, ids []int) (map[int][]string, error) {
				return map[int][]string{1: {"old"}, 2: {"old"}}, nil
			},
			bulkUpdateFn: func(params models.BulkUpdateStrategyParams) (int64, error) {
				received = params
				return 2, nil
			},
		})

		body := map[string]any{
			"ids":        []int{1, 2},
			"folderId":   nil,
			"isFavorite": true,
			"addTags":    []string{"Post-Plant"},
			"removeTags": []string{"old"},
		}
		w := httptest.NewRecorder()
		BulkUpdateStrategies(w, authedRequest(t, user, http.MethodPatch, "/api/strategies/bulk", body))

		require.Equal(t, http.StatusOK, w.Code)
		assert.True(t, received.HasFolderID)
		assert.Nil(t, received.FolderID)
		require.NotNil(t, received.IsFavorite)
		assert.True(t, *received.IsFavorite)
		assert.Equal(t, []string{"post-plant"}, received.AddTags)
		assert.Equal(t, []string{"old"}, received.RemoveTags)

		var response BulkUpdateStrategiesResponse
		testutils.ParseJSONResponse(t, w, &response)
		assert.Equal(t, int64(2), response.Updated)
	})

	t.Run("rejects an empty selection", func(t *testing.T) {
		useStrategyLibraryRepo(t, &mockStrategyLibraryHandlerRepo{})

		w := httptest.NewRecorder()
		BulkUpdateStrategies(w, authedRequest(t, user, http.MethodPatch, "/api/strategies/bulk", map[string]any{"ids": []int{}}))

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("rejects a folder owned by another user", func(t *testing.T) {
		useStrategyLibraryRepo(t, &mockStrategyLibraryHandlerRepo{
			getFolderFn: func(folderID int) (*models.Folder, error) {
				return &models.Folder{ID: folderID, UserID: user.ID + 1}, nil
			},
		})

		w := httptest.NewRecorder()
		BulkUpdateStrategies(w, authedRequest(t, user, http.MethodPatch, "/api/strategies/bulk", map[string]any{
			"ids":      []int{1},
			"folderId": 7,
		}))

		assert.Equal(t, http.StatusForbidden, w.Code)
	})
}

func TestBulkDeleteStrategies(t *testing.T) {
	user := newTestAuthenticatedUser()

	t.Run("deletes selected strategies", func(t *testing.T) {
		useStrategyLibraryRepo(t, &mockStrategyLibraryHandlerRepo{
			getTagsByIDsFn: func(userID int, ids []int) (map[int][]string, error) {
				return map[int][]string{1: {}, 2: {}}, nil
			},
			bulkDeleteFn: func(userID int, ids []int) (int64, error) {
				return int64(len(ids)), nil
			},
		})

		w := httptest.NewRecorder()
		BulkDeleteStrategies(w, authedRequest(t, user, http.MethodPost, "/api/strategies/bulk-delete", map[string]any{"ids": []int{1, 2}}))

		require.Equal(t, http.StatusOK, w.Code)
		var response BulkDeleteStrategiesResponse
		testutils.ParseJSONResponse(t, w, &response)
		assert.Equal(t, int64(2), response.Deleted)
	})

	t.Run("rejects strategies owned by another user", func(t *testing.T) {
		useStrategyLibraryRepo(t, &mockStrategyLibraryHandlerRepo{
			getTagsByIDsFn: func(userID int, ids []int) (map[int][]string, error) {
				return map[int][]string{1: {}}, nil
			},
		})

		w := httptest.NewRecorder()
		BulkDeleteStrategies(w, authedRequest(t, user, http.MethodPost, "/api/strategies/bulk-delete", map[string]any{"ids": []int{1, 2}}))

		assert.Equal(t, http.StatusForbidden, w.Code)
	})
}

func TestUpdateStrategyTagsAndFavorite(t *testing.T) {
	user := newTestAuthenticatedUser()

	repo := &mockStrategyHandlerRepo{
		getStrategyByIDFn: func(id int) (*models.Strategy, error) {
			return &models.Strategy{ID: id, UserID: user.ID, LobbyCode: "AAA", Name: "Old"}, nil
		},
		getLobbyMetaFn: func(code string) (*models.LobbyMeta, error) {
			return &models.LobbyMeta{Code: code, SelectedMapID: "ascent", UpdatedAt: time.Now()}, nil
		},
		updateFn: func(strategy *models.Strategy) error {
			assert.Equal(t, []string{"b site"}, strategy.Tags)
			assert.True(t, strategy.IsFavorite)
			return nil
		},
	}
	useStrategyRepo(t, repo)

	w := httptest.NewRecorder()
	UpdateStrategy(w, strategyRequest(t, user, http.MethodPatch, "5", map[string]any{
		"tags":       []string{"B Site", "b site"},
		"isFavorite": true,
	}))

	require.Equal(t, http.StatusOK, w.Code)
	var response StrategyResponse
	testutils.ParseJSONResponse(t, w, &response)
	assert.Equal(t, []string{"b site"}, response.Tags)
	assert.True(t, response.IsFavorite)
}
