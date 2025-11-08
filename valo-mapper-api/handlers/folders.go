package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"valo-mapper-api/models"

	"firebase.google.com/go/v4/auth"
)

type CreateFolderRequest struct {
	Name           string `json:"name"`
	ParentFolderID *int   `json:"parentFolderId,omitempty"`
}

type UpdateFolderRequest struct {
	Name           *string `json:"name,omitempty"`
	ParentFolderID *int    `json:"parentFolderId,omitempty"`
}

func CreateFolder(w http.ResponseWriter, r *http.Request, firebaseAuth *auth.Client) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var req CreateFolderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if req.Name == "" {
		http.Error(w, "Folder name is required", http.StatusBadRequest)
		return
	}

	folder := &models.Folder{
		UserID:         user.ID,
		Name:           req.Name,
		ParentFolderID: req.ParentFolderID,
	}

	if err := folder.Save(); err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			http.Error(w, "A folder with this name already exists in this location", http.StatusConflict)
			return
		}
		http.Error(w, "Error creating folder: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(folder)
}

func GetFolders(w http.ResponseWriter, r *http.Request, firebaseAuth *auth.Client) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	folders, err := models.GetFoldersByUserID(user.ID)
	if err != nil {
		http.Error(w, "Error retrieving folders: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(folders)
}

func GetFolder(w http.ResponseWriter, r *http.Request, firebaseAuth *auth.Client) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	path := r.URL.Path
	idStr := strings.TrimPrefix(path, "/api/folders/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid folder ID", http.StatusBadRequest)
		return
	}

	folder, err := models.GetFolderByID(id)
	if err != nil {
		http.Error(w, "Error retrieving folder: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if folder == nil {
		http.Error(w, "Folder not found", http.StatusNotFound)
		return
	}

	if folder.UserID != user.ID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(folder)
}

func UpdateFolder(w http.ResponseWriter, r *http.Request, firebaseAuth *auth.Client) {
	if r.Method != http.MethodPatch {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	path := r.URL.Path
	idStr := strings.TrimPrefix(path, "/api/folders/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid folder ID", http.StatusBadRequest)
		return
	}

	var req UpdateFolderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	folder, err := models.GetFolderByID(id)
	if err != nil {
		http.Error(w, "Error retrieving folder: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if folder == nil {
		http.Error(w, "Folder not found", http.StatusNotFound)
		return
	}

	if folder.UserID != user.ID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	if req.Name != nil {
		folder.Name = *req.Name
	}
	if req.ParentFolderID != nil {
		folder.ParentFolderID = req.ParentFolderID
	}

	if err := folder.Update(); err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			http.Error(w, "A folder with this name already exists in this location", http.StatusConflict)
			return
		}
		http.Error(w, "Error updating folder: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(folder)
}

func DeleteFolder(w http.ResponseWriter, r *http.Request, firebaseAuth *auth.Client) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	path := r.URL.Path
	idStr := strings.TrimPrefix(path, "/api/folders/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid folder ID", http.StatusBadRequest)
		return
	}

	folder, err := models.GetFolderByID(id)
	if err != nil {
		http.Error(w, "Error retrieving folder: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if folder == nil {
		http.Error(w, "Folder not found", http.StatusNotFound)
		return
	}

	if folder.UserID != user.ID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	if err := folder.Delete(); err != nil {
		http.Error(w, "Error deleting folder: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
