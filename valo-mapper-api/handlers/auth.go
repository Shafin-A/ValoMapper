package handlers

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"valo-mapper-api/models"

	"firebase.google.com/go/v4/auth"
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

func verifyFirebaseToken(r *http.Request, firebaseAuth FirebaseAuthInterface) (*auth.Token, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return nil, errors.New("missing authorization header")
	}

	idToken := strings.TrimPrefix(authHeader, "Bearer ")

	token, err := firebaseAuth.VerifyIDToken(context.Background(), idToken)
	if err != nil {
		return nil, errors.New("invalid or expired token")
	}

	return token, nil
}

func authenticateRequest(r *http.Request, firebaseAuth FirebaseAuthInterface) (*models.User, error) {
	token, err := verifyFirebaseToken(r, firebaseAuth)
	if err != nil {
		return nil, err
	}

	user, err := models.GetUserByFirebaseUID(token.UID)
	if err != nil {
		return nil, errors.New("unable to retrieve user profile")
	}
	if user == nil {
		return nil, errors.New("user profile not found")
	}

	firebaseUser, err := firebaseAuth.GetUser(context.Background(), token.UID)
	if err == nil && firebaseUser.EmailVerified != user.EmailVerified {
		user.EmailVerified = firebaseUser.EmailVerified
		_ = user.Update()
	}

	return user, nil
}
