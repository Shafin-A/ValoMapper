package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
	"valo-mapper-api/middleware"
	"valo-mapper-api/models"
	"valo-mapper-api/utils"

	"github.com/gorilla/mux"
	"github.com/stripe/stripe-go/v82"
)

// GetStackMembers godoc
// @Summary Get stack members
// @Description Returns pending and active stack members for the authenticated stack owner.
// @Tags billing
// @Produce json
// @Success 200 {object} StackMembersResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/billing/stack/members [get]
func GetStackMembers(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	requestID := middleware.GetRequestID(r)

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), requestID)
		return
	}

	if !isStackOwner(user) {
		utils.SendJSONError(w, utils.NewForbidden(errNotStackOwner.Error()), requestID)
		return
	}

	members, err := models.GetStackMembersForOwner(user.ID)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Failed to fetch stack members", err), requestID)
		return
	}

	utils.SendJSON(w, http.StatusOK, StackMembersResponse{Members: members}, requestID)
}

// InviteStackMember godoc
// @Summary Invite user to stack
// @Description Invites a user by Firebase UID to join the authenticated stack owner's plan.
// @Tags billing
// @Accept json
// @Produce json
// @Param request body InviteStackMemberRequest true "Invite request"
// @Success 201 {object} models.StackMember
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/billing/stack/invite [post]
func InviteStackMember(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	requestID := middleware.GetRequestID(r)

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), requestID)
		return
	}

	if !isStackOwner(user) {
		utils.SendJSONError(w, utils.NewForbidden(errNotStackOwner.Error()), requestID)
		return
	}

	var req InviteStackMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), requestID)
		return
	}

	targetFirebaseUID := strings.TrimSpace(req.FirebaseUID)
	if targetFirebaseUID == "" {
		utils.SendJSONError(w, utils.NewBadRequest("firebase-uid-required"), requestID)
		return
	}

	target, err := models.GetUserByFirebaseUID(targetFirebaseUID)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Failed to look up user", err), requestID)
		return
	}
	if target == nil {
		utils.SendJSONError(w, utils.NewNotFound("user-not-found"), requestID)
		return
	}

	if target.ID == user.ID {
		utils.SendJSONError(w, utils.NewBadRequest(errCannotInviteSelf.Error()), requestID)
		return
	}

	if isStackOwner(target) {
		utils.SendJSONError(w, utils.NewConflict(errTargetAlreadyInStack.Error(), nil), requestID)
		return
	}

	existing, err := models.GetStackMemberByMemberUserID(target.ID)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Failed to check existing membership", err), requestID)
		return
	}
	if existing != nil {
		utils.SendJSONError(w, utils.NewConflict(errTargetAlreadyInStack.Error(), nil), requestID)
		return
	}

	total, err := models.GetTotalStackMemberCount(user.ID)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Failed to count stack members", err), requestID)
		return
	}
	if total >= StackMaxMembers {
		utils.SendJSONError(w, &utils.HTTPError{Status: http.StatusUnprocessableEntity, Message: errStackFull.Error()}, requestID)
		return
	}

	invite, err := models.CreateStackInvite(user.ID, target.ID)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Failed to create invite", err), requestID)
		return
	}

	utils.SendJSON(w, http.StatusCreated, invite, requestID)
}

// RemoveStackMember godoc
// @Summary Remove stack member
// @Description Removes a member invite or active member from the authenticated stack owner's stack.
// @Tags billing
// @Produce json
// @Param id path int true "Stack member record ID"
// @Success 204
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/billing/stack/members/{id} [delete]
func RemoveStackMember(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	requestID := middleware.GetRequestID(r)

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), requestID)
		return
	}

	if !isStackOwner(user) {
		utils.SendJSONError(w, utils.NewForbidden(errNotStackOwner.Error()), requestID)
		return
	}

	memberID, err := parseIDVar(r, "id")
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("invalid-id"), requestID)
		return
	}

	if err := models.RemoveStackMember(user.ID, memberID); err != nil {
		if errors.Is(err, models.ErrStackMemberNotFound) {
			utils.SendJSONError(w, utils.NewNotFound("stack-member-not-found"), requestID)
			return
		}
		utils.SendJSONError(w, utils.NewInternal("Failed to remove stack member", err), requestID)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// AcceptStackInvite godoc
// @Summary Accept stack invite
// @Description Accepts a pending stack invite for the authenticated user and schedules cancellation of any personal Stripe subscription.
// @Tags billing
// @Produce json
// @Param id path int true "Stack invite ID"
// @Success 204
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/billing/stack/accept/{id} [post]
func AcceptStackInvite(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	requestID := middleware.GetRequestID(r)

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), requestID)
		return
	}

	inviteID, err := parseIDVar(r, "id")
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("invalid-id"), requestID)
		return
	}

	invite, err := models.GetStackMemberByID(inviteID)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Failed to look up invite", err), requestID)
		return
	}
	if invite == nil {
		utils.SendJSONError(w, utils.NewNotFound("stack-invite-not-found"), requestID)
		return
	}
	if invite.MemberUserID != user.ID {
		utils.SendJSONError(w, utils.NewForbidden("forbidden"), requestID)
		return
	}

	if err := models.AcceptStackInvite(inviteID, user.ID); err != nil {
		if errors.Is(err, models.ErrStackInviteNotFound) {
			utils.SendJSONError(w, utils.NewNotFound("stack-invite-not-found"), requestID)
			return
		}
		utils.SendJSONError(w, utils.NewInternal("Failed to accept invite", err), requestID)
		return
	}

	if err := schedulePersonalSubscriptionCancellationForStackJoin(user); err != nil {
		revertErr := models.LeaveStack(user.ID)
		if revertErr != nil {
			err = errors.Join(err, revertErr)
		}
		utils.SendJSONError(w, utils.NewInternal("Failed to finalize stack invite acceptance", err), requestID)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// LeaveStack godoc
// @Summary Leave current stack
// @Description Leaves the stack that the authenticated user currently belongs to.
// @Tags billing
// @Produce json
// @Success 204
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/billing/stack/leave [delete]
func LeaveStack(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	requestID := middleware.GetRequestID(r)

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), requestID)
		return
	}

	if err := models.LeaveStack(user.ID); err != nil {
		if errors.Is(err, models.ErrStackMemberNotFound) {
			utils.SendJSONError(w, utils.NewNotFound("not-in-stack"), requestID)
			return
		}
		utils.SendJSONError(w, utils.NewInternal("Failed to leave stack", err), requestID)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GetPendingStackInvite godoc
// @Summary Get pending stack invite
// @Description Returns the pending stack invite for the authenticated user if one exists.
// @Tags billing
// @Produce json
// @Success 200 {object} models.StackMember
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/billing/stack/pending-invite [get]
func GetPendingStackInvite(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	requestID := middleware.GetRequestID(r)

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), requestID)
		return
	}

	invite, err := models.GetStackMemberByMemberUserID(user.ID)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Failed to fetch pending invite", err), requestID)
		return
	}
	if invite == nil || invite.Status != models.StackMemberStatusPending {
		utils.SendJSONError(w, utils.NewNotFound("no-pending-invite"), requestID)
		return
	}

	utils.SendJSON(w, http.StatusOK, invite, requestID)
}

// isStackOwner returns true if the user has an active stack subscription.
func isStackOwner(user *models.User) bool {
	return user != nil && user.HasActivePersonalPlan(string(checkoutPlanStack))
}

func schedulePersonalSubscriptionCancellationForStackJoin(user *models.User) error {
	if user == nil || !user.HasActivePersonalSubscription() || user.StripeSubscriptionID == nil || strings.TrimSpace(*user.StripeSubscriptionID) == "" {
		return nil
	}

	stripeSecretKey := strings.TrimSpace(os.Getenv("STRIPE_SECRET_KEY"))
	if stripeSecretKey == "" {
		return errors.New("stripe checkout is not configured")
	}

	stripe.Key = stripeSecretKey

	stripeSubscriptionID := strings.TrimSpace(*user.StripeSubscriptionID)
	stripeSubscription, err := getStripeSubscriptionFn(stripeSubscriptionID, nil)
	if err != nil {
		if isStripeResourceMissingError(err) {
			now := time.Now().UTC()
			return user.UpdateStripeBillingState(user.StripeCustomerID, nil, false, &now, nil)
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
		return syncUserPersonalBillingFromStripeSubscription(user, stripeSubscription)
	}

	updatedSubscription, err := updateStripeSubscriptionFn(strings.TrimSpace(stripeSubscription.ID), &stripe.SubscriptionParams{
		CancelAtPeriodEnd: stripe.Bool(true),
	})
	if err != nil {
		return err
	}

	return syncUserPersonalBillingFromStripeSubscription(user, updatedSubscription)
}

func syncUserPersonalBillingFromStripeSubscription(user *models.User, stripeSubscription *stripe.Subscription) error {
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

	updatedPlan := user.PersonalSubscriptionPlan
	if updatedPlan == nil {
		if planVal := strings.TrimSpace(stripeSubscription.Metadata["plan"]); planVal != "" {
			updatedPlan = &planVal
		}
	}
	if !isSubscribed {
		updatedPlan = nil
	}

	return user.UpdateStripeBillingState(nextStripeCustomerID, nextStripeSubscriptionID, isSubscribed, subscriptionEndedAt, updatedPlan)
}

// parseIDVar extracts a named path variable and converts it to int.
func parseIDVar(r *http.Request, name string) (int, error) {
	return strconv.Atoi(mux.Vars(r)[name])
}
