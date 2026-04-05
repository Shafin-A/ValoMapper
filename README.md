# ValoMapper

ValoMapper is a collaborative strategy tool for VALORANT. Place agents, abilities, and utility icons on interactive maps, annotate with free-hand drawing and text, and plan with your team in real time. Inspired heavily by the design and ideas of [Valoplant](https://valoplant.gg) and [Icarus](https://github.com/SunkenInTime/icarus).

The frontend is built with Next.js and the backend is a Go REST API backed by PostgreSQL. Real-time collaboration is powered by WebSockets. Firebase handles authentication, Riot Sign-On (RSO) supports Riot account login, Stripe manages subscription billing, and Tigris provides S3-compatible object storage for image uploads.

## Prerequisites

Before setting up the project, ensure you have:

- Node.js & npm
- Go
- PostgreSQL
- A Firebase project with backend credentials for Firebase Admin

## Getting Started

### Frontend Setup

1. Navigate to the `valo-mapper` directory:

   ```sh
   cd valo-mapper
   ```

2. Create a `.env` file based on `.env.example`:

   ```env
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id

   # Riot Sign-On (optional for frontend, required for Riot login button)
   NEXT_PUBLIC_RSO_CLIENT_ID=your_rso_client_id
   # Keep this aligned with your backend RSO_REDIRECT_URI callback
   NEXT_PUBLIC_RSO_REDIRECT_URI=http://localhost:3000/api/auth/rso/callback

   # Internal Next.js API routes call the Go backend API base at this URL
   API_URL=http://localhost:8080/api

   # WebSocket URL for lobby collaboration
   NEXT_PUBLIC_WS_URL=ws://localhost:8080
   ```

3. Install dependencies:

   ```sh
   npm install
   ```

4. Start the development server:

   ```sh
   npm run dev
   ```

### Backend Setup

1. Navigate to the `valo-mapper-api` directory:

   ```sh
   cd valo-mapper-api
   ```

2. Create a `.env` file based on `.env.example`:

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

3. Ensure PostgreSQL is running and a database named `valo-mapper` exists.
4. Make sure your Firebase project is configured for authentication.
5. Build and run the Go server:

   ```sh
   go run main.go
   ```

   **Note on image uploads**: Image upload endpoints require Tigris (or S3-compatible) storage to be configured via env vars (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `BUCKET_NAME`). If these are not set, image upload endpoints will return `503 Service Unavailable`.

### Backend API Docs (Swagger)

The Go API serves interactive Swagger UI at:

```text
http://localhost:8080/swagger/index.html
```

Generated OpenAPI files are committed under `valo-mapper-api/docs/`:

- `docs.go`
- `swagger.json`
- `swagger.yaml`

When backend handlers/routes change, regenerate docs from `valo-mapper-api/`:

```sh
go install github.com/swaggo/swag/cmd/swag@v1.16.6
swag init -g main.go -o docs
```

### Backend CI Swagger Drift Check

The Go CI workflow validates that generated Swagger files are up to date. It regenerates docs and fails if `valo-mapper-api/docs/docs.go`, `valo-mapper-api/docs/swagger.json`, or `valo-mapper-api/docs/swagger.yaml` would change.

Equivalent local validation:

```sh
swag init -g main.go -o docs
git diff --exit-code -- docs/docs.go docs/swagger.json docs/swagger.yaml
```

### Local Pre-Commit Hook

This repository includes a versioned Git pre-commit hook at `.githooks/pre-commit` that regenerates Swagger docs and stages generated files only when Swagger-relevant backend source files are staged (`valo-mapper-api/main.go`, `valo-mapper-api/handlers/*.go`, `valo-mapper-api/routes/*.go`, `valo-mapper-api/models/*.go`, excluding `*_test.go`).

One-time setup per local clone:

PowerShell (Windows):

```sh
./scripts/setup-git-hooks.ps1
```

Bash (macOS/Linux/Git Bash):

```sh
./scripts/setup-git-hooks.sh
```

This sets `core.hooksPath` to `.githooks` in the local repo config.

## Deployment

ValoMapper is configured for deployment on Fly.io using Docker containers.

### Quick Deployment Steps

1. **Install Fly CLI and login**:

   ```sh
   fly auth login
   ```

2. **Create Fly.io apps**:

   ```sh
   fly apps create valomapper-api
   fly apps create valomapper
   ```

3. **Set up PostgreSQL database**:

   ```sh
   fly postgres create --name valomapper-db --region yyz
   ```

4. **Set up Tigris object storage**:

   ```sh
   fly storage create --name valo-mapper
   ```

   This creates a Tigris bucket and outputs credentials that you'll use in the next step.

5. **Configure secrets**:
   - Backend: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `GOOGLE_APPLICATION_CREDENTIALS`, `ALLOWED_ORIGINS`, `RATE_LIMIT_RPS`, `RATE_LIMIT_BURST`, `RSO_CLIENT_ID`, `RSO_CLIENT_SECRET`, `RSO_REDIRECT_URI`, `INTERNAL_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_LOOKUP_KEY_MONTHLY`, `STRIPE_PRICE_LOOKUP_KEY_YEARLY`, `STRIPE_PRICE_LOOKUP_KEY_STACK`, `STRIPE_WEBHOOK_SECRET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `BUCKET_NAME`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`
   - Frontend: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_RSO_CLIENT_ID`, `NEXT_PUBLIC_RSO_REDIRECT_URI`, `API_URL`, `NEXT_PUBLIC_WS_URL`

6. **Deploy**:

   ```sh
   fly deploy --app valomapper-api
   fly deploy --app valomapper
   ```

### GitHub Actions CI/CD

To enable automated deployments:

1. **Create a Fly.io deploy token**:

   ```sh
   fly tokens create deploy
   ```

2. **Add to GitHub secrets**: Go to your repository settings → Secrets and variables → Actions, and add `FLY_API_TOKEN` with the token value.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License.
