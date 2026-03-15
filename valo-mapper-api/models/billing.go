package models

import (
	"context"
	"strconv"
	"strings"
	"valo-mapper-api/db"
)

func ClaimStripeWebhookEvent(ctx context.Context, eventID, eventType string) (bool, error) {
	conn, err := db.GetDB()
	if err != nil {
		return false, err
	}

	cmdTag, err := conn.Exec(ctx, `
		INSERT INTO stripe_webhook_events (event_id, event_type, processed_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (event_id) DO NOTHING
	`, eventID, eventType)
	if err != nil {
		return false, err
	}

	return cmdTag.RowsAffected() == 1, nil
}

func ReleaseStripeWebhookEventClaim(ctx context.Context, eventID string) error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	_, err = conn.Exec(ctx, `DELETE FROM stripe_webhook_events WHERE event_id = $1`, eventID)
	return err
}

func ResolveUserForStripeSubscriptionEvent(metadata map[string]string, stripeSubscriptionID, stripeCustomerID string) (*User, string, error) {
	user, reason, err := resolveUserFromStripeMetadata(metadata)
	if err != nil {
		return nil, "", err
	}
	if user != nil {
		return user, "", nil
	}

	if stripeSubscriptionID != "" {
		userBySubscriptionID, lookupErr := GetUserByStripeSubscriptionID(stripeSubscriptionID)
		if lookupErr != nil {
			return nil, "", lookupErr
		}
		if userBySubscriptionID != nil {
			return userBySubscriptionID, "", nil
		}
	}

	if stripeCustomerID != "" {
		userByCustomerID, lookupErr := GetUserByStripeCustomerID(stripeCustomerID)
		if lookupErr != nil {
			return nil, "", lookupErr
		}
		if userByCustomerID != nil {
			return userByCustomerID, "", nil
		}
	}

	if reason != "" {
		return nil, reason, nil
	}

	return nil, "user-not-found", nil
}

func resolveUserFromStripeMetadata(metadata map[string]string) (*User, string, error) {
	userIDRaw := firstNonEmptyMetadataValue(metadata, "userId", "user_id")
	firebaseUID := firstNonEmptyMetadataValue(metadata, "firebaseUid", "firebase_uid")

	if userIDRaw != "" {
		userID, err := strconv.Atoi(userIDRaw)
		if err == nil {
			user, lookupErr := GetUserByID(userID)
			if lookupErr != nil {
				return nil, "", lookupErr
			}
			if user != nil {
				return user, "", nil
			}
			if firebaseUID == "" {
				return nil, "user-not-found", nil
			}
		} else if firebaseUID == "" {
			return nil, "invalid-user-id-metadata", nil
		}
	}

	if firebaseUID != "" {
		user, err := GetUserByFirebaseUID(firebaseUID)
		if err != nil {
			return nil, "", err
		}
		if user != nil {
			return user, "", nil
		}
		return nil, "user-not-found", nil
	}

	return nil, "missing-user-identifier", nil
}

func firstNonEmptyMetadataValue(metadata map[string]string, keys ...string) string {
	for _, key := range keys {
		value := strings.TrimSpace(metadata[key])
		if value != "" {
			return value
		}
	}

	return ""
}
