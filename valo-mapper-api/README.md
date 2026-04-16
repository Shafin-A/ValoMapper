# valo-mapper-api (Backend)

Go REST API for ValoMapper, backed by PostgreSQL.

## Setup

1. Ensure PostgreSQL is running and a database named `valo-mapper` exists.

2. Make sure your Firebase project is configured for authentication.

3. Create a `.env` file based on `.env.example`:

   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your_db_password
   DB_NAME=valo-mapper

   # Raw Firebase service account JSON (single-line string)
   GOOGLE_APPLICATION_CREDENTIALS='{"type":"service_account",...}'

   # Comma-separated CORS origins (defaults to localhost:3000 if omitted)
   ALLOWED_ORIGINS=http://localhost:3000

   # Optional API rate limiting controls
   # Defaults: 20 requests/second with burst 60
   RATE_LIMIT_RPS=20
   RATE_LIMIT_BURST=60

   # Riot Sign-On (required by backend startup)
   RSO_CLIENT_ID=your_rso_client_id
   RSO_CLIENT_SECRET=your_rso_client_secret
   RSO_REDIRECT_URI=http://localhost:3000/api/auth/rso/callback

   # Riot Developer API key
   RIOT_API_KEY=RGAPI-your-riot-developer-key

   # Internal key used by protected server-to-server endpoints
   # Generate with PowerShell:
   # $bytes = New-Object byte[] 32; [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); -join ($bytes | ForEach-Object { $_.ToString("x2") })
   INTERNAL_API_KEY=your_internal_api_key

   # Stripe secret key + recurring price lookup keys (used by billing endpoints)
   STRIPE_SECRET_KEY=sk_test_your_secret_key
   # Required lookup keys configured on Stripe Price objects
   STRIPE_PRICE_LOOKUP_KEY_MONTHLY=standard_monthly
   STRIPE_PRICE_LOOKUP_KEY_YEARLY=standard_yearly
   STRIPE_PRICE_LOOKUP_KEY_STACK=standard_stack

   # Stripe webhook signing secret (from Stripe Dashboard or Stripe CLI)
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

   # Checkout redirect URLs
   STRIPE_CHECKOUT_SUCCESS_URL=http://localhost:3000/billing/success
   STRIPE_CHECKOUT_CANCEL_URL=http://localhost:3000/billing/cancel

   # Tigris S3-compatible object storage for image uploads
   # Leave empty/unset to skip image upload features. Set to use Tigris or compatible service.
   AWS_ACCESS_KEY_ID=your_tigris_access_key
   AWS_SECRET_ACCESS_KEY=your_tigris_secret_key
   BUCKET_NAME=your_tigris_bucket_name
   AWS_ENDPOINT_URL_S3=https://fly.storage.tigris.dev
   AWS_REGION=auto

   # Log output format: "json" (default, structured — for Datadog/Loki) or "text" (human-readable — for local dev)
   LOG_FORMAT=text
   ```

4. Run the server:

   ```sh
   go run main.go
   ```

   **Note on image uploads**: Image upload endpoints require Tigris (or S3-compatible) storage configured via env vars (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `BUCKET_NAME`). If unset, image upload endpoints return `503 Service Unavailable`.

## API Docs (Swagger)

The API serves interactive Swagger UI at:

```text
http://localhost:8080/swagger/index.html
```

Generated OpenAPI files are committed under `docs/`:

- `docs.go`
- `swagger.json`
- `swagger.yaml`

When handlers or routes change, regenerate docs from this directory:

```sh
go install github.com/swaggo/swag/cmd/swag@v1.16.6
swag init -g main.go -o docs
```

### CI Swagger Drift Check

The Go CI workflow validates that generated Swagger files are up to date. It regenerates docs and fails if any of `docs/docs.go`, `docs/swagger.json`, or `docs/swagger.yaml` would change.

Equivalent local validation:

```sh
swag init -g main.go -o docs
git diff --exit-code -- docs/docs.go docs/swagger.json docs/swagger.yaml
```

## Pre-Commit Hook

This repository includes a versioned Git pre-commit hook at `.githooks/pre-commit` that regenerates Swagger docs and stages generated files when Swagger-relevant backend source files are staged (`valo-mapper-api/main.go`, `valo-mapper-api/handlers/*.go`, `valo-mapper-api/routes/*.go`, `valo-mapper-api/models/*.go`, excluding `*_test.go`).

One-time setup per local clone — run from the repository root:

PowerShell (Windows):

```sh
./scripts/setup-git-hooks.ps1
```

Bash (macOS/Linux/Git Bash):

```sh
./scripts/setup-git-hooks.sh
```

This sets `core.hooksPath` to `.githooks` in the local repo config.
