package services

import "context"

type FirebaseUserDeleter interface {
	DeleteUser(ctx context.Context, uid string) error
}

// Checkout plan types
type CheckoutPlan string

const (
	CheckoutPlanMonthly CheckoutPlan = "monthly"
	CheckoutPlanYearly  CheckoutPlan = "yearly"
	CheckoutPlanStack   CheckoutPlan = "stack"

	// DefaultPremiumTrialDaysEnv environment variable for trial duration
	DefaultPremiumTrialDaysEnv = "PREMIUM_TRIAL_DAYS"
)
