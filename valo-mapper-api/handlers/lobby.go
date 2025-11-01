package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
	"valo-mapper-api/models"
)

func CreateLobby(w http.ResponseWriter, r *http.Request) {
	var err error
	lobby := &models.Lobby{
		CreatedAt: time.Now(),
	}

	for {
		lobby.Code = models.GenerateLobbyCode()
		err = lobby.Save()
		if err == nil {
			break
		}

		if strings.Contains(err.Error(), "duplicate key") {
			continue
		}

		http.Error(w, "Error creating lobby", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(lobby)
}

func GetLobby(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	code := strings.TrimPrefix(path, "/api/lobbies/")

	lobby, err := models.GetLobbyByCode(code)
	if err != nil {
		http.Error(w, "Error retrieving lobby", http.StatusInternalServerError)
		return
	}

	if lobby == nil {
		http.Error(w, "Lobby not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lobby)
}
