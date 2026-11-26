package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"valo-mapper-api/middleware"
	"valo-mapper-api/services"
	"valo-mapper-api/utils"

	"github.com/gorilla/mux"
)

type StrategyLibraryResponse struct {
	Items  []*StrategyResponse `json:"items"`
	Total  int                 `json:"total"`
	Limit  int                 `json:"limit"`
	Offset int                 `json:"offset"`
}

type StrategyTagsResponse struct {
	Tags []string `json:"tags"`
}

type BulkUpdateStrategiesResponse struct {
	Updated int64 `json:"updated"`
}

type BulkDeleteStrategiesResponse struct {
	Deleted int64 `json:"deleted"`
}

// GetStrategyLibrary godoc
// @Summary Search and filter strategies
// @Description Returns the authenticated user's strategies with server-side search, tag, favorite, map, and side filters.
// @Tags strategies
// @Produce json
// @Param q query string false "Case-insensitive strategy name search"
// @Param tags query string false "Comma-separated tag filter"
// @Param tagMode query string false "Tag match mode: all or any (default all)"
// @Param favorite query bool false "Only favorites when true"
// @Param mapId query string false "Map ID filter"
// @Param side query string false "Side filter: attack or defense"
// @Param sort query string false "Sort: updated, created, or name (default updated)"
// @Param limit query int false "Page size (default 50, max 100)"
// @Param offset query int false "Page offset"
// @Success 200 {object} StrategyLibraryResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/strategies/library [get]
func GetStrategyLibrary(w http.ResponseWriter, r *http.Request) {
	user, err := currentUser(r)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	req, err := parseStrategyLibraryQuery(r)
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid strategy library filters"), middleware.GetRequestID(r))
		return
	}

	result, err := strategyLibraryService.SearchStrategies(user.ID, req)
	if err != nil {
		sendServiceError(w, r, err, "Unable to search strategies")
		return
	}

	utils.SendJSON(w, http.StatusOK, StrategyLibraryResponse{
		Items:  newStrategyResponsesFromService(result.Strategies),
		Total:  result.Total,
		Limit:  result.Limit,
		Offset: result.Offset,
	}, middleware.GetRequestID(r))
}

// GetStrategyTags godoc
// @Summary List strategy tags
// @Description Returns the distinct tags used by the authenticated user's strategies.
// @Tags strategies
// @Produce json
// @Success 200 {object} StrategyTagsResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/strategies/tags [get]
func GetStrategyTags(w http.ResponseWriter, r *http.Request) {
	user, err := currentUser(r)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	tags, err := strategyLibraryService.GetTags(user.ID)
	if err != nil {
		sendServiceError(w, r, err, "Unable to retrieve strategy tags")
		return
	}
	if tags == nil {
		tags = []string{}
	}

	utils.SendJSON(w, http.StatusOK, StrategyTagsResponse{Tags: tags}, middleware.GetRequestID(r))
}

// DuplicateStrategy godoc
// @Summary Duplicate strategy
// @Description Deep-copies a strategy and its lobby canvas into a new strategy.
// @Tags strategies
// @Produce json
// @Param id path int true "Strategy ID"
// @Success 201 {object} StrategyResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/strategies/{id}/duplicate [post]
func DuplicateStrategy(w http.ResponseWriter, r *http.Request) {
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

	response, err := strategyLibraryService.DuplicateStrategy(user, id)
	if err != nil {
		sendServiceError(w, r, err, "Unable to duplicate strategy")
		return
	}

	utils.SendJSON(w, http.StatusCreated, newStrategyResponseFromService(response), middleware.GetRequestID(r))
}

type BulkUpdateStrategiesRequest struct {
	IDs         []int    `json:"ids"`
	FolderID    *int     `json:"folderId"`
	HasFolderID bool     `json:"-"`
	IsFavorite  *bool    `json:"isFavorite"`
	AddTags     []string `json:"addTags"`
	RemoveTags  []string `json:"removeTags"`
}

// BulkUpdateStrategies godoc
// @Summary Bulk update strategies
// @Description Moves, favorites, and/or changes tags for up to 100 strategies owned by the authenticated user.
// @Tags strategies
// @Accept json
// @Produce json
// @Param request body BulkUpdateStrategiesRequest true "Bulk update request"
// @Success 200 {object} BulkUpdateStrategiesResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/strategies/bulk [patch]
func BulkUpdateStrategies(w http.ResponseWriter, r *http.Request) {
	user, err := currentUser(r)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	var rawReq map[string]json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&rawReq); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
		return
	}
	defer func() { _ = r.Body.Close() }()

	req := BulkUpdateStrategiesRequest{}
	if rawIDs, ok := rawReq["ids"]; ok {
		if err := json.Unmarshal(rawIDs, &req.IDs); err != nil {
			utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
			return
		}
	}
	if rawFolderID, ok := rawReq["folderId"]; ok {
		req.HasFolderID = true
		if err := json.Unmarshal(rawFolderID, &req.FolderID); err != nil {
			utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
			return
		}
	}
	if rawFavorite, ok := rawReq["isFavorite"]; ok {
		if err := json.Unmarshal(rawFavorite, &req.IsFavorite); err != nil {
			utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
			return
		}
	}
	if rawAddTags, ok := rawReq["addTags"]; ok {
		if err := json.Unmarshal(rawAddTags, &req.AddTags); err != nil {
			utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
			return
		}
	}
	if rawRemoveTags, ok := rawReq["removeTags"]; ok {
		if err := json.Unmarshal(rawRemoveTags, &req.RemoveTags); err != nil {
			utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
			return
		}
	}

	updated, err := strategyLibraryService.BulkUpdate(user, services.BulkUpdateStrategiesRequest{
		IDs:         req.IDs,
		FolderID:    req.FolderID,
		HasFolderID: req.HasFolderID,
		IsFavorite:  req.IsFavorite,
		AddTags:     req.AddTags,
		RemoveTags:  req.RemoveTags,
	})
	if err != nil {
		sendServiceError(w, r, err, "Unable to update strategies")
		return
	}

	utils.SendJSON(w, http.StatusOK, BulkUpdateStrategiesResponse{Updated: updated}, middleware.GetRequestID(r))
}

type BulkDeleteStrategiesRequest struct {
	IDs []int `json:"ids"`
}

// BulkDeleteStrategies godoc
// @Summary Bulk delete strategies
// @Description Deletes up to 100 strategies owned by the authenticated user.
// @Tags strategies
// @Accept json
// @Produce json
// @Param request body BulkDeleteStrategiesRequest true "Bulk delete request"
// @Success 200 {object} BulkDeleteStrategiesResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/strategies/bulk-delete [post]
func BulkDeleteStrategies(w http.ResponseWriter, r *http.Request) {
	user, err := currentUser(r)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	var req BulkDeleteStrategiesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
		return
	}
	defer func() { _ = r.Body.Close() }()

	deleted, err := strategyLibraryService.BulkDelete(user, req.IDs)
	if err != nil {
		sendServiceError(w, r, err, "Unable to delete strategies")
		return
	}

	utils.SendJSON(w, http.StatusOK, BulkDeleteStrategiesResponse{Deleted: deleted}, middleware.GetRequestID(r))
}

func newStrategyResponsesFromService(strategies []*services.StrategyResponse) []*StrategyResponse {
	responses := make([]*StrategyResponse, 0, len(strategies))
	for _, strategy := range strategies {
		responses = append(responses, newStrategyResponseFromService(strategy))
	}
	return responses
}

func parseStrategyLibraryQuery(r *http.Request) (services.SearchStrategiesRequest, error) {
	query := r.URL.Query()
	req := services.SearchStrategiesRequest{
		Query:   query.Get("q"),
		TagMode: query.Get("tagMode"),
		MapID:   query.Get("mapId"),
		Side:    query.Get("side"),
		Sort:    query.Get("sort"),
	}

	for _, value := range query["tags"] {
		for _, tag := range strings.Split(value, ",") {
			if trimmed := strings.TrimSpace(tag); trimmed != "" {
				req.Tags = append(req.Tags, trimmed)
			}
		}
	}

	if rawFavorite := query.Get("favorite"); rawFavorite != "" {
		isFavorite, err := strconv.ParseBool(rawFavorite)
		if err != nil {
			return req, err
		}
		req.Favorite = &isFavorite
	}

	if rawLimit := query.Get("limit"); rawLimit != "" {
		limit, err := strconv.Atoi(rawLimit)
		if err != nil {
			return req, err
		}
		req.Limit = limit
	}

	if rawOffset := query.Get("offset"); rawOffset != "" {
		offset, err := strconv.Atoi(rawOffset)
		if err != nil {
			return req, err
		}
		req.Offset = offset
	}

	return req, nil
}
