package models

import (
	"crypto/rand"
	"encoding/base32"
	"time"
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
