package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"
	"valo-mapper-api/models"
)

var (
	lobbies = make(map[string]*models.Lobby)
	mu      sync.Mutex
)

func CreateLobby(w http.ResponseWriter, r *http.Request) {
	lobby := &models.Lobby{
		Code:      models.GenerateLobbyCode(),
		CreatedAt: time.Now(),
	}

	mu.Lock()
	defer mu.Unlock()

	for {
		if _, exists := lobbies[lobby.Code]; !exists {
			break
		}
		lobby.Code = models.GenerateLobbyCode()
	}

	lobbies[lobby.Code] = lobby

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(lobby)
}

func GetLobby(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	code := strings.TrimPrefix(path, "/api/lobbies/")

	mu.Lock()
	lobby, exists := lobbies[code]
	mu.Unlock()

	if !exists {
		http.Error(w, "Lobby not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lobby)
}
