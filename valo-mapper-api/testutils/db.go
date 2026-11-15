package testutils

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"testing"
	"time"
	"valo-mapper-api/db"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

const integrationTestDBLockKey int64 = 4891375021

func SetupTestDB(t testing.TB) *pgxpool.Pool {
	return setupTestDB(t, nil)
}

func SetupTestDBWithTracer(t testing.TB, tracer pgx.QueryTracer) *pgxpool.Pool {
	return setupTestDB(t, tracer)
}

func setupTestDB(t testing.TB, tracer pgx.QueryTracer) *pgxpool.Pool {
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
		_ = os.Setenv("DB_NAME", testDBName)
	}

	if os.Getenv("DB_HOST") == "" {
		_ = os.Setenv("DB_HOST", "localhost")
	}
	if os.Getenv("DB_PORT") == "" {
		_ = os.Setenv("DB_PORT", "5432")
	}
	if os.Getenv("DB_USER") == "" {
		_ = os.Setenv("DB_USER", "postgres")
	}
	if os.Getenv("DB_PASSWORD") == "" {
		_ = os.Setenv("DB_PASSWORD", "postgres")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	connStr := db.ConnectionString()

	config, err := pgxpool.ParseConfig(connStr)
	if err != nil {
		t.Fatalf("Failed to parse database config: %v", err)
	}

	config.MaxConns = 5
	config.MinConns = 1
	if tracer != nil {
		config.ConnConfig.Tracer = tracer
	}

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("Failed to ping test database: %v", err)
	}

	// Serialize DB-mutating integration tests across packages; they share one physical database.
	if _, err := pool.Exec(context.Background(), `SELECT pg_advisory_lock($1)`, integrationTestDBLockKey); err != nil {
		t.Fatalf("Failed to acquire integration test database lock: %v", err)
	}

	// set global for helpers that call db.GetDB
	db.DB = pool

	if orig, err := os.Getwd(); err == nil {
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

func CleanupTestDB(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	if pool != nil {
		pool.Close()
		db.DB = nil
	}
}

func TruncateTables(t testing.TB, pool *pgxpool.Pool, tables ...string) {
	t.Helper()

	ctx := context.Background()
	// Sort table names so concurrent truncates acquire locks in the same order and cannot deadlock.
	sorted := make([]string, len(tables))
	copy(sorted, tables)
	sort.Strings(sorted)
	for _, table := range sorted {
		_, err := pool.Exec(ctx, fmt.Sprintf("TRUNCATE TABLE %s CASCADE", table))
		if err != nil {
			t.Logf("Warning: Failed to truncate table %s: %v", table, err)
		}
	}
}
