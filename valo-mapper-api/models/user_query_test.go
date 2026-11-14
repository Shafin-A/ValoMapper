package models_test

import (
	"testing"
	"valo-mapper-api/models"
	"valo-mapper-api/testutils"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetUserByFirebaseUIDUsesOneQuery(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	counter := &testutils.QueryCounter{}
	pool := testutils.SetupTestDBWithTracer(t, counter)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "stack_members", "users")
	testutils.CreateTestUser(t, pool, "query-count-user")

	counter.Reset()

	user, err := models.GetUserByFirebaseUID("query-count-user")

	require.NoError(t, err)
	require.NotNil(t, user)
	assert.Equal(t, int64(1), counter.Count())
}
