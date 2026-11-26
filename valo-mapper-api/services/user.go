package services

import (
	"context"
	"errors"
	"math"
	"sort"
	"strings"
	"time"

	"valo-mapper-api/models"
	"valo-mapper-api/valorant"

	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrUserFirebaseUIDRequired  = errors.New("firebase UID is required")
	ErrUserNameRequired         = errors.New("name is required")
	ErrUserEmailRequired        = errors.New("email is required")
	ErrUserAlreadyExists        = errors.New("user already exists")
	ErrUserFirebaseUIDMissing   = errors.New("user firebase UID is missing")
	ErrUserIdentifierRequired   = errors.New("either userId or firebaseUid must be provided")
	ErrUserNotFound             = errors.New("user not found")
	ErrUserFavoriteAgentInvalid = errors.New("favorite agents contain an unknown agent")
)

type UserRepository interface {
	GetUserByFirebaseUID(uid string) (*models.User, error)
	GetUserByID(id int) (*models.User, error)
	SaveUser(u *models.User) error
	UpdateUser(u *models.User) error
	DeleteUser(u *models.User) error
	UpdateSubscriptionStatus(u *models.User, isSubscribed bool, subscriptionEndedAt *time.Time) error
}

type defaultUserRepository struct{}

func (r *defaultUserRepository) GetUserByFirebaseUID(uid string) (*models.User, error) {
	return models.GetUserByFirebaseUID(uid)
}
func (r *defaultUserRepository) GetUserByID(id int) (*models.User, error) {
	return models.GetUserByID(id)
}
func (r *defaultUserRepository) SaveUser(u *models.User) error   { return u.Save() }
func (r *defaultUserRepository) UpdateUser(u *models.User) error { return u.Update() }
func (r *defaultUserRepository) DeleteUser(u *models.User) error { return u.Delete() }
func (r *defaultUserRepository) UpdateSubscriptionStatus(u *models.User, isSubscribed bool, subscriptionEndedAt *time.Time) error {
	return u.UpdateSubscriptionStatus(isSubscribed, subscriptionEndedAt)
}

type UserServiceDependencies struct {
	Repo UserRepository
}

type UserService struct {
	repo UserRepository
}

func NewUserService(deps UserServiceDependencies) *UserService {
	repo := deps.Repo
	if repo == nil {
		repo = &defaultUserRepository{}
	}
	return &UserService{repo: repo}
}

type CreateUserRequest struct {
	FirebaseUID string
	Name        string
	Email       string
}

func (us *UserService) CreateUser(req CreateUserRequest) (*models.User, error) {
	if req.FirebaseUID == "" {
		return nil, ErrUserFirebaseUIDRequired
	}
	if req.Name == "" {
		return nil, ErrUserNameRequired
	}
	if req.Email == "" {
		return nil, ErrUserEmailRequired
	}

	user := &models.User{
		FirebaseUID:   strPtr(req.FirebaseUID),
		Name:          strPtr(req.Name),
		Email:         strPtr(req.Email),
		EmailVerified: false,
	}

	if err := us.repo.SaveUser(user); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.UniqueViolation {
			return nil, ErrUserAlreadyExists
		}
		return nil, err
	}

	us.EnrichUserBillingState(user)
	return user, nil
}

type UpdateUserRequest struct {
	Name           *string
	TourCompleted  *bool
	FavoriteAgents *[]string
}

func (us *UserService) UpdateUser(user *models.User, req UpdateUserRequest) error {
	if req.Name != nil && *req.Name != "" {
		user.Name = req.Name
	}

	if req.TourCompleted != nil {
		user.TourCompleted = *req.TourCompleted
	}

	if req.FavoriteAgents != nil {
		agents, err := normalizeFavoriteAgents(*req.FavoriteAgents)
		if err != nil {
			return err
		}
		user.FavoriteAgents = agents
	}

	return us.repo.UpdateUser(user)
}

func normalizeFavoriteAgents(agents []string) ([]string, error) {
	seen := make(map[string]struct{}, len(agents))
	normalized := make([]string, 0, len(agents))

	for _, raw := range agents {
		name := strings.TrimSpace(raw)
		if name == "" {
			continue
		}
		if valorant.AgentRoleByName(name) == "" {
			return nil, ErrUserFavoriteAgentInvalid
		}
		if _, ok := seen[name]; ok {
			continue
		}
		seen[name] = struct{}{}
		normalized = append(normalized, name)
	}

	sort.Strings(normalized)
	return normalized, nil
}

// EnrichUserBillingState sets PremiumTrialDaysLeft and trial eligibility.
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

func strPtr(s string) *string {
	return &s
}

func (us *UserService) DeleteUser(user *models.User, firebaseAuth FirebaseUserDeleter) error {
	if err := us.repo.DeleteUser(user); err != nil {
		return err
	}

	if user.FirebaseUID == nil || *user.FirebaseUID == "" {
		return ErrUserFirebaseUIDMissing
	}

	if err := firebaseAuth.DeleteUser(context.Background(), *user.FirebaseUID); err != nil {
		return err
	}

	return nil
}

type UpdateUserSubscriptionRequest struct {
	UserID       *int
	FirebaseUID  *string
	IsSubscribed bool
}

func (us *UserService) UpdateUserSubscription(req UpdateUserSubscriptionRequest) (*models.User, error) {
	var user *models.User
	var err error

	if req.UserID != nil {
		user, err = us.repo.GetUserByID(*req.UserID)
	} else if req.FirebaseUID != nil {
		user, err = us.repo.GetUserByFirebaseUID(*req.FirebaseUID)
	} else {
		return nil, ErrUserIdentifierRequired
	}

	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrUserNotFound
	}

	var subscriptionEndedAt *time.Time
	if req.IsSubscribed {
		subscriptionEndedAt = nil
	} else {
		now := time.Now().UTC()
		subscriptionEndedAt = &now
	}

	if err := us.repo.UpdateSubscriptionStatus(user, req.IsSubscribed, subscriptionEndedAt); err != nil {
		return nil, err
	}

	user.IsSubscribed = req.IsSubscribed
	user.SubscriptionEndedAt = subscriptionEndedAt

	return user, nil
}
