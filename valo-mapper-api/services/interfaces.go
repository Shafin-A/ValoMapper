package services

import "context"

type FirebaseUserDeleter interface {
	DeleteUser(ctx context.Context, uid string) error
}

type CheckoutPlan string

const (
	CheckoutPlanMonthly CheckoutPlan = "monthly"
	CheckoutPlanYearly  CheckoutPlan = "yearly"
	CheckoutPlanStack   CheckoutPlan = "stack"
)
