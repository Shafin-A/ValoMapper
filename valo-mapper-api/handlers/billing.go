package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
	"valo-mapper-api/db"
	"valo-mapper-api/middleware"
	"valo-mapper-api/models"
	"valo-mapper-api/utils"

	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/checkout/session"
	"github.com/stripe/stripe-go/v82/price"
	"github.com/stripe/stripe-go/v82/subscription"
	"github.com/stripe/stripe-go/v82/webhook"
)

var createStripeCheckoutSessionFn = session.New
var findStripePriceForPlanFn = findStripePriceForPlan
var updateStripeSubscriptionFn = subscription.Update
var getStripeSubscriptionFn = subscription.Get
var findCancelableStripeSubscriptionIDForUserFn = findCancelableStripeSubscriptionIDForUser
var findScheduledCancellationSubscriptionIDForUserFn = findScheduledCancellationSubscriptionIDForUser

var errStripeSubscriptionIDMissing = errors.New("stripe-subscription-id-missing")
var errStripeSubscriptionNotFound = errors.New("stripe-subscription-not-found")
var errStripeScheduledCancellationNotFound = errors.New("stripe-scheduled-cancellation-not-found")
var errUnsupportedCheckoutPlan = errors.New("unsupported-checkout-plan")
var errCheckoutPlanUnavailable = errors.New("checkout-plan-unavailable")

type checkoutPlan string

const (
	checkoutPlanMonthly checkoutPlan = "monthly"
	checkoutPlanYearly  checkoutPlan = "yearly"

	defaultMonthlyPriceLookupKey = "standard_monthly"
	defaultYearlyPriceLookupKey  = "standard_yearly"
)

type CreateCheckoutSessionResponse struct {
	SessionID string `json:"sessionId"`
	URL       string `json:"url"`
}

type CreateCheckoutSessionRequest struct {
	ReturnTo string `json:"returnTo"`
	Plan     string `json:"plan"`
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
}

func GetBillingPlans(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r)

	if r.Method != http.MethodGet {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), requestID)
		return
	}

	stripeSecretKey := strings.TrimSpace(os.Getenv("STRIPE_SECRET_KEY"))
	if stripeSecretKey == "" {
		utils.SendJSONError(w, utils.NewInternal("Stripe checkout is not configured", nil), requestID)
		return
	}

	stripe.Key = stripeSecretKey

	monthlyPrice, err := findStripePriceForPlanFn(checkoutPlanMonthly)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Stripe checkout is not configured", nil), requestID)
		return
	}

	yearlyPrice, err := findStripePriceForPlanFn(checkoutPlanYearly)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Stripe checkout is not configured", nil), requestID)
		return
	}

	monthlyResponse, err := buildBillingPlanPriceResponse(checkoutPlanMonthly, monthlyPrice)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Stripe billing plan configuration is invalid", err), requestID)
		return
	}

	yearlyResponse, err := buildBillingPlanPriceResponse(checkoutPlanYearly, yearlyPrice)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Stripe billing plan configuration is invalid", err), requestID)
		return
	}

	utils.SendJSON(w, http.StatusOK, BillingPlansResponse{
		Monthly: monthlyResponse,
		Yearly:  yearlyResponse,
	}, requestID)
}

func CreateCheckoutSession(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	requestID := middleware.GetRequestID(r)

	if r.Method != http.MethodPost {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), requestID)
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), requestID)
		return
	}

	checkoutRequest, err := parseCreateCheckoutSessionRequest(r)
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), requestID)
		return
	}

	stripeSecretKey := strings.TrimSpace(os.Getenv("STRIPE_SECRET_KEY"))
	if stripeSecretKey == "" {
		utils.SendJSONError(w, utils.NewInternal("Stripe checkout is not configured", nil), requestID)
		return
	}

	stripe.Key = stripeSecretKey

	if user.IsSubscribed {
		recovered, err := recoverStaleStripeSubscriptionForCheckout(user)
		if err != nil {
			utils.SendJSONError(w, utils.NewInternal("Unable to verify subscription state", err), requestID)
			return
		}

		if !recovered && user.IsSubscribed {
			utils.SendJSONError(w, utils.NewConflict("Active subscription already exists", nil), requestID)
			return
		}
	}

	selectedPlan, err := parseCheckoutPlan(checkoutRequest.Plan)
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Unsupported checkout plan"), requestID)
		return
	}

	stripePriceID, err := checkoutPriceIDForPlan(selectedPlan)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Stripe checkout is not configured", nil), requestID)
		return
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

	returnTo := sanitizeCheckoutReturnTo(checkoutRequest.ReturnTo)
	successURL := checkoutRedirectURL("STRIPE_CHECKOUT_SUCCESS_URL", "/billing/success")
	cancelURL := checkoutRedirectURL("STRIPE_CHECKOUT_CANCEL_URL", "/billing/cancel")
	if returnTo != "" {
		successURL = appendReturnToQuery(successURL, returnTo)
		cancelURL = appendReturnToQuery(cancelURL, returnTo)
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

	if user.StripeCustomerID != nil {
		stripeCustomerID := strings.TrimSpace(*user.StripeCustomerID)
		if stripeCustomerID != "" {
			params.Customer = stripe.String(stripeCustomerID)
		}
	}

	checkoutSession, err := createStripeCheckoutSessionFn(params)
	if err != nil && params.Customer != nil {
		recovered, recoverErr := recoverStaleStripeCustomerIDForCheckout(user, err)
		if recoverErr != nil {
			utils.SendJSONError(w, utils.NewInternal("Unable to create checkout session", recoverErr), requestID)
			return
		}

		if recovered {
			params.Customer = nil
			checkoutSession, err = createStripeCheckoutSessionFn(params)
		}
	}
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to create checkout session", err), requestID)
		return
	}

	utils.SendJSON(w, http.StatusOK, CreateCheckoutSessionResponse{
		SessionID: checkoutSession.ID,
		URL:       checkoutSession.URL,
	}, requestID)
}

func CancelSubscription(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	requestID := middleware.GetRequestID(r)

	if r.Method != http.MethodPost {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), requestID)
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), requestID)
		return
	}

	if !user.IsSubscribed {
		utils.SendJSONError(w, utils.NewBadRequest("No active subscription to cancel"), requestID)
		return
	}

	stripeSecretKey := strings.TrimSpace(os.Getenv("STRIPE_SECRET_KEY"))
	if stripeSecretKey == "" {
		utils.SendJSONError(w, utils.NewInternal("Stripe checkout is not configured", nil), requestID)
		return
	}

	stripe.Key = stripeSecretKey

	subscriptionID, err := findCancelableStripeSubscriptionIDForUserFn(user)
	if err != nil {
		switch {
		case errors.Is(err, errStripeSubscriptionIDMissing), errors.Is(err, errStripeSubscriptionNotFound):
			utils.SendJSONError(w, utils.NewNotFound("Active Stripe subscription not found"), requestID)
		default:
			utils.SendJSONError(w, utils.NewInternal("Unable to locate Stripe subscription", err), requestID)
		}
		return
	}

	updatedSubscription, err := updateStripeSubscriptionFn(subscriptionID, &stripe.SubscriptionParams{
		CancelAtPeriodEnd: stripe.Bool(true),
	})
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to cancel subscription", err), requestID)
		return
	}

	isSubscribed, subscriptionEndedAt := deriveSubscriptionState(
		stripe.EventTypeCustomerSubscriptionUpdated,
		updatedSubscription.Status,
		updatedSubscription.CancelAtPeriodEnd,
		updatedSubscription.CancelAt,
	)
	if err := user.UpdateSubscriptionStatus(isSubscribed, subscriptionEndedAt); err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to update subscription", err), requestID)
		return
	}

	utils.SendJSON(w, http.StatusOK, CancelSubscriptionResponse{
		SubscriptionID:    updatedSubscription.ID,
		Status:            string(updatedSubscription.Status),
		CancelAtPeriodEnd: updatedSubscription.CancelAtPeriodEnd,
	}, requestID)
}

func ResumeSubscription(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	requestID := middleware.GetRequestID(r)

	if r.Method != http.MethodPost {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), requestID)
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), requestID)
		return
	}

	if !user.IsSubscribed {
		utils.SendJSONError(w, utils.NewBadRequest("No active subscription to resume"), requestID)
		return
	}

	stripeSecretKey := strings.TrimSpace(os.Getenv("STRIPE_SECRET_KEY"))
	if stripeSecretKey == "" {
		utils.SendJSONError(w, utils.NewInternal("Stripe checkout is not configured", nil), requestID)
		return
	}

	stripe.Key = stripeSecretKey

	subscriptionID, err := findScheduledCancellationSubscriptionIDForUserFn(user)
	if err != nil {
		switch {
		case errors.Is(err, errStripeSubscriptionIDMissing), errors.Is(err, errStripeSubscriptionNotFound), errors.Is(err, errStripeScheduledCancellationNotFound):
			utils.SendJSONError(w, utils.NewBadRequest("No scheduled cancellation found"), requestID)
		default:
			utils.SendJSONError(w, utils.NewInternal("Unable to locate Stripe subscription", err), requestID)
		}
		return
	}

	updatedSubscription, err := updateStripeSubscriptionFn(subscriptionID, &stripe.SubscriptionParams{
		CancelAtPeriodEnd: stripe.Bool(false),
	})
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to resume subscription", err), requestID)
		return
	}

	isSubscribed, subscriptionEndedAt := deriveSubscriptionState(
		stripe.EventTypeCustomerSubscriptionUpdated,
		updatedSubscription.Status,
		updatedSubscription.CancelAtPeriodEnd,
		updatedSubscription.CancelAt,
	)
	if err := user.UpdateSubscriptionStatus(isSubscribed, subscriptionEndedAt); err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to update subscription", err), requestID)
		return
	}

	utils.SendJSON(w, http.StatusOK, CancelSubscriptionResponse{
		SubscriptionID:    updatedSubscription.ID,
		Status:            string(updatedSubscription.Status),
		CancelAtPeriodEnd: updatedSubscription.CancelAtPeriodEnd,
	}, requestID)
}

func HandleStripeWebhook(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r)

	if r.Method != http.MethodPost {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), requestID)
		return
	}

	webhookSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	if webhookSecret == "" {
		utils.SendJSONError(w, utils.NewInternal("Stripe webhook secret is not configured", nil), requestID)
		return
	}

	payload, err := io.ReadAll(r.Body)
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), requestID)
		return
	}
	defer r.Body.Close()

	signature := r.Header.Get("Stripe-Signature")
	if err := webhook.ValidatePayload(payload, signature, webhookSecret); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid Stripe signature"), requestID)
		return
	}

	var event stripe.Event
	err = json.Unmarshal(payload, &event)
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid Stripe event payload"), requestID)
		return
	}

	eventID := strings.TrimSpace(event.ID)
	if eventID == "" {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid Stripe event payload"), requestID)
		return
	}

	claimed, err := claimStripeWebhookEvent(r.Context(), eventID, string(event.Type))
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to process Stripe event", err), requestID)
		return
	}
	if !claimed {
		log.Printf("[request=%s] Stripe webhook duplicate ignored: eventID=%s eventType=%s", requestID, eventID, event.Type)
		utils.SendJSON(w, http.StatusOK, map[string]string{
			"status":  "ignored",
			"reason":  "duplicate-event",
			"eventId": eventID,
		}, requestID)
		return
	}

	processed, reason, err := processStripeSubscriptionEvent(event)
	if err != nil {
		if releaseErr := releaseStripeWebhookEventClaim(r.Context(), eventID); releaseErr != nil {
			log.Printf("[request=%s] failed to release Stripe webhook event claim eventID=%s: %v", requestID, eventID, releaseErr)
		}
		utils.SendJSONError(w, utils.NewInternal("Unable to process Stripe event", err), requestID)
		return
	}

	if !processed {
		log.Printf("[request=%s] Stripe webhook ignored: eventType=%s reason=%s", requestID, event.Type, reason)
		utils.SendJSON(w, http.StatusOK, map[string]string{
			"status": "ignored",
			"reason": reason,
		}, requestID)
		return
	}

	utils.SendJSON(w, http.StatusOK, map[string]string{
		"status":    "processed",
		"eventType": string(event.Type),
	}, requestID)
}

func processStripeSubscriptionEvent(event stripe.Event) (bool, string, error) {
	if !isSupportedStripeSubscriptionEvent(event.Type) {
		return false, "unsupported-event-type", nil
	}

	var subscription stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &subscription); err != nil {
		return false, "invalid-subscription-payload", err
	}

	user, reason, err := resolveUserFromStripeSubscription(&subscription)
	if err != nil {
		return false, "", err
	}
	if user == nil {
		return false, reason, nil
	}

	nextStripeCustomerID := user.StripeCustomerID
	stripeCustomerID := stripeSubscriptionCustomerID(&subscription)
	if stripeCustomerID != "" {
		nextStripeCustomerID = &stripeCustomerID
	}

	nextStripeSubscriptionID := user.StripeSubscriptionID
	stripeSubscriptionID := strings.TrimSpace(subscription.ID)
	if stripeSubscriptionID != "" {
		nextStripeSubscriptionID = &stripeSubscriptionID
	}

	isSubscribed, subscriptionEndedAt := deriveSubscriptionState(
		event.Type,
		subscription.Status,
		subscription.CancelAtPeriodEnd,
		subscription.CancelAt,
		subscription.EndedAt,
		subscription.CanceledAt,
	)
	if err := user.UpdateStripeBillingState(nextStripeCustomerID, nextStripeSubscriptionID, isSubscribed, subscriptionEndedAt); err != nil {
		return false, "", err
	}

	return true, "", nil
}

func stripeSubscriptionCustomerID(stripeSubscription *stripe.Subscription) string {
	if stripeSubscription == nil || stripeSubscription.Customer == nil {
		return ""
	}

	return strings.TrimSpace(stripeSubscription.Customer.ID)
}

func resolveUserFromStripeSubscription(subscription *stripe.Subscription) (*models.User, string, error) {
	if subscription == nil {
		return nil, "invalid-subscription-payload", nil
	}

	user, reason, err := resolveUserFromStripeMetadata(subscription.Metadata)
	if err != nil {
		return nil, "", err
	}
	if user != nil {
		return user, "", nil
	}

	stripeSubscriptionID := strings.TrimSpace(subscription.ID)
	if stripeSubscriptionID != "" {
		userBySubscriptionID, lookupErr := models.GetUserByStripeSubscriptionID(stripeSubscriptionID)
		if lookupErr != nil {
			return nil, "", lookupErr
		}
		if userBySubscriptionID != nil {
			return userBySubscriptionID, "", nil
		}
	}

	stripeCustomerID := stripeSubscriptionCustomerID(subscription)
	if stripeCustomerID != "" {
		userByCustomerID, lookupErr := models.GetUserByStripeCustomerID(stripeCustomerID)
		if lookupErr != nil {
			return nil, "", lookupErr
		}
		if userByCustomerID != nil {
			return userByCustomerID, "", nil
		}
	}

	if reason != "" {
		return nil, reason, nil
	}

	return nil, "user-not-found", nil
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

func resolveUserFromStripeMetadata(metadata map[string]string) (*models.User, string, error) {
	userIDRaw := firstNonEmptyMetadataValue(metadata, "userId", "user_id")
	firebaseUID := firstNonEmptyMetadataValue(metadata, "firebaseUid", "firebase_uid")

	if userIDRaw != "" {
		userID, err := strconv.Atoi(userIDRaw)
		if err == nil {
			user, lookupErr := models.GetUserByID(userID)
			if lookupErr != nil {
				return nil, "", lookupErr
			}
			if user != nil {
				return user, "", nil
			}
			if firebaseUID == "" {
				return nil, "user-not-found", nil
			}
		} else if firebaseUID == "" {
			return nil, "invalid-user-id-metadata", nil
		}
	}

	if firebaseUID != "" {
		user, err := models.GetUserByFirebaseUID(firebaseUID)
		if err != nil {
			return nil, "", err
		}
		if user != nil {
			return user, "", nil
		}
		return nil, "user-not-found", nil
	}

	return nil, "missing-user-identifier", nil
}

func firstNonEmptyMetadataValue(metadata map[string]string, keys ...string) string {
	for _, key := range keys {
		value := strings.TrimSpace(metadata[key])
		if value != "" {
			return value
		}
	}

	return ""
}

func parseCreateCheckoutSessionRequest(r *http.Request) (CreateCheckoutSessionRequest, error) {
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

func parseCheckoutPlan(raw string) (checkoutPlan, error) {
	normalized := strings.ToLower(strings.TrimSpace(raw))

	switch normalized {
	case "", string(checkoutPlanMonthly):
		return checkoutPlanMonthly, nil
	case string(checkoutPlanYearly):
		return checkoutPlanYearly, nil
	default:
		return "", errUnsupportedCheckoutPlan
	}
}

func checkoutPriceIDForPlan(plan checkoutPlan) (string, error) {
	stripePrice, err := findStripePriceForPlanFn(plan)
	if err != nil {
		return "", err
	}

	priceID := strings.TrimSpace(stripePrice.ID)
	if priceID == "" {
		return "", errCheckoutPlanUnavailable
	}

	return priceID, nil
}

func checkoutLookupKeyForPlan(plan checkoutPlan) (string, error) {
	switch plan {
	case checkoutPlanMonthly:
		lookupKey := strings.TrimSpace(os.Getenv("STRIPE_PRICE_LOOKUP_KEY_MONTHLY"))
		if lookupKey == "" {
			lookupKey = defaultMonthlyPriceLookupKey
		}

		return lookupKey, nil
	case checkoutPlanYearly:
		lookupKey := strings.TrimSpace(os.Getenv("STRIPE_PRICE_LOOKUP_KEY_YEARLY"))
		if lookupKey == "" {
			lookupKey = defaultYearlyPriceLookupKey
		}

		return lookupKey, nil
	default:
		return "", errUnsupportedCheckoutPlan
	}
}

func expectedIntervalForPlan(plan checkoutPlan) (stripe.PriceRecurringInterval, error) {
	switch plan {
	case checkoutPlanMonthly:
		return stripe.PriceRecurringIntervalMonth, nil
	case checkoutPlanYearly:
		return stripe.PriceRecurringIntervalYear, nil
	default:
		return "", errUnsupportedCheckoutPlan
	}
}

func findStripePriceForPlan(plan checkoutPlan) (*stripe.Price, error) {
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

	return nil, fmt.Errorf("%w: lookup key %s", errCheckoutPlanUnavailable, lookupKey)
}

func buildBillingPlanPriceResponse(plan checkoutPlan, stripePrice *stripe.Price) (BillingPlanPriceResponse, error) {
	if stripePrice == nil {
		return BillingPlanPriceResponse{}, errCheckoutPlanUnavailable
	}

	if stripePrice.Recurring == nil {
		return BillingPlanPriceResponse{}, errCheckoutPlanUnavailable
	}

	expectedInterval := string(stripe.PriceRecurringIntervalMonth)
	if plan == checkoutPlanYearly {
		expectedInterval = string(stripe.PriceRecurringIntervalYear)
	}

	actualInterval := string(stripePrice.Recurring.Interval)
	if actualInterval != expectedInterval {
		return BillingPlanPriceResponse{}, errCheckoutPlanUnavailable
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

func sanitizeCheckoutReturnTo(raw string) string {
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

func appendReturnToQuery(baseURL, returnTo string) string {
	parsed, err := url.Parse(baseURL)
	if err != nil {
		return baseURL
	}

	query := parsed.Query()
	query.Set("returnTo", returnTo)
	parsed.RawQuery = query.Encode()

	return parsed.String()
}

func findCancelableStripeSubscriptionIDForUser(user *models.User) (string, error) {
	stripeSubscription, err := findStripeSubscriptionForUser(user)
	if err != nil {
		return "", err
	}

	if !isCancelableStripeSubscriptionStatus(stripeSubscription.Status) {
		return "", errStripeSubscriptionNotFound
	}

	return strings.TrimSpace(stripeSubscription.ID), nil
}

func findScheduledCancellationSubscriptionIDForUser(user *models.User) (string, error) {
	stripeSubscription, err := findStripeSubscriptionForUser(user)
	if err != nil {
		return "", err
	}

	if !stripeSubscription.CancelAtPeriodEnd || !isCancelableStripeSubscriptionStatus(stripeSubscription.Status) {
		return "", errStripeScheduledCancellationNotFound
	}

	return strings.TrimSpace(stripeSubscription.ID), nil
}

func findStripeSubscriptionForUser(user *models.User) (*stripe.Subscription, error) {
	if user.StripeSubscriptionID == nil || strings.TrimSpace(*user.StripeSubscriptionID) == "" {
		return nil, errStripeSubscriptionIDMissing
	}

	stripeSubscriptionID := strings.TrimSpace(*user.StripeSubscriptionID)
	stripeSubscription, err := getStripeSubscriptionFn(stripeSubscriptionID, nil)
	if err != nil {
		var stripeErr *stripe.Error
		if errors.As(err, &stripeErr) && stripeErr.Code == stripe.ErrorCodeResourceMissing {
			if updateErr := user.UpdateStripeBillingState(user.StripeCustomerID, nil, user.IsSubscribed, user.SubscriptionEndedAt); updateErr != nil {
				return nil, updateErr
			}

			return nil, errStripeSubscriptionNotFound
		}

		return nil, err
	}

	if stripeSubscription == nil || strings.TrimSpace(stripeSubscription.ID) == "" {
		return nil, errStripeSubscriptionNotFound
	}

	return stripeSubscription, nil
}

func recoverStaleStripeSubscriptionForCheckout(user *models.User) (bool, error) {
	if user == nil || !user.IsSubscribed {
		return false, nil
	}

	if user.StripeSubscriptionID == nil || strings.TrimSpace(*user.StripeSubscriptionID) == "" {
		return false, nil
	}

	stripeSubscriptionID := strings.TrimSpace(*user.StripeSubscriptionID)
	stripeSubscription, err := getStripeSubscriptionFn(stripeSubscriptionID, nil)
	if err != nil {
		if !isStripeResourceMissingError(err) {
			return false, err
		}

		now := time.Now().UTC()
		if updateErr := user.UpdateStripeBillingState(user.StripeCustomerID, nil, false, &now); updateErr != nil {
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

	if err := user.UpdateStripeBillingState(nextStripeCustomerID, nextStripeSubscriptionID, isSubscribed, subscriptionEndedAt); err != nil {
		return false, err
	}

	return !isSubscribed, nil
}

func recoverStaleStripeCustomerIDForCheckout(user *models.User, checkoutErr error) (bool, error) {
	if user == nil || user.StripeCustomerID == nil || strings.TrimSpace(*user.StripeCustomerID) == "" {
		return false, nil
	}

	if !isStripeResourceMissingError(checkoutErr) {
		return false, nil
	}

	if err := user.UpdateStripeBillingState(nil, user.StripeSubscriptionID, user.IsSubscribed, user.SubscriptionEndedAt); err != nil {
		return false, err
	}

	return true, nil
}

func isStripeResourceMissingError(err error) bool {
	var stripeErr *stripe.Error
	if !errors.As(err, &stripeErr) {
		return false
	}

	if stripeErr.Code == stripe.ErrorCodeResourceMissing {
		return true
	}

	if strings.Contains(strings.ToLower(strings.TrimSpace(stripeErr.Msg)), "no such customer") {
		return true
	}

	return false
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

func checkoutRedirectURL(envVarName, fallbackPath string) string {
	configured := strings.TrimSpace(os.Getenv(envVarName))
	if configured != "" {
		return configured
	}

	origin := firstAllowedOrigin()
	origin = strings.TrimRight(origin, "/")
	return origin + fallbackPath
}

func firstAllowedOrigin() string {
	origins := strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",")
	for _, origin := range origins {
		trimmed := strings.TrimSpace(origin)
		if trimmed != "" {
			return trimmed
		}
	}

	return "http://localhost:3000"
}

func claimStripeWebhookEvent(ctx context.Context, eventID, eventType string) (bool, error) {
	conn, err := db.GetDB()
	if err != nil {
		return false, err
	}

	cmdTag, err := conn.Exec(ctx, `
		INSERT INTO stripe_webhook_events (event_id, event_type, processed_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (event_id) DO NOTHING
	`, eventID, eventType)
	if err != nil {
		return false, err
	}

	return cmdTag.RowsAffected() == 1, nil
}

func releaseStripeWebhookEventClaim(ctx context.Context, eventID string) error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	_, err = conn.Exec(ctx, `DELETE FROM stripe_webhook_events WHERE event_id = $1`, eventID)
	return err
}
