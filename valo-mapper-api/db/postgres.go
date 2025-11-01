package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var DB *pgxpool.Pool

func InitDB() {
	ctx := context.Background()

	connStr := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
	)

	config, err := pgxpool.ParseConfig(connStr)
	if err != nil {
		log.Fatal("Error parsing database config:", err)
	}

	config.MaxConns = 10
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = 30 * time.Minute

	DB, err = pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		log.Fatal("Error creating database pool:", err)
	}

	if err := DB.Ping(ctx); err != nil {
		log.Fatal("Error pinging the database:", err)
	}

	_, err = DB.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS lobbies (
			code VARCHAR(10) PRIMARY KEY,
			created_at TIMESTAMPTZ NOT NULL
		)
	`)
	if err != nil {
		log.Fatal("Error creating tables:", err)
	}

	log.Println("Database initialized successfully!")
}
