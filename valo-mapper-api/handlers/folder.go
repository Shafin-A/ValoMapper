package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"valo-mapper-api/middleware"
	"valo-mapper-api/services"
	"valo-mapper-api/utils"
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
	if r.Method != http.MethodPost {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), middleware.GetRequestID(r))
		return
	}

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
	defer r.Body.Close()

	folderService := services.NewFolderService()
	folder, err := folderService.CreateFolder(user, services.CreateFolderRequest{
		Name:           req.Name,
		ParentFolderID: req.ParentFolderID,
	})
	if err != nil {
		if err.Error() == "active subscription required to manage folders" {
			utils.SendJSONError(w, utils.NewForbidden("Active subscription required to manage folders"), middleware.GetRequestID(r))
			return
		}
		utils.SendJSONError(w, utils.NewBadRequest(err.Error()), middleware.GetRequestID(r))
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
	if r.Method != http.MethodGet {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), middleware.GetRequestID(r))
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	folderService := services.NewFolderService()
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
	if r.Method != http.MethodPatch {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), middleware.GetRequestID(r))
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	path := r.URL.Path
	idStr := strings.TrimPrefix(path, "/api/folders/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid folder ID"), middleware.GetRequestID(r))
		return
	}

	var req UpdateFolderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
		return
	}
	defer r.Body.Close()

	folderService := services.NewFolderService()
	folder, err := folderService.UpdateFolder(user, id, services.UpdateFolderRequest{
		Name:           req.Name,
		ParentFolderID: req.ParentFolderID,
	})
	if err != nil {
		if err.Error() == "active subscription required to manage folders" {
			utils.SendJSONError(w, utils.NewForbidden("Active subscription required to manage folders"), middleware.GetRequestID(r))
			return
		}
		if err.Error() == "folder not found" {
			utils.SendJSONError(w, utils.NewNotFound("Folder not found"), middleware.GetRequestID(r))
			return
		}
		if err.Error() == "you do not have access to this folder" {
			utils.SendJSONError(w, utils.NewForbidden("You do not have access to this folder"), middleware.GetRequestID(r))
			return
		}
		utils.SendJSONError(w, utils.NewInternal("Unable to update folder", err), middleware.GetRequestID(r))
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
	if r.Method != http.MethodDelete {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), middleware.GetRequestID(r))
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	path := r.URL.Path
	idStr := strings.TrimPrefix(path, "/api/folders/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid folder ID"), middleware.GetRequestID(r))
		return
	}

	folderService := services.NewFolderService()
	if err := folderService.DeleteFolder(user, id); err != nil {
		if err.Error() == "active subscription required to manage folders" {
			utils.SendJSONError(w, utils.NewForbidden("Active subscription required to manage folders"), middleware.GetRequestID(r))
			return
		}
		if err.Error() == "folder not found" {
			utils.SendJSONError(w, utils.NewNotFound("Folder not found"), middleware.GetRequestID(r))
			return
		}
		if err.Error() == "you do not have access to this folder" {
			utils.SendJSONError(w, utils.NewForbidden("You do not have access to this folder"), middleware.GetRequestID(r))
			return
		}
		utils.SendJSONError(w, utils.NewInternal("Unable to delete folder", err), middleware.GetRequestID(r))
		return
	}

	w.Header().Set("X-Request-ID", middleware.GetRequestID(r))
	w.WriteHeader(http.StatusNoContent)
}
