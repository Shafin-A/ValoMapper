package handlers

import (
	"errors"
	"net/http"

	"valo-mapper-api/middleware"
	"valo-mapper-api/models"
	"valo-mapper-api/services"
	"valo-mapper-api/utils"
)

type errorMapping struct {
	err     error
	status  int
	message string
}

var errorMappings = []errorMapping{
	{services.ErrLobbyCodeRequired, http.StatusBadRequest, "Lobby code is required"},
	{services.ErrStrategyNameRequired, http.StatusBadRequest, "Strategy name is required"},
	{services.ErrStrategyLobbyNotFound, http.StatusNotFound, "Lobby not found"},
	{services.ErrStrategyFreePlanLimit, http.StatusForbidden, "Free plan limit reached (1 saved strategy). Upgrade to ValoMapper Premium for unlimited saves."},
	{services.ErrStrategyAlreadySaved, http.StatusConflict, "You have already saved this lobby"},
	{services.ErrStrategyNotFound, http.StatusNotFound, "Strategy not found"},
	{services.ErrStrategyAccessDenied, http.StatusForbidden, "You do not have access to this strategy"},
	{services.ErrStrategyTooManyTags, http.StatusBadRequest, "A strategy can have at most 8 tags"},
	{services.ErrStrategyInvalidTag, http.StatusBadRequest, "Tags must be 24 characters or fewer and contain only letters, numbers, spaces, hyphens, or underscores"},
	{services.ErrStrategyInvalidSide, http.StatusBadRequest, "Side must be attack or defense"},
	{services.ErrStrategyInvalidSort, http.StatusBadRequest, "Sort must be updated, created, or name"},
	{services.ErrStrategyInvalidTagMode, http.StatusBadRequest, "Tag mode must be all or any"},
	{services.ErrStrategyInvalidSelection, http.StatusBadRequest, "Select between 1 and 100 strategies"},
	{services.ErrFolderSubscriptionRequired, http.StatusForbidden, "Active subscription required to manage folders"},
	{services.ErrFolderNameRequired, http.StatusBadRequest, "Folder name is required"},
	{services.ErrFolderNotFound, http.StatusNotFound, "Folder not found"},
	{services.ErrFolderAccessDenied, http.StatusForbidden, "You do not have access to this folder"},
	{services.ErrUserFirebaseUIDRequired, http.StatusBadRequest, "Firebase UID is required"},
	{services.ErrUserNameRequired, http.StatusBadRequest, "Name is required"},
	{services.ErrUserEmailRequired, http.StatusBadRequest, "Email is required"},
	{services.ErrUserAlreadyExists, http.StatusConflict, "User already exists"},
	{services.ErrUserFirebaseUIDMissing, http.StatusInternalServerError, "User is missing a Firebase UID"},
	{services.ErrUserIdentifierRequired, http.StatusBadRequest, "Provide exactly one identifier: userId or firebaseUid"},
	{services.ErrUserNotFound, http.StatusNotFound, "User not found"},
	{services.ErrUserFavoriteAgentInvalid, http.StatusBadRequest, "Favorite agents contain an unknown agent"},
	{models.ErrLobbyNotFound, http.StatusNotFound, "Lobby not found"},
	{models.ErrInvalidPatch, http.StatusBadRequest, "Invalid canvas data"},
}

func sendServiceError(w http.ResponseWriter, r *http.Request, err error, fallback string) {
	for _, mapping := range errorMappings {
		if !errors.Is(err, mapping.err) {
			continue
		}

		httpErr := &utils.HTTPError{Status: mapping.status, Message: mapping.message}
		if mapping.status >= http.StatusInternalServerError {
			httpErr.Err = err
		}
		utils.SendJSONError(w, httpErr, middleware.GetRequestID(r))
		return
	}

	utils.SendJSONError(w, utils.NewInternal(fallback, err), middleware.GetRequestID(r))
}
