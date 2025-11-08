package models

import (
	"context"
	"database/sql"
	"time"
	"valo-mapper-api/db"
)

type Folder struct {
	ID             int       `json:"id"`
	UserID         int       `json:"userId"`
	Name           string    `json:"name"`
	ParentFolderID *int      `json:"parentFolderId,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

func (f *Folder) Save() error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	err = conn.QueryRow(context.Background(), `
		INSERT INTO folders (user_id, name, parent_folder_id, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`, f.UserID, f.Name, f.ParentFolderID).Scan(
		&f.ID,
		&f.CreatedAt,
		&f.UpdatedAt,
	)

	return err
}

func (f *Folder) Update() error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	err = conn.QueryRow(context.Background(), `
		UPDATE folders
		SET name = $1, parent_folder_id = $2, updated_at = NOW()
		WHERE id = $3
		RETURNING updated_at
	`, f.Name, f.ParentFolderID, f.ID).Scan(&f.UpdatedAt)

	return err
}

func (f *Folder) Delete() error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	_, err = conn.Exec(context.Background(), `DELETE FROM folders WHERE id = $1`, f.ID)
	return err
}

func GetFolderByID(id int) (*Folder, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	folder := &Folder{}

	err = conn.QueryRow(context.Background(), `
		SELECT id, user_id, name, parent_folder_id, created_at, updated_at
		FROM folders
		WHERE id = $1
	`, id).Scan(
		&folder.ID,
		&folder.UserID,
		&folder.Name,
		&folder.ParentFolderID,
		&folder.CreatedAt,
		&folder.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}

	if err != nil {
		return nil, err
	}

	return folder, nil
}

func GetFoldersByUserID(userID int) ([]Folder, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	rows, err := conn.Query(context.Background(), `
		SELECT id, user_id, name, parent_folder_id, created_at, updated_at
		FROM folders
		WHERE user_id = $1
		ORDER BY name ASC
	`, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []Folder
	for rows.Next() {
		var folder Folder
		err := rows.Scan(
			&folder.ID,
			&folder.UserID,
			&folder.Name,
			&folder.ParentFolderID,
			&folder.CreatedAt,
			&folder.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		folders = append(folders, folder)
	}

	return folders, nil
}
