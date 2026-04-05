package handlers

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"valo-mapper-api/middleware"
	"valo-mapper-api/models"
	"valo-mapper-api/services"
	"valo-mapper-api/utils"

	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/webhook"
)

// HandleStripeWebhook godoc
// @Summary Stripe webhook receiver
// @Description Validates and processes Stripe subscription-related webhook events.
// @Tags billing
// @Accept json
// @Produce json
// @Param Stripe-Signature header string true "Stripe webhook signature"
// @Success 200 {object} StripeWebhookResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/billing/webhook [post]
func HandleStripeWebhook(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r)

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
		slog.Info("stripe webhook duplicate ignored", "request_id", requestID, "event_id", eventID, "event_type", event.Type)
		utils.SendJSON(w, http.StatusOK, map[string]string{
			"status":  "ignored",
			"reason":  "duplicate-event",
			"eventId": eventID,
		}, requestID)
		return
	}

	billingService := services.NewBillingService(services.BillingServiceDependencies{})
	processed, reason, err := billingService.ProcessStripeSubscriptionEvent(event)
	if err != nil {
		if releaseErr := models.ReleaseStripeWebhookEventClaim(r.Context(), eventID); releaseErr != nil {
			slog.Error("failed to release stripe webhook event claim", "request_id", requestID, "event_id", eventID, "error", releaseErr)
		}
		utils.SendJSONError(w, utils.NewInternal("Unable to process Stripe event", err), requestID)
		return
	}

	if !processed {
		slog.Info("stripe webhook ignored", "request_id", requestID, "event_type", event.Type, "reason", reason)
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
