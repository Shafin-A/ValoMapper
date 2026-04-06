package testutils

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"testing"
	"time"
	"valo-mapper-api/db"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

const integrationTestDBLockKey int64 = 4891375021

// SetupTestDB creates a connection to the test database
func SetupTestDB(t *testing.T) *pgxpool.Pool {
	t.Helper()

	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	envTestPath := filepath.Join("..", ".env.test")
	if _, err := os.Stat(envTestPath); err == nil {
		_ = godotenv.Load(envTestPath)
	}
	if _, err := os.Stat(".env.test"); err == nil {
		_ = godotenv.Load(".env.test")
	}

	testDBName := os.Getenv("DB_NAME")
	if testDBName == "" {
		testDBName = "valomapper_test"
		os.Setenv("DB_NAME", testDBName)
	}

	if os.Getenv("DB_HOST") == "" {
		os.Setenv("DB_HOST", "localhost")
	}
	if os.Getenv("DB_PORT") == "" {
		os.Setenv("DB_PORT", "5432")
	}
	if os.Getenv("DB_USER") == "" {
		os.Setenv("DB_USER", "postgres")
	}
	if os.Getenv("DB_PASSWORD") == "" {
		os.Setenv("DB_PASSWORD", "postgres")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// URL-encode the password to handle special characters like $, @, :, etc.
	password := url.QueryEscape(os.Getenv("DB_PASSWORD"))

	sslMode := os.Getenv("DB_SSLMODE")
	if sslMode == "" {
		sslMode = "disable"
	}

	connStr := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		os.Getenv("DB_USER"),
		password,
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		testDBName,
		url.QueryEscape(sslMode),
	)

	config, err := pgxpool.ParseConfig(connStr)
	if err != nil {
		t.Fatalf("Failed to parse database config: %v", err)
	}

	config.MaxConns = 5
	config.MinConns = 1

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("Failed to ping test database: %v", err)
	}

	// Serialize DB-mutating integration tests across packages because they all
	// share the same physical test database.
	if _, err := pool.Exec(context.Background(), `SELECT pg_advisory_lock($1)`, integrationTestDBLockKey); err != nil {
		t.Fatalf("Failed to acquire integration test database lock: %v", err)
	}

	// set global for helper functions that use db.GetDB
	db.DB = pool

	if orig, err := os.Getwd(); err == nil {
		// look for go.mod upwards to determine repo root
		dir := orig
		for range 5 {
			if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
				break
			}
			dir = filepath.Dir(dir)
		}
		_ = os.Chdir(dir)
		if migErr := db.RunMigrations(connStr); migErr != nil {
			t.Fatalf("Failed to run migrations on test database: %v", migErr)
		}
		_ = os.Chdir(orig)
	}

	return pool
}

// CleanupTestDB cleans up the test database connection
func CleanupTestDB(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	if pool != nil {
		pool.Close()
		db.DB = nil
	}
}

// TruncateTables removes all data from specified tables
func TruncateTables(t *testing.T, pool *pgxpool.Pool, tables ...string) {
	t.Helper()

	ctx := context.Background()
	// sort table names to make lock acquisition order deterministic across
	// processes. Concurrent truncates on the same set of tables can deadlock if
	// the orders differ, so this simple step ensures all callers use the same
	// sequence regardless of how the slice was provided.
	sorted := make([]string, len(tables))
	copy(sorted, tables)
	// alphabetical sort is sufficient
	sort.Strings(sorted)
	for _, table := range sorted {
		_, err := pool.Exec(ctx, fmt.Sprintf("TRUNCATE TABLE %s CASCADE", table))
		if err != nil {
			t.Logf("Warning: Failed to truncate table %s: %v", table, err)
		}
	}
}
