package websocket

import (
	"log"
	"net/http"
	"slices"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		allowedOrigins := []string{
			"https://valomapper.fly.dev",
			"http://localhost:3000",
			"http://localhost:3001",
		}

		return slices.Contains(allowedOrigins, origin)
	},
}

func HandleWebSocket(hub *Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		lobbyCode := vars["code"]

		if lobbyCode == "" {
			http.Error(w, "Lobby code is required", http.StatusBadRequest)
			return
		}

		username := r.URL.Query().Get("username")
		if username == "" {
			username = "Anonymous"
		}

		color := r.URL.Query().Get("color")
		if color == "" {
			color = hub.generateUniqueColor(lobbyCode)
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("WebSocket upgrade error: %v", err)
			return
		}

		client := NewClient(hub, conn, lobbyCode, username, color)

		hub.register <- client

		go client.WritePump()
		go client.ReadPump()
	}
}

var colorPalette = []string{
	"#FF6B6B", // Red
	"#4ECDC4", // Teal
	"#45B7D1", // Blue
	"#96CEB4", // Green
	"#FFEAA7", // Yellow
	"#DDA0DD", // Plum
	"#98D8C8", // Mint
	"#F7DC6F", // Gold
	"#BB8FCE", // Purple
	"#85C1E9", // Light Blue
}
