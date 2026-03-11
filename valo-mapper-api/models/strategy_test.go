package models

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStrategySave(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("creates strategy successfully without folder", func(t *testing.T) {
		truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

		user := createTestUser(t, pool, "strategy-user-1")
		lobby := createTestLobby(t, pool, "TEST123")

		strategy := &Strategy{
			UserID:    user.ID,
			LobbyCode: lobby.Code,
			Name:      "Test Strategy",
			FolderID:  nil,
		}

		err := strategy.Save()
		require.NoError(t, err)
		assert.NotZero(t, strategy.ID)
		assert.NotZero(t, strategy.CreatedAt)
		assert.NotZero(t, strategy.UpdatedAt)
		assert.Equal(t, user.ID, strategy.UserID)
		assert.Equal(t, "TEST123", strategy.LobbyCode)
		assert.Equal(t, "Test Strategy", strategy.Name)
		assert.Nil(t, strategy.FolderID)
	})

	t.Run("creates strategy with folder", func(t *testing.T) {
		truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

		user := createTestUser(t, pool, "strategy-user-2")
		lobby := createTestLobby(t, pool, "TEST456")

		folder := &Folder{
			UserID: user.ID,
			Name:   "Test Folder",
		}
		err := folder.Save()
		require.NoError(t, err)

		strategy := &Strategy{
			UserID:    user.ID,
			LobbyCode: lobby.Code,
			Name:      "Strategy in Folder",
			FolderID:  &folder.ID,
		}

		err = strategy.Save()
		require.NoError(t, err)
		assert.NotZero(t, strategy.ID)
		assert.NotNil(t, strategy.FolderID)
		assert.Equal(t, folder.ID, *strategy.FolderID)
	})

	t.Run("fails with invalid user_id", func(t *testing.T) {
		truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

		lobby := createTestLobby(t, pool, "TEST789")

		strategy := &Strategy{
			UserID:    99999,
			LobbyCode: lobby.Code,
			Name:      "Invalid Strategy",
		}

		err := strategy.Save()
		assert.Error(t, err)
	})

	t.Run("fails with invalid folder_id", func(t *testing.T) {
		truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

		user := createTestUser(t, pool, "strategy-user-3")
		lobby := createTestLobby(t, pool, "TEST999")
		invalidFolderID := 99999

		strategy := &Strategy{
			UserID:    user.ID,
			LobbyCode: lobby.Code,
			Name:      "Invalid Folder Strategy",
			FolderID:  &invalidFolderID,
		}

		err := strategy.Save()
		assert.Error(t, err)
	})
}

func TestStrategyUpdate(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("updates strategy name and folder", func(t *testing.T) {
		truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

		user := createTestUser(t, pool, "update-user")
		lobby := createTestLobby(t, pool, "UPDATE123")

		strategy := &Strategy{
			UserID:    user.ID,
			LobbyCode: lobby.Code,
			Name:      "Original Name",
		}
		err := strategy.Save()
		require.NoError(t, err)

		originalUpdatedAt := strategy.UpdatedAt

		folder := &Folder{
			UserID: user.ID,
			Name:   "New Folder",
		}
		err = folder.Save()
		require.NoError(t, err)

		strategy.Name = "Updated Name"
		strategy.FolderID = &folder.ID

		err = strategy.Update()
		require.NoError(t, err)
		assert.True(t, strategy.UpdatedAt.After(originalUpdatedAt))

		loaded, err := GetStrategyByID(strategy.ID)
		require.NoError(t, err)
		require.NotNil(t, loaded)
		assert.Equal(t, "Updated Name", loaded.Name)
		assert.NotNil(t, loaded.FolderID)
		assert.Equal(t, folder.ID, *loaded.FolderID)
	})

	t.Run("can set folder to null", func(t *testing.T) {
		truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

		user := createTestUser(t, pool, "null-folder-user")
		lobby := createTestLobby(t, pool, "NULL123")

		folder := &Folder{
			UserID: user.ID,
			Name:   "Remove Me",
		}
		err := folder.Save()
		require.NoError(t, err)

		strategy := &Strategy{
			UserID:    user.ID,
			LobbyCode: lobby.Code,
			Name:      "Strategy",
			FolderID:  &folder.ID,
		}
		err = strategy.Save()
		require.NoError(t, err)

		strategy.FolderID = nil
		err = strategy.Update()
		require.NoError(t, err)

		loaded, err := GetStrategyByID(strategy.ID)
		require.NoError(t, err)
		assert.Nil(t, loaded.FolderID)
	})

	t.Run("returns error for non-existent strategy", func(t *testing.T) {
		truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

		strategy := &Strategy{
			ID:   99999,
			Name: "Non-existent",
		}

		err := strategy.Update()
		assert.Error(t, err)
	})
}

func TestStrategyDelete(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("deletes strategy successfully", func(t *testing.T) {
		truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

		user := createTestUser(t, pool, "delete-user")
		lobby := createTestLobby(t, pool, "DELETE123")

		strategy := &Strategy{
			UserID:    user.ID,
			LobbyCode: lobby.Code,
			Name:      "Delete Me",
		}
		err := strategy.Save()
		require.NoError(t, err)

		err = strategy.Delete()
		require.NoError(t, err)

		loaded, err := GetStrategyByID(strategy.ID)
		require.NoError(t, err)
		assert.Nil(t, loaded)
	})

	t.Run("does not error when deleting non-existent strategy", func(t *testing.T) {
		truncateTables(t, pool, "strategies")

		strategy := &Strategy{
			ID: 99999,
		}

		err := strategy.Delete()
		assert.NoError(t, err)
	})
}

func TestGetStrategyByID(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("returns strategy when found", func(t *testing.T) {
		truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

		user := createTestUser(t, pool, "get-user")
		lobby := createTestLobby(t, pool, "GET123")

		created := &Strategy{
			UserID:    user.ID,
			LobbyCode: lobby.Code,
			Name:      "Get Me",
		}
		err := created.Save()
		require.NoError(t, err)

		strategy, err := GetStrategyByID(created.ID)
		require.NoError(t, err)
		require.NotNil(t, strategy)

		assert.Equal(t, created.ID, strategy.ID)
		assert.Equal(t, user.ID, strategy.UserID)
		assert.Equal(t, "GET123", strategy.LobbyCode)
		assert.Equal(t, "Get Me", strategy.Name)
		assert.NotZero(t, strategy.CreatedAt)
	})

	t.Run("returns nil when not found", func(t *testing.T) {
		truncateTables(t, pool, "strategies")

		strategy, err := GetStrategyByID(99999)
		require.NoError(t, err)
		assert.Nil(t, strategy)
	})
}

func TestGetStrategiesByUserID(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("returns all strategies for user", func(t *testing.T) {
		truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

		user := createTestUser(t, pool, "list-user")

		for i := 1; i <= 3; i++ {
			lobbyCode := "LIST" + string(rune('0'+i))
			createTestLobby(t, pool, lobbyCode)
			strategy := &Strategy{
				UserID:    user.ID,
				LobbyCode: lobbyCode,
				Name:      "Strategy " + string(rune('0'+i)),
			}
			err := strategy.Save()
			require.NoError(t, err)
		}

		strategies, err := GetStrategiesByUserID(user.ID)
		require.NoError(t, err)
		assert.Len(t, strategies, 3)

		for i := 0; i < len(strategies)-1; i++ {
			assert.True(t, strategies[i].CreatedAt.After(strategies[i+1].CreatedAt) ||
				strategies[i].CreatedAt.Equal(strategies[i+1].CreatedAt))
		}
	})

	t.Run("returns empty slice when user has no strategies", func(t *testing.T) {
		truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

		user := createTestUser(t, pool, "empty-user")

		strategies, err := GetStrategiesByUserID(user.ID)
		require.NoError(t, err)
		assert.Empty(t, strategies)
	})

	t.Run("does not return other users' strategies", func(t *testing.T) {
		truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

		user1 := createTestUser(t, pool, "user1")
		user2 := createTestUser(t, pool, "user2")
		lobby1 := createTestLobby(t, pool, "USER1")
		lobby2 := createTestLobby(t, pool, "USER2")

		strategy1 := &Strategy{
			UserID:    user1.ID,
			LobbyCode: lobby1.Code,
			Name:      "User 1 Strategy",
		}
		err := strategy1.Save()
		require.NoError(t, err)

		strategy2 := &Strategy{
			UserID:    user2.ID,
			LobbyCode: lobby2.Code,
			Name:      "User 2 Strategy",
		}
		err = strategy2.Save()
		require.NoError(t, err)

		strategies, err := GetStrategiesByUserID(user1.ID)
		require.NoError(t, err)
		assert.Len(t, strategies, 1)
		assert.Equal(t, "User 1 Strategy", strategies[0].Name)
	})
}

func TestGetStrategiesByFolderID(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("returns strategies in folder", func(t *testing.T) {
		truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

		user := createTestUser(t, pool, "folder-user")

		folder := &Folder{
			UserID: user.ID,
			Name:   "Test Folder",
		}
		err := folder.Save()
		require.NoError(t, err)

		for i := 1; i <= 2; i++ {
			lobbyCode := "FOLDER" + string(rune('0'+i))
			createTestLobby(t, pool, lobbyCode)
			strategy := &Strategy{
				UserID:    user.ID,
				LobbyCode: lobbyCode,
				Name:      "Folder Strategy " + string(rune('0'+i)),
				FolderID:  &folder.ID,
			}
			err := strategy.Save()
			require.NoError(t, err)
		}

		lobbyOutside := createTestLobby(t, pool, "OUTSIDE")
		strategyOutside := &Strategy{
			UserID:    user.ID,
			LobbyCode: lobbyOutside.Code,
			Name:      "Outside Folder",
		}
		err = strategyOutside.Save()
		require.NoError(t, err)

		strategies, err := GetStrategiesByFolderID(user.ID, folder.ID)
		require.NoError(t, err)
		assert.Len(t, strategies, 2)

		for _, s := range strategies {
			assert.NotNil(t, s.FolderID)
			assert.Equal(t, folder.ID, *s.FolderID)
		}
	})

	t.Run("returns empty slice for empty folder", func(t *testing.T) {
		truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

		user := createTestUser(t, pool, "empty-folder-user")

		folder := &Folder{
			UserID: user.ID,
			Name:   "Empty Folder",
		}
		err := folder.Save()
		require.NoError(t, err)

		strategies, err := GetStrategiesByFolderID(user.ID, folder.ID)
		require.NoError(t, err)
		assert.Empty(t, strategies)
	})
}

func TestCountStrategiesByUserID(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("returns total strategies for user", func(t *testing.T) {
		truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

		user := createTestUser(t, pool, "count-user")

		for i := 1; i <= 3; i++ {
			lobbyCode := "COUNT" + string(rune('0'+i))
			createTestLobby(t, pool, lobbyCode)
			strategy := &Strategy{
				UserID:    user.ID,
				LobbyCode: lobbyCode,
				Name:      "Count Strategy " + string(rune('0'+i)),
			}
			err := strategy.Save()
			require.NoError(t, err)
		}

		count, err := CountStrategiesByUserID(user.ID)
		require.NoError(t, err)
		assert.Equal(t, 3, count)
	})

	t.Run("returns zero when user has no strategies", func(t *testing.T) {
		truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

		user := createTestUser(t, pool, "count-empty-user")

		count, err := CountStrategiesByUserID(user.ID)
		require.NoError(t, err)
		assert.Equal(t, 0, count)
	})
}

func TestDeleteExcessStrategiesForUser(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("deletes strategies beyond keep count keeping most recent", func(t *testing.T) {
		truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

		user := createTestUser(t, pool, "excess-user-1")
		var savedIDs []int
		for i := 1; i <= 5; i++ {
			lobbyCode := fmt.Sprintf("EXC%d", i)
			createTestLobby(t, pool, lobbyCode)
			strategy := &Strategy{
				UserID:    user.ID,
				LobbyCode: lobbyCode,
				Name:      fmt.Sprintf("Strategy %d", i),
			}
			err := strategy.Save()
			require.NoError(t, err)
			savedIDs = append(savedIDs, strategy.ID)
		}

		deleted, err := DeleteExcessStrategiesForUser(user.ID, 3)
		require.NoError(t, err)
		assert.Equal(t, int64(2), deleted)

		remaining, err := GetStrategiesByUserID(user.ID)
		require.NoError(t, err)
		assert.Len(t, remaining, 3)

		// The 3 most recently created (highest IDs) must be kept
		remainingIDs := make(map[int]bool, len(remaining))
		for _, s := range remaining {
			remainingIDs[s.ID] = true
		}
		assert.True(t, remainingIDs[savedIDs[4]], "5th created should be kept")
		assert.True(t, remainingIDs[savedIDs[3]], "4th created should be kept")
		assert.True(t, remainingIDs[savedIDs[2]], "3rd created should be kept")
		assert.False(t, remainingIDs[savedIDs[1]], "2nd created should be deleted")
		assert.False(t, remainingIDs[savedIDs[0]], "1st created should be deleted")
	})

	t.Run("does nothing when user has exactly keep count strategies", func(t *testing.T) {
		truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

		user := createTestUser(t, pool, "excess-user-2")
		for i := 1; i <= 3; i++ {
			lobbyCode := fmt.Sprintf("FEW%d", i)
			createTestLobby(t, pool, lobbyCode)
			strategy := &Strategy{
				UserID:    user.ID,
				LobbyCode: lobbyCode,
				Name:      fmt.Sprintf("Strategy %d", i),
			}
			err := strategy.Save()
			require.NoError(t, err)
		}

		deleted, err := DeleteExcessStrategiesForUser(user.ID, 3)
		require.NoError(t, err)
		assert.Equal(t, int64(0), deleted)

		remaining, err := GetStrategiesByUserID(user.ID)
		require.NoError(t, err)
		assert.Len(t, remaining, 3)
	})

	t.Run("does nothing when user has no strategies", func(t *testing.T) {
		truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

		user := createTestUser(t, pool, "excess-user-3")

		deleted, err := DeleteExcessStrategiesForUser(user.ID, 3)
		require.NoError(t, err)
		assert.Equal(t, int64(0), deleted)
	})
}
