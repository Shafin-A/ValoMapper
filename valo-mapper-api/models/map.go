package models

import (
	"context"
	"valo-mapper-api/db"
)

func GetMapById(id string) (*MapOption, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	mapOption := &MapOption{}
	err = conn.QueryRow(context.Background(),
		`SELECT id, text, text_color 
		FROM maps WHERE id = $1`,
		id).Scan(
		&mapOption.ID,
		&mapOption.Text,
		&mapOption.TextColor,
	)
	if err != nil {
		return nil, err
	}

	return mapOption, nil
}
