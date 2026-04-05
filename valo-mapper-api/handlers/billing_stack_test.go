package handlers

import (
	"context"
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
	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stripe/stripe-go/v82"
)

func TestInviteStackMember_CreatesInvite(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)
	testutils.TruncateTables(t, pool, "stack_members", "users")

	owner := createStackTestUser(t, pool, "stack-owner-uid", "stack-owner@example.com")
	member := createStackTestUser(t, pool, "stack-member-uid", "stack-member@example.com")

	_, err := pool.Exec(context.Background(), `
		UPDATE users
		SET is_subscribed = TRUE, subscription_plan = $1
		WHERE id = $2
	`, string(services.CheckoutPlanStack), owner.ID)
	require.NoError(t, err)

	mockAuth := newMockAuthForUser(owner)

	req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/stack/invite", map[string]string{
		"firebaseUid": *member.FirebaseUID,
	}, "valid-token")
	w := httptest.NewRecorder()

	InviteStackMember(w, req, mockAuth)

	assert.Equal(t, http.StatusCreated, w.Code)

	var invite models.StackMember
	testutils.ParseJSONResponse(t, w, &invite)
	assert.Equal(t, owner.ID, invite.OwnerUserID)
	assert.Equal(t, member.ID, invite.MemberUserID)
	assert.Equal(t, models.StackMemberStatusPending, invite.Status)
}

func TestInviteStackMember_RejectsTargetWhoOwnsStackPlan(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)
	testutils.TruncateTables(t, pool, "stack_members", "users")

	inviter := createStackTestUser(t, pool, "stack-inviter-uid", "stack-inviter@example.com")
	targetOwner := createStackTestUser(t, pool, "stack-target-owner-uid", "stack-target-owner@example.com")

	_, err := pool.Exec(context.Background(), `
		UPDATE users
		SET is_subscribed = TRUE, subscription_plan = $1
		WHERE id IN ($2, $3)
	`, string(services.CheckoutPlanStack), inviter.ID, targetOwner.ID)
	require.NoError(t, err)

	mockAuth := newMockAuthForUser(inviter)

	req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/stack/invite", map[string]string{
		"firebaseUid": *targetOwner.FirebaseUID,
	}, "valid-token")
	w := httptest.NewRecorder()

	InviteStackMember(w, req, mockAuth)

	assert.Equal(t, http.StatusConflict, w.Code)

	var errResp testutils.ErrorResponse
	testutils.ParseJSONResponse(t, w, &errResp)
	assert.Equal(t, services.ErrTargetAlreadyInStack.Error(), errResp.Error)

	var count int
	err = pool.QueryRow(context.Background(), `
		SELECT COUNT(*)
		FROM stack_members
		WHERE owner_user_id = $1 AND member_user_id = $2
	`, inviter.ID, targetOwner.ID).Scan(&count)
	require.NoError(t, err)
	assert.Equal(t, 0, count)
}

func TestGetStackMembers_AllowsActiveStackMemberViewOnly(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)
	testutils.TruncateTables(t, pool, "stack_members", "users")

	owner := createStackTestUser(t, pool, "owner-view-uid", "owner-view@example.com")
	member := createStackTestUser(t, pool, "member-view-uid", "member-view@example.com")

	_, err := pool.Exec(context.Background(), `
		UPDATE users
		SET is_subscribed = TRUE, subscription_plan = $1
		WHERE id = $2
	`, string(services.CheckoutPlanStack), owner.ID)
	require.NoError(t, err)

	invite, err := models.CreateStackInvite(owner.ID, member.ID)
	require.NoError(t, err)
	require.NoError(t, models.AcceptStackInvite(invite.ID, member.ID))

	mockAuth := newMockAuthForUser(member)

	req := testutils.MakeRequest(t, http.MethodGet, "/api/billing/stack/members", nil, "valid-token")
	w := httptest.NewRecorder()

	GetStackMembers(w, req, mockAuth)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp StackMembersResponse
	testutils.ParseJSONResponse(t, w, &resp)
	assert.False(t, resp.CanManage)
	require.Len(t, resp.Members, 1)
	assert.Equal(t, member.ID, resp.Members[0].MemberUserID)
}

func TestAcceptStackInvite_ActivatesMembership(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)
	testutils.TruncateTables(t, pool, "stack_members", "users")

	owner := createStackTestUser(t, pool, "owner-accept-uid", "owner-accept@example.com")
	member := createStackTestUser(t, pool, "member-accept-uid", "member-accept@example.com")

	_, err := pool.Exec(context.Background(), `
		UPDATE users
		SET is_subscribed = TRUE, subscription_plan = $1
		WHERE id = $2
	`, string(services.CheckoutPlanStack), owner.ID)
	require.NoError(t, err)

	invite, err := models.CreateStackInvite(owner.ID, member.ID)
	require.NoError(t, err)

	mockAuth := newMockAuthForUser(member)

	req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/stack/accept/"+strconv.Itoa(invite.ID), nil, "valid-token")
	req = mux.SetURLVars(req, map[string]string{"id": strconv.Itoa(invite.ID)})
	w := httptest.NewRecorder()

	AcceptStackInvite(w, req, mockAuth)

	assert.Equal(t, http.StatusNoContent, w.Code)

	updatedInvite, err := models.GetStackMemberByID(invite.ID)
	require.NoError(t, err)
	require.NotNil(t, updatedInvite)
	assert.Equal(t, models.StackMemberStatusActive, updatedInvite.Status)
	assert.NotNil(t, updatedInvite.JoinedAt)

	updatedMember, err := models.GetUserByID(member.ID)
	require.NoError(t, err)
	require.NotNil(t, updatedMember)
	assert.True(t, updatedMember.IsSubscribed)
}

func TestAcceptStackInvite_SchedulesPersonalSubscriptionCancellation(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)
	testutils.TruncateTables(t, pool, "stack_members", "users")

	owner := createStackTestUser(t, pool, "owner-personal-sub-uid", "owner-personal-sub@example.com")
	member := createStackTestUser(t, pool, "member-personal-sub-uid", "member-personal-sub@example.com")

	_, err := pool.Exec(context.Background(), `
		UPDATE users
		SET is_subscribed = TRUE, subscription_plan = $1
		WHERE id = $2
	`, string(services.CheckoutPlanStack), owner.ID)
	require.NoError(t, err)

	_, err = pool.Exec(context.Background(), `
		UPDATE users
		SET is_subscribed = TRUE,
		    subscription_plan = $1,
		    stripe_customer_id = $2,
		    stripe_subscription_id = $3
		WHERE id = $4
	`, string(services.CheckoutPlanMonthly), "cus_member_stack_join", "sub_member_stack_join", member.ID)
	require.NoError(t, err)

	invite, err := models.CreateStackInvite(owner.ID, member.ID)
	require.NoError(t, err)

	originalGetSubscriptionFn := getStripeSubscriptionFn
	originalUpdateSubscriptionFn := updateStripeSubscriptionFn
	originalSecret, hadSecret := os.LookupEnv("STRIPE_SECRET_KEY")
	defer func() {
		getStripeSubscriptionFn = originalGetSubscriptionFn
		updateStripeSubscriptionFn = originalUpdateSubscriptionFn
		if hadSecret {
			_ = os.Setenv("STRIPE_SECRET_KEY", originalSecret)
		} else {
			_ = os.Unsetenv("STRIPE_SECRET_KEY")
		}
	}()

	_ = os.Setenv("STRIPE_SECRET_KEY", "sk_test_stack_accept")

	getStripeSubscriptionFn = func(id string, params *stripe.SubscriptionParams) (*stripe.Subscription, error) {
		return &stripe.Subscription{
			ID:                id,
			Status:            stripe.SubscriptionStatusActive,
			CancelAtPeriodEnd: false,
			Metadata: map[string]string{
				"plan": string(services.CheckoutPlanMonthly),
			},
			Customer: &stripe.Customer{ID: "cus_member_stack_join"},
		}, nil
	}

	var cancelScheduled bool
	updateStripeSubscriptionFn = func(id string, params *stripe.SubscriptionParams) (*stripe.Subscription, error) {
		cancelScheduled = params != nil && params.CancelAtPeriodEnd != nil && *params.CancelAtPeriodEnd

		futureCancelAt := time.Now().UTC().Add(30 * 24 * time.Hour).Unix()
		return &stripe.Subscription{
			ID:                id,
			Status:            stripe.SubscriptionStatusActive,
			CancelAtPeriodEnd: true,
			CancelAt:          futureCancelAt,
			Metadata: map[string]string{
				"plan": string(services.CheckoutPlanMonthly),
			},
			Customer: &stripe.Customer{ID: "cus_member_stack_join"},
		}, nil
	}

	mockAuth := newMockAuthForUser(member)
	req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/stack/accept/"+strconv.Itoa(invite.ID), nil, "valid-token")
	req = mux.SetURLVars(req, map[string]string{"id": strconv.Itoa(invite.ID)})
	w := httptest.NewRecorder()

	AcceptStackInvite(w, req, mockAuth)

	assert.Equal(t, http.StatusNoContent, w.Code)
	assert.True(t, cancelScheduled)

	updatedMember, err := models.GetUserByID(member.ID)
	require.NoError(t, err)
	require.NotNil(t, updatedMember)
	assert.True(t, updatedMember.IsSubscribed)
	require.NotNil(t, updatedMember.SubscriptionPlan)
	assert.Equal(t, string(services.CheckoutPlanStack), *updatedMember.SubscriptionPlan)
	assert.Nil(t, updatedMember.SubscriptionEndedAt)
	assert.Nil(t, updatedMember.SubscriptionTrialEndsAt)
	assert.True(t, updatedMember.PersonalIsSubscribed)
	require.NotNil(t, updatedMember.PersonalSubscriptionEndedAt)
	require.NotNil(t, updatedMember.PersonalSubscriptionPlan)
	assert.Equal(t, string(services.CheckoutPlanMonthly), *updatedMember.PersonalSubscriptionPlan)

	updatedInvite, err := models.GetStackMemberByID(invite.ID)
	require.NoError(t, err)
	require.NotNil(t, updatedInvite)
	assert.Equal(t, models.StackMemberStatusActive, updatedInvite.Status)
}

func TestAcceptStackInvite_PrioritizesStackOverPersonalTrial(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)
	testutils.TruncateTables(t, pool, "stack_members", "users")

	owner := createStackTestUser(t, pool, "owner-personal-trial-uid", "owner-personal-trial@example.com")
	member := createStackTestUser(t, pool, "member-personal-trial-uid", "member-personal-trial@example.com")

	_, err := pool.Exec(context.Background(), `
		UPDATE users
		SET is_subscribed = TRUE, subscription_plan = $1
		WHERE id = $2
	`, string(services.CheckoutPlanStack), owner.ID)
	require.NoError(t, err)

	_, err = pool.Exec(context.Background(), `
		UPDATE users
		SET is_subscribed = TRUE,
		    has_ever_personal_subscription = TRUE,
		    subscription_plan = $1,
		    stripe_customer_id = $2,
		    stripe_subscription_id = $3,
		    premium_trial_claimed_at = NOW()
		WHERE id = $4
	`, string(services.CheckoutPlanMonthly), "cus_member_trial_join", "sub_member_trial_join", member.ID)
	require.NoError(t, err)

	invite, err := models.CreateStackInvite(owner.ID, member.ID)
	require.NoError(t, err)

	originalGetSubscriptionFn := getStripeSubscriptionFn
	originalUpdateSubscriptionFn := updateStripeSubscriptionFn
	originalSecret, hadSecret := os.LookupEnv("STRIPE_SECRET_KEY")
	defer func() {
		getStripeSubscriptionFn = originalGetSubscriptionFn
		updateStripeSubscriptionFn = originalUpdateSubscriptionFn
		if hadSecret {
			_ = os.Setenv("STRIPE_SECRET_KEY", originalSecret)
		} else {
			_ = os.Unsetenv("STRIPE_SECRET_KEY")
		}
	}()

	_ = os.Setenv("STRIPE_SECRET_KEY", "sk_test_stack_accept_trial")
	trialEnd := time.Now().UTC().Add(10 * 24 * time.Hour)

	getStripeSubscriptionFn = func(id string, params *stripe.SubscriptionParams) (*stripe.Subscription, error) {
		return &stripe.Subscription{
			ID:                id,
			Status:            stripe.SubscriptionStatusTrialing,
			CancelAtPeriodEnd: false,
			TrialEnd:          trialEnd.Unix(),
			Metadata: map[string]string{
				"plan": string(services.CheckoutPlanMonthly),
			},
			Customer: &stripe.Customer{ID: "cus_member_trial_join"},
		}, nil
	}

	updateStripeSubscriptionFn = func(id string, params *stripe.SubscriptionParams) (*stripe.Subscription, error) {
		futureCancelAt := trialEnd.Unix()
		return &stripe.Subscription{
			ID:                id,
			Status:            stripe.SubscriptionStatusTrialing,
			CancelAtPeriodEnd: true,
			CancelAt:          futureCancelAt,
			TrialEnd:          trialEnd.Unix(),
			Metadata: map[string]string{
				"plan": string(services.CheckoutPlanMonthly),
			},
			Customer: &stripe.Customer{ID: "cus_member_trial_join"},
		}, nil
	}

	mockAuth := newMockAuthForUser(member)
	req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/stack/accept/"+strconv.Itoa(invite.ID), nil, "valid-token")
	req = mux.SetURLVars(req, map[string]string{"id": strconv.Itoa(invite.ID)})
	w := httptest.NewRecorder()

	AcceptStackInvite(w, req, mockAuth)

	assert.Equal(t, http.StatusNoContent, w.Code)

	updatedMember, err := models.GetUserByID(member.ID)
	require.NoError(t, err)
	require.NotNil(t, updatedMember)
	assert.True(t, updatedMember.IsSubscribed)
	require.NotNil(t, updatedMember.SubscriptionPlan)
	assert.Equal(t, string(services.CheckoutPlanStack), *updatedMember.SubscriptionPlan)
	assert.Nil(t, updatedMember.SubscriptionEndedAt)
	assert.Nil(t, updatedMember.SubscriptionTrialEndsAt)
	assert.True(t, updatedMember.PersonalIsSubscribed)
	require.NotNil(t, updatedMember.PersonalSubscriptionEndedAt)
	require.NotNil(t, updatedMember.PersonalSubscriptionTrialEndsAt)
	assert.WithinDuration(t, trialEnd, *updatedMember.PersonalSubscriptionTrialEndsAt, time.Second)
	require.NotNil(t, updatedMember.PersonalSubscriptionPlan)
	assert.Equal(t, string(services.CheckoutPlanMonthly), *updatedMember.PersonalSubscriptionPlan)
	assert.NotNil(t, updatedMember.PremiumTrialClaimedAt)
}

func TestInviteStackMember_AllowsMultiplePendingInvitesAcrossOwners(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)
	testutils.TruncateTables(t, pool, "stack_members", "users")

	ownerA := createStackTestUser(t, pool, "owner-a-multi-invite-uid", "owner-a-multi-invite@example.com")
	ownerB := createStackTestUser(t, pool, "owner-b-multi-invite-uid", "owner-b-multi-invite@example.com")
	member := createStackTestUser(t, pool, "member-multi-invite-uid", "member-multi-invite@example.com")

	_, err := pool.Exec(context.Background(), `
		UPDATE users
		SET is_subscribed = TRUE, subscription_plan = $1
		WHERE id IN ($2, $3)
	`, string(services.CheckoutPlanStack), ownerA.ID, ownerB.ID)
	require.NoError(t, err)

	reqA := testutils.MakeRequest(t, http.MethodPost, "/api/billing/stack/invite", map[string]string{
		"firebaseUid": *member.FirebaseUID,
	}, "valid-token")
	wA := httptest.NewRecorder()
	InviteStackMember(wA, reqA, newMockAuthForUser(ownerA))
	assert.Equal(t, http.StatusCreated, wA.Code)

	reqB := testutils.MakeRequest(t, http.MethodPost, "/api/billing/stack/invite", map[string]string{
		"firebaseUid": *member.FirebaseUID,
	}, "valid-token")
	wB := httptest.NewRecorder()
	InviteStackMember(wB, reqB, newMockAuthForUser(ownerB))
	assert.Equal(t, http.StatusCreated, wB.Code)

	pendingInvites, err := models.GetPendingStackInvitesByMemberUserID(member.ID)
	require.NoError(t, err)
	require.Len(t, pendingInvites, 2)
}

func TestAcceptStackInvite_ClearsOtherPendingInvitesForMember(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)
	testutils.TruncateTables(t, pool, "stack_members", "users")

	ownerA := createStackTestUser(t, pool, "owner-a-accept-cleanup-uid", "owner-a-accept-cleanup@example.com")
	ownerB := createStackTestUser(t, pool, "owner-b-accept-cleanup-uid", "owner-b-accept-cleanup@example.com")
	member := createStackTestUser(t, pool, "member-accept-cleanup-uid", "member-accept-cleanup@example.com")

	_, err := pool.Exec(context.Background(), `
		UPDATE users
		SET is_subscribed = TRUE, subscription_plan = $1
		WHERE id IN ($2, $3)
	`, string(services.CheckoutPlanStack), ownerA.ID, ownerB.ID)
	require.NoError(t, err)

	inviteA, err := models.CreateStackInvite(ownerA.ID, member.ID)
	require.NoError(t, err)
	inviteB, err := models.CreateStackInvite(ownerB.ID, member.ID)
	require.NoError(t, err)

	req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/stack/accept/"+strconv.Itoa(inviteA.ID), nil, "valid-token")
	req = mux.SetURLVars(req, map[string]string{"id": strconv.Itoa(inviteA.ID)})
	w := httptest.NewRecorder()

	AcceptStackInvite(w, req, newMockAuthForUser(member))
	assert.Equal(t, http.StatusNoContent, w.Code)

	acceptedInvite, err := models.GetStackMemberByID(inviteA.ID)
	require.NoError(t, err)
	require.NotNil(t, acceptedInvite)
	assert.Equal(t, models.StackMemberStatusActive, acceptedInvite.Status)

	removedInvite, err := models.GetStackMemberByID(inviteB.ID)
	require.NoError(t, err)
	assert.Nil(t, removedInvite)

	pendingInvites, err := models.GetPendingStackInvitesByMemberUserID(member.ID)
	require.NoError(t, err)
	assert.Empty(t, pendingInvites)
}

func TestDeclineStackInvite_RemovesOnlySelectedInvite(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)
	testutils.TruncateTables(t, pool, "stack_members", "users")

	ownerA := createStackTestUser(t, pool, "owner-a-decline-uid", "owner-a-decline@example.com")
	ownerB := createStackTestUser(t, pool, "owner-b-decline-uid", "owner-b-decline@example.com")
	member := createStackTestUser(t, pool, "member-decline-uid", "member-decline@example.com")

	_, err := pool.Exec(context.Background(), `
		UPDATE users
		SET is_subscribed = TRUE, subscription_plan = $1
		WHERE id IN ($2, $3)
	`, string(services.CheckoutPlanStack), ownerA.ID, ownerB.ID)
	require.NoError(t, err)

	inviteA, err := models.CreateStackInvite(ownerA.ID, member.ID)
	require.NoError(t, err)
	inviteB, err := models.CreateStackInvite(ownerB.ID, member.ID)
	require.NoError(t, err)

	req := testutils.MakeRequest(t, http.MethodPost, "/api/billing/stack/decline/"+strconv.Itoa(inviteA.ID), nil, "valid-token")
	req = mux.SetURLVars(req, map[string]string{"id": strconv.Itoa(inviteA.ID)})
	w := httptest.NewRecorder()

	DeclineStackInvite(w, req, newMockAuthForUser(member))
	assert.Equal(t, http.StatusNoContent, w.Code)

	declinedInvite, err := models.GetStackMemberByID(inviteA.ID)
	require.NoError(t, err)
	assert.Nil(t, declinedInvite)

	remainingInvite, err := models.GetStackMemberByID(inviteB.ID)
	require.NoError(t, err)
	require.NotNil(t, remainingInvite)
	assert.Equal(t, models.StackMemberStatusPending, remainingInvite.Status)
}

func TestStackMembershipAccessDependsOnOwnerStackSubscription(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)
	testutils.TruncateTables(t, pool, "stack_members", "users")

	owner := createStackTestUser(t, pool, "owner-derived-access-uid", "owner-derived-access@example.com")
	member := createStackTestUser(t, pool, "member-derived-access-uid", "member-derived-access@example.com")

	_, err := pool.Exec(context.Background(), `
		UPDATE users
		SET is_subscribed = TRUE, subscription_plan = $1
		WHERE id = $2
	`, string(services.CheckoutPlanStack), owner.ID)
	require.NoError(t, err)

	invite, err := models.CreateStackInvite(owner.ID, member.ID)
	require.NoError(t, err)
	require.NoError(t, models.AcceptStackInvite(invite.ID, member.ID))

	updatedMember, err := models.GetUserByID(member.ID)
	require.NoError(t, err)
	require.NotNil(t, updatedMember)
	assert.True(t, updatedMember.IsSubscribed)
	require.NotNil(t, updatedMember.SubscriptionPlan)
	assert.Equal(t, string(services.CheckoutPlanStack), *updatedMember.SubscriptionPlan)

	_, err = pool.Exec(context.Background(), `
		UPDATE users
		SET is_subscribed = FALSE,
		    subscription_plan = NULL,
		    subscription_ended_at = NOW()
		WHERE id = $1
	`, owner.ID)
	require.NoError(t, err)

	updatedMember, err = models.GetUserByID(member.ID)
	require.NoError(t, err)
	require.NotNil(t, updatedMember)
	assert.False(t, updatedMember.IsSubscribed)
	assert.Nil(t, updatedMember.SubscriptionPlan)
	require.NotNil(t, updatedMember.SubscriptionEndedAt)
}

func TestLeaveStack_StartsAndResetsGraceWindowForStackOnlyMember(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)
	testutils.TruncateTables(t, pool, "stack_members", "users")

	owner := createStackTestUser(t, pool, "owner-leave-grace-uid", "owner-leave-grace@example.com")
	member := createStackTestUser(t, pool, "member-leave-grace-uid", "member-leave-grace@example.com")

	_, err := pool.Exec(context.Background(), `
		UPDATE users
		SET is_subscribed = TRUE, subscription_plan = $1
		WHERE id = $2
	`, string(services.CheckoutPlanStack), owner.ID)
	require.NoError(t, err)

	invite, err := models.CreateStackInvite(owner.ID, member.ID)
	require.NoError(t, err)
	require.NoError(t, models.AcceptStackInvite(invite.ID, member.ID))

	oldEndedAt := time.Now().UTC().Add(-10 * 24 * time.Hour)
	_, err = pool.Exec(context.Background(), `
		UPDATE users
		SET is_subscribed = FALSE,
		    subscription_plan = NULL,
		    subscription_ended_at = $2
		WHERE id = $1
	`, member.ID, oldEndedAt)
	require.NoError(t, err)

	beforeLeave := time.Now().UTC()
	req := testutils.MakeRequest(t, http.MethodDelete, "/api/billing/stack/leave", nil, "valid-token")
	w := httptest.NewRecorder()

	LeaveStack(w, req, newMockAuthForUser(member))

	assert.Equal(t, http.StatusNoContent, w.Code)

	membership, err := models.GetActiveStackMemberByMemberUserID(member.ID)
	require.NoError(t, err)
	assert.Nil(t, membership)

	updatedMember, err := models.GetUserByID(member.ID)
	require.NoError(t, err)
	require.NotNil(t, updatedMember)
	assert.False(t, updatedMember.IsSubscribed)
	assert.Nil(t, updatedMember.SubscriptionPlan)
	require.NotNil(t, updatedMember.SubscriptionEndedAt)
	assert.True(t, updatedMember.SubscriptionEndedAt.After(oldEndedAt))
	assert.WithinDuration(t, beforeLeave, *updatedMember.SubscriptionEndedAt, 5*time.Second)
}

func TestRemoveStackMember_StartsAndResetsGraceWindowForStackOnlyMember(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)
	testutils.TruncateTables(t, pool, "stack_members", "users")

	owner := createStackTestUser(t, pool, "owner-remove-grace-uid", "owner-remove-grace@example.com")
	member := createStackTestUser(t, pool, "member-remove-grace-uid", "member-remove-grace@example.com")

	_, err := pool.Exec(context.Background(), `
		UPDATE users
		SET is_subscribed = TRUE, subscription_plan = $1
		WHERE id = $2
	`, string(services.CheckoutPlanStack), owner.ID)
	require.NoError(t, err)

	invite, err := models.CreateStackInvite(owner.ID, member.ID)
	require.NoError(t, err)
	require.NoError(t, models.AcceptStackInvite(invite.ID, member.ID))

	oldEndedAt := time.Now().UTC().Add(-6 * 24 * time.Hour)
	_, err = pool.Exec(context.Background(), `
		UPDATE users
		SET is_subscribed = FALSE,
		    subscription_plan = NULL,
		    subscription_ended_at = $2
		WHERE id = $1
	`, member.ID, oldEndedAt)
	require.NoError(t, err)

	membership, err := models.GetActiveStackMemberByMemberUserID(member.ID)
	require.NoError(t, err)
	require.NotNil(t, membership)

	beforeRemoval := time.Now().UTC()
	req := testutils.MakeRequest(t, http.MethodDelete, "/api/billing/stack/members/"+strconv.Itoa(membership.ID), nil, "valid-token")
	req = mux.SetURLVars(req, map[string]string{"id": strconv.Itoa(membership.ID)})
	w := httptest.NewRecorder()

	RemoveStackMember(w, req, newMockAuthForUser(owner))

	assert.Equal(t, http.StatusNoContent, w.Code)

	updatedMembership, err := models.GetStackMemberByID(membership.ID)
	require.NoError(t, err)
	assert.Nil(t, updatedMembership)

	updatedMember, err := models.GetUserByID(member.ID)
	require.NoError(t, err)
	require.NotNil(t, updatedMember)
	assert.False(t, updatedMember.IsSubscribed)
	assert.Nil(t, updatedMember.SubscriptionPlan)
	require.NotNil(t, updatedMember.SubscriptionEndedAt)
	assert.True(t, updatedMember.SubscriptionEndedAt.After(oldEndedAt))
	assert.WithinDuration(t, beforeRemoval, *updatedMember.SubscriptionEndedAt, 5*time.Second)
}

func createStackTestUser(t *testing.T, pool *pgxpool.Pool, firebaseUID, email string) *models.User {
	t.Helper()

	now := time.Now().UTC()
	user := &models.User{
		FirebaseUID:   strPtr(firebaseUID),
		Email:         strPtr(email),
		Name:          strPtr("Stack Test User"),
		EmailVerified: true,
	}

	err := pool.QueryRow(context.Background(), `
		INSERT INTO users (firebase_uid, email, email_verified, name, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`, user.FirebaseUID, user.Email, user.EmailVerified, user.Name, now, now).Scan(&user.ID)
	require.NoError(t, err)

	return user
}

func newMockAuthForUser(user *models.User) *testutils.MockFirebaseAuth {
	mockAuth := &testutils.MockFirebaseAuth{}
	mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
		return &auth.Token{UID: *user.FirebaseUID}, nil
	}
	mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
		return &auth.UserRecord{
			UserInfo:      &auth.UserInfo{UID: uid, Email: *user.Email},
			EmailVerified: true,
		}, nil
	}
	return mockAuth
}
