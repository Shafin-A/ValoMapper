package services

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/price"
)

func (bs *BillingService) GetBillingPlans() (BillingPlansResponse, error) {
	monthlyPrice, err := bs.findStripePriceForPlan(CheckoutPlanMonthly)
	if err != nil {
		return BillingPlansResponse{}, err
	}

	yearlyPrice, err := bs.findStripePriceForPlan(CheckoutPlanYearly)
	if err != nil {
		return BillingPlansResponse{}, err
	}

	stackPrice, err := bs.findStripePriceForPlan(CheckoutPlanStack)
	if err != nil {
		return BillingPlansResponse{}, err
	}

	monthlyResponse, err := bs.buildBillingPlanPriceResponse(CheckoutPlanMonthly, monthlyPrice)
	if err != nil {
		return BillingPlansResponse{}, err
	}
	yearlyResponse, err := bs.buildBillingPlanPriceResponse(CheckoutPlanYearly, yearlyPrice)
	if err != nil {
		return BillingPlansResponse{}, err
	}
	stackResponse, err := bs.buildBillingPlanPriceResponse(CheckoutPlanStack, stackPrice)
	if err != nil {
		return BillingPlansResponse{}, err
	}

	return BillingPlansResponse{
		Monthly: monthlyResponse,
		Yearly:  yearlyResponse,
		Stack:   stackResponse,
	}, nil
}

func (bs *BillingService) findStripePriceForPlan(plan CheckoutPlan) (*stripe.Price, error) {
	if bs.findStripePriceForPlanFn != nil {
		return bs.findStripePriceForPlanFn(plan)
	}

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

	return nil, fmt.Errorf("%w: lookup key %s", ErrCheckoutPlanUnavailable, lookupKey)
}

func (bs *BillingService) buildBillingPlanPriceResponse(plan CheckoutPlan, stripePrice *stripe.Price) (BillingPlanPriceResponse, error) {
	if stripePrice == nil || stripePrice.Recurring == nil {
		return BillingPlanPriceResponse{}, ErrCheckoutPlanUnavailable
	}

	expectedInterval := string(stripe.PriceRecurringIntervalMonth)
	if plan == CheckoutPlanYearly || plan == CheckoutPlanStack {
		expectedInterval = string(stripe.PriceRecurringIntervalYear)
	}

	actualInterval := string(stripePrice.Recurring.Interval)
	if actualInterval != expectedInterval {
		return BillingPlanPriceResponse{}, ErrCheckoutPlanUnavailable
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
