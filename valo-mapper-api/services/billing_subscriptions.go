package services

import (
	"strings"
	"time"
	"valo-mapper-api/models"

	"github.com/stripe/stripe-go/v82"
)

func (bs *BillingService) CancelSubscription(user *models.User) (*stripe.Subscription, error) {
	subscriptionID, err := bs.findCancelableStripeSubscriptionIDForUser(user)
	if err != nil {
		return nil, err
	}

	updatedSubscription, err := bs.updateStripeSubscriptionFn(subscriptionID, &stripe.SubscriptionParams{
		CancelAtPeriodEnd: stripe.Bool(true),
	})
	if err != nil {
		return nil, err
	}

	isSubscribed, subscriptionEndedAt := deriveSubscriptionState(
		stripe.EventTypeCustomerSubscriptionUpdated,
		updatedSubscription.Status,
		updatedSubscription.CancelAtPeriodEnd,
		updatedSubscription.CancelAt,
	)
	if err := user.UpdateSubscriptionStatus(isSubscribed, subscriptionEndedAt); err != nil {
		return nil, err
	}

	return updatedSubscription, nil
}

func (bs *BillingService) ResumeSubscription(user *models.User) (*stripe.Subscription, error) {
	subscriptionID, err := bs.findScheduledCancellationSubscriptionIDForUser(user)
	if err != nil {
		return nil, err
	}

	updatedSubscription, err := bs.updateStripeSubscriptionFn(subscriptionID, &stripe.SubscriptionParams{
		CancelAtPeriodEnd: stripe.Bool(false),
	})
	if err != nil {
		return nil, err
	}

	isSubscribed, subscriptionEndedAt := deriveSubscriptionState(
		stripe.EventTypeCustomerSubscriptionUpdated,
		updatedSubscription.Status,
		updatedSubscription.CancelAtPeriodEnd,
		updatedSubscription.CancelAt,
	)
	if err := user.UpdateSubscriptionStatus(isSubscribed, subscriptionEndedAt); err != nil {
		return nil, err
	}

	return updatedSubscription, nil
}

func (bs *BillingService) findCancelableStripeSubscriptionIDForUser(user *models.User) (string, error) {
	if bs.findCancelableStripeSubscriptionIDForUserFn != nil {
		return bs.findCancelableStripeSubscriptionIDForUserFn(user)
	}

	stripeSubscription, err := bs.findStripeSubscriptionForUser(user)
	if err != nil {
		return "", err
	}

	if !isCancelableStripeSubscriptionStatus(stripeSubscription.Status) {
		return "", ErrStripeSubscriptionNotFound
	}

	return strings.TrimSpace(stripeSubscription.ID), nil
}

func (bs *BillingService) findScheduledCancellationSubscriptionIDForUser(user *models.User) (string, error) {
	if bs.findScheduledCancellationSubscriptionIDForUserFn != nil {
		return bs.findScheduledCancellationSubscriptionIDForUserFn(user)
	}

	stripeSubscription, err := bs.findStripeSubscriptionForUser(user)
	if err != nil {
		return "", err
	}

	if !stripeSubscription.CancelAtPeriodEnd || !isCancelableStripeSubscriptionStatus(stripeSubscription.Status) {
		return "", ErrStripeScheduledCancellationNotFound
	}

	return strings.TrimSpace(stripeSubscription.ID), nil
}

func (bs *BillingService) findStripeSubscriptionForUser(user *models.User) (*stripe.Subscription, error) {
	if user.StripeSubscriptionID == nil || strings.TrimSpace(*user.StripeSubscriptionID) == "" {
		return nil, ErrStripeSubscriptionIDMissing
	}

	stripeSubscriptionID := strings.TrimSpace(*user.StripeSubscriptionID)
	stripeSubscription, err := bs.getStripeSubscriptionFn(stripeSubscriptionID, nil)
	if err != nil {
		if isStripeResourceMissingError(err) {
			if updateErr := user.UpdateStripeBillingState(user.StripeCustomerID, nil, user.PersonalIsSubscribed, user.PersonalSubscriptionEndedAt, user.PersonalSubscriptionTrialEndsAt, user.PersonalSubscriptionPlan); updateErr != nil {
				return nil, updateErr
			}

			return nil, ErrStripeSubscriptionNotFound
		}

		return nil, err
	}

	if stripeSubscription == nil || strings.TrimSpace(stripeSubscription.ID) == "" {
		return nil, ErrStripeSubscriptionNotFound
	}

	return stripeSubscription, nil
}

func (bs *BillingService) SchedulePersonalSubscriptionCancellationForStackJoin(user *models.User) error {
	if user == nil || !user.HasActivePersonalSubscription() || user.StripeSubscriptionID == nil || strings.TrimSpace(*user.StripeSubscriptionID) == "" {
		return nil
	}

	stripeSubscriptionID := strings.TrimSpace(*user.StripeSubscriptionID)
	stripeSubscription, err := bs.getStripeSubscriptionFn(stripeSubscriptionID, nil)
	if err != nil {
		if isStripeResourceMissingError(err) {
			now := time.Now().UTC()
			return user.UpdateStripeBillingState(user.StripeCustomerID, nil, false, &now, nil, nil)
		}

		return err
	}

	if stripeSubscription == nil || strings.TrimSpace(stripeSubscription.ID) == "" {
		return nil
	}

	if !isCancelableStripeSubscriptionStatus(stripeSubscription.Status) {
		return nil
	}

	if stripeSubscription.CancelAtPeriodEnd {
		return bs.syncUserPersonalBillingFromStripeSubscription(user, stripeSubscription)
	}

	updatedSubscription, err := bs.updateStripeSubscriptionFn(strings.TrimSpace(stripeSubscription.ID), &stripe.SubscriptionParams{
		CancelAtPeriodEnd: stripe.Bool(true),
	})
	if err != nil {
		return err
	}

	return bs.syncUserPersonalBillingFromStripeSubscription(user, updatedSubscription)
}

func (bs *BillingService) syncUserPersonalBillingFromStripeSubscription(user *models.User, stripeSubscription *stripe.Subscription) error {
	if user == nil || stripeSubscription == nil {
		return nil
	}

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

	isSubscribed, subscriptionEndedAt := deriveSubscriptionState(
		stripe.EventTypeCustomerSubscriptionUpdated,
		stripeSubscription.Status,
		stripeSubscription.CancelAtPeriodEnd,
		stripeSubscription.CancelAt,
		stripeSubscription.EndedAt,
		stripeSubscription.CanceledAt,
	)
	subscriptionTrialEndsAt := deriveSubscriptionTrialEndsAt(
		stripe.EventTypeCustomerSubscriptionUpdated,
		stripeSubscription.Status,
		stripeSubscription.TrialEnd,
	)

	updatedPlan := user.PersonalSubscriptionPlan
	if updatedPlan == nil {
		if planVal := strings.TrimSpace(stripeSubscription.Metadata["plan"]); planVal != "" {
			updatedPlan = &planVal
		}
	}
	if !isSubscribed {
		updatedPlan = nil
	}

	return user.UpdateStripeBillingState(nextStripeCustomerID, nextStripeSubscriptionID, isSubscribed, subscriptionEndedAt, subscriptionTrialEndsAt, updatedPlan)
}
