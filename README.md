
# ValoMapper

ValoMapper is a web application designed to help Valorant players create, share, and manage strategies using interactive map tools and agent utilities inspired heavily by Valoplant.gg and Icarus.

Firebase is used for authentication and user management in both the frontend and backend. You will need a Firebase project and service account to run the app locally.

## Prerequisites

Before setting up the project, ensure you have:
- Node.js & npm
- Go 
- PostgreSQL 
- A Firebase project with a service account key

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
   API_URL=http://localhost:8080
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
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
   ```
3. Ensure PostgreSQL is running and a database named `valo-mapper` exists.
4. Place your Firebase service account JSON (`serviceAccountKey.json`) in `valo-mapper-api/`.
5. Make sure your Firebase project is configured for authentication.
6. Build and run the Go server:
   ```sh
   go run main.go
   ```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
This project is licensed under the MIT License.
