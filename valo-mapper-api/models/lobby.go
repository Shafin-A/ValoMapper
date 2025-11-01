package models

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"encoding/json"
	"time"
	"valo-mapper-api/db"

	"github.com/jackc/pgx/v5"
)

type Lobby struct {
	Code        string          `json:"lobbyCode"`
	CreatedAt   time.Time       `json:"createdAt"`
	CanvasState json.RawMessage `json:"canvasState"`
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
		`INSERT INTO lobbies (code, created_at, canvas_state) 
		 VALUES ($1, $2, $3)
		 ON CONFLICT (code) 
		 DO UPDATE SET canvas_state = $3`,
		l.Code,
		l.CreatedAt,
		l.CanvasState,
	)

	return err
}

func GetLobbyByCode(code string) (*Lobby, error) {
	ctx := context.Background()

	lobby := &Lobby{}

	err := db.DB.QueryRow(
		ctx,
		"SELECT code, created_at, canvas_state FROM lobbies WHERE code = $1",
		code,
	).Scan(&lobby.Code, &lobby.CreatedAt, &lobby.CanvasState)

	if err == pgx.ErrNoRows {
		return nil, nil
	}

	if err != nil {
		return nil, err
	}

	return lobby, nil
}
