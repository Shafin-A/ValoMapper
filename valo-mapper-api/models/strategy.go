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

type StrategySummary struct {
	ID            int
	UserID        int
	FolderID      *int
	Name          string
	LobbyCode     string
	SelectedMapID string
	UpdatedAt     time.Time
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

// GetStrategySummariesByUserID returns strategy metadata without loading canvas state.
func GetStrategySummariesByUserID(userID int, folderID *int) ([]StrategySummary, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	query := `
		SELECT s.id, s.user_id, s.folder_id, s.name, s.lobby_code,
		       COALESCE(l.selected_map_id, ''), l.updated_at
		FROM strategies s
		JOIN lobbies l ON l.code = s.lobby_code
		WHERE s.user_id = $1`
	args := []any{userID}

	if folderID != nil {
		query += " AND s.folder_id = $2"
		args = append(args, *folderID)
	}

	query += " ORDER BY s.created_at DESC"

	rows, err := conn.Query(context.Background(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	summaries := make([]StrategySummary, 0)
	for rows.Next() {
		var summary StrategySummary
		if err := rows.Scan(
			&summary.ID,
			&summary.UserID,
			&summary.FolderID,
			&summary.Name,
			&summary.LobbyCode,
			&summary.SelectedMapID,
			&summary.UpdatedAt,
		); err != nil {
			return nil, err
		}
		summaries = append(summaries, summary)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return summaries, nil
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

	return scanStrategies(rows)
}

func scanStrategies(rows pgx.Rows) ([]Strategy, error) {
	var strategies []Strategy
	for rows.Next() {
		var strategy Strategy
		if err := rows.Scan(
			&strategy.ID,
			&strategy.UserID,
			&strategy.FolderID,
			&strategy.LobbyCode,
			&strategy.Name,
			&strategy.CreatedAt,
			&strategy.UpdatedAt,
		); err != nil {
			return nil, err
		}
		strategies = append(strategies, strategy)
	}

	if err := rows.Err(); err != nil {
		return nil, err
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

	return scanStrategies(rows)
}

func StrategyExistsByUserAndLobby(userID int, lobbyCode string) (bool, error) {
	conn, err := db.GetDB()
	if err != nil {
		return false, err
	}

	var exists bool
	err = conn.QueryRow(context.Background(),
		`SELECT EXISTS(
			SELECT 1 FROM strategies
			WHERE user_id = $1 AND lobby_code = $2
		)`,
		userID, lobbyCode,
	).Scan(&exists)
	if err != nil {
		return false, err
	}
	return exists, nil
}

func CountStrategiesByUserID(userID int) (int, error) {
	conn, err := db.GetDB()
	if err != nil {
		return 0, err
	}

	var count int
	err = conn.QueryRow(context.Background(),
		`SELECT COUNT(*)
		FROM strategies
		WHERE user_id = $1`,
		userID,
	).Scan(&count)
	if err != nil {
		return 0, err
	}

	return count, nil
}

func DeleteExcessStrategiesForUser(userID int, keepCount int) (int64, error) {
	conn, err := db.GetDB()
	if err != nil {
		return 0, err
	}

	tag, err := conn.Exec(context.Background(),
		`DELETE FROM strategies
		WHERE user_id = $1
		AND (
			SELECT COUNT(*) FROM strategies s2
			WHERE s2.user_id = $1 AND s2.id > strategies.id
		) >= $2`,
		userID, keepCount)
	if err != nil {
		return 0, err
	}

	return tag.RowsAffected(), nil
}
