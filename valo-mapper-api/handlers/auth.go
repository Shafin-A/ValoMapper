package handlers

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"valo-mapper-api/middleware"
	"valo-mapper-api/models"
	"valo-mapper-api/utils"

	"firebase.google.com/go/v4/auth"
)

var (
	errMissingAuthorizationHeader = errors.New("missing authorization header")
	errInvalidOrExpiredToken      = errors.New("invalid or expired token")
	errUnableToRetrieveUser       = errors.New("unable to retrieve user profile")
)

type userContextKey struct{}

func UserFromContext(ctx context.Context) *models.User {
	user, _ := ctx.Value(userContextKey{}).(*models.User)
	return user
}

func RequireAuth(firebaseAuth FirebaseAuthInterface) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, err := authenticateRequest(r, firebaseAuth)
			if err != nil {
				writeAuthError(w, r, err)
				return
			}

			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userContextKey{}, user)))
		})
	}
}

func OptionalAuth(firebaseAuth FirebaseAuthInterface) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if strings.TrimSpace(r.Header.Get("Authorization")) == "" {
				next.ServeHTTP(w, r)
				return
			}

			user, err := authenticateRequest(r, firebaseAuth)
			if err != nil {
				writeAuthError(w, r, err)
				return
			}

			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userContextKey{}, user)))
		})
	}
}

func writeAuthError(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, errMissingAuthorizationHeader) || errors.Is(err, errInvalidOrExpiredToken) {
		utils.SendJSONError(w, utils.NewUnauthorized("Authentication failed"), middleware.GetRequestID(r))
		return
	}

	utils.SendJSONError(w, utils.NewInternal("Unable to load authenticated user", err), middleware.GetRequestID(r))
}

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
	if user := UserFromContext(r.Context()); user != nil {
		return user, nil
	}

	token, err := VerifyFirebaseToken(r, firebaseAuth)
	if err != nil {
		return nil, err
	}

	user, err := models.GetUserByFirebaseUID(token.UID)
	if err != nil {
		return nil, errUnableToRetrieveUser
	}

	if user != nil {
		syncEmailVerified(r, user, token)
		return user, nil
	}

	firebaseUser, firebaseErr := firebaseAuth.GetUser(context.Background(), token.UID)
	if firebaseErr != nil {
		firebaseUser = nil
	}

	user = buildUserFromFirebase(token.UID, firebaseUser)
	if saveErr := user.Save(); saveErr != nil {
		return nil, errUnableToRetrieveUser
	}

	return user, nil
}

func syncEmailVerified(r *http.Request, user *models.User, token *auth.Token) {
	verified, ok := token.Claims["email_verified"].(bool)
	if !ok || verified == user.EmailVerified {
		return
	}

	user.EmailVerified = verified
	if err := user.Update(); err != nil {
		slog.Error("failed to sync email_verified", "request_id", middleware.GetRequestID(r), "user_id", user.ID, "error", err)
	}
}

func authenticateOptionalRequest(r *http.Request, firebaseAuth FirebaseAuthInterface) (*models.User, error) {
	if user := UserFromContext(r.Context()); user != nil {
		return user, nil
	}

	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	if authHeader == "" {
		return nil, nil
	}

	return authenticateRequest(r, firebaseAuth)
}
