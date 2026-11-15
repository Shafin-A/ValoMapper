package handlers

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"valo-mapper-api/models"
	"valo-mapper-api/testutils"

	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func ptrBool(value bool) *bool {
	return &value
}

func ptrInt(value int) *int {
	return &value
}

func TestCreateUser(t *testing.T) {
	const firebaseUID = "firebase-uid-123"

	contextUser := func(uid string) *models.User {
		user := newTestAuthenticatedUser()
		user.FirebaseUID = strPtr(uid)
		return user
	}

	t.Run("creates user", func(t *testing.T) {
		useUserRepo(t, &mockUserHandlerRepo{
			saveFn: func(user *models.User) error {
				user.ID = 11
				return nil
			},
		})

		req := requestWithUser(testutils.MakeRequest(t, http.MethodPost, "/api/users", CreateUserRequest{
			FirebaseUID: firebaseUID,
			Name:        "Test User",
			Email:       "test@example.com",
		}, "valid-token"), contextUser(firebaseUID))
		w := httptest.NewRecorder()
		CreateUser(w, req)

		require.Equal(t, http.StatusCreated, w.Code)

		var user models.User
		testutils.ParseJSONResponse(t, w, &user)
		assert.Equal(t, 11, user.ID)
		assert.Equal(t, firebaseUID, *user.FirebaseUID)
		assert.Equal(t, "Test User", *user.Name)
		assert.Equal(t, "test@example.com", *user.Email)
	})

	t.Run("rejects a mismatched firebase uid", func(t *testing.T) {
		useUserRepo(t, &mockUserHandlerRepo{})

		req := requestWithUser(testutils.MakeRequest(t, http.MethodPost, "/api/users", CreateUserRequest{
			FirebaseUID: "other-uid",
			Name:        "Test User",
			Email:       "test@example.com",
		}, "valid-token"), contextUser(firebaseUID))
		w := httptest.NewRecorder()
		CreateUser(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("rejects missing authentication", func(t *testing.T) {
		useUserRepo(t, &mockUserHandlerRepo{})

		req := testutils.MakeRequest(t, http.MethodPost, "/api/users", CreateUserRequest{
			FirebaseUID: firebaseUID,
			Name:        "Test User",
			Email:       "test@example.com",
		}, "")
		w := httptest.NewRecorder()
		CreateUser(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("rejects duplicate user", func(t *testing.T) {
		useUserRepo(t, &mockUserHandlerRepo{
			saveFn: func(user *models.User) error {
				return &pgconn.PgError{Code: pgerrcode.UniqueViolation}
			},
		})

		req := requestWithUser(testutils.MakeRequest(t, http.MethodPost, "/api/users", CreateUserRequest{
			FirebaseUID: firebaseUID,
			Name:        "Test User",
			Email:       "test@example.com",
		}, "valid-token"), contextUser(firebaseUID))
		w := httptest.NewRecorder()
		CreateUser(w, req)

		assert.Equal(t, http.StatusConflict, w.Code)
	})

	t.Run("rejects missing name", func(t *testing.T) {
		useUserRepo(t, &mockUserHandlerRepo{})

		req := requestWithUser(testutils.MakeRequest(t, http.MethodPost, "/api/users", CreateUserRequest{
			FirebaseUID: firebaseUID,
			Email:       "test@example.com",
		}, "valid-token"), contextUser(firebaseUID))
		w := httptest.NewRecorder()
		CreateUser(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("rejects invalid body", func(t *testing.T) {
		useUserRepo(t, &mockUserHandlerRepo{})

		req := requestWithUser(httptest.NewRequest(http.MethodPost, "/api/users", strings.NewReader("{")), contextUser(firebaseUID))
		w := httptest.NewRecorder()
		CreateUser(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestGetUser(t *testing.T) {
	user := newTestAuthenticatedUser()

	t.Run("returns the authenticated user", func(t *testing.T) {
		req := requestWithUser(httptest.NewRequest(http.MethodGet, "/api/users/me", nil), user)
		w := httptest.NewRecorder()
		GetUser(w, req)

		require.Equal(t, http.StatusOK, w.Code)

		var response models.User
		testutils.ParseJSONResponse(t, w, &response)
		assert.Equal(t, user.ID, response.ID)
		assert.Equal(t, *user.Email, *response.Email)
	})

	t.Run("rejects missing authentication", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/users/me", nil)
		w := httptest.NewRecorder()
		GetUser(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

func TestUpdateUser(t *testing.T) {
	user := newTestAuthenticatedUser()

	t.Run("updates the authenticated user", func(t *testing.T) {
		useUserRepo(t, &mockUserHandlerRepo{
			updateFn: func(updated *models.User) error {
				updated.UpdatedAt = user.CreatedAt
				return nil
			},
		})

		req := requestWithUser(testutils.MakeRequest(t, http.MethodPut, "/api/users/me", UpdateUserRequest{
			Name:          strPtr("New Name"),
			TourCompleted: ptrBool(true),
		}, "valid-token"), user)
		w := httptest.NewRecorder()
		UpdateUser(w, req)

		require.Equal(t, http.StatusOK, w.Code)

		var response models.User
		testutils.ParseJSONResponse(t, w, &response)
		assert.Equal(t, "New Name", *response.Name)
		assert.True(t, response.TourCompleted)
	})

	t.Run("rejects invalid body", func(t *testing.T) {
		useUserRepo(t, &mockUserHandlerRepo{})

		req := requestWithUser(httptest.NewRequest(http.MethodPut, "/api/users/me", strings.NewReader("{")), user)
		w := httptest.NewRecorder()
		UpdateUser(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("returns internal error when the repository fails", func(t *testing.T) {
		useUserRepo(t, &mockUserHandlerRepo{
			updateFn: func(updated *models.User) error { return errors.New("db down") },
		})

		req := requestWithUser(testutils.MakeRequest(t, http.MethodPut, "/api/users/me", UpdateUserRequest{
			Name: strPtr("New Name"),
		}, "valid-token"), user)
		w := httptest.NewRecorder()
		UpdateUser(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})
}

func TestDeleteUser(t *testing.T) {
	user := newTestAuthenticatedUser()
	useFirebaseAuth(t, &testutils.MockFirebaseAuth{})

	t.Run("deletes the authenticated user", func(t *testing.T) {
		deleted := false
		useUserRepo(t, &mockUserHandlerRepo{
			deleteFn: func(deletedUser *models.User) error {
				deleted = true
				return nil
			},
		})

		req := requestWithUser(httptest.NewRequest(http.MethodDelete, "/api/users/me", nil), user)
		w := httptest.NewRecorder()
		DeleteUser(w, req)

		assert.Equal(t, http.StatusNoContent, w.Code)
		assert.True(t, deleted)
	})

	t.Run("returns internal error when the repository fails", func(t *testing.T) {
		useUserRepo(t, &mockUserHandlerRepo{
			deleteFn: func(deletedUser *models.User) error { return errors.New("db down") },
		})

		req := requestWithUser(httptest.NewRequest(http.MethodDelete, "/api/users/me", nil), user)
		w := httptest.NewRecorder()
		DeleteUser(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})
}

func TestUpdateUserSubscription(t *testing.T) {
	user := newTestAuthenticatedUser()

	t.Run("updates subscription", func(t *testing.T) {
		useUserRepo(t, &mockUserHandlerRepo{
			getByIDFn: func(id int) (*models.User, error) { return user, nil },
		})

		req := testutils.MakeRequest(t, http.MethodPatch, "/api/users/subscription", UpdateUserSubscriptionRequest{
			UserID:       ptrInt(user.ID),
			IsSubscribed: ptrBool(true),
		}, "")
		w := httptest.NewRecorder()
		UpdateUserSubscription(w, req)

		require.Equal(t, http.StatusOK, w.Code)

		var response models.User
		testutils.ParseJSONResponse(t, w, &response)
		assert.True(t, response.IsSubscribed)
	})

	t.Run("rejects missing isSubscribed", func(t *testing.T) {
		useUserRepo(t, &mockUserHandlerRepo{})

		req := testutils.MakeRequest(t, http.MethodPatch, "/api/users/subscription", UpdateUserSubscriptionRequest{
			UserID: ptrInt(user.ID),
		}, "")
		w := httptest.NewRecorder()
		UpdateUserSubscription(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("rejects both identifiers", func(t *testing.T) {
		useUserRepo(t, &mockUserHandlerRepo{})

		req := testutils.MakeRequest(t, http.MethodPatch, "/api/users/subscription", UpdateUserSubscriptionRequest{
			UserID:       ptrInt(user.ID),
			FirebaseUID:  user.FirebaseUID,
			IsSubscribed: ptrBool(false),
		}, "")
		w := httptest.NewRecorder()
		UpdateUserSubscription(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("rejects missing identifiers", func(t *testing.T) {
		useUserRepo(t, &mockUserHandlerRepo{})

		req := testutils.MakeRequest(t, http.MethodPatch, "/api/users/subscription", UpdateUserSubscriptionRequest{
			IsSubscribed: ptrBool(false),
		}, "")
		w := httptest.NewRecorder()
		UpdateUserSubscription(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("returns not found", func(t *testing.T) {
		useUserRepo(t, &mockUserHandlerRepo{})

		req := testutils.MakeRequest(t, http.MethodPatch, "/api/users/subscription", UpdateUserSubscriptionRequest{
			UserID:       ptrInt(999),
			IsSubscribed: ptrBool(false),
		}, "")
		w := httptest.NewRecorder()
		UpdateUserSubscription(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})
}
