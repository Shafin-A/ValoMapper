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
	"valo-mapper-api/services"
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
	originalFindPriceForPlanFn := findStripePriceForPlanFn
	originalGetSubscriptionFn := getStripeSubscriptionFn
	defer func() {
		createStripeCheckoutSessionFn = originalCreateFn
		findStripePriceForPlanFn = originalFindPriceForPlanFn
		getStripeSubscriptionFn = originalGetSubscriptionFn
	}()

	originalSecret, hadSecret := os.LookupEnv("STRIPE_SECRET_KEY")
	originalMonthlyLookupKey, hadMonthlyLookupKey := os.LookupEnv("STRIPE_PRICE_LOOKUP_KEY_MONTHLY")
	originalYearlyLookupKey, hadYearlyLookupKey := os.LookupEnv("STRIPE_PRICE_LOOKUP_KEY_YEARLY")
	originalSuccessURL, hadSuccessURL := os.LookupEnv("STRIPE_CHECKOUT_SUCCESS_URL")
	originalCancelURL, hadCancelURL := os.LookupEnv("STRIPE_CHECKOUT_CANCEL_URL")
	originalTrialDays, hadTrialDays := os.LookupEnv("STRIPE_PREMIUM_TRIAL_DAYS")

	_ = os.Setenv("STRIPE_SECRET_KEY", "sk_test_checkout")
	_ = os.Setenv("STRIPE_PRICE_LOOKUP_KEY_MONTHLY", "standard_monthly")
	_ = os.Setenv("STRIPE_PRICE_LOOKUP_KEY_YEARLY", "standard_yearly")
	_ = os.Setenv("STRIPE_CHECKOUT_SUCCESS_URL", "http://localhost:3000/checkout/success")
	_ = os.Setenv("STRIPE_CHECKOUT_CANCEL_URL", "http://localhost:3000/checkout/cancel")
	_ = os.Setenv("STRIPE_PREMIUM_TRIAL_DAYS", "14")

	defer func() {
		if hadSecret {
			_ = os.Setenv("STRIPE_SECRET_KEY", originalSecret)
		} else {
			_ = os.Unsetenv("STRIPE_SECRET_KEY")
		}
		if hadMonthlyLookupKey {
			_ = os.Setenv("STRIPE_PRICE_LOOKUP_KEY_MONTHLY", originalMonthlyLookupKey)
		} else {
			_ = os.Unsetenv("STRIPE_PRICE_LOOKUP_KEY_MONTHLY")
		}
		if hadYearlyLookupKey {
			_ = os.Setenv("STRIPE_PRICE_LOOKUP_KEY_YEARLY", originalYearlyLookupKey)
		} else {
			_ = os.Unsetenv("STRIPE_PRICE_LOOKUP_KEY_YEARLY")
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
		if hadTrialDays {
			_ = os.Setenv("STRIPE_PREMIUM_TRIAL_DAYS", originalTrialDays)
		} else {
			_ = os.Unsetenv("STRIPE_PREMIUM_TRIAL_DAYS")
		}
	}()

	mockAuth := &testutils.MockFirebaseAuth{}

	t.Run("creates checkout session with subscription metadata", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-checkout-uid-1")
		const returnToPath = "/ABCD123?tab=map"

		findStripePriceForPlanFn = func(plan services.CheckoutPlan) (*stripe.Price, error) {
			switch plan {
			case services.CheckoutPlanMonthly:
				return &stripe.Price{ID: "price_test_checkout"}, nil
			case services.CheckoutPlanYearly:
				return &stripe.Price{ID: "price_test_checkout_yearly"}, nil
			default:
				return nil, services.ErrCheckoutPlanUnavailable
			}
		}

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
				assert.Nil(t, capturedParams.SubscriptionData.TrialPeriodDays)
			}
		}
	})

	t.Run("uses yearly plan price when requested without trial", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-checkout-uid-yearly")

		findStripePriceForPlanFn = func(plan services.CheckoutPlan) (*stripe.Price, error) {
			switch plan {
			case services.CheckoutPlanMonthly:
				return &stripe.Price{ID: "price_test_checkout"}, nil
			case services.CheckoutPlanYearly:
				return &stripe.Price{ID: "price_test_checkout_yearly"}, nil
			default:
				return nil, services.ErrCheckoutPlanUnavailable
			}
		}

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
			if assert.NotNil(t, capturedParams.SubscriptionData) {
				assert.Nil(t, capturedParams.SubscriptionData.TrialPeriodDays)
			}
		}

		updatedUser, err := models.GetUserByID(testUser.ID)
		assert.NoError(t, err)
		if assert.NotNil(t, updatedUser) {
			assert.Nil(t, updatedUser.PremiumTrialClaimedAt)
		}
	})

	t.Run("does not consume trial eligibility when creating checkout session", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-checkout-uid-first-time-trial-only")

		findStripePriceForPlanFn = func(plan services.CheckoutPlan) (*stripe.Price, error) {
			switch plan {
			case services.CheckoutPlanMonthly:
				return &stripe.Price{ID: "price_test_checkout"}, nil
			case services.CheckoutPlanYearly:
				return &stripe.Price{ID: "price_test_checkout_yearly"}, nil
			default:
				return nil, services.ErrCheckoutPlanUnavailable
			}
		}

		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: *testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: *testUser.Email},
				EmailVerified: true,
			}, nil
		}

		capturedParams := make([]*stripe.CheckoutSessionParams, 0, 2)
		createStripeCheckoutSessionFn = func(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
			capturedParams = append(capturedParams, params)
			return &stripe.CheckoutSession{
				ID:  fmt.Sprintf("cs_test_trial_only_%d", len(capturedParams)),
				URL: fmt.Sprintf("https://checkout.stripe.com/c/pay/cs_test_trial_only_%d", len(capturedParams)),
			}, nil
		}

		for range 2 {
			req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/checkout-session", map[string]any{
				"plan":           "monthly",
				"startWithTrial": true,
			}, "valid-token")
			w := httptest.NewRecorder()

			CreateCheckoutSession(w, req, mockAuth)
			assert.Equal(t, http.StatusOK, w.Code)
		}

		if assert.Len(t, capturedParams, 2) {
			if assert.NotNil(t, capturedParams[0].SubscriptionData) {
				assert.Equal(t, int64(14), stripe.Int64Value(capturedParams[0].SubscriptionData.TrialPeriodDays))
			}
			if assert.NotNil(t, capturedParams[1].SubscriptionData) {
				assert.Equal(t, int64(14), stripe.Int64Value(capturedParams[1].SubscriptionData.TrialPeriodDays))
			}
		}

		updatedUser, err := models.GetUserByID(testUser.ID)
		assert.NoError(t, err)
		if assert.NotNil(t, updatedUser) {
			assert.Nil(t, updatedUser.PremiumTrialClaimedAt)
		}
	})

	t.Run("rejects unsupported checkout plan", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-checkout-uid-invalid-plan")

		findStripePriceForPlanFn = func(plan services.CheckoutPlan) (*stripe.Price, error) {
			return &stripe.Price{ID: "price_test_checkout"}, nil
		}

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

	t.Run("rejects checkout when user already subscribed", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-checkout-uid-already-subscribed")
		_, err := pool.Exec(context.Background(), `UPDATE users SET is_subscribed = TRUE WHERE id = $1`, testUser.ID)
		assert.NoError(t, err)

		findStripePriceForPlanFn = func(plan services.CheckoutPlan) (*stripe.Price, error) {
			return &stripe.Price{ID: "price_should_not_be_used"}, nil
		}

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
			"plan": "monthly",
		}, "valid-token")
		w := httptest.NewRecorder()

		CreateCheckoutSession(w, req, mockAuth)

		assert.Equal(t, http.StatusConflict, w.Code)
	})

	t.Run("recovers stale stripe subscription id and allows checkout", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-checkout-uid-stale-subscription")
		_, err := pool.Exec(context.Background(), `UPDATE users SET is_subscribed = TRUE, stripe_subscription_id = $2 WHERE id = $1`, testUser.ID, "sub_stale_checkout")
		assert.NoError(t, err)

		findStripePriceForPlanFn = func(plan services.CheckoutPlan) (*stripe.Price, error) {
			switch plan {
			case services.CheckoutPlanMonthly:
				return &stripe.Price{ID: "price_test_checkout"}, nil
			case services.CheckoutPlanYearly:
				return &stripe.Price{ID: "price_test_checkout_yearly"}, nil
			default:
				return nil, services.ErrCheckoutPlanUnavailable
			}
		}

		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: *testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: *testUser.Email},
				EmailVerified: true,
			}, nil
		}

		staleSubscriptionErr := &stripe.Error{Code: stripe.ErrorCodeResourceMissing, Msg: "No such subscription"}
		getStripeSubscriptionFn = func(id string, params *stripe.SubscriptionParams) (*stripe.Subscription, error) {
			assert.Equal(t, "sub_stale_checkout", id)
			return nil, staleSubscriptionErr
		}

		checkoutCreateCalls := 0
		createStripeCheckoutSessionFn = func(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
			checkoutCreateCalls++
			return &stripe.CheckoutSession{
				ID:  "cs_test_recovered_stale_subscription",
				URL: "https://checkout.stripe.com/c/pay/cs_test_recovered_stale_subscription",
			}, nil
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/checkout-session", map[string]string{
			"plan": "monthly",
		}, "valid-token")
		w := httptest.NewRecorder()

		CreateCheckoutSession(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, 1, checkoutCreateCalls)

		updatedUser, err := models.GetUserByID(testUser.ID)
		assert.NoError(t, err)
		if assert.NotNil(t, updatedUser) {
			assert.False(t, updatedUser.IsSubscribed)
			assert.Nil(t, updatedUser.StripeSubscriptionID)
		}
	})

	t.Run("retries checkout when stored stripe customer id is stale", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-checkout-uid-stale-customer")
		_, err := pool.Exec(context.Background(), `UPDATE users SET stripe_customer_id = $2 WHERE id = $1`, testUser.ID, "cus_stale_checkout")
		assert.NoError(t, err)

		findStripePriceForPlanFn = func(plan services.CheckoutPlan) (*stripe.Price, error) {
			switch plan {
			case services.CheckoutPlanMonthly:
				return &stripe.Price{ID: "price_test_checkout"}, nil
			case services.CheckoutPlanYearly:
				return &stripe.Price{ID: "price_test_checkout_yearly"}, nil
			default:
				return nil, services.ErrCheckoutPlanUnavailable
			}
		}

		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: *testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: *testUser.Email},
				EmailVerified: true,
			}, nil
		}

		createCalls := 0
		createStripeCheckoutSessionFn = func(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
			createCalls++
			if createCalls == 1 {
				if assert.NotNil(t, params.Customer) {
					assert.Equal(t, "cus_stale_checkout", stripe.StringValue(params.Customer))
				}
				return nil, &stripe.Error{Code: stripe.ErrorCodeResourceMissing, Msg: "No such customer"}
			}

			assert.Nil(t, params.Customer)
			return &stripe.CheckoutSession{
				ID:  "cs_test_retry_without_customer",
				URL: "https://checkout.stripe.com/c/pay/cs_test_retry_without_customer",
			}, nil
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/checkout-session", map[string]string{
			"plan": "monthly",
		}, "valid-token")
		w := httptest.NewRecorder()

		CreateCheckoutSession(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, 2, createCalls)

		updatedUser, err := models.GetUserByID(testUser.ID)
		assert.NoError(t, err)
		if assert.NotNil(t, updatedUser) {
			assert.Nil(t, updatedUser.StripeCustomerID)
		}
	})

	t.Run("ignores invalid returnTo values", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-checkout-uid-3")

		findStripePriceForPlanFn = func(plan services.CheckoutPlan) (*stripe.Price, error) {
			switch plan {
			case services.CheckoutPlanMonthly:
				return &stripe.Price{ID: "price_test_checkout"}, nil
			case services.CheckoutPlanYearly:
				return &stripe.Price{ID: "price_test_checkout_yearly"}, nil
			default:
				return nil, services.ErrCheckoutPlanUnavailable
			}
		}

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

		_ = os.Unsetenv("STRIPE_SECRET_KEY")
		createStripeCheckoutSessionFn = func(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
			return &stripe.CheckoutSession{ID: "should-not-run"}, nil
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/checkout-session", nil, "valid-token")
		w := httptest.NewRecorder()

		CreateCheckoutSession(w, req, mockAuth)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
		_ = os.Setenv("STRIPE_SECRET_KEY", "sk_test_checkout")
	})
}

func TestGetBillingPlans(t *testing.T) {
	originalFindPriceForPlanFn := findStripePriceForPlanFn
	defer func() {
		findStripePriceForPlanFn = originalFindPriceForPlanFn
	}()

	originalSecret, hadSecret := os.LookupEnv("STRIPE_SECRET_KEY")
	originalMonthlyLookupKey, hadMonthlyLookupKey := os.LookupEnv("STRIPE_PRICE_LOOKUP_KEY_MONTHLY")
	originalYearlyLookupKey, hadYearlyLookupKey := os.LookupEnv("STRIPE_PRICE_LOOKUP_KEY_YEARLY")
	originalStackLookupKey, hadStackLookupKey := os.LookupEnv("STRIPE_PRICE_LOOKUP_KEY_STACK")

	defer func() {
		if hadSecret {
			_ = os.Setenv("STRIPE_SECRET_KEY", originalSecret)
		} else {
			_ = os.Unsetenv("STRIPE_SECRET_KEY")
		}

		if hadMonthlyLookupKey {
			_ = os.Setenv("STRIPE_PRICE_LOOKUP_KEY_MONTHLY", originalMonthlyLookupKey)
		} else {
			_ = os.Unsetenv("STRIPE_PRICE_LOOKUP_KEY_MONTHLY")
		}

		if hadYearlyLookupKey {
			_ = os.Setenv("STRIPE_PRICE_LOOKUP_KEY_YEARLY", originalYearlyLookupKey)
		} else {
			_ = os.Unsetenv("STRIPE_PRICE_LOOKUP_KEY_YEARLY")
		}

		if hadStackLookupKey {
			_ = os.Setenv("STRIPE_PRICE_LOOKUP_KEY_STACK", originalStackLookupKey)
		} else {
			_ = os.Unsetenv("STRIPE_PRICE_LOOKUP_KEY_STACK")
		}
	}()

	t.Run("returns monthly, yearly, and stack plans", func(t *testing.T) {
		_ = os.Setenv("STRIPE_SECRET_KEY", "sk_test_checkout")
		_ = os.Setenv("STRIPE_PRICE_LOOKUP_KEY_MONTHLY", "standard_monthly")
		_ = os.Setenv("STRIPE_PRICE_LOOKUP_KEY_YEARLY", "standard_yearly")
		_ = os.Setenv("STRIPE_PRICE_LOOKUP_KEY_STACK", "standard_stack")

		findStripePriceForPlanFn = func(plan services.CheckoutPlan) (*stripe.Price, error) {
			switch plan {
			case services.CheckoutPlanMonthly:
				return &stripe.Price{
					ID:                "price_monthly_test",
					LookupKey:         "standard_monthly",
					Currency:          stripe.CurrencyUSD,
					UnitAmount:        499,
					UnitAmountDecimal: 499,
					Recurring: &stripe.PriceRecurring{
						Interval:      stripe.PriceRecurringIntervalMonth,
						IntervalCount: 1,
					},
				}, nil
			case services.CheckoutPlanYearly:
				return &stripe.Price{
					ID:                "price_yearly_test",
					LookupKey:         "standard_yearly",
					Currency:          stripe.CurrencyUSD,
					UnitAmount:        4499,
					UnitAmountDecimal: 4499,
					Recurring: &stripe.PriceRecurring{
						Interval:      stripe.PriceRecurringIntervalYear,
						IntervalCount: 1,
					},
				}, nil
			case services.CheckoutPlanStack:
				return &stripe.Price{
					ID:                "price_stack_test",
					LookupKey:         "standard_stack",
					Currency:          stripe.CurrencyUSD,
					UnitAmount:        12499,
					UnitAmountDecimal: 12499,
					Recurring: &stripe.PriceRecurring{
						Interval:      stripe.PriceRecurringIntervalYear,
						IntervalCount: 1,
					},
				}, nil
			default:
				return nil, fmt.Errorf("unexpected plan: %s", plan)
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

		assert.Equal(t, "stack", response.Stack.Plan)
		assert.Equal(t, "price_stack_test", response.Stack.PriceID)
		assert.Equal(t, "USD", response.Stack.Currency)
		assert.Equal(t, int64(12499), response.Stack.UnitAmount)
		assert.Equal(t, "year", response.Stack.Interval)
	})

	t.Run("returns internal error when stripe config is missing", func(t *testing.T) {
		_ = os.Unsetenv("STRIPE_SECRET_KEY")
		_ = os.Setenv("STRIPE_PRICE_LOOKUP_KEY_MONTHLY", "standard_monthly")
		_ = os.Setenv("STRIPE_PRICE_LOOKUP_KEY_YEARLY", "standard_yearly")

		findStripePriceForPlanFn = func(plan services.CheckoutPlan) (*stripe.Price, error) {
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
	originalGetSubscriptionFn := getStripeSubscriptionFn
	originalFindSubscriptionFn := findCancelableStripeSubscriptionIDForUserFn
	defer func() {
		updateStripeSubscriptionFn = originalUpdateFn
		getStripeSubscriptionFn = originalGetSubscriptionFn
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

	t.Run("uses stored stripe subscription id", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-cancel-uid-stored-sub")
		_, err := pool.Exec(context.Background(), `UPDATE users SET is_subscribed = TRUE, stripe_subscription_id = $2 WHERE id = $1`, testUser.ID, "sub_stored_cancel")
		assert.NoError(t, err)

		findCancelableStripeSubscriptionIDForUserFn = originalFindSubscriptionFn
		getStripeSubscriptionFn = func(id string, params *stripe.SubscriptionParams) (*stripe.Subscription, error) {
			assert.Equal(t, "sub_stored_cancel", id)
			return &stripe.Subscription{ID: id, Status: stripe.SubscriptionStatusActive}, nil
		}

		cancelAt := time.Now().UTC().Add(24 * time.Hour)
		updateStripeSubscriptionFn = func(id string, params *stripe.SubscriptionParams) (*stripe.Subscription, error) {
			assert.Equal(t, "sub_stored_cancel", id)
			return &stripe.Subscription{
				ID:                id,
				Status:            stripe.SubscriptionStatusActive,
				CancelAtPeriodEnd: true,
				CancelAt:          cancelAt.Unix(),
			}, nil
		}

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
	})

	t.Run("returns not found when stripe subscription id is missing", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-cancel-uid-missing-subscription")
		_, err := pool.Exec(context.Background(), `UPDATE users SET is_subscribed = TRUE, stripe_subscription_id = NULL WHERE id = $1`, testUser.ID)
		assert.NoError(t, err)

		findCancelableStripeSubscriptionIDForUserFn = originalFindSubscriptionFn

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

		assert.Equal(t, http.StatusNotFound, w.Code)
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
	originalGetSubscriptionFn := getStripeSubscriptionFn
	originalFindScheduledFn := findScheduledCancellationSubscriptionIDForUserFn
	defer func() {
		updateStripeSubscriptionFn = originalUpdateFn
		getStripeSubscriptionFn = originalGetSubscriptionFn
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
			return "", services.ErrStripeScheduledCancellationNotFound
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

	t.Run("uses stored stripe subscription id", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-resume-uid-stored-sub")
		futureEnd := time.Now().UTC().Add(24 * time.Hour)
		_, err := pool.Exec(context.Background(), `UPDATE users SET is_subscribed = TRUE, subscription_ended_at = $2, stripe_subscription_id = $3 WHERE id = $1`, testUser.ID, futureEnd, "sub_stored_resume")
		assert.NoError(t, err)

		findScheduledCancellationSubscriptionIDForUserFn = originalFindScheduledFn
		getStripeSubscriptionFn = func(id string, params *stripe.SubscriptionParams) (*stripe.Subscription, error) {
			assert.Equal(t, "sub_stored_resume", id)
			return &stripe.Subscription{ID: id, Status: stripe.SubscriptionStatusActive, CancelAtPeriodEnd: true}, nil
		}

		updateStripeSubscriptionFn = func(id string, params *stripe.SubscriptionParams) (*stripe.Subscription, error) {
			assert.Equal(t, "sub_stored_resume", id)
			return &stripe.Subscription{ID: id, Status: stripe.SubscriptionStatusActive, CancelAtPeriodEnd: false, CancelAt: 0}, nil
		}

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
	})

	t.Run("returns bad request when stripe subscription id is missing", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-resume-uid-missing-subscription")
		futureEnd := time.Now().UTC().Add(24 * time.Hour)
		_, err := pool.Exec(context.Background(), `UPDATE users SET is_subscribed = TRUE, subscription_ended_at = $2, stripe_subscription_id = NULL WHERE id = $1`, testUser.ID, futureEnd)
		assert.NoError(t, err)

		findScheduledCancellationSubscriptionIDForUserFn = originalFindScheduledFn

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
		assert.Nil(t, updatedUser.SubscriptionTrialEndsAt)
	})

	t.Run("marks monthly subscription as permanently consuming trial eligibility", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-stripe-uid-monthly-ever")

		payload := buildStripeEventPayload(t, "", "customer.subscription.updated", map[string]any{
			"id":                   "sub_monthly_ever",
			"object":               "subscription",
			"status":               "active",
			"cancel_at_period_end": false,
			"cancel_at":            0,
			"metadata": map[string]string{
				"firebaseUid": *testUser.FirebaseUID,
				"plan":        "monthly",
			},
		})

		req := newSignedStripeWebhookRequest(payload, webhookSecret)
		w := httptest.NewRecorder()

		HandleStripeWebhook(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		updatedUser, err := models.GetUserByID(testUser.ID)
		assert.NoError(t, err)
		if assert.NotNil(t, updatedUser) {
			updatedUser.RefreshPremiumTrialEligibility()
			assert.True(t, updatedUser.IsSubscribed)
			assert.True(t, updatedUser.HasEverPersonalSubscription)
			assert.False(t, updatedUser.PremiumTrialEligible)
			if assert.NotNil(t, updatedUser.SubscriptionPlan) {
				assert.Equal(t, "monthly", *updatedUser.SubscriptionPlan)
			}
		}
	})

	t.Run("marks yearly subscription as permanently consuming trial eligibility", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-stripe-uid-yearly-ever")

		payload := buildStripeEventPayload(t, "", "customer.subscription.updated", map[string]any{
			"id":                   "sub_yearly_ever",
			"object":               "subscription",
			"status":               "active",
			"cancel_at_period_end": false,
			"cancel_at":            0,
			"metadata": map[string]string{
				"firebaseUid": *testUser.FirebaseUID,
				"plan":        "yearly",
			},
		})

		req := newSignedStripeWebhookRequest(payload, webhookSecret)
		w := httptest.NewRecorder()

		HandleStripeWebhook(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		updatedUser, err := models.GetUserByID(testUser.ID)
		assert.NoError(t, err)
		if assert.NotNil(t, updatedUser) {
			updatedUser.RefreshPremiumTrialEligibility()
			assert.True(t, updatedUser.IsSubscribed)
			assert.True(t, updatedUser.HasEverPersonalSubscription)
			assert.False(t, updatedUser.PremiumTrialEligible)
			if assert.NotNil(t, updatedUser.SubscriptionPlan) {
				assert.Equal(t, "yearly", *updatedUser.SubscriptionPlan)
			}
		}
	})

	t.Run("claims premium trial only after webhook confirms trial subscription", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-stripe-uid-trial-claim")
		_, err := pool.Exec(context.Background(), `UPDATE users SET is_subscribed = FALSE, premium_trial_claimed_at = NULL WHERE id = $1`, testUser.ID)
		assert.NoError(t, err)
		trialEnd := time.Now().UTC().Add(14 * 24 * time.Hour)

		payload := buildStripeEventPayload(t, "", "customer.subscription.created", map[string]any{
			"id":                   "sub_trial_claim",
			"object":               "subscription",
			"status":               "trialing",
			"cancel_at_period_end": false,
			"cancel_at":            0,
			"trial_end":            trialEnd.Unix(),
			"metadata": map[string]string{
				"firebaseUid":  *testUser.FirebaseUID,
				"trialApplied": "true",
			},
		})

		req := newSignedStripeWebhookRequest(payload, webhookSecret)
		w := httptest.NewRecorder()

		HandleStripeWebhook(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		updatedUser, err := models.GetUserByID(testUser.ID)
		assert.NoError(t, err)
		if assert.NotNil(t, updatedUser) {
			assert.True(t, updatedUser.IsSubscribed)
			assert.NotNil(t, updatedUser.PremiumTrialClaimedAt)
			if assert.NotNil(t, updatedUser.SubscriptionTrialEndsAt) {
				assert.WithinDuration(t, trialEnd, *updatedUser.SubscriptionTrialEndsAt, time.Second)
			}
		}
	})

	t.Run("keeps trial claimed after trial converts to active subscription", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-stripe-uid-trial-conversion")
		trialEnd := time.Now().UTC().Add(14 * 24 * time.Hour)

		trialPayload := buildStripeEventPayload(t, "", "customer.subscription.created", map[string]any{
			"id":                   "sub_trial_conversion",
			"object":               "subscription",
			"status":               "trialing",
			"cancel_at_period_end": false,
			"cancel_at":            0,
			"trial_end":            trialEnd.Unix(),
			"metadata": map[string]string{
				"firebaseUid":  *testUser.FirebaseUID,
				"trialApplied": "true",
				"plan":         "monthly",
			},
		})

		trialReq := newSignedStripeWebhookRequest(trialPayload, webhookSecret)
		trialResp := httptest.NewRecorder()
		HandleStripeWebhook(trialResp, trialReq)
		assert.Equal(t, http.StatusOK, trialResp.Code)

		convertedPayload := buildStripeEventPayload(t, "", "customer.subscription.updated", map[string]any{
			"id":                   "sub_trial_conversion",
			"object":               "subscription",
			"status":               "active",
			"cancel_at_period_end": false,
			"cancel_at":            0,
			"metadata": map[string]string{
				"firebaseUid": *testUser.FirebaseUID,
				"plan":        "monthly",
			},
		})

		convertedReq := newSignedStripeWebhookRequest(convertedPayload, webhookSecret)
		convertedResp := httptest.NewRecorder()
		HandleStripeWebhook(convertedResp, convertedReq)
		assert.Equal(t, http.StatusOK, convertedResp.Code)

		updatedUser, err := models.GetUserByID(testUser.ID)
		assert.NoError(t, err)
		if assert.NotNil(t, updatedUser) {
			assert.True(t, updatedUser.IsSubscribed)
			assert.NotNil(t, updatedUser.PremiumTrialClaimedAt)
			assert.Nil(t, updatedUser.SubscriptionTrialEndsAt)
			assert.True(t, updatedUser.HasEverPersonalSubscription)
		}
	})

	t.Run("stores stripe customer id from subscription event", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-stripe-uid-customer")
		_, err := pool.Exec(context.Background(), `UPDATE users SET stripe_customer_id = NULL, stripe_subscription_id = NULL WHERE id = $1`, testUser.ID)
		assert.NoError(t, err)

		payload := buildStripeEventPayload(t, "", "customer.subscription.updated", map[string]any{
			"id":                   "sub_test_customer",
			"object":               "subscription",
			"status":               "active",
			"cancel_at_period_end": false,
			"cancel_at":            0,
			"customer":             "cus_test_saved",
			"metadata": map[string]string{
				"userId": fmt.Sprintf("%d", testUser.ID),
			},
		})

		req := newSignedStripeWebhookRequest(payload, webhookSecret)
		w := httptest.NewRecorder()

		HandleStripeWebhook(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		updatedUser, err := models.GetUserByID(testUser.ID)
		assert.NoError(t, err)
		if assert.NotNil(t, updatedUser) {
			if assert.NotNil(t, updatedUser.StripeCustomerID) {
				assert.Equal(t, "cus_test_saved", *updatedUser.StripeCustomerID)
			}
			if assert.NotNil(t, updatedUser.StripeSubscriptionID) {
				assert.Equal(t, "sub_test_customer", *updatedUser.StripeSubscriptionID)
			}
		}
	})

	t.Run("resolves user by stripe subscription id when metadata is missing", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-stripe-uid-sub-fallback")
		_, err := pool.Exec(context.Background(), `UPDATE users SET is_subscribed = FALSE, subscription_ended_at = NOW(), stripe_subscription_id = $2, stripe_customer_id = NULL WHERE id = $1`, testUser.ID, "sub_fallback_only")
		assert.NoError(t, err)

		payload := buildStripeEventPayload(t, "", "customer.subscription.updated", map[string]any{
			"id":                   "sub_fallback_only",
			"object":               "subscription",
			"status":               "active",
			"cancel_at_period_end": false,
			"cancel_at":            0,
			"metadata":             map[string]string{},
		})

		req := newSignedStripeWebhookRequest(payload, webhookSecret)
		w := httptest.NewRecorder()

		HandleStripeWebhook(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		updatedUser, err := models.GetUserByID(testUser.ID)
		assert.NoError(t, err)
		if assert.NotNil(t, updatedUser) {
			assert.True(t, updatedUser.IsSubscribed)
			assert.Nil(t, updatedUser.SubscriptionEndedAt)
		}
	})

	t.Run("resolves user by stripe customer id when metadata is missing", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-stripe-uid-customer-fallback")
		_, err := pool.Exec(context.Background(), `UPDATE users SET is_subscribed = FALSE, subscription_ended_at = NOW(), stripe_customer_id = $2, stripe_subscription_id = NULL WHERE id = $1`, testUser.ID, "cus_fallback_only")
		assert.NoError(t, err)

		payload := buildStripeEventPayload(t, "", "customer.subscription.updated", map[string]any{
			"id":                   "sub_new_from_fallback",
			"object":               "subscription",
			"status":               "active",
			"cancel_at_period_end": false,
			"cancel_at":            0,
			"customer":             "cus_fallback_only",
			"metadata":             map[string]string{},
		})

		req := newSignedStripeWebhookRequest(payload, webhookSecret)
		w := httptest.NewRecorder()

		HandleStripeWebhook(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		updatedUser, err := models.GetUserByID(testUser.ID)
		assert.NoError(t, err)
		if assert.NotNil(t, updatedUser) {
			assert.True(t, updatedUser.IsSubscribed)
			assert.Nil(t, updatedUser.SubscriptionEndedAt)
			if assert.NotNil(t, updatedUser.StripeSubscriptionID) {
				assert.Equal(t, "sub_new_from_fallback", *updatedUser.StripeSubscriptionID)
			}
		}
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
		assert.Nil(t, updatedUser.SubscriptionTrialEndsAt)
	})

	t.Run("keeps trial ineligible after paid subscription is canceled", func(t *testing.T) {
		testUser := testutils.CreateTestUser(t, pool, "firebase-stripe-uid-cancel-ever")

		activePayload := buildStripeEventPayload(t, "", "customer.subscription.updated", map[string]any{
			"id":                   "sub_cancel_ever",
			"object":               "subscription",
			"status":               "active",
			"cancel_at_period_end": false,
			"cancel_at":            0,
			"metadata": map[string]string{
				"firebaseUid": *testUser.FirebaseUID,
				"plan":        "monthly",
			},
		})

		activeReq := newSignedStripeWebhookRequest(activePayload, webhookSecret)
		activeResp := httptest.NewRecorder()
		HandleStripeWebhook(activeResp, activeReq)
		assert.Equal(t, http.StatusOK, activeResp.Code)

		deletedPayload := buildStripeEventPayload(t, "", "customer.subscription.deleted", map[string]any{
			"id":                   "sub_cancel_ever",
			"object":               "subscription",
			"status":               "canceled",
			"cancel_at_period_end": false,
			"cancel_at":            0,
			"metadata": map[string]string{
				"firebaseUid": *testUser.FirebaseUID,
				"plan":        "monthly",
			},
		})

		deletedReq := newSignedStripeWebhookRequest(deletedPayload, webhookSecret)
		deletedResp := httptest.NewRecorder()
		HandleStripeWebhook(deletedResp, deletedReq)
		assert.Equal(t, http.StatusOK, deletedResp.Code)

		updatedUser, err := models.GetUserByID(testUser.ID)
		assert.NoError(t, err)
		if assert.NotNil(t, updatedUser) {
			updatedUser.RefreshPremiumTrialEligibility()
			assert.False(t, updatedUser.IsSubscribed)
			assert.True(t, updatedUser.HasEverPersonalSubscription)
			assert.False(t, updatedUser.PremiumTrialEligible)
			assert.NotNil(t, updatedUser.SubscriptionEndedAt)
		}
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
		"id":       "sub_" + uuid.NewString(),
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

