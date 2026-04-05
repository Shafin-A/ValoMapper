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

// StackRepository abstracts persistence operations for StackService.
type StackRepository interface {
	GetActiveStackMemberByMemberUserID(userID int) (*models.StackMember, error)
	GetUserByFirebaseUID(uid string) (*models.User, error)
	GetPendingStackInviteByOwnerAndMember(ownerID, memberID int) (*models.StackMember, error)
	GetTotalStackMemberCount(ownerID int) (int, error)
	CreateStackInvite(ownerID, memberID int) (*models.StackMember, error)
	RemoveStackMember(ownerID, memberID int) error
	GetStackMemberByID(id int) (*models.StackMember, error)
	AcceptStackInvite(inviteID, memberID int) error
	DeclineStackInvite(inviteID, memberID int) error
	LeaveStack(memberID int) error
	GetStackMembersForOwner(ownerID int) ([]models.StackMember, error)
	GetPendingStackInvitesByMemberUserID(memberID int) ([]models.StackMember, error)
}

type defaultStackRepository struct{}

func (r *defaultStackRepository) GetActiveStackMemberByMemberUserID(userID int) (*models.StackMember, error) {
	return models.GetActiveStackMemberByMemberUserID(userID)
}
func (r *defaultStackRepository) GetUserByFirebaseUID(uid string) (*models.User, error) {
	return models.GetUserByFirebaseUID(uid)
}
func (r *defaultStackRepository) GetPendingStackInviteByOwnerAndMember(ownerID, memberID int) (*models.StackMember, error) {
	return models.GetPendingStackInviteByOwnerAndMember(ownerID, memberID)
}
func (r *defaultStackRepository) GetTotalStackMemberCount(ownerID int) (int, error) {
	return models.GetTotalStackMemberCount(ownerID)
}
func (r *defaultStackRepository) CreateStackInvite(ownerID, memberID int) (*models.StackMember, error) {
	return models.CreateStackInvite(ownerID, memberID)
}
func (r *defaultStackRepository) RemoveStackMember(ownerID, memberID int) error {
	return models.RemoveStackMember(ownerID, memberID)
}
func (r *defaultStackRepository) GetStackMemberByID(id int) (*models.StackMember, error) {
	return models.GetStackMemberByID(id)
}
func (r *defaultStackRepository) AcceptStackInvite(inviteID, memberID int) error {
	return models.AcceptStackInvite(inviteID, memberID)
}
func (r *defaultStackRepository) DeclineStackInvite(inviteID, memberID int) error {
	return models.DeclineStackInvite(inviteID, memberID)
}
func (r *defaultStackRepository) LeaveStack(memberID int) error {
	return models.LeaveStack(memberID)
}
func (r *defaultStackRepository) GetStackMembersForOwner(ownerID int) ([]models.StackMember, error) {
	return models.GetStackMembersForOwner(ownerID)
}
func (r *defaultStackRepository) GetPendingStackInvitesByMemberUserID(memberID int) ([]models.StackMember, error) {
	return models.GetPendingStackInvitesByMemberUserID(memberID)
}

// StackServiceDependencies holds injectable dependencies for StackService.
type StackServiceDependencies struct {
	Repo StackRepository
}

// StackService handles stack member management and stack-related operations
type StackService struct {
	repo StackRepository
}

// NewStackService creates a new StackService
func NewStackService(deps StackServiceDependencies) *StackService {
	repo := deps.Repo
	if repo == nil {
		repo = &defaultStackRepository{}
	}
	return &StackService{repo: repo}
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

	membership, err := ss.repo.GetActiveStackMemberByMemberUserID(user.ID)
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

	target, err := ss.repo.GetUserByFirebaseUID(targetFirebaseUID)
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

	existingActiveMembership, err := ss.repo.GetActiveStackMemberByMemberUserID(target.ID)
	if err != nil {
		return nil, err
	}
	if existingActiveMembership != nil {
		return nil, ErrTargetAlreadyInStack
	}

	existingPendingInvite, err := ss.repo.GetPendingStackInviteByOwnerAndMember(owner.ID, target.ID)
	if err != nil {
		return nil, err
	}
	if existingPendingInvite != nil {
		return nil, ErrTargetAlreadyInvited
	}

	total, err := ss.repo.GetTotalStackMemberCount(owner.ID)
	if err != nil {
		return nil, err
	}
	if total >= StackMaxMembers {
		return nil, ErrStackFull
	}

	invite, err := ss.repo.CreateStackInvite(owner.ID, target.ID)
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

	if err := ss.repo.RemoveStackMember(owner.ID, memberID); err != nil {
		if errors.Is(err, models.ErrStackMemberNotFound) {
			return ErrStackMemberNotFound
		}
		return err
	}

	return nil
}

// AcceptStackInvite accepts a stack invite for a member
func (ss *StackService) AcceptStackInvite(member *models.User, inviteID int) error {
	invite, err := ss.repo.GetStackMemberByID(inviteID)
	if err != nil {
		return err
	}
	if invite == nil {
		return ErrStackInviteNotFound
	}
	if invite.MemberUserID != member.ID {
		return ErrStackForbidden
	}

	if err := ss.repo.AcceptStackInvite(inviteID, member.ID); err != nil {
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
	invite, err := ss.repo.GetStackMemberByID(inviteID)
	if err != nil {
		return err
	}
	if invite == nil {
		return ErrStackInviteNotFound
	}
	if invite.MemberUserID != member.ID {
		return ErrStackForbidden
	}

	if err := ss.repo.DeclineStackInvite(inviteID, member.ID); err != nil {
		if errors.Is(err, models.ErrStackInviteNotFound) {
			return ErrStackInviteNotFound
		}
		return err
	}

	return nil
}

// LeaveStack removes the current user from their active stack
func (ss *StackService) LeaveStack(member *models.User) error {
	membership, err := ss.repo.GetActiveStackMemberByMemberUserID(member.ID)
	if err != nil {
		return err
	}
	if membership == nil {
		return ErrNotInStack
	}

	return ss.repo.LeaveStack(member.ID)
}

// GetStackMembers retrieves the members of a stack
func (ss *StackService) GetStackMembers(ownerID int) ([]models.StackMember, error) {
	return ss.repo.GetStackMembersForOwner(ownerID)
}

// GetPendingInvites retrieves pending stack invites for a user
func (ss *StackService) GetPendingInvites(memberID int) ([]models.StackMember, error) {
	invites, err := ss.repo.GetPendingStackInvitesByMemberUserID(memberID)
	if err != nil {
		return nil, err
	}
	if invites == nil {
		invites = []models.StackMember{}
	}
	return invites, nil
}
