package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
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
	"github.com/stripe/stripe-go/v82/customer"
	"github.com/stripe/stripe-go/v82/subscription"
	"github.com/stripe/stripe-go/v82/webhook"
)

var createStripeCheckoutSessionFn = session.New
var updateStripeSubscriptionFn = subscription.Update
var findCancelableStripeSubscriptionIDForUserFn = findCancelableStripeSubscriptionIDForUser
var findScheduledCancellationSubscriptionIDForUserFn = findScheduledCancellationSubscriptionIDForUser

var errStripeCustomerNotFound = errors.New("stripe-customer-not-found")
var errStripeSubscriptionNotFound = errors.New("stripe-subscription-not-found")
var errStripeScheduledCancellationNotFound = errors.New("stripe-scheduled-cancellation-not-found")
var errUserEmailMissing = errors.New("user-email-missing")

type CreateCheckoutSessionResponse struct {
	SessionID string `json:"sessionId"`
	URL       string `json:"url"`
}

type CreateCheckoutSessionRequest struct {
	ReturnTo string `json:"returnTo"`
}

type CancelSubscriptionResponse struct {
	SubscriptionID    string `json:"subscriptionId"`
	Status            string `json:"status"`
	CancelAtPeriodEnd bool   `json:"cancelAtPeriodEnd"`
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
	stripePriceID := strings.TrimSpace(os.Getenv("STRIPE_PRICE_ID"))
	if stripeSecretKey == "" || stripePriceID == "" {
		utils.SendJSONError(w, utils.NewInternal("Stripe checkout is not configured", nil), requestID)
		return
	}

	stripe.Key = stripeSecretKey

	metadata := map[string]string{
		"userId": strconv.Itoa(user.ID),
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

	if user.Email != nil {
		email := strings.TrimSpace(*user.Email)
		if email != "" {
			params.CustomerEmail = stripe.String(email)
		}
	}

	checkoutSession, err := createStripeCheckoutSessionFn(params)
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
		case errors.Is(err, errUserEmailMissing):
			utils.SendJSONError(w, utils.NewBadRequest("Email is required to manage subscriptions"), requestID)
		case errors.Is(err, errStripeCustomerNotFound), errors.Is(err, errStripeSubscriptionNotFound):
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
		case errors.Is(err, errUserEmailMissing):
			utils.SendJSONError(w, utils.NewBadRequest("Email is required to manage subscriptions"), requestID)
		case errors.Is(err, errStripeCustomerNotFound), errors.Is(err, errStripeScheduledCancellationNotFound):
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

	user, reason, err := resolveUserFromStripeMetadata(subscription.Metadata)
	if err != nil {
		return false, "", err
	}
	if user == nil {
		return false, reason, nil
	}

	isSubscribed, subscriptionEndedAt := deriveSubscriptionState(
		event.Type,
		subscription.Status,
		subscription.CancelAtPeriodEnd,
		subscription.CancelAt,
		subscription.EndedAt,
		subscription.CanceledAt,
	)
	if err := user.UpdateSubscriptionStatus(isSubscribed, subscriptionEndedAt); err != nil {
		return false, "", err
	}

	return true, "", nil
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
	if user.Email == nil || strings.TrimSpace(*user.Email) == "" {
		return "", errUserEmailMissing
	}

	email := strings.TrimSpace(*user.Email)
	stripeCustomerID, err := findStripeCustomerIDByEmail(email)
	if err != nil {
		return "", err
	}

	return findCancelableStripeSubscriptionIDByCustomer(stripeCustomerID)
}

func findScheduledCancellationSubscriptionIDForUser(user *models.User) (string, error) {
	if user.Email == nil || strings.TrimSpace(*user.Email) == "" {
		return "", errUserEmailMissing
	}

	email := strings.TrimSpace(*user.Email)
	stripeCustomerID, err := findStripeCustomerIDByEmail(email)
	if err != nil {
		return "", err
	}

	return findScheduledCancellationSubscriptionIDByCustomer(stripeCustomerID)
}

func findStripeCustomerIDByEmail(email string) (string, error) {
	customerIter := customer.List(&stripe.CustomerListParams{
		Email: stripe.String(email),
	})

	for customerIter.Next() {
		stripeCustomer := customerIter.Customer()
		if stripeCustomer == nil || stripeCustomer.Deleted {
			continue
		}

		return stripeCustomer.ID, nil
	}

	if err := customerIter.Err(); err != nil {
		return "", err
	}

	return "", errStripeCustomerNotFound
}

func findCancelableStripeSubscriptionIDByCustomer(stripeCustomerID string) (string, error) {
	subscriptionIter := subscription.List(&stripe.SubscriptionListParams{
		Customer: stripe.String(stripeCustomerID),
		Status:   stripe.String("all"),
	})

	for subscriptionIter.Next() {
		stripeSubscription := subscriptionIter.Subscription()
		if stripeSubscription == nil {
			continue
		}

		if isCancelableStripeSubscriptionStatus(stripeSubscription.Status) {
			return stripeSubscription.ID, nil
		}
	}

	if err := subscriptionIter.Err(); err != nil {
		return "", err
	}

	return "", errStripeSubscriptionNotFound
}

func findScheduledCancellationSubscriptionIDByCustomer(stripeCustomerID string) (string, error) {
	subscriptionIter := subscription.List(&stripe.SubscriptionListParams{
		Customer: stripe.String(stripeCustomerID),
		Status:   stripe.String("all"),
	})

	for subscriptionIter.Next() {
		stripeSubscription := subscriptionIter.Subscription()
		if stripeSubscription == nil {
			continue
		}

		if stripeSubscription.CancelAtPeriodEnd && isCancelableStripeSubscriptionStatus(stripeSubscription.Status) {
			return stripeSubscription.ID, nil
		}
	}

	if err := subscriptionIter.Err(); err != nil {
		return "", err
	}

	return "", errStripeScheduledCancellationNotFound
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
