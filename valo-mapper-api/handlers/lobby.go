package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"
	"valo-mapper-api/middleware"
	"valo-mapper-api/models"
	"valo-mapper-api/utils"
)

func CreateLobby(w http.ResponseWriter, r *http.Request) {
	var err error

	defaultMap, err := models.GetMapById("ascent")
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
			TextsOnCanvas:     []models.CanvasText{},
			ImagesOnCanvas:    []models.CanvasImage{},
			ToolIconsOnCanvas: []models.CanvasToolIcon{},
		}
	}

	lobby := &models.Lobby{
		CreatedAt: time.Now(),
		CanvasState: &models.FullCanvasState{
			SelectedMap:       *defaultMap,
			MapSide:           "defense",
			CurrentPhaseIndex: 0,
			EditedPhases:      []int{0},
			Phases:            emptyPhases,
		},
	}

	maxRetries := 5
	for i := range maxRetries {
		lobby.Code = models.GenerateLobbyCode()
		err = lobby.Save()
		if err == nil {
			break
		}
		if !strings.Contains(err.Error(), "duplicate key") {
			utils.SendJSONError(w, utils.NewInternal("Unable to create lobby", err), middleware.GetRequestID(r))
			return
		}
		if i == maxRetries-1 {
			utils.SendJSONError(w, utils.NewInternal("Unable to create lobby: max retries exceeded", err), middleware.GetRequestID(r))
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Request-ID", middleware.GetRequestID(r))
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(lobby)
}

func GetLobby(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), middleware.GetRequestID(r))
		return
	}

	path := r.URL.Path
	code := strings.TrimPrefix(path, "/api/lobbies/")

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

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Request-ID", middleware.GetRequestID(r))
	json.NewEncoder(w).Encode(lobby)
}

type UpdateLobbyRequest struct {
	CanvasState *models.FullCanvasState `json:"canvasState"`
}

func UpdateLobby(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), middleware.GetRequestID(r))
		return
	}

	path := r.URL.Path
	code := strings.TrimPrefix(path, "/api/lobbies/")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Unable to read request body"), middleware.GetRequestID(r))
		return
	}
	defer r.Body.Close()

	var req UpdateLobbyRequest
	if err := json.Unmarshal(body, &req); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
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

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Request-ID", middleware.GetRequestID(r))
	json.NewEncoder(w).Encode(lobby)
}
