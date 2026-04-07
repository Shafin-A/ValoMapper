package handlers

import (
	"crypto/subtle"
	"encoding/json"
	"net/http"
	"os"

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
	configuredKey := os.Getenv("INTERNAL_API_KEY")
	if configuredKey == "" {
		utils.SendJSONError(w, utils.NewInternal("Internal API key is not configured", nil), middleware.GetRequestID(r))
		return
	}

	providedKey := r.Header.Get("X-Internal-API-Key")
	if subtle.ConstantTimeCompare([]byte(providedKey), []byte(configuredKey)) != 1 {
		utils.SendJSONError(w, utils.NewForbidden("Forbidden"), middleware.GetRequestID(r))
		return
	}

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
