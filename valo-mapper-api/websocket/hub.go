package websocket

import (
	"log/slog"
	"math/rand"
	"sync"
)

type Hub struct {
	lobbies map[string]map[*Client]bool

	register chan *Client

	unregister chan *Client

	broadcast chan *LobbyMessage

	stop chan struct{}

	mu sync.RWMutex
}

type LobbyMessage struct {
	LobbyCode string
	Message   []byte
	Sender    *Client
}

func NewHub() *Hub {
	return &Hub{
		lobbies:    make(map[string]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan *LobbyMessage),
		stop:       make(chan struct{}),
	}
}

func (h *Hub) Stop() {
	close(h.stop)
}

func (h *Hub) Run() {
	for {
		select {
		case <-h.stop:
			return
		case client := <-h.register:
			h.mu.Lock()
			if h.lobbies[client.lobbyCode] == nil {
				h.lobbies[client.lobbyCode] = make(map[*Client]bool)
			}
			h.lobbies[client.lobbyCode][client] = true
			clientCount := len(h.lobbies[client.lobbyCode])
			h.mu.Unlock()

			slog.Info("client joined lobby", "client_id", client.id, "lobby_code", client.lobbyCode, "total_clients", clientCount)

			h.broadcastUserList(client.lobbyCode)

		case client := <-h.unregister:
			h.mu.Lock()
			if clients, ok := h.lobbies[client.lobbyCode]; ok {
				if _, ok := clients[client]; ok {
					delete(clients, client)
					close(client.send)

					if len(clients) == 0 {
						delete(h.lobbies, client.lobbyCode)
						slog.Info("lobby closed", "lobby_code", client.lobbyCode)
					} else {
						slog.Info("client left lobby", "client_id", client.id, "lobby_code", client.lobbyCode, "remaining_clients", len(clients))
					}
				}
			}
			h.mu.Unlock()

			h.broadcastUserList(client.lobbyCode)

		case lobbyMsg := <-h.broadcast:
			h.mu.RLock()
			clients := h.lobbies[lobbyMsg.LobbyCode]
			h.mu.RUnlock()

			for client := range clients {
				if client == lobbyMsg.Sender {
					continue
				}

				select {
				case client.send <- lobbyMsg.Message:
				default:
					h.mu.Lock()
					delete(h.lobbies[lobbyMsg.LobbyCode], client)
					close(client.send)
					h.mu.Unlock()
				}
			}
		}
	}
}

func (h *Hub) broadcastUserList(lobbyCode string) {
	h.mu.RLock()
	clients := h.lobbies[lobbyCode]
	users := make([]UserPresence, 0, len(clients))
	for client := range clients {
		users = append(users, UserPresence{
			ID:       client.id,
			Username: client.username,
			Color:    client.color,
		})
	}
	h.mu.RUnlock()

	if len(users) == 0 {
		return
	}

	msg := Message{
		Type: MessageTypeUserList,
		Data: map[string]any{
			"users": users,
		},
	}

	msgBytes, err := msg.Marshal()
	if err != nil {
		slog.Error("error marshaling user list", "error", err)
		return
	}

	h.mu.RLock()
	for client := range clients {
		select {
		case client.send <- msgBytes:
		default:
		}
	}
	h.mu.RUnlock()
}

func (h *Hub) GetLobbyClients(lobbyCode string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.lobbies[lobbyCode])
}

func (h *Hub) generateUniqueColor(lobbyCode string) string {
	h.mu.RLock()
	clients := h.lobbies[lobbyCode]

	usedColors := make(map[string]bool)
	for client := range clients {
		usedColors[client.color] = true
	}
	h.mu.RUnlock()

	for _, color := range colorPalette {
		if !usedColors[color] {
			return color
		}
	}

	return colorPalette[rand.Intn(len(colorPalette))]
}
