package services

import (
	"errors"
	"time"

	"valo-mapper-api/models"

	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrLobbyCodeRequired     = errors.New("lobby code is required")
	ErrStrategyNameRequired  = errors.New("strategy name is required")
	ErrStrategyLobbyNotFound = errors.New("lobby not found")
	ErrStrategyFreePlanLimit = errors.New("free plan limit reached")
	ErrStrategyAlreadySaved  = errors.New("you have already saved this lobby")
	ErrStrategyNotFound      = errors.New("strategy not found")
	ErrStrategyAccessDenied  = errors.New("you do not have access to this strategy")
)

// StrategyRepository abstracts persistence operations for StrategyService.
type StrategyRepository interface {
	GetLobbyByCode(code string) (*models.Lobby, error)
	StrategyExistsByUserAndLobby(userID int, lobbyCode string) (bool, error)
	CountStrategiesByUserID(userID int) (int, error)
	GetStrategySummariesByUserID(userID int, folderID *int) ([]models.StrategySummary, error)
	GetStrategyByID(id int) (*models.Strategy, error)
	SaveStrategy(s *models.Strategy) error
	UpdateStrategy(s *models.Strategy) error
	DeleteStrategy(s *models.Strategy) error
}

type defaultStrategyRepository struct{}

func (r *defaultStrategyRepository) GetLobbyByCode(code string) (*models.Lobby, error) {
	return models.GetLobbyByCode(code)
}
func (r *defaultStrategyRepository) StrategyExistsByUserAndLobby(userID int, lobbyCode string) (bool, error) {
	return models.StrategyExistsByUserAndLobby(userID, lobbyCode)
}
func (r *defaultStrategyRepository) CountStrategiesByUserID(userID int) (int, error) {
	return models.CountStrategiesByUserID(userID)
}
func (r *defaultStrategyRepository) GetStrategySummariesByUserID(userID int, folderID *int) ([]models.StrategySummary, error) {
	return models.GetStrategySummariesByUserID(userID, folderID)
}
func (r *defaultStrategyRepository) GetStrategyByID(id int) (*models.Strategy, error) {
	return models.GetStrategyByID(id)
}
func (r *defaultStrategyRepository) SaveStrategy(s *models.Strategy) error   { return s.Save() }
func (r *defaultStrategyRepository) UpdateStrategy(s *models.Strategy) error { return s.Update() }
func (r *defaultStrategyRepository) DeleteStrategy(s *models.Strategy) error { return s.Delete() }

// StrategyServiceDependencies holds injectable dependencies for StrategyService.
type StrategyServiceDependencies struct {
	Repo StrategyRepository
}

// StrategyService handles strategy-related business logic
type StrategyService struct {
	repo StrategyRepository
}

// NewStrategyService creates a new StrategyService
func NewStrategyService(deps StrategyServiceDependencies) *StrategyService {
	repo := deps.Repo
	if repo == nil {
		repo = &defaultStrategyRepository{}
	}
	return &StrategyService{repo: repo}
}

const (
	// FreeStrategyLimit is the maximum strategies free-tier users can create
	FreeStrategyLimit = 1
)

// CreateStrategyRequest wraps strategy creation input
type CreateStrategyRequest struct {
	FolderID  *int
	LobbyCode string
	Name      string
}

// StrategyResponse represents a strategy with its related lobby data
type StrategyResponse struct {
	ID            int
	UserID        int
	FolderID      *int
	Name          string
	SelectedMapID string
	LobbyCode     string
	UpdatedAt     time.Time
}

// CreateStrategy creates a new strategy for a user
func (ss *StrategyService) CreateStrategy(user *models.User, req CreateStrategyRequest) (*StrategyResponse, error) {
	if req.LobbyCode == "" {
		return nil, ErrLobbyCodeRequired
	}
	if req.Name == "" {
		return nil, ErrStrategyNameRequired
	}

	lobby, err := ss.repo.GetLobbyByCode(req.LobbyCode)
	if err != nil {
		return nil, err
	}
	if lobby == nil {
		return nil, ErrStrategyLobbyNotFound
	}

	exists, err := ss.repo.StrategyExistsByUserAndLobby(user.ID, req.LobbyCode)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrStrategyAlreadySaved
	}

	// Check free-tier limit
	if !user.IsSubscribed {
		strategyCount, err := ss.repo.CountStrategiesByUserID(user.ID)
		if err != nil {
			return nil, err
		}
		if strategyCount >= FreeStrategyLimit {
			return nil, ErrStrategyFreePlanLimit
		}
	}

	strategy := &models.Strategy{
		UserID:    user.ID,
		FolderID:  req.FolderID,
		LobbyCode: req.LobbyCode,
		Name:      req.Name,
	}

	if err := ss.repo.SaveStrategy(strategy); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.UniqueViolation {
			return nil, ErrStrategyAlreadySaved
		}
		return nil, err
	}

	return &StrategyResponse{
		ID:            strategy.ID,
		UserID:        strategy.UserID,
		FolderID:      strategy.FolderID,
		Name:          strategy.Name,
		SelectedMapID: lobby.SelectedMapId,
		LobbyCode:     lobby.Code,
		UpdatedAt:     lobby.UpdatedAt,
	}, nil
}

// GetStrategies retrieves strategies for a user, optionally filtered by folder
func (ss *StrategyService) GetStrategies(userID int, folderID *int) ([]*StrategyResponse, error) {
	summaries, err := ss.repo.GetStrategySummariesByUserID(userID, folderID)
	if err != nil {
		return nil, err
	}

	responses := make([]*StrategyResponse, 0, len(summaries))
	for _, summary := range summaries {
		responses = append(responses, &StrategyResponse{
			ID:            summary.ID,
			UserID:        summary.UserID,
			FolderID:      summary.FolderID,
			Name:          summary.Name,
			SelectedMapID: summary.SelectedMapID,
			LobbyCode:     summary.LobbyCode,
			UpdatedAt:     summary.UpdatedAt,
		})
	}

	return responses, nil
}

// UpdateStrategyRequest wraps strategy update input
type UpdateStrategyRequest struct {
	FolderID    *int
	HasFolderID bool
	Name        *string
}

// UpdateStrategy updates an existing strategy
func (ss *StrategyService) UpdateStrategy(user *models.User, strategyID int, req UpdateStrategyRequest) (*StrategyResponse, error) {
	strategy, err := ss.repo.GetStrategyByID(strategyID)
	if err != nil {
		return nil, err
	}
	if strategy == nil {
		return nil, ErrStrategyNotFound
	}

	if strategy.UserID != user.ID {
		return nil, ErrStrategyAccessDenied
	}

	if req.Name != nil {
		strategy.Name = *req.Name
	}
	if req.HasFolderID {
		strategy.FolderID = req.FolderID
	}

	if err := ss.repo.UpdateStrategy(strategy); err != nil {
		return nil, err
	}

	// Fetch lobby to build response
	lobby, err := ss.repo.GetLobbyByCode(strategy.LobbyCode)
	if err != nil {
		return nil, err
	}
	if lobby == nil {
		return nil, ErrStrategyLobbyNotFound
	}

	return &StrategyResponse{
		ID:            strategy.ID,
		UserID:        strategy.UserID,
		FolderID:      strategy.FolderID,
		Name:          strategy.Name,
		SelectedMapID: lobby.SelectedMapId,
		LobbyCode:     lobby.Code,
		UpdatedAt:     lobby.UpdatedAt,
	}, nil
}

// DeleteStrategy deletes a strategy
func (ss *StrategyService) DeleteStrategy(user *models.User, strategyID int) error {
	strategy, err := ss.repo.GetStrategyByID(strategyID)
	if err != nil {
		return err
	}
	if strategy == nil {
		return ErrStrategyNotFound
	}

	if strategy.UserID != user.ID {
		return ErrStrategyAccessDenied
	}

	return ss.repo.DeleteStrategy(strategy)
}
