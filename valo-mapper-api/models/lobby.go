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
			SET selected_map_id = $1, map_side = $2, current_phase_index = $3, edited_phases = $4
			WHERE code = $5`,
			l.CanvasState.SelectedMap.ID, l.CanvasState.MapSide,
			l.CanvasState.CurrentPhaseIndex, l.CanvasState.EditedPhases, l.Code)
	} else {
		_, err = conn.Exec(context.Background(),
			`INSERT INTO lobbies (code, created_at, selected_map_id, map_side, current_phase_index, edited_phases) 
			VALUES ($1, $2, $3, $4, $5, $6)`,
			l.Code, l.CreatedAt, l.CanvasState.SelectedMap.ID, l.CanvasState.MapSide, l.CanvasState.CurrentPhaseIndex, l.CanvasState.EditedPhases)
	}

	return err
}

func GetLobbyByCode(code string) (*Lobby, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	emptyPhases := make([]PhaseState, 10)
	for i := range 10 {
		emptyPhases[i] = PhaseState{
			AgentsOnCanvas:    []CanvasAgent{},
			AbilitiesOnCanvas: []CanvasAbility{},
			DrawLines:         []CanvasDrawLine{},
			TextsOnCanvas:     []CanvasText{},
			ImagesOnCanvas:    []CanvasImage{},
			ToolIconsOnCanvas: []CanvasToolIcon{},
		}
	}

	lobby := &Lobby{
		CanvasState: &FullCanvasState{
			SelectedMap:  MapOption{},
			EditedPhases: []int{},
			Phases:       emptyPhases,
		},
	}

	var mapID string
	var editedPhases []int
	err = conn.QueryRow(context.Background(),
		`SELECT code, created_at, selected_map_id, map_side, current_phase_index, edited_phases 
		FROM lobbies 
		WHERE code = $1`,
		code).Scan(
		&lobby.Code,
		&lobby.CreatedAt,
		&mapID,
		&lobby.CanvasState.MapSide,
		&lobby.CanvasState.CurrentPhaseIndex,
		&editedPhases,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	lobby.CanvasState.EditedPhases = editedPhases

	mapDetails, err := GetMapById(mapID)
	if err != nil {
		return nil, err
	}
	lobby.CanvasState.SelectedMap = *mapDetails

	phases, err := GetAllCanvasPhases(code)
	if err != nil {
		return nil, err
	}
	lobby.CanvasState.Phases = phases

	return lobby, nil
}
