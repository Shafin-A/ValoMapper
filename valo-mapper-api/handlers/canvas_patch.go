package handlers

import (
	"encoding/json"
	"io"
	"net/http"

	"valo-mapper-api/middleware"
	"valo-mapper-api/models"
	"valo-mapper-api/utils"

	"github.com/gorilla/mux"
)

// ApplyCanvasPatch godoc
// @Summary Apply incremental canvas patch updates
// @Description Applies a batch of canvas patch entries (entity/action/data) for the lobby
// @Tags lobbies
// @Accept json
// @Produce json
// @Param code path string true "Lobby code"
// @Param request body models.CanvasPatch true "Canvas patch request"
// @Success 200 {object} models.Lobby
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/lobbies/{code}/canvas-patches [post]
func ApplyCanvasPatch(w http.ResponseWriter, r *http.Request) {
	code := mux.Vars(r)["code"]

	body, err := io.ReadAll(r.Body)
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Unable to read request body"), middleware.GetRequestID(r))
		return
	}
	defer r.Body.Close()

	var patch models.CanvasPatch
	if err := json.Unmarshal(body, &patch); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
		return
	}

	if len(patch.Entries) == 0 {
		utils.SendJSONError(w, utils.NewBadRequest("Patch entries are required"), middleware.GetRequestID(r))
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

	if err := models.ApplyCanvasPatch(code, patch); err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to apply canvas patch", err), middleware.GetRequestID(r))
		return
	}

	updatedLobby, err := models.GetLobbyByCode(code)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to retrieve lobby after patch", err), middleware.GetRequestID(r))
		return
	}
	if updatedLobby == nil {
		utils.SendJSONError(w, utils.NewNotFound("Lobby not found after patch"), middleware.GetRequestID(r))
		return
	}

	utils.SendJSON(w, http.StatusOK, updatedLobby, middleware.GetRequestID(r))
}
