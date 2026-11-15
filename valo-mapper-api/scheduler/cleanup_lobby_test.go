package scheduler

import (
	"strings"
	"testing"
	"time"
)

func TestLobbyCleanupQuery(t *testing.T) {
	scheduler := NewCleanupScheduler(nil, time.Hour)

	requiredClauses := []string{
		"DELETE FROM lobbies l",
		"l.updated_at < NOW() - INTERVAL '12 hours'",
		"NOT EXISTS (",
		"SELECT 1 FROM strategies s WHERE s.lobby_code = l.code",
	}

	for _, clause := range requiredClauses {
		if !strings.Contains(scheduler.cleanupQuery, clause) {
			t.Fatalf("query missing required clause: %s", clause)
		}
	}

	// strategies.lobby_code cascades on lobby delete, so this guard is load-bearing.
	if strings.Contains(scheduler.cleanupQuery, "NOT IN") {
		t.Fatal("query should use NOT EXISTS, not NOT IN")
	}
}
