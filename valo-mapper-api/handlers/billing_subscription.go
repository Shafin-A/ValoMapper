package handlers

import (
	"errors"
	"net/http"
	"os"
	"strings"
	"valo-mapper-api/middleware"
	"valo-mapper-api/services"
	"valo-mapper-api/utils"

	"github.com/stripe/stripe-go/v82"
)

// CancelSubscription godoc
// @Summary Cancel current subscription
// @Description Schedules cancellation at period end for the authenticated user's active subscription.
// @Tags billing
// @Produce json
// @Success 200 {object} CancelSubscriptionResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/billing/cancel-subscription [post]
func CancelSubscription(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	requestID := middleware.GetRequestID(r)

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), requestID)
		return
	}

	if !user.HasActivePersonalSubscription() {
		utils.SendJSONError(w, utils.NewBadRequest("No active subscription to cancel"), requestID)
		return
	}

	stripeSecretKey := strings.TrimSpace(os.Getenv("STRIPE_SECRET_KEY"))
	if stripeSecretKey == "" {
		utils.SendJSONError(w, utils.NewInternal("Stripe checkout is not configured", nil), requestID)
		return
	}

	stripe.Key = stripeSecretKey
	billingServiceDeps := services.BillingServiceDependencies{
		UpdateStripeSubscriptionFn: updateStripeSubscriptionFn,
		GetStripeSubscriptionFn:    getStripeSubscriptionFn,
	}
	if findCancelableStripeSubscriptionIDForUserFn != nil {
		billingServiceDeps.FindCancelableStripeSubscriptionIDForUserFn = findCancelableStripeSubscriptionIDForUserFn
	}
	billingService := services.NewBillingService(billingServiceDeps)

	updatedSubscription, err := billingService.CancelSubscription(user)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrStripeSubscriptionIDMissing), errors.Is(err, services.ErrStripeSubscriptionNotFound):
			utils.SendJSONError(w, utils.NewNotFound("Active Stripe subscription not found"), requestID)
		default:
			utils.SendJSONError(w, utils.NewInternal("Unable to cancel subscription", err), requestID)
		}
		return
	}

	utils.SendJSON(w, http.StatusOK, CancelSubscriptionResponse{
		SubscriptionID:    updatedSubscription.ID,
		Status:            string(updatedSubscription.Status),
		CancelAtPeriodEnd: updatedSubscription.CancelAtPeriodEnd,
	}, requestID)
}

// ResumeSubscription godoc
// @Summary Resume current subscription
// @Description Removes a scheduled cancellation from the authenticated user's active subscription.
// @Tags billing
// @Produce json
// @Success 200 {object} CancelSubscriptionResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/billing/resume-subscription [post]
func ResumeSubscription(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	requestID := middleware.GetRequestID(r)

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), requestID)
		return
	}

	if !user.HasActivePersonalSubscription() {
		utils.SendJSONError(w, utils.NewBadRequest("No active subscription to resume"), requestID)
		return
	}

	stripeSecretKey := strings.TrimSpace(os.Getenv("STRIPE_SECRET_KEY"))
	if stripeSecretKey == "" {
		utils.SendJSONError(w, utils.NewInternal("Stripe checkout is not configured", nil), requestID)
		return
	}

	stripe.Key = stripeSecretKey
	billingServiceDeps := services.BillingServiceDependencies{
		UpdateStripeSubscriptionFn: updateStripeSubscriptionFn,
		GetStripeSubscriptionFn:    getStripeSubscriptionFn,
	}
	if findScheduledCancellationSubscriptionIDForUserFn != nil {
		billingServiceDeps.FindScheduledCancellationSubscriptionIDForUserFn = findScheduledCancellationSubscriptionIDForUserFn
	}
	billingService := services.NewBillingService(billingServiceDeps)

	updatedSubscription, err := billingService.ResumeSubscription(user)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrStripeSubscriptionIDMissing), errors.Is(err, services.ErrStripeSubscriptionNotFound), errors.Is(err, services.ErrStripeScheduledCancellationNotFound):
			utils.SendJSONError(w, utils.NewBadRequest("No scheduled cancellation found"), requestID)
		default:
			utils.SendJSONError(w, utils.NewInternal("Unable to resume subscription", err), requestID)
		}
		return
	}

	utils.SendJSON(w, http.StatusOK, CancelSubscriptionResponse{
		SubscriptionID:    updatedSubscription.ID,
		Status:            string(updatedSubscription.Status),
		CancelAtPeriodEnd: updatedSubscription.CancelAtPeriodEnd,
	}, requestID)
}
