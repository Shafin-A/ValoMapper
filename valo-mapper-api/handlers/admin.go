package handlers

import (
	"encoding/json"
	"net/http"

	"valo-mapper-api/middleware"
	"valo-mapper-api/models"
	"valo-mapper-api/utils"
)

type adminLobbiesResponse struct {
	Codes []string `json:"codes"`
	Count int      `json:"count"`
}

// HandleAdminLobbies godoc
// @Summary List lobby codes
// @Description Returns all active lobby codes.
// @Tags admin
// @Produce json
// @Success 200 {object} adminLobbiesResponse
// @Failure 403 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security InternalAPIKey
// @Router /admin/lobbies [get]
func HandleAdminLobbies(w http.ResponseWriter, r *http.Request) {
	codes, err := models.ListLobbyCodes()
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to retrieve lobby codes", err), middleware.GetRequestID(r))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(adminLobbiesResponse{
		Codes: codes,
		Count: len(codes),
	})
}
