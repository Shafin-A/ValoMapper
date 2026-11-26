package handlers

import (
	"context"
	"net/http"
	"testing"
	"time"
	"valo-mapper-api/models"
	"valo-mapper-api/services"
	"valo-mapper-api/testutils"
)

func newTestAuthenticatedUser() *models.User {
	id := 7
	uid := "test-firebase-uid"
	email := "test@example.com"
	name := "Test User"
	return &models.User{
		ID:            id,
		FirebaseUID:   &uid,
		Email:         &email,
		Name:          &name,
		EmailVerified: true,
		IsSubscribed:  true,
	}
}

func requestWithUser(req *http.Request, user *models.User) *http.Request {
	return req.WithContext(context.WithValue(req.Context(), userContextKey{}, user))
}

func authedRequest(t *testing.T, user *models.User, method, path string, body any) *http.Request {
	t.Helper()
	return requestWithUser(testutils.MakeRequest(t, method, path, body, "valid-token"), user)
}

func useStrategyRepo(t *testing.T, repo services.StrategyRepository) {
	t.Helper()
	original := strategyService
	strategyService = services.NewStrategyService(services.StrategyServiceDependencies{Repo: repo})
	t.Cleanup(func() { strategyService = original })
}

func useStrategyLibraryRepo(t *testing.T, repo services.StrategyLibraryRepository) {
	t.Helper()
	original := strategyLibraryService
	strategyLibraryService = services.NewStrategyLibraryService(services.StrategyLibraryServiceDependencies{Repo: repo})
	t.Cleanup(func() { strategyLibraryService = original })
}

type mockStrategyLibraryHandlerRepo struct {
	searchFn       func(params models.StrategySearchParams) (*models.StrategySearchResult, error)
	listTagsFn     func(userID int) ([]string, error)
	getStrategyFn  func(id int) (*models.Strategy, error)
	getLobbyMetaFn func(code string) (*models.LobbyMeta, error)
	countFn        func(userID int) (int, error)
	saveFn         func(s *models.Strategy) error
	copyLobbyFn    func(sourceCode string) (string, error)
	deleteLobbyFn  func(code string) error
	getFolderFn    func(folderID int) (*models.Folder, error)
	getTagsByIDsFn func(userID int, ids []int) (map[int][]string, error)
	bulkUpdateFn   func(params models.BulkUpdateStrategyParams) (int64, error)
	bulkDeleteFn   func(userID int, ids []int) (int64, error)
}

func (m *mockStrategyLibraryHandlerRepo) SearchStrategySummaries(params models.StrategySearchParams) (*models.StrategySearchResult, error) {
	if m.searchFn == nil {
		return &models.StrategySearchResult{}, nil
	}
	return m.searchFn(params)
}

func (m *mockStrategyLibraryHandlerRepo) ListStrategyTags(userID int) ([]string, error) {
	if m.listTagsFn == nil {
		return nil, nil
	}
	return m.listTagsFn(userID)
}

func (m *mockStrategyLibraryHandlerRepo) GetStrategyByID(id int) (*models.Strategy, error) {
	if m.getStrategyFn == nil {
		return nil, nil
	}
	return m.getStrategyFn(id)
}

func (m *mockStrategyLibraryHandlerRepo) GetLobbyMetaByCode(code string) (*models.LobbyMeta, error) {
	if m.getLobbyMetaFn == nil {
		return nil, nil
	}
	return m.getLobbyMetaFn(code)
}

func (m *mockStrategyLibraryHandlerRepo) CountStrategiesByUserID(userID int) (int, error) {
	if m.countFn == nil {
		return 0, nil
	}
	return m.countFn(userID)
}

func (m *mockStrategyLibraryHandlerRepo) SaveStrategy(s *models.Strategy) error {
	if m.saveFn == nil {
		return nil
	}
	return m.saveFn(s)
}

func (m *mockStrategyLibraryHandlerRepo) CopyLobby(sourceCode string) (string, error) {
	if m.copyLobbyFn == nil {
		return "", nil
	}
	return m.copyLobbyFn(sourceCode)
}

func (m *mockStrategyLibraryHandlerRepo) DeleteLobby(code string) error {
	if m.deleteLobbyFn == nil {
		return nil
	}
	return m.deleteLobbyFn(code)
}

func (m *mockStrategyLibraryHandlerRepo) GetFolderByID(folderID int) (*models.Folder, error) {
	if m.getFolderFn == nil {
		return nil, nil
	}
	return m.getFolderFn(folderID)
}

func (m *mockStrategyLibraryHandlerRepo) GetStrategyTagsByIDs(userID int, ids []int) (map[int][]string, error) {
	if m.getTagsByIDsFn == nil {
		result := make(map[int][]string, len(ids))
		for _, id := range ids {
			result[id] = []string{}
		}
		return result, nil
	}
	return m.getTagsByIDsFn(userID, ids)
}

func (m *mockStrategyLibraryHandlerRepo) BulkUpdateStrategies(params models.BulkUpdateStrategyParams) (int64, error) {
	if m.bulkUpdateFn == nil {
		return int64(len(params.IDs)), nil
	}
	return m.bulkUpdateFn(params)
}

func (m *mockStrategyLibraryHandlerRepo) BulkDeleteStrategies(userID int, ids []int) (int64, error) {
	if m.bulkDeleteFn == nil {
		return int64(len(ids)), nil
	}
	return m.bulkDeleteFn(userID, ids)
}

func useFolderRepo(t *testing.T, repo services.FolderRepository) {
	t.Helper()
	original := folderService
	folderService = services.NewFolderService(services.FolderServiceDependencies{Repo: repo})
	t.Cleanup(func() { folderService = original })
}

func useUserRepo(t *testing.T, repo services.UserRepository) {
	t.Helper()
	original := userService
	userService = services.NewUserService(services.UserServiceDependencies{Repo: repo})
	t.Cleanup(func() { userService = original })
}

func useFirebaseAuth(t *testing.T, client FirebaseAuthInterface) {
	t.Helper()
	original := firebaseAuthClient
	firebaseAuthClient = client
	t.Cleanup(func() { firebaseAuthClient = original })
}

type mockStrategyHandlerRepo struct {
	getLobbyMetaFn    func(code string) (*models.LobbyMeta, error)
	existsFn          func(userID int, lobbyCode string) (bool, error)
	countFn           func(userID int) (int, error)
	summariesFn       func(userID int, folderID *int) ([]models.StrategySummary, error)
	getStrategyByIDFn func(id int) (*models.Strategy, error)
	saveFn            func(s *models.Strategy) error
	updateFn          func(s *models.Strategy) error
	deleteFn          func(s *models.Strategy) error
}

func (m *mockStrategyHandlerRepo) GetLobbyMetaByCode(code string) (*models.LobbyMeta, error) {
	if m.getLobbyMetaFn == nil {
		return nil, nil
	}
	return m.getLobbyMetaFn(code)
}

func (m *mockStrategyHandlerRepo) StrategyExistsByUserAndLobby(userID int, lobbyCode string) (bool, error) {
	if m.existsFn == nil {
		return false, nil
	}
	return m.existsFn(userID, lobbyCode)
}

func (m *mockStrategyHandlerRepo) CountStrategiesByUserID(userID int) (int, error) {
	if m.countFn == nil {
		return 0, nil
	}
	return m.countFn(userID)
}

func (m *mockStrategyHandlerRepo) GetStrategySummariesByUserID(userID int, folderID *int) ([]models.StrategySummary, error) {
	if m.summariesFn == nil {
		return nil, nil
	}
	return m.summariesFn(userID, folderID)
}

func (m *mockStrategyHandlerRepo) GetStrategyByID(id int) (*models.Strategy, error) {
	if m.getStrategyByIDFn == nil {
		return nil, nil
	}
	return m.getStrategyByIDFn(id)
}

func (m *mockStrategyHandlerRepo) SaveStrategy(s *models.Strategy) error {
	if m.saveFn == nil {
		return nil
	}
	return m.saveFn(s)
}

func (m *mockStrategyHandlerRepo) UpdateStrategy(s *models.Strategy) error {
	if m.updateFn == nil {
		return nil
	}
	return m.updateFn(s)
}

func (m *mockStrategyHandlerRepo) DeleteStrategy(s *models.Strategy) error {
	if m.deleteFn == nil {
		return nil
	}
	return m.deleteFn(s)
}

type mockFolderHandlerRepo struct {
	getFoldersFn func(userID int) ([]models.Folder, error)
	getFolderFn  func(id int) (*models.Folder, error)
	saveFn       func(f *models.Folder) error
	updateFn     func(f *models.Folder) error
	deleteFn     func(f *models.Folder) error
}

func (m *mockFolderHandlerRepo) GetFoldersByUserID(userID int) ([]models.Folder, error) {
	if m.getFoldersFn == nil {
		return nil, nil
	}
	return m.getFoldersFn(userID)
}

func (m *mockFolderHandlerRepo) GetFolderByID(folderID int) (*models.Folder, error) {
	if m.getFolderFn == nil {
		return nil, nil
	}
	return m.getFolderFn(folderID)
}

func (m *mockFolderHandlerRepo) SaveFolder(f *models.Folder) error {
	if m.saveFn == nil {
		return nil
	}
	return m.saveFn(f)
}

func (m *mockFolderHandlerRepo) UpdateFolder(f *models.Folder) error {
	if m.updateFn == nil {
		return nil
	}
	return m.updateFn(f)
}

func (m *mockFolderHandlerRepo) DeleteFolder(f *models.Folder) error {
	if m.deleteFn == nil {
		return nil
	}
	return m.deleteFn(f)
}

type mockUserHandlerRepo struct {
	getByFirebaseUIDFn   func(uid string) (*models.User, error)
	getByIDFn            func(id int) (*models.User, error)
	saveFn               func(u *models.User) error
	updateFn             func(u *models.User) error
	deleteFn             func(u *models.User) error
	updateSubscriptionFn func(u *models.User, isSubscribed bool, endedAt *time.Time) error
}

func (m *mockUserHandlerRepo) GetUserByFirebaseUID(uid string) (*models.User, error) {
	if m.getByFirebaseUIDFn == nil {
		return nil, nil
	}
	return m.getByFirebaseUIDFn(uid)
}

func (m *mockUserHandlerRepo) GetUserByID(id int) (*models.User, error) {
	if m.getByIDFn == nil {
		return nil, nil
	}
	return m.getByIDFn(id)
}

func (m *mockUserHandlerRepo) SaveUser(u *models.User) error {
	if m.saveFn == nil {
		return nil
	}
	return m.saveFn(u)
}

func (m *mockUserHandlerRepo) UpdateUser(u *models.User) error {
	if m.updateFn == nil {
		return nil
	}
	return m.updateFn(u)
}

func (m *mockUserHandlerRepo) DeleteUser(u *models.User) error {
	if m.deleteFn == nil {
		return nil
	}
	return m.deleteFn(u)
}

func (m *mockUserHandlerRepo) UpdateSubscriptionStatus(u *models.User, isSubscribed bool, endedAt *time.Time) error {
	if m.updateSubscriptionFn == nil {
		return nil
	}
	return m.updateSubscriptionFn(u, isSubscribed, endedAt)
}
