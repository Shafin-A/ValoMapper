package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
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

		assert.Equal(t, "firebase-uid-123", *user.FirebaseUID)
		assert.Equal(t, strPtr("Test User"), user.Name)
		assert.Equal(t, "test@example.com", *user.Email)
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
			return &auth.Token{UID: *testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: *testUser.Email},
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
			return &auth.Token{UID: *testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: *testUser.Email},
				EmailVerified: true,
			}, nil
		}

		reqBody := UpdateUserRequest{
			Name:          strPtr("Updated Name"),
			TourCompleted: ptrBool(true),
		}

		req := testutils.MakeRequest(t, http.MethodPut, "/api/users", reqBody, "valid-token")
		w := httptest.NewRecorder()

		UpdateUser(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)

		var user models.User
		testutils.ParseJSONResponse(t, w, &user)

		assert.Equal(t, strPtr("Updated Name"), user.Name)
		assert.Equal(t, testUser.ID, user.ID)
		assert.True(t, user.TourCompleted)
	})

	t.Run("rejects missing authorization", func(t *testing.T) {
		reqBody := UpdateUserRequest{
			Name: strPtr("New Name"),
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
			return &auth.Token{UID: *testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: *testUser.Email},
				EmailVerified: true,
			}, nil
		}

		deleteUserCalled := false
		mockAuth.DeleteUserFunc = func(ctx context.Context, uid string) error {
			deleteUserCalled = true
			assert.Equal(t, *testUser.FirebaseUID, uid)
			return nil
		}

		req := testutils.MakeRequest(t, http.MethodDelete, "/api/users", nil, "valid-token")
		w := httptest.NewRecorder()

		DeleteUser(w, req, mockAuth)

		assert.Equal(t, http.StatusNoContent, w.Code)
		assert.True(t, deleteUserCalled, "DeleteUser should have been called on Firebase Auth")

		deletedUser, err := models.GetUserByFirebaseUID(*testUser.FirebaseUID)
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

func TestUpdateUserSubscription(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "users")

	const internalKey = "test-internal-key"
	originalKey, hadOriginal := os.LookupEnv("INTERNAL_API_KEY")
	_ = os.Setenv("INTERNAL_API_KEY", internalKey)
	defer func() {
		if hadOriginal {
			_ = os.Setenv("INTERNAL_API_KEY", originalKey)
			return
		}
		_ = os.Unsetenv("INTERNAL_API_KEY")
	}()

	mockAuth := &testutils.MockFirebaseAuth{}

	t.Run("downgrades user and sets subscription ended timestamp", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-sub-uid-1")
		_, err := pool.Exec(context.Background(), `UPDATE users SET is_subscribed = TRUE, subscription_ended_at = NULL WHERE id = $1`, testUser.ID)
		assert.NoError(t, err)

		reqBody := UpdateUserSubscriptionRequest{
			UserID:       &testUser.ID,
			IsSubscribed: ptrBool(false),
		}

		req := testutils.MakeRequest(t, http.MethodPatch, "/api/users/subscription", reqBody, "")
		req.Header.Set("X-Internal-API-Key", internalKey)
		w := httptest.NewRecorder()

		UpdateUserSubscription(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)

		var user models.User
		testutils.ParseJSONResponse(t, w, &user)
		assert.Equal(t, testUser.ID, user.ID)
		assert.False(t, user.IsSubscribed)
		assert.NotNil(t, user.SubscriptionEndedAt)
	})

	t.Run("upgrades user and clears subscription ended timestamp", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-sub-uid-2")
		_, err := pool.Exec(context.Background(), `UPDATE users SET is_subscribed = FALSE, subscription_ended_at = NOW() WHERE id = $1`, testUser.ID)
		assert.NoError(t, err)

		reqBody := UpdateUserSubscriptionRequest{
			FirebaseUID:  testUser.FirebaseUID,
			IsSubscribed: ptrBool(true),
		}

		req := testutils.MakeRequest(t, http.MethodPatch, "/api/users/subscription", reqBody, "")
		req.Header.Set("X-Internal-API-Key", internalKey)
		w := httptest.NewRecorder()

		UpdateUserSubscription(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)

		var user models.User
		testutils.ParseJSONResponse(t, w, &user)
		assert.Equal(t, testUser.ID, user.ID)
		assert.True(t, user.IsSubscribed)
		assert.Nil(t, user.SubscriptionEndedAt)
	})

	t.Run("rejects missing internal api key", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-sub-uid-3")
		reqBody := UpdateUserSubscriptionRequest{
			UserID:       &testUser.ID,
			IsSubscribed: ptrBool(false),
		}

		req := testutils.MakeRequest(t, http.MethodPatch, "/api/users/subscription", reqBody, "")
		w := httptest.NewRecorder()

		UpdateUserSubscription(w, req, mockAuth)

		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("rejects request without isSubscribed", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-sub-uid-4")
		reqBody := UpdateUserSubscriptionRequest{
			UserID: &testUser.ID,
		}

		req := testutils.MakeRequest(t, http.MethodPatch, "/api/users/subscription", reqBody, "")
		req.Header.Set("X-Internal-API-Key", internalKey)
		w := httptest.NewRecorder()

		UpdateUserSubscription(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("rejects when both userId and firebaseUid are provided", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-sub-uid-5")
		reqBody := UpdateUserSubscriptionRequest{
			UserID:       &testUser.ID,
			FirebaseUID:  testUser.FirebaseUID,
			IsSubscribed: ptrBool(false),
		}

		req := testutils.MakeRequest(t, http.MethodPatch, "/api/users/subscription", reqBody, "")
		req.Header.Set("X-Internal-API-Key", internalKey)
		w := httptest.NewRecorder()

		UpdateUserSubscription(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}
