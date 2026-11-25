package services

import (
	"encoding/json"
	"errors"
	"strings"
	"time"
	"valo-mapper-api/models"

	"github.com/stripe/stripe-go/v82"
)

func (bs *BillingService) ProcessStripeSubscriptionEvent(event stripe.Event) (bool, string, error) {
	if !isSupportedStripeSubscriptionEvent(event.Type) {
		return false, ErrStripeUnsupportedSubscriptionEvent.Error(), nil
	}

	var stripeSubscription stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &stripeSubscription); err != nil {
		return false, ErrInvalidStripeEventPayload.Error(), err
	}

	user, reason, err := resolveUserFromStripeSubscription(&stripeSubscription)
	if err != nil {
		return false, "", err
	}
	if user == nil {
		return false, reason, nil
	}

	nextStripeCustomerID := user.StripeCustomerID
	stripeCustomerID := stripeSubscriptionCustomerID(&stripeSubscription)
	if stripeCustomerID != "" {
		nextStripeCustomerID = &stripeCustomerID
	}

	nextStripeSubscriptionID := user.StripeSubscriptionID
	stripeSubscriptionID := strings.TrimSpace(stripeSubscription.ID)
	if stripeSubscriptionID != "" {
		nextStripeSubscriptionID = &stripeSubscriptionID
	}

	isSubscribed, subscriptionEndedAt := deriveSubscriptionState(
		event.Type,
		stripeSubscription.Status,
		stripeSubscription.CancelAtPeriodEnd,
		stripeSubscription.CancelAt,
		stripeSubscription.EndedAt,
		stripeSubscription.CanceledAt,
	)
	subscriptionTrialEndsAt := deriveSubscriptionTrialEndsAt(
		event.Type,
		stripeSubscription.Status,
		stripeSubscription.TrialEnd,
	)

	var subscriptionPlan *string
	if planVal := strings.TrimSpace(stripeSubscription.Metadata["plan"]); planVal != "" && isSubscribed {
		subscriptionPlan = &planVal
	}

	if err := user.UpdateStripeBillingState(nextStripeCustomerID, nextStripeSubscriptionID, isSubscribed, subscriptionEndedAt, subscriptionTrialEndsAt, subscriptionPlan); err != nil {
		return false, "", err
	}

	trialApplied := strings.EqualFold(strings.TrimSpace(stripeSubscription.Metadata["trialApplied"]), "true")
	if subscriptionTrialEndsAt != nil && trialApplied {
		if _, err := user.ClaimPremiumTrial(); err != nil {
			return false, "", err
		}
	}

	return true, "", nil
}

func isStripeResourceMissingError(err error) bool {
	var stripeErr *stripe.Error
	if !errors.As(err, &stripeErr) {
		return false
	}

	if stripeErr.Code == stripe.ErrorCodeResourceMissing {
		return true
	}

	return strings.Contains(strings.ToLower(strings.TrimSpace(stripeErr.Msg)), "no such customer")
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

func deriveSubscriptionTrialEndsAt(
	eventType stripe.EventType,
	status stripe.SubscriptionStatus,
	trialEnd int64,
) *time.Time {
	if eventType == stripe.EventTypeCustomerSubscriptionDeleted {
		return nil
	}

	if status != stripe.SubscriptionStatusTrialing || trialEnd <= 0 {
		return nil
	}

	endsAt := time.Unix(trialEnd, 0).UTC()
	return &endsAt
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

func stripeSubscriptionCustomerID(stripeSubscription *stripe.Subscription) string {
	if stripeSubscription == nil || stripeSubscription.Customer == nil {
		return ""
	}

	return strings.TrimSpace(stripeSubscription.Customer.ID)
}

func resolveUserFromStripeSubscription(subscription *stripe.Subscription) (*models.User, string, error) {
	if subscription == nil {
		return nil, ErrInvalidStripeEventPayload.Error(), nil
	}

	return models.ResolveUserForStripeSubscriptionEvent(
		subscription.Metadata,
		strings.TrimSpace(subscription.ID),
		stripeSubscriptionCustomerID(subscription),
	)
}
