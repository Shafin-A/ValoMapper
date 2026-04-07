# valo-mapper (Frontend)

Next.js frontend for ValoMapper.

## Setup

1. Create a `.env` file based on `.env.example`:

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

2. Install dependencies:

   ```sh
   npm install
   ```

3. Start the development server:

   ```sh
   npm run dev
   ```
