package services

import (
	"errors"
	"valo-mapper-api/models"
)

var (
	ErrFolderSubscriptionRequired = errors.New("active subscription required to manage folders")
	ErrFolderNameRequired         = errors.New("folder name is required")
	ErrFolderNotFound             = errors.New("folder not found")
	ErrFolderAccessDenied         = errors.New("you do not have access to this folder")
)

// FolderRepository abstracts persistence operations for FolderService.
type FolderRepository interface {
	GetFoldersByUserID(userID int) ([]models.Folder, error)
	GetFolderByID(folderID int) (*models.Folder, error)
	SaveFolder(f *models.Folder) error
	UpdateFolder(f *models.Folder) error
	DeleteFolder(f *models.Folder) error
}

type defaultFolderRepository struct{}

func (r *defaultFolderRepository) GetFoldersByUserID(userID int) ([]models.Folder, error) {
	return models.GetFoldersByUserID(userID)
}
func (r *defaultFolderRepository) GetFolderByID(folderID int) (*models.Folder, error) {
	return models.GetFolderByID(folderID)
}
func (r *defaultFolderRepository) SaveFolder(f *models.Folder) error   { return f.Save() }
func (r *defaultFolderRepository) UpdateFolder(f *models.Folder) error { return f.Update() }
func (r *defaultFolderRepository) DeleteFolder(f *models.Folder) error { return f.Delete() }

// FolderServiceDependencies holds injectable dependencies for FolderService.
type FolderServiceDependencies struct {
	Repo FolderRepository
}

// FolderService handles folder-related business logic
type FolderService struct {
	repo FolderRepository
}

// NewFolderService creates a new FolderService
func NewFolderService(deps FolderServiceDependencies) *FolderService {
	repo := deps.Repo
	if repo == nil {
		repo = &defaultFolderRepository{}
	}
	return &FolderService{repo: repo}
}

// CreateFolderRequest wraps folder creation input
type CreateFolderRequest struct {
	Name           string
	ParentFolderID *int
}

// CreateFolder creates a new folder for a user
func (fs *FolderService) CreateFolder(user *models.User, req CreateFolderRequest) (*models.Folder, error) {
	if !user.IsSubscribed {
		return nil, ErrFolderSubscriptionRequired
	}

	if req.Name == "" {
		return nil, ErrFolderNameRequired
	}

	folder := &models.Folder{
		UserID:         user.ID,
		Name:           req.Name,
		ParentFolderID: req.ParentFolderID,
	}

	if err := fs.repo.SaveFolder(folder); err != nil {
		return nil, err
	}

	return folder, nil
}

// GetFolders retrieves all folders for a user
func (fs *FolderService) GetFolders(userID int) ([]models.Folder, error) {
	folders, err := fs.repo.GetFoldersByUserID(userID)
	if err != nil {
		return nil, err
	}

	if folders == nil {
		folders = []models.Folder{}
	}

	return folders, nil
}

// UpdateFolderRequest wraps folder update input
type UpdateFolderRequest struct {
	Name           *string
	ParentFolderID *int
}

// UpdateFolder updates an existing folder
func (fs *FolderService) UpdateFolder(user *models.User, folderID int, req UpdateFolderRequest) (*models.Folder, error) {
	if !user.IsSubscribed {
		return nil, ErrFolderSubscriptionRequired
	}

	folder, err := fs.repo.GetFolderByID(folderID)
	if err != nil {
		return nil, err
	}
	if folder == nil {
		return nil, ErrFolderNotFound
	}

	if folder.UserID != user.ID {
		return nil, ErrFolderAccessDenied
	}

	if req.Name != nil {
		folder.Name = *req.Name
	}
	if req.ParentFolderID != nil {
		folder.ParentFolderID = req.ParentFolderID
	}

	if err := fs.repo.UpdateFolder(folder); err != nil {
		return nil, err
	}

	return folder, nil
}

// DeleteFolder deletes a folder
func (fs *FolderService) DeleteFolder(user *models.User, folderID int) error {
	if !user.IsSubscribed {
		return ErrFolderSubscriptionRequired
	}

	folder, err := fs.repo.GetFolderByID(folderID)
	if err != nil {
		return err
	}
	if folder == nil {
		return ErrFolderNotFound
	}

	if folder.UserID != user.ID {
		return ErrFolderAccessDenied
	}

	return fs.repo.DeleteFolder(folder)
}
