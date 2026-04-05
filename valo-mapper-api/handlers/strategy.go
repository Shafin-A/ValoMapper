package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"valo-mapper-api/middleware"
	"valo-mapper-api/services"
	"valo-mapper-api/utils"

	"github.com/gorilla/mux"
)

type CreateStrategyRequest struct {
	FolderID  *int   `json:"folderId,omitempty"`
	LobbyCode string `json:"lobbyCode"`
	Name      string `json:"name"`
}

type UpdateStrategyRequest struct {
	FolderID    *int    `json:"folderId,omitempty"`
	HasFolderID bool    `json:"-"`
	Name        *string `json:"name,omitempty"`
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

func newStrategyResponseFromService(strategy *services.StrategyResponse) *StrategyResponse {
	return &StrategyResponse{
		ID:            strategy.ID,
		UserID:        strategy.UserID,
		FolderID:      strategy.FolderID,
		Name:          strategy.Name,
		SelectedMapID: strategy.SelectedMapID,
		LobbyCode:     strategy.LobbyCode,
		UpdatedAt:     strategy.UpdatedAt,
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

	strategyService := services.NewStrategyService(services.StrategyServiceDependencies{})
	response, err := strategyService.CreateStrategy(user, services.CreateStrategyRequest{
		FolderID:  req.FolderID,
		LobbyCode: req.LobbyCode,
		Name:      req.Name,
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrLobbyCodeRequired):
			utils.SendJSONError(w, utils.NewBadRequest("Lobby code is required"), middleware.GetRequestID(r))
			return
		case errors.Is(err, services.ErrStrategyNameRequired):
			utils.SendJSONError(w, utils.NewBadRequest("Strategy name is required"), middleware.GetRequestID(r))
			return
		case errors.Is(err, services.ErrStrategyLobbyNotFound):
			utils.SendJSONError(w, utils.NewNotFound("Lobby not found"), middleware.GetRequestID(r))
			return
		case errors.Is(err, services.ErrStrategyFreePlanLimit):
			utils.SendJSONError(w, utils.NewForbidden("Free plan limit reached (3 saved strategies). Upgrade to ValoMapper Premium for unlimited saves."), middleware.GetRequestID(r))
			return
		case errors.Is(err, services.ErrStrategyAlreadySaved):
			utils.SendJSONError(w, utils.NewConflict("You have already saved this lobby", err), middleware.GetRequestID(r))
			return
		default:
			utils.SendJSONError(w, utils.NewInternal("Unable to create strategy", err), middleware.GetRequestID(r))
			return
		}
	}

	utils.SendJSON(w, http.StatusCreated, newStrategyResponseFromService(response), middleware.GetRequestID(r))
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

	strategyService := services.NewStrategyService(services.StrategyServiceDependencies{})
	strategies, err := strategyService.GetStrategies(user.ID, folderID)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to retrieve strategies", err), middleware.GetRequestID(r))
		return
	}

	responses := make([]*StrategyResponse, 0, len(strategies))
	for _, strategy := range strategies {
		responses = append(responses, newStrategyResponseFromService(strategy))
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
	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	id, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid strategy ID"), middleware.GetRequestID(r))
		return
	}

	var rawReq map[string]json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&rawReq); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
		return
	}
	defer r.Body.Close()

	req := UpdateStrategyRequest{}

	if rawName, ok := rawReq["name"]; ok {
		var name *string
		if err := json.Unmarshal(rawName, &name); err != nil {
			utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
			return
		}
		req.Name = name
	}

	if rawFolderID, ok := rawReq["folderId"]; ok {
		req.HasFolderID = true
		var folderID *int
		if err := json.Unmarshal(rawFolderID, &folderID); err != nil {
			utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
			return
		}
		req.FolderID = folderID
	}

	strategyService := services.NewStrategyService(services.StrategyServiceDependencies{})
	response, err := strategyService.UpdateStrategy(user, id, services.UpdateStrategyRequest{
		FolderID:    req.FolderID,
		HasFolderID: req.HasFolderID,
		Name:        req.Name,
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrStrategyNotFound):
			utils.SendJSONError(w, utils.NewNotFound("Strategy not found"), middleware.GetRequestID(r))
			return
		case errors.Is(err, services.ErrStrategyAccessDenied):
			utils.SendJSONError(w, utils.NewForbidden("You do not have access to this strategy"), middleware.GetRequestID(r))
			return
		case errors.Is(err, services.ErrStrategyLobbyNotFound):
			utils.SendJSONError(w, utils.NewNotFound("Lobby not found"), middleware.GetRequestID(r))
			return
		default:
			utils.SendJSONError(w, utils.NewInternal("Unable to update strategy", err), middleware.GetRequestID(r))
			return
		}
	}

	utils.SendJSON(w, http.StatusOK, newStrategyResponseFromService(response), middleware.GetRequestID(r))
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
	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	id, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid strategy ID"), middleware.GetRequestID(r))
		return
	}

	strategyService := services.NewStrategyService(services.StrategyServiceDependencies{})
	if err := strategyService.DeleteStrategy(user, id); err != nil {
		switch {
		case errors.Is(err, services.ErrStrategyNotFound):
			utils.SendJSONError(w, utils.NewNotFound("Strategy not found"), middleware.GetRequestID(r))
			return
		case errors.Is(err, services.ErrStrategyAccessDenied):
			utils.SendJSONError(w, utils.NewForbidden("You do not have access to this strategy"), middleware.GetRequestID(r))
			return
		default:
			utils.SendJSONError(w, utils.NewInternal("Unable to delete strategy", err), middleware.GetRequestID(r))
			return
		}
	}

	w.Header().Set("X-Request-ID", middleware.GetRequestID(r))
	w.WriteHeader(http.StatusNoContent)
}

