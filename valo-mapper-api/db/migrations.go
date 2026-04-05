package db

import (
	"log/slog"

	"github.com/golang-migrate/migrate/v4"
)

func RunMigrations(databaseURL string) error {
	m, err := migrate.New(
		"file://db/migrations",
		databaseURL,
	)
	if err != nil {
		return err
	}
	defer m.Close()

	// if err := m.Drop(); err != nil {
	// 	log.Printf("Drop error: %v", err)
	// }

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return err
	}

	slog.Info("database migrations completed")
	return nil
}
