package handlers

import (
	"encoding/json"
	"net/http"
	"valo-mapper-api/models"

	"firebase.google.com/go/v4/auth"
)

type CreateUserRequest struct {
	FirebaseUID string `json:"firebaseUid"`
	Email       string `json:"email"`
}

func CreateUser(w http.ResponseWriter, r *http.Request, firebaseAuth *auth.Client) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token, err := verifyFirebaseToken(r, firebaseAuth)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if token.UID != req.FirebaseUID {
		http.Error(w, "UID mismatch", http.StatusForbidden)
		return
	}

	user := &models.User{
		FirebaseUID:   req.FirebaseUID,
		Email:         req.Email,
		EmailVerified: false,
	}

	if err := user.Save(); err != nil {
		http.Error(w, "Error creating user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}
