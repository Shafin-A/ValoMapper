package handlers

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"valo-mapper-api/middleware"
	"valo-mapper-api/utils"

	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/price"
)

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
