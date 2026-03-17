package services

import (
	"context"

	"firebase.google.com/go/v4/auth"
)

// FirebaseAuthInterface defines Firebase authentication operations
type FirebaseAuthInterface interface {
	VerifyIDToken(ctx context.Context, idToken string) (*auth.Token, error)
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
