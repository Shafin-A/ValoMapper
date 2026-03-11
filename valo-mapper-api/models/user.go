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
	ID                  int        `json:"id"`
	FirebaseUID         *string    `json:"firebaseUid,omitempty"`
	Email               *string    `json:"email,omitempty"`
	EmailVerified       bool       `json:"emailVerified"`
	Name                *string    `json:"name,omitempty"`
	CreatedAt           time.Time  `json:"createdAt"`
	UpdatedAt           time.Time  `json:"updatedAt"`
	TourCompleted       bool       `json:"tourCompleted"`
	IsSubscribed        bool       `json:"isSubscribed"`
	SubscriptionEndedAt *time.Time `json:"subscriptionEndedAt,omitempty"`
	RSOSubjectID        *string    `json:"rsoSubjectId,omitempty"`
	RSOAccessToken      *string    `json:"-"`
	RSORefreshToken     *string    `json:"-"`
	RSOIDToken          *string    `json:"-"`
	RSOLinkedAt         *time.Time `json:"rsoLinkedAt,omitempty"`
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
		SELECT id, firebase_uid, email, email_verified, name, tour_completed, is_subscribed, subscription_ended_at, created_at, updated_at,
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
		&u.CreatedAt,
		&u.UpdatedAt,
		&u.RSOSubjectID,
		&u.RSOAccessToken,
		&u.RSORefreshToken,
		&u.RSOIDToken,
		&u.RSOLinkedAt,
	)

	return err
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

// GetUserByRSOSubject returns the user associated with the given RSO subject ID.
func GetUserByRSOSubject(subject string) (*User, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	user := &User{}
	err = conn.QueryRow(context.Background(), `
		SELECT id, firebase_uid, email, email_verified, name, tour_completed, is_subscribed, subscription_ended_at, created_at, updated_at,
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
