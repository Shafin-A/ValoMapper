package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"valo-mapper-api/middleware"
	"valo-mapper-api/models"
	"valo-mapper-api/utils"

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
	LobbyCode     string    `json:"lobbyCode"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

func NewStrategyResponse(strategy *models.Strategy, lobby *models.Lobby) *StrategyResponse {
	return &StrategyResponse{
		ID:            strategy.ID,
		UserID:        strategy.UserID,
		FolderID:      strategy.FolderID,
		Name:          strategy.Name,
		SelectedMapID: lobby.SelectedMapId,
		LobbyCode:     lobby.Code,
		UpdatedAt:     lobby.UpdatedAt,
	}
}

func CreateStrategy(w http.ResponseWriter, r *http.Request, firebaseAuth *auth.Client) {
	if r.Method != http.MethodPost {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), middleware.GetRequestID(r))
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	var req CreateStrategyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
		return
	}
	defer r.Body.Close()

	if req.LobbyCode == "" {
		utils.SendJSONError(w, utils.NewBadRequest("Lobby code is required"), middleware.GetRequestID(r))
		return
	}
	if req.Name == "" {
		utils.SendJSONError(w, utils.NewBadRequest("Strategy name is required"), middleware.GetRequestID(r))
		return
	}

	lobby, err := models.GetLobbyByCode(req.LobbyCode)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to retrieve lobby", err), middleware.GetRequestID(r))
		return
	}
	if lobby == nil {
		utils.SendJSONError(w, utils.NewNotFound("Lobby not found"), middleware.GetRequestID(r))
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
			utils.SendJSONError(w, utils.NewConflict("You have already saved this lobby", err), middleware.GetRequestID(r))
			return
		}
		utils.SendJSONError(w, utils.NewInternal("Unable to create strategy", err), middleware.GetRequestID(r))
		return
	}

	response := NewStrategyResponse(strategy, lobby)

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Request-ID", middleware.GetRequestID(r))
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func GetStrategies(w http.ResponseWriter, r *http.Request, firebaseAuth *auth.Client) {
	if r.Method != http.MethodGet {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), middleware.GetRequestID(r))
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	folderIDStr := r.URL.Query().Get("folderId")
	var folderID *int
	if folderIDStr != "" {
		id, err := strconv.Atoi(folderIDStr)
		if err != nil {
			utils.SendJSONError(w, utils.NewBadRequest("Invalid folder ID"), middleware.GetRequestID(r))
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
		utils.SendJSONError(w, utils.NewInternal("Unable to retrieve strategies", err), middleware.GetRequestID(r))
		return
	}

	lobbyCodes := make([]string, 0, len(strategies))
	for _, s := range strategies {
		lobbyCodes = append(lobbyCodes, s.LobbyCode)
	}

	lobbies, err := models.GetLobbiesByCodes(lobbyCodes)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to retrieve lobbies", err), middleware.GetRequestID(r))
		return
	}

	lobbyMap := make(map[string]*models.Lobby)
	for i := range lobbies {
		lobbyMap[lobbies[i].Code] = &lobbies[i]
	}

	var responses []*StrategyResponse
	var missingLobbies []string
	for _, s := range strategies {
		lobby, exists := lobbyMap[s.LobbyCode]
		if !exists || lobby == nil {
			missingLobbies = append(missingLobbies, s.LobbyCode)
			continue
		}
		responses = append(responses, NewStrategyResponse(&s, lobby))
	}

	if len(missingLobbies) > 0 {
		log.Printf("WARNING: Strategies reference missing lobbies: %v", missingLobbies)
	}

	if responses == nil {
		responses = []*StrategyResponse{}
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Request-ID", middleware.GetRequestID(r))
	json.NewEncoder(w).Encode(responses)
}

func UpdateStrategy(w http.ResponseWriter, r *http.Request, firebaseAuth *auth.Client) {
	if r.Method != http.MethodPatch {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), middleware.GetRequestID(r))
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	path := r.URL.Path
	idStr := strings.TrimPrefix(path, "/api/strategies/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid strategy ID"), middleware.GetRequestID(r))
		return
	}

	var req UpdateStrategyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
		return
	}
	defer r.Body.Close()

	strategy, err := models.GetStrategyByID(id)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to retrieve strategy", err), middleware.GetRequestID(r))
		return
	}
	if strategy == nil {
		utils.SendJSONError(w, utils.NewNotFound("Strategy not found"), middleware.GetRequestID(r))
		return
	}

	if strategy.UserID != user.ID {
		utils.SendJSONError(w, utils.NewForbidden("You do not have access to this strategy"), middleware.GetRequestID(r))
		return
	}

	if req.Name != nil {
		strategy.Name = *req.Name
	}
	if req.FolderID != nil {
		strategy.FolderID = req.FolderID
	}

	if err := strategy.Update(); err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to update strategy", err), middleware.GetRequestID(r))
		return
	}

	lobby, err := models.GetLobbyByCode(strategy.LobbyCode)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to retrieve lobby", err), middleware.GetRequestID(r))
		return
	}
	if lobby == nil {
		utils.SendJSONError(w, utils.NewNotFound("Lobby not found"), middleware.GetRequestID(r))
		return
	}

	response := NewStrategyResponse(strategy, lobby)

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Request-ID", middleware.GetRequestID(r))
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func DeleteStrategy(w http.ResponseWriter, r *http.Request, firebaseAuth *auth.Client) {
	if r.Method != http.MethodDelete {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), middleware.GetRequestID(r))
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	path := r.URL.Path
	idStr := strings.TrimPrefix(path, "/api/strategies/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid strategy ID"), middleware.GetRequestID(r))
		return
	}

	strategy, err := models.GetStrategyByID(id)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to retrieve strategy", err), middleware.GetRequestID(r))
		return
	}
	if strategy == nil {
		utils.SendJSONError(w, utils.NewNotFound("Strategy not found"), middleware.GetRequestID(r))
		return
	}

	if strategy.UserID != user.ID {
		utils.SendJSONError(w, utils.NewForbidden("You do not have access to this strategy"), middleware.GetRequestID(r))
		return
	}

	if err := strategy.Delete(); err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to delete strategy", err), middleware.GetRequestID(r))
		return
	}

	w.Header().Set("X-Request-ID", middleware.GetRequestID(r))
	w.WriteHeader(http.StatusNoContent)
}
