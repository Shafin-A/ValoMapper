package services

import (
	"os"
	"strings"

	"github.com/stripe/stripe-go/v82"
)

func checkoutLookupKeyForPlan(plan CheckoutPlan) (string, error) {
	switch plan {
	case CheckoutPlanMonthly:
		lookupKey := strings.TrimSpace(os.Getenv("STRIPE_PRICE_LOOKUP_KEY_MONTHLY"))
		if lookupKey == "" {
			lookupKey = defaultMonthlyPriceLookupKey
		}

		return lookupKey, nil
	case CheckoutPlanYearly:
		lookupKey := strings.TrimSpace(os.Getenv("STRIPE_PRICE_LOOKUP_KEY_YEARLY"))
		if lookupKey == "" {
			lookupKey = defaultYearlyPriceLookupKey
		}

		return lookupKey, nil
	case CheckoutPlanStack:
		lookupKey := strings.TrimSpace(os.Getenv("STRIPE_PRICE_LOOKUP_KEY_STACK"))
		if lookupKey == "" {
			lookupKey = defaultStackPriceLookupKey
		}

		return lookupKey, nil
	default:
		return "", ErrUnsupportedCheckoutPlan
	}
}

func expectedIntervalForPlan(plan CheckoutPlan) (stripe.PriceRecurringInterval, error) {
	switch plan {
	case CheckoutPlanMonthly:
		return stripe.PriceRecurringIntervalMonth, nil
	case CheckoutPlanYearly, CheckoutPlanStack:
		return stripe.PriceRecurringIntervalYear, nil
	default:
		return "", ErrUnsupportedCheckoutPlan
	}
}

func firstServiceAllowedOrigin() string {
	origins := strings.SplitSeq(os.Getenv("ALLOWED_ORIGINS"), ",")
	for origin := range origins {
		trimmed := strings.TrimSpace(origin)
		if trimmed != "" {
			return trimmed
		}
	}

	return "http://localhost:3000"
}
