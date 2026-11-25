package services

import (
	"errors"
	"valo-mapper-api/models"

	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/checkout/session"
	"github.com/stripe/stripe-go/v82/subscription"
)

const (
	defaultCheckoutPremiumTrialDays int64 = 14
	checkoutUserLockNamespace       int   = 80741

	defaultMonthlyPriceLookupKey = "standard_monthly"
	defaultYearlyPriceLookupKey  = "standard_yearly"
	defaultStackPriceLookupKey   = "standard_stack"
)

var (
	ErrStripeSubscriptionIDMissing         = errors.New("stripe-subscription-id-missing")
	ErrStripeSubscriptionNotFound          = errors.New("stripe-subscription-not-found")
	ErrStripeScheduledCancellationNotFound = errors.New("stripe-scheduled-cancellation-not-found")
	ErrUnsupportedCheckoutPlan             = errors.New("unsupported-checkout-plan")
	ErrCheckoutPlanUnavailable             = errors.New("checkout-plan-unavailable")
	ErrCheckoutActiveSubscriptionExists    = errors.New("checkout-active-subscription-exists")
	ErrStripeCheckoutNotConfigured         = errors.New("stripe-checkout-not-configured")
	ErrInvalidStripeEventPayload           = errors.New("invalid-subscription-payload")
	ErrStripeUnsupportedSubscriptionEvent  = errors.New("unsupported-event-type")
)

type BillingServiceDependencies struct {
	CreateStripeCheckoutSessionFn                    func(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error)
	FindStripePriceForPlanFn                         func(plan CheckoutPlan) (*stripe.Price, error)
	UpdateStripeSubscriptionFn                       func(id string, params *stripe.SubscriptionParams) (*stripe.Subscription, error)
	GetStripeSubscriptionFn                          func(id string, params *stripe.SubscriptionParams) (*stripe.Subscription, error)
	FindCancelableStripeSubscriptionIDForUserFn      func(user *models.User) (string, error)
	FindScheduledCancellationSubscriptionIDForUserFn func(user *models.User) (string, error)
}

type BillingService struct {
	createStripeCheckoutSessionFn                    func(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error)
	findStripePriceForPlanFn                         func(plan CheckoutPlan) (*stripe.Price, error)
	updateStripeSubscriptionFn                       func(id string, params *stripe.SubscriptionParams) (*stripe.Subscription, error)
	getStripeSubscriptionFn                          func(id string, params *stripe.SubscriptionParams) (*stripe.Subscription, error)
	findCancelableStripeSubscriptionIDForUserFn      func(user *models.User) (string, error)
	findScheduledCancellationSubscriptionIDForUserFn func(user *models.User) (string, error)
}

func NewBillingService(deps BillingServiceDependencies) *BillingService {
	createFn := deps.CreateStripeCheckoutSessionFn
	if createFn == nil {
		createFn = session.New
	}

	updateFn := deps.UpdateStripeSubscriptionFn
	if updateFn == nil {
		updateFn = subscription.Update
	}

	getFn := deps.GetStripeSubscriptionFn
	if getFn == nil {
		getFn = subscription.Get
	}

	return &BillingService{
		createStripeCheckoutSessionFn:                    createFn,
		findStripePriceForPlanFn:                         deps.FindStripePriceForPlanFn,
		updateStripeSubscriptionFn:                       updateFn,
		getStripeSubscriptionFn:                          getFn,
		findCancelableStripeSubscriptionIDForUserFn:      deps.FindCancelableStripeSubscriptionIDForUserFn,
		findScheduledCancellationSubscriptionIDForUserFn: deps.FindScheduledCancellationSubscriptionIDForUserFn,
	}
}

type CreateCheckoutSessionRequest struct {
	ReturnTo       string
	Plan           string
	StartWithTrial bool
}

type BillingPlanPriceResponse struct {
	Plan              string
	PriceID           string
	Currency          string
	UnitAmount        int64
	UnitAmountDecimal string
	Interval          string
	IntervalCount     int64
}

type BillingPlansResponse struct {
	Monthly BillingPlanPriceResponse
	Yearly  BillingPlanPriceResponse
	Stack   BillingPlanPriceResponse
}
