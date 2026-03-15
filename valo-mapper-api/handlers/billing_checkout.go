package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
	"valo-mapper-api/middleware"
	"valo-mapper-api/models"
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
