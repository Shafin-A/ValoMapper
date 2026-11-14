package db

import (
	"embed"
	"log/slog"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

func RunMigrations(databaseURL string) error {
	started := time.Now()

	source, err := iofs.New(migrationsFS, "migrations")
	if err != nil {
		return err
	}

	m, err := migrate.NewWithSourceInstance("iofs", source, databaseURL)
	if err != nil {
		return err
	}
	defer func() { _, _ = m.Close() }()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return err
	}

	slog.Info("database migrations completed", "duration_ms", time.Since(started).Milliseconds())
	return nil
}
