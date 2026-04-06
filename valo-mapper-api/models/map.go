package models

import (
	"context"
	"time"
	"valo-mapper-api/db"
)

const DefaultMapID = "bind"

func GetMapById(id string) (*MapOption, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return db.WithRetry(ctx, 2, func() (*MapOption, error) {
		conn, err := db.GetDB()
		if err != nil {
			return nil, err
		}

		mapOption := &MapOption{}
		err = conn.QueryRow(ctx,
			`SELECT id, text
			FROM maps WHERE id = $1`,
			id).Scan(
			&mapOption.ID,
			&mapOption.Text,
		)
		if err != nil {
			return nil, err
		}

		mapOption.TextColor = "text-white"
		return mapOption, nil
	})
}
