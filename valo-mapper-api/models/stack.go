package models

import (
	"context"
	"errors"
	"time"
	"valo-mapper-api/db"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrStackInviteNotFound      = errors.New("stack-invite-not-found")
	ErrStackMemberNotFound      = errors.New("stack-member-not-found")
	ErrStackInviteAlreadyExists = errors.New("stack-invite-already-exists")
	ErrStackMemberAlreadyActive = errors.New("stack-member-already-active")
)

const (
	StackMemberStatusPending = "pending"
	StackMemberStatusActive  = "active"
)

type StackMember struct {
	ID           int        `json:"id"`
	OwnerUserID  int        `json:"ownerUserId"`
	MemberUserID int        `json:"memberUserId"`
	Status       string     `json:"status"`
	InvitedAt    time.Time  `json:"invitedAt"`
	JoinedAt     *time.Time `json:"joinedAt,omitempty"`
	// Populated via JOIN when listing members
	MemberEmail *string `json:"memberEmail,omitempty"`
	MemberName  *string `json:"memberName,omitempty"`
	OwnerEmail  *string `json:"ownerEmail,omitempty"`
	OwnerName   *string `json:"ownerName,omitempty"`
}

// GetStackMembersForOwner returns all stack members (pending and active) for the given owner.
func GetStackMembersForOwner(ownerUserID int) ([]StackMember, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	rows, err := conn.Query(context.Background(), `
		SELECT sm.id, sm.owner_user_id, sm.member_user_id, sm.status, sm.invited_at, sm.joined_at,
		       u.email, u.name
		FROM stack_members sm
		JOIN users u ON u.id = sm.member_user_id
		WHERE sm.owner_user_id = $1
		ORDER BY sm.invited_at ASC
	`, ownerUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	members := []StackMember{}
	for rows.Next() {
		var m StackMember
		if err := rows.Scan(
			&m.ID, &m.OwnerUserID, &m.MemberUserID, &m.Status, &m.InvitedAt, &m.JoinedAt,
			&m.MemberEmail, &m.MemberName,
		); err != nil {
			return nil, err
		}
		members = append(members, m)
	}

	return members, rows.Err()
}

// GetActiveStackMemberByMemberUserID returns the active stack membership record for a given member user ID,
// or nil if the user is not currently active in a stack.
func GetActiveStackMemberByMemberUserID(memberUserID int) (*StackMember, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	m := &StackMember{}
	err = conn.QueryRow(context.Background(), `
		SELECT sm.id, sm.owner_user_id, sm.member_user_id, sm.status, sm.invited_at, sm.joined_at,
		       owner.email, owner.name
		FROM stack_members sm
		JOIN users owner ON owner.id = sm.owner_user_id
		WHERE sm.member_user_id = $1 AND sm.status = $2
		LIMIT 1
	`, memberUserID, StackMemberStatusActive).Scan(
		&m.ID, &m.OwnerUserID, &m.MemberUserID, &m.Status, &m.InvitedAt, &m.JoinedAt,
		&m.OwnerEmail, &m.OwnerName,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return m, nil
}

// GetStackMemberByMemberUserID is kept as a compatibility wrapper for active membership lookups.
func GetStackMemberByMemberUserID(memberUserID int) (*StackMember, error) {
	return GetActiveStackMemberByMemberUserID(memberUserID)
}

// GetPendingStackInvitesByMemberUserID returns all pending stack invites for a given member user ID.
func GetPendingStackInvitesByMemberUserID(memberUserID int) ([]StackMember, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	rows, err := conn.Query(context.Background(), `
		SELECT sm.id, sm.owner_user_id, sm.member_user_id, sm.status, sm.invited_at, sm.joined_at,
		       owner.email, owner.name
		FROM stack_members sm
		JOIN users owner ON owner.id = sm.owner_user_id
		WHERE sm.member_user_id = $1 AND sm.status = $2
		ORDER BY sm.invited_at DESC
	`, memberUserID, StackMemberStatusPending)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	invites := []StackMember{}
	for rows.Next() {
		var invite StackMember
		if err := rows.Scan(
			&invite.ID, &invite.OwnerUserID, &invite.MemberUserID, &invite.Status, &invite.InvitedAt, &invite.JoinedAt,
			&invite.OwnerEmail, &invite.OwnerName,
		); err != nil {
			return nil, err
		}
		invites = append(invites, invite)
	}

	return invites, rows.Err()
}

// GetPendingStackInviteByOwnerAndMember returns the pending invite for an owner/member pair,
// or nil if none exists.
func GetPendingStackInviteByOwnerAndMember(ownerUserID, memberUserID int) (*StackMember, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	m := &StackMember{}
	err = conn.QueryRow(context.Background(), `
		SELECT sm.id, sm.owner_user_id, sm.member_user_id, sm.status, sm.invited_at, sm.joined_at,
		       owner.email, owner.name
		FROM stack_members sm
		JOIN users owner ON owner.id = sm.owner_user_id
		WHERE sm.owner_user_id = $1 AND sm.member_user_id = $2 AND sm.status = $3
		LIMIT 1
	`, ownerUserID, memberUserID, StackMemberStatusPending).Scan(
		&m.ID, &m.OwnerUserID, &m.MemberUserID, &m.Status, &m.InvitedAt, &m.JoinedAt,
		&m.OwnerEmail, &m.OwnerName,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return m, nil
}

// GetActiveStackAccessState reports whether a member currently has effective stack premium access.
// Access is active only when the membership row is active and the owner has an active stack subscription.
func GetActiveStackAccessState(memberUserID int) (bool, *time.Time, error) {
	conn, err := db.GetDB()
	if err != nil {
		return false, nil, err
	}

	var ownerIsSubscribed bool
	var ownerSubscriptionPlan *string
	var subscriptionEndedAt *time.Time
	err = conn.QueryRow(context.Background(), `
		SELECT owner.is_subscribed, owner.subscription_plan, owner.subscription_ended_at
		FROM stack_members sm
		JOIN users owner ON owner.id = sm.owner_user_id
		WHERE sm.member_user_id = $1
		  AND sm.status = $2
		LIMIT 1
	`, memberUserID, StackMemberStatusActive).Scan(&ownerIsSubscribed, &ownerSubscriptionPlan, &subscriptionEndedAt)
	if err == pgx.ErrNoRows {
		return false, nil, nil
	}
	if err != nil {
		return false, nil, err
	}

	if ownerIsSubscribed && ownerSubscriptionPlan != nil && *ownerSubscriptionPlan == "stack" {
		return true, subscriptionEndedAt, nil
	}

	return false, subscriptionEndedAt, nil
}

// GetActiveStackMemberCount returns the number of active (accepted) stack members for an owner.
func GetActiveStackMemberCount(ownerUserID int) (int, error) {
	conn, err := db.GetDB()
	if err != nil {
		return 0, err
	}

	var count int
	err = conn.QueryRow(context.Background(), `
		SELECT COUNT(*) FROM stack_members
		WHERE owner_user_id = $1 AND status = $2
	`, ownerUserID, StackMemberStatusActive).Scan(&count)
	return count, err
}

// GetTotalStackMemberCount returns the total number of stack member records (all statuses) for an owner.
func GetTotalStackMemberCount(ownerUserID int) (int, error) {
	conn, err := db.GetDB()
	if err != nil {
		return 0, err
	}

	var count int
	err = conn.QueryRow(context.Background(), `
		SELECT COUNT(*) FROM stack_members WHERE owner_user_id = $1
	`, ownerUserID).Scan(&count)
	return count, err
}

// CreateStackInvite creates a new pending stack invite from owner to member.
func CreateStackInvite(ownerUserID, memberUserID int) (*StackMember, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	m := &StackMember{}
	err = conn.QueryRow(context.Background(), `
		INSERT INTO stack_members (owner_user_id, member_user_id, status, invited_at)
		VALUES ($1, $2, $3, NOW())
		RETURNING id, owner_user_id, member_user_id, status, invited_at, joined_at
	`, ownerUserID, memberUserID, StackMemberStatusPending).Scan(
		&m.ID, &m.OwnerUserID, &m.MemberUserID, &m.Status, &m.InvitedAt, &m.JoinedAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrStackInviteAlreadyExists
		}
		return nil, err
	}
	return m, nil
}

// AcceptStackInvite transitions a pending invite to active.
func AcceptStackInvite(inviteID, memberUserID int) error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	ctx := context.Background()
	tx, err := conn.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var existingActiveID int
	err = tx.QueryRow(ctx, `
		SELECT id
		FROM stack_members
		WHERE member_user_id = $1 AND status = $2
		LIMIT 1
	`, memberUserID, StackMemberStatusActive).Scan(&existingActiveID)
	if err == nil {
		return ErrStackMemberAlreadyActive
	}
	if err != pgx.ErrNoRows {
		return err
	}

	var joinedAt time.Time
	err = tx.QueryRow(ctx, `
		UPDATE stack_members
		SET status = $1, joined_at = NOW()
		WHERE id = $2 AND member_user_id = $3 AND status = $4
		RETURNING joined_at
	`, StackMemberStatusActive, inviteID, memberUserID, StackMemberStatusPending).Scan(&joinedAt)
	if err == pgx.ErrNoRows {
		return ErrStackInviteNotFound
	}
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return ErrStackMemberAlreadyActive
		}
		return err
	}

	_, err = tx.Exec(ctx, `
		DELETE FROM stack_members
		WHERE member_user_id = $1
		  AND status = $2
		  AND id <> $3
	`, memberUserID, StackMemberStatusPending, inviteID)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// RemoveStackMember removes a member from the stack by the owner.
func RemoveStackMember(ownerUserID, stackMemberID int) error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	ctx := context.Background()
	tx, err := conn.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var deletedID int
	var deletedMemberUserID int
	var deletedStatus string
	err = tx.QueryRow(ctx, `
		DELETE FROM stack_members
		WHERE id = $1 AND owner_user_id = $2
		RETURNING id, member_user_id, status
	`, stackMemberID, ownerUserID).Scan(&deletedID, &deletedMemberUserID, &deletedStatus)
	if err == pgx.ErrNoRows {
		return ErrStackMemberNotFound
	}
	if err != nil {
		return err
	}

	if deletedStatus == StackMemberStatusActive {
		_, err = tx.Exec(ctx, `
			UPDATE users
			SET subscription_ended_at = NOW(),
			    updated_at = NOW()
			WHERE id = $1
			  AND is_subscribed = FALSE
		`, deletedMemberUserID)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

// LeaveStack removes the authenticated user from whatever stack they are a member of.
func DeclineStackInvite(inviteID, memberUserID int) error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	ctx := context.Background()
	tx, err := conn.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var deletedID int
	err = tx.QueryRow(ctx, `
		DELETE FROM stack_members
		WHERE id = $1 AND member_user_id = $2 AND status = $3
		RETURNING id
	`, inviteID, memberUserID, StackMemberStatusPending).Scan(&deletedID)
	if err == pgx.ErrNoRows {
		return ErrStackInviteNotFound
	}
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// LeaveStack removes the authenticated user from their active stack membership.
func LeaveStack(memberUserID int) error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	ctx := context.Background()
	tx, err := conn.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var deletedID int
	err = tx.QueryRow(ctx, `
		DELETE FROM stack_members
		WHERE member_user_id = $1 AND status = $2
		RETURNING id
	`, memberUserID, StackMemberStatusActive).Scan(&deletedID)
	if err == pgx.ErrNoRows {
		return ErrStackMemberNotFound
	}
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `
		UPDATE users
		SET subscription_ended_at = NOW(),
		    updated_at = NOW()
		WHERE id = $1
		  AND is_subscribed = FALSE
	`, memberUserID)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// GetStackMemberByID returns a stack_members row by its primary key, or nil if not found.
func GetStackMemberByID(id int) (*StackMember, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	m := &StackMember{}
	err = conn.QueryRow(context.Background(), `
		SELECT id, owner_user_id, member_user_id, status, invited_at, joined_at
		FROM stack_members
		WHERE id = $1
	`, id).Scan(
		&m.ID, &m.OwnerUserID, &m.MemberUserID, &m.Status, &m.InvitedAt, &m.JoinedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return m, nil
}
