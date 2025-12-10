package handlers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"valo-mapper-api/testutils"

	"firebase.google.com/go/v4/auth"
	"github.com/stretchr/testify/assert"
)

func testVerifyFirebaseToken(r *http.Request, authClient testutils.FirebaseAuthInterface) (*auth.Token, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return nil, errors.New("missing authorization header")
	}

	idToken := authHeader[7:] // Strip "Bearer "

	token, err := authClient.VerifyIDToken(context.Background(), idToken)
	if err != nil {
		return nil, errors.New("invalid or expired token")
	}

	return token, nil
}

func TestVerifyFirebaseToken(t *testing.T) {
	t.Run("missing authorization header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		mockAuth := &testutils.MockFirebaseAuth{}

		token, err := testVerifyFirebaseToken(req, mockAuth)

		assert.Nil(t, token)
		assert.EqualError(t, err, "missing authorization header")
	})

	t.Run("valid token", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Authorization", "Bearer valid-token")

		mockAuth := &testutils.MockFirebaseAuth{}
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			assert.Equal(t, "valid-token", idToken)
			return &auth.Token{UID: "user-123"}, nil
		}

		token, err := testVerifyFirebaseToken(req, mockAuth)

		assert.NoError(t, err)
		assert.NotNil(t, token)
		assert.Equal(t, "user-123", token.UID)
	})

	t.Run("invalid token", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Authorization", "Bearer invalid-token")

		mockAuth := &testutils.MockFirebaseAuth{}
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return nil, errors.New("token verification failed")
		}

		token, err := testVerifyFirebaseToken(req, mockAuth)

		assert.Nil(t, token)
		assert.EqualError(t, err, "invalid or expired token")
	})

	t.Run("strips Bearer prefix", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Authorization", "Bearer test-token-123")

		var capturedToken string
		mockAuth := &testutils.MockFirebaseAuth{}
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			capturedToken = idToken
			return &auth.Token{UID: "user-123"}, nil
		}

		_, err := testVerifyFirebaseToken(req, mockAuth)

		assert.NoError(t, err)
		assert.Equal(t, "test-token-123", capturedToken)
	})
}
