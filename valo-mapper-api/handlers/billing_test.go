package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"
	"valo-mapper-api/models"
	"valo-mapper-api/testutils"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stripe/stripe-go/v82/webhook"
)

func TestHandleStripeWebhook(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "users", "stripe_webhook_events")

	const webhookSecret = "whsec_test_secret"
	originalSecret, hadOriginal := os.LookupEnv("STRIPE_WEBHOOK_SECRET")
	_ = os.Setenv("STRIPE_WEBHOOK_SECRET", webhookSecret)
	defer func() {
		if hadOriginal {
			_ = os.Setenv("STRIPE_WEBHOOK_SECRET", originalSecret)
			return
		}
		_ = os.Unsetenv("STRIPE_WEBHOOK_SECRET")
	}()

	t.Run("activates user subscription from updated event", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-stripe-uid-1")
		_, err := pool.Exec(context.Background(), `UPDATE users SET is_subscribed = FALSE, subscription_ended_at = NOW() WHERE id = $1`, testUser.ID)
		assert.NoError(t, err)

		payload := buildStripeSubscriptionEventPayload(t, "customer.subscription.updated", "active", map[string]string{
			"firebaseUid": *testUser.FirebaseUID,
		})

		req := newSignedStripeWebhookRequest(payload, webhookSecret)
		w := httptest.NewRecorder()

		HandleStripeWebhook(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		updatedUser, err := models.GetUserByID(testUser.ID)
		assert.NoError(t, err)
		assert.NotNil(t, updatedUser)
		assert.True(t, updatedUser.IsSubscribed)
		assert.Nil(t, updatedUser.SubscriptionEndedAt)
	})

	t.Run("downgrades user subscription from deleted event", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-stripe-uid-2")
		_, err := pool.Exec(context.Background(), `UPDATE users SET is_subscribed = TRUE, subscription_ended_at = NULL WHERE id = $1`, testUser.ID)
		assert.NoError(t, err)

		payload := buildStripeSubscriptionEventPayload(t, "customer.subscription.deleted", "canceled", map[string]string{
			"userId": fmt.Sprintf("%d", testUser.ID),
		})

		req := newSignedStripeWebhookRequest(payload, webhookSecret)
		w := httptest.NewRecorder()

		HandleStripeWebhook(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		updatedUser, err := models.GetUserByID(testUser.ID)
		assert.NoError(t, err)
		assert.NotNil(t, updatedUser)
		assert.False(t, updatedUser.IsSubscribed)
		assert.NotNil(t, updatedUser.SubscriptionEndedAt)
	})

	t.Run("ignores unsupported event types", func(t *testing.T) {
		payload := buildStripeEventPayload(t, "", "invoice.paid", map[string]any{
			"id":     "in_test",
			"object": "invoice",
		})

		req := newSignedStripeWebhookRequest(payload, webhookSecret)
		w := httptest.NewRecorder()

		HandleStripeWebhook(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var response map[string]string
		testutils.ParseJSONResponse(t, w, &response)
		assert.Equal(t, "ignored", response["status"])
		assert.Equal(t, "unsupported-event-type", response["reason"])
	})

	t.Run("rejects invalid signature", func(t *testing.T) {
		payload := buildStripeSubscriptionEventPayload(t, "customer.subscription.updated", "active", map[string]string{
			"firebaseUid": "missing-user",
		})

		req := newSignedStripeWebhookRequest(payload, "wrong-secret")
		w := httptest.NewRecorder()

		HandleStripeWebhook(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("ignores events without user identifiers", func(t *testing.T) {
		payload := buildStripeSubscriptionEventPayload(t, "customer.subscription.updated", "active", map[string]string{})

		req := newSignedStripeWebhookRequest(payload, webhookSecret)
		w := httptest.NewRecorder()

		HandleStripeWebhook(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var response map[string]string
		testutils.ParseJSONResponse(t, w, &response)
		assert.Equal(t, "ignored", response["status"])
		assert.Equal(t, "missing-user-identifier", response["reason"])
	})

	t.Run("ignores duplicate event deliveries", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-stripe-uid-duplicate")
		_, err := pool.Exec(context.Background(), `UPDATE users SET is_subscribed = FALSE, subscription_ended_at = NOW() WHERE id = $1`, testUser.ID)
		assert.NoError(t, err)

		payload := buildStripeSubscriptionEventPayloadWithID(t, "evt_duplicate_delivery", "customer.subscription.updated", "active", map[string]string{
			"firebaseUid": *testUser.FirebaseUID,
		})

		firstReq := newSignedStripeWebhookRequest(payload, webhookSecret)
		firstResp := httptest.NewRecorder()
		HandleStripeWebhook(firstResp, firstReq)
		assert.Equal(t, http.StatusOK, firstResp.Code)

		secondReq := newSignedStripeWebhookRequest(payload, webhookSecret)
		secondResp := httptest.NewRecorder()
		HandleStripeWebhook(secondResp, secondReq)
		assert.Equal(t, http.StatusOK, secondResp.Code)

		var response map[string]string
		testutils.ParseJSONResponse(t, secondResp, &response)
		assert.Equal(t, "ignored", response["status"])
		assert.Equal(t, "duplicate-event", response["reason"])

		updatedUser, err := models.GetUserByID(testUser.ID)
		assert.NoError(t, err)
		assert.NotNil(t, updatedUser)
		assert.True(t, updatedUser.IsSubscribed)
		assert.Nil(t, updatedUser.SubscriptionEndedAt)
	})
}

func newSignedStripeWebhookRequest(payload []byte, secret string) *http.Request {
	signedPayload := webhook.GenerateTestSignedPayload(&webhook.UnsignedPayload{
		Payload:   payload,
		Secret:    secret,
		Timestamp: time.Now(),
	})

	req := httptest.NewRequest(http.MethodPost, "/api/billing/webhook", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Stripe-Signature", signedPayload.Header)
	return req
}

func buildStripeSubscriptionEventPayload(t *testing.T, eventType, status string, metadata map[string]string) []byte {
	t.Helper()

	return buildStripeSubscriptionEventPayloadWithID(t, "", eventType, status, metadata)
}

func buildStripeSubscriptionEventPayloadWithID(t *testing.T, eventID, eventType, status string, metadata map[string]string) []byte {
	t.Helper()

	subscriptionObject := map[string]any{
		"id":       "sub_test",
		"object":   "subscription",
		"status":   status,
		"metadata": metadata,
	}

	return buildStripeEventPayload(t, eventID, eventType, subscriptionObject)
}

func buildStripeEventPayload(t *testing.T, eventID, eventType string, dataObject map[string]any) []byte {
	t.Helper()

	if eventID == "" {
		eventID = "evt_" + uuid.NewString()
	}

	payload, err := json.Marshal(map[string]any{
		"id":   eventID,
		"type": eventType,
		"data": map[string]any{
			"object": dataObject,
		},
	})
	if err != nil {
		t.Fatalf("failed to build stripe event payload: %v", err)
	}

	return payload
}
