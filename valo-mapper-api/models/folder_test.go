package models

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFolderSave(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("creates folder successfully without parent", func(t *testing.T) {
		truncateTables(t, pool, "folders", "users")

		user := createTestUser(t, pool, "folder-user-1")

		folder := &Folder{
			UserID:         user.ID,
			Name:           "Test Folder",
			ParentFolderID: nil,
		}

		err := folder.Save()
		require.NoError(t, err)
		assert.NotZero(t, folder.ID)
		assert.NotZero(t, folder.CreatedAt)
		assert.NotZero(t, folder.UpdatedAt)
		assert.Equal(t, user.ID, folder.UserID)
		assert.Equal(t, "Test Folder", folder.Name)
		assert.Nil(t, folder.ParentFolderID)
	})

	t.Run("creates folder with parent folder", func(t *testing.T) {
		truncateTables(t, pool, "folders", "users")

		user := createTestUser(t, pool, "folder-user-2")

		// Create parent folder
		parent := &Folder{
			UserID: user.ID,
			Name:   "Parent Folder",
		}
		err := parent.Save()
		require.NoError(t, err)

		// Create child folder
		child := &Folder{
			UserID:         user.ID,
			Name:           "Child Folder",
			ParentFolderID: &parent.ID,
		}

		err = child.Save()
		require.NoError(t, err)
		assert.NotZero(t, child.ID)
		assert.NotNil(t, child.ParentFolderID)
		assert.Equal(t, parent.ID, *child.ParentFolderID)
	})

	t.Run("fails with invalid user_id", func(t *testing.T) {
		truncateTables(t, pool, "folders", "users")

		folder := &Folder{
			UserID: 99999, // Non-existent user
			Name:   "Invalid Folder",
		}

		err := folder.Save()
		assert.Error(t, err)
	})

	t.Run("fails with invalid parent_folder_id", func(t *testing.T) {
		truncateTables(t, pool, "folders", "users")

		user := createTestUser(t, pool, "folder-user-3")
		invalidParentID := 99999

		folder := &Folder{
			UserID:         user.ID,
			Name:           "Invalid Parent Folder",
			ParentFolderID: &invalidParentID,
		}

		err := folder.Save()
		assert.Error(t, err)
	})
}

func TestFolderUpdate(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("updates folder name successfully", func(t *testing.T) {
		truncateTables(t, pool, "folders", "users")

		user := createTestUser(t, pool, "update-user")

		folder := &Folder{
			UserID: user.ID,
			Name:   "Original Name",
		}
		err := folder.Save()
		require.NoError(t, err)

		originalUpdatedAt := folder.UpdatedAt

		// Update name
		folder.Name = "Updated Name"
		err = folder.Update()
		require.NoError(t, err)
		assert.True(t, folder.UpdatedAt.After(originalUpdatedAt))

		// Verify changes persisted
		loaded, err := GetFolderByID(folder.ID)
		require.NoError(t, err)
		require.NotNil(t, loaded)
		assert.Equal(t, "Updated Name", loaded.Name)
	})

	t.Run("updates parent folder", func(t *testing.T) {
		truncateTables(t, pool, "folders", "users")

		user := createTestUser(t, pool, "parent-update-user")

		// Create parent folders
		parent1 := &Folder{
			UserID: user.ID,
			Name:   "Parent 1",
		}
		err := parent1.Save()
		require.NoError(t, err)

		parent2 := &Folder{
			UserID: user.ID,
			Name:   "Parent 2",
		}
		err = parent2.Save()
		require.NoError(t, err)

		// Create child with parent1
		child := &Folder{
			UserID:         user.ID,
			Name:           "Child",
			ParentFolderID: &parent1.ID,
		}
		err = child.Save()
		require.NoError(t, err)

		// Update to parent2
		child.ParentFolderID = &parent2.ID
		err = child.Update()
		require.NoError(t, err)

		// Verify
		loaded, err := GetFolderByID(child.ID)
		require.NoError(t, err)
		assert.NotNil(t, loaded.ParentFolderID)
		assert.Equal(t, parent2.ID, *loaded.ParentFolderID)
	})

	t.Run("can set parent to null", func(t *testing.T) {
		truncateTables(t, pool, "folders", "users")

		user := createTestUser(t, pool, "null-parent-user")

		parent := &Folder{
			UserID: user.ID,
			Name:   "Parent",
		}
		err := parent.Save()
		require.NoError(t, err)

		child := &Folder{
			UserID:         user.ID,
			Name:           "Child",
			ParentFolderID: &parent.ID,
		}
		err = child.Save()
		require.NoError(t, err)

		// Remove parent
		child.ParentFolderID = nil
		err = child.Update()
		require.NoError(t, err)

		// Verify
		loaded, err := GetFolderByID(child.ID)
		require.NoError(t, err)
		assert.Nil(t, loaded.ParentFolderID)
	})

	t.Run("returns error for non-existent folder", func(t *testing.T) {
		truncateTables(t, pool, "folders")

		folder := &Folder{
			ID:   99999,
			Name: "Non-existent",
		}

		err := folder.Update()
		assert.Error(t, err)
	})
}

func TestFolderDelete(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("deletes folder successfully", func(t *testing.T) {
		truncateTables(t, pool, "folders", "users")

		user := createTestUser(t, pool, "delete-user")

		folder := &Folder{
			UserID: user.ID,
			Name:   "Delete Me",
		}
		err := folder.Save()
		require.NoError(t, err)

		// Delete folder
		err = folder.Delete()
		require.NoError(t, err)

		// Verify deleted
		loaded, err := GetFolderByID(folder.ID)
		require.NoError(t, err)
		assert.Nil(t, loaded)
	})

	t.Run("does not error when deleting non-existent folder", func(t *testing.T) {
		truncateTables(t, pool, "folders")

		folder := &Folder{
			ID: 99999,
		}

		err := folder.Delete()
		assert.NoError(t, err)
	})
}

func TestGetFolderByID(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("returns folder when found", func(t *testing.T) {
		truncateTables(t, pool, "folders", "users")

		user := createTestUser(t, pool, "get-user")

		created := &Folder{
			UserID: user.ID,
			Name:   "Get Me",
		}
		err := created.Save()
		require.NoError(t, err)

		// Get folder
		folder, err := GetFolderByID(created.ID)
		require.NoError(t, err)
		require.NotNil(t, folder)

		assert.Equal(t, created.ID, folder.ID)
		assert.Equal(t, user.ID, folder.UserID)
		assert.Equal(t, "Get Me", folder.Name)
		assert.NotZero(t, folder.CreatedAt)
		assert.NotZero(t, folder.UpdatedAt)
	})

	t.Run("returns nil when not found", func(t *testing.T) {
		truncateTables(t, pool, "folders")

		folder, err := GetFolderByID(99999)
		require.NoError(t, err)
		assert.Nil(t, folder)
	})
}

func TestGetFoldersByUserID(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("returns all folders for user", func(t *testing.T) {
		truncateTables(t, pool, "folders", "users")

		user := createTestUser(t, pool, "list-user")

		// Create multiple folders
		names := []string{"Zebra", "Apple", "Mango"}
		for _, name := range names {
			folder := &Folder{
				UserID: user.ID,
				Name:   name,
			}
			err := folder.Save()
			require.NoError(t, err)
		}

		folders, err := GetFoldersByUserID(user.ID)
		require.NoError(t, err)
		assert.Len(t, folders, 3)

		// Verify ordered alphabetically by name
		assert.Equal(t, "Apple", folders[0].Name)
		assert.Equal(t, "Mango", folders[1].Name)
		assert.Equal(t, "Zebra", folders[2].Name)
	})

	t.Run("returns empty slice when user has no folders", func(t *testing.T) {
		truncateTables(t, pool, "folders", "users")

		user := createTestUser(t, pool, "empty-user")

		folders, err := GetFoldersByUserID(user.ID)
		require.NoError(t, err)
		assert.Empty(t, folders)
	})

	t.Run("does not return other users' folders", func(t *testing.T) {
		truncateTables(t, pool, "folders", "users")

		user1 := createTestUser(t, pool, "user1")
		user2 := createTestUser(t, pool, "user2")

		// Create folders for both users
		folder1 := &Folder{
			UserID: user1.ID,
			Name:   "User 1 Folder",
		}
		err := folder1.Save()
		require.NoError(t, err)

		folder2 := &Folder{
			UserID: user2.ID,
			Name:   "User 2 Folder",
		}
		err = folder2.Save()
		require.NoError(t, err)

		// Get folders for user1
		folders, err := GetFoldersByUserID(user1.ID)
		require.NoError(t, err)
		assert.Len(t, folders, 1)
		assert.Equal(t, "User 1 Folder", folders[0].Name)
	})

	t.Run("includes parent folder information", func(t *testing.T) {
		truncateTables(t, pool, "folders", "users")

		user := createTestUser(t, pool, "parent-test-user")

		parent := &Folder{
			UserID: user.ID,
			Name:   "Parent",
		}
		err := parent.Save()
		require.NoError(t, err)

		child := &Folder{
			UserID:         user.ID,
			Name:           "Child",
			ParentFolderID: &parent.ID,
		}
		err = child.Save()
		require.NoError(t, err)

		folders, err := GetFoldersByUserID(user.ID)
		require.NoError(t, err)
		assert.Len(t, folders, 2)

		// Find child folder
		var childFolder *Folder
		for i := range folders {
			if folders[i].Name == "Child" {
				childFolder = &folders[i]
				break
			}
		}

		require.NotNil(t, childFolder)
		assert.NotNil(t, childFolder.ParentFolderID)
		assert.Equal(t, parent.ID, *childFolder.ParentFolderID)
	})
}

func TestFolderHierarchy(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("supports nested folder hierarchy", func(t *testing.T) {
		truncateTables(t, pool, "folders", "users")

		user := createTestUser(t, pool, "hierarchy-user")

		// Create 3-level hierarchy
		grandparent := &Folder{
			UserID: user.ID,
			Name:   "Grandparent",
		}
		err := grandparent.Save()
		require.NoError(t, err)

		parent := &Folder{
			UserID:         user.ID,
			Name:           "Parent",
			ParentFolderID: &grandparent.ID,
		}
		err = parent.Save()
		require.NoError(t, err)

		child := &Folder{
			UserID:         user.ID,
			Name:           "Child",
			ParentFolderID: &parent.ID,
		}
		err = child.Save()
		require.NoError(t, err)

		// Verify relationships
		loadedChild, err := GetFolderByID(child.ID)
		require.NoError(t, err)
		assert.Equal(t, parent.ID, *loadedChild.ParentFolderID)

		loadedParent, err := GetFolderByID(parent.ID)
		require.NoError(t, err)
		assert.Equal(t, grandparent.ID, *loadedParent.ParentFolderID)

		loadedGrandparent, err := GetFolderByID(grandparent.ID)
		require.NoError(t, err)
		assert.Nil(t, loadedGrandparent.ParentFolderID)
	})
}
