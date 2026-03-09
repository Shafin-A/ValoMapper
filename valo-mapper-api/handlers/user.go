package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"valo-mapper-api/middleware"
	"valo-mapper-api/models"
	"valo-mapper-api/utils"
)

// strPtr is a helper function to convert a string to a *string
func strPtr(s string) *string {
	return &s
}

type CreateUserRequest struct {
	FirebaseUID string `json:"firebaseUid"`
	Name        string `json:"name"`
	Email       string `json:"email"`
}

type UpdateUserRequest struct {
	Name          *string `json:"name,omitempty"`
	TourCompleted *bool   `json:"tourCompleted,omitempty"`
}

func CreateUser(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	if r.Method != http.MethodPost {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), middleware.GetRequestID(r))
		return
	}

	token, err := verifyFirebaseToken(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Invalid or missing authentication"), middleware.GetRequestID(r))
		return
	}

	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
		return
	}
	defer r.Body.Close()

	if token.UID != req.FirebaseUID {
		utils.SendJSONError(w, utils.NewForbidden("User ID mismatch"), middleware.GetRequestID(r))
		return
	}

	user := &models.User{
		FirebaseUID:   strPtr(req.FirebaseUID),
		Name:          strPtr(req.Name),
		Email:         strPtr(req.Email),
		EmailVerified: false,
	}

	if err := user.Save(); err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "already exists") {
			utils.SendJSONError(w, utils.NewConflict("User already exists", err), middleware.GetRequestID(r))
			return
		}
		utils.SendJSONError(w, utils.NewInternal("Unable to create user", err), middleware.GetRequestID(r))
		return
	}

	utils.SendJSON(w, http.StatusCreated, user, middleware.GetRequestID(r))
}

func GetUser(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	if r.Method != http.MethodGet {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), middleware.GetRequestID(r))
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	utils.SendJSON(w, http.StatusOK, user, middleware.GetRequestID(r))
}

func UpdateUser(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	if r.Method != http.MethodPut {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), middleware.GetRequestID(r))
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
		return
	}
	defer r.Body.Close()

	if req.Name != nil && *req.Name != "" {
		user.Name = req.Name
	}

	if req.TourCompleted != nil {
		user.TourCompleted = *req.TourCompleted
	}

	if err := user.Update(); err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to update user", err), middleware.GetRequestID(r))
		return
	}

	utils.SendJSON(w, http.StatusOK, user, middleware.GetRequestID(r))
}

func DeleteUser(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	if r.Method != http.MethodDelete {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), middleware.GetRequestID(r))
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	if err := user.Delete(); err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to delete user", err), middleware.GetRequestID(r))
		return
	}

	if err := firebaseAuth.DeleteUser(context.Background(), *user.FirebaseUID); err != nil {
		utils.SendJSONError(w, utils.NewInternal("User deleted from database but Firebase deletion failed", err), middleware.GetRequestID(r))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Request-ID", middleware.GetRequestID(r))
	w.WriteHeader(http.StatusNoContent)
}
