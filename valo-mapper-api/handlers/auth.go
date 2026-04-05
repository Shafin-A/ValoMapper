package handlers

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"valo-mapper-api/middleware"
	"valo-mapper-api/models"

	"firebase.google.com/go/v4/auth"
)

var (
	errMissingAuthorizationHeader = errors.New("missing authorization header")
	errInvalidOrExpiredToken      = errors.New("invalid or expired token")
	errUnableToRetrieveUser       = errors.New("unable to retrieve user profile")
)

type FirebaseAuthInterface interface {
	VerifyIDToken(ctx context.Context, idToken string) (*auth.Token, error)
	GetUser(ctx context.Context, uid string) (*auth.UserRecord, error)
	DeleteUser(ctx context.Context, uid string) error
	CustomToken(ctx context.Context, uid string) (string, error)
}

type FirebaseAuthClient struct {
	*auth.Client
}

func NewFirebaseAuthClient(client *auth.Client) FirebaseAuthInterface {
	return &FirebaseAuthClient{Client: client}
}

func VerifyFirebaseToken(r *http.Request, firebaseAuth FirebaseAuthInterface) (*auth.Token, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return nil, errMissingAuthorizationHeader
	}

	authHeader = strings.TrimSpace(authHeader)
	if authHeader == "" {
		return nil, errInvalidOrExpiredToken
	}

	idToken := authHeader
	if strings.Contains(authHeader, " ") {
		parts := strings.Fields(authHeader)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return nil, errInvalidOrExpiredToken
		}

		idToken = strings.TrimSpace(parts[1])
	}

	if idToken == "" || strings.EqualFold(idToken, "undefined") || strings.EqualFold(idToken, "null") {
		return nil, errInvalidOrExpiredToken
	}

	token, err := firebaseAuth.VerifyIDToken(context.Background(), idToken)
	if err != nil {
		return nil, errInvalidOrExpiredToken
	}

	return token, nil
}

func deriveDisplayName(firebaseUser *auth.UserRecord) *string {
	if firebaseUser == nil {
		return nil
	}

	if displayName := strings.TrimSpace(firebaseUser.DisplayName); displayName != "" {
		return &displayName
	}

	if email := strings.TrimSpace(firebaseUser.Email); email != "" {
		local := strings.SplitN(email, "@", 2)[0]
		if local = strings.TrimSpace(local); local != "" {
			return &local
		}
	}

	return nil
}

func buildUserFromFirebase(uid string, firebaseUser *auth.UserRecord) *models.User {
	user := &models.User{
		FirebaseUID:   &uid,
		EmailVerified: false,
	}

	if firebaseUser == nil {
		return user
	}

	if email := strings.TrimSpace(firebaseUser.Email); email != "" {
		user.Email = &email
	}

	if displayName := deriveDisplayName(firebaseUser); displayName != nil {
		user.Name = displayName
	}

	user.EmailVerified = firebaseUser.EmailVerified

	return user
}

func authenticateRequest(r *http.Request, firebaseAuth FirebaseAuthInterface) (*models.User, error) {
	token, err := VerifyFirebaseToken(r, firebaseAuth)
	if err != nil {
		return nil, err
	}

	firebaseUser, firebaseErr := firebaseAuth.GetUser(context.Background(), token.UID)

	user, err := models.GetUserByFirebaseUID(token.UID)
	if err != nil {
		return nil, errUnableToRetrieveUser
	}

	if user == nil {
		user = buildUserFromFirebase(token.UID, firebaseUser)
		if saveErr := user.Save(); saveErr != nil {
			return nil, errUnableToRetrieveUser
		}
		return user, nil
	}

	if firebaseErr == nil && firebaseUser != nil && firebaseUser.EmailVerified != user.EmailVerified {
		user.EmailVerified = firebaseUser.EmailVerified
		if updateErr := user.Update(); updateErr != nil {
			slog.Error("failed to sync email_verified", "request_id", middleware.GetRequestID(r), "user_id", user.ID, "error", updateErr)
		}
	}

	return user, nil
}
