package testutils

import (
	"context"

	"firebase.google.com/go/v4/auth"
)

// FirebaseAuthInterface defines the interface for Firebase Auth operations
type FirebaseAuthInterface interface {
	VerifyIDToken(ctx context.Context, idToken string) (*auth.Token, error)
	GetUser(ctx context.Context, uid string) (*auth.UserRecord, error)
}

// MockFirebaseAuth is a mock implementation of Firebase Auth for testing
type MockFirebaseAuth struct {
	VerifyTokenFunc func(ctx context.Context, idToken string) (*auth.Token, error)
	GetUserFunc     func(ctx context.Context, uid string) (*auth.UserRecord, error)
	DeleteUserFunc  func(ctx context.Context, uid string) error
}

// VerifyIDToken mocks token verification
func (m *MockFirebaseAuth) VerifyIDToken(ctx context.Context, idToken string) (*auth.Token, error) {
	if m.VerifyTokenFunc != nil {
		return m.VerifyTokenFunc(ctx, idToken)
	}
	return &auth.Token{
		UID: "test-uid-123",
	}, nil
}

// GetUser mocks getting user information
func (m *MockFirebaseAuth) GetUser(ctx context.Context, uid string) (*auth.UserRecord, error) {
	if m.GetUserFunc != nil {
		return m.GetUserFunc(ctx, uid)
	}
	return &auth.UserRecord{
		UserInfo: &auth.UserInfo{
			UID:   uid,
			Email: "test@example.com",
		},
		EmailVerified: true,
	}, nil
}

// DeleteUser mocks deleting a user
func (m *MockFirebaseAuth) DeleteUser(ctx context.Context, uid string) error {
	if m.DeleteUserFunc != nil {
		return m.DeleteUserFunc(ctx, uid)
	}
	return nil
}

// NewMockFirebaseAuth creates a new mock Firebase Auth client
func NewMockFirebaseAuth() FirebaseAuthInterface {
	return &MockFirebaseAuth{}
}

func (m *MockFirebaseAuth) WithVerifyToken(fn func(ctx context.Context, idToken string) (*auth.Token, error)) FirebaseAuthInterface {
	m.VerifyTokenFunc = fn
	return m
}

func (m *MockFirebaseAuth) WithGetUser(fn func(ctx context.Context, uid string) (*auth.UserRecord, error)) FirebaseAuthInterface {
	m.GetUserFunc = fn
	return m
}
