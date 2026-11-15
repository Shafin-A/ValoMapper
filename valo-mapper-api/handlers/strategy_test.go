package handlers

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"valo-mapper-api/models"
	"valo-mapper-api/testutils"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func strategyRequest(t *testing.T, user *models.User, method, id string, body any) *http.Request {
	t.Helper()

	path := "/api/strategies"
	if id != "" {
		path += "/" + id
	}

	req := authedRequest(t, user, method, path, body)
	if id != "" {
		req = mux.SetURLVars(req, map[string]string{"id": id})
	}
	return req
}

func TestCreateStrategy(t *testing.T) {
	user := newTestAuthenticatedUser()

	t.Run("creates strategy", func(t *testing.T) {
		repo := &mockStrategyHandlerRepo{
			getLobbyMetaFn: func(code string) (*models.LobbyMeta, error) {
				return &models.LobbyMeta{Code: code, SelectedMapID: "ascent", UpdatedAt: time.Now()}, nil
			},
			saveFn: func(strategy *models.Strategy) error {
				strategy.ID = 42
				return nil
			},
		}
		useStrategyRepo(t, repo)

		w := httptest.NewRecorder()
		CreateStrategy(w, strategyRequest(t, user, http.MethodPost, "", CreateStrategyRequest{
			LobbyCode: "ABCDEFG",
			Name:      "Test Strategy",
		}))

		require.Equal(t, http.StatusCreated, w.Code)

		var response StrategyResponse
		testutils.ParseJSONResponse(t, w, &response)
		assert.Equal(t, 42, response.ID)
		assert.Equal(t, user.ID, response.UserID)
		assert.Equal(t, "Test Strategy", response.Name)
		assert.Equal(t, "ABCDEFG", response.LobbyCode)
		assert.Equal(t, "ascent", response.SelectedMapID)
	})

	t.Run("rejects missing lobby code", func(t *testing.T) {
		useStrategyRepo(t, &mockStrategyHandlerRepo{})

		w := httptest.NewRecorder()
		CreateStrategy(w, strategyRequest(t, user, http.MethodPost, "", CreateStrategyRequest{
			Name: "Test Strategy",
		}))

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("rejects free plan limit", func(t *testing.T) {
		freeUser := newTestAuthenticatedUser()
		freeUser.IsSubscribed = false
		useStrategyRepo(t, &mockStrategyHandlerRepo{
			getLobbyMetaFn: func(code string) (*models.LobbyMeta, error) {
				return &models.LobbyMeta{Code: code}, nil
			},
			countFn: func(userID int) (int, error) { return 1, nil },
		})

		w := httptest.NewRecorder()
		CreateStrategy(w, strategyRequest(t, freeUser, http.MethodPost, "", CreateStrategyRequest{
			LobbyCode: "ABCDEFG",
			Name:      "Test Strategy",
		}))

		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("rejects duplicate save", func(t *testing.T) {
		useStrategyRepo(t, &mockStrategyHandlerRepo{
			getLobbyMetaFn: func(code string) (*models.LobbyMeta, error) {
				return &models.LobbyMeta{Code: code}, nil
			},
			existsFn: func(userID int, lobbyCode string) (bool, error) { return true, nil },
		})

		w := httptest.NewRecorder()
		CreateStrategy(w, strategyRequest(t, user, http.MethodPost, "", CreateStrategyRequest{
			LobbyCode: "ABCDEFG",
			Name:      "Test Strategy",
		}))

		assert.Equal(t, http.StatusConflict, w.Code)
	})

	t.Run("returns internal error when the repository fails", func(t *testing.T) {
		useStrategyRepo(t, &mockStrategyHandlerRepo{
			getLobbyMetaFn: func(code string) (*models.LobbyMeta, error) {
				return nil, errors.New("db down")
			},
		})

		w := httptest.NewRecorder()
		CreateStrategy(w, strategyRequest(t, user, http.MethodPost, "", CreateStrategyRequest{
			LobbyCode: "ABCDEFG",
			Name:      "Test Strategy",
		}))

		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("rejects missing authentication", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/strategies", strings.NewReader(`{"lobbyCode":"ABCDEFG","name":"Test"}`))
		w := httptest.NewRecorder()
		CreateStrategy(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

func TestGetStrategies(t *testing.T) {
	user := newTestAuthenticatedUser()
	now := time.Now()

	t.Run("lists strategies", func(t *testing.T) {
		useStrategyRepo(t, &mockStrategyHandlerRepo{
			summariesFn: func(userID int, folderID *int) ([]models.StrategySummary, error) {
				return []models.StrategySummary{
					{ID: 1, UserID: user.ID, Name: "One", LobbyCode: "AAA", SelectedMapID: "ascent", UpdatedAt: now},
					{ID: 2, UserID: user.ID, Name: "Two", LobbyCode: "BBB", SelectedMapID: "bind", UpdatedAt: now},
				}, nil
			},
		})

		w := httptest.NewRecorder()
		GetStrategies(w, strategyRequest(t, user, http.MethodGet, "", nil))

		require.Equal(t, http.StatusOK, w.Code)

		var response []StrategyResponse
		testutils.ParseJSONResponse(t, w, &response)
		require.Len(t, response, 2)
		assert.Equal(t, "One", response[0].Name)
		assert.Equal(t, "ascent", response[0].SelectedMapID)
		assert.Equal(t, "BBB", response[1].LobbyCode)
	})

	t.Run("passes the folder filter", func(t *testing.T) {
		var received *int
		useStrategyRepo(t, &mockStrategyHandlerRepo{
			summariesFn: func(userID int, folderID *int) ([]models.StrategySummary, error) {
				received = folderID
				return nil, nil
			},
		})

		req := authedRequest(t, user, http.MethodGet, "/api/strategies?folderId=5", nil)
		w := httptest.NewRecorder()
		GetStrategies(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		require.NotNil(t, received)
		assert.Equal(t, 5, *received)
	})

	t.Run("rejects invalid folder filter", func(t *testing.T) {
		useStrategyRepo(t, &mockStrategyHandlerRepo{})

		req := authedRequest(t, user, http.MethodGet, "/api/strategies?folderId=abc", nil)
		w := httptest.NewRecorder()
		GetStrategies(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("returns internal error when the repository fails", func(t *testing.T) {
		useStrategyRepo(t, &mockStrategyHandlerRepo{
			summariesFn: func(userID int, folderID *int) ([]models.StrategySummary, error) {
				return nil, errors.New("db down")
			},
		})

		w := httptest.NewRecorder()
		GetStrategies(w, strategyRequest(t, user, http.MethodGet, "", nil))

		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})
}

func TestUpdateStrategy(t *testing.T) {
	user := newTestAuthenticatedUser()

	t.Run("updates strategy", func(t *testing.T) {
		repo := &mockStrategyHandlerRepo{
			getStrategyByIDFn: func(id int) (*models.Strategy, error) {
				return &models.Strategy{ID: id, UserID: user.ID, LobbyCode: "AAA", Name: "Old"}, nil
			},
			getLobbyMetaFn: func(code string) (*models.LobbyMeta, error) {
				return &models.LobbyMeta{Code: code, SelectedMapID: "ascent", UpdatedAt: time.Now()}, nil
			},
			updateFn: func(strategy *models.Strategy) error {
				assert.Equal(t, "New", strategy.Name)
				return nil
			},
		}
		useStrategyRepo(t, repo)

		w := httptest.NewRecorder()
		UpdateStrategy(w, strategyRequest(t, user, http.MethodPatch, "5", map[string]any{"name": "New"}))

		require.Equal(t, http.StatusOK, w.Code)

		var response StrategyResponse
		testutils.ParseJSONResponse(t, w, &response)
		assert.Equal(t, "New", response.Name)
		assert.Equal(t, "AAA", response.LobbyCode)
		assert.Equal(t, "ascent", response.SelectedMapID)
	})

	t.Run("rejects invalid id", func(t *testing.T) {
		useStrategyRepo(t, &mockStrategyHandlerRepo{})

		w := httptest.NewRecorder()
		UpdateStrategy(w, strategyRequest(t, user, http.MethodPatch, "abc", map[string]any{"name": "New"}))

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("returns not found", func(t *testing.T) {
		useStrategyRepo(t, &mockStrategyHandlerRepo{})

		w := httptest.NewRecorder()
		UpdateStrategy(w, strategyRequest(t, user, http.MethodPatch, "5", map[string]any{"name": "New"}))

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("rejects another user's strategy", func(t *testing.T) {
		useStrategyRepo(t, &mockStrategyHandlerRepo{
			getStrategyByIDFn: func(id int) (*models.Strategy, error) {
				return &models.Strategy{ID: id, UserID: user.ID + 1, LobbyCode: "AAA"}, nil
			},
		})

		w := httptest.NewRecorder()
		UpdateStrategy(w, strategyRequest(t, user, http.MethodPatch, "5", map[string]any{"name": "New"}))

		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("rejects invalid body", func(t *testing.T) {
		useStrategyRepo(t, &mockStrategyHandlerRepo{})

		req := httptest.NewRequest(http.MethodPatch, "/api/strategies/5", strings.NewReader("{"))
		req = requestWithUser(req, user)
		req = mux.SetURLVars(req, map[string]string{"id": "5"})
		w := httptest.NewRecorder()
		UpdateStrategy(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestDeleteStrategy(t *testing.T) {
	user := newTestAuthenticatedUser()

	t.Run("deletes strategy", func(t *testing.T) {
		deleted := false
		useStrategyRepo(t, &mockStrategyHandlerRepo{
			getStrategyByIDFn: func(id int) (*models.Strategy, error) {
				return &models.Strategy{ID: id, UserID: user.ID, LobbyCode: "AAA"}, nil
			},
			deleteFn: func(strategy *models.Strategy) error {
				deleted = true
				return nil
			},
		})

		w := httptest.NewRecorder()
		DeleteStrategy(w, strategyRequest(t, user, http.MethodDelete, "5", nil))

		assert.Equal(t, http.StatusNoContent, w.Code)
		assert.True(t, deleted)
	})

	t.Run("rejects invalid id", func(t *testing.T) {
		useStrategyRepo(t, &mockStrategyHandlerRepo{})

		w := httptest.NewRecorder()
		DeleteStrategy(w, strategyRequest(t, user, http.MethodDelete, "abc", nil))

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("returns not found", func(t *testing.T) {
		useStrategyRepo(t, &mockStrategyHandlerRepo{})

		w := httptest.NewRecorder()
		DeleteStrategy(w, strategyRequest(t, user, http.MethodDelete, "5", nil))

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("rejects another user's strategy", func(t *testing.T) {
		useStrategyRepo(t, &mockStrategyHandlerRepo{
			getStrategyByIDFn: func(id int) (*models.Strategy, error) {
				return &models.Strategy{ID: id, UserID: user.ID + 1, LobbyCode: "AAA"}, nil
			},
		})

		w := httptest.NewRecorder()
		DeleteStrategy(w, strategyRequest(t, user, http.MethodDelete, "5", nil))

		assert.Equal(t, http.StatusForbidden, w.Code)
	})
}
