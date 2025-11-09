package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"valo-mapper-api/models"

	"firebase.google.com/go/v4/auth"
)

type CreateStrategyRequest struct {
	FolderID  *int   `json:"folderId,omitempty"`
	LobbyCode string `json:"lobbyCode"`
	Name      string `json:"name"`
}

type UpdateStrategyRequest struct {
	FolderID *int    `json:"folderId,omitempty"`
	Name     *string `json:"name,omitempty"`
}

type StrategyResponse struct {
	ID            int       `json:"id"`
	UserID        int       `json:"userId"`
	FolderID      *int      `json:"folderId"`
	Name          string    `json:"name"`
	SelectedMapID string    `json:"selectedMapId"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

func NewStrategyResponse(strategy *models.Strategy, lobby *models.Lobby) *StrategyResponse {
	return &StrategyResponse{
		UserID:        strategy.UserID,
		FolderID:      strategy.FolderID,
		Name:          strategy.Name,
		SelectedMapID: lobby.SelectedMapId,
		UpdatedAt:     lobby.UpdatedAt,
	}
}

func CreateStrategy(w http.ResponseWriter, r *http.Request, firebaseAuth *auth.Client) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var req CreateStrategyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if req.LobbyCode == "" {
		http.Error(w, "Lobby code is required", http.StatusBadRequest)
		return
	}
	if req.Name == "" {
		http.Error(w, "Strategy name is required", http.StatusBadRequest)
		return
	}

	lobby, err := models.GetLobbyByCode(req.LobbyCode)
	if err != nil {
		http.Error(w, "Error retrieving lobby: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if lobby == nil {
		http.Error(w, "Lobby not found", http.StatusNotFound)
		return
	}

	strategy := &models.Strategy{
		UserID:    user.ID,
		FolderID:  req.FolderID,
		LobbyCode: req.LobbyCode,
		Name:      req.Name,
	}

	if err := strategy.Save(); err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			http.Error(w, "You have already saved this lobby", http.StatusConflict)
			return
		}
		http.Error(w, "Error creating strategy: "+err.Error(), http.StatusInternalServerError)
		return
	}

	response := NewStrategyResponse(strategy, lobby)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func GetStrategies(w http.ResponseWriter, r *http.Request, firebaseAuth *auth.Client) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	folderIDStr := r.URL.Query().Get("folderId")
	var folderID *int
	if folderIDStr != "" {
		id, err := strconv.Atoi(folderIDStr)
		if err != nil {
			http.Error(w, "Invalid folder ID", http.StatusBadRequest)
			return
		}
		folderID = &id
	}

	var strategies []models.Strategy
	if folderID != nil {
		strategies, err = models.GetStrategiesByFolderID(user.ID, *folderID)
	} else {
		strategies, err = models.GetStrategiesByUserID(user.ID)
	}

	if err != nil {
		http.Error(w, "Error retrieving strategies: "+err.Error(), http.StatusInternalServerError)
		return
	}

	lobbyCodes := make([]string, 0, len(strategies))
	for _, s := range strategies {
		lobbyCodes = append(lobbyCodes, s.LobbyCode)
	}

	lobbies, err := models.GetLobbiesByCodes(lobbyCodes)
	if err != nil {
		http.Error(w, "Error retrieving lobbies: "+err.Error(), http.StatusInternalServerError)
		return
	}

	lobbyMap := make(map[string]*models.Lobby)
	for i := range lobbies {
		lobbyMap[lobbies[i].Code] = &lobbies[i]
	}

	var responses []*StrategyResponse
	for _, s := range strategies {
		lobby, exists := lobbyMap[s.LobbyCode]
		if !exists || lobby == nil {
			http.Error(w, "Lobby not found", http.StatusNotFound)
			return
		}
		responses = append(responses, NewStrategyResponse(&s, lobby))
	}

	if responses == nil {
		responses = []*StrategyResponse{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(responses)
}

func GetStrategy(w http.ResponseWriter, r *http.Request, firebaseAuth *auth.Client) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	path := r.URL.Path
	idStr := strings.TrimPrefix(path, "/api/strategies/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid strategy ID", http.StatusBadRequest)
		return
	}

	strategy, err := models.GetStrategyByID(id)
	if err != nil {
		http.Error(w, "Error retrieving strategy: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if strategy == nil {
		http.Error(w, "Strategy not found", http.StatusNotFound)
		return
	}

	if strategy.UserID != user.ID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	lobby, err := models.GetLobbyByCode(strategy.LobbyCode)
	if err != nil {
		http.Error(w, "Error retrieving lobby: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if lobby == nil {
		http.Error(w, "Lobby not found", http.StatusNotFound)
		return
	}

	response := NewStrategyResponse(strategy, lobby)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func UpdateStrategy(w http.ResponseWriter, r *http.Request, firebaseAuth *auth.Client) {
	if r.Method != http.MethodPatch {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	path := r.URL.Path
	idStr := strings.TrimPrefix(path, "/api/strategies/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid strategy ID", http.StatusBadRequest)
		return
	}

	var req UpdateStrategyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	strategy, err := models.GetStrategyByID(id)
	if err != nil {
		http.Error(w, "Error retrieving strategy: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if strategy == nil {
		http.Error(w, "Strategy not found", http.StatusNotFound)
		return
	}

	if strategy.UserID != user.ID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	if req.Name != nil {
		strategy.Name = *req.Name
	}
	if req.FolderID != nil {
		strategy.FolderID = req.FolderID
	}

	if err := strategy.Update(); err != nil {
		http.Error(w, "Error updating strategy: "+err.Error(), http.StatusInternalServerError)
		return
	}

	lobby, err := models.GetLobbyByCode(strategy.LobbyCode)
	if err != nil {
		http.Error(w, "Error retrieving lobby: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if lobby == nil {
		http.Error(w, "Lobby not found", http.StatusNotFound)
		return
	}

	response := NewStrategyResponse(strategy, lobby)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func DeleteStrategy(w http.ResponseWriter, r *http.Request, firebaseAuth *auth.Client) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	path := r.URL.Path
	idStr := strings.TrimPrefix(path, "/api/strategies/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid strategy ID", http.StatusBadRequest)
		return
	}

	strategy, err := models.GetStrategyByID(id)
	if err != nil {
		http.Error(w, "Error retrieving strategy: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if strategy == nil {
		http.Error(w, "Strategy not found", http.StatusNotFound)
		return
	}

	if strategy.UserID != user.ID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	if err := strategy.Delete(); err != nil {
		http.Error(w, "Error deleting strategy: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
