package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"valo-mapper-api/models"
	"valo-mapper-api/testutils"

	"firebase.google.com/go/v4/auth"
	"github.com/stretchr/testify/assert"
)

func ptrBool(b bool) *bool {
	return &b
}

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

		CreateUser(w, req, mockAuth)

		assert.Equal(t, http.StatusCreated, w.Code)

		var user models.User
		testutils.ParseJSONResponse(t, w, &user)

		assert.Equal(t, "firebase-uid-123", user.FirebaseUID)
		assert.Equal(t, "Test User", user.Name)
		assert.Equal(t, "test@example.com", user.Email)
		assert.NotZero(t, user.ID)
		assert.False(t, user.TourCompleted)
	})

	t.Run("rejects missing authorization", func(t *testing.T) {
		reqBody := CreateUserRequest{
			FirebaseUID: "firebase-uid-456",
			Name:        "Test User 2",
			Email:       "test2@example.com",
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/users", reqBody, "")
		w := httptest.NewRecorder()

		CreateUser(w, req, mockAuth)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("rejects non-POST methods", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/users", nil)
		w := httptest.NewRecorder()

		CreateUser(w, req, mockAuth)

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

		GetUser(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)

		var user models.User
		testutils.ParseJSONResponse(t, w, &user)

		assert.Equal(t, testUser.ID, user.ID)
		assert.Equal(t, testUser.FirebaseUID, user.FirebaseUID)
		assert.False(t, user.TourCompleted)
	})

	t.Run("rejects missing authorization", func(t *testing.T) {
		req := testutils.MakeRequest(t, http.MethodGet, "/api/users", nil, "")
		w := httptest.NewRecorder()

		GetUser(w, req, mockAuth)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("rejects non-GET methods", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/users", nil)
		w := httptest.NewRecorder()

		GetUser(w, req, mockAuth)

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
			Name:          "Updated Name",
			TourCompleted: ptrBool(true),
		}

		req := testutils.MakeRequest(t, http.MethodPut, "/api/users", reqBody, "valid-token")
		w := httptest.NewRecorder()

		UpdateUser(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)

		var user models.User
		testutils.ParseJSONResponse(t, w, &user)

		assert.Equal(t, "Updated Name", user.Name)
		assert.Equal(t, testUser.ID, user.ID)
		assert.True(t, user.TourCompleted)
	})

	t.Run("rejects missing authorization", func(t *testing.T) {
		reqBody := UpdateUserRequest{
			Name: "New Name",
		}

		req := testutils.MakeRequest(t, http.MethodPut, "/api/users", reqBody, "")
		w := httptest.NewRecorder()

		UpdateUser(w, req, mockAuth)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("rejects non-PUT methods", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/users", nil)
		w := httptest.NewRecorder()

		UpdateUser(w, req, mockAuth)

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

		DeleteUser(w, req, mockAuth)

		assert.Equal(t, http.StatusNoContent, w.Code)
		assert.True(t, deleteUserCalled, "DeleteUser should have been called on Firebase Auth")

		deletedUser, err := models.GetUserByFirebaseUID(testUser.FirebaseUID)
		if err != nil {
			assert.Contains(t, err.Error(), "no rows")
		} else {
			assert.Nil(t, deletedUser)
		}
	})

	t.Run("rejects missing authorization", func(t *testing.T) {
		req := testutils.MakeRequest(t, http.MethodDelete, "/api/users", nil, "")
		w := httptest.NewRecorder()

		DeleteUser(w, req, mockAuth)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("rejects non-DELETE methods", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/users", nil)
		w := httptest.NewRecorder()

		DeleteUser(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}
