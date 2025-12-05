package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"valo-mapper-api/middleware"
	"valo-mapper-api/models"
	"valo-mapper-api/utils"

	"firebase.google.com/go/v4/auth"
)

type CreateUserRequest struct {
	FirebaseUID string `json:"firebaseUid"`
	Name        string `json:"name"`
	Email       string `json:"email"`
}

type UpdateUserRequest struct {
	Name string `json:"name"`
}

func CreateUser(w http.ResponseWriter, r *http.Request, firebaseAuth *auth.Client) {
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
		FirebaseUID:   req.FirebaseUID,
		Name:          req.Name,
		Email:         req.Email,
		EmailVerified: false,
	}

	if err := user.Save(); err != nil {
		// Check for duplicate key constraint
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "already exists") {
			utils.SendJSONError(w, utils.NewConflict("User already exists", err), middleware.GetRequestID(r))
			return
		}
		utils.SendJSONError(w, utils.NewInternal("Unable to create user", err), middleware.GetRequestID(r))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Request-ID", middleware.GetRequestID(r))
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

func GetUser(w http.ResponseWriter, r *http.Request, firebaseAuth *auth.Client) {
	if r.Method != http.MethodGet {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), middleware.GetRequestID(r))
		return
	}

	user, err := authenticateRequest(r, firebaseAuth)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Request-ID", middleware.GetRequestID(r))
	json.NewEncoder(w).Encode(user)
}

func UpdateUser(w http.ResponseWriter, r *http.Request, firebaseAuth *auth.Client) {
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

	if req.Name != "" {
		user.Name = req.Name
	}

	if err := user.Update(); err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to update user", err), middleware.GetRequestID(r))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Request-ID", middleware.GetRequestID(r))
	json.NewEncoder(w).Encode(user)
}
