package db

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"os"
	"time"

	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgxpool"
)

var DB *pgxpool.Pool

func GetDB() (*pgxpool.Pool, error) {
	if DB == nil {
		return nil, fmt.Errorf("database connection not initialized")
	}
	return DB, nil
}

func InitDB() error {
	requiredEnvVars := []string{"DB_USER", "DB_PASSWORD", "DB_HOST", "DB_PORT", "DB_NAME"}
	for _, envVar := range requiredEnvVars {
		if os.Getenv(envVar) == "" {
			return fmt.Errorf("required environment variable %s is not set", envVar)
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	password := url.QueryEscape(os.Getenv("DB_PASSWORD"))

	connStr := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable",
		os.Getenv("DB_USER"),
		password,
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
	)

	config, err := pgxpool.ParseConfig(connStr)
	if err != nil {
		return fmt.Errorf("error parsing database config: %w", err)
	}

	config.MaxConns = 10
	config.MinConns = 1
	config.MaxConnLifetime = 30 * time.Minute
	config.MaxConnIdleTime = 5 * time.Minute
	config.HealthCheckPeriod = 30 * time.Second

	err = WithRetryNoResult(ctx, 5, func() error {
		var poolErr error
		DB, poolErr = pgxpool.NewWithConfig(ctx, config)
		if poolErr != nil {
			return poolErr
		}

		if pingErr := DB.Ping(ctx); pingErr != nil {
			DB.Close()
			DB = nil
			return pingErr
		}
		return nil
	})

	if err != nil {
		return fmt.Errorf("error connecting to database after retries: %w", err)
	}

	slog.Info("database connection established")

	if err := RunMigrations(connStr); err != nil {
		return fmt.Errorf("error running database migrations: %w", err)
	}

	slog.Info("database initialized")
	return nil
}

func Close() {
	if DB != nil {
		DB.Close()
		DB = nil
		slog.Info("database connection closed")
	}
}

const (
	connectionRetryCount          = 3
	connectionRetryInitialBackoff = 100 * time.Millisecond
	connectionRetryMaxBackoff     = 1 * time.Second
)

func EnsureConnection(ctx context.Context) error {
	if DB == nil {
		return fmt.Errorf("database connection not initialized")
	}

	var lastErr error
	backoff := connectionRetryInitialBackoff

	for attempt := 1; attempt <= connectionRetryCount; attempt++ {
		lastErr = DB.Ping(ctx)
		if lastErr == nil {
			return nil
		}

		if IsRetryableError(lastErr) {
			DB.Reset()
		}

		if ctx.Err() != nil {
			return ctx.Err()
		}

		if attempt < connectionRetryCount {
			select {
			case <-time.After(backoff):
				backoff *= 2
				if backoff > connectionRetryMaxBackoff {
					backoff = connectionRetryMaxBackoff
				}
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	}

	return lastErr
}
