package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"
	"valo-mapper-api/models"
)

func CreateLobby(w http.ResponseWriter, r *http.Request) {
	var err error

	defaultMap, err := models.GetMapById("ascent")
	if err != nil {
		http.Error(w, "Error getting default map: "+err.Error(), http.StatusInternalServerError)
		return
	}

	lobby := &models.Lobby{
		CreatedAt: time.Now(),
		CanvasState: &models.FullCanvasState{
			SelectedMap:       *defaultMap,
			MapSide:           "defense",
			CurrentPhaseIndex: 0,
			AgentsOnCanvas:    []models.CanvasAgent{},
			AbilitiesOnCanvas: []models.CanvasAbility{},
			DrawLines:         []models.CanvasDrawLine{},
			TextsOnCanvas:     []models.CanvasText{},
			ImagesOnCanvas:    []models.CanvasImage{},
			ToolIconsOnCanvas: []models.CanvasToolIcon{},
		},
	}

	for {
		lobby.Code = models.GenerateLobbyCode()
		err = lobby.Save()
		if err == nil {
			break
		}
		if !strings.Contains(err.Error(), "duplicate key") {
			http.Error(w, "Error creating lobby: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lobby)
}

func GetLobby(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	path := r.URL.Path
	code := strings.TrimPrefix(path, "/api/lobbies/")

	lobby, err := models.GetLobbyByCode(code)
	if err != nil {
		http.Error(w, "Error retrieving lobby: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if lobby == nil {
		http.Error(w, "Lobby not found", http.StatusNotFound)
		return
	}

	mapDetails, err := models.GetMapById(lobby.CanvasState.SelectedMap.ID)
	if err != nil {
		http.Error(w, "Error retrieving map details: "+err.Error(), http.StatusInternalServerError)
		return
	}

	state := &models.FullCanvasState{
		SelectedMap:       *mapDetails,
		MapSide:           lobby.CanvasState.MapSide,
		CurrentPhaseIndex: lobby.CanvasState.CurrentPhaseIndex,
		AgentsOnCanvas:    []models.CanvasAgent{},
		AbilitiesOnCanvas: []models.CanvasAbility{},
		DrawLines:         []models.CanvasDrawLine{},
		TextsOnCanvas:     []models.CanvasText{},
		ImagesOnCanvas:    []models.CanvasImage{},
		ToolIconsOnCanvas: []models.CanvasToolIcon{},
	}

	err = models.GetCanvasStateDetails(code, lobby.CanvasState.CurrentPhaseIndex, state)
	if err != nil {
		http.Error(w, "Error retrieving canvas state: "+err.Error(), http.StatusInternalServerError)
		return
	}
	lobby.CanvasState = state

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lobby)
}

type UpdateLobbyRequest struct {
	CanvasState *models.FullCanvasState `json:"canvasState"`
}

func UpdateLobby(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	path := r.URL.Path
	code := strings.TrimPrefix(path, "/api/lobbies/")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Error reading request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var req UpdateLobbyRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	existingLobby, err := models.GetLobbyByCode(code)
	if err != nil {
		http.Error(w, "Error retrieving lobby: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if existingLobby == nil {
		http.Error(w, "Lobby not found", http.StatusNotFound)
		return
	}

	if err := models.SaveCanvasState(code, *req.CanvasState); err != nil {
		http.Error(w, "Error updating canvas state: "+err.Error(), http.StatusInternalServerError)
		return
	}

	mapDetails, err := models.GetMapById(req.CanvasState.SelectedMap.ID)
	if err != nil {
		http.Error(w, "Error retrieving map details: "+err.Error(), http.StatusInternalServerError)
		return
	}

	state := &models.FullCanvasState{
		SelectedMap:       *mapDetails,
		MapSide:           req.CanvasState.MapSide,
		CurrentPhaseIndex: req.CanvasState.CurrentPhaseIndex,
		AgentsOnCanvas:    []models.CanvasAgent{},
		AbilitiesOnCanvas: []models.CanvasAbility{},
		DrawLines:         []models.CanvasDrawLine{},
		TextsOnCanvas:     []models.CanvasText{},
		ImagesOnCanvas:    []models.CanvasImage{},
		ToolIconsOnCanvas: []models.CanvasToolIcon{},
	}

	err = models.GetCanvasStateDetails(code, req.CanvasState.CurrentPhaseIndex, state)
	if err != nil {
		http.Error(w, "Error retrieving canvas state: "+err.Error(), http.StatusInternalServerError)
		return
	}

	lobby := &models.Lobby{
		Code:        code,
		CreatedAt:   existingLobby.CreatedAt,
		CanvasState: state,
	}

	if err := lobby.Save(); err != nil {
		http.Error(w, "Error updating lobby: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lobby)
}
