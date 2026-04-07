# Deployment

ValoMapper is configured for deployment on Fly.io using Docker containers.

## Quick Deployment Steps

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
   - Backend: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `GOOGLE_APPLICATION_CREDENTIALS`, `ALLOWED_ORIGINS`, `RATE_LIMIT_RPS`, `RATE_LIMIT_BURST`, `RSO_CLIENT_ID`, `RSO_CLIENT_SECRET`, `RSO_REDIRECT_URI`, `INTERNAL_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_LOOKUP_KEY_MONTHLY`, `STRIPE_PRICE_LOOKUP_KEY_YEARLY`, `STRIPE_PRICE_LOOKUP_KEY_STACK`, `STRIPE_WEBHOOK_SECRET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `BUCKET_NAME`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION` (set `SWAGGER_PASSWORD` to expose `/swagger/` behind Basic Auth, otherwise the endpoint returns 404)
   - Frontend: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_RSO_CLIENT_ID`, `NEXT_PUBLIC_RSO_REDIRECT_URI`, `API_URL`, `NEXT_PUBLIC_WS_URL`

6. **Deploy**:

   ```sh
   fly deploy --app valomapper-api
   fly deploy --app valomapper
   ```

## GitHub Actions CI/CD

To enable automated deployments:

1. **Create a Fly.io deploy token**:

   ```sh
   fly tokens create deploy
   ```

2. **Add to GitHub secrets**: Go to your repository settings → Secrets and variables → Actions, and add `FLY_API_TOKEN` with the token value.
