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
	Name          string    `json:"name"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

func (u *User) Update() error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	err = conn.QueryRow(context.Background(), `
		UPDATE users
		SET email = $1, email_verified = $2, name = $3, updated_at = NOW()
		WHERE firebase_uid = $4
		RETURNING updated_at
	`, u.Email, u.EmailVerified, u.Name, u.FirebaseUID).Scan(&u.UpdatedAt)

	return err
}

func (u *User) Save() error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	err = conn.QueryRow(context.Background(), `INSERT INTO users (firebase_uid, email, email_verified, name, created_at, updated_at)
		VALUES ($1, $2, $3, $4,NOW(), NOW())
		ON CONFLICT (firebase_uid) DO NOTHING
		RETURNING id, created_at, updated_at`, u.FirebaseUID, u.Email, u.EmailVerified, u.Name).Scan(
		&u.ID,
		&u.CreatedAt,
		&u.UpdatedAt,
	)

	if err == sql.ErrNoRows {
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
		SELECT id, firebase_uid, email, email_verified, name, created_at, updated_at
		FROM users
		WHERE firebase_uid = $1
	`, u.FirebaseUID).Scan(
		&u.ID,
		&u.FirebaseUID,
		&u.Email,
		&u.EmailVerified,
		&u.Name,
		&u.CreatedAt,
		&u.UpdatedAt,
	)

	return err
}

func GetUserByFirebaseUID(uid string) (*User, error) {
	user := &User{
		FirebaseUID: uid,
	}

	err := user.LoadByFirebaseUID()
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return user, nil
}
