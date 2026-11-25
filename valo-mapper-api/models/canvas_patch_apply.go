package models

import (
	"context"
	"errors"

	"valo-mapper-api/db"

	"github.com/jackc/pgx/v5"
)

func ApplyCanvasPatch(ctx context.Context, lobbyCode string, patch CanvasPatch) (retErr error) {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(ctx, dbOperationTimeout)
	defer cancel()

	tx, err := conn.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if retErr != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	if _, err = tx.Exec(ctx, "SET LOCAL lock_timeout = '5s'"); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, "SET LOCAL statement_timeout = '10s'"); err != nil {
		return err
	}

	// The row lock also verifies the lobby exists.
	var lobbyExists int
	if err = tx.QueryRow(ctx, "SELECT 1 FROM lobbies WHERE code = $1 FOR UPDATE", lobbyCode).Scan(&lobbyExists); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrLobbyNotFound
		}
		return err
	}

	for _, entry := range patch.Entries {
		if err := applyPatchEntry(ctx, tx, lobbyCode, entry); err != nil {
			return err
		}
	}

	if err := setLobbyUpdatedAt(ctx, tx, lobbyCode); err != nil {
		return err
	}

	retErr = tx.Commit(ctx)
	return retErr
}
