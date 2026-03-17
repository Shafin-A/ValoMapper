package handlers

import (
	"crypto/subtle"
	"encoding/json"
	"net/http"
	"os"
	"strings"

	"valo-mapper-api/middleware"
	"valo-mapper-api/services"
	"valo-mapper-api/utils"
)

type CreateUserRequest struct {
	FirebaseUID string `json:"firebaseUid"`
	Name        string `json:"name"`
	Email       string `json:"email"`
}

type UpdateUserRequest struct {
	Name          *string `json:"name,omitempty"`
	TourCompleted *bool   `json:"tourCompleted,omitempty"`
}

type UpdateUserSubscriptionRequest struct {
	UserID       *int    `json:"userId,omitempty"`
	FirebaseUID  *string `json:"firebaseUid,omitempty"`
	IsSubscribed *bool   `json:"isSubscribed"`
}

func strPtr(s string) *string {
	return &s
}

// CreateUser godoc
// @Summary Create user profile
// @Description Creates a user profile linked to the authenticated Firebase UID.
// @Tags users
// @Accept json
// @Produce json
// @Param request body CreateUserRequest true "Create user request"
// @Success 201 {object} models.User
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/users [post]
func CreateUser(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	if r.Method != http.MethodPost {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), middleware.GetRequestID(r))
		return
	}

	token, err := VerifyFirebaseToken(r, firebaseAuth)
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

	userService := services.NewUserService()
	user, err := userService.CreateUser(services.CreateUserRequest{
		FirebaseUID: req.FirebaseUID,
		Name:        req.Name,
		Email:       req.Email,
	})
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			utils.SendJSONError(w, utils.NewConflict("User already exists", err), middleware.GetRequestID(r))
			return
		}
		utils.SendJSONError(w, utils.NewInternal("Unable to create user", err), middleware.GetRequestID(r))
		return
	}

	utils.SendJSON(w, http.StatusCreated, user, middleware.GetRequestID(r))
}

// GetUser godoc
// @Summary Get current user
// @Description Returns the authenticated user's profile.
// @Tags users
// @Produce json
// @Success 200 {object} models.User
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/users/me [get]
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

	userService := services.NewUserService()
	userService.EnrichUserBillingState(user)

	utils.SendJSON(w, http.StatusOK, user, middleware.GetRequestID(r))
}

// UpdateUser godoc
// @Summary Update current user
// @Description Updates profile fields for the authenticated user.
// @Tags users
// @Accept json
// @Produce json
// @Param request body UpdateUserRequest true "Update user request"
// @Success 200 {object} models.User
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/users/me [put]
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

	userService := services.NewUserService()
	if err := userService.UpdateUser(user, services.UpdateUserRequest{
		Name:          req.Name,
		TourCompleted: req.TourCompleted,
	}); err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to update user", err), middleware.GetRequestID(r))
		return
	}

	userService.EnrichUserBillingState(user)

	utils.SendJSON(w, http.StatusOK, user, middleware.GetRequestID(r))
}

// DeleteUser godoc
// @Summary Delete current user
// @Description Deletes the authenticated user from the application and Firebase.
// @Tags users
// @Success 204 {string} string "No Content"
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/users/me [delete]
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

	userService := services.NewUserService()
	if err := userService.DeleteUser(user, firebaseAuth); err != nil {
		utils.SendJSONError(w, utils.NewInternal("Unable to delete user", err), middleware.GetRequestID(r))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Request-ID", middleware.GetRequestID(r))
	w.WriteHeader(http.StatusNoContent)
}

// UpdateUserSubscription godoc
// @Summary Update user subscription status
// @Description Internal endpoint to update a user's subscription status by userId or firebaseUid.
// @Tags users
// @Accept json
// @Produce json
// @Param X-Internal-API-Key header string true "Internal API key"
// @Param request body UpdateUserSubscriptionRequest true "Subscription update request"
// @Success 200 {object} models.User
// @Failure 400 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security InternalAPIKey
// @Router /api/users/subscription [patch]
func UpdateUserSubscription(w http.ResponseWriter, r *http.Request, _ FirebaseAuthInterface) {
	if r.Method != http.MethodPatch {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), middleware.GetRequestID(r))
		return
	}

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

	var req UpdateUserSubscriptionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
		return
	}
	defer r.Body.Close()

	if req.IsSubscribed == nil {
		utils.SendJSONError(w, utils.NewBadRequest("isSubscribed is required"), middleware.GetRequestID(r))
		return
	}

	hasUserID := req.UserID != nil
	hasFirebaseUID := req.FirebaseUID != nil && *req.FirebaseUID != ""
	if hasUserID == hasFirebaseUID {
		utils.SendJSONError(w, utils.NewBadRequest("Provide exactly one identifier: userId or firebaseUid"), middleware.GetRequestID(r))
		return
	}

	userService := services.NewUserService()
	user, err := userService.UpdateUserSubscription(services.UpdateUserSubscriptionRequest{
		UserID:       req.UserID,
		FirebaseUID:  req.FirebaseUID,
		IsSubscribed: *req.IsSubscribed,
	})
	if err != nil {
		if err.Error() == "user not found" {
			utils.SendJSONError(w, utils.NewNotFound("User not found"), middleware.GetRequestID(r))
			return
		}
		utils.SendJSONError(w, utils.NewInternal("Unable to update subscription", err), middleware.GetRequestID(r))
		return
	}

	userService.EnrichUserBillingState(user)

	utils.SendJSON(w, http.StatusOK, user, middleware.GetRequestID(r))
}
