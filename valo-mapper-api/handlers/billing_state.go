package handlers

import (
	"time"

	"github.com/stripe/stripe-go/v82"
)

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

func deriveSubscriptionState(
	eventType stripe.EventType,
	status stripe.SubscriptionStatus,
	cancelAtPeriodEnd bool,
	cancelAt int64,
	downgradedEndedAtCandidates ...int64,
) (bool, *time.Time) {
	isSubscribed := stripeSubscriptionRepresentsActiveAccess(eventType, status)
	if !isSubscribed {
		if stripeEndedAt := firstPositiveUnixTime(downgradedEndedAtCandidates...); stripeEndedAt != nil {
			return false, stripeEndedAt
		}

		now := time.Now().UTC()
		return false, &now
	}

	if cancelAtPeriodEnd && cancelAt > 0 {
		endsAt := time.Unix(cancelAt, 0).UTC()
		return true, &endsAt
	}

	return true, nil
}

func firstPositiveUnixTime(values ...int64) *time.Time {
	for _, value := range values {
		if value <= 0 {
			continue
		}

		ts := time.Unix(value, 0).UTC()
		return &ts
	}

	return nil
}
