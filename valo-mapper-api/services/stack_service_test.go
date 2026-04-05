package services

import (
	"testing"
	"valo-mapper-api/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockStackRepo struct {
	getActiveStackMemberByMemberUserIDFn    func(userID int) (*models.StackMember, error)
	getUserByFirebaseUIDFn                  func(uid string) (*models.User, error)
	getPendingStackInviteByOwnerAndMemberFn func(ownerID, memberID int) (*models.StackMember, error)
	getTotalStackMemberCountFn              func(ownerID int) (int, error)
	createStackInviteFn                     func(ownerID, memberID int) (*models.StackMember, error)
	removeStackMemberFn                     func(ownerID, memberID int) error
	getStackMemberByIDFn                    func(id int) (*models.StackMember, error)
	acceptStackInviteFn                     func(inviteID, memberID int) error
	declineStackInviteFn                    func(inviteID, memberID int) error
	leaveStackFn                            func(memberID int) error
	getStackMembersForOwnerFn               func(ownerID int) ([]models.StackMember, error)
	getPendingStackInvitesByMemberUserIDFn  func(memberID int) ([]models.StackMember, error)
}

func (m *mockStackRepo) GetActiveStackMemberByMemberUserID(userID int) (*models.StackMember, error) {
	if m.getActiveStackMemberByMemberUserIDFn == nil {
		return nil, nil
	}
	return m.getActiveStackMemberByMemberUserIDFn(userID)
}
func (m *mockStackRepo) GetUserByFirebaseUID(uid string) (*models.User, error) {
	if m.getUserByFirebaseUIDFn == nil {
		return nil, nil
	}
	return m.getUserByFirebaseUIDFn(uid)
}
func (m *mockStackRepo) GetPendingStackInviteByOwnerAndMember(ownerID, memberID int) (*models.StackMember, error) {
	if m.getPendingStackInviteByOwnerAndMemberFn == nil {
		return nil, nil
	}
	return m.getPendingStackInviteByOwnerAndMemberFn(ownerID, memberID)
}
func (m *mockStackRepo) GetTotalStackMemberCount(ownerID int) (int, error) {
	if m.getTotalStackMemberCountFn == nil {
		return 0, nil
	}
	return m.getTotalStackMemberCountFn(ownerID)
}
func (m *mockStackRepo) CreateStackInvite(ownerID, memberID int) (*models.StackMember, error) {
	if m.createStackInviteFn == nil {
		return nil, nil
	}
	return m.createStackInviteFn(ownerID, memberID)
}
func (m *mockStackRepo) RemoveStackMember(ownerID, memberID int) error {
	if m.removeStackMemberFn == nil {
		return nil
	}
	return m.removeStackMemberFn(ownerID, memberID)
}
func (m *mockStackRepo) GetStackMemberByID(id int) (*models.StackMember, error) {
	if m.getStackMemberByIDFn == nil {
		return nil, nil
	}
	return m.getStackMemberByIDFn(id)
}
func (m *mockStackRepo) AcceptStackInvite(inviteID, memberID int) error {
	if m.acceptStackInviteFn == nil {
		return nil
	}
	return m.acceptStackInviteFn(inviteID, memberID)
}
func (m *mockStackRepo) DeclineStackInvite(inviteID, memberID int) error {
	if m.declineStackInviteFn == nil {
		return nil
	}
	return m.declineStackInviteFn(inviteID, memberID)
}
func (m *mockStackRepo) LeaveStack(memberID int) error {
	if m.leaveStackFn == nil {
		return nil
	}
	return m.leaveStackFn(memberID)
}
func (m *mockStackRepo) GetStackMembersForOwner(ownerID int) ([]models.StackMember, error) {
	if m.getStackMembersForOwnerFn == nil {
		return nil, nil
	}
	return m.getStackMembersForOwnerFn(ownerID)
}
func (m *mockStackRepo) GetPendingStackInvitesByMemberUserID(memberID int) ([]models.StackMember, error) {
	if m.getPendingStackInvitesByMemberUserIDFn == nil {
		return nil, nil
	}
	return m.getPendingStackInvitesByMemberUserIDFn(memberID)
}

// stackOwnerUser returns a User whose plan qualifies them as a stack owner.
func stackOwnerUser(id int) *models.User {
	plan := string(CheckoutPlanStack)
	return &models.User{
		ID:                       id,
		PersonalIsSubscribed:     true,
		PersonalSubscriptionPlan: &plan,
	}
}

func TestStackService_InviteStackMember(t *testing.T) {
	basicUser := func(id int) *models.User { return &models.User{ID: id} }

	// repoForSuccess wires all repo calls needed for the happy path.
	repoForSuccess := func() *mockStackRepo {
		return &mockStackRepo{
			getUserByFirebaseUIDFn: func(uid string) (*models.User, error) {
				return basicUser(2), nil
			},
			getActiveStackMemberByMemberUserIDFn: func(userID int) (*models.StackMember, error) {
				return nil, nil
			},
			getPendingStackInviteByOwnerAndMemberFn: func(ownerID, memberID int) (*models.StackMember, error) {
				return nil, nil
			},
			getTotalStackMemberCountFn: func(ownerID int) (int, error) {
				return 2, nil
			},
			createStackInviteFn: func(ownerID, memberID int) (*models.StackMember, error) {
				return &models.StackMember{
					ID:           10,
					OwnerUserID:  ownerID,
					MemberUserID: memberID,
					Status:       models.StackMemberStatusPending,
				}, nil
			},
		}
	}

	tests := []struct {
		name        string
		owner       *models.User
		req         InviteStackMemberRequest
		repo        *mockStackRepo
		expectedErr error
	}{
		{
			name:        "caller does not have a stack subscription",
			owner:       basicUser(1),
			req:         InviteStackMemberRequest{FirebaseUID: "target-uid"},
			repo:        &mockStackRepo{},
			expectedErr: ErrNotStackOwner,
		},
		{
			name:        "firebase uid is blank",
			owner:       stackOwnerUser(1),
			req:         InviteStackMemberRequest{FirebaseUID: "  "},
			repo:        &mockStackRepo{},
			expectedErr: ErrStackFirebaseUIDNeeded,
		},
		{
			name:  "target user does not exist",
			owner: stackOwnerUser(1),
			req:   InviteStackMemberRequest{FirebaseUID: "unknown-uid"},
			repo: &mockStackRepo{
				getUserByFirebaseUIDFn: func(uid string) (*models.User, error) { return nil, nil },
			},
			expectedErr: ErrStackUserNotFound,
		},
		{
			name:  "owner cannot invite themselves",
			owner: stackOwnerUser(1),
			req:   InviteStackMemberRequest{FirebaseUID: "owner-uid"},
			repo: &mockStackRepo{
				getUserByFirebaseUIDFn: func(uid string) (*models.User, error) {
					return stackOwnerUser(1), nil // same ID as owner
				},
			},
			expectedErr: ErrCannotInviteSelf,
		},
		{
			name:  "target is already a stack owner on another stack",
			owner: stackOwnerUser(1),
			req:   InviteStackMemberRequest{FirebaseUID: "other-owner-uid"},
			repo: &mockStackRepo{
				getUserByFirebaseUIDFn: func(uid string) (*models.User, error) {
					return stackOwnerUser(2), nil // different ID, but also a stack owner
				},
			},
			expectedErr: ErrTargetAlreadyInStack,
		},
		{
			name:  "target already has an active stack membership",
			owner: stackOwnerUser(1),
			req:   InviteStackMemberRequest{FirebaseUID: "member-uid"},
			repo: &mockStackRepo{
				getUserByFirebaseUIDFn: func(uid string) (*models.User, error) {
					return basicUser(2), nil
				},
				getActiveStackMemberByMemberUserIDFn: func(userID int) (*models.StackMember, error) {
					return &models.StackMember{
						OwnerUserID:  99,
						MemberUserID: 2,
						Status:       models.StackMemberStatusActive,
					}, nil
				},
			},
			expectedErr: ErrTargetAlreadyInStack,
		},
		{
			name:  "pending invite to target already exists",
			owner: stackOwnerUser(1),
			req:   InviteStackMemberRequest{FirebaseUID: "member-uid"},
			repo: &mockStackRepo{
				getUserByFirebaseUIDFn: func(uid string) (*models.User, error) {
					return basicUser(2), nil
				},
				getActiveStackMemberByMemberUserIDFn: func(userID int) (*models.StackMember, error) {
					return nil, nil
				},
				getPendingStackInviteByOwnerAndMemberFn: func(ownerID, memberID int) (*models.StackMember, error) {
					return &models.StackMember{Status: models.StackMemberStatusPending}, nil
				},
			},
			expectedErr: ErrTargetAlreadyInvited,
		},
		{
			name:  "stack already has the maximum number of members",
			owner: stackOwnerUser(1),
			req:   InviteStackMemberRequest{FirebaseUID: "member-uid"},
			repo: &mockStackRepo{
				getUserByFirebaseUIDFn: func(uid string) (*models.User, error) {
					return basicUser(2), nil
				},
				getActiveStackMemberByMemberUserIDFn: func(userID int) (*models.StackMember, error) {
					return nil, nil
				},
				getPendingStackInviteByOwnerAndMemberFn: func(ownerID, memberID int) (*models.StackMember, error) {
					return nil, nil
				},
				getTotalStackMemberCountFn: func(ownerID int) (int, error) {
					return StackMaxMembers, nil
				},
			},
			expectedErr: ErrStackFull,
		},
		{
			name:  "concurrent invite race condition is mapped to already-invited",
			owner: stackOwnerUser(1),
			req:   InviteStackMemberRequest{FirebaseUID: "member-uid"},
			repo: func() *mockStackRepo {
				r := repoForSuccess()
				r.createStackInviteFn = func(ownerID, memberID int) (*models.StackMember, error) {
					return nil, models.ErrStackInviteAlreadyExists
				}
				return r
			}(),
			expectedErr: ErrTargetAlreadyInvited,
		},
		{
			name:        "successfully creates invite",
			owner:       stackOwnerUser(1),
			req:         InviteStackMemberRequest{FirebaseUID: "member-uid"},
			repo:        repoForSuccess(),
			expectedErr: nil,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := NewStackService(StackServiceDependencies{Repo: tc.repo})
			invite, err := svc.InviteStackMember(tc.owner, tc.req)

			if tc.expectedErr != nil {
				assert.ErrorIs(t, err, tc.expectedErr)
				assert.Nil(t, invite)
			} else {
				require.NoError(t, err)
				assert.NotNil(t, invite)
			}
		})
	}
}
