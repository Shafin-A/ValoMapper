package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

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
func CreateUser(w http.ResponseWriter, r *http.Request) {
	current, err := currentUser(r)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Invalid or missing authentication"), middleware.GetRequestID(r))
		return
	}

	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
		return
	}
	defer func() { _ = r.Body.Close() }()

	if current.FirebaseUID == nil || *current.FirebaseUID != req.FirebaseUID {
		utils.SendJSONError(w, utils.NewForbidden("User ID mismatch"), middleware.GetRequestID(r))
		return
	}
	user, err := userService.CreateUser(services.CreateUserRequest{
		FirebaseUID: req.FirebaseUID,
		Name:        req.Name,
		Email:       req.Email,
	})
	if err != nil {
		sendServiceError(w, r, err, "Unable to create user")
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
func GetUser(w http.ResponseWriter, r *http.Request) {
	user, err := currentUser(r)
	if err != nil {
		if errors.Is(err, errMissingAuthorizationHeader) || errors.Is(err, errInvalidOrExpiredToken) {
			utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
			return
		}

		utils.SendJSONError(w, utils.NewInternal("Unable to load authenticated user", err), middleware.GetRequestID(r))
		return
	}
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
func UpdateUser(w http.ResponseWriter, r *http.Request) {
	user, err := currentUser(r)
	if err != nil {
		if errors.Is(err, errMissingAuthorizationHeader) || errors.Is(err, errInvalidOrExpiredToken) {
			utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
			return
		}

		utils.SendJSONError(w, utils.NewInternal("Unable to load authenticated user", err), middleware.GetRequestID(r))
		return
	}

	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
		return
	}
	defer func() { _ = r.Body.Close() }()
	if err := userService.UpdateUser(user, services.UpdateUserRequest{
		Name:          req.Name,
		TourCompleted: req.TourCompleted,
	}); err != nil {
		sendServiceError(w, r, err, "Unable to update user")
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
func DeleteUser(w http.ResponseWriter, r *http.Request) {
	user, err := currentUser(r)
	if err != nil {
		if errors.Is(err, errMissingAuthorizationHeader) || errors.Is(err, errInvalidOrExpiredToken) {
			utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
			return
		}

		utils.SendJSONError(w, utils.NewInternal("Unable to load authenticated user", err), middleware.GetRequestID(r))
		return
	}
	if firebaseAuthClient == nil {
		utils.SendJSONError(w, utils.NewInternal("Firebase auth is not configured", nil), middleware.GetRequestID(r))
		return
	}
	if err := userService.DeleteUser(user, firebaseAuthClient); err != nil {
		sendServiceError(w, r, err, "Unable to delete user")
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
func UpdateUserSubscription(w http.ResponseWriter, r *http.Request) {
	var req UpdateUserSubscriptionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
		return
	}
	defer func() { _ = r.Body.Close() }()

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
	user, err := userService.UpdateUserSubscription(services.UpdateUserSubscriptionRequest{
		UserID:       req.UserID,
		FirebaseUID:  req.FirebaseUID,
		IsSubscribed: *req.IsSubscribed,
	})
	if err != nil {
		sendServiceError(w, r, err, "Unable to update subscription")
		return
	}

	userService.EnrichUserBillingState(user)

	utils.SendJSON(w, http.StatusOK, user, middleware.GetRequestID(r))
}
