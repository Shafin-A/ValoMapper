package scheduler

import (
	"strings"
	"testing"
)

func TestDeadRegistrationCleanupQuery(t *testing.T) {
	requiredClauses := []string{
		"DELETE FROM users u",
		"u.created_at < NOW() - INTERVAL '30 days'",
		"u.updated_at = u.created_at",
		"u.firebase_uid IS NULL",
		"u.email IS NULL",
		"u.is_subscribed = false",
		"u.stripe_customer_id IS NULL",
		"u.stripe_subscription_id IS NULL",
		"u.premium_trial_claimed_at IS NULL",
		"u.rso_subject_id IS NOT NULL",
		"NOT EXISTS (",
		"SELECT 1 FROM folders f",
		"SELECT 1 FROM strategies s",
		"SELECT 1 FROM stack_members sm",
	}

	for _, clause := range requiredClauses {
		if !strings.Contains(deadRegistrationCleanupQuery, clause) {
			t.Fatalf("query missing required clause: %s", clause)
		}
	}
}
