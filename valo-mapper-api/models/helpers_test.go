package models

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"testing"
	"time"
	"valo-mapper-api/db"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

// setupTestDB creates a connection to the test database
func setupTestDB(t *testing.T) *pgxpool.Pool {
	t.Helper()

	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Try to load .env.test from current directory or parent
	_ = godotenv.Load(".env.test")
	_ = godotenv.Load("../.env.test")

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

	// URL-encode the password to handle special characters
	password := url.QueryEscape(os.Getenv("DB_PASSWORD"))

	connStr := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable",
		os.Getenv("DB_USER"),
		password,
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		testDBName,
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

	db.DB = pool

	// run migrations so schema is up-to-date
	if orig, err := os.Getwd(); err == nil {
		dir := orig
		for i := 0; i < 5; i++ {
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

// cleanupTestDB cleans up the test database connection
func cleanupTestDB(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	if pool != nil {
		pool.Close()
		db.DB = nil
	}
}

// truncateTables removes all data from specified tables
func truncateTables(t *testing.T, pool *pgxpool.Pool, tables ...string) {
	t.Helper()

	ctx := context.Background()
	for _, table := range tables {
		_, err := pool.Exec(ctx, fmt.Sprintf("TRUNCATE TABLE %s CASCADE", table))
		if err != nil {
			t.Logf("Warning: Failed to truncate table %s: %v", table, err)
		}
	}
}

// createTestUser creates a test user directly with SQL to avoid import cycles
func createTestUser(t *testing.T, pool *pgxpool.Pool, firebaseUID string) *User {
	t.Helper()

	var userID int
	var createdAt, updatedAt time.Time

	err := pool.QueryRow(context.Background(),
		`INSERT INTO users (firebase_uid, email, name, email_verified, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		RETURNING id, created_at, updated_at`,
		firebaseUID, "test@example.com", "Test User", true,
	).Scan(&userID, &createdAt, &updatedAt)

	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	return &User{
		ID:            userID,
		FirebaseUID:   strPtr(firebaseUID),
		Email:         strPtr("test@example.com"),
		Name:          strPtr("Test User"),
		EmailVerified: true,
		CreatedAt:     createdAt,
		UpdatedAt:     updatedAt,
	}
}

// createTestLobby creates a test lobby directly with SQL to avoid import cycles
// Ensures the required map exists before creating the lobby
func createTestLobby(t *testing.T, pool *pgxpool.Pool, code string) *Lobby {
	t.Helper()

	// Ensure the map exists
	_, err := pool.Exec(context.Background(),
		`INSERT INTO maps (id, text, text_color) 
		VALUES ('ascent', 'Ascent', '#FF0000')
		ON CONFLICT (id) DO NOTHING`)
	if err != nil {
		t.Fatalf("Failed to create test map: %v", err)
	}

	var createdAt, updatedAt time.Time

	err = pool.QueryRow(context.Background(),
		`INSERT INTO lobbies (code, selected_map_id, map_side, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		RETURNING created_at, updated_at`,
		code, "ascent", "attack",
	).Scan(&createdAt, &updatedAt)

	if err != nil {
		t.Fatalf("Failed to create test lobby: %v", err)
	}

	return &Lobby{
		Code:          code,
		SelectedMapId: "ascent",
		MapSide:       "attack",
		CreatedAt:     createdAt,
		UpdatedAt:     updatedAt,
	}
}
