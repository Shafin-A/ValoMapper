package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"valo-mapper-api/middleware"
	"valo-mapper-api/models"
	"valo-mapper-api/utils"

	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/webhook"
)

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

	claimed, err := models.ClaimStripeWebhookEvent(r.Context(), eventID, string(event.Type))
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
		if releaseErr := models.ReleaseStripeWebhookEventClaim(r.Context(), eventID); releaseErr != nil {
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

	return models.ResolveUserForStripeSubscriptionEvent(
		subscription.Metadata,
		strings.TrimSpace(subscription.ID),
		stripeSubscriptionCustomerID(subscription),
	)
}
