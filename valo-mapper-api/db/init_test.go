package db

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/joho/godotenv"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func init() {
	// Load .env.test file at package initialization
	envTestPath := filepath.Join("..", ".env.test")
	if _, err := os.Stat(envTestPath); err == nil {
		_ = godotenv.Load(envTestPath)
	}
	if _, err := os.Stat(".env.test"); err == nil {
		_ = godotenv.Load(".env.test")
	}
}

func TestInitDB(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Change to parent directory for migrations to work
	originalDir, err := os.Getwd()
	require.NoError(t, err)
	defer func() { _ = os.Chdir(originalDir) }()

	err = os.Chdir("..")
	require.NoError(t, err)

	originalVars := map[string]string{
		"DB_HOST":     os.Getenv("DB_HOST"),
		"DB_PORT":     os.Getenv("DB_PORT"),
		"DB_USER":     os.Getenv("DB_USER"),
		"DB_PASSWORD": os.Getenv("DB_PASSWORD"),
		"DB_NAME":     os.Getenv("DB_NAME"),
		"DB_SSLMODE":  os.Getenv("DB_SSLMODE"),
	}

	defer func() {
		for key, value := range originalVars {
			if value != "" {
				os.Setenv(key, value)
			} else {
				os.Unsetenv(key)
			}
		}
		if DB != nil {
			DB.Close()
			DB = nil
		}
	}()

	t.Run("successfully initializes database with valid config", func(t *testing.T) {
		// Set test environment variables - use values from .env.test if loaded, otherwise defaults
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
		if os.Getenv("DB_NAME") == "" {
			os.Setenv("DB_NAME", "valomapper_test")
		}
		if os.Getenv("DB_SSLMODE") == "" {
			os.Setenv("DB_SSLMODE", "disable")
		}

		err := InitDB()
		require.NoError(t, err)
		require.NotNil(t, DB)

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		err = DB.Ping(ctx)
		assert.NoError(t, err)

		DB.Close()
		DB = nil
	})

	t.Run("fails with missing required env var", func(t *testing.T) {
		os.Unsetenv("DB_HOST")
		os.Unsetenv("DB_PORT")
		os.Unsetenv("DB_USER")
		os.Unsetenv("DB_PASSWORD")
		os.Unsetenv("DB_NAME")
		os.Unsetenv("DB_SSLMODE")

		err := InitDB()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "required environment variable")
	})

	t.Run("fails with invalid connection string", func(t *testing.T) {
		os.Setenv("DB_HOST", "invalid-host-that-does-not-exist")
		os.Setenv("DB_PORT", "5432")
		os.Setenv("DB_USER", "postgres")
		os.Setenv("DB_PASSWORD", "postgres")
		os.Setenv("DB_NAME", "valomapper_test")
		os.Setenv("DB_SSLMODE", "disable")

		err := InitDB()
		assert.Error(t, err)
	})
}

func TestGetDB(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	originalDir, err := os.Getwd()
	require.NoError(t, err)
	defer func() { _ = os.Chdir(originalDir) }()

	err = os.Chdir("..")
	require.NoError(t, err)

	originalDB := DB
	defer func() {
		DB = originalDB
	}()

	t.Run("returns error when DB is not initialized", func(t *testing.T) {
		DB = nil

		conn, err := GetDB()
		assert.Nil(t, conn)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "not initialized")
	})

	t.Run("returns DB connection when initialized", func(t *testing.T) {
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
		if os.Getenv("DB_NAME") == "" {
			os.Setenv("DB_NAME", "valomapper_test")
		}
		if os.Getenv("DB_SSLMODE") == "" {
			os.Setenv("DB_SSLMODE", "disable")
		}

		err := InitDB()
		require.NoError(t, err)

		conn, err := GetDB()
		assert.NoError(t, err)
		assert.NotNil(t, conn)
		assert.Equal(t, DB, conn)

		DB.Close()
		DB = nil
	})
}

func TestEnsureConnection_WhenUninitialized(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	originalDB := DB
	DB = nil
	defer func() { DB = originalDB }()

	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()

	err := EnsureConnection(ctx)
	if err == nil {
		t.Fatal("expected EnsureConnection to return an error when DB is not initialized")
	}
	if !strings.Contains(err.Error(), "database connection not initialized") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestClose(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	originalDir, err := os.Getwd()
	require.NoError(t, err)
	defer func() { _ = os.Chdir(originalDir) }()

	err = os.Chdir("..")
	require.NoError(t, err)

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
	if os.Getenv("DB_NAME") == "" {
		os.Setenv("DB_NAME", "valomapper_test")
	}
	if os.Getenv("DB_SSLMODE") == "" {
		os.Setenv("DB_SSLMODE", "disable")
	}

	err = InitDB()
	require.NoError(t, err)
	require.NotNil(t, DB)

	Close()

	conn, err := GetDB()
	assert.Error(t, err)
	assert.Nil(t, conn)
}

func TestDatabaseConnectionPool(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	originalDir, err := os.Getwd()
	require.NoError(t, err)
	defer func() { _ = os.Chdir(originalDir) }()

	err = os.Chdir("..")
	require.NoError(t, err)

	originalDB := DB
	defer func() {
		if DB != nil {
			DB.Close()
		}
		DB = originalDB
	}()

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
	if os.Getenv("DB_NAME") == "" {
		os.Setenv("DB_NAME", "valomapper_test")
	}
	if os.Getenv("DB_SSLMODE") == "" {
		os.Setenv("DB_SSLMODE", "disable")
	}

	err = InitDB()
	require.NoError(t, err)

	t.Run("can execute simple query", func(t *testing.T) {
		ctx := context.Background()
		var result int
		err := DB.QueryRow(ctx, "SELECT 1").Scan(&result)
		assert.NoError(t, err)
		assert.Equal(t, 1, result)
	})

	t.Run("handles multiple concurrent connections", func(t *testing.T) {
		ctx := context.Background()
		done := make(chan bool, 5)

		for i := range 5 {
			go func(n int) {
				var result int
				err := DB.QueryRow(ctx, "SELECT $1::int", n).Scan(&result)
				assert.NoError(t, err)
				assert.Equal(t, n, result)
				done <- true
			}(i)
		}

		for range 5 {
			<-done
		}
	})

	DB.Close()
	DB = nil
}
