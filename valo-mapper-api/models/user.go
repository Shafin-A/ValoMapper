package models

import (
	"context"
	"database/sql"
	"time"
	"valo-mapper-api/db"

	"github.com/jackc/pgx/v5"
)

func strPtr(s string) *string {
	return &s
}

type User struct {
	ID                              int        `json:"id"`
	FirebaseUID                     *string    `json:"firebaseUid,omitempty"`
	Email                           *string    `json:"email,omitempty"`
	EmailVerified                   bool       `json:"emailVerified"`
	Name                            *string    `json:"name,omitempty"`
	CreatedAt                       time.Time  `json:"createdAt"`
	UpdatedAt                       time.Time  `json:"updatedAt"`
	TourCompleted                   bool       `json:"tourCompleted"`
	FavoriteAgents                  []string   `json:"favoriteAgents"`
	IsSubscribed                    bool       `json:"isSubscribed"`
	HasEverPersonalSubscription     bool       `json:"-"`
	SubscriptionEndedAt             *time.Time `json:"subscriptionEndedAt,omitempty"`
	SubscriptionTrialEndsAt         *time.Time `json:"subscriptionTrialEndsAt,omitempty"`
	SubscriptionPlan                *string    `json:"subscriptionPlan,omitempty"`
	PersonalIsSubscribed            bool       `json:"personalIsSubscribed,omitempty"`
	PersonalSubscriptionEndedAt     *time.Time `json:"personalSubscriptionEndedAt,omitempty"`
	PersonalSubscriptionTrialEndsAt *time.Time `json:"personalSubscriptionTrialEndsAt,omitempty"`
	PersonalSubscriptionPlan        *string    `json:"personalSubscriptionPlan,omitempty"`
	StripeCustomerID                *string    `json:"-"`
	StripeSubscriptionID            *string    `json:"-"`
	PremiumTrialClaimedAt           *time.Time `json:"-"`
	SubscriptionStartedAt           *time.Time `json:"subscriptionStartedAt,omitempty"`
	PremiumTrialEligible            bool       `json:"premiumTrialEligible"`
	PremiumTrialDaysLeft            *int       `json:"premiumTrialDaysLeft,omitempty"`
	RSOSubjectID                    *string    `json:"rsoSubjectId,omitempty"`
	RSOLinkedAt                     *time.Time `json:"rsoLinkedAt,omitempty"`
}

func (u *User) RefreshPremiumTrialEligibility() {
	u.PremiumTrialEligible = !u.IsSubscribed && !u.HasEverPersonalSubscription && u.PremiumTrialClaimedAt == nil
}

func (u *User) HasActivePersonalSubscription() bool {
	return u != nil && u.PersonalIsSubscribed
}

func (u *User) HasActivePersonalPlan(plan string) bool {
	return u.HasActivePersonalSubscription() && u.PersonalSubscriptionPlan != nil && *u.PersonalSubscriptionPlan == plan
}

func (u *User) capturePersonalBillingState() {
	if u == nil {
		return
	}

	u.PersonalIsSubscribed = u.IsSubscribed
	u.PersonalSubscriptionEndedAt = u.SubscriptionEndedAt
	u.PersonalSubscriptionTrialEndsAt = u.SubscriptionTrialEndsAt
	u.PersonalSubscriptionPlan = u.SubscriptionPlan
}

func (u *User) applyEffectiveSubscriptionState(
	hasStackAccess bool,
	stackSubscriptionEndedAt, stackSubscriptionStartedAt *time.Time,
) {
	if u == nil {
		return
	}

	personalIsSubscribed := u.PersonalIsSubscribed

	if hasStackAccess {
		u.SubscriptionStartedAt = stackSubscriptionStartedAt
	} else if personalIsSubscribed {
		if u.PersonalSubscriptionTrialEndsAt != nil && u.PremiumTrialClaimedAt != nil {
			u.SubscriptionStartedAt = u.PremiumTrialClaimedAt
		} else {
			u.SubscriptionStartedAt = nil
		}
	} else {
		u.SubscriptionStartedAt = nil
	}

	switch {
	case hasStackAccess:
		stackPlan := "stack"
		u.IsSubscribed = true
		u.SubscriptionEndedAt = stackSubscriptionEndedAt
		u.SubscriptionTrialEndsAt = nil
		u.SubscriptionPlan = &stackPlan
	case personalIsSubscribed:
		u.IsSubscribed = true
		u.SubscriptionEndedAt = u.PersonalSubscriptionEndedAt
		u.SubscriptionTrialEndsAt = u.PersonalSubscriptionTrialEndsAt
		u.SubscriptionPlan = u.PersonalSubscriptionPlan
	default:
		u.IsSubscribed = false
		if u.PersonalSubscriptionEndedAt != nil {
			u.SubscriptionEndedAt = u.PersonalSubscriptionEndedAt
		} else {
			u.SubscriptionEndedAt = stackSubscriptionEndedAt
		}
		u.SubscriptionTrialEndsAt = nil
		u.SubscriptionPlan = u.PersonalSubscriptionPlan
	}
}

func (u *User) refreshEffectiveSubscriptionState() error {
	if u == nil {
		return nil
	}

	hasStackAccess, stackSubscriptionEndedAt, stackSubscriptionStartedAt, err := GetActiveStackAccessState(u.ID)
	if err != nil {
		return err
	}

	u.applyEffectiveSubscriptionState(hasStackAccess, stackSubscriptionEndedAt, stackSubscriptionStartedAt)
	return nil
}

func (u *User) Update() error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	err = conn.QueryRow(context.Background(), `
		UPDATE users
		SET email = $1, email_verified = $2, name = $3, tour_completed = $4,
		    favorite_agents = $5, updated_at = NOW()
		WHERE firebase_uid = $6
		RETURNING updated_at
	`, u.Email, u.EmailVerified, u.Name, u.TourCompleted, favoriteAgentsOrEmpty(u.FavoriteAgents), u.FirebaseUID).Scan(&u.UpdatedAt)

	return err
}

func favoriteAgentsOrEmpty(agents []string) []string {
	if agents == nil {
		return []string{}
	}
	return agents
}

func (u *User) Save() error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	err = conn.QueryRow(context.Background(), `INSERT INTO users (firebase_uid, email, email_verified, name, tour_completed, is_subscribed, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		ON CONFLICT ON CONSTRAINT users_firebase_uid_key DO NOTHING
		RETURNING id, created_at, updated_at`, u.FirebaseUID, u.Email, u.EmailVerified, u.Name, u.TourCompleted, u.IsSubscribed).Scan(
		&u.ID,
		&u.CreatedAt,
		&u.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return u.LoadByFirebaseUID()
	}

	return err
}

func (u *User) Delete() error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	_, err = conn.Exec(context.Background(), `
		DELETE FROM users
		WHERE firebase_uid = $1
	`, u.FirebaseUID)

	return err
}

const userSelectColumns = `u.id, u.firebase_uid, u.email, u.email_verified, u.name, u.tour_completed,
	u.favorite_agents, u.is_subscribed,
	u.has_ever_personal_subscription, u.subscription_ended_at, u.subscription_trial_ends_at,
	u.stripe_customer_id, u.stripe_subscription_id, u.subscription_plan, u.premium_trial_claimed_at,
	u.created_at, u.updated_at, u.rso_subject_id, u.rso_linked_at,
	stack_owner.is_subscribed, stack_owner.subscription_plan, stack_owner.subscription_ended_at, stack_member.joined_at`

const userSelectFrom = `
	FROM users u
	LEFT JOIN stack_members stack_member
		ON stack_member.member_user_id = u.id AND stack_member.status = 'active'
	LEFT JOIN users stack_owner ON stack_owner.id = stack_member.owner_user_id`

func scanUser(row pgx.Row) (*User, error) {
	var (
		stackOwnerIsSubscribed sql.NullBool
		stackOwnerPlan         sql.NullString
		stackOwnerEndedAt      sql.NullTime
		stackJoinedAt          sql.NullTime
	)

	user := &User{}
	err := row.Scan(
		&user.ID,
		&user.FirebaseUID,
		&user.Email,
		&user.EmailVerified,
		&user.Name,
		&user.TourCompleted,
		&user.FavoriteAgents,
		&user.IsSubscribed,
		&user.HasEverPersonalSubscription,
		&user.SubscriptionEndedAt,
		&user.SubscriptionTrialEndsAt,
		&user.StripeCustomerID,
		&user.StripeSubscriptionID,
		&user.SubscriptionPlan,
		&user.PremiumTrialClaimedAt,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.RSOSubjectID,
		&user.RSOLinkedAt,
		&stackOwnerIsSubscribed,
		&stackOwnerPlan,
		&stackOwnerEndedAt,
		&stackJoinedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	hasStackAccess := stackOwnerIsSubscribed.Valid && stackOwnerIsSubscribed.Bool &&
		stackOwnerPlan.Valid && stackOwnerPlan.String == "stack"

	var stackEndedAt *time.Time
	if stackOwnerEndedAt.Valid {
		value := stackOwnerEndedAt.Time
		stackEndedAt = &value
	}

	var stackStartedAt *time.Time
	if stackJoinedAt.Valid {
		value := stackJoinedAt.Time
		stackStartedAt = &value
	}

	user.capturePersonalBillingState()
	user.applyEffectiveSubscriptionState(hasStackAccess, stackEndedAt, stackStartedAt)

	return user, nil
}

func (u *User) LoadByFirebaseUID() error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	loaded, err := scanUser(conn.QueryRow(context.Background(),
		`SELECT `+userSelectColumns+userSelectFrom+` WHERE u.firebase_uid = $1`, u.FirebaseUID))
	if err != nil {
		return err
	}
	if loaded == nil {
		return pgx.ErrNoRows
	}

	*u = *loaded
	return nil
}

func GetUserByFirebaseUID(uid string) (*User, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	return scanUser(conn.QueryRow(context.Background(),
		`SELECT `+userSelectColumns+userSelectFrom+` WHERE u.firebase_uid = $1`, uid))
}

func GetUserByID(id int) (*User, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	return scanUser(conn.QueryRow(context.Background(),
		`SELECT `+userSelectColumns+userSelectFrom+` WHERE u.id = $1`, id))
}

func GetUserByRSOSubject(subject string) (*User, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	return scanUser(conn.QueryRow(context.Background(),
		`SELECT `+userSelectColumns+userSelectFrom+` WHERE u.rso_subject_id = $1`, subject))
}

func GetUserByStripeSubscriptionID(stripeSubscriptionID string) (*User, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	return scanUser(conn.QueryRow(context.Background(),
		`SELECT `+userSelectColumns+userSelectFrom+` WHERE u.stripe_subscription_id = $1`, stripeSubscriptionID))
}

func GetUserByStripeCustomerID(stripeCustomerID string) (*User, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	return scanUser(conn.QueryRow(context.Background(),
		`SELECT `+userSelectColumns+userSelectFrom+` WHERE u.stripe_customer_id = $1`, stripeCustomerID))
}

// CreateUserWithRSO also stamps rso_linked_at.
func CreateUserWithRSO(firebaseUID, subjectID string, name *string) (*User, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	u := &User{
		FirebaseUID:  &firebaseUID,
		Name:         name,
		RSOSubjectID: &subjectID,
	}

	err = conn.QueryRow(context.Background(), `
		INSERT INTO users (firebase_uid, name, rso_subject_id, rso_linked_at, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW(), NOW())
		RETURNING id, created_at, updated_at
	`, firebaseUID, name, subjectID).Scan(&u.ID, &u.CreatedAt, &u.UpdatedAt)

	return u, err
}

func (u *User) UpdateName(name string) error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	err = conn.QueryRow(context.Background(), `
		UPDATE users
		SET name = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING updated_at
	`, name, u.ID).Scan(&u.UpdatedAt)

	if err == nil {
		u.Name = &name
	}

	return err
}

// SetFirebaseUID links a legacy RSO-only record to a Firebase UID for auth lookups.
func (u *User) SetFirebaseUID(firebaseUID string) error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	err = conn.QueryRow(context.Background(), `
		UPDATE users
		SET firebase_uid = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING updated_at
	`, firebaseUID, u.ID).Scan(&u.UpdatedAt)

	if err == nil {
		u.FirebaseUID = &firebaseUID
	}

	return err
}

func (u *User) UpdateSubscriptionStatus(isSubscribed bool, subscriptionEndedAt *time.Time) error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	err = conn.QueryRow(context.Background(), `
		UPDATE users
		SET is_subscribed = $1,
		    has_ever_personal_subscription = CASE WHEN $1 THEN TRUE ELSE has_ever_personal_subscription END,
		    subscription_ended_at = $2,
		    subscription_trial_ends_at = CASE WHEN $1 THEN subscription_trial_ends_at ELSE NULL END,
		    subscription_plan = CASE WHEN $1 THEN subscription_plan ELSE NULL END,
		    updated_at = NOW()
		WHERE id = $3
		RETURNING updated_at
	`, isSubscribed, subscriptionEndedAt, u.ID).Scan(&u.UpdatedAt)

	if err == nil {
		u.PersonalIsSubscribed = isSubscribed
		if isSubscribed {
			u.HasEverPersonalSubscription = true
		}
		u.PersonalSubscriptionEndedAt = subscriptionEndedAt
		if !isSubscribed {
			u.PersonalSubscriptionTrialEndsAt = nil
			u.PersonalSubscriptionPlan = nil
		}
		u.IsSubscribed = u.PersonalIsSubscribed
		u.SubscriptionEndedAt = u.PersonalSubscriptionEndedAt
		u.SubscriptionTrialEndsAt = u.PersonalSubscriptionTrialEndsAt
		u.SubscriptionPlan = u.PersonalSubscriptionPlan
		return u.refreshEffectiveSubscriptionState()
	}

	return err
}

func (u *User) ClaimPremiumTrial() (bool, error) {
	conn, err := db.GetDB()
	if err != nil {
		return false, err
	}

	var claimedAt time.Time
	err = conn.QueryRow(context.Background(), `
		UPDATE users
		SET premium_trial_claimed_at = NOW(),
		    updated_at = NOW()
		WHERE id = $1
		  AND premium_trial_claimed_at IS NULL
		RETURNING premium_trial_claimed_at, updated_at
	`, u.ID).Scan(&claimedAt, &u.UpdatedAt)
	if err == pgx.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	claimedAt = claimedAt.UTC()
	u.PremiumTrialClaimedAt = &claimedAt
	return true, nil
}

func (u *User) ReleasePremiumTrialClaim() error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	var updatedAt time.Time
	err = conn.QueryRow(context.Background(), `
		UPDATE users
		SET premium_trial_claimed_at = NULL,
		    updated_at = NOW()
		WHERE id = $1
		  AND premium_trial_claimed_at IS NOT NULL
		  AND is_subscribed = FALSE
		  AND stripe_subscription_id IS NULL
		RETURNING updated_at
	`, u.ID).Scan(&updatedAt)
	if err == pgx.ErrNoRows {
		return nil
	}
	if err != nil {
		return err
	}

	u.UpdatedAt = updatedAt
	u.PremiumTrialClaimedAt = nil
	return nil
}

func (u *User) ClearPremiumTrialClaim() error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	var updatedAt time.Time
	err = conn.QueryRow(context.Background(), `
		UPDATE users
		SET premium_trial_claimed_at = NULL,
		    updated_at = NOW()
		WHERE id = $1
		  AND premium_trial_claimed_at IS NOT NULL
		RETURNING updated_at
	`, u.ID).Scan(&updatedAt)
	if err == pgx.ErrNoRows {
		return nil
	}
	if err != nil {
		return err
	}

	u.UpdatedAt = updatedAt
	u.PremiumTrialClaimedAt = nil
	return nil
}

func (u *User) UpdateStripeCustomerID(stripeCustomerID string) error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	err = conn.QueryRow(context.Background(), `
		UPDATE users
		SET stripe_customer_id = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING updated_at
	`, stripeCustomerID, u.ID).Scan(&u.UpdatedAt)

	if err == nil {
		u.StripeCustomerID = &stripeCustomerID
	}

	return err
}

func (u *User) UpdateStripeSubscriptionID(stripeSubscriptionID string) error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	err = conn.QueryRow(context.Background(), `
		UPDATE users
		SET stripe_subscription_id = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING updated_at
	`, stripeSubscriptionID, u.ID).Scan(&u.UpdatedAt)

	if err == nil {
		u.StripeSubscriptionID = &stripeSubscriptionID
	}

	return err
}

func (u *User) UpdateStripeBillingState(
	stripeCustomerID *string,
	stripeSubscriptionID *string,
	isSubscribed bool,
	subscriptionEndedAt *time.Time,
	subscriptionTrialEndsAt *time.Time,
	subscriptionPlan *string,
) error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	ctx := context.Background()
	tx, err := conn.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	err = tx.QueryRow(ctx, `
		UPDATE users
		SET stripe_customer_id = $1,
		    stripe_subscription_id = $2,
		    is_subscribed = $3,
		    has_ever_personal_subscription = CASE WHEN $3 THEN TRUE ELSE has_ever_personal_subscription END,
		    subscription_ended_at = $4,
		    subscription_trial_ends_at = $5,
		    subscription_plan = $6,
		    updated_at = NOW()
		WHERE id = $7
		RETURNING updated_at
	`, stripeCustomerID, stripeSubscriptionID, isSubscribed, subscriptionEndedAt, subscriptionTrialEndsAt, subscriptionPlan, u.ID).Scan(&u.UpdatedAt)
	if err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	u.StripeCustomerID = stripeCustomerID
	u.StripeSubscriptionID = stripeSubscriptionID
	u.PersonalIsSubscribed = isSubscribed
	if isSubscribed {
		u.HasEverPersonalSubscription = true
	}
	u.PersonalSubscriptionEndedAt = subscriptionEndedAt
	u.PersonalSubscriptionTrialEndsAt = subscriptionTrialEndsAt
	u.PersonalSubscriptionPlan = subscriptionPlan
	u.IsSubscribed = u.PersonalIsSubscribed
	u.SubscriptionEndedAt = u.PersonalSubscriptionEndedAt
	u.SubscriptionTrialEndsAt = u.PersonalSubscriptionTrialEndsAt
	u.SubscriptionPlan = u.PersonalSubscriptionPlan

	return u.refreshEffectiveSubscriptionState()
}
