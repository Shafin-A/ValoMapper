package routes

import (
	"valo-mapper-api/handlers"
	"valo-mapper-api/websocket"

	"github.com/gorilla/mux"
)

func RegisterLobbyRoutes(r *mux.Router, hub *websocket.Hub) {
	r.HandleFunc("/api/lobbies", handlers.CreateLobby).Methods("POST")
	r.HandleFunc("/api/lobbies/{code}", handlers.GetLobby).Methods("GET")
	r.HandleFunc("/api/lobbies/{code}", handlers.UpdateLobby).Methods("PATCH")

	r.HandleFunc("/ws/lobbies/{code}", websocket.HandleWebSocket(hub))
}
