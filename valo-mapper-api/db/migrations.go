package db

import (
	"log"

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

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return err
	}

	log.Println("Database migrations completed successfully")
	return nil
}
