package handlers

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"valo-mapper-api/middleware"
	"valo-mapper-api/services"
	"valo-mapper-api/utils"

	"github.com/gorilla/mux"
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
// @Param start query int false "Zero-based starting index for the preview page" minimum(0) default(0)
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
	start := 0
	if rawStart := r.URL.Query().Get("start"); rawStart != "" {
		parsedStart, parseErr := strconv.Atoi(rawStart)
		if parseErr != nil || parsedStart < 0 {
			utils.SendJSONError(w, utils.NewBadRequest("start must be a non-negative integer"), requestID)
			return
		}
		start = parsedStart
	}
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

	matchPage, err := h.matchService.GetRecentMatchPreviewPage(r.Context(), user, start, limit)
	if err != nil {
		slog.Error("failed to load match previews", "request_id", requestID, "user_id", user.ID, "start", start, "limit", limit, "error", err)
		switch {
		case errors.Is(err, services.ErrRSOUserRequired):
			utils.SendJSONError(w, utils.NewForbidden("RSO login required"), requestID)
		case errors.Is(err, services.ErrPUUIDUnavailable):
			utils.SendJSONError(w, utils.NewForbidden("RSO account is missing a PUUID"), requestID)
		case errors.Is(err, services.ErrRiotAPIKeyMissing):
			utils.SendJSONError(w, utils.NewInternal("Matches integration is not configured", err), requestID)
		default:
			utils.SendJSONError(w, utils.NewInternal("Unable to fetch match history", err), requestID)
		}
		return
	}

	utils.SendJSON(w, http.StatusOK, matchPage, requestID)
}

// GetMatchSummary godoc
// @Summary Get match summary with round details
// @Description Returns a match summary with round-by-round details and event logs for the authenticated user.
// @Tags matches
// @Produce json
// @Param matchId path string true "Match ID"
// @Success 200 {object} MatchSummaryResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/matches/{matchId}/summary [get]
func (h *MatchHandler) GetMatchSummary(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
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

	matchID := mux.Vars(r)["matchId"]
	if matchID == "" {
		utils.SendJSONError(w, utils.NewBadRequest("matchId is required"), requestID)
		return
	}

	summary, err := h.matchService.GetMatchSummary(r.Context(), user, matchID)
	if err != nil {
		slog.Error("failed to load match summary", "request_id", requestID, "user_id", user.ID, "match_id", matchID, "error", err)
		switch {
		case errors.Is(err, services.ErrRSOUserRequired):
			utils.SendJSONError(w, utils.NewForbidden("RSO login required"), requestID)
		case errors.Is(err, services.ErrRiotAPIKeyMissing):
			utils.SendJSONError(w, utils.NewInternal("Matches integration is not configured", err), requestID)
		case errors.Is(err, services.ErrMatchNotFound):
			utils.SendJSONError(w, utils.NewNotFound("Match not found"), requestID)
		default:
			utils.SendJSONError(w, utils.NewInternal("Unable to fetch match summary", err), requestID)
		}
		return
	}

	utils.SendJSON(w, http.StatusOK, summary, requestID)
}
