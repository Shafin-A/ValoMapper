package models

import (
	"context"
	"time"
	"valo-mapper-api/db"

	"github.com/jackc/pgx/v5"
)

type Strategy struct {
	ID        int       `json:"id"`
	UserID    int       `json:"userId"`
	FolderID  *int      `json:"folderId,omitempty"`
	LobbyCode string    `json:"lobbyCode"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (s *Strategy) Save() error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	return conn.QueryRow(context.Background(),
		`INSERT INTO strategies (user_id, folder_id, lobby_code, name, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		RETURNING id, created_at, updated_at`,
		s.UserID, s.FolderID, s.LobbyCode, s.Name).Scan(
		&s.ID,
		&s.CreatedAt,
		&s.UpdatedAt,
	)
}

func (s *Strategy) Update() error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	return conn.QueryRow(context.Background(),
		`UPDATE strategies
		SET name = $1, folder_id = $2, updated_at = NOW()
		WHERE id = $3
		RETURNING updated_at`,
		s.Name, s.FolderID, s.ID).Scan(&s.UpdatedAt)
}

func (s *Strategy) Delete() error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	_, err = conn.Exec(context.Background(), `DELETE FROM strategies WHERE id = $1`, s.ID)
	return err
}

func GetStrategyByID(id int) (*Strategy, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	strategy := &Strategy{}

	err = conn.QueryRow(context.Background(),
		`SELECT id, user_id, folder_id, lobby_code, name, created_at, updated_at
		FROM strategies
		WHERE id = $1`, id).Scan(
		&strategy.ID,
		&strategy.UserID,
		&strategy.FolderID,
		&strategy.LobbyCode,
		&strategy.Name,
		&strategy.CreatedAt,
		&strategy.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return strategy, nil
}

func GetStrategiesByUserID(userID int) ([]Strategy, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	rows, err := conn.Query(context.Background(),
		`SELECT id, user_id, folder_id, lobby_code, name, created_at, updated_at
		FROM strategies
		WHERE user_id = $1
		ORDER BY created_at DESC`,
		userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var strategies []Strategy
	for rows.Next() {
		var strategy Strategy
		err := rows.Scan(
			&strategy.ID,
			&strategy.UserID,
			&strategy.FolderID,
			&strategy.LobbyCode,
			&strategy.Name,
			&strategy.CreatedAt,
			&strategy.UpdatedAt,
		)

		if err != nil {
			return nil, err
		}

		strategies = append(strategies, strategy)
	}

	return strategies, nil
}

func GetStrategiesByFolderID(userID int, folderID int) ([]Strategy, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	rows, err := conn.Query(context.Background(),
		`SELECT id, user_id, folder_id, lobby_code, name, created_at, updated_at
		FROM strategies
		WHERE user_id = $1 AND folder_id = $2
		ORDER BY created_at DESC`,
		userID, folderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var strategies []Strategy
	for rows.Next() {
		var strategy Strategy
		err := rows.Scan(
			&strategy.ID,
			&strategy.UserID,
			&strategy.FolderID,
			&strategy.LobbyCode,
			&strategy.Name,
			&strategy.CreatedAt,
			&strategy.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		strategies = append(strategies, strategy)
	}

	return strategies, nil
}
