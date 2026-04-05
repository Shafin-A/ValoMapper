package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"valo-mapper-api/middleware"
	"valo-mapper-api/services"
	"valo-mapper-api/utils"

	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/price"
)

// GetBillingPlans godoc
// @Summary Get billing plans
// @Description Returns Stripe-backed monthly and yearly pricing details.
// @Tags billing
// @Produce json
// @Success 200 {object} BillingPlansResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/billing/plans [get]
func GetBillingPlans(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r)

	stripeSecretKey := strings.TrimSpace(os.Getenv("STRIPE_SECRET_KEY"))
	if stripeSecretKey == "" {
		utils.SendJSONError(w, utils.NewInternal("Stripe checkout is not configured", nil), requestID)
		return
	}

	stripe.Key = stripeSecretKey
	billingService := services.NewBillingService(services.BillingServiceDependencies{
		FindStripePriceForPlanFn: func(plan services.CheckoutPlan) (*stripe.Price, error) {
			return findStripePriceForPlanFn(checkoutPlan(plan))
		},
	})

	plansResponse, err := billingService.GetBillingPlans()
	if err != nil {
		if errors.Is(err, services.ErrCheckoutPlanUnavailable) {
			utils.SendJSONError(w, utils.NewInternal("Stripe billing plan configuration is invalid", err), requestID)
			return
		}
		utils.SendJSONError(w, utils.NewInternal("Stripe checkout is not configured", nil), requestID)
		return
	}

	utils.SendJSON(w, http.StatusOK, BillingPlansResponse{
		Monthly: BillingPlanPriceResponse{
			Plan:              plansResponse.Monthly.Plan,
			PriceID:           plansResponse.Monthly.PriceID,
			Currency:          plansResponse.Monthly.Currency,
			UnitAmount:        plansResponse.Monthly.UnitAmount,
			UnitAmountDecimal: plansResponse.Monthly.UnitAmountDecimal,
			Interval:          plansResponse.Monthly.Interval,
			IntervalCount:     plansResponse.Monthly.IntervalCount,
		},
		Yearly: BillingPlanPriceResponse{
			Plan:              plansResponse.Yearly.Plan,
			PriceID:           plansResponse.Yearly.PriceID,
			Currency:          plansResponse.Yearly.Currency,
			UnitAmount:        plansResponse.Yearly.UnitAmount,
			UnitAmountDecimal: plansResponse.Yearly.UnitAmountDecimal,
			Interval:          plansResponse.Yearly.Interval,
			IntervalCount:     plansResponse.Yearly.IntervalCount,
		},
		Stack: BillingPlanPriceResponse{
			Plan:              plansResponse.Stack.Plan,
			PriceID:           plansResponse.Stack.PriceID,
			Currency:          plansResponse.Stack.Currency,
			UnitAmount:        plansResponse.Stack.UnitAmount,
			UnitAmountDecimal: plansResponse.Stack.UnitAmountDecimal,
			Interval:          plansResponse.Stack.Interval,
			IntervalCount:     plansResponse.Stack.IntervalCount,
		},
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
	case checkoutPlanStack:
		lookupKey := strings.TrimSpace(os.Getenv("STRIPE_PRICE_LOOKUP_KEY_STACK"))
		if lookupKey == "" {
			lookupKey = defaultStackPriceLookupKey
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
	case checkoutPlanYearly, checkoutPlanStack:
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
