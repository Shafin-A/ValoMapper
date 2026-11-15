package models

import (
	"context"
	"testing"
	"time"

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
			FirebaseUID:   strPtr("test-uid-123"),
			Email:         strPtr("test@example.com"),
			Name:          strPtr("Test User"),
			EmailVerified: true,
			TourCompleted: true,
		}

		err := user.Save()
		require.NoError(t, err)
		assert.NotZero(t, user.ID)
		assert.NotZero(t, user.CreatedAt)
		assert.NotZero(t, user.UpdatedAt)
		assert.Equal(t, "test-uid-123", *user.FirebaseUID)
		assert.Equal(t, "test@example.com", *user.Email)
		assert.Equal(t, strPtr("Test User"), user.Name)
		assert.True(t, user.EmailVerified)
		assert.True(t, user.TourCompleted)
	})

	t.Run("handles duplicate firebase_uid with ON CONFLICT", func(t *testing.T) {
		truncateTables(t, pool, "users")

		user1 := &User{
			FirebaseUID:   strPtr("duplicate-uid"),
			Email:         strPtr("first@example.com"),
			Name:          strPtr("First User"),
			EmailVerified: true,
		}
		err := user1.Save()
		require.NoError(t, err)
		firstID := user1.ID

		user2 := &User{
			FirebaseUID:   strPtr("duplicate-uid"),
			Email:         strPtr("second@example.com"),
			Name:          strPtr("Second User"),
			EmailVerified: false,
		}
		err = user2.Save()
		require.NoError(t, err)

		assert.Equal(t, firstID, user2.ID)
		assert.Equal(t, "first@example.com", *user2.Email)
		assert.Equal(t, strPtr("First User"), user2.Name)
	})

	t.Run("creates user with unverified email", func(t *testing.T) {
		truncateTables(t, pool, "users")

		user := &User{
			FirebaseUID:   strPtr("unverified-uid"),
			Email:         strPtr("unverified@example.com"),
			Name:          strPtr("Unverified User"),
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

		user := &User{
			FirebaseUID:   strPtr("update-test-uid"),
			Email:         strPtr("old@example.com"),
			Name:          strPtr("Old Name"),
			EmailVerified: false,
			TourCompleted: false,
		}
		err := user.Save()
		require.NoError(t, err)

		originalUpdatedAt := user.UpdatedAt

		user.Email = strPtr("new@example.com")
		user.Name = strPtr("New Name")
		user.EmailVerified = true
		user.TourCompleted = true

		err = user.Update()
		require.NoError(t, err)
		assert.True(t, user.UpdatedAt.After(originalUpdatedAt))

		loaded := &User{FirebaseUID: strPtr("update-test-uid")}
		err = loaded.LoadByFirebaseUID()
		require.NoError(t, err)
		assert.Equal(t, "new@example.com", *loaded.Email)
		assert.Equal(t, strPtr("New Name"), loaded.Name)
		assert.True(t, loaded.EmailVerified)
		assert.True(t, loaded.TourCompleted)
	})

	t.Run("returns error for non-existent user", func(t *testing.T) {
		truncateTables(t, pool, "users")

		user := &User{
			FirebaseUID:   strPtr("non-existent-uid"),
			Email:         strPtr("test@example.com"),
			Name:          strPtr("Test"),
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

		user := &User{
			FirebaseUID:   strPtr("delete-test-uid"),
			Email:         strPtr("delete@example.com"),
			Name:          strPtr("Delete User"),
			EmailVerified: true,
		}
		err := user.Save()
		require.NoError(t, err)

		err = user.Delete()
		require.NoError(t, err)

		loaded := &User{FirebaseUID: strPtr("delete-test-uid")}
		err = loaded.LoadByFirebaseUID()
		assert.Error(t, err)
	})

	t.Run("does not error when deleting non-existent user", func(t *testing.T) {
		truncateTables(t, pool, "users")

		user := &User{
			FirebaseUID: strPtr("non-existent-delete-uid"),
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

		created := &User{
			FirebaseUID:   strPtr("load-test-uid"),
			Email:         strPtr("load@example.com"),
			Name:          strPtr("Load User"),
			EmailVerified: true,
		}
		err := created.Save()
		require.NoError(t, err)

		loaded := &User{FirebaseUID: strPtr("load-test-uid")}
		err = loaded.LoadByFirebaseUID()
		require.NoError(t, err)

		assert.Equal(t, created.ID, loaded.ID)
		assert.Equal(t, "load@example.com", *loaded.Email)
		assert.Equal(t, strPtr("Load User"), loaded.Name)
		assert.True(t, loaded.EmailVerified)
		assert.NotZero(t, loaded.CreatedAt)
		assert.NotZero(t, loaded.UpdatedAt)
	})

	t.Run("returns error for non-existent user", func(t *testing.T) {
		truncateTables(t, pool, "users")

		user := &User{FirebaseUID: strPtr("non-existent-load-uid")}
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

		created := &User{
			FirebaseUID:   strPtr("get-test-uid"),
			Email:         strPtr("get@example.com"),
			Name:          strPtr("Get User"),
			EmailVerified: true,
		}
		err := created.Save()
		require.NoError(t, err)

		user, err := GetUserByFirebaseUID("get-test-uid")
		require.NoError(t, err)
		require.NotNil(t, user)

		assert.Equal(t, created.ID, user.ID)
		assert.Equal(t, "get@example.com", *user.Email)
		assert.Equal(t, strPtr("Get User"), user.Name)
		assert.True(t, user.EmailVerified)
	})

	t.Run("returns nil when user not found", func(t *testing.T) {
		truncateTables(t, pool, "users")

		user, err := GetUserByFirebaseUID("non-existent-get-uid")
		require.NoError(t, err)
		assert.Nil(t, user)
	})
}

func TestGetUserByFirebaseUID_StackAccess(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)
	truncateTables(t, pool, "stack_members", "users")

	owner := &User{
		FirebaseUID:   strPtr("stack-owner"),
		Email:         strPtr("owner@example.com"),
		EmailVerified: true,
	}
	require.NoError(t, owner.Save())

	member := &User{
		FirebaseUID:   strPtr("stack-member"),
		Email:         strPtr("member@example.com"),
		EmailVerified: true,
	}
	require.NoError(t, member.Save())

	endedAt := time.Now().Add(30 * 24 * time.Hour).UTC()
	_, err := pool.Exec(context.Background(), `
		UPDATE users
		SET is_subscribed = TRUE,
		    subscription_plan = 'stack',
		    subscription_ended_at = $2
		WHERE id = $1`,
		owner.ID, endedAt)
	require.NoError(t, err)

	joinedAt := time.Now().Add(-time.Hour).UTC()
	_, err = pool.Exec(context.Background(), `
		INSERT INTO stack_members (owner_user_id, member_user_id, status, joined_at)
		VALUES ($1, $2, 'active', $3)`,
		owner.ID, member.ID, joinedAt)
	require.NoError(t, err)

	loaded, err := GetUserByFirebaseUID("stack-member")
	require.NoError(t, err)
	require.NotNil(t, loaded)

	assert.True(t, loaded.IsSubscribed)
	require.NotNil(t, loaded.SubscriptionPlan)
	assert.Equal(t, "stack", *loaded.SubscriptionPlan)
	require.NotNil(t, loaded.SubscriptionStartedAt)
	assert.WithinDuration(t, joinedAt, *loaded.SubscriptionStartedAt, time.Second)
	require.NotNil(t, loaded.SubscriptionEndedAt)
	assert.WithinDuration(t, endedAt, *loaded.SubscriptionEndedAt, time.Second)
}
