package services

import (
	"testing"
	"time"
	"valo-mapper-api/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUserService_EnrichUserBillingState(t *testing.T) {
	us := NewUserService(UserServiceDependencies{})

	t.Run("nil user does not panic", func(t *testing.T) {
		assert.NotPanics(t, func() { us.EnrichUserBillingState(nil) })
	})

	t.Run("fresh user is trial eligible with no days left", func(t *testing.T) {
		user := &models.User{
			IsSubscribed:                false,
			HasEverPersonalSubscription: false,
			PremiumTrialClaimedAt:       nil,
		}

		us.EnrichUserBillingState(user)

		assert.True(t, user.PremiumTrialEligible)
		assert.Nil(t, user.PremiumTrialDaysLeft)
	})

	t.Run("subscribed user is not trial eligible", func(t *testing.T) {
		user := &models.User{IsSubscribed: true}

		us.EnrichUserBillingState(user)

		assert.False(t, user.PremiumTrialEligible)
	})

	t.Run("user with a past personal subscription is not trial eligible", func(t *testing.T) {
		user := &models.User{
			IsSubscribed:                false,
			HasEverPersonalSubscription: true,
		}

		us.EnrichUserBillingState(user)

		assert.False(t, user.PremiumTrialEligible)
	})

	t.Run("user who already claimed a trial is not trial eligible", func(t *testing.T) {
		claimedAt := time.Now().Add(-7 * 24 * time.Hour)
		user := &models.User{
			IsSubscribed:          false,
			PremiumTrialClaimedAt: &claimedAt,
		}

		us.EnrichUserBillingState(user)

		assert.False(t, user.PremiumTrialEligible)
	})

	t.Run("active trial sets remaining days", func(t *testing.T) {
		trialEnd := time.Now().UTC().Add(72 * time.Hour)
		user := &models.User{
			IsSubscribed:            false,
			SubscriptionTrialEndsAt: &trialEnd,
		}

		us.EnrichUserBillingState(user)

		require.NotNil(t, user.PremiumTrialDaysLeft)
		assert.Equal(t, 3, *user.PremiumTrialDaysLeft)
	})

	t.Run("expired trial leaves days left unset", func(t *testing.T) {
		trialEnd := time.Now().UTC().Add(-24 * time.Hour)
		user := &models.User{
			IsSubscribed:            false,
			SubscriptionTrialEndsAt: &trialEnd,
		}

		us.EnrichUserBillingState(user)

		assert.Nil(t, user.PremiumTrialDaysLeft)
	})
}
