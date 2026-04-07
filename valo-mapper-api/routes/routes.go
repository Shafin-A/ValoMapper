package routes

import (
	"valo-mapper-api/websocket"

	"firebase.google.com/go/v4/auth"
	"github.com/gorilla/mux"
)

func SetupRoutes(r *mux.Router, firebaseAuth *auth.Client, hub *websocket.Hub) {
	RegisterHealthRoutes(r)
	RegisterMetricsRoutes(r, hub)
	RegisterAdminRoutes(r)
	RegisterAuthRoutes(r, firebaseAuth)
	RegisterBillingRoutes(r, firebaseAuth)
	RegisterLobbyRoutes(r, hub)
	RegisterUserRoutes(r, firebaseAuth)
	RegisterFolderRoutes(r, firebaseAuth)
	RegisterStrategyRoutes(r, firebaseAuth)
	RegisterImageRoutes(r)
}
