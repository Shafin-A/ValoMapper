package services

import (
	"errors"
	"strings"
	"valo-mapper-api/models"
)

var (
	ErrNotInStack             = errors.New("not-in-stack")
	ErrNotStackOwner          = errors.New("not-stack-owner")
	ErrStackFirebaseUIDNeeded = errors.New("firebase-uid-required")
	ErrStackUserNotFound      = errors.New("user-not-found")
	ErrCannotInviteSelf       = errors.New("cannot-invite-self")
	ErrTargetAlreadyInStack   = errors.New("target-already-in-stack")
	ErrTargetAlreadyInvited   = errors.New("target-already-invited")
	ErrStackFull              = errors.New("stack-full")
	ErrStackMemberNotFound    = errors.New("stack-member-not-found")
	ErrStackInviteNotFound    = errors.New("stack-invite-not-found")
	ErrStackForbidden         = errors.New("forbidden")
)

// StackServiceDependencies holds injectable dependencies for StackService.
type StackServiceDependencies struct{}

// StackService handles stack member management and stack-related operations
type StackService struct{}

// NewStackService creates a new StackService
func NewStackService(_ StackServiceDependencies) *StackService {
	return &StackService{}
}

const (
	// StackMaxMembers is the maximum number of members per stack
	StackMaxMembers = 6
)

// IsStackOwner checks if a user is a stack owner
func (ss *StackService) IsStackOwner(user *models.User) bool {
	return user != nil && user.HasActivePersonalPlan(string(CheckoutPlanStack))
}

// GetStackViewContext returns the ownerUserID and canManage flag for the user's stack context
// Returns the owner's ID, whether current user can manage,  and any errors
func (ss *StackService) GetStackViewContext(user *models.User) (int, bool, error) {
	if user == nil {
		return 0, false, ErrNotInStack
	}

	if ss.IsStackOwner(user) {
		return user.ID, true, nil
	}

	membership, err := models.GetActiveStackMemberByMemberUserID(user.ID)
	if err != nil {
		return 0, false, err
	}
	if membership == nil || membership.Status != models.StackMemberStatusActive {
		return 0, false, ErrNotInStack
	}

	return membership.OwnerUserID, false, nil
}

// InviteStackMemberRequest wraps stack invite input
type InviteStackMemberRequest struct {
	FirebaseUID string
}

// InviteStackMember invites a user to join a stack
func (ss *StackService) InviteStackMember(owner *models.User, req InviteStackMemberRequest) (*models.StackMember, error) {
	if !ss.IsStackOwner(owner) {
		return nil, ErrNotStackOwner
	}

	targetFirebaseUID := strings.TrimSpace(req.FirebaseUID)
	if targetFirebaseUID == "" {
		return nil, ErrStackFirebaseUIDNeeded
	}

	target, err := models.GetUserByFirebaseUID(targetFirebaseUID)
	if err != nil {
		return nil, err
	}
	if target == nil {
		return nil, ErrStackUserNotFound
	}

	if target.ID == owner.ID {
		return nil, ErrCannotInviteSelf
	}

	if ss.IsStackOwner(target) {
		return nil, ErrTargetAlreadyInStack
	}

	existingActiveMembership, err := models.GetActiveStackMemberByMemberUserID(target.ID)
	if err != nil {
		return nil, err
	}
	if existingActiveMembership != nil {
		return nil, ErrTargetAlreadyInStack
	}

	existingPendingInvite, err := models.GetPendingStackInviteByOwnerAndMember(owner.ID, target.ID)
	if err != nil {
		return nil, err
	}
	if existingPendingInvite != nil {
		return nil, ErrTargetAlreadyInvited
	}

	total, err := models.GetTotalStackMemberCount(owner.ID)
	if err != nil {
		return nil, err
	}
	if total >= StackMaxMembers {
		return nil, ErrStackFull
	}

	invite, err := models.CreateStackInvite(owner.ID, target.ID)
	if err != nil {
		if errors.Is(err, models.ErrStackInviteAlreadyExists) {
			return nil, ErrTargetAlreadyInvited
		}
		return nil, err
	}

	return invite, nil
}

// RemoveStackMember removes a stack member or invite
func (ss *StackService) RemoveStackMember(owner *models.User, memberID int) error {
	if !ss.IsStackOwner(owner) {
		return ErrNotStackOwner
	}

	if err := models.RemoveStackMember(owner.ID, memberID); err != nil {
		if errors.Is(err, models.ErrStackMemberNotFound) {
			return ErrStackMemberNotFound
		}
		return err
	}

	return nil
}

// AcceptStackInvite accepts a stack invite for a member
func (ss *StackService) AcceptStackInvite(member *models.User, inviteID int) error {
	invite, err := models.GetStackMemberByID(inviteID)
	if err != nil {
		return err
	}
	if invite == nil {
		return ErrStackInviteNotFound
	}
	if invite.MemberUserID != member.ID {
		return ErrStackForbidden
	}

	if err := models.AcceptStackInvite(inviteID, member.ID); err != nil {
		if errors.Is(err, models.ErrStackInviteNotFound) {
			return ErrStackInviteNotFound
		}
		if errors.Is(err, models.ErrStackMemberAlreadyActive) {
			return ErrTargetAlreadyInStack
		}
		return err
	}

	return nil
}

// DeclineStackInvite declines a stack invite for a member
func (ss *StackService) DeclineStackInvite(member *models.User, inviteID int) error {
	invite, err := models.GetStackMemberByID(inviteID)
	if err != nil {
		return err
	}
	if invite == nil {
		return ErrStackInviteNotFound
	}
	if invite.MemberUserID != member.ID {
		return ErrStackForbidden
	}

	if err := models.DeclineStackInvite(inviteID, member.ID); err != nil {
		if errors.Is(err, models.ErrStackInviteNotFound) {
			return ErrStackInviteNotFound
		}
		return err
	}

	return nil
}

// LeaveStack removes the current user from their active stack
func (ss *StackService) LeaveStack(member *models.User) error {
	membership, err := models.GetActiveStackMemberByMemberUserID(member.ID)
	if err != nil {
		return err
	}
	if membership == nil {
		return ErrNotInStack
	}

	return models.LeaveStack(member.ID)
}

// GetStackMembers retrieves the members of a stack
func (ss *StackService) GetStackMembers(ownerID int) ([]models.StackMember, error) {
	return models.GetStackMembersForOwner(ownerID)
}

// GetPendingInvites retrieves pending stack invites for a user
func (ss *StackService) GetPendingInvites(memberID int) ([]models.StackMember, error) {
	invites, err := models.GetPendingStackInvitesByMemberUserID(memberID)
	if err != nil {
		return nil, err
	}
	if invites == nil {
		invites = []models.StackMember{}
	}
	return invites, nil
}
