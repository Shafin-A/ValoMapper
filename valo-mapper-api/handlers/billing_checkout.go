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

// CreateCheckoutSession godoc
// @Summary Create Stripe checkout session
// @Description Creates a Stripe checkout session for a monthly or yearly plan.
// @Tags billing
// @Accept json
// @Produce json
// @Param request body CreateCheckoutSessionRequest false "Checkout request"
// @Success 200 {object} CreateCheckoutSessionResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/billing/checkout-session [post]
func CreateCheckoutSession(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	requestID := middleware.GetRequestID(r)

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), requestID)
		return
	}

	stripeSecretKey := strings.TrimSpace(os.Getenv("STRIPE_SECRET_KEY"))
	if stripeSecretKey == "" {
		utils.SendJSONError(w, utils.NewInternal("Stripe checkout is not configured", nil), requestID)
		return
	}

	stripe.Key = stripeSecretKey
	billingService := services.NewBillingService(services.BillingServiceDependencies{
		CreateStripeCheckoutSessionFn: createStripeCheckoutSessionFn,
		FindStripePriceForPlanFn: func(plan services.CheckoutPlan) (*stripe.Price, error) {
			return findStripePriceForPlanFn(checkoutPlan(plan))
		},
		GetStripeSubscriptionFn: getStripeSubscriptionFn,
	})

	checkoutRequest, err := billingService.ParseCreateCheckoutSessionRequest(r)
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), requestID)
		return
	}

	selectedPlan, err := billingService.ParseCheckoutPlan(checkoutRequest.Plan)
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Unsupported checkout plan"), requestID)
		return
	}

	stripePriceID, err := billingService.CheckoutPriceIDForPlan(selectedPlan)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Stripe checkout is not configured", nil), requestID)
		return
	}

	returnTo := billingService.SanitizeCheckoutReturnTo(checkoutRequest.ReturnTo)
	successURL := billingService.CheckoutRedirectURL("STRIPE_CHECKOUT_SUCCESS_URL", "/billing/success")
	cancelURL := billingService.CheckoutRedirectURL("STRIPE_CHECKOUT_CANCEL_URL", "/billing/cancel")
	if returnTo != "" {
		successURL = billingService.AppendReturnToQuery(successURL, returnTo)
		cancelURL = billingService.AppendReturnToQuery(cancelURL, returnTo)
	}

	checkoutSession, err := billingService.CreateCheckoutSession(
		r.Context(),
		user.ID,
		selectedPlan,
		checkoutRequest.StartWithTrial,
		stripePriceID,
		successURL,
		cancelURL,
	)
	if err != nil {
		if errors.Is(err, services.ErrCheckoutActiveSubscriptionExists) {
			utils.SendJSONError(w, utils.NewConflict("Active subscription already exists", nil), requestID)
			return
		}

		utils.SendJSONError(w, utils.NewInternal("Unable to create checkout session", err), requestID)
		return
	}

	utils.SendJSON(w, http.StatusOK, CreateCheckoutSessionResponse{
		SessionID: checkoutSession.ID,
		URL:       checkoutSession.URL,
	}, requestID)
}
