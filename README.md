# ValoMapper

ValoMapper is a web application designed to help Valorant players create, share, and manage strategies using interactive map tools and agent utilities inspired heavily by Valoplant.gg and Icarus.

Firebase is used for authentication and user management in both the frontend and backend. You will need a Firebase project and service account to run the app locally.

## Prerequisites

Before setting up the project, ensure you have:

- Node.js & npm
- Go
- PostgreSQL
- A Firebase project with a service account key
- Riot Sign-On (RSO) OAuth app credentials (client ID/secret)

## Getting Started

### Frontend Setup

1. Navigate to the `valo-mapper` directory:

   ```sh
   cd valo-mapper
   ```

2. Create a `.env` file based on `.env.example`:

   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id

   # Riot Sign-On (optional for frontend, required for Riot login button)
   NEXT_PUBLIC_RSO_CLIENT_ID=your_rso_client_id
   # Keep this aligned with your backend RSO_REDIRECT_URI callback
   NEXT_PUBLIC_RSO_REDIRECT_URI=http://localhost:3000/api/auth/rso/callback

   # Internal Next.js API routes call the Go backend at this URL
   API_URL=http://localhost:8080

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

   # Path to Firebase service account JSON
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json

   # Comma-separated CORS origins (defaults to localhost:3000 if omitted)
   ALLOWED_ORIGINS=http://localhost:3000

   # Riot Sign-On (required by backend startup)
   RSO_CLIENT_ID=your_rso_client_id
   RSO_CLIENT_SECRET=your_rso_client_secret
   RSO_REDIRECT_URI=http://localhost:3000/api/auth/rso/callback

   # Internal key used by protected server-to-server endpoints
   # Generate with PowerShell:
   # $bytes = New-Object byte[] 32; [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); -join ($bytes | ForEach-Object { $_.ToString("x2") })
   INTERNAL_API_KEY=your_internal_api_key

   # Stripe secret key + recurring price ID (used by checkout-session endpoint)
   STRIPE_SECRET_KEY=sk_test_your_secret_key
   STRIPE_PRICE_ID=price_your_recurring_price_id

   # Stripe webhook signing secret (from Stripe Dashboard or Stripe CLI)
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

   # Checkout redirect URLs
   STRIPE_CHECKOUT_SUCCESS_URL=http://localhost:3000/billing/success
   STRIPE_CHECKOUT_CANCEL_URL=http://localhost:3000/billing/cancel
   ```

3. Ensure PostgreSQL is running and a database named `valo-mapper` exists.
4. Place your Firebase service account JSON (`serviceAccountKey.json`) in `valo-mapper-api/`.
5. Make sure your Firebase project is configured for authentication.
6. Build and run the Go server:

   ```sh
   go run main.go
   ```

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

4. **Configure secrets**:
   - Backend: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `GOOGLE_APPLICATION_CREDENTIALS`, `ALLOWED_ORIGINS`, `RSO_CLIENT_ID`, `RSO_CLIENT_SECRET`, `RSO_REDIRECT_URI`, `INTERNAL_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`
   - Frontend: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_RSO_CLIENT_ID`, `NEXT_PUBLIC_RSO_REDIRECT_URI`, `API_URL`, `NEXT_PUBLIC_WS_URL`

5. **Deploy**:

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
