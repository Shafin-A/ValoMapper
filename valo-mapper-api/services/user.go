package services

import (
	"context"
	"errors"
	"math"
	"strings"
	"time"
	"valo-mapper-api/models"
)

// UserService handles user-related business logic
type UserService struct{}

// NewUserService creates a new UserService
func NewUserService() *UserService {
	return &UserService{}
}

// CreateUserRequest wraps user creation input
type CreateUserRequest struct {
	FirebaseUID string
	Name        string
	Email       string
}

// CreateUser creates a new user profile
func (us *UserService) CreateUser(req CreateUserRequest) (*models.User, error) {
	if req.FirebaseUID == "" {
		return nil, errors.New("firebase UID is required")
	}
	if req.Name == "" {
		return nil, errors.New("name is required")
	}
	if req.Email == "" {
		return nil, errors.New("email is required")
	}

	user := &models.User{
		FirebaseUID:   strPtr(req.FirebaseUID),
		Name:          strPtr(req.Name),
		Email:         strPtr(req.Email),
		EmailVerified: false,
	}

	if err := user.Save(); err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "already exists") {
			return nil, errors.New("user already exists")
		}
		return nil, err
	}

	us.EnrichUserBillingState(user)
	return user, nil
}

// UpdateUserRequest wraps user update input
type UpdateUserRequest struct {
	Name          *string
	TourCompleted *bool
}

// UpdateUser updates an existing user's profile
func (us *UserService) UpdateUser(user *models.User, req UpdateUserRequest) error {
	if req.Name != nil && *req.Name != "" {
		user.Name = req.Name
	}

	if req.TourCompleted != nil {
		user.TourCompleted = *req.TourCompleted
	}

	return user.Update()
}

// EnrichUserBillingState adds trial eligibility and remaining days to user
func (us *UserService) EnrichUserBillingState(user *models.User) {
	if user == nil {
		return
	}

	user.RefreshPremiumTrialEligibility()
	user.PremiumTrialDaysLeft = nil

	if user.SubscriptionTrialEndsAt == nil {
		return
	}

	remainingDays := int(math.Ceil(user.SubscriptionTrialEndsAt.UTC().Sub(time.Now().UTC()).Hours() / 24))
	if remainingDays <= 0 {
		return
	}

	user.PremiumTrialDaysLeft = &remainingDays
}

// strPtr is a helper function to convert a string to a *string
func strPtr(s string) *string {
	return &s
}

// DeleteUser deletes a user from the database and Firebase
func (us *UserService) DeleteUser(user *models.User, firebaseAuth FirebaseAuthInterface) error {
	if err := user.Delete(); err != nil {
		return err
	}

	if user.FirebaseUID == nil || *user.FirebaseUID == "" {
		return errors.New("user firebase UID is missing")
	}

	if err := firebaseAuth.DeleteUser(context.Background(), *user.FirebaseUID); err != nil {
		return err
	}

	return nil
}

// UpdateUserSubscriptionRequest wraps subscription update input
type UpdateUserSubscriptionRequest struct {
	UserID       *int
	FirebaseUID  *string
	IsSubscribed bool
}

// UpdateUserSubscription updates a user's subscription status
func (us *UserService) UpdateUserSubscription(req UpdateUserSubscriptionRequest) (*models.User, error) {
	var user *models.User
	var err error

	if req.UserID != nil {
		user, err = models.GetUserByID(*req.UserID)
	} else if req.FirebaseUID != nil {
		user, err = models.GetUserByFirebaseUID(*req.FirebaseUID)
	} else {
		return nil, errors.New("either userId or firebaseUid must be provided")
	}

	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	var subscriptionEndedAt *time.Time
	if req.IsSubscribed {
		subscriptionEndedAt = nil
	} else {
		now := time.Now().UTC()
		subscriptionEndedAt = &now
	}

	if err := user.UpdateSubscriptionStatus(req.IsSubscribed, subscriptionEndedAt); err != nil {
		return nil, err
	}

	user.IsSubscribed = req.IsSubscribed
	user.SubscriptionEndedAt = subscriptionEndedAt

	return user, nil
}
