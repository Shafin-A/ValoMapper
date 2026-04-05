package handlers

import (
	"valo-mapper-api/models"

	"github.com/stripe/stripe-go/v82/checkout/session"
	"github.com/stripe/stripe-go/v82/subscription"
)

var createStripeCheckoutSessionFn = session.New
var findStripePriceForPlanFn = findStripePriceForPlan
var updateStripeSubscriptionFn = subscription.Update
var getStripeSubscriptionFn = subscription.Get
var findCancelableStripeSubscriptionIDForUserFn func(*models.User) (string, error)
var findScheduledCancellationSubscriptionIDForUserFn func(*models.User) (string, error)

const (
	defaultMonthlyPriceLookupKey = "standard_monthly"
	defaultYearlyPriceLookupKey  = "standard_yearly"
	defaultStackPriceLookupKey   = "standard_stack"

	StackMaxMembers = 6
)

type CreateCheckoutSessionResponse struct {
	SessionID string `json:"sessionId"`
	URL       string `json:"url"`
}

type CreateCheckoutSessionRequest struct {
	ReturnTo       string `json:"returnTo"`
	Plan           string `json:"plan"`
	StartWithTrial bool   `json:"startWithTrial"`
}

type CancelSubscriptionResponse struct {
	SubscriptionID    string `json:"subscriptionId"`
	Status            string `json:"status"`
	CancelAtPeriodEnd bool   `json:"cancelAtPeriodEnd"`
}

type BillingPlanPriceResponse struct {
	Plan              string `json:"plan"`
	PriceID           string `json:"priceId"`
	Currency          string `json:"currency"`
	UnitAmount        int64  `json:"unitAmount"`
	UnitAmountDecimal string `json:"unitAmountDecimal"`
	Interval          string `json:"interval"`
	IntervalCount     int64  `json:"intervalCount"`
}

type BillingPlansResponse struct {
	Monthly BillingPlanPriceResponse `json:"monthly"`
	Yearly  BillingPlanPriceResponse `json:"yearly"`
	Stack   BillingPlanPriceResponse `json:"stack"`
}

type InviteStackMemberRequest struct {
	FirebaseUID string `json:"firebaseUid"`
}

type StackOwnerResponse struct {
	UserID int     `json:"userId"`
	Email  *string `json:"email,omitempty"`
	Name   *string `json:"name,omitempty"`
}

type StackMembersResponse struct {
	Owner     StackOwnerResponse   `json:"owner"`
	Members   []models.StackMember `json:"members"`
	CanManage bool                 `json:"canManage"`
}
