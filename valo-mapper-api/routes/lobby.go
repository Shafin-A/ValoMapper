package routes

import (
	"net/http"
	"valo-mapper-api/handlers"
	"valo-mapper-api/middleware"
	"valo-mapper-api/websocket"

	"github.com/gorilla/mux"
	"golang.org/x/time/rate"
)

func RegisterLobbyRoutes(r *mux.Router, hub *websocket.Hub) {
	createLobby := middleware.RouteRateLimitMiddleware(
		middleware.NewIPRateLimiter(rate.Every(lobbyCreateInterval), lobbyCreateBurst),
		"Too many lobbies created. Please wait a moment and try again.",
		lobbyCreateInterval,
	)(http.HandlerFunc(handlers.CreateLobby))

	r.Handle("/api/lobbies", createLobby).Methods("POST")
	r.HandleFunc("/api/lobbies/{code}", handlers.GetLobby).Methods("GET")
	r.HandleFunc("/api/lobbies/{code}", handlers.UpdateLobby).Methods("PATCH")
	r.HandleFunc("/api/lobbies/{code}/canvas-patches", handlers.ApplyCanvasPatch).Methods("POST")

	r.HandleFunc("/ws/lobbies/{code}", websocket.HandleWebSocket(hub))
}
