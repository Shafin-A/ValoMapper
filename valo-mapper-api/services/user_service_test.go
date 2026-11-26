package services

import (
	"testing"
	"time"
	"valo-mapper-api/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockUserRepo struct {
	updateFn func(u *models.User) error
}

func (m *mockUserRepo) GetUserByFirebaseUID(string) (*models.User, error) { return nil, nil }
func (m *mockUserRepo) GetUserByID(int) (*models.User, error)             { return nil, nil }
func (m *mockUserRepo) SaveUser(*models.User) error                       { return nil }
func (m *mockUserRepo) UpdateUser(u *models.User) error {
	if m.updateFn != nil {
		return m.updateFn(u)
	}
	return nil
}
func (m *mockUserRepo) DeleteUser(*models.User) error { return nil }
func (m *mockUserRepo) UpdateSubscriptionStatus(*models.User, bool, *time.Time) error {
	return nil
}

func TestUserService_UpdateUserFavoriteAgents(t *testing.T) {
	t.Run("trims, deduplicates, and sorts known agents", func(t *testing.T) {
		updated := false
		service := NewUserService(UserServiceDependencies{
			Repo: &mockUserRepo{updateFn: func(u *models.User) error {
				updated = true
				return nil
			}},
		})
		user := &models.User{ID: 1}

		err := service.UpdateUser(user, UpdateUserRequest{
			FavoriteAgents: &[]string{" Sage ", "Jett", "Sage", ""},
		})

		require.NoError(t, err)
		assert.True(t, updated)
		assert.Equal(t, []string{"Jett", "Sage"}, user.FavoriteAgents)
	})

	t.Run("allows clearing favorites", func(t *testing.T) {
		service := NewUserService(UserServiceDependencies{Repo: &mockUserRepo{}})
		user := &models.User{ID: 1, FavoriteAgents: []string{"Jett"}}

		err := service.UpdateUser(user, UpdateUserRequest{
			FavoriteAgents: &[]string{},
		})

		require.NoError(t, err)
		assert.Empty(t, user.FavoriteAgents)
	})

	t.Run("rejects unknown agents", func(t *testing.T) {
		updated := false
		service := NewUserService(UserServiceDependencies{
			Repo: &mockUserRepo{updateFn: func(u *models.User) error {
				updated = true
				return nil
			}},
		})

		err := service.UpdateUser(&models.User{ID: 1}, UpdateUserRequest{
			FavoriteAgents: &[]string{"Jett", "Not An Agent"},
		})

		assert.ErrorIs(t, err, ErrUserFavoriteAgentInvalid)
		assert.False(t, updated)
	})
}

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
