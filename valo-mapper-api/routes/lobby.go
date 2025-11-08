package routes

import (
	"valo-mapper-api/handlers"

	"github.com/gorilla/mux"
)

func RegisterLobbyRoutes(r *mux.Router) {
	r.HandleFunc("/api/lobbies", handlers.CreateLobby).Methods("POST")
	r.HandleFunc("/api/lobbies/{code}", handlers.GetLobby).Methods("GET")
	r.HandleFunc("/api/lobbies/{code}", handlers.UpdateLobby).Methods("PATCH")
}
