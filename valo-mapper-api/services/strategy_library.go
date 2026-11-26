package services

import (
	"strings"
	"unicode/utf8"

	"valo-mapper-api/models"
)

const (
	StrategyLibraryDefaultLimit = 50
	StrategyLibraryMaxLimit     = 100
	StrategyLibraryMaxBulk      = 100
	strategyNameMaxLength       = 255
)

type StrategyLibraryRepository interface {
	SearchStrategySummaries(params models.StrategySearchParams) (*models.StrategySearchResult, error)
	ListStrategyTags(userID int) ([]string, error)
	GetStrategyByID(id int) (*models.Strategy, error)
	GetLobbyMetaByCode(code string) (*models.LobbyMeta, error)
	CountStrategiesByUserID(userID int) (int, error)
	SaveStrategy(s *models.Strategy) error
	CopyLobby(sourceCode string) (string, error)
	DeleteLobby(code string) error
	GetFolderByID(folderID int) (*models.Folder, error)
	GetStrategyTagsByIDs(userID int, ids []int) (map[int][]string, error)
	BulkUpdateStrategies(params models.BulkUpdateStrategyParams) (int64, error)
	BulkDeleteStrategies(userID int, ids []int) (int64, error)
}

type defaultStrategyLibraryRepository struct{}

func (r *defaultStrategyLibraryRepository) SearchStrategySummaries(params models.StrategySearchParams) (*models.StrategySearchResult, error) {
	return models.SearchStrategySummaries(params)
}
func (r *defaultStrategyLibraryRepository) ListStrategyTags(userID int) ([]string, error) {
	return models.ListStrategyTags(userID)
}
func (r *defaultStrategyLibraryRepository) GetStrategyByID(id int) (*models.Strategy, error) {
	return models.GetStrategyByID(id)
}
func (r *defaultStrategyLibraryRepository) GetLobbyMetaByCode(code string) (*models.LobbyMeta, error) {
	return models.GetLobbyMetaByCode(code)
}
func (r *defaultStrategyLibraryRepository) CountStrategiesByUserID(userID int) (int, error) {
	return models.CountStrategiesByUserID(userID)
}
func (r *defaultStrategyLibraryRepository) SaveStrategy(s *models.Strategy) error {
	return s.Save()
}
func (r *defaultStrategyLibraryRepository) CopyLobby(sourceCode string) (string, error) {
	return models.CopyLobby(sourceCode)
}
func (r *defaultStrategyLibraryRepository) DeleteLobby(code string) error {
	return models.DeleteLobby(code)
}
func (r *defaultStrategyLibraryRepository) GetFolderByID(folderID int) (*models.Folder, error) {
	return models.GetFolderByID(folderID)
}
func (r *defaultStrategyLibraryRepository) GetStrategyTagsByIDs(userID int, ids []int) (map[int][]string, error) {
	return models.GetStrategyTagsByIDs(userID, ids)
}
func (r *defaultStrategyLibraryRepository) BulkUpdateStrategies(params models.BulkUpdateStrategyParams) (int64, error) {
	return models.BulkUpdateStrategies(params)
}
func (r *defaultStrategyLibraryRepository) BulkDeleteStrategies(userID int, ids []int) (int64, error) {
	return models.BulkDeleteStrategies(userID, ids)
}

type StrategyLibraryServiceDependencies struct {
	Repo StrategyLibraryRepository
}

type StrategyLibraryService struct {
	repo StrategyLibraryRepository
}

func NewStrategyLibraryService(deps StrategyLibraryServiceDependencies) *StrategyLibraryService {
	repo := deps.Repo
	if repo == nil {
		repo = &defaultStrategyLibraryRepository{}
	}
	return &StrategyLibraryService{repo: repo}
}

type SearchStrategiesRequest struct {
	Query    string
	Tags     []string
	TagMode  string
	Favorite *bool
	MapID    string
	Side     string
	Sort     string
	Limit    int
	Offset   int
}

type SearchStrategiesResult struct {
	Strategies []*StrategyResponse
	Total      int
	Limit      int
	Offset     int
}

func (s *StrategyLibraryService) SearchStrategies(userID int, req SearchStrategiesRequest) (*SearchStrategiesResult, error) {
	tags, err := NormalizeStrategyTags(req.Tags)
	if err != nil {
		return nil, err
	}

	tagMode := strings.ToLower(strings.TrimSpace(req.TagMode))
	if tagMode == "" {
		tagMode = "all"
	}
	if tagMode != "all" && tagMode != "any" {
		return nil, ErrStrategyInvalidTagMode
	}

	side := strings.ToLower(strings.TrimSpace(req.Side))
	switch side {
	case "", "attack":
	case "defense", "defend":
		side = "defense"
	default:
		return nil, ErrStrategyInvalidSide
	}

	sort := strings.ToLower(strings.TrimSpace(req.Sort))
	if sort == "" {
		sort = "updated"
	}
	if sort != "updated" && sort != "created" && sort != "name" {
		return nil, ErrStrategyInvalidSort
	}

	limit := req.Limit
	if limit <= 0 {
		limit = StrategyLibraryDefaultLimit
	}
	if limit > StrategyLibraryMaxLimit {
		limit = StrategyLibraryMaxLimit
	}
	offset := req.Offset
	if offset < 0 {
		offset = 0
	}

	result, err := s.repo.SearchStrategySummaries(models.StrategySearchParams{
		UserID:   userID,
		Query:    strings.TrimSpace(req.Query),
		Tags:     tags,
		TagMode:  tagMode,
		Favorite: req.Favorite,
		MapID:    strings.TrimSpace(req.MapID),
		Side:     side,
		Sort:     sort,
		Limit:    limit,
		Offset:   offset,
	})
	if err != nil {
		return nil, err
	}

	responses := make([]*StrategyResponse, 0, len(result.Strategies))
	for _, summary := range result.Strategies {
		responses = append(responses, newStrategyResponseFromSummary(summary))
	}

	return &SearchStrategiesResult{
		Strategies: responses,
		Total:      result.Total,
		Limit:      limit,
		Offset:     offset,
	}, nil
}

func (s *StrategyLibraryService) GetTags(userID int) ([]string, error) {
	return s.repo.ListStrategyTags(userID)
}

func (s *StrategyLibraryService) DuplicateStrategy(user *models.User, strategyID int) (*StrategyResponse, error) {
	source, err := s.repo.GetStrategyByID(strategyID)
	if err != nil {
		return nil, err
	}
	if source == nil {
		return nil, ErrStrategyNotFound
	}
	if source.UserID != user.ID {
		return nil, ErrStrategyAccessDenied
	}

	if !user.IsSubscribed {
		strategyCount, err := s.repo.CountStrategiesByUserID(user.ID)
		if err != nil {
			return nil, err
		}
		if strategyCount >= FreeStrategyLimit {
			return nil, ErrStrategyFreePlanLimit
		}
	}

	newLobbyCode, err := s.repo.CopyLobby(source.LobbyCode)
	if err != nil {
		return nil, err
	}

	duplicate := &models.Strategy{
		UserID:     user.ID,
		FolderID:   source.FolderID,
		LobbyCode:  newLobbyCode,
		Name:       duplicateStrategyName(source.Name),
		Tags:       source.Tags,
		IsFavorite: source.IsFavorite,
	}

	if err := s.repo.SaveStrategy(duplicate); err != nil {
		_ = s.repo.DeleteLobby(newLobbyCode)
		return nil, err
	}

	lobby, err := s.repo.GetLobbyMetaByCode(newLobbyCode)
	if err != nil {
		return nil, err
	}
	if lobby == nil {
		return nil, ErrStrategyLobbyNotFound
	}

	return &StrategyResponse{
		ID:            duplicate.ID,
		UserID:        duplicate.UserID,
		FolderID:      duplicate.FolderID,
		Name:          duplicate.Name,
		SelectedMapID: lobby.SelectedMapID,
		MapSide:       lobby.MapSide,
		Tags:          responseTags(duplicate.Tags),
		IsFavorite:    duplicate.IsFavorite,
		LobbyCode:     lobby.Code,
		UpdatedAt:     lobby.UpdatedAt,
	}, nil
}

type BulkUpdateStrategiesRequest struct {
	IDs         []int
	FolderID    *int
	HasFolderID bool
	IsFavorite  *bool
	AddTags     []string
	RemoveTags  []string
}

func (s *StrategyLibraryService) BulkUpdate(user *models.User, req BulkUpdateStrategiesRequest) (int64, error) {
	ids := uniquePositiveIDs(req.IDs)
	if len(ids) == 0 || len(ids) > StrategyLibraryMaxBulk {
		return 0, ErrStrategyInvalidSelection
	}

	addTags, err := NormalizeStrategyTags(req.AddTags)
	if err != nil {
		return 0, err
	}
	removeTags, err := NormalizeStrategyTags(req.RemoveTags)
	if err != nil {
		return 0, err
	}

	if req.HasFolderID && req.FolderID != nil {
		folder, err := s.repo.GetFolderByID(*req.FolderID)
		if err != nil {
			return 0, err
		}
		if folder == nil {
			return 0, ErrFolderNotFound
		}
		if folder.UserID != user.ID {
			return 0, ErrFolderAccessDenied
		}
	}

	currentTags, err := s.repo.GetStrategyTagsByIDs(user.ID, ids)
	if err != nil {
		return 0, err
	}
	if len(currentTags) != len(ids) {
		return 0, ErrStrategyAccessDenied
	}

	for _, tags := range currentTags {
		if len(mergeStrategyTags(tags, addTags, removeTags)) > MaxStrategyTags {
			return 0, ErrStrategyTooManyTags
		}
	}

	return s.repo.BulkUpdateStrategies(models.BulkUpdateStrategyParams{
		UserID:      user.ID,
		IDs:         ids,
		FolderID:    req.FolderID,
		HasFolderID: req.HasFolderID,
		IsFavorite:  req.IsFavorite,
		AddTags:     addTags,
		RemoveTags:  removeTags,
	})
}

func (s *StrategyLibraryService) BulkDelete(user *models.User, ids []int) (int64, error) {
	uniqueIDs := uniquePositiveIDs(ids)
	if len(uniqueIDs) == 0 || len(uniqueIDs) > StrategyLibraryMaxBulk {
		return 0, ErrStrategyInvalidSelection
	}

	currentTags, err := s.repo.GetStrategyTagsByIDs(user.ID, uniqueIDs)
	if err != nil {
		return 0, err
	}
	if len(currentTags) != len(uniqueIDs) {
		return 0, ErrStrategyAccessDenied
	}

	return s.repo.BulkDeleteStrategies(user.ID, uniqueIDs)
}

func uniquePositiveIDs(ids []int) []int {
	seen := make(map[int]struct{}, len(ids))
	result := make([]int, 0, len(ids))
	for _, id := range ids {
		if id <= 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		result = append(result, id)
	}
	return result
}

func mergeStrategyTags(current, add, remove []string) []string {
	removed := make(map[string]struct{}, len(remove))
	for _, tag := range remove {
		removed[tag] = struct{}{}
	}

	seen := make(map[string]struct{}, len(current)+len(add))
	result := make([]string, 0, len(current)+len(add))
	for _, tag := range append(append([]string{}, current...), add...) {
		if _, ok := removed[tag]; ok {
			continue
		}
		if _, ok := seen[tag]; ok {
			continue
		}
		seen[tag] = struct{}{}
		result = append(result, tag)
	}

	return result
}

func duplicateStrategyName(name string) string {
	const suffix = " (copy)"
	runes := []rune(name)
	maxBase := strategyNameMaxLength - utf8.RuneCountInString(suffix)
	if len(runes) > maxBase {
		runes = runes[:maxBase]
	}
	return string(runes) + suffix
}
