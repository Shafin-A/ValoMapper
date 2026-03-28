package models

import (
	"context"
	"time"
	"valo-mapper-api/db"

	"github.com/jackc/pgx/v5"
)

// ptr is a helper function to convert a string to a *string
func strPtr(s string) *string {
	return &s
}

type User struct {
	ID                          int        `json:"id"`
	FirebaseUID                 *string    `json:"firebaseUid,omitempty"`
	Email                       *string    `json:"email,omitempty"`
	EmailVerified               bool       `json:"emailVerified"`
	Name                        *string    `json:"name,omitempty"`
	CreatedAt                   time.Time  `json:"createdAt"`
	UpdatedAt                   time.Time  `json:"updatedAt"`
	TourCompleted               bool       `json:"tourCompleted"`
	IsSubscribed                bool       `json:"isSubscribed"`
	SubscriptionEndedAt         *time.Time `json:"subscriptionEndedAt,omitempty"`
	SubscriptionPlan            *string    `json:"subscriptionPlan,omitempty"`
	PersonalIsSubscribed        bool       `json:"-"`
	PersonalSubscriptionEndedAt *time.Time `json:"-"`
	PersonalSubscriptionPlan    *string    `json:"-"`
	StripeCustomerID            *string    `json:"-"`
	StripeSubscriptionID        *string    `json:"-"`
	PremiumTrialClaimedAt       *time.Time `json:"-"`
	SubscriptionStartedAt       *time.Time `json:"subscriptionStartedAt,omitempty"`
	PremiumTrialEligible        bool       `json:"premiumTrialEligible"`
	PremiumTrialDaysLeft        *int       `json:"premiumTrialDaysLeft,omitempty"`
	RSOSubjectID                *string    `json:"rsoSubjectId,omitempty"`
	RSOAccessToken              *string    `json:"-"`
	RSORefreshToken             *string    `json:"-"`
	RSOIDToken                  *string    `json:"-"`
	RSOLinkedAt                 *time.Time `json:"rsoLinkedAt,omitempty"`
}

func (u *User) RefreshPremiumTrialEligibility() {
	u.PremiumTrialEligible = !u.IsSubscribed && u.PremiumTrialClaimedAt == nil
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
	u.PersonalSubscriptionPlan = u.SubscriptionPlan
}

func laterSubscriptionEndedAt(first, second *time.Time) *time.Time {
	if first == nil {
		return second
	}

	if second == nil {
		return first
	}

	if second.After(*first) {
		return second
	}

	return first
}

func (u *User) refreshEffectiveSubscriptionState() error {
	if u == nil {
		return nil
	}

	hasStackAccess, stackSubscriptionEndedAt, stackSubscriptionStartedAt, err := GetActiveStackAccessState(u.ID)
	if err != nil {
		return err
	}

	personalIsSubscribed := u.PersonalIsSubscribed

	if hasStackAccess {
		u.SubscriptionStartedAt = stackSubscriptionStartedAt
	} else if personalIsSubscribed {
		if u.PremiumTrialClaimedAt != nil {
			u.SubscriptionStartedAt = u.PremiumTrialClaimedAt
		}
	} else {
		u.SubscriptionStartedAt = nil
	}

	switch {
	case personalIsSubscribed && hasStackAccess:
		u.IsSubscribed = true
		u.SubscriptionEndedAt = laterSubscriptionEndedAt(u.PersonalSubscriptionEndedAt, stackSubscriptionEndedAt)
		u.SubscriptionPlan = u.PersonalSubscriptionPlan
	case personalIsSubscribed:
		u.IsSubscribed = true
		u.SubscriptionEndedAt = u.PersonalSubscriptionEndedAt
		u.SubscriptionPlan = u.PersonalSubscriptionPlan
	case hasStackAccess:
		stackPlan := "stack"
		u.IsSubscribed = true
		u.SubscriptionEndedAt = stackSubscriptionEndedAt
		u.SubscriptionPlan = &stackPlan
	default:
		u.IsSubscribed = false
		if u.PersonalSubscriptionEndedAt != nil {
			u.SubscriptionEndedAt = u.PersonalSubscriptionEndedAt
		} else {
			u.SubscriptionEndedAt = stackSubscriptionEndedAt
		}
		u.SubscriptionPlan = u.PersonalSubscriptionPlan
	}

	return nil
}

func (u *User) Update() error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	err = conn.QueryRow(context.Background(), `
		UPDATE users
		SET email = $1, email_verified = $2, name = $3, tour_completed = $4, updated_at = NOW()
		WHERE firebase_uid = $5
		RETURNING updated_at
	`, u.Email, u.EmailVerified, u.Name, u.TourCompleted, u.FirebaseUID).Scan(&u.UpdatedAt)

	return err
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

func (u *User) LoadByFirebaseUID() error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	err = conn.QueryRow(context.Background(), `
		SELECT id, firebase_uid, email, email_verified, name, tour_completed, is_subscribed, subscription_ended_at, stripe_customer_id, stripe_subscription_id, subscription_plan, premium_trial_claimed_at, created_at, updated_at,
		       rso_subject_id, rso_access_token, rso_refresh_token, rso_id_token, rso_linked_at
		FROM users
		WHERE firebase_uid = $1
	`, u.FirebaseUID).Scan(
		&u.ID,
		&u.FirebaseUID,
		&u.Email,
		&u.EmailVerified,
		&u.Name,
		&u.TourCompleted,
		&u.IsSubscribed,
		&u.SubscriptionEndedAt,
		&u.StripeCustomerID,
		&u.StripeSubscriptionID,
		&u.SubscriptionPlan,
		&u.PremiumTrialClaimedAt,
		&u.CreatedAt,
		&u.UpdatedAt,
		&u.RSOSubjectID,
		&u.RSOAccessToken,
		&u.RSORefreshToken,
		&u.RSOIDToken,
		&u.RSOLinkedAt,
	)
	if err != nil {
		return err
	}

	u.capturePersonalBillingState()

	return u.refreshEffectiveSubscriptionState()
}

func GetUserByFirebaseUID(uid string) (*User, error) {
	user := &User{
		FirebaseUID: strPtr(uid),
	}

	err := user.LoadByFirebaseUID()
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return user, nil
}

func GetUserByID(id int) (*User, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	user := &User{}
	err = conn.QueryRow(context.Background(), `
		SELECT id, firebase_uid, email, email_verified, name, tour_completed, is_subscribed, subscription_ended_at, stripe_customer_id, stripe_subscription_id, subscription_plan, premium_trial_claimed_at, created_at, updated_at,
		       rso_subject_id, rso_access_token, rso_refresh_token, rso_id_token, rso_linked_at
		FROM users
		WHERE id = $1
	`, id).Scan(
		&user.ID,
		&user.FirebaseUID,
		&user.Email,
		&user.EmailVerified,
		&user.Name,
		&user.TourCompleted,
		&user.IsSubscribed,
		&user.SubscriptionEndedAt,
		&user.StripeCustomerID,
		&user.StripeSubscriptionID,
		&user.SubscriptionPlan,
		&user.PremiumTrialClaimedAt,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.RSOSubjectID,
		&user.RSOAccessToken,
		&user.RSORefreshToken,
		&user.RSOIDToken,
		&user.RSOLinkedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	user.capturePersonalBillingState()
	if err := user.refreshEffectiveSubscriptionState(); err != nil {
		return nil, err
	}
	return user, nil
}

// GetUserByRSOSubject returns the user associated with the given RSO subject ID.
func GetUserByRSOSubject(subject string) (*User, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	user := &User{}
	err = conn.QueryRow(context.Background(), `
		SELECT id, firebase_uid, email, email_verified, name, tour_completed, is_subscribed, subscription_ended_at, stripe_customer_id, stripe_subscription_id, subscription_plan, premium_trial_claimed_at, created_at, updated_at,
		       rso_subject_id, rso_access_token, rso_refresh_token, rso_id_token, rso_linked_at
		FROM users
		WHERE rso_subject_id = $1
	`, subject).Scan(
		&user.ID,
		&user.FirebaseUID,
		&user.Email,
		&user.EmailVerified,
		&user.Name,
		&user.TourCompleted,
		&user.IsSubscribed,
		&user.SubscriptionEndedAt,
		&user.StripeCustomerID,
		&user.StripeSubscriptionID,
		&user.SubscriptionPlan,
		&user.PremiumTrialClaimedAt,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.RSOSubjectID,
		&user.RSOAccessToken,
		&user.RSORefreshToken,
		&user.RSOIDToken,
		&user.RSOLinkedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	user.capturePersonalBillingState()
	if err := user.refreshEffectiveSubscriptionState(); err != nil {
		return nil, err
	}
	return user, nil
}

func GetUserByStripeSubscriptionID(stripeSubscriptionID string) (*User, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	user := &User{}
	err = conn.QueryRow(context.Background(), `
		SELECT id, firebase_uid, email, email_verified, name, tour_completed, is_subscribed, subscription_ended_at, stripe_customer_id, stripe_subscription_id, subscription_plan, premium_trial_claimed_at, created_at, updated_at,
		       rso_subject_id, rso_access_token, rso_refresh_token, rso_id_token, rso_linked_at
		FROM users
		WHERE stripe_subscription_id = $1
	`, stripeSubscriptionID).Scan(
		&user.ID,
		&user.FirebaseUID,
		&user.Email,
		&user.EmailVerified,
		&user.Name,
		&user.TourCompleted,
		&user.IsSubscribed,
		&user.SubscriptionEndedAt,
		&user.StripeCustomerID,
		&user.StripeSubscriptionID,
		&user.SubscriptionPlan,
		&user.PremiumTrialClaimedAt,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.RSOSubjectID,
		&user.RSOAccessToken,
		&user.RSORefreshToken,
		&user.RSOIDToken,
		&user.RSOLinkedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	user.capturePersonalBillingState()
	if err := user.refreshEffectiveSubscriptionState(); err != nil {
		return nil, err
	}
	return user, nil
}

func GetUserByStripeCustomerID(stripeCustomerID string) (*User, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	user := &User{}
	err = conn.QueryRow(context.Background(), `
		SELECT id, firebase_uid, email, email_verified, name, tour_completed, is_subscribed, subscription_ended_at, stripe_customer_id, stripe_subscription_id, subscription_plan, premium_trial_claimed_at, created_at, updated_at,
		       rso_subject_id, rso_access_token, rso_refresh_token, rso_id_token, rso_linked_at
		FROM users
		WHERE stripe_customer_id = $1
	`, stripeCustomerID).Scan(
		&user.ID,
		&user.FirebaseUID,
		&user.Email,
		&user.EmailVerified,
		&user.Name,
		&user.TourCompleted,
		&user.IsSubscribed,
		&user.SubscriptionEndedAt,
		&user.StripeCustomerID,
		&user.StripeSubscriptionID,
		&user.SubscriptionPlan,
		&user.PremiumTrialClaimedAt,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.RSOSubjectID,
		&user.RSOAccessToken,
		&user.RSORefreshToken,
		&user.RSOIDToken,
		&user.RSOLinkedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	user.capturePersonalBillingState()
	if err := user.refreshEffectiveSubscriptionState(); err != nil {
		return nil, err
	}
	return user, nil
}

// CreateUserWithRSO creates a new user record with Firebase UID, RSO subject and optional profile data.
func CreateUserWithRSO(firebaseUID, subjectID string, name *string, accessToken, refreshToken, idToken string) (*User, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	u := &User{
		FirebaseUID:     &firebaseUID,
		Name:            name,
		RSOSubjectID:    &subjectID,
		RSOAccessToken:  &accessToken,
		RSORefreshToken: &refreshToken,
		RSOIDToken:      &idToken,
	}

	err = conn.QueryRow(context.Background(), `
		INSERT INTO users (firebase_uid, name, rso_subject_id, rso_access_token, rso_refresh_token, rso_id_token, rso_linked_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
		RETURNING id, created_at, updated_at
	`, firebaseUID, name, subjectID, accessToken, refreshToken, idToken).Scan(&u.ID, &u.CreatedAt, &u.UpdatedAt)

	return u, err
}

// UpdateName updates a user's display name.
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

// SetFirebaseUID links a legacy RSO record with a Firebase UID for auth lookups.
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

// UpdateRSOTokens updates the access and refresh tokens for an RSO account
func (u *User) UpdateRSOTokens(accessToken, refreshToken string) error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	err = conn.QueryRow(context.Background(), `
		UPDATE users
		SET rso_access_token = $1, rso_refresh_token = $2, updated_at = NOW()
		WHERE firebase_uid = $3
		RETURNING updated_at
	`, accessToken, refreshToken, u.FirebaseUID).Scan(&u.UpdatedAt)

	if err == nil {
		u.RSOAccessToken = &accessToken
		u.RSORefreshToken = &refreshToken
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
		    subscription_ended_at = $2,
		    subscription_plan = CASE WHEN $1 THEN subscription_plan ELSE NULL END,
		    updated_at = NOW()
		WHERE id = $3
		RETURNING updated_at
	`, isSubscribed, subscriptionEndedAt, u.ID).Scan(&u.UpdatedAt)

	if err == nil {
		u.PersonalIsSubscribed = isSubscribed
		u.PersonalSubscriptionEndedAt = subscriptionEndedAt
		if !isSubscribed {
			u.PersonalSubscriptionPlan = nil
		}
		u.IsSubscribed = u.PersonalIsSubscribed
		u.SubscriptionEndedAt = u.PersonalSubscriptionEndedAt
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
		    subscription_ended_at = $4,
		    subscription_plan = $5,
		    updated_at = NOW()
		WHERE id = $6
		RETURNING updated_at
	`, stripeCustomerID, stripeSubscriptionID, isSubscribed, subscriptionEndedAt, subscriptionPlan, u.ID).Scan(&u.UpdatedAt)
	if err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	u.StripeCustomerID = stripeCustomerID
	u.StripeSubscriptionID = stripeSubscriptionID
	u.PersonalIsSubscribed = isSubscribed
	u.PersonalSubscriptionEndedAt = subscriptionEndedAt
	u.PersonalSubscriptionPlan = subscriptionPlan
	u.IsSubscribed = u.PersonalIsSubscribed
	u.SubscriptionEndedAt = u.PersonalSubscriptionEndedAt
	u.SubscriptionPlan = u.PersonalSubscriptionPlan

	return u.refreshEffectiveSubscriptionState()
}
