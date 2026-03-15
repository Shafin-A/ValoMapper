package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"
	"time"
	"valo-mapper-api/models"
	"valo-mapper-api/testutils"

	"firebase.google.com/go/v4/auth"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/webhook"
)

func TestCreateCheckoutSession(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "users")

	originalCreateFn := createStripeCheckoutSessionFn
	defer func() {
		createStripeCheckoutSessionFn = originalCreateFn
	}()

	originalSecret, hadSecret := os.LookupEnv("STRIPE_SECRET_KEY")
	originalMonthlyPrice, hadMonthlyPrice := os.LookupEnv("STRIPE_PRICE_ID_MONTHLY")
	originalYearlyPrice, hadYearlyPrice := os.LookupEnv("STRIPE_PRICE_ID_YEARLY")
	originalSuccessURL, hadSuccessURL := os.LookupEnv("STRIPE_CHECKOUT_SUCCESS_URL")
	originalCancelURL, hadCancelURL := os.LookupEnv("STRIPE_CHECKOUT_CANCEL_URL")

	_ = os.Setenv("STRIPE_SECRET_KEY", "sk_test_checkout")
	_ = os.Setenv("STRIPE_PRICE_ID_MONTHLY", "price_test_checkout")
	_ = os.Unsetenv("STRIPE_PRICE_ID_YEARLY")
	_ = os.Setenv("STRIPE_CHECKOUT_SUCCESS_URL", "http://localhost:3000/checkout/success")
	_ = os.Setenv("STRIPE_CHECKOUT_CANCEL_URL", "http://localhost:3000/checkout/cancel")

	defer func() {
		if hadSecret {
			_ = os.Setenv("STRIPE_SECRET_KEY", originalSecret)
		} else {
			_ = os.Unsetenv("STRIPE_SECRET_KEY")
		}
		if hadMonthlyPrice {
			_ = os.Setenv("STRIPE_PRICE_ID_MONTHLY", originalMonthlyPrice)
		} else {
			_ = os.Unsetenv("STRIPE_PRICE_ID_MONTHLY")
		}
		if hadYearlyPrice {
			_ = os.Setenv("STRIPE_PRICE_ID_YEARLY", originalYearlyPrice)
		} else {
			_ = os.Unsetenv("STRIPE_PRICE_ID_YEARLY")
		}
		if hadSuccessURL {
			_ = os.Setenv("STRIPE_CHECKOUT_SUCCESS_URL", originalSuccessURL)
		} else {
			_ = os.Unsetenv("STRIPE_CHECKOUT_SUCCESS_URL")
		}
		if hadCancelURL {
			_ = os.Setenv("STRIPE_CHECKOUT_CANCEL_URL", originalCancelURL)
		} else {
			_ = os.Unsetenv("STRIPE_CHECKOUT_CANCEL_URL")
		}
	}()

	mockAuth := &testutils.MockFirebaseAuth{}

	t.Run("creates checkout session with subscription metadata", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-checkout-uid-1")
		const returnToPath = "/ABCD123?tab=map"

		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: *testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: *testUser.Email},
				EmailVerified: true,
			}, nil
		}

		var capturedParams *stripe.CheckoutSessionParams
		createStripeCheckoutSessionFn = func(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
			capturedParams = params
			return &stripe.CheckoutSession{
				ID:  "cs_test_123",
				URL: "https://checkout.stripe.com/c/pay/cs_test_123",
			}, nil
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/checkout-session", map[string]string{
			"returnTo": returnToPath,
		}, "valid-token")
		w := httptest.NewRecorder()

		CreateCheckoutSession(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)

		var response CreateCheckoutSessionResponse
		testutils.ParseJSONResponse(t, w, &response)
		assert.Equal(t, "cs_test_123", response.SessionID)
		assert.Equal(t, "https://checkout.stripe.com/c/pay/cs_test_123", response.URL)

		if assert.NotNil(t, capturedParams) {
			assert.Equal(t, string(stripe.CheckoutSessionModeSubscription), stripe.StringValue(capturedParams.Mode))
			assert.Equal(t, "http://localhost:3000/checkout/success?returnTo=%2FABCD123%3Ftab%3Dmap", stripe.StringValue(capturedParams.SuccessURL))
			assert.Equal(t, "http://localhost:3000/checkout/cancel?returnTo=%2FABCD123%3Ftab%3Dmap", stripe.StringValue(capturedParams.CancelURL))
			if assert.Len(t, capturedParams.LineItems, 1) {
				assert.Equal(t, "price_test_checkout", stripe.StringValue(capturedParams.LineItems[0].Price))
				assert.Equal(t, int64(1), stripe.Int64Value(capturedParams.LineItems[0].Quantity))
			}
			assert.Equal(t, strconv.Itoa(testUser.ID), capturedParams.Metadata["userId"])
			assert.Equal(t, *testUser.FirebaseUID, capturedParams.Metadata["firebaseUid"])
			if assert.NotNil(t, capturedParams.SubscriptionData) {
				assert.Equal(t, strconv.Itoa(testUser.ID), capturedParams.SubscriptionData.Metadata["userId"])
				assert.Equal(t, *testUser.FirebaseUID, capturedParams.SubscriptionData.Metadata["firebaseUid"])
			}
		}
	})

	t.Run("uses yearly plan price when requested", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-checkout-uid-yearly")

		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: *testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: *testUser.Email},
				EmailVerified: true,
			}, nil
		}

		_ = os.Setenv("STRIPE_PRICE_ID_MONTHLY", "price_test_checkout")
		_ = os.Setenv("STRIPE_PRICE_ID_YEARLY", "price_test_checkout_yearly")
		defer os.Unsetenv("STRIPE_PRICE_ID_YEARLY")

		var capturedParams *stripe.CheckoutSessionParams
		createStripeCheckoutSessionFn = func(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
			capturedParams = params
			return &stripe.CheckoutSession{
				ID:  "cs_test_yearly",
				URL: "https://checkout.stripe.com/c/pay/cs_test_yearly",
			}, nil
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/checkout-session", map[string]string{
			"plan": "yearly",
		}, "valid-token")
		w := httptest.NewRecorder()

		CreateCheckoutSession(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)
		if assert.NotNil(t, capturedParams) {
			if assert.Len(t, capturedParams.LineItems, 1) {
				assert.Equal(t, "price_test_checkout_yearly", stripe.StringValue(capturedParams.LineItems[0].Price))
			}
			assert.Equal(t, "yearly", capturedParams.Metadata["plan"])
		}
	})

	t.Run("rejects unsupported checkout plan", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-checkout-uid-invalid-plan")

		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: *testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: *testUser.Email},
				EmailVerified: true,
			}, nil
		}

		createStripeCheckoutSessionFn = func(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
			return &stripe.CheckoutSession{ID: "should-not-run"}, nil
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/checkout-session", map[string]string{
			"plan": "lifetime",
		}, "valid-token")
		w := httptest.NewRecorder()

		CreateCheckoutSession(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("ignores invalid returnTo values", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-checkout-uid-3")

		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: *testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: *testUser.Email},
				EmailVerified: true,
			}, nil
		}

		var capturedParams *stripe.CheckoutSessionParams
		createStripeCheckoutSessionFn = func(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
			capturedParams = params
			return &stripe.CheckoutSession{
				ID:  "cs_test_invalid_return_to",
				URL: "https://checkout.stripe.com/c/pay/cs_test_invalid_return_to",
			}, nil
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/checkout-session", map[string]string{
			"returnTo": "https://evil.example",
		}, "valid-token")
		w := httptest.NewRecorder()

		CreateCheckoutSession(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)
		if assert.NotNil(t, capturedParams) {
			assert.Equal(t, "http://localhost:3000/checkout/success", stripe.StringValue(capturedParams.SuccessURL))
			assert.Equal(t, "http://localhost:3000/checkout/cancel", stripe.StringValue(capturedParams.CancelURL))
		}
	})

	t.Run("rejects unauthenticated requests", func(t *testing.T) {
		createStripeCheckoutSessionFn = func(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
			return &stripe.CheckoutSession{ID: "should-not-run"}, nil
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/checkout-session", nil, "")
		w := httptest.NewRecorder()

		CreateCheckoutSession(w, req, mockAuth)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("returns internal error when stripe checkout config is missing", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-checkout-uid-2")

		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: *testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{UserInfo: &auth.UserInfo{UID: uid, Email: *testUser.Email}, EmailVerified: true}, nil
		}

		_ = os.Unsetenv("STRIPE_PRICE_ID_MONTHLY")
		createStripeCheckoutSessionFn = func(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
			return &stripe.CheckoutSession{ID: "should-not-run"}, nil
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/checkout-session", nil, "valid-token")
		w := httptest.NewRecorder()

		CreateCheckoutSession(w, req, mockAuth)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
		_ = os.Setenv("STRIPE_PRICE_ID_MONTHLY", "price_test_checkout")
	})
}

func TestGetBillingPlans(t *testing.T) {
	originalGetPriceFn := getStripePriceFn
	defer func() {
		getStripePriceFn = originalGetPriceFn
	}()

	originalSecret, hadSecret := os.LookupEnv("STRIPE_SECRET_KEY")
	originalMonthly, hadMonthly := os.LookupEnv("STRIPE_PRICE_ID_MONTHLY")
	originalYearly, hadYearly := os.LookupEnv("STRIPE_PRICE_ID_YEARLY")

	defer func() {
		if hadSecret {
			_ = os.Setenv("STRIPE_SECRET_KEY", originalSecret)
		} else {
			_ = os.Unsetenv("STRIPE_SECRET_KEY")
		}

		if hadMonthly {
			_ = os.Setenv("STRIPE_PRICE_ID_MONTHLY", originalMonthly)
		} else {
			_ = os.Unsetenv("STRIPE_PRICE_ID_MONTHLY")
		}

		if hadYearly {
			_ = os.Setenv("STRIPE_PRICE_ID_YEARLY", originalYearly)
		} else {
			_ = os.Unsetenv("STRIPE_PRICE_ID_YEARLY")
		}
	}()

	t.Run("returns monthly and yearly plans", func(t *testing.T) {
		_ = os.Setenv("STRIPE_SECRET_KEY", "sk_test_checkout")
		_ = os.Setenv("STRIPE_PRICE_ID_MONTHLY", "price_monthly_test")
		_ = os.Setenv("STRIPE_PRICE_ID_YEARLY", "price_yearly_test")

		getStripePriceFn = func(id string, params *stripe.PriceParams) (*stripe.Price, error) {
			switch id {
			case "price_monthly_test":
				return &stripe.Price{
					ID:                id,
					Currency:          stripe.CurrencyUSD,
					UnitAmount:        499,
					UnitAmountDecimal: 499,
					Recurring: &stripe.PriceRecurring{
						Interval:      stripe.PriceRecurringIntervalMonth,
						IntervalCount: 1,
					},
				}, nil
			case "price_yearly_test":
				return &stripe.Price{
					ID:                id,
					Currency:          stripe.CurrencyUSD,
					UnitAmount:        4499,
					UnitAmountDecimal: 4499,
					Recurring: &stripe.PriceRecurring{
						Interval:      stripe.PriceRecurringIntervalYear,
						IntervalCount: 1,
					},
				}, nil
			default:
				return nil, fmt.Errorf("unexpected price id: %s", id)
			}
		}

		req := httptest.NewRequest(http.MethodGet, "/api/billing/plans", nil)
		w := httptest.NewRecorder()

		GetBillingPlans(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response BillingPlansResponse
		testutils.ParseJSONResponse(t, w, &response)

		assert.Equal(t, "monthly", response.Monthly.Plan)
		assert.Equal(t, "price_monthly_test", response.Monthly.PriceID)
		assert.Equal(t, "USD", response.Monthly.Currency)
		assert.Equal(t, int64(499), response.Monthly.UnitAmount)
		assert.Equal(t, "month", response.Monthly.Interval)

		assert.Equal(t, "yearly", response.Yearly.Plan)
		assert.Equal(t, "price_yearly_test", response.Yearly.PriceID)
		assert.Equal(t, "USD", response.Yearly.Currency)
		assert.Equal(t, int64(4499), response.Yearly.UnitAmount)
		assert.Equal(t, "year", response.Yearly.Interval)
	})

	t.Run("returns internal error when stripe config is missing", func(t *testing.T) {
		_ = os.Unsetenv("STRIPE_SECRET_KEY")
		_ = os.Setenv("STRIPE_PRICE_ID_MONTHLY", "price_monthly_test")
		_ = os.Setenv("STRIPE_PRICE_ID_YEARLY", "price_yearly_test")

		getStripePriceFn = func(id string, params *stripe.PriceParams) (*stripe.Price, error) {
			return &stripe.Price{}, nil
		}

		req := httptest.NewRequest(http.MethodGet, "/api/billing/plans", nil)
		w := httptest.NewRecorder()

		GetBillingPlans(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})
}

func TestCancelSubscription(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "users")

	mockAuth := &testutils.MockFirebaseAuth{}
	originalUpdateFn := updateStripeSubscriptionFn
	originalFindSubscriptionFn := findCancelableStripeSubscriptionIDForUserFn
	defer func() {
		updateStripeSubscriptionFn = originalUpdateFn
		findCancelableStripeSubscriptionIDForUserFn = originalFindSubscriptionFn
	}()

	t.Run("schedules cancellation at period end and keeps access active", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-cancel-uid-scheduled")
		_, err := pool.Exec(context.Background(), `UPDATE users SET is_subscribed = TRUE, subscription_ended_at = NULL WHERE id = $1`, testUser.ID)
		assert.NoError(t, err)

		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: *testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: *testUser.Email},
				EmailVerified: true,
			}, nil
		}

		cancelAt := time.Now().UTC().Add(24 * time.Hour)
		findCancelableStripeSubscriptionIDForUserFn = func(user *models.User) (string, error) {
			return "sub_scheduled_123", nil
		}
		updateStripeSubscriptionFn = func(id string, params *stripe.SubscriptionParams) (*stripe.Subscription, error) {
			assert.Equal(t, "sub_scheduled_123", id)
			if assert.NotNil(t, params) {
				assert.Equal(t, true, stripe.BoolValue(params.CancelAtPeriodEnd))
			}

			return &stripe.Subscription{
				ID:                id,
				Status:            stripe.SubscriptionStatusActive,
				CancelAtPeriodEnd: true,
				CancelAt:          cancelAt.Unix(),
			}, nil
		}

		originalSecret, hadSecret := os.LookupEnv("STRIPE_SECRET_KEY")
		_ = os.Setenv("STRIPE_SECRET_KEY", "sk_test_cancel")
		defer func() {
			if hadSecret {
				_ = os.Setenv("STRIPE_SECRET_KEY", originalSecret)
				return
			}
			_ = os.Unsetenv("STRIPE_SECRET_KEY")
		}()

		req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/cancel-subscription", nil, "valid-token")
		w := httptest.NewRecorder()

		CancelSubscription(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)

		var response CancelSubscriptionResponse
		testutils.ParseJSONResponse(t, w, &response)
		assert.Equal(t, "sub_scheduled_123", response.SubscriptionID)
		assert.Equal(t, string(stripe.SubscriptionStatusActive), response.Status)
		assert.True(t, response.CancelAtPeriodEnd)

		updatedUser, err := models.GetUserByID(testUser.ID)
		assert.NoError(t, err)
		if assert.NotNil(t, updatedUser) {
			assert.True(t, updatedUser.IsSubscribed)
			if assert.NotNil(t, updatedUser.SubscriptionEndedAt) {
				assert.WithinDuration(t, cancelAt, *updatedUser.SubscriptionEndedAt, time.Second)
			}
		}
	})

	t.Run("rejects unauthenticated requests", func(t *testing.T) {
		req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/cancel-subscription", nil, "")
		w := httptest.NewRecorder()

		CancelSubscription(w, req, mockAuth)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("rejects users without active subscription", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-cancel-uid-1")

		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: *testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: *testUser.Email},
				EmailVerified: true,
			}, nil
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/cancel-subscription", nil, "valid-token")
		w := httptest.NewRecorder()

		CancelSubscription(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("returns internal error when stripe config is missing", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-cancel-uid-2")
		_, err := pool.Exec(context.Background(), `UPDATE users SET is_subscribed = TRUE WHERE id = $1`, testUser.ID)
		assert.NoError(t, err)

		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: *testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: *testUser.Email},
				EmailVerified: true,
			}, nil
		}

		originalSecret, hadSecret := os.LookupEnv("STRIPE_SECRET_KEY")
		_ = os.Unsetenv("STRIPE_SECRET_KEY")
		defer func() {
			if hadSecret {
				_ = os.Setenv("STRIPE_SECRET_KEY", originalSecret)
				return
			}
			_ = os.Unsetenv("STRIPE_SECRET_KEY")
		}()

		req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/cancel-subscription", nil, "valid-token")
		w := httptest.NewRecorder()

		CancelSubscription(w, req, mockAuth)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})
}

func TestResumeSubscription(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "users")

	mockAuth := &testutils.MockFirebaseAuth{}
	originalUpdateFn := updateStripeSubscriptionFn
	originalFindScheduledFn := findScheduledCancellationSubscriptionIDForUserFn
	defer func() {
		updateStripeSubscriptionFn = originalUpdateFn
		findScheduledCancellationSubscriptionIDForUserFn = originalFindScheduledFn
	}()

	t.Run("resumes scheduled cancellation and clears end date", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-resume-uid-scheduled")
		futureEnd := time.Now().UTC().Add(24 * time.Hour)
		_, err := pool.Exec(context.Background(), `UPDATE users SET is_subscribed = TRUE, subscription_ended_at = $2 WHERE id = $1`, testUser.ID, futureEnd)
		assert.NoError(t, err)

		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: *testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: *testUser.Email},
				EmailVerified: true,
			}, nil
		}

		findScheduledCancellationSubscriptionIDForUserFn = func(user *models.User) (string, error) {
			return "sub_resume_123", nil
		}
		updateStripeSubscriptionFn = func(id string, params *stripe.SubscriptionParams) (*stripe.Subscription, error) {
			assert.Equal(t, "sub_resume_123", id)
			if assert.NotNil(t, params) {
				assert.Equal(t, false, stripe.BoolValue(params.CancelAtPeriodEnd))
			}

			return &stripe.Subscription{
				ID:                id,
				Status:            stripe.SubscriptionStatusActive,
				CancelAtPeriodEnd: false,
				CancelAt:          0,
			}, nil
		}

		originalSecret, hadSecret := os.LookupEnv("STRIPE_SECRET_KEY")
		_ = os.Setenv("STRIPE_SECRET_KEY", "sk_test_resume")
		defer func() {
			if hadSecret {
				_ = os.Setenv("STRIPE_SECRET_KEY", originalSecret)
				return
			}
			_ = os.Unsetenv("STRIPE_SECRET_KEY")
		}()

		req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/resume-subscription", nil, "valid-token")
		w := httptest.NewRecorder()

		ResumeSubscription(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)

		var response CancelSubscriptionResponse
		testutils.ParseJSONResponse(t, w, &response)
		assert.Equal(t, "sub_resume_123", response.SubscriptionID)
		assert.Equal(t, string(stripe.SubscriptionStatusActive), response.Status)
		assert.False(t, response.CancelAtPeriodEnd)

		updatedUser, err := models.GetUserByID(testUser.ID)
		assert.NoError(t, err)
		if assert.NotNil(t, updatedUser) {
			assert.True(t, updatedUser.IsSubscribed)
			assert.Nil(t, updatedUser.SubscriptionEndedAt)
		}
	})

	t.Run("rejects unauthenticated requests", func(t *testing.T) {
		req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/resume-subscription", nil, "")
		w := httptest.NewRecorder()

		ResumeSubscription(w, req, mockAuth)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("returns bad request when no scheduled cancellation exists", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-resume-uid-none")
		_, err := pool.Exec(context.Background(), `UPDATE users SET is_subscribed = TRUE, subscription_ended_at = NULL WHERE id = $1`, testUser.ID)
		assert.NoError(t, err)

		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: *testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: *testUser.Email},
				EmailVerified: true,
			}, nil
		}

		findScheduledCancellationSubscriptionIDForUserFn = func(user *models.User) (string, error) {
			return "", errStripeScheduledCancellationNotFound
		}

		originalSecret, hadSecret := os.LookupEnv("STRIPE_SECRET_KEY")
		_ = os.Setenv("STRIPE_SECRET_KEY", "sk_test_resume")
		defer func() {
			if hadSecret {
				_ = os.Setenv("STRIPE_SECRET_KEY", originalSecret)
				return
			}
			_ = os.Unsetenv("STRIPE_SECRET_KEY")
		}()

		req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/resume-subscription", nil, "valid-token")
		w := httptest.NewRecorder()

		ResumeSubscription(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

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

	t.Run("stores scheduled cancellation date from updated event", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-stripe-uid-scheduled")
		_, err := pool.Exec(context.Background(), `UPDATE users SET is_subscribed = TRUE, subscription_ended_at = NULL WHERE id = $1`, testUser.ID)
		assert.NoError(t, err)

		cancelAt := time.Now().UTC().Add(48 * time.Hour)
		payload := buildStripeEventPayload(t, "", "customer.subscription.updated", map[string]any{
			"id":                   "sub_scheduled_webhook",
			"object":               "subscription",
			"status":               "active",
			"cancel_at_period_end": true,
			"cancel_at":            cancelAt.Unix(),
			"metadata": map[string]string{
				"firebaseUid": *testUser.FirebaseUID,
			},
		})

		req := newSignedStripeWebhookRequest(payload, webhookSecret)
		w := httptest.NewRecorder()

		HandleStripeWebhook(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		updatedUser, err := models.GetUserByID(testUser.ID)
		assert.NoError(t, err)
		assert.NotNil(t, updatedUser)
		assert.True(t, updatedUser.IsSubscribed)
		if assert.NotNil(t, updatedUser.SubscriptionEndedAt) {
			assert.WithinDuration(t, cancelAt, *updatedUser.SubscriptionEndedAt, time.Second)
		}
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

func TestDeriveSubscriptionState(t *testing.T) {
	t.Run("uses Stripe-provided end timestamp for downgraded subscriptions", func(t *testing.T) {
		stripeEndedAt := time.Now().UTC().Add(-2 * time.Hour).Truncate(time.Second)

		isSubscribed, subscriptionEndedAt := deriveSubscriptionState(
			stripe.EventTypeCustomerSubscriptionDeleted,
			stripe.SubscriptionStatusCanceled,
			false,
			0,
			stripeEndedAt.Unix(),
		)

		assert.False(t, isSubscribed)
		if assert.NotNil(t, subscriptionEndedAt) {
			assert.WithinDuration(t, stripeEndedAt, *subscriptionEndedAt, time.Second)
		}
	})

	t.Run("falls back to processing time when Stripe end timestamp is unavailable", func(t *testing.T) {
		before := time.Now().UTC()

		isSubscribed, subscriptionEndedAt := deriveSubscriptionState(
			stripe.EventTypeCustomerSubscriptionDeleted,
			stripe.SubscriptionStatusCanceled,
			false,
			0,
		)

		after := time.Now().UTC()

		assert.False(t, isSubscribed)
		if assert.NotNil(t, subscriptionEndedAt) {
			assert.True(t, !subscriptionEndedAt.Before(before) && !subscriptionEndedAt.After(after))
		}
	})
}
