package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
	"valo-mapper-api/db"
	"valo-mapper-api/models"

	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/checkout/session"
	"github.com/stripe/stripe-go/v82/price"
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

// BillingService centralizes Stripe and billing business logic.
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

func (bs *BillingService) ParseCreateCheckoutSessionRequest(r *http.Request) (CreateCheckoutSessionRequest, error) {
	request := CreateCheckoutSessionRequest{}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		return request, err
	}

	if len(bytes.TrimSpace(body)) == 0 {
		return request, nil
	}

	if err := json.Unmarshal(body, &request); err != nil {
		return CreateCheckoutSessionRequest{}, err
	}

	return request, nil
}

func (bs *BillingService) ParseCheckoutPlan(raw string) (CheckoutPlan, error) {
	normalized := strings.ToLower(strings.TrimSpace(raw))

	switch normalized {
	case "", string(CheckoutPlanMonthly):
		return CheckoutPlanMonthly, nil
	case string(CheckoutPlanYearly):
		return CheckoutPlanYearly, nil
	case string(CheckoutPlanStack):
		return CheckoutPlanStack, nil
	default:
		return "", ErrUnsupportedCheckoutPlan
	}
}

func (bs *BillingService) CheckoutPriceIDForPlan(plan CheckoutPlan) (string, error) {
	stripePrice, err := bs.findStripePriceForPlan(plan)
	if err != nil {
		return "", err
	}

	priceID := strings.TrimSpace(stripePrice.ID)
	if priceID == "" {
		return "", ErrCheckoutPlanUnavailable
	}

	return priceID, nil
}

func (bs *BillingService) CreateCheckoutSession(
	ctx context.Context,
	userID int,
	selectedPlan CheckoutPlan,
	startWithTrial bool,
	stripePriceID string,
	successURL string,
	cancelURL string,
) (*stripe.CheckoutSession, error) {
	var checkoutSession *stripe.CheckoutSession

	err := bs.withCheckoutUserLock(ctx, userID, func() error {
		user, err := models.GetUserByID(userID)
		if err != nil {
			return err
		}
		if user == nil {
			return errors.New("checkout-user-not-found")
		}

		if user.IsSubscribed {
			recovered, err := bs.recoverStaleStripeSubscriptionForCheckout(user)
			if err != nil {
				return err
			}

			if !recovered && user.IsSubscribed {
				return ErrCheckoutActiveSubscriptionExists
			}
		}

		metadata := map[string]string{
			"userId": strconv.Itoa(user.ID),
			"plan":   string(selectedPlan),
		}
		if user.FirebaseUID != nil {
			firebaseUID := strings.TrimSpace(*user.FirebaseUID)
			if firebaseUID != "" {
				metadata["firebaseUid"] = firebaseUID
			}
		}

		params := &stripe.CheckoutSessionParams{
			Mode:              stripe.String(string(stripe.CheckoutSessionModeSubscription)),
			SuccessURL:        stripe.String(successURL),
			CancelURL:         stripe.String(cancelURL),
			ClientReferenceID: stripe.String(strconv.Itoa(user.ID)),
			LineItems: []*stripe.CheckoutSessionLineItemParams{
				{
					Price:    stripe.String(stripePriceID),
					Quantity: stripe.Int64(1),
				},
			},
			Metadata: metadata,
			SubscriptionData: &stripe.CheckoutSessionSubscriptionDataParams{
				Metadata: metadata,
			},
		}

		trialDays := bs.checkoutPremiumTrialDays()
		trialEligible := trialDays > 0 &&
			selectedPlan == CheckoutPlanMonthly &&
			!user.IsSubscribed &&
			user.PremiumTrialClaimedAt == nil &&
			startWithTrial

		if trialEligible {
			params.SubscriptionData.TrialPeriodDays = stripe.Int64(trialDays)
			metadata["trialApplied"] = "true"
			metadata["trialDays"] = strconv.FormatInt(trialDays, 10)
		}

		if user.StripeCustomerID != nil {
			stripeCustomerID := strings.TrimSpace(*user.StripeCustomerID)
			if stripeCustomerID != "" {
				params.Customer = stripe.String(stripeCustomerID)
			}
		}

		checkoutSession, err = bs.createStripeCheckoutSessionFn(params)
		if err != nil && params.Customer != nil {
			recovered, recoverErr := bs.recoverStaleStripeCustomerIDForCheckout(user, err)
			if recoverErr != nil {
				return recoverErr
			}

			if recovered {
				params.Customer = nil
				checkoutSession, err = bs.createStripeCheckoutSessionFn(params)
			}
		}
		if err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return checkoutSession, nil
}

func (bs *BillingService) CancelSubscription(user *models.User) (*stripe.Subscription, error) {
	subscriptionID, err := bs.findCancelableStripeSubscriptionIDForUser(user)
	if err != nil {
		return nil, err
	}

	updatedSubscription, err := bs.updateStripeSubscriptionFn(subscriptionID, &stripe.SubscriptionParams{
		CancelAtPeriodEnd: stripe.Bool(true),
	})
	if err != nil {
		return nil, err
	}

	isSubscribed, subscriptionEndedAt := deriveSubscriptionState(
		stripe.EventTypeCustomerSubscriptionUpdated,
		updatedSubscription.Status,
		updatedSubscription.CancelAtPeriodEnd,
		updatedSubscription.CancelAt,
	)
	if err := user.UpdateSubscriptionStatus(isSubscribed, subscriptionEndedAt); err != nil {
		return nil, err
	}

	return updatedSubscription, nil
}

func (bs *BillingService) ResumeSubscription(user *models.User) (*stripe.Subscription, error) {
	subscriptionID, err := bs.findScheduledCancellationSubscriptionIDForUser(user)
	if err != nil {
		return nil, err
	}

	updatedSubscription, err := bs.updateStripeSubscriptionFn(subscriptionID, &stripe.SubscriptionParams{
		CancelAtPeriodEnd: stripe.Bool(false),
	})
	if err != nil {
		return nil, err
	}

	isSubscribed, subscriptionEndedAt := deriveSubscriptionState(
		stripe.EventTypeCustomerSubscriptionUpdated,
		updatedSubscription.Status,
		updatedSubscription.CancelAtPeriodEnd,
		updatedSubscription.CancelAt,
	)
	if err := user.UpdateSubscriptionStatus(isSubscribed, subscriptionEndedAt); err != nil {
		return nil, err
	}

	return updatedSubscription, nil
}

func (bs *BillingService) GetBillingPlans() (BillingPlansResponse, error) {
	monthlyPrice, err := bs.findStripePriceForPlan(CheckoutPlanMonthly)
	if err != nil {
		return BillingPlansResponse{}, err
	}

	yearlyPrice, err := bs.findStripePriceForPlan(CheckoutPlanYearly)
	if err != nil {
		return BillingPlansResponse{}, err
	}

	stackPrice, err := bs.findStripePriceForPlan(CheckoutPlanStack)
	if err != nil {
		return BillingPlansResponse{}, err
	}

	monthlyResponse, err := bs.buildBillingPlanPriceResponse(CheckoutPlanMonthly, monthlyPrice)
	if err != nil {
		return BillingPlansResponse{}, err
	}
	yearlyResponse, err := bs.buildBillingPlanPriceResponse(CheckoutPlanYearly, yearlyPrice)
	if err != nil {
		return BillingPlansResponse{}, err
	}
	stackResponse, err := bs.buildBillingPlanPriceResponse(CheckoutPlanStack, stackPrice)
	if err != nil {
		return BillingPlansResponse{}, err
	}

	return BillingPlansResponse{
		Monthly: monthlyResponse,
		Yearly:  yearlyResponse,
		Stack:   stackResponse,
	}, nil
}

func (bs *BillingService) ProcessStripeSubscriptionEvent(event stripe.Event) (bool, string, error) {
	if !isSupportedStripeSubscriptionEvent(event.Type) {
		return false, ErrStripeUnsupportedSubscriptionEvent.Error(), nil
	}

	var stripeSubscription stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &stripeSubscription); err != nil {
		return false, ErrInvalidStripeEventPayload.Error(), err
	}

	user, reason, err := resolveUserFromStripeSubscription(&stripeSubscription)
	if err != nil {
		return false, "", err
	}
	if user == nil {
		return false, reason, nil
	}

	nextStripeCustomerID := user.StripeCustomerID
	stripeCustomerID := stripeSubscriptionCustomerID(&stripeSubscription)
	if stripeCustomerID != "" {
		nextStripeCustomerID = &stripeCustomerID
	}

	nextStripeSubscriptionID := user.StripeSubscriptionID
	stripeSubscriptionID := strings.TrimSpace(stripeSubscription.ID)
	if stripeSubscriptionID != "" {
		nextStripeSubscriptionID = &stripeSubscriptionID
	}

	isSubscribed, subscriptionEndedAt := deriveSubscriptionState(
		event.Type,
		stripeSubscription.Status,
		stripeSubscription.CancelAtPeriodEnd,
		stripeSubscription.CancelAt,
		stripeSubscription.EndedAt,
		stripeSubscription.CanceledAt,
	)
	subscriptionTrialEndsAt := deriveSubscriptionTrialEndsAt(
		event.Type,
		stripeSubscription.Status,
		stripeSubscription.TrialEnd,
	)

	var subscriptionPlan *string
	if planVal := strings.TrimSpace(stripeSubscription.Metadata["plan"]); planVal != "" && isSubscribed {
		subscriptionPlan = &planVal
	}

	if err := user.UpdateStripeBillingState(nextStripeCustomerID, nextStripeSubscriptionID, isSubscribed, subscriptionEndedAt, subscriptionTrialEndsAt, subscriptionPlan); err != nil {
		return false, "", err
	}

	trialApplied := strings.EqualFold(strings.TrimSpace(stripeSubscription.Metadata["trialApplied"]), "true")
	if subscriptionTrialEndsAt != nil && trialApplied {
		if _, err := user.ClaimPremiumTrial(); err != nil {
			return false, "", err
		}
	}

	return true, "", nil
}

func (bs *BillingService) findStripePriceForPlan(plan CheckoutPlan) (*stripe.Price, error) {
	if bs.findStripePriceForPlanFn != nil {
		return bs.findStripePriceForPlanFn(plan)
	}

	lookupKey, err := checkoutLookupKeyForPlan(plan)
	if err != nil {
		return nil, err
	}

	expectedInterval, err := expectedIntervalForPlan(plan)
	if err != nil {
		return nil, err
	}

	priceIter := price.List(&stripe.PriceListParams{
		Active:     stripe.Bool(true),
		LookupKeys: stripe.StringSlice([]string{lookupKey}),
	})

	for priceIter.Next() {
		stripePrice := priceIter.Price()
		if stripePrice == nil || stripePrice.Recurring == nil {
			continue
		}

		if stripePrice.Recurring.Interval != expectedInterval {
			continue
		}

		if strings.TrimSpace(stripePrice.LookupKey) != lookupKey {
			continue
		}

		return stripePrice, nil
	}

	if err := priceIter.Err(); err != nil {
		return nil, err
	}

	return nil, fmt.Errorf("%w: lookup key %s", ErrCheckoutPlanUnavailable, lookupKey)
}

func (bs *BillingService) buildBillingPlanPriceResponse(plan CheckoutPlan, stripePrice *stripe.Price) (BillingPlanPriceResponse, error) {
	if stripePrice == nil || stripePrice.Recurring == nil {
		return BillingPlanPriceResponse{}, ErrCheckoutPlanUnavailable
	}

	expectedInterval := string(stripe.PriceRecurringIntervalMonth)
	if plan == CheckoutPlanYearly || plan == CheckoutPlanStack {
		expectedInterval = string(stripe.PriceRecurringIntervalYear)
	}

	actualInterval := string(stripePrice.Recurring.Interval)
	if actualInterval != expectedInterval {
		return BillingPlanPriceResponse{}, ErrCheckoutPlanUnavailable
	}

	return BillingPlanPriceResponse{
		Plan:              string(plan),
		PriceID:           strings.TrimSpace(stripePrice.ID),
		Currency:          strings.ToUpper(string(stripePrice.Currency)),
		UnitAmount:        stripePrice.UnitAmount,
		UnitAmountDecimal: strconv.FormatFloat(stripePrice.UnitAmountDecimal, 'f', -1, 64),
		Interval:          actualInterval,
		IntervalCount:     stripePrice.Recurring.IntervalCount,
	}, nil
}

func (bs *BillingService) findCancelableStripeSubscriptionIDForUser(user *models.User) (string, error) {
	if bs.findCancelableStripeSubscriptionIDForUserFn != nil {
		return bs.findCancelableStripeSubscriptionIDForUserFn(user)
	}

	stripeSubscription, err := bs.findStripeSubscriptionForUser(user)
	if err != nil {
		return "", err
	}

	if !isCancelableStripeSubscriptionStatus(stripeSubscription.Status) {
		return "", ErrStripeSubscriptionNotFound
	}

	return strings.TrimSpace(stripeSubscription.ID), nil
}

func (bs *BillingService) findScheduledCancellationSubscriptionIDForUser(user *models.User) (string, error) {
	if bs.findScheduledCancellationSubscriptionIDForUserFn != nil {
		return bs.findScheduledCancellationSubscriptionIDForUserFn(user)
	}

	stripeSubscription, err := bs.findStripeSubscriptionForUser(user)
	if err != nil {
		return "", err
	}

	if !stripeSubscription.CancelAtPeriodEnd || !isCancelableStripeSubscriptionStatus(stripeSubscription.Status) {
		return "", ErrStripeScheduledCancellationNotFound
	}

	return strings.TrimSpace(stripeSubscription.ID), nil
}

func (bs *BillingService) findStripeSubscriptionForUser(user *models.User) (*stripe.Subscription, error) {
	if user.StripeSubscriptionID == nil || strings.TrimSpace(*user.StripeSubscriptionID) == "" {
		return nil, ErrStripeSubscriptionIDMissing
	}

	stripeSubscriptionID := strings.TrimSpace(*user.StripeSubscriptionID)
	stripeSubscription, err := bs.getStripeSubscriptionFn(stripeSubscriptionID, nil)
	if err != nil {
		if isStripeResourceMissingError(err) {
			if updateErr := user.UpdateStripeBillingState(user.StripeCustomerID, nil, user.PersonalIsSubscribed, user.PersonalSubscriptionEndedAt, user.PersonalSubscriptionTrialEndsAt, user.PersonalSubscriptionPlan); updateErr != nil {
				return nil, updateErr
			}

			return nil, ErrStripeSubscriptionNotFound
		}

		return nil, err
	}

	if stripeSubscription == nil || strings.TrimSpace(stripeSubscription.ID) == "" {
		return nil, ErrStripeSubscriptionNotFound
	}

	return stripeSubscription, nil
}

func (bs *BillingService) SchedulePersonalSubscriptionCancellationForStackJoin(user *models.User) error {
	if user == nil || !user.HasActivePersonalSubscription() || user.StripeSubscriptionID == nil || strings.TrimSpace(*user.StripeSubscriptionID) == "" {
		return nil
	}

	stripeSubscriptionID := strings.TrimSpace(*user.StripeSubscriptionID)
	stripeSubscription, err := bs.getStripeSubscriptionFn(stripeSubscriptionID, nil)
	if err != nil {
		if isStripeResourceMissingError(err) {
			now := time.Now().UTC()
			return user.UpdateStripeBillingState(user.StripeCustomerID, nil, false, &now, nil, nil)
		}

		return err
	}

	if stripeSubscription == nil || strings.TrimSpace(stripeSubscription.ID) == "" {
		return nil
	}

	if !isCancelableStripeSubscriptionStatus(stripeSubscription.Status) {
		return nil
	}

	if stripeSubscription.CancelAtPeriodEnd {
		return bs.syncUserPersonalBillingFromStripeSubscription(user, stripeSubscription)
	}

	updatedSubscription, err := bs.updateStripeSubscriptionFn(strings.TrimSpace(stripeSubscription.ID), &stripe.SubscriptionParams{
		CancelAtPeriodEnd: stripe.Bool(true),
	})
	if err != nil {
		return err
	}

	return bs.syncUserPersonalBillingFromStripeSubscription(user, updatedSubscription)
}

func (bs *BillingService) syncUserPersonalBillingFromStripeSubscription(user *models.User, stripeSubscription *stripe.Subscription) error {
	if user == nil || stripeSubscription == nil {
		return nil
	}

	nextStripeCustomerID := user.StripeCustomerID
	stripeCustomerID := stripeSubscriptionCustomerID(stripeSubscription)
	if stripeCustomerID != "" {
		nextStripeCustomerID = &stripeCustomerID
	}

	nextStripeSubscriptionID := user.StripeSubscriptionID
	normalizedSubscriptionID := strings.TrimSpace(stripeSubscription.ID)
	if normalizedSubscriptionID != "" {
		nextStripeSubscriptionID = &normalizedSubscriptionID
	}

	isSubscribed, subscriptionEndedAt := deriveSubscriptionState(
		stripe.EventTypeCustomerSubscriptionUpdated,
		stripeSubscription.Status,
		stripeSubscription.CancelAtPeriodEnd,
		stripeSubscription.CancelAt,
		stripeSubscription.EndedAt,
		stripeSubscription.CanceledAt,
	)
	subscriptionTrialEndsAt := deriveSubscriptionTrialEndsAt(
		stripe.EventTypeCustomerSubscriptionUpdated,
		stripeSubscription.Status,
		stripeSubscription.TrialEnd,
	)

	updatedPlan := user.PersonalSubscriptionPlan
	if updatedPlan == nil {
		if planVal := strings.TrimSpace(stripeSubscription.Metadata["plan"]); planVal != "" {
			updatedPlan = &planVal
		}
	}
	if !isSubscribed {
		updatedPlan = nil
	}

	return user.UpdateStripeBillingState(nextStripeCustomerID, nextStripeSubscriptionID, isSubscribed, subscriptionEndedAt, subscriptionTrialEndsAt, updatedPlan)
}

func (bs *BillingService) withCheckoutUserLock(ctx context.Context, userID int, fn func() error) error {
	pool, err := db.GetDB()
	if err != nil {
		return err
	}

	conn, err := pool.Acquire(ctx)
	if err != nil {
		return err
	}
	defer conn.Release()

	if _, err := conn.Exec(ctx, "SELECT pg_advisory_lock($1, $2)", checkoutUserLockNamespace, userID); err != nil {
		return err
	}
	defer func() {
		_, _ = conn.Exec(context.Background(), "SELECT pg_advisory_unlock($1, $2)", checkoutUserLockNamespace, userID)
	}()

	return fn()
}

func (bs *BillingService) checkoutPremiumTrialDays() int64 {
	configured := strings.TrimSpace(os.Getenv("STRIPE_PREMIUM_TRIAL_DAYS"))
	if configured == "" {
		return defaultCheckoutPremiumTrialDays
	}

	parsed, err := strconv.ParseInt(configured, 10, 64)
	if err != nil || parsed < 0 {
		return defaultCheckoutPremiumTrialDays
	}

	return parsed
}

func (bs *BillingService) recoverStaleStripeSubscriptionForCheckout(user *models.User) (bool, error) {
	if user == nil || !user.HasActivePersonalSubscription() {
		return false, nil
	}

	if user.StripeSubscriptionID == nil || strings.TrimSpace(*user.StripeSubscriptionID) == "" {
		return false, nil
	}

	stripeSubscriptionID := strings.TrimSpace(*user.StripeSubscriptionID)
	stripeSubscription, err := bs.getStripeSubscriptionFn(stripeSubscriptionID, nil)
	if err != nil {
		if !isStripeResourceMissingError(err) {
			return false, err
		}

		now := time.Now().UTC()
		if updateErr := user.UpdateStripeBillingState(user.StripeCustomerID, nil, false, &now, nil, nil); updateErr != nil {
			return false, updateErr
		}

		return true, nil
	}

	if stripeSubscription == nil {
		return false, nil
	}

	isSubscribed, subscriptionEndedAt := deriveSubscriptionState(
		stripe.EventTypeCustomerSubscriptionUpdated,
		stripeSubscription.Status,
		stripeSubscription.CancelAtPeriodEnd,
		stripeSubscription.CancelAt,
		stripeSubscription.EndedAt,
		stripeSubscription.CanceledAt,
	)
	subscriptionTrialEndsAt := deriveSubscriptionTrialEndsAt(
		stripe.EventTypeCustomerSubscriptionUpdated,
		stripeSubscription.Status,
		stripeSubscription.TrialEnd,
	)

	nextStripeCustomerID := user.StripeCustomerID
	stripeCustomerID := stripeSubscriptionCustomerID(stripeSubscription)
	if stripeCustomerID != "" {
		nextStripeCustomerID = &stripeCustomerID
	}

	nextStripeSubscriptionID := user.StripeSubscriptionID
	normalizedSubscriptionID := strings.TrimSpace(stripeSubscription.ID)
	if normalizedSubscriptionID != "" {
		nextStripeSubscriptionID = &normalizedSubscriptionID
	}

	updatedPlan := user.PersonalSubscriptionPlan
	if !isSubscribed {
		updatedPlan = nil
	}

	if err := user.UpdateStripeBillingState(nextStripeCustomerID, nextStripeSubscriptionID, isSubscribed, subscriptionEndedAt, subscriptionTrialEndsAt, updatedPlan); err != nil {
		return false, err
	}

	return !isSubscribed, nil
}

func (bs *BillingService) recoverStaleStripeCustomerIDForCheckout(user *models.User, checkoutErr error) (bool, error) {
	if user == nil || user.StripeCustomerID == nil || strings.TrimSpace(*user.StripeCustomerID) == "" {
		return false, nil
	}

	if !isStripeResourceMissingError(checkoutErr) {
		return false, nil
	}

	if err := user.UpdateStripeBillingState(nil, user.StripeSubscriptionID, user.PersonalIsSubscribed, user.PersonalSubscriptionEndedAt, user.PersonalSubscriptionTrialEndsAt, user.PersonalSubscriptionPlan); err != nil {
		return false, err
	}

	return true, nil
}

func (bs *BillingService) SanitizeCheckoutReturnTo(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}

	if strings.ContainsAny(trimmed, "\r\n") {
		return ""
	}

	if !strings.HasPrefix(trimmed, "/") || strings.HasPrefix(trimmed, "//") {
		return ""
	}

	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.IsAbs() {
		return ""
	}

	return trimmed
}

func (bs *BillingService) AppendReturnToQuery(baseURL, returnTo string) string {
	parsed, err := url.Parse(baseURL)
	if err != nil {
		return baseURL
	}

	query := parsed.Query()
	query.Set("returnTo", returnTo)
	parsed.RawQuery = query.Encode()

	return parsed.String()
}

func (bs *BillingService) CheckoutRedirectURL(envVarName, fallbackPath string) string {
	configured := strings.TrimSpace(os.Getenv(envVarName))
	if configured != "" {
		return configured
	}

	origin := strings.TrimRight(firstServiceAllowedOrigin(), "/")
	return origin + fallbackPath
}

func checkoutLookupKeyForPlan(plan CheckoutPlan) (string, error) {
	switch plan {
	case CheckoutPlanMonthly:
		lookupKey := strings.TrimSpace(os.Getenv("STRIPE_PRICE_LOOKUP_KEY_MONTHLY"))
		if lookupKey == "" {
			lookupKey = defaultMonthlyPriceLookupKey
		}

		return lookupKey, nil
	case CheckoutPlanYearly:
		lookupKey := strings.TrimSpace(os.Getenv("STRIPE_PRICE_LOOKUP_KEY_YEARLY"))
		if lookupKey == "" {
			lookupKey = defaultYearlyPriceLookupKey
		}

		return lookupKey, nil
	case CheckoutPlanStack:
		lookupKey := strings.TrimSpace(os.Getenv("STRIPE_PRICE_LOOKUP_KEY_STACK"))
		if lookupKey == "" {
			lookupKey = defaultStackPriceLookupKey
		}

		return lookupKey, nil
	default:
		return "", ErrUnsupportedCheckoutPlan
	}
}

func expectedIntervalForPlan(plan CheckoutPlan) (stripe.PriceRecurringInterval, error) {
	switch plan {
	case CheckoutPlanMonthly:
		return stripe.PriceRecurringIntervalMonth, nil
	case CheckoutPlanYearly, CheckoutPlanStack:
		return stripe.PriceRecurringIntervalYear, nil
	default:
		return "", ErrUnsupportedCheckoutPlan
	}
}

func firstServiceAllowedOrigin() string {
	origins := strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",")
	for _, origin := range origins {
		trimmed := strings.TrimSpace(origin)
		if trimmed != "" {
			return trimmed
		}
	}

	return "http://localhost:3000"
}

func isStripeResourceMissingError(err error) bool {
	var stripeErr *stripe.Error
	if !errors.As(err, &stripeErr) {
		return false
	}

	if stripeErr.Code == stripe.ErrorCodeResourceMissing {
		return true
	}

	return strings.Contains(strings.ToLower(strings.TrimSpace(stripeErr.Msg)), "no such customer")
}

func isCancelableStripeSubscriptionStatus(status stripe.SubscriptionStatus) bool {
	switch status {
	case stripe.SubscriptionStatusActive,
		stripe.SubscriptionStatusTrialing,
		stripe.SubscriptionStatusPastDue,
		stripe.SubscriptionStatusUnpaid,
		stripe.SubscriptionStatusIncomplete:
		return true
	default:
		return false
	}
}

func isSupportedStripeSubscriptionEvent(eventType stripe.EventType) bool {
	switch eventType {
	case stripe.EventTypeCustomerSubscriptionCreated,
		stripe.EventTypeCustomerSubscriptionUpdated,
		stripe.EventTypeCustomerSubscriptionDeleted:
		return true
	default:
		return false
	}
}

func stripeSubscriptionRepresentsActiveAccess(eventType stripe.EventType, status stripe.SubscriptionStatus) bool {
	if eventType == stripe.EventTypeCustomerSubscriptionDeleted {
		return false
	}

	switch status {
	case stripe.SubscriptionStatusActive, stripe.SubscriptionStatusTrialing:
		return true
	default:
		return false
	}
}

func deriveSubscriptionState(
	eventType stripe.EventType,
	status stripe.SubscriptionStatus,
	cancelAtPeriodEnd bool,
	cancelAt int64,
	downgradedEndedAtCandidates ...int64,
) (bool, *time.Time) {
	isSubscribed := stripeSubscriptionRepresentsActiveAccess(eventType, status)
	if !isSubscribed {
		if stripeEndedAt := firstPositiveUnixTime(downgradedEndedAtCandidates...); stripeEndedAt != nil {
			return false, stripeEndedAt
		}

		now := time.Now().UTC()
		return false, &now
	}

	if cancelAtPeriodEnd && cancelAt > 0 {
		endsAt := time.Unix(cancelAt, 0).UTC()
		return true, &endsAt
	}

	return true, nil
}

func deriveSubscriptionTrialEndsAt(
	eventType stripe.EventType,
	status stripe.SubscriptionStatus,
	trialEnd int64,
) *time.Time {
	if eventType == stripe.EventTypeCustomerSubscriptionDeleted {
		return nil
	}

	if status != stripe.SubscriptionStatusTrialing || trialEnd <= 0 {
		return nil
	}

	endsAt := time.Unix(trialEnd, 0).UTC()
	return &endsAt
}

func firstPositiveUnixTime(values ...int64) *time.Time {
	for _, value := range values {
		if value <= 0 {
			continue
		}

		ts := time.Unix(value, 0).UTC()
		return &ts
	}

	return nil
}

func stripeSubscriptionCustomerID(stripeSubscription *stripe.Subscription) string {
	if stripeSubscription == nil || stripeSubscription.Customer == nil {
		return ""
	}

	return strings.TrimSpace(stripeSubscription.Customer.ID)
}

func resolveUserFromStripeSubscription(subscription *stripe.Subscription) (*models.User, string, error) {
	if subscription == nil {
		return nil, ErrInvalidStripeEventPayload.Error(), nil
	}

	return models.ResolveUserForStripeSubscriptionEvent(
		subscription.Metadata,
		strings.TrimSpace(subscription.ID),
		stripeSubscriptionCustomerID(subscription),
	)
}
