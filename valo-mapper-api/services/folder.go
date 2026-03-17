package services

import (
	"errors"
	"valo-mapper-api/models"
)

// FolderService handles folder-related business logic
type FolderService struct{}

// NewFolderService creates a new FolderService
func NewFolderService() *FolderService {
	return &FolderService{}
}

// CreateFolderRequest wraps folder creation input
type CreateFolderRequest struct {
	Name           string
	ParentFolderID *int
}

// CreateFolder creates a new folder for a user
func (fs *FolderService) CreateFolder(user *models.User, req CreateFolderRequest) (*models.Folder, error) {
	if !user.IsSubscribed {
		return nil, errors.New("active subscription required to manage folders")
	}

	if req.Name == "" {
		return nil, errors.New("folder name is required")
	}

	folder := &models.Folder{
		UserID:         user.ID,
		Name:           req.Name,
		ParentFolderID: req.ParentFolderID,
	}

	if err := folder.Save(); err != nil {
		return nil, err
	}

	return folder, nil
}

// GetFolders retrieves all folders for a user
func (fs *FolderService) GetFolders(userID int) ([]models.Folder, error) {
	folders, err := models.GetFoldersByUserID(userID)
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
		return nil, errors.New("active subscription required to manage folders")
	}

	folder, err := models.GetFolderByID(folderID)
	if err != nil {
		return nil, err
	}
	if folder == nil {
		return nil, errors.New("folder not found")
	}

	if folder.UserID != user.ID {
		return nil, errors.New("you do not have access to this folder")
	}

	if req.Name != nil {
		folder.Name = *req.Name
	}
	if req.ParentFolderID != nil {
		folder.ParentFolderID = req.ParentFolderID
	}

	if err := folder.Update(); err != nil {
		return nil, err
	}

	return folder, nil
}

// DeleteFolder deletes a folder
func (fs *FolderService) DeleteFolder(user *models.User, folderID int) error {
	if !user.IsSubscribed {
		return errors.New("active subscription required to manage folders")
	}

	folder, err := models.GetFolderByID(folderID)
	if err != nil {
		return err
	}
	if folder == nil {
		return errors.New("folder not found")
	}

	if folder.UserID != user.ID {
		return errors.New("you do not have access to this folder")
	}

	return folder.Delete()
}
