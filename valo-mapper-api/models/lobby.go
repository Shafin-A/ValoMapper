package models

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"encoding/json"
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
	UpdatedAt     time.Time        `json:"updatedAt"`
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
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return db.WithRetryNoResult(ctx, 2, func() error {
		return l.saveInternal(ctx)
	})
}

func (l *Lobby) saveInternal(ctx context.Context) error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	var exists bool
	err = conn.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM lobbies WHERE code = $1)",
		l.Code).Scan(&exists)
	if err != nil {
		return err
	}

	var (
		selectedMapID     string
		mapSide           string
		currentPhaseIndex int
		editedPhases      []int
		agentsJSON        []byte
		abilitiesJSON     []byte
	)
	if l.CanvasState != nil {
		selectedMapID = l.CanvasState.SelectedMap.ID
		mapSide = l.CanvasState.MapSide
		currentPhaseIndex = l.CanvasState.CurrentPhaseIndex
		editedPhases = l.CanvasState.EditedPhases
		if l.CanvasState.AgentsSettings != nil {
			agentsJSON, err = json.Marshal(l.CanvasState.AgentsSettings)
			if err != nil {
				return err
			}
		}
		if l.CanvasState.AbilitiesSettings != nil {
			abilitiesJSON, err = json.Marshal(l.CanvasState.AbilitiesSettings)
			if err != nil {
				return err
			}
		}
	}

	if exists {
		_, err = conn.Exec(ctx,
			`UPDATE lobbies 
			SET selected_map_id = $1, map_side = $2, current_phase_index = $3, edited_phases = $4, agents_settings = $5, abilities_settings = $6
			WHERE code = $7`,
			selectedMapID, mapSide, currentPhaseIndex, editedPhases, agentsJSON, abilitiesJSON, l.Code)
	} else {
		_, err = conn.Exec(ctx,
			`INSERT INTO lobbies (code, created_at, selected_map_id, map_side, current_phase_index, edited_phases, agents_settings, abilities_settings) 
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			l.Code, l.CreatedAt, selectedMapID, mapSide, currentPhaseIndex, editedPhases, agentsJSON, abilitiesJSON)
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
			ConnectingLines:   []CanvasConnectingLine{},
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
	var agentsJSON []byte
	var abilitiesJSON []byte
	err = conn.QueryRow(context.Background(),
		`SELECT code, created_at, updated_at, selected_map_id, map_side, current_phase_index, edited_phases, agents_settings, abilities_settings 
		FROM lobbies 
		WHERE code = $1`,
		code).Scan(
		&lobby.Code,
		&lobby.CreatedAt,
		&lobby.UpdatedAt,
		&mapID,
		&lobby.CanvasState.MapSide,
		&lobby.CanvasState.CurrentPhaseIndex,
		&editedPhases,
		&agentsJSON,
		&abilitiesJSON,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	lobby.CanvasState.EditedPhases = editedPhases

	lobby.SelectedMapId = mapID

	mapDetails, err := GetMapById(mapID)
	if err != nil {
		return nil, err
	}
	lobby.CanvasState.SelectedMap = *mapDetails

	if agentsJSON != nil {
		var s IconSettings
		if err := json.Unmarshal(agentsJSON, &s); err == nil {
			lobby.CanvasState.AgentsSettings = &s
		}
	}
	if abilitiesJSON != nil {
		var s IconSettings
		if err := json.Unmarshal(abilitiesJSON, &s); err == nil {
			lobby.CanvasState.AbilitiesSettings = &s
		}
	}

	phases, err := GetAllCanvasPhases(code)
	if err != nil {
		return nil, err
	}
	lobby.CanvasState.Phases = phases

	return lobby, nil
}

func GetLobbiesByCodes(codes []string) ([]Lobby, error) {
	if len(codes) == 0 {
		return []Lobby{}, nil
	}

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
			ConnectingLines:   []CanvasConnectingLine{},
			TextsOnCanvas:     []CanvasText{},
			ImagesOnCanvas:    []CanvasImage{},
			ToolIconsOnCanvas: []CanvasToolIcon{},
		}
	}

	rows, err := conn.Query(context.Background(),
		`SELECT code, created_at, updated_at, selected_map_id, map_side, current_phase_index, edited_phases, agents_settings, abilities_settings 
		FROM lobbies 
		WHERE code = ANY($1)`,
		codes)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	lobbies := make([]Lobby, 0, len(codes))

	for rows.Next() {
		lobby := Lobby{
			CanvasState: &FullCanvasState{
				SelectedMap:  MapOption{},
				EditedPhases: []int{},
				Phases:       emptyPhases,
			},
		}

		var mapID string
		var editedPhases []int
		var agentsJSON []byte
		var abilitiesJSON []byte
		err := rows.Scan(
			&lobby.Code,
			&lobby.CreatedAt,
			&lobby.UpdatedAt,
			&mapID,
			&lobby.CanvasState.MapSide,
			&lobby.CanvasState.CurrentPhaseIndex,
			&editedPhases,
			&agentsJSON,
			&abilitiesJSON,
		)
		if err != nil {
			return nil, err
		}

		lobby.CanvasState.EditedPhases = editedPhases

		lobby.SelectedMapId = mapID

		mapDetails, err := GetMapById(mapID)
		if err != nil {
			return nil, err
		}
		lobby.CanvasState.SelectedMap = *mapDetails

		if agentsJSON != nil {
			var s IconSettings
			if err := json.Unmarshal(agentsJSON, &s); err == nil {
				lobby.CanvasState.AgentsSettings = &s
			}
		}
		if abilitiesJSON != nil {
			var s IconSettings
			if err := json.Unmarshal(abilitiesJSON, &s); err == nil {
				lobby.CanvasState.AbilitiesSettings = &s
			}
		}

		phases, err := GetAllCanvasPhases(lobby.Code)
		if err != nil {
			return nil, err
		}
		lobby.CanvasState.Phases = phases

		lobbies = append(lobbies, lobby)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return lobbies, nil
}

func CountLobbies() (int64, error) {
	conn, err := db.GetDB()
	if err != nil {
		return 0, err
	}

	var count int64
	err = conn.QueryRow(context.Background(), "SELECT COUNT(*) FROM lobbies").Scan(&count)
	return count, err
}

func ListLobbyCodes() ([]string, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	rows, err := conn.Query(context.Background(), "SELECT code FROM lobbies ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var codes []string
	for rows.Next() {
		var code string
		if err := rows.Scan(&code); err != nil {
			return nil, err
		}
		codes = append(codes, code)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	if codes == nil {
		codes = []string{}
	}

	return codes, nil
}
