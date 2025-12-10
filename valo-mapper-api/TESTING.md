# ValoMapper Backend Testing

This directory contains comprehensive tests for the ValoMapper Go backend API.

## Test Structure

```
valo-mapper-api/
├── testutils/          # Test utilities and helpers
│   ├── db.go          # Database setup helpers
│   ├── fixtures.go    # Test data fixtures
│   ├── mock_auth.go   # Mock Firebase auth
│   └── http.go        # HTTP test helpers
├── handlers/          # Handler tests
│   ├── auth_test.go
│   ├── folder_test.go
│   ├── lobby_test.go
│   ├── strategy_test.go
│   └── user_test.go
├── middleware/        # Middleware tests
│   └── request_id_test.go
├── models/            # Model tests
│   ├── canvas_test.go
│   ├── canvas_db_test.go
│   ├── folder_test.go
│   ├── helpers_test.go
│   ├── lobby_test.go
│   ├── map_test.go
│   ├── strategy_test.go
│   └── user_test.go
├── utils/            # Utility tests
│   └── http_error_test.go
└── db/               # Database tests
    └── init_test.go
```

## Running Tests

### Run All Tests
```bash
cd valo-mapper-api
go test ./...
```

### Run Unit Tests Only (No Database)
```bash
go test -short ./...
```

### Run With Coverage
```bash
go test -cover ./...
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Run Specific Package
```bash
go test ./handlers
go test ./models
go test ./utils
go test ./middleware
```

### Run With Verbose Output
```bash
go test -v ./...
```

### Run Integration Tests Only
```bash
go test -run Integration ./...
```

## Test Database Setup

### Local Development

1. **Create test database:**
```sql
CREATE DATABASE valomapper_test;
```

2. **Copy environment file:**
```bash
cp .env.example .env.test
```

3. **Update `.env.test` with test database credentials:**
```env
DB_NAME=valomapper_test
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
```

4. **Run migrations on test database:**
```bash
# Set environment to test database
export DB_NAME=valomapper_test
go run db/migrations.go
```

### GitHub Actions CI/CD

Tests automatically run on GitHub Actions with a PostgreSQL service container. No setup needed - the workflow handles everything.

## Test Categories

### Unit Tests
- **Utils**: Error handling, HTTP utilities
- **Middleware**: Request ID generation
- **Handlers**: Business logic with mocked dependencies
- **Models**: JSON serialization for canvas structures (agents, abilities, draw lines, etc.)
- **Lobby**: Code generation uniqueness and format validation

### Integration Tests
- **Database**: Connection, queries, transactions
- **Handlers**: Full request/response cycle with real database
- **Models**: CRUD operations (User, Strategy, Folder, Lobby, Canvas, Map)
  - Save/Create operations
  - Update operations
  - Delete operations
  - Query operations (GetByID, GetByUserID, GetByCode, etc.)
  - Foreign key constraints
  - Null value handling
  - Complex canvas state management
  - JSON serialization/deserialization
  - Multi-phase canvas data handling

### Mocking

We use mocks for:
- **Firebase Authentication**: `testutils.MockFirebaseAuth`
- **Database Queries**: SQL mocks where appropriate
- **HTTP Requests**: `httptest.ResponseRecorder`

## Writing New Tests

### Example: Handler Test

```go
func TestMyHandler(t *testing.T) {
    // For unit test (no database)
    t.Run("unit test", func(t *testing.T) {
        req := testutils.MakeRequest(t, "POST", "/api/test", body, "token")
        w := httptest.NewRecorder()
        
        MyHandler(w, req)
        
        testutils.AssertStatusCode(t, w, http.StatusOK)
    })
    
    // For integration test (with database)
    if testing.Short() {
        t.Skip("Skipping integration test")
    }
    
    t.Run("integration test", func(t *testing.T) {
        pool := testutils.SetupTestDB(t)
        defer testutils.CleanupTestDB(t, pool)
```

### Example: Model Test

```go
func TestModelSave(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping integration test")
    }
    
    pool := testutils.SetupTestDB(t)
    defer testutils.CleanupTestDB(t, pool)
    
    t.Run("creates model successfully", func(t *testing.T) {
        testutils.TruncateTables(t, pool, "table_name")
        
        model := &Model{
            Field: "value",
        }
        
        err := model.Save()
        require.NoError(t, err)
        assert.NotZero(t, model.ID)
        assert.NotZero(t, model.CreatedAt)
    })
}
```

See `models/user_test.go`, `models/strategy_test.go`, `models/folder_test.go`, `models/lobby_test.go`, and `models/canvas_db_test.go` for complete examples.

## Best Practices

1. **Use table-driven tests** for multiple scenarios
2. **Mock external dependencies** (Firebase, third-party APIs)
3. **Skip integration tests** with `testing.Short()` flag
4. **Clean up test data** after each test
5. **Use descriptive test names** that explain what's being tested
6. **Test error cases** as well as happy paths
7. **Keep tests isolated** - don't depend on other tests

## Continuous Integration

The GitHub Actions workflow (`.github/workflows/go-tests.yml`) runs:
- ✅ Unit tests
- ✅ Integration tests
- ✅ Code linting
- ✅ Coverage reports
- ✅ Build verification

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

## Coverage Goals

Target coverage: **70%+**

Current coverage can be viewed:
- Locally: `go test -cover ./...`
- CI: Check GitHub Actions artifacts
- Codecov: Coverage reports uploaded to Codecov (if configured)

## Troubleshooting

### Tests Can't Connect to Database
```bash
# Check PostgreSQL is running
psql -h localhost -U postgres -d valomapper_test

# Verify environment variables
echo $DB_NAME
```

### Integration Tests Failing
```bash
# Run only unit tests
go test -short ./...

# Check test database has migrations
psql -h localhost -U postgres -d valomapper_test -c "\dt"
```

### Mock Firebase Auth Issues
- Ensure `serviceAccountKey.json` exists (can be dummy for unit tests)
- Use `testutils.MockFirebaseAuth` for unit tests
