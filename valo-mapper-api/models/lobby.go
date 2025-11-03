package models

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"time"
	"valo-mapper-api/db"

	"github.com/jackc/pgx/v5"
)

type Lobby struct {
	Code          string           `json:"lobbyCode"`
	CreatedAt     time.Time        `json:"createdAt"`
	SelectedMapId string           `json:"selectedMapId"`
	MapSide       string           `json:"mapSide"`
	CanvasState   *FullCanvasState `json:"canvasState,omitempty"`
}

func GenerateLobbyCode() string {
	b := make([]byte, 4)

	_, err := rand.Read(b)
	if err != nil {
		return "ERROR01"
	}

	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b)
}

func (l *Lobby) Save() error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	var exists bool
	err = conn.QueryRow(context.Background(),
		"SELECT EXISTS(SELECT 1 FROM lobbies WHERE code = $1)",
		l.Code).Scan(&exists)
	if err != nil {
		return err
	}

	if exists {
		_, err = conn.Exec(context.Background(),
			`UPDATE lobbies 
			SET selected_map_id = $1, map_side = $2, current_phase_index = $3
			WHERE code = $4`,
			l.CanvasState.SelectedMap.ID, l.CanvasState.MapSide, l.CanvasState.CurrentPhaseIndex, l.Code)
	} else {
		_, err = conn.Exec(context.Background(),
			`INSERT INTO lobbies (code, created_at, selected_map_id, map_side, current_phase_index) 
			VALUES ($1, $2, $3, $4, $5)`,
			l.Code, l.CreatedAt, l.CanvasState.SelectedMap.ID, l.CanvasState.MapSide, l.CanvasState.CurrentPhaseIndex)
	}

	return err
}

func GetLobbyByCode(code string) (*Lobby, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	lobby := &Lobby{
		CanvasState: &FullCanvasState{
			SelectedMap:       MapOption{},
			AgentsOnCanvas:    []CanvasAgent{},
			AbilitiesOnCanvas: []CanvasAbility{},
			DrawLines:         []CanvasDrawLine{},
			TextsOnCanvas:     []CanvasText{},
			ImagesOnCanvas:    []CanvasImage{},
			ToolIconsOnCanvas: []CanvasToolIcon{},
		},
	}

	var mapID string
	err = conn.QueryRow(context.Background(),
		`SELECT code, created_at, selected_map_id, map_side, current_phase_index 
		FROM lobbies 
		WHERE code = $1`,
		code).Scan(
		&lobby.Code,
		&lobby.CreatedAt,
		&mapID,
		&lobby.CanvasState.MapSide,
		&lobby.CanvasState.CurrentPhaseIndex,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	mapDetails, err := GetMapById(mapID)
	if err != nil {
		return nil, err
	}
	lobby.CanvasState.SelectedMap = *mapDetails

	if err == pgx.ErrNoRows {
		return nil, nil
	}

	lobby.CanvasState.SelectedMap = *mapDetails

	err = GetCanvasStateDetails(code, lobby.CanvasState.CurrentPhaseIndex, lobby.CanvasState)
	if err != nil {
		return nil, err
	}

	return lobby, nil
}
