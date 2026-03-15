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

const freeStrategyLimit = 3

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

// CreateStrategy godoc
// @Summary Create strategy
// @Description Saves a lobby as a strategy for the authenticated user.
// @Tags strategies
// @Accept json
// @Produce json
// @Param request body CreateStrategyRequest true "Create strategy request"
// @Success 201 {object} StrategyResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/strategies [post]
func CreateStrategy(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
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

	if !user.IsSubscribed {
		strategyCount, err := models.CountStrategiesByUserID(user.ID)
		if err != nil {
			utils.SendJSONError(w, utils.NewInternal("Unable to validate strategy limit", err), middleware.GetRequestID(r))
			return
		}
		if strategyCount >= freeStrategyLimit {
			utils.SendJSONError(w, utils.NewForbidden("Free plan limit reached (3 saved strategies). Upgrade to ValoMapper Pro for unlimited saves."), middleware.GetRequestID(r))
			return
		}
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

	utils.SendJSON(w, http.StatusCreated, response, middleware.GetRequestID(r))
}

// GetStrategies godoc
// @Summary List strategies
// @Description Lists strategies for the authenticated user, optionally filtered by folderId.
// @Tags strategies
// @Produce json
// @Param folderId query int false "Folder ID filter"
// @Success 200 {array} StrategyResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/strategies [get]
func GetStrategies(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
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

	utils.SendJSON(w, http.StatusOK, responses, middleware.GetRequestID(r))
}

// UpdateStrategy godoc
// @Summary Update strategy
// @Description Updates strategy name and/or folder assignment.
// @Tags strategies
// @Accept json
// @Produce json
// @Param id path int true "Strategy ID"
// @Param request body UpdateStrategyRequest true "Update strategy request"
// @Success 200 {object} StrategyResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/strategies/{id} [patch]
func UpdateStrategy(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
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

	utils.SendJSON(w, http.StatusOK, response, middleware.GetRequestID(r))
}

// DeleteStrategy godoc
// @Summary Delete strategy
// @Description Deletes a strategy owned by the authenticated user.
// @Tags strategies
// @Param id path int true "Strategy ID"
// @Success 204 {string} string "No Content"
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/strategies/{id} [delete]
func DeleteStrategy(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
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
