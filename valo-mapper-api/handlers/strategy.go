package handlers

import (
	"encoding/json"
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
	FolderID    *int      `json:"folderId,omitempty"`
	HasFolderID bool      `json:"-"`
	Name        *string   `json:"name,omitempty"`
	Tags        *[]string `json:"tags,omitempty"`
	HasTags     bool      `json:"-"`
	IsFavorite  *bool     `json:"isFavorite,omitempty"`
}

type StrategyResponse struct {
	ID            int       `json:"id"`
	UserID        int       `json:"userId"`
	FolderID      *int      `json:"folderId"`
	Name          string    `json:"name"`
	SelectedMapID string    `json:"selectedMapId"`
	MapSide       string    `json:"mapSide"`
	Tags          []string  `json:"tags"`
	IsFavorite    bool      `json:"isFavorite"`
	LobbyCode     string    `json:"lobbyCode"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

func newStrategyResponseFromService(strategy *services.StrategyResponse) *StrategyResponse {
	tags := strategy.Tags
	if tags == nil {
		tags = []string{}
	}

	return &StrategyResponse{
		ID:            strategy.ID,
		UserID:        strategy.UserID,
		FolderID:      strategy.FolderID,
		Name:          strategy.Name,
		SelectedMapID: strategy.SelectedMapID,
		MapSide:       strategy.MapSide,
		Tags:          tags,
		IsFavorite:    strategy.IsFavorite,
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
func CreateStrategy(w http.ResponseWriter, r *http.Request) {
	user, err := currentUser(r)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	var req CreateStrategyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
		return
	}
	defer func() { _ = r.Body.Close() }()
	response, err := strategyService.CreateStrategy(user, services.CreateStrategyRequest{
		FolderID:  req.FolderID,
		LobbyCode: req.LobbyCode,
		Name:      req.Name,
	})
	if err != nil {
		sendServiceError(w, r, err, "Unable to create strategy")
		return
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
func GetStrategies(w http.ResponseWriter, r *http.Request) {
	user, err := currentUser(r)
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
	strategies, err := strategyService.GetStrategies(user.ID, folderID)
	if err != nil {
		sendServiceError(w, r, err, "Unable to retrieve strategies")
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
func UpdateStrategy(w http.ResponseWriter, r *http.Request) {
	user, err := currentUser(r)
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
	defer func() { _ = r.Body.Close() }()

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

	if rawTags, ok := rawReq["tags"]; ok {
		req.HasTags = true
		var tags []string
		if err := json.Unmarshal(rawTags, &tags); err != nil {
			utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
			return
		}
		req.Tags = &tags
	}

	if rawFavorite, ok := rawReq["isFavorite"]; ok {
		var isFavorite bool
		if err := json.Unmarshal(rawFavorite, &isFavorite); err != nil {
			utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
			return
		}
		req.IsFavorite = &isFavorite
	}

	response, err := strategyService.UpdateStrategy(user, id, services.UpdateStrategyRequest{
		FolderID:    req.FolderID,
		HasFolderID: req.HasFolderID,
		Name:        req.Name,
		Tags:        req.Tags,
		HasTags:     req.HasTags,
		IsFavorite:  req.IsFavorite,
	})
	if err != nil {
		sendServiceError(w, r, err, "Unable to update strategy")
		return
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
func DeleteStrategy(w http.ResponseWriter, r *http.Request) {
	user, err := currentUser(r)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	id, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid strategy ID"), middleware.GetRequestID(r))
		return
	}
	if err := strategyService.DeleteStrategy(user, id); err != nil {
		sendServiceError(w, r, err, "Unable to delete strategy")
		return
	}

	w.Header().Set("X-Request-ID", middleware.GetRequestID(r))
	w.WriteHeader(http.StatusNoContent)
}
