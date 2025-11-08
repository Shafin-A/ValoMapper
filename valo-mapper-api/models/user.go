package models

import (
	"context"
	"database/sql"
	"time"
	"valo-mapper-api/db"
)

type User struct {
	ID            int       `json:"id"`
	FirebaseUID   string    `json:"firebaseUid"`
	Email         string    `json:"email"`
	EmailVerified bool      `json:"emailVerified"`
	DisplayName   *string   `json:"displayName,omitempty"`
	PhotoURL      *string   `json:"photoUrl,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

func (u *User) Save() error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	err = conn.QueryRow(context.Background(), `INSERT INTO users (firebase_uid, email, email_verified, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		ON CONFLICT (firebase_uid) DO NOTHING
		RETURNING id, created_at, updated_at`, u.FirebaseUID, u.Email, u.EmailVerified).Scan(
		&u.ID,
		&u.CreatedAt,
		&u.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return u.LoadByFirebaseUID()
	}

	return err
}

func (u *User) LoadByFirebaseUID() error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	err = conn.QueryRow(context.Background(), `
		SELECT id, firebase_uid, email, email_verified, display_name, created_at, updated_at
		FROM users
		WHERE firebase_uid = $1
	`, u.FirebaseUID).Scan(
		&u.ID,
		&u.FirebaseUID,
		&u.Email,
		&u.EmailVerified,
		&u.DisplayName,
		&u.CreatedAt,
		&u.UpdatedAt,
	)

	return err
}

func GetUserByFirebaseUID(uid string) (*User, error) {
	user := &User{}
	err := user.LoadByFirebaseUID()
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return user, nil
}
