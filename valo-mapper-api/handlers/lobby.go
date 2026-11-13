package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"valo-mapper-api/middleware"
	"valo-mapper-api/models"
	"valo-mapper-api/utils"

	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/gorilla/mux"
)

type CreateLobbyRequest struct {
	CanvasState *models.FullCanvasState `json:"canvasState"`
}

// CreateLobby godoc
// @Summary Create lobby
// @Description Creates a new lobby initialized with default map and empty phases, or with a supplied canvas snapshot.
// @Tags lobbies
// @Accept json
// @Produce json
// @Param request body CreateLobbyRequest false "Optional initial canvas state"
// @Success 201 {object} models.Lobby
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/lobbies [post]
func CreateLobby(w http.ResponseWriter, r *http.Request) {
	var err error

	r.Body = http.MaxBytesReader(w, r.Body, 4<<20) // 4 MB
	body, readErr := io.ReadAll(r.Body)
	if readErr != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Unable to read request body"), middleware.GetRequestID(r))
		return
	}
	defer func() { _ = r.Body.Close() }()

	var request CreateLobbyRequest
	if len(strings.TrimSpace(string(body))) > 0 {
		if err := json.Unmarshal(body, &request); err != nil {
			utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
			return
		}
	}

	defaultMap, err := models.GetMapById(models.DefaultMapID)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to initialize lobby with default map", err), middleware.GetRequestID(r))
		return
	}

	emptyPhases := make([]models.PhaseState, 10)
	for i := range 10 {
		emptyPhases[i] = models.PhaseState{
			AgentsOnCanvas:    []models.CanvasAgent{},
			AbilitiesOnCanvas: []models.CanvasAbility{},
			DrawLines:         []models.CanvasDrawLine{},
			ConnectingLines:   []models.CanvasConnectingLine{},
			TextsOnCanvas:     []models.CanvasText{},
			ImagesOnCanvas:    []models.CanvasImage{},
			ToolIconsOnCanvas: []models.CanvasToolIcon{},
		}
	}

	initialState := &models.FullCanvasState{
		SelectedMap:       *defaultMap,
		MapSide:           "defense",
		CurrentPhaseIndex: 0,
		EditedPhases:      []int{0},
		Phases:            emptyPhases,
	}

	if request.CanvasState != nil {
		mapDetails, mapErr := models.GetMapById(request.CanvasState.SelectedMap.ID)
		if mapErr != nil || mapDetails == nil {
			utils.SendJSONError(w, utils.NewBadRequest("Invalid map for initial canvas state"), middleware.GetRequestID(r))
			return
		}

		request.CanvasState.SelectedMap = *mapDetails
		initialState = request.CanvasState
	}

	lobby := &models.Lobby{
		CreatedAt:   time.Now(),
		CanvasState: initialState,
	}

	maxRetries := 5
	for i := range maxRetries {
		lobby.Code = models.GenerateLobbyCode()
		err = lobby.Save()
		if err == nil {
			break
		}
		var pgErr *pgconn.PgError
		if !errors.As(err, &pgErr) || pgErr.Code != pgerrcode.UniqueViolation {
			utils.SendJSONError(w, utils.NewInternal("Unable to create lobby", err), middleware.GetRequestID(r))
			return
		}
		if i == maxRetries-1 {
			utils.SendJSONError(w, utils.NewInternal("Unable to create lobby: max retries exceeded", err), middleware.GetRequestID(r))
			return
		}
	}

	if request.CanvasState != nil {
		if err := models.SaveCanvasState(lobby.Code, *request.CanvasState); err != nil {
			_ = models.DeleteLobby(lobby.Code)
			utils.SendJSONError(w, utils.NewInternal("Unable to seed initial canvas state", err), middleware.GetRequestID(r))
			return
		}
	}

	lobbyCreationsTotal.Add(1)
	utils.SendJSON(w, http.StatusCreated, lobby, middleware.GetRequestID(r))
}

// GetLobby godoc
// @Summary Get lobby
// @Description Retrieves lobby and full canvas phases by lobby code.
// @Tags lobbies
// @Produce json
// @Param code path string true "Lobby code"
// @Success 200 {object} models.Lobby
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/lobbies/{code} [get]
func GetLobby(w http.ResponseWriter, r *http.Request) {
	code := mux.Vars(r)["code"]

	lobby, err := models.GetLobbyByCode(code)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to retrieve lobby", err), middleware.GetRequestID(r))
		return
	}
	if lobby == nil {
		utils.SendJSONError(w, utils.NewNotFound("Lobby not found"), middleware.GetRequestID(r))
		return
	}

	phases, err := models.GetAllCanvasPhases(code)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to retrieve canvas phases", err), middleware.GetRequestID(r))
		return
	}

	lobby.CanvasState.Phases = phases

	utils.SendJSON(w, http.StatusOK, lobby, middleware.GetRequestID(r))
}

type UpdateLobbyRequest struct {
	CanvasState *models.FullCanvasState `json:"canvasState"`
}

// UpdateLobby godoc
// @Summary Update lobby canvas state
// @Description Updates lobby canvas state by lobby code.
// @Tags lobbies
// @Accept json
// @Produce json
// @Param code path string true "Lobby code"
// @Param request body UpdateLobbyRequest true "Canvas update request"
// @Success 200 {object} models.Lobby
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/lobbies/{code} [patch]
func UpdateLobby(w http.ResponseWriter, r *http.Request) {
	code := mux.Vars(r)["code"]

	r.Body = http.MaxBytesReader(w, r.Body, 4<<20) // 4 MB
	body, err := io.ReadAll(r.Body)
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Unable to read request body"), middleware.GetRequestID(r))
		return
	}
	defer func() { _ = r.Body.Close() }()

	var req UpdateLobbyRequest
	if err := json.Unmarshal(body, &req); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
		return
	}

	if req.CanvasState == nil {
		utils.SendJSONError(w, utils.NewBadRequest("Canvas state is required"), middleware.GetRequestID(r))
		return
	}

	existingLobby, err := models.GetLobbyByCode(code)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to retrieve lobby", err), middleware.GetRequestID(r))
		return
	}
	if existingLobby == nil {
		utils.SendJSONError(w, utils.NewNotFound("Lobby not found"), middleware.GetRequestID(r))
		return
	}

	if err := models.SaveCanvasState(code, *req.CanvasState); err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to save canvas state", err), middleware.GetRequestID(r))
		return
	}

	mapDetails, err := models.GetMapById(req.CanvasState.SelectedMap.ID)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to retrieve map details", err), middleware.GetRequestID(r))
		return
	}

	phases, err := models.GetAllCanvasPhases(code)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to retrieve canvas phases", err), middleware.GetRequestID(r))
		return
	}

	state := &models.FullCanvasState{
		SelectedMap:       *mapDetails,
		MapSide:           req.CanvasState.MapSide,
		CurrentPhaseIndex: req.CanvasState.CurrentPhaseIndex,
		EditedPhases:      req.CanvasState.EditedPhases,
		Phases:            phases,
		AgentsSettings:    req.CanvasState.AgentsSettings,
		AbilitiesSettings: req.CanvasState.AbilitiesSettings,
	}

	lobby := &models.Lobby{
		Code:        code,
		CreatedAt:   existingLobby.CreatedAt,
		CanvasState: state,
	}

	if err := lobby.Save(); err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to update lobby", err), middleware.GetRequestID(r))
		return
	}

	utils.SendJSON(w, http.StatusOK, lobby, middleware.GetRequestID(r))
}
