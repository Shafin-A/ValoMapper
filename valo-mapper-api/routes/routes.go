package routes

import (
	"firebase.google.com/go/v4/auth"
	"github.com/gorilla/mux"
)

func SetupRoutes(r *mux.Router, firebaseAuth *auth.Client) {
	RegisterHealthRoutes(r)
	RegisterLobbyRoutes(r)
	RegisterUserRoutes(r, firebaseAuth)
	RegisterFolderRoutes(r, firebaseAuth)
	RegisterStrategyRoutes(r, firebaseAuth)
}
