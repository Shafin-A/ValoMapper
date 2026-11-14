package websocket

import (
	"log/slog"
	"net/http"
	"strings"
	"sync"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

var (
	allowedOriginsMu sync.RWMutex
	allowedOrigins   = map[string]struct{}{
		"https://valomapper.com":     {},
		"https://www.valomapper.com": {},
		"http://localhost:3000":      {},
		"http://localhost:3001":      {},
	}
)

func ConfigureAllowedOrigins(origins []string) {
	next := make(map[string]struct{}, len(origins))
	for _, origin := range origins {
		if trimmed := strings.TrimSpace(origin); trimmed != "" {
			next[trimmed] = struct{}{}
		}
	}

	allowedOriginsMu.Lock()
	allowedOrigins = next
	allowedOriginsMu.Unlock()
}

func isAllowedOrigin(origin string) bool {
	allowedOriginsMu.RLock()
	_, ok := allowedOrigins[origin]
	allowedOriginsMu.RUnlock()
	return ok
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return isAllowedOrigin(r.Header.Get("Origin"))
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
			slog.Error("websocket upgrade error", "error", err)
			return
		}

		client := NewClient(hub, conn, lobbyCode, username, color)

		// Queue hello before registration so it precedes the user_list broadcast.
		helloMessage, err := (&Message{
			Type: MessageTypeClientHello,
			Data: map[string]any{"clientId": client.id},
		}).Marshal()
		if err != nil {
			slog.Error("error marshaling client hello", "error", err)
		} else {
			client.send <- helloMessage
		}

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
