package handlers

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"valo-mapper-api/models"
	"valo-mapper-api/testutils"

	"github.com/gorilla/mux"
	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func folderRequest(t *testing.T, user *models.User, method, id string, body any) *http.Request {
	t.Helper()

	path := "/api/folders"
	if id != "" {
		path += "/" + id
	}

	req := authedRequest(t, user, method, path, body)
	if id != "" {
		req = mux.SetURLVars(req, map[string]string{"id": id})
	}
	return req
}

func TestCreateFolder(t *testing.T) {
	user := newTestAuthenticatedUser()

	t.Run("creates folder", func(t *testing.T) {
		repo := &mockFolderHandlerRepo{
			saveFn: func(folder *models.Folder) error {
				folder.ID = 9
				return nil
			},
		}
		useFolderRepo(t, repo)

		w := httptest.NewRecorder()
		CreateFolder(w, folderRequest(t, user, http.MethodPost, "", CreateFolderRequest{Name: "Test Folder"}))

		require.Equal(t, http.StatusCreated, w.Code)

		var folder models.Folder
		testutils.ParseJSONResponse(t, w, &folder)
		assert.Equal(t, 9, folder.ID)
		assert.Equal(t, "Test Folder", folder.Name)
		assert.Equal(t, user.ID, folder.UserID)
	})

	t.Run("rejects missing name", func(t *testing.T) {
		useFolderRepo(t, &mockFolderHandlerRepo{})

		w := httptest.NewRecorder()
		CreateFolder(w, folderRequest(t, user, http.MethodPost, "", CreateFolderRequest{}))

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("rejects free users", func(t *testing.T) {
		freeUser := newTestAuthenticatedUser()
		freeUser.IsSubscribed = false
		useFolderRepo(t, &mockFolderHandlerRepo{})

		w := httptest.NewRecorder()
		CreateFolder(w, folderRequest(t, freeUser, http.MethodPost, "", CreateFolderRequest{Name: "Test"}))

		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("rejects duplicate name", func(t *testing.T) {
		useFolderRepo(t, &mockFolderHandlerRepo{
			saveFn: func(folder *models.Folder) error {
				return &pgconn.PgError{Code: pgerrcode.UniqueViolation}
			},
		})

		w := httptest.NewRecorder()
		CreateFolder(w, folderRequest(t, user, http.MethodPost, "", CreateFolderRequest{Name: "Duplicate"}))

		assert.Equal(t, http.StatusConflict, w.Code)
	})

	t.Run("returns internal error when the repository fails", func(t *testing.T) {
		useFolderRepo(t, &mockFolderHandlerRepo{
			saveFn: func(folder *models.Folder) error { return errors.New("db down") },
		})

		w := httptest.NewRecorder()
		CreateFolder(w, folderRequest(t, user, http.MethodPost, "", CreateFolderRequest{Name: "Test"}))

		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("rejects missing authentication", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/folders", strings.NewReader(`{"name":"Test"}`))
		w := httptest.NewRecorder()
		CreateFolder(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

func TestGetFolders(t *testing.T) {
	user := newTestAuthenticatedUser()

	t.Run("lists folders", func(t *testing.T) {
		useFolderRepo(t, &mockFolderHandlerRepo{
			getFoldersFn: func(userID int) ([]models.Folder, error) {
				return []models.Folder{{ID: 1, UserID: userID, Name: "One"}, {ID: 2, UserID: userID, Name: "Two"}}, nil
			},
		})

		w := httptest.NewRecorder()
		GetFolders(w, folderRequest(t, user, http.MethodGet, "", nil))

		require.Equal(t, http.StatusOK, w.Code)

		var folders []models.Folder
		testutils.ParseJSONResponse(t, w, &folders)
		require.Len(t, folders, 2)
		assert.Equal(t, "One", folders[0].Name)
	})

	t.Run("returns an empty array when there are no folders", func(t *testing.T) {
		useFolderRepo(t, &mockFolderHandlerRepo{})

		w := httptest.NewRecorder()
		GetFolders(w, folderRequest(t, user, http.MethodGet, "", nil))

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "[]", strings.TrimSpace(w.Body.String()))
	})

	t.Run("returns internal error when the repository fails", func(t *testing.T) {
		useFolderRepo(t, &mockFolderHandlerRepo{
			getFoldersFn: func(userID int) ([]models.Folder, error) { return nil, errors.New("db down") },
		})

		w := httptest.NewRecorder()
		GetFolders(w, folderRequest(t, user, http.MethodGet, "", nil))

		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})
}

func TestUpdateFolder(t *testing.T) {
	user := newTestAuthenticatedUser()

	t.Run("updates folder", func(t *testing.T) {
		useFolderRepo(t, &mockFolderHandlerRepo{
			getFolderFn: func(id int) (*models.Folder, error) {
				return &models.Folder{ID: id, UserID: user.ID, Name: "Old"}, nil
			},
			updateFn: func(folder *models.Folder) error {
				assert.Equal(t, "New", folder.Name)
				return nil
			},
		})

		w := httptest.NewRecorder()
		UpdateFolder(w, folderRequest(t, user, http.MethodPatch, "5", map[string]any{"name": "New"}))

		require.Equal(t, http.StatusOK, w.Code)

		var folder models.Folder
		testutils.ParseJSONResponse(t, w, &folder)
		assert.Equal(t, "New", folder.Name)
	})

	t.Run("rejects invalid id", func(t *testing.T) {
		useFolderRepo(t, &mockFolderHandlerRepo{})

		w := httptest.NewRecorder()
		UpdateFolder(w, folderRequest(t, user, http.MethodPatch, "abc", map[string]any{"name": "New"}))

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("returns not found", func(t *testing.T) {
		useFolderRepo(t, &mockFolderHandlerRepo{})

		w := httptest.NewRecorder()
		UpdateFolder(w, folderRequest(t, user, http.MethodPatch, "5", map[string]any{"name": "New"}))

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("rejects another user's folder", func(t *testing.T) {
		useFolderRepo(t, &mockFolderHandlerRepo{
			getFolderFn: func(id int) (*models.Folder, error) {
				return &models.Folder{ID: id, UserID: user.ID + 1, Name: "Other"}, nil
			},
		})

		w := httptest.NewRecorder()
		UpdateFolder(w, folderRequest(t, user, http.MethodPatch, "5", map[string]any{"name": "New"}))

		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("rejects free users", func(t *testing.T) {
		freeUser := newTestAuthenticatedUser()
		freeUser.IsSubscribed = false
		useFolderRepo(t, &mockFolderHandlerRepo{})

		w := httptest.NewRecorder()
		UpdateFolder(w, folderRequest(t, freeUser, http.MethodPatch, "5", map[string]any{"name": "New"}))

		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("rejects invalid body", func(t *testing.T) {
		useFolderRepo(t, &mockFolderHandlerRepo{})

		req := httptest.NewRequest(http.MethodPatch, "/api/folders/5", strings.NewReader("{"))
		req = requestWithUser(req, user)
		req = mux.SetURLVars(req, map[string]string{"id": "5"})
		w := httptest.NewRecorder()
		UpdateFolder(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestDeleteFolder(t *testing.T) {
	user := newTestAuthenticatedUser()

	t.Run("deletes folder", func(t *testing.T) {
		deleted := false
		useFolderRepo(t, &mockFolderHandlerRepo{
			getFolderFn: func(id int) (*models.Folder, error) {
				return &models.Folder{ID: id, UserID: user.ID, Name: "Folder"}, nil
			},
			deleteFn: func(folder *models.Folder) error {
				deleted = true
				return nil
			},
		})

		w := httptest.NewRecorder()
		DeleteFolder(w, folderRequest(t, user, http.MethodDelete, "5", nil))

		assert.Equal(t, http.StatusNoContent, w.Code)
		assert.True(t, deleted)
	})

	t.Run("rejects invalid id", func(t *testing.T) {
		useFolderRepo(t, &mockFolderHandlerRepo{})

		w := httptest.NewRecorder()
		DeleteFolder(w, folderRequest(t, user, http.MethodDelete, "abc", nil))

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("returns not found", func(t *testing.T) {
		useFolderRepo(t, &mockFolderHandlerRepo{})

		w := httptest.NewRecorder()
		DeleteFolder(w, folderRequest(t, user, http.MethodDelete, "5", nil))

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("rejects another user's folder", func(t *testing.T) {
		useFolderRepo(t, &mockFolderHandlerRepo{
			getFolderFn: func(id int) (*models.Folder, error) {
				return &models.Folder{ID: id, UserID: user.ID + 1, Name: "Other"}, nil
			},
		})

		w := httptest.NewRecorder()
		DeleteFolder(w, folderRequest(t, user, http.MethodDelete, "5", nil))

		assert.Equal(t, http.StatusForbidden, w.Code)
	})
}
