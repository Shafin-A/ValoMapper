package models

import (
	"context"
	"fmt"
	"strings"

	"valo-mapper-api/db"
)

type StrategySearchParams struct {
	UserID   int
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

type StrategySearchResult struct {
	Strategies []StrategySummary
	Total      int
}

func SearchStrategySummaries(params StrategySearchParams) (*StrategySearchResult, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	where := []string{"s.user_id = $1"}
	args := []any{params.UserID}
	next := 2

	if query := strings.TrimSpace(params.Query); query != "" {
		where = append(where, fmt.Sprintf("POSITION(LOWER($%d) IN LOWER(s.name)) > 0", next))
		args = append(args, query)
		next++
	}

	if len(params.Tags) > 0 {
		operator := "@>"
		if params.TagMode == "any" {
			operator = "&&"
		}
		where = append(where, fmt.Sprintf("s.tags %s $%d::text[]", operator, next))
		args = append(args, params.Tags)
		next++
	}

	if params.Favorite != nil {
		where = append(where, fmt.Sprintf("s.is_favorite = $%d", next))
		args = append(args, *params.Favorite)
		next++
	}

	if params.MapID != "" {
		where = append(where, fmt.Sprintf("l.selected_map_id = $%d", next))
		args = append(args, params.MapID)
		next++
	}

	switch params.Side {
	case "defense", "defend":
		where = append(where, "l.map_side IN ('defense', 'defend')")
	case "attack":
		where = append(where, fmt.Sprintf("l.map_side = $%d", next))
		args = append(args, "attack")
		next++
	}

	whereSQL := strings.Join(where, " AND ")
	fromSQL := ` FROM strategies s JOIN lobbies l ON l.code = s.lobby_code WHERE ` + whereSQL

	var total int
	if err := conn.QueryRow(context.Background(), "SELECT COUNT(*)"+fromSQL, args...).Scan(&total); err != nil {
		return nil, err
	}

	limit := params.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	offset := params.Offset
	if offset < 0 {
		offset = 0
	}

	orderSQL := "l.updated_at DESC, s.id DESC"
	switch params.Sort {
	case "created":
		orderSQL = "s.created_at DESC, s.id DESC"
	case "name":
		orderSQL = "LOWER(s.name) ASC, s.id ASC"
	}

	query := `
		SELECT s.id, s.user_id, s.folder_id, s.name, s.lobby_code,
		       COALESCE(l.selected_map_id, ''),
		       CASE WHEN l.map_side = 'defend' THEN 'defense' ELSE COALESCE(l.map_side, '') END,
		       s.tags, s.is_favorite, l.updated_at` +
		fromSQL +
		fmt.Sprintf(" ORDER BY %s LIMIT $%d OFFSET $%d", orderSQL, next, next+1)

	queryArgs := append(append([]any{}, args...), limit, offset)
	rows, err := conn.Query(context.Background(), query, queryArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	strategies := make([]StrategySummary, 0)
	for rows.Next() {
		var summary StrategySummary
		if err := rows.Scan(
			&summary.ID,
			&summary.UserID,
			&summary.FolderID,
			&summary.Name,
			&summary.LobbyCode,
			&summary.SelectedMapID,
			&summary.MapSide,
			&summary.Tags,
			&summary.IsFavorite,
			&summary.UpdatedAt,
		); err != nil {
			return nil, err
		}
		strategies = append(strategies, summary)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &StrategySearchResult{
		Strategies: strategies,
		Total:      total,
	}, nil
}

func ListStrategyTags(userID int) ([]string, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	rows, err := conn.Query(context.Background(), `
		SELECT DISTINCT unnest(tags) AS tag
		FROM strategies
		WHERE user_id = $1
		ORDER BY tag ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tags := make([]string, 0)
	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return tags, nil
}

func GetStrategyTagsByIDs(userID int, ids []int) (map[int][]string, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	rows, err := conn.Query(context.Background(), `
		SELECT id, tags
		FROM strategies
		WHERE user_id = $1 AND id = ANY($2::int[])
	`, userID, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[int][]string, len(ids))
	for rows.Next() {
		var id int
		var tags []string
		if err := rows.Scan(&id, &tags); err != nil {
			return nil, err
		}
		result[id] = tags
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

type BulkUpdateStrategyParams struct {
	UserID      int
	IDs         []int
	FolderID    *int
	HasFolderID bool
	IsFavorite  *bool
	AddTags     []string
	RemoveTags  []string
}

func BulkUpdateStrategies(params BulkUpdateStrategyParams) (int64, error) {
	conn, err := db.GetDB()
	if err != nil {
		return 0, err
	}

	addTags := params.AddTags
	if addTags == nil {
		addTags = []string{}
	}
	removeTags := params.RemoveTags
	if removeTags == nil {
		removeTags = []string{}
	}

	var folderID any
	if params.FolderID != nil {
		folderID = *params.FolderID
	}
	var isFavorite any
	if params.IsFavorite != nil {
		isFavorite = *params.IsFavorite
	}

	tag, err := conn.Exec(context.Background(), `
		UPDATE strategies
		SET folder_id = CASE WHEN $3 THEN $4::int ELSE folder_id END,
		    is_favorite = COALESCE($5::boolean, is_favorite),
		    tags = (
		        SELECT COALESCE(array_agg(DISTINCT t.tag ORDER BY t.tag), '{}'::text[])
		        FROM unnest(strategies.tags || $6::text[]) AS t(tag)
		        WHERE t.tag <> ALL($7::text[])
		    ),
		    updated_at = NOW()
		WHERE user_id = $1 AND id = ANY($2::int[])
	`, params.UserID, params.IDs, params.HasFolderID, folderID, isFavorite, addTags, removeTags)
	if err != nil {
		return 0, err
	}

	return tag.RowsAffected(), nil
}

func BulkDeleteStrategies(userID int, ids []int) (int64, error) {
	conn, err := db.GetDB()
	if err != nil {
		return 0, err
	}

	tag, err := conn.Exec(context.Background(), `
		DELETE FROM strategies
		WHERE user_id = $1 AND id = ANY($2::int[])
	`, userID, ids)
	if err != nil {
		return 0, err
	}

	return tag.RowsAffected(), nil
}
