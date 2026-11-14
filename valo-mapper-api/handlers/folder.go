package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"valo-mapper-api/middleware"
	"valo-mapper-api/services"
	"valo-mapper-api/utils"

	"github.com/gorilla/mux"
	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5/pgconn"
)

type CreateFolderRequest struct {
	Name           string `json:"name"`
	ParentFolderID *int   `json:"parentFolderId,omitempty"`
}

type UpdateFolderRequest struct {
	Name           *string `json:"name,omitempty"`
	ParentFolderID *int    `json:"parentFolderId,omitempty"`
}

// CreateFolder godoc
// @Summary Create folder
// @Description Creates a folder for the authenticated user.
// @Tags folders
// @Accept json
// @Produce json
// @Param request body CreateFolderRequest true "Create folder request"
// @Success 201 {object} models.Folder
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/folders [post]
func CreateFolder(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	var req CreateFolderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
		return
	}
	defer func() { _ = r.Body.Close() }()
	folder, err := folderService.CreateFolder(user, services.CreateFolderRequest{
		Name:           req.Name,
		ParentFolderID: req.ParentFolderID,
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.UniqueViolation {
			utils.SendJSONError(w, utils.NewConflict("Folder name already exists", err), middleware.GetRequestID(r))
			return
		}

		sendServiceError(w, r, err, "Unable to create folder")
		return
	}

	utils.SendJSON(w, http.StatusCreated, folder, middleware.GetRequestID(r))
}

// GetFolders godoc
// @Summary List folders
// @Description Lists folders for the authenticated user.
// @Tags folders
// @Produce json
// @Success 200 {array} models.Folder
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/folders [get]
func GetFolders(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}
	folders, err := folderService.GetFolders(user.ID)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to retrieve folders", err), middleware.GetRequestID(r))
		return
	}

	utils.SendJSON(w, http.StatusOK, folders, middleware.GetRequestID(r))
}

// UpdateFolder godoc
// @Summary Update folder
// @Description Updates folder name or parent for the authenticated user.
// @Tags folders
// @Accept json
// @Produce json
// @Param id path int true "Folder ID"
// @Param request body UpdateFolderRequest true "Update folder request"
// @Success 200 {object} models.Folder
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/folders/{id} [patch]
func UpdateFolder(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	id, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid folder ID"), middleware.GetRequestID(r))
		return
	}

	var req UpdateFolderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
		return
	}
	defer func() { _ = r.Body.Close() }()
	folder, err := folderService.UpdateFolder(user, id, services.UpdateFolderRequest{
		Name:           req.Name,
		ParentFolderID: req.ParentFolderID,
	})
	if err != nil {
		sendServiceError(w, r, err, "Unable to update folder")
		return
	}

	utils.SendJSON(w, http.StatusOK, folder, middleware.GetRequestID(r))
}

// DeleteFolder godoc
// @Summary Delete folder
// @Description Deletes a folder owned by the authenticated user.
// @Tags folders
// @Param id path int true "Folder ID"
// @Success 204 {string} string "No Content"
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/folders/{id} [delete]
func DeleteFolder(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	id, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid folder ID"), middleware.GetRequestID(r))
		return
	}
	if err := folderService.DeleteFolder(user, id); err != nil {
		sendServiceError(w, r, err, "Unable to delete folder")
		return
	}

	w.Header().Set("X-Request-ID", middleware.GetRequestID(r))
	w.WriteHeader(http.StatusNoContent)
}
