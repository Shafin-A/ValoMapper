package models

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetMapById(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	t.Run("retrieves map by id successfully", func(t *testing.T) {
		truncateTables(t, pool, "maps")

		// Insert test map
		_, err := pool.Exec(context.Background(), `
			INSERT INTO maps (id, text) 
			VALUES ('ascent', 'Ascent')
		`)
		require.NoError(t, err)

		// Retrieve map
		mapOption, err := GetMapById("ascent")
		require.NoError(t, err)
		require.NotNil(t, mapOption)
		assert.Equal(t, "ascent", mapOption.ID)
		assert.Equal(t, "Ascent", mapOption.Text)
		assert.Equal(t, "text-white", mapOption.TextColor)
	})

	t.Run("returns error for non-existent map", func(t *testing.T) {
		truncateTables(t, pool, "maps")

		mapOption, err := GetMapById("nonexistent")
		assert.Error(t, err)
		assert.Equal(t, pgx.ErrNoRows, err)
		assert.Nil(t, mapOption)
	})

	t.Run("retrieves different maps correctly", func(t *testing.T) {
		truncateTables(t, pool, "maps")

		// Insert multiple test maps
		_, err := pool.Exec(context.Background(), `
			INSERT INTO maps (id, text) 
			VALUES 
				('bind', 'Bind'),
				('haven', 'Haven'),
				('split', 'Split')
		`)
		require.NoError(t, err)

		// Test bind
		bindMap, err := GetMapById("bind")
		require.NoError(t, err)
		require.NotNil(t, bindMap)
		assert.Equal(t, "bind", bindMap.ID)
		assert.Equal(t, "Bind", bindMap.Text)
		assert.Equal(t, "text-white", bindMap.TextColor)

		// Test haven
		havenMap, err := GetMapById("haven")
		require.NoError(t, err)
		require.NotNil(t, havenMap)
		assert.Equal(t, "haven", havenMap.ID)
		assert.Equal(t, "Haven", havenMap.Text)

		// Test split
		splitMap, err := GetMapById("split")
		require.NoError(t, err)
		require.NotNil(t, splitMap)
		assert.Equal(t, "split", splitMap.ID)
		assert.Equal(t, "text-white", splitMap.TextColor)
	})

	t.Run("handles empty id", func(t *testing.T) {
		truncateTables(t, pool, "maps")

		mapOption, err := GetMapById("")
		assert.Error(t, err)
		assert.Equal(t, pgx.ErrNoRows, err)
		assert.Nil(t, mapOption)
	})

	t.Run("handles special characters in map data", func(t *testing.T) {
		truncateTables(t, pool, "maps")

		// Insert map with special characters
		_, err := pool.Exec(context.Background(), `
			INSERT INTO maps (id, text) 
			VALUES ('test-map', 'Test & Map')
		`)
		require.NoError(t, err)

		mapOption, err := GetMapById("test-map")
		require.NoError(t, err)
		require.NotNil(t, mapOption)
		assert.Equal(t, "test-map", mapOption.ID)
		assert.Equal(t, "Test & Map", mapOption.Text)
	})

	t.Run("text color is always text-white", func(t *testing.T) {
		truncateTables(t, pool, "maps")

		mapIDs := []string{"map1", "map2", "map3"}

		for _, id := range mapIDs {
			_, err := pool.Exec(context.Background(), `
				INSERT INTO maps (id, text) 
				VALUES ($1, $2)
			`, id, "Test Map")
			require.NoError(t, err)

			mapOption, err := GetMapById(id)
			require.NoError(t, err)
			require.NotNil(t, mapOption)
			assert.Equal(t, "text-white", mapOption.TextColor)
		}
	})

	t.Run("case sensitive id lookup", func(t *testing.T) {
		truncateTables(t, pool, "maps")

		// Insert map with lowercase id
		_, err := pool.Exec(context.Background(), `
			INSERT INTO maps (id, text) 
			VALUES ('icebox', 'Icebox')
		`)
		require.NoError(t, err)

		// Try to retrieve with uppercase (should fail if case-sensitive)
		mapOption, err := GetMapById("ICEBOX")
		assert.Error(t, err)
		assert.Nil(t, mapOption)

		// Retrieve with correct case
		mapOption, err = GetMapById("icebox")
		require.NoError(t, err)
		require.NotNil(t, mapOption)
		assert.Equal(t, "icebox", mapOption.ID)
	})
}
