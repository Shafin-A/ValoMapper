package handlers

import (
	"errors"
	"net/http"
	"os"
	"strings"
	"valo-mapper-api/middleware"
	"valo-mapper-api/models"
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
