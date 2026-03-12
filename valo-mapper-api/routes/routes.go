package routes

import (
	"valo-mapper-api/websocket"

	"firebase.google.com/go/v4/auth"
	"github.com/gorilla/mux"
)

func SetupRoutes(r *mux.Router, firebaseAuth *auth.Client, hub *websocket.Hub) {
	RegisterHealthRoutes(r)
	RegisterAuthRoutes(r, firebaseAuth)
	RegisterBillingRoutes(r)
	RegisterLobbyRoutes(r, hub)
	RegisterUserRoutes(r, firebaseAuth)
	RegisterFolderRoutes(r, firebaseAuth)
	RegisterStrategyRoutes(r, firebaseAuth)
}
