package handlers

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"valo-mapper-api/models"

	"firebase.google.com/go/v4/auth"
)

func verifyFirebaseToken(r *http.Request, firebaseAuth *auth.Client) (*auth.Token, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return nil, errors.New("unauthorized")
	}

	idToken := strings.TrimPrefix(authHeader, "Bearer ")

	token, err := firebaseAuth.VerifyIDToken(context.Background(), idToken)
	if err != nil {
		return nil, errors.New("invalid token")
	}

	return token, nil
}

func authenticateRequest(r *http.Request, firebaseAuth *auth.Client) (*models.User, error) {
	token, err := verifyFirebaseToken(r, firebaseAuth)
	if err != nil {
		return nil, err
	}

	user, err := models.GetUserByFirebaseUID(token.UID)
	if err != nil {
		return nil, errors.New("error retrieving user")
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	return user, nil
}
