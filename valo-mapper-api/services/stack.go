package services

import (
	"errors"
	"strings"
	"valo-mapper-api/models"
)

// StackService handles stack member management and stack-related operations
type StackService struct{}

// NewStackService creates a new StackService
func NewStackService() *StackService {
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
		return 0, false, errors.New("not-in-stack")
	}

	if ss.IsStackOwner(user) {
		return user.ID, true, nil
	}

	membership, err := models.GetActiveStackMemberByMemberUserID(user.ID)
	if err != nil {
		return 0, false, err
	}
	if membership == nil || membership.Status != models.StackMemberStatusActive {
		return 0, false, errors.New("not-in-stack")
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
		return nil, errors.New("not-stack-owner")
	}

	targetFirebaseUID := strings.TrimSpace(req.FirebaseUID)
	if targetFirebaseUID == "" {
		return nil, errors.New("firebase-uid-required")
	}

	target, err := models.GetUserByFirebaseUID(targetFirebaseUID)
	if err != nil {
		return nil, err
	}
	if target == nil {
		return nil, errors.New("user-not-found")
	}

	if target.ID == owner.ID {
		return nil, errors.New("cannot-invite-self")
	}

	if ss.IsStackOwner(target) {
		return nil, errors.New("target-already-in-stack")
	}

	existingActiveMembership, err := models.GetActiveStackMemberByMemberUserID(target.ID)
	if err != nil {
		return nil, err
	}
	if existingActiveMembership != nil {
		return nil, errors.New("target-already-in-stack")
	}

	existingPendingInvite, err := models.GetPendingStackInviteByOwnerAndMember(owner.ID, target.ID)
	if err != nil {
		return nil, err
	}
	if existingPendingInvite != nil {
		return nil, errors.New("target-already-invited")
	}

	total, err := models.GetTotalStackMemberCount(owner.ID)
	if err != nil {
		return nil, err
	}
	if total >= StackMaxMembers {
		return nil, errors.New("stack-full")
	}

	invite, err := models.CreateStackInvite(owner.ID, target.ID)
	if err != nil {
		if errors.Is(err, models.ErrStackInviteAlreadyExists) {
			return nil, errors.New("target-already-invited")
		}
		return nil, err
	}

	return invite, nil
}

// RemoveStackMember removes a stack member or invite
func (ss *StackService) RemoveStackMember(owner *models.User, memberID int) error {
	if !ss.IsStackOwner(owner) {
		return errors.New("not-stack-owner")
	}

	if err := models.RemoveStackMember(owner.ID, memberID); err != nil {
		if errors.Is(err, models.ErrStackMemberNotFound) {
			return errors.New("stack-member-not-found")
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
		return errors.New("stack-invite-not-found")
	}
	if invite.MemberUserID != member.ID {
		return errors.New("forbidden")
	}

	if err := models.AcceptStackInvite(inviteID, member.ID); err != nil {
		if errors.Is(err, models.ErrStackInviteNotFound) {
			return errors.New("stack-invite-not-found")
		}
		if errors.Is(err, models.ErrStackMemberAlreadyActive) {
			return errors.New("target-already-in-stack")
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
		return errors.New("stack-invite-not-found")
	}
	if invite.MemberUserID != member.ID {
		return errors.New("forbidden")
	}

	if err := models.DeclineStackInvite(inviteID, member.ID); err != nil {
		if errors.Is(err, models.ErrStackInviteNotFound) {
			return errors.New("stack-invite-not-found")
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
		return errors.New("not-in-stack")
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
