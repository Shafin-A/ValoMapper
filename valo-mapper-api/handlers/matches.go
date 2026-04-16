package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"valo-mapper-api/middleware"
	"valo-mapper-api/services"
	"valo-mapper-api/utils"
)

const defaultMatchLimit = 10

type MatchHandlerDependencies struct {
	MatchService *services.MatchService
}

type MatchHandler struct {
	matchService *services.MatchService
}

func NewMatchHandler(deps MatchHandlerDependencies) *MatchHandler {
	if deps.MatchService == nil {
		deps.MatchService = services.NewMatchService()
	}

	return &MatchHandler{
		matchService: deps.MatchService,
	}
}

// GetMatches godoc
// @Summary Get match previews
// @Description Returns recent competitive or unrated Riot match previews for the authenticated RSO user.
// @Tags matches
// @Produce json
// @Param limit query int false "Maximum number of previews to return" minimum(1) maximum(50) default(10)
// @Success 200 {object} MatchPreviewsResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/matches [get]
func (h *MatchHandler) GetMatches(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	requestID := middleware.GetRequestID(r)

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		if errors.Is(err, errMissingAuthorizationHeader) || errors.Is(err, errInvalidOrExpiredToken) {
			utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), requestID)
			return
		}

		utils.SendJSONError(w, utils.NewInternal("Unable to load authenticated user", err), requestID)
		return
	}

	limit := defaultMatchLimit
	if rawLimit := r.URL.Query().Get("limit"); rawLimit != "" {
		parsedLimit, parseErr := strconv.Atoi(rawLimit)
		if parseErr != nil || parsedLimit <= 0 {
			utils.SendJSONError(w, utils.NewBadRequest("limit must be a positive integer"), requestID)
			return
		}
		if parsedLimit > 50 {
			parsedLimit = 50
		}
		limit = parsedLimit
	}

	matches, err := h.matchService.GetRecentMatchPreviews(r.Context(), user, limit)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrRSOUserRequired):
			utils.SendJSONError(w, utils.NewForbidden("RSO login required"), requestID)
		case errors.Is(err, services.ErrPUUIDUnavailable):
			utils.SendJSONError(w, utils.NewForbidden("RSO account is missing a PUUID"), requestID)
		case errors.Is(err, services.ErrRSOTokenUnavailable):
			utils.SendJSONError(w, utils.NewUnauthorized("RSO session expired. Please sign in with Riot again"), requestID)
		default:
			utils.SendJSONError(w, utils.NewInternal("Unable to fetch match history", err), requestID)
		}
		return
	}

	utils.SendJSON(w, http.StatusOK, map[string]any{
		"matches": matches,
	}, requestID)
}
