package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"valo-mapper-api/models"
	"valo-mapper-api/testutils"

	"firebase.google.com/go/v4/auth"
	"github.com/stretchr/testify/assert"
)

func testCreateFolder(w http.ResponseWriter, r *http.Request, mockAuth *testutils.MockFirebaseAuth) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusBadRequest)
		return
	}

	user, err := testAuthenticateRequest(r, mockAuth)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateFolderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if req.Name == "" {
		http.Error(w, "Folder name is required", http.StatusBadRequest)
		return
	}

	folder := &models.Folder{
		UserID:         user.ID,
		Name:           req.Name,
		ParentFolderID: req.ParentFolderID,
	}

	if err := folder.Save(); err != nil {
		http.Error(w, "Unable to create folder", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(folder)
}

func testGetFolders(w http.ResponseWriter, r *http.Request, mockAuth *testutils.MockFirebaseAuth) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusBadRequest)
		return
	}

	user, err := testAuthenticateRequest(r, mockAuth)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	folders, err := models.GetFoldersByUserID(user.ID)
	if err != nil {
		http.Error(w, "Unable to retrieve folders", http.StatusInternalServerError)
		return
	}

	if folders == nil {
		folders = []models.Folder{}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(folders)
}

func testUpdateFolder(w http.ResponseWriter, r *http.Request, mockAuth *testutils.MockFirebaseAuth) {
	if r.Method != http.MethodPatch {
		http.Error(w, "Method not allowed", http.StatusBadRequest)
		return
	}

	user, err := testAuthenticateRequest(r, mockAuth)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	path := r.URL.Path
	idStr := strings.TrimPrefix(path, "/api/folders/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid folder ID", http.StatusBadRequest)
		return
	}

	var req UpdateFolderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	folder, err := models.GetFolderByID(id)
	if err != nil {
		http.Error(w, "Unable to retrieve folder", http.StatusInternalServerError)
		return
	}
	if folder == nil {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte("Folder not found"))
		return
	}

	if folder.UserID != user.ID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	if req.Name != nil {
		folder.Name = *req.Name
	}
	if req.ParentFolderID != nil {
		folder.ParentFolderID = req.ParentFolderID
	}

	if err := folder.Update(); err != nil {
		http.Error(w, "Unable to update folder", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(folder)
}

func testDeleteFolder(w http.ResponseWriter, r *http.Request, mockAuth *testutils.MockFirebaseAuth) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusBadRequest)
		return
	}

	user, err := testAuthenticateRequest(r, mockAuth)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	path := r.URL.Path
	idStr := strings.TrimPrefix(path, "/api/folders/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid folder ID", http.StatusBadRequest)
		return
	}

	folder, err := models.GetFolderByID(id)
	if err != nil {
		http.Error(w, "Unable to retrieve folder", http.StatusInternalServerError)
		return
	}
	if folder == nil {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte("Folder not found"))
		return
	}

	if folder.UserID != user.ID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	if err := folder.Delete(); err != nil {
		http.Error(w, "Unable to delete folder", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Tests
func TestCreateFolder(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "folders", "users")

	mockAuth := &testutils.MockFirebaseAuth{}
	testUser := testutils.CreateTestUser(t, pool, "firebase-uid-folder-test")

	t.Run("successfully creates folder", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		reqBody := CreateFolderRequest{
			Name: "Test Folder",
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/folders", reqBody, "valid-token")
		w := httptest.NewRecorder()

		testCreateFolder(w, req, mockAuth)

		assert.Equal(t, http.StatusCreated, w.Code)

		var folder models.Folder
		testutils.ParseJSONResponse(t, w, &folder)

		assert.Equal(t, "Test Folder", folder.Name)
		assert.Equal(t, testUser.ID, folder.UserID)
		assert.Nil(t, folder.ParentFolderID)
		assert.NotZero(t, folder.ID)
	})

	t.Run("successfully creates folder with parent", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		parentFolder := testutils.CreateTestFolder(t, pool, testUser.ID, "Parent Folder")

		reqBody := CreateFolderRequest{
			Name:           "Child Folder",
			ParentFolderID: &parentFolder.ID,
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/folders", reqBody, "valid-token")
		w := httptest.NewRecorder()

		testCreateFolder(w, req, mockAuth)

		assert.Equal(t, http.StatusCreated, w.Code)

		var folder models.Folder
		testutils.ParseJSONResponse(t, w, &folder)

		assert.Equal(t, "Child Folder", folder.Name)
		assert.NotNil(t, folder.ParentFolderID)
		assert.Equal(t, parentFolder.ID, *folder.ParentFolderID)
	})

	t.Run("rejects missing folder name", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		reqBody := CreateFolderRequest{
			Name: "",
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/folders", reqBody, "valid-token")
		w := httptest.NewRecorder()

		testCreateFolder(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("rejects missing authorization", func(t *testing.T) {
		reqBody := CreateFolderRequest{
			Name: "Test Folder",
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/folders", reqBody, "")
		w := httptest.NewRecorder()

		testCreateFolder(w, req, mockAuth)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("rejects non-POST methods", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/folders", nil)
		w := httptest.NewRecorder()

		testCreateFolder(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestGetFolders(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "folders", "users")

	mockAuth := &testutils.MockFirebaseAuth{}
	testUser := testutils.CreateTestUser(t, pool, "firebase-uid-get-folders")

	t.Run("successfully retrieves user folders", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		folder1 := testutils.CreateTestFolder(t, pool, testUser.ID, "Folder 1")
		folder2 := testutils.CreateTestFolder(t, pool, testUser.ID, "Folder 2")

		req := testutils.MakeRequest(t, http.MethodGet, "/api/folders", nil, "valid-token")
		w := httptest.NewRecorder()

		testGetFolders(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)

		var folders []models.Folder
		testutils.ParseJSONResponse(t, w, &folders)

		assert.Len(t, folders, 2)
		folderNames := []string{folders[0].Name, folders[1].Name}
		assert.Contains(t, folderNames, folder1.Name)
		assert.Contains(t, folderNames, folder2.Name)
	})

	t.Run("returns empty array when no folders", func(t *testing.T) {
		testUser2 := testutils.CreateTestUser(t, pool, "firebase-uid-no-folders")

		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser2.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser2.Email},
				EmailVerified: true,
			}, nil
		}

		req := testutils.MakeRequest(t, http.MethodGet, "/api/folders", nil, "valid-token")
		w := httptest.NewRecorder()

		testGetFolders(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)

		var folders []models.Folder
		testutils.ParseJSONResponse(t, w, &folders)

		assert.Empty(t, folders)
	})

	t.Run("rejects missing authorization", func(t *testing.T) {
		req := testutils.MakeRequest(t, http.MethodGet, "/api/folders", nil, "")
		w := httptest.NewRecorder()

		testGetFolders(w, req, mockAuth)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("rejects non-GET methods", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/folders", nil)
		w := httptest.NewRecorder()

		testGetFolders(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestUpdateFolder(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "folders", "users")

	mockAuth := &testutils.MockFirebaseAuth{}
	testUser := testutils.CreateTestUser(t, pool, "firebase-uid-update-folder")

	t.Run("successfully updates folder name", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		folder := testutils.CreateTestFolder(t, pool, testUser.ID, "Original Name")

		newName := "Updated Name"
		reqBody := UpdateFolderRequest{
			Name: &newName,
		}

		req := testutils.MakeRequest(t, http.MethodPatch, fmt.Sprintf("/api/folders/%d", folder.ID), reqBody, "valid-token")
		w := httptest.NewRecorder()

		testUpdateFolder(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)

		var updatedFolder models.Folder
		testutils.ParseJSONResponse(t, w, &updatedFolder)

		assert.Equal(t, "Updated Name", updatedFolder.Name)
		assert.Equal(t, folder.ID, updatedFolder.ID)
	})

	t.Run("successfully updates parent folder", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		parentFolder := testutils.CreateTestFolder(t, pool, testUser.ID, "Parent")
		childFolder := testutils.CreateTestFolder(t, pool, testUser.ID, "Child")

		reqBody := UpdateFolderRequest{
			ParentFolderID: &parentFolder.ID,
		}

		req := testutils.MakeRequest(t, http.MethodPatch, fmt.Sprintf("/api/folders/%d", childFolder.ID), reqBody, "valid-token")
		w := httptest.NewRecorder()

		testUpdateFolder(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)

		var updatedFolder models.Folder
		testutils.ParseJSONResponse(t, w, &updatedFolder)

		assert.NotNil(t, updatedFolder.ParentFolderID)
		assert.Equal(t, parentFolder.ID, *updatedFolder.ParentFolderID)
	})

	t.Run("returns 404 for non-existent folder", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		newName := "New Name"
		reqBody := UpdateFolderRequest{
			Name: &newName,
		}

		req := testutils.MakeRequest(t, http.MethodPatch, "/api/folders/99999", reqBody, "valid-token")
		w := httptest.NewRecorder()

		testUpdateFolder(w, req, mockAuth)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("rejects access to another user's folder", func(t *testing.T) {
		otherUser := testutils.CreateTestUser(t, pool, "firebase-uid-other-user")
		folder := testutils.CreateTestFolder(t, pool, otherUser.ID, "Other User's Folder")

		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		newName := "Hacked Name"
		reqBody := UpdateFolderRequest{
			Name: &newName,
		}

		req := testutils.MakeRequest(t, http.MethodPatch, fmt.Sprintf("/api/folders/%d", folder.ID), reqBody, "valid-token")
		w := httptest.NewRecorder()

		testUpdateFolder(w, req, mockAuth)

		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("rejects invalid folder ID", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		newName := "New Name"
		reqBody := UpdateFolderRequest{
			Name: &newName,
		}

		req := testutils.MakeRequest(t, http.MethodPatch, "/api/folders/invalid", reqBody, "valid-token")
		w := httptest.NewRecorder()

		testUpdateFolder(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("rejects missing authorization", func(t *testing.T) {
		folder := testutils.CreateTestFolder(t, pool, testUser.ID, "Test Folder")

		newName := "New Name"
		reqBody := UpdateFolderRequest{
			Name: &newName,
		}

		req := testutils.MakeRequest(t, http.MethodPatch, fmt.Sprintf("/api/folders/%d", folder.ID), reqBody, "")
		w := httptest.NewRecorder()

		testUpdateFolder(w, req, mockAuth)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("rejects non-PATCH methods", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/folders/1", nil)
		w := httptest.NewRecorder()

		testUpdateFolder(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestDeleteFolder(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "folders", "users")

	mockAuth := &testutils.MockFirebaseAuth{}
	testUser := testutils.CreateTestUser(t, pool, "firebase-uid-delete-folder")

	t.Run("successfully deletes folder", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		folder := testutils.CreateTestFolder(t, pool, testUser.ID, "Folder to Delete")

		req := testutils.MakeRequest(t, http.MethodDelete, fmt.Sprintf("/api/folders/%d", folder.ID), nil, "valid-token")
		w := httptest.NewRecorder()

		testDeleteFolder(w, req, mockAuth)

		assert.Equal(t, http.StatusNoContent, w.Code)

		// Verify folder was deleted (GetFolderByID returns (nil, nil) when not found)
		deletedFolder, _ := models.GetFolderByID(folder.ID)
		assert.Nil(t, deletedFolder)
	})

	t.Run("returns 404 for non-existent folder", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		req := testutils.MakeRequest(t, http.MethodDelete, "/api/folders/99999", nil, "valid-token")
		w := httptest.NewRecorder()

		testDeleteFolder(w, req, mockAuth)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("rejects access to another user's folder", func(t *testing.T) {
		otherUser := testutils.CreateTestUser(t, pool, "firebase-uid-other-user-delete")
		folder := testutils.CreateTestFolder(t, pool, otherUser.ID, "Other User's Folder")

		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		req := testutils.MakeRequest(t, http.MethodDelete, fmt.Sprintf("/api/folders/%d", folder.ID), nil, "valid-token")
		w := httptest.NewRecorder()

		testDeleteFolder(w, req, mockAuth)

		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("rejects invalid folder ID", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		req := testutils.MakeRequest(t, http.MethodDelete, "/api/folders/invalid", nil, "valid-token")
		w := httptest.NewRecorder()

		testDeleteFolder(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("rejects missing authorization", func(t *testing.T) {
		folder := testutils.CreateTestFolder(t, pool, testUser.ID, "Test Folder")

		req := testutils.MakeRequest(t, http.MethodDelete, fmt.Sprintf("/api/folders/%d", folder.ID), nil, "")
		w := httptest.NewRecorder()

		testDeleteFolder(w, req, mockAuth)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("rejects non-DELETE methods", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/folders/1", nil)
		w := httptest.NewRecorder()

		testDeleteFolder(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}
