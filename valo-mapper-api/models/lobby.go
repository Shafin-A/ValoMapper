package models

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"time"
	"valo-mapper-api/db"

	"github.com/jackc/pgx/v5"
)

type Lobby struct {
	Code      string    `json:"lobbyCode"`
	CreatedAt time.Time `json:"createdAt"`
}

func GenerateLobbyCode() string {
	b := make([]byte, 4)

	_, err := rand.Read(b)
	if err != nil {
		return "ERROR01"
	}

	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b)
}

func (l *Lobby) Save() error {
	ctx := context.Background()

	_, err := db.DB.Exec(
		ctx,
		"INSERT INTO lobbies (code, created_at) VALUES ($1, $2)",
		l.Code,
		l.CreatedAt,
	)

	return err
}

func GetLobbyByCode(code string) (*Lobby, error) {
	ctx := context.Background()

	lobby := &Lobby{}

	err := db.DB.QueryRow(
		ctx,
		"SELECT code, created_at FROM lobbies WHERE code = $1",
		code,
	).Scan(&lobby.Code, &lobby.CreatedAt)

	if err == pgx.ErrNoRows {
		return nil, nil
	}

	if err != nil {
		return nil, err
	}

	return lobby, nil
}
