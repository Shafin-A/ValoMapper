package services

import (
	"testing"
	"valo-mapper-api/testutils"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetStrategiesUsesOneQuery(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	counter := &testutils.QueryCounter{}
	pool := testutils.SetupTestDBWithTracer(t, counter)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

	user := testutils.CreateTestUser(t, pool, "query-count-user")
	for i := 0; i < 3; i++ {
		lobby := testutils.CreateTestLobby(t, pool)
		testutils.CreateTestStrategy(t, pool, user.ID, lobby.Code)
	}

	service := NewStrategyService(StrategyServiceDependencies{})
	counter.Reset()

	strategies, err := service.GetStrategies(user.ID, nil)

	require.NoError(t, err)
	require.Len(t, strategies, 3)
	assert.Equal(t, int64(1), counter.Count())
}
