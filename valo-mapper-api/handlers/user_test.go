package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"valo-mapper-api/models"
	"valo-mapper-api/testutils"

	"firebase.google.com/go/v4/auth"
	"github.com/stretchr/testify/assert"
)

func testVerifyFirebaseTokenUser(r *http.Request, authClient testutils.FirebaseAuthInterface) (*auth.Token, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return nil, errors.New("missing authorization header")
	}

	idToken := strings.TrimPrefix(authHeader, "Bearer ")

	token, err := authClient.VerifyIDToken(context.Background(), idToken)
	if err != nil {
		return nil, errors.New("invalid or expired token")
	}

	return token, nil
}

func testAuthenticateRequest(r *http.Request, mockAuth *testutils.MockFirebaseAuth) (*models.User, error) {
	token, err := testVerifyFirebaseTokenUser(r, mockAuth)
	if err != nil {
		return nil, err
	}

	user, err := models.GetUserByFirebaseUID(token.UID)
	if err != nil {
		return nil, errors.New("unable to retrieve user profile")
	}
	if user == nil {
		return nil, errors.New("user profile not found")
	}

	firebaseUser, err := mockAuth.GetUser(context.Background(), token.UID)
	if err == nil && firebaseUser.EmailVerified != user.EmailVerified {
		user.EmailVerified = firebaseUser.EmailVerified
		_ = user.Update()
	}

	return user, nil
}

func testCreateUser(w http.ResponseWriter, r *http.Request, mockAuth *testutils.MockFirebaseAuth) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusBadRequest)
		return
	}

	token, err := testVerifyFirebaseTokenUser(r, mockAuth)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if token.UID != req.FirebaseUID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	user := &models.User{
		FirebaseUID:   req.FirebaseUID,
		Name:          req.Name,
		Email:         req.Email,
		EmailVerified: false,
	}

	if err := user.Save(); err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "already exists") || strings.Contains(err.Error(), "unique constraint") {
			http.Error(w, "User already exists", http.StatusConflict)
			return
		}
		http.Error(w, "Unable to create user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

func testGetUser(w http.ResponseWriter, r *http.Request, mockAuth *testutils.MockFirebaseAuth) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusBadRequest)
		return
	}

	user, err := testAuthenticateRequest(r, mockAuth)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(user)
}

func testUpdateUser(w http.ResponseWriter, r *http.Request, mockAuth *testutils.MockFirebaseAuth) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusBadRequest)
		return
	}

	user, err := testAuthenticateRequest(r, mockAuth)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if req.Name != "" {
		user.Name = req.Name
	}

	if err := user.Update(); err != nil {
		http.Error(w, "Unable to update user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(user)
}

func testDeleteUser(w http.ResponseWriter, r *http.Request, mockAuth *testutils.MockFirebaseAuth) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusBadRequest)
		return
	}

	user, err := testAuthenticateRequest(r, mockAuth)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := user.Delete(); err != nil {
		http.Error(w, "Unable to delete user", http.StatusInternalServerError)
		return
	}

	if err := mockAuth.DeleteUser(context.Background(), user.FirebaseUID); err != nil {
		http.Error(w, "User deleted from database but Firebase deletion failed", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Tests
func TestCreateUser(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "users")

	mockAuth := &testutils.MockFirebaseAuth{}

	t.Run("successfully creates user", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: "firebase-uid-123"}, nil
		}

		reqBody := CreateUserRequest{
			FirebaseUID: "firebase-uid-123",
			Name:        "Test User",
			Email:       "test@example.com",
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/users", reqBody, "valid-token")
		w := httptest.NewRecorder()

		testCreateUser(w, req, mockAuth)

		assert.Equal(t, http.StatusCreated, w.Code)

		var user models.User
		testutils.ParseJSONResponse(t, w, &user)

		assert.Equal(t, "firebase-uid-123", user.FirebaseUID)
		assert.Equal(t, "Test User", user.Name)
		assert.Equal(t, "test@example.com", user.Email)
		assert.NotZero(t, user.ID)
	})

	t.Run("rejects missing authorization", func(t *testing.T) {
		reqBody := CreateUserRequest{
			FirebaseUID: "firebase-uid-456",
			Name:        "Test User 2",
			Email:       "test2@example.com",
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/users", reqBody, "")
		w := httptest.NewRecorder()

		testCreateUser(w, req, mockAuth)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("rejects non-POST methods", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/users", nil)
		w := httptest.NewRecorder()

		testCreateUser(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestGetUser(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "users")

	mockAuth := &testutils.MockFirebaseAuth{}
	testUser := testutils.CreateTestUser(t, pool, "firebase-uid-get-test")

	t.Run("successfully retrieves user", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		req := testutils.MakeRequest(t, http.MethodGet, "/api/users", nil, "valid-token")
		w := httptest.NewRecorder()

		testGetUser(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)

		var user models.User
		testutils.ParseJSONResponse(t, w, &user)

		assert.Equal(t, testUser.ID, user.ID)
		assert.Equal(t, testUser.FirebaseUID, user.FirebaseUID)
	})

	t.Run("rejects missing authorization", func(t *testing.T) {
		req := testutils.MakeRequest(t, http.MethodGet, "/api/users", nil, "")
		w := httptest.NewRecorder()

		testGetUser(w, req, mockAuth)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("rejects non-GET methods", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/users", nil)
		w := httptest.NewRecorder()

		testGetUser(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestUpdateUser(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "users")

	mockAuth := &testutils.MockFirebaseAuth{}
	testUser := testutils.CreateTestUser(t, pool, "firebase-uid-update-test")

	t.Run("successfully updates user name", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		reqBody := UpdateUserRequest{
			Name: "Updated Name",
		}

		req := testutils.MakeRequest(t, http.MethodPut, "/api/users", reqBody, "valid-token")
		w := httptest.NewRecorder()

		testUpdateUser(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)

		var user models.User
		testutils.ParseJSONResponse(t, w, &user)

		assert.Equal(t, "Updated Name", user.Name)
		assert.Equal(t, testUser.ID, user.ID)
	})

	t.Run("rejects missing authorization", func(t *testing.T) {
		reqBody := UpdateUserRequest{
			Name: "New Name",
		}

		req := testutils.MakeRequest(t, http.MethodPut, "/api/users", reqBody, "")
		w := httptest.NewRecorder()

		testUpdateUser(w, req, mockAuth)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("rejects non-PUT methods", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/users", nil)
		w := httptest.NewRecorder()

		testUpdateUser(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestDeleteUser(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "users")

	mockAuth := &testutils.MockFirebaseAuth{}

	t.Run("successfully deletes user", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-uid-delete-test")

		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		deleteUserCalled := false
		mockAuth.DeleteUserFunc = func(ctx context.Context, uid string) error {
			deleteUserCalled = true
			assert.Equal(t, testUser.FirebaseUID, uid)
			return nil
		}

		req := testutils.MakeRequest(t, http.MethodDelete, "/api/users", nil, "valid-token")
		w := httptest.NewRecorder()

		testDeleteUser(w, req, mockAuth)

		assert.Equal(t, http.StatusNoContent, w.Code)
		assert.True(t, deleteUserCalled, "DeleteUser should have been called on Firebase Auth")

		// Verify user was deleted from database
		deletedUser, err := models.GetUserByFirebaseUID(testUser.FirebaseUID)
		if err != nil {
			// Some implementations return an error for not found
			assert.Contains(t, err.Error(), "no rows")
		} else {
			// Others return nil
			assert.Nil(t, deletedUser)
		}
	})

	t.Run("rejects missing authorization", func(t *testing.T) {
		req := testutils.MakeRequest(t, http.MethodDelete, "/api/users", nil, "")
		w := httptest.NewRecorder()

		testDeleteUser(w, req, mockAuth)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("rejects non-DELETE methods", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/users", nil)
		w := httptest.NewRecorder()

		testDeleteUser(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}
