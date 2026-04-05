package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"strconv"
	"strings"
	"valo-mapper-api/middleware"
	"valo-mapper-api/models"
	"valo-mapper-api/services"
	"valo-mapper-api/utils"

	"github.com/gorilla/mux"
	"github.com/stripe/stripe-go/v82"
)

// GetStackMembers godoc
// @Summary Get stack members
// @Description Returns pending and active stack members for the authenticated stack context. Stack owners and active stack members can view the roster.
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

	stackService := services.NewStackService(services.StackServiceDependencies{})
	ownerUserID, canManage, err := stackService.GetStackViewContext(user)
	if err != nil {
		if errors.Is(err, services.ErrNotInStack) {
			utils.SendJSONError(w, utils.NewForbidden(services.ErrNotInStack.Error()), requestID)
			return
		}
		utils.SendJSONError(w, utils.NewInternal("Failed to resolve stack context", err), requestID)
		return
	}

	members, err := stackService.GetStackMembers(ownerUserID)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Failed to fetch stack members", err), requestID)
		return
	}

	ownerResponse := StackOwnerResponse{UserID: ownerUserID}
	owner, err := models.GetUserByID(ownerUserID)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Failed to fetch stack owner", err), requestID)
		return
	}
	if owner != nil {
		ownerResponse.Name = owner.Name
		ownerResponse.Email = owner.Email
	}

	utils.SendJSON(w, http.StatusOK, StackMembersResponse{Owner: ownerResponse, Members: members, CanManage: canManage}, requestID)
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

	var req InviteStackMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), requestID)
		return
	}

	stackService := services.NewStackService(services.StackServiceDependencies{})
	invite, err := stackService.InviteStackMember(user, services.InviteStackMemberRequest{FirebaseUID: req.FirebaseUID})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrNotStackOwner):
			utils.SendJSONError(w, utils.NewForbidden(services.ErrNotStackOwner.Error()), requestID)
			return
		case errors.Is(err, services.ErrStackFirebaseUIDNeeded):
			utils.SendJSONError(w, utils.NewBadRequest("firebase-uid-required"), requestID)
			return
		case errors.Is(err, services.ErrStackUserNotFound):
			utils.SendJSONError(w, utils.NewNotFound("user-not-found"), requestID)
			return
		case errors.Is(err, services.ErrCannotInviteSelf):
			utils.SendJSONError(w, utils.NewBadRequest(services.ErrCannotInviteSelf.Error()), requestID)
			return
		case errors.Is(err, services.ErrTargetAlreadyInStack):
			utils.SendJSONError(w, utils.NewConflict(services.ErrTargetAlreadyInStack.Error(), nil), requestID)
			return
		case errors.Is(err, services.ErrTargetAlreadyInvited):
			utils.SendJSONError(w, utils.NewConflict(services.ErrTargetAlreadyInvited.Error(), nil), requestID)
			return
		case errors.Is(err, services.ErrStackFull):
			utils.SendJSONError(w, &utils.HTTPError{Status: http.StatusUnprocessableEntity, Message: services.ErrStackFull.Error()}, requestID)
			return
		default:
			utils.SendJSONError(w, utils.NewInternal("Failed to create invite", err), requestID)
			return
		}
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

	memberID, err := parseIDVar(r, "id")
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("invalid-id"), requestID)
		return
	}

	stackService := services.NewStackService(services.StackServiceDependencies{})
	if err := stackService.RemoveStackMember(user, memberID); err != nil {
		if errors.Is(err, services.ErrNotStackOwner) {
			utils.SendJSONError(w, utils.NewForbidden(services.ErrNotStackOwner.Error()), requestID)
			return
		}
		if errors.Is(err, services.ErrStackMemberNotFound) {
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

	stackService := services.NewStackService(services.StackServiceDependencies{})
	if err := stackService.AcceptStackInvite(user, inviteID); err != nil {
		switch {
		case errors.Is(err, services.ErrStackInviteNotFound):
			utils.SendJSONError(w, utils.NewNotFound("stack-invite-not-found"), requestID)
			return
		case errors.Is(err, services.ErrStackForbidden):
			utils.SendJSONError(w, utils.NewForbidden("forbidden"), requestID)
			return
		case errors.Is(err, services.ErrTargetAlreadyInStack):
			utils.SendJSONError(w, utils.NewConflict(services.ErrTargetAlreadyInStack.Error(), nil), requestID)
			return
		default:
			utils.SendJSONError(w, utils.NewInternal("Failed to accept invite", err), requestID)
			return
		}
	}

	// Only handle subscription cancellation if user has an active personal subscription
	if user.HasActivePersonalSubscription() && user.StripeSubscriptionID != nil && strings.TrimSpace(*user.StripeSubscriptionID) != "" {
		stripeSecretKey := strings.TrimSpace(os.Getenv("STRIPE_SECRET_KEY"))
		if stripeSecretKey == "" {
			revertErr := models.LeaveStack(user.ID)
			if revertErr != nil {
				err = errors.Join(errors.New("stripe checkout is not configured"), revertErr)
			} else {
				err = errors.New("stripe checkout is not configured")
			}
			utils.SendJSONError(w, utils.NewInternal("Failed to finalize stack invite acceptance", err), requestID)
			return
		}

		stripe.Key = stripeSecretKey
		billingService := services.NewBillingService(services.BillingServiceDependencies{
			UpdateStripeSubscriptionFn: updateStripeSubscriptionFn,
			GetStripeSubscriptionFn:    getStripeSubscriptionFn,
		})

		if err := billingService.SchedulePersonalSubscriptionCancellationForStackJoin(user); err != nil {
			revertErr := models.LeaveStack(user.ID)
			if revertErr != nil {
				err = errors.Join(err, revertErr)
			}
			utils.SendJSONError(w, utils.NewInternal("Failed to finalize stack invite acceptance", err), requestID)
			return
		}
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

	stackService := services.NewStackService(services.StackServiceDependencies{})
	if err := stackService.LeaveStack(user); err != nil {
		if errors.Is(err, services.ErrNotInStack) {
			utils.SendJSONError(w, utils.NewNotFound("not-in-stack"), requestID)
			return
		}
		utils.SendJSONError(w, utils.NewInternal("Failed to leave stack", err), requestID)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// DeclineStackInvite godoc
// @Summary Decline stack invite
// @Description Declines a specific pending stack invite for the authenticated user.
// @Tags billing
// @Produce json
// @Param id path int true "Stack invite ID"
// @Success 204
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/billing/stack/decline/{id} [post]
func DeclineStackInvite(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
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

	stackService := services.NewStackService(services.StackServiceDependencies{})
	if err := stackService.DeclineStackInvite(user, inviteID); err != nil {
		if errors.Is(err, services.ErrStackInviteNotFound) {
			utils.SendJSONError(w, utils.NewNotFound("stack-invite-not-found"), requestID)
			return
		}
		if errors.Is(err, services.ErrStackForbidden) {
			utils.SendJSONError(w, utils.NewForbidden("forbidden"), requestID)
			return
		}
		utils.SendJSONError(w, utils.NewInternal("Failed to decline stack invite", err), requestID)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GetPendingStackInvites godoc
// @Summary Get pending stack invites
// @Description Returns the pending stack invites for the authenticated user.
// @Tags billing
// @Produce json
// @Success 200 {array} models.StackMember
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/billing/stack/pending-invites [get]
func GetPendingStackInvites(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	requestID := middleware.GetRequestID(r)

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), requestID)
		return
	}

	stackService := services.NewStackService(services.StackServiceDependencies{})
	invites, err := stackService.GetPendingInvites(user.ID)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Failed to fetch pending invites", err), requestID)
		return
	}

	utils.SendJSON(w, http.StatusOK, invites, requestID)
}

// parseIDVar extracts a named path variable and converts it to int.
func parseIDVar(r *http.Request, name string) (int, error) {
	return strconv.Atoi(mux.Vars(r)[name])
}

