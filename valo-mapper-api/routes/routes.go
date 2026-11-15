package routes

import (
	"valo-mapper-api/handlers"
	"valo-mapper-api/websocket"

	"firebase.google.com/go/v4/auth"
	"github.com/gorilla/mux"
)

func SetupRoutes(r *mux.Router, firebaseAuth *auth.Client, hub *websocket.Hub, replayParser handlers.ReplayParser, internalAPIKey string) {
	handlers.ConfigureFirebaseAuth(handlers.NewFirebaseAuthClient(firebaseAuth))

	RegisterHealthRoutes(r)
	RegisterMetricsRoutes(r, hub, replayParser, internalAPIKey)
	RegisterAdminRoutes(r, internalAPIKey)
	RegisterAuthRoutes(r, firebaseAuth)
	RegisterMatchRoutes(r, firebaseAuth)
	RegisterBillingRoutes(r, firebaseAuth)
	RegisterLobbyRoutes(r, hub)
	RegisterUserRoutes(r, firebaseAuth, internalAPIKey)
	RegisterFolderRoutes(r, firebaseAuth)
	RegisterStrategyRoutes(r, firebaseAuth)
	RegisterImageRoutes(r)
	RegisterReplayRoutes(r, replayParser)
}
