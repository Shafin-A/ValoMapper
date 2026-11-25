package models

import (
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5/pgconn"
)

const (
	phaseCount         = 10
	dbOperationTimeout = 10 * time.Second
)

var (
	ErrLobbyNotFound = errors.New("lobby not found")
	ErrInvalidPatch  = errors.New("invalid canvas patch")
	ErrLobbyBusy     = errors.New("lobby is locked by a concurrent write")
)

func invalidPatchError(format string, args ...any) error {
	return fmt.Errorf("%w: %s", ErrInvalidPatch, fmt.Sprintf(format, args...))
}

func isLockNotAvailable(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == pgerrcode.LockNotAvailable
}
