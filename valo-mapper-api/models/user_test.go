package models

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUserSave(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("creates new user successfully", func(t *testing.T) {
		truncateTables(t, pool, "users")

		user := &User{
			FirebaseUID:   "test-uid-123",
			Email:         "test@example.com",
			Name:          "Test User",
			EmailVerified: true,
			TourCompleted: true,
		}

		err := user.Save()
		require.NoError(t, err)
		assert.NotZero(t, user.ID)
		assert.NotZero(t, user.CreatedAt)
		assert.NotZero(t, user.UpdatedAt)
		assert.Equal(t, "test-uid-123", user.FirebaseUID)
		assert.Equal(t, "test@example.com", user.Email)
		assert.Equal(t, "Test User", user.Name)
		assert.True(t, user.EmailVerified)
		assert.True(t, user.TourCompleted)
	})

	t.Run("handles duplicate firebase_uid with ON CONFLICT", func(t *testing.T) {
		truncateTables(t, pool, "users")

		// Create first user
		user1 := &User{
			FirebaseUID:   "duplicate-uid",
			Email:         "first@example.com",
			Name:          "First User",
			EmailVerified: true,
		}
		err := user1.Save()
		require.NoError(t, err)
		firstID := user1.ID

		// Try to create second user with same UID
		user2 := &User{
			FirebaseUID:   "duplicate-uid",
			Email:         "second@example.com",
			Name:          "Second User",
			EmailVerified: false,
		}
		err = user2.Save()
		require.NoError(t, err)

		// Should load existing user data
		assert.Equal(t, firstID, user2.ID)
		assert.Equal(t, "first@example.com", user2.Email)
		assert.Equal(t, "First User", user2.Name)
	})

	t.Run("creates user with unverified email", func(t *testing.T) {
		truncateTables(t, pool, "users")

		user := &User{
			FirebaseUID:   "unverified-uid",
			Email:         "unverified@example.com",
			Name:          "Unverified User",
			EmailVerified: false,
		}

		err := user.Save()
		require.NoError(t, err)
		assert.NotZero(t, user.ID)
		assert.False(t, user.EmailVerified)
	})
}

func TestUserUpdate(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("updates user fields successfully", func(t *testing.T) {
		truncateTables(t, pool, "users")

		// Create user
		user := &User{
			FirebaseUID:   "update-test-uid",
			Email:         "old@example.com",
			Name:          "Old Name",
			EmailVerified: false,
			TourCompleted: false,
		}
		err := user.Save()
		require.NoError(t, err)

		originalUpdatedAt := user.UpdatedAt

		// Update user
		user.Email = "new@example.com"
		user.Name = "New Name"
		user.EmailVerified = true
		user.TourCompleted = true

		err = user.Update()
		require.NoError(t, err)
		assert.True(t, user.UpdatedAt.After(originalUpdatedAt))

		// Verify changes persisted
		loaded := &User{FirebaseUID: "update-test-uid"}
		err = loaded.LoadByFirebaseUID()
		require.NoError(t, err)
		assert.Equal(t, "new@example.com", loaded.Email)
		assert.Equal(t, "New Name", loaded.Name)
		assert.True(t, loaded.EmailVerified)
		assert.True(t, loaded.TourCompleted)
	})

	t.Run("returns error for non-existent user", func(t *testing.T) {
		truncateTables(t, pool, "users")

		user := &User{
			FirebaseUID:   "non-existent-uid",
			Email:         "test@example.com",
			Name:          "Test",
			EmailVerified: false,
		}

		err := user.Update()
		assert.Error(t, err)
	})
}

func TestUserDelete(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("deletes user successfully", func(t *testing.T) {
		truncateTables(t, pool, "users")

		// Create user
		user := &User{
			FirebaseUID:   "delete-test-uid",
			Email:         "delete@example.com",
			Name:          "Delete User",
			EmailVerified: true,
		}
		err := user.Save()
		require.NoError(t, err)

		// Delete user
		err = user.Delete()
		require.NoError(t, err)

		// Verify user is gone
		loaded := &User{FirebaseUID: "delete-test-uid"}
		err = loaded.LoadByFirebaseUID()
		assert.Error(t, err)
	})

	t.Run("does not error when deleting non-existent user", func(t *testing.T) {
		truncateTables(t, pool, "users")

		user := &User{
			FirebaseUID: "non-existent-delete-uid",
		}

		err := user.Delete()
		assert.NoError(t, err)
	})
}

func TestUserLoadByFirebaseUID(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("loads existing user successfully", func(t *testing.T) {
		truncateTables(t, pool, "users")

		// Create user
		created := &User{
			FirebaseUID:   "load-test-uid",
			Email:         "load@example.com",
			Name:          "Load User",
			EmailVerified: true,
		}
		err := created.Save()
		require.NoError(t, err)

		// Load user
		loaded := &User{FirebaseUID: "load-test-uid"}
		err = loaded.LoadByFirebaseUID()
		require.NoError(t, err)

		assert.Equal(t, created.ID, loaded.ID)
		assert.Equal(t, "load@example.com", loaded.Email)
		assert.Equal(t, "Load User", loaded.Name)
		assert.True(t, loaded.EmailVerified)
		assert.NotZero(t, loaded.CreatedAt)
		assert.NotZero(t, loaded.UpdatedAt)
	})

	t.Run("returns error for non-existent user", func(t *testing.T) {
		truncateTables(t, pool, "users")

		user := &User{FirebaseUID: "non-existent-load-uid"}
		err := user.LoadByFirebaseUID()
		assert.Error(t, err)
	})
}

func TestGetUserByFirebaseUID(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("returns user when found", func(t *testing.T) {
		truncateTables(t, pool, "users")

		// Create user
		created := &User{
			FirebaseUID:   "get-test-uid",
			Email:         "get@example.com",
			Name:          "Get User",
			EmailVerified: true,
		}
		err := created.Save()
		require.NoError(t, err)

		// Get user
		user, err := GetUserByFirebaseUID("get-test-uid")
		require.NoError(t, err)
		require.NotNil(t, user)

		assert.Equal(t, created.ID, user.ID)
		assert.Equal(t, "get@example.com", user.Email)
		assert.Equal(t, "Get User", user.Name)
		assert.True(t, user.EmailVerified)
	})

	t.Run("returns nil when user not found", func(t *testing.T) {
		truncateTables(t, pool, "users")

		user, err := GetUserByFirebaseUID("non-existent-get-uid")
		require.NoError(t, err)
		assert.Nil(t, user)
	})
}
