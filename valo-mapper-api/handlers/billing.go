package handlers

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"valo-mapper-api/db"
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

	isSubscribed := stripeSubscriptionRepresentsActiveAccess(event.Type, subscription.Status)
	if err := applySubscriptionStatusUpdate(user, isSubscribed); err != nil {
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
