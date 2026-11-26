package models

import (
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5/pgconn"
)

// CopyLobby creates a new lobby containing an exact copy of the source lobby's
// canvas state and returns the new lobby code. The source lobby is left
// untouched. Image object keys are copied by reference; the cleanup scheduler
// only removes keys that no canvas row references.
func CopyLobby(sourceCode string) (string, error) {
	source, err := GetLobbyByCode(sourceCode)
	if err != nil {
		return "", err
	}
	if source == nil || source.CanvasState == nil {
		return "", ErrLobbyNotFound
	}

	state := *source.CanvasState

	for range 5 {
		code := GenerateLobbyCode()
		lobby := &Lobby{
			Code:        code,
			CreatedAt:   time.Now(),
			CanvasState: &state,
		}

		if err := lobby.Save(); err != nil {
			if isLobbyCodeCollision(err) {
				continue
			}
			return "", err
		}

		if err := SaveCanvasState(code, state); err != nil {
			_ = DeleteLobby(code)
			return "", err
		}

		return code, nil
	}

	return "", fmt.Errorf("unable to generate a unique lobby code")
}

func isLobbyCodeCollision(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == pgerrcode.UniqueViolation
}
