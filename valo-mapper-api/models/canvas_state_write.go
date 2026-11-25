package models

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"valo-mapper-api/db"

	"github.com/jackc/pgx/v5"
)

type canvasStateRows struct {
	agents          [][]any
	abilities       [][]any
	drawLines       [][]any
	texts           [][]any
	images          [][]any
	toolIcons       [][]any
	connectingLines [][]any
}

type canvasTableSpec struct {
	table      string
	columns    []string
	rows       [][]any
	keyIndices []int
	label      string
}

func SaveCanvasState(lobbyCode string, state FullCanvasState) error {
	if err := validateCanvasState(state); err != nil {
		return err
	}

	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), dbOperationTimeout)
	defer cancel()

	tx, err := conn.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Wait briefly for a concurrent patch instead of failing outright: undo is
	// interactive, so a stuck lock is reported as a retryable conflict.
	if _, err = tx.Exec(ctx, "SET LOCAL lock_timeout = '2s'"); err != nil {
		return err
	}

	if err := lockLobbyForCanvasWrite(ctx, tx, lobbyCode); err != nil {
		return err
	}
	if err := deleteCanvasStateTables(ctx, tx, lobbyCode); err != nil {
		return err
	}

	rows, err := buildCanvasStateRows(lobbyCode, state)
	if err != nil {
		return err
	}
	if err := insertCanvasStateRows(ctx, tx, rows); err != nil {
		return err
	}

	if err := updateLobbyCanvasState(ctx, tx, lobbyCode, state); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func lockLobbyForCanvasWrite(ctx context.Context, tx pgx.Tx, lobbyCode string) error {
	var lobbyExists int
	if err := tx.QueryRow(ctx, "SELECT 1 FROM lobbies WHERE code = $1 FOR UPDATE", lobbyCode).Scan(&lobbyExists); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrLobbyNotFound
		}
		if isLockNotAvailable(err) {
			return ErrLobbyBusy
		}
		return err
	}
	return nil
}

func deleteCanvasStateTables(ctx context.Context, tx pgx.Tx, lobbyCode string) error {
	tables := []string{
		"canvas_agents", "canvas_abilities", "canvas_draw_lines",
		"canvas_texts", "canvas_images", "canvas_tool_icons", "canvas_connecting_lines",
	}
	for _, table := range tables {
		query := fmt.Sprintf("DELETE FROM %s WHERE lobby_code = $1",
			pgx.Identifier{table}.Sanitize())
		if _, err := tx.Exec(ctx, query, lobbyCode); err != nil {
			return err
		}
	}
	return nil
}

func buildCanvasStateRows(lobbyCode string, state FullCanvasState) (*canvasStateRows, error) {
	rows := &canvasStateRows{}

	for phaseIndex, phase := range state.Phases {
		appendCanvasAgents(rows, lobbyCode, phaseIndex, phase)
		appendCanvasAbilities(rows, lobbyCode, phaseIndex, phase)
		appendCanvasDrawLines(rows, lobbyCode, phaseIndex, phase)
		if err := appendCanvasTexts(rows, lobbyCode, phaseIndex, phase); err != nil {
			return nil, err
		}
		appendCanvasImages(rows, lobbyCode, phaseIndex, phase)
		appendCanvasToolIcons(rows, lobbyCode, phaseIndex, phase)
		appendCanvasConnectingLines(rows, lobbyCode, phaseIndex, phase)
	}

	return rows, nil
}

func appendCanvasAgents(rows *canvasStateRows, lobbyCode string, phaseIndex int, phase PhaseState) {
	for _, a := range phase.AgentsOnCanvas {
		rows.agents = append(rows.agents, []any{
			a.ID, lobbyCode, a.AgentName, a.X, a.Y, a.IsAlly, a.IsGray, phaseIndex, a.Note,
		})
	}
}

func appendCanvasAbilities(rows *canvasStateRows, lobbyCode string, phaseIndex int, phase PhaseState) {
	for _, ab := range phase.AbilitiesOnCanvas {
		pathArray := flattenPositions(ab.CurrentPath)
		rows.abilities = append(rows.abilities, []any{
			ab.ID, lobbyCode, ab.AgentName, ab.Action, ab.X, ab.Y,
			ab.AttachedToID, pathArray, ab.CurrentRotation, ab.CurrentLength, ab.IsAlly, ab.IconOnly, ab.ShowOuterCircle, phaseIndex, ab.Note,
		})
	}
}

func appendCanvasDrawLines(rows *canvasStateRows, lobbyCode string, phaseIndex int, phase PhaseState) {
	for _, l := range phase.DrawLines {
		pointsArray := flattenPositions(l.Points)
		rows.drawLines = append(rows.drawLines, []any{
			l.ID, lobbyCode, l.Tool, pointsArray, l.Color, l.Size,
			l.IsDashed, l.IsArrowHead, l.Shape, l.Opacity, l.TraversalTime, phaseIndex,
		})
	}
}

func appendCanvasTexts(rows *canvasStateRows, lobbyCode string, phaseIndex int, phase PhaseState) error {
	for _, t := range phase.TextsOnCanvas {
		var spansJSON any
		if len(t.Spans) > 0 {
			data, marshalErr := json.Marshal(t.Spans)
			if marshalErr != nil {
				return fmt.Errorf("failed to marshal text spans: %w", marshalErr)
			}
			spansJSON = data
		}

		var fontSize any
		if t.FontSize > 0 {
			fontSize = t.FontSize
		}

		rows.texts = append(rows.texts, []any{
			t.ID, lobbyCode, t.Text, t.X, t.Y, t.Width, t.Height, phaseIndex,
			spansJSON, fontSize, t.Note,
		})
	}
	return nil
}

func appendCanvasImages(rows *canvasStateRows, lobbyCode string, phaseIndex int, phase PhaseState) {
	for _, i := range phase.ImagesOnCanvas {
		rows.images = append(rows.images, []any{
			i.ID, lobbyCode, i.Src, i.X, i.Y, i.Width, i.Height, phaseIndex, i.Note,
		})
	}
}

func appendCanvasToolIcons(rows *canvasStateRows, lobbyCode string, phaseIndex int, phase PhaseState) {
	for _, ic := range phase.ToolIconsOnCanvas {
		rows.toolIcons = append(rows.toolIcons, []any{
			ic.ID, lobbyCode, ic.Name, ic.X, ic.Y, ic.Width, ic.Height, ic.AttachedToID, phaseIndex, ic.Note,
		})
	}
}

func appendCanvasConnectingLines(rows *canvasStateRows, lobbyCode string, phaseIndex int, phase PhaseState) {
	for _, cl := range phase.ConnectingLines {
		rows.connectingLines = append(rows.connectingLines, []any{
			cl.ID, lobbyCode, cl.FromID, cl.ToID, cl.StrokeColor, cl.StrokeWidth,
			cl.UploadedImages, cl.YoutubeLink, cl.Notes, phaseIndex,
		})
	}
}

func insertCanvasStateRows(ctx context.Context, tx pgx.Tx, rows *canvasStateRows) error {
	specs := []canvasTableSpec{
		{
			table:      "canvas_agents",
			columns:    []string{"id", "lobby_code", "name", "x", "y", "is_ally", "is_gray", "phase_index", "note"},
			rows:       rows.agents,
			keyIndices: []int{0, 1, 7},
			label:      "agents",
		},
		{
			table:      "canvas_abilities",
			columns:    []string{"id", "lobby_code", "name", "action", "x", "y", "attached_to_id", "current_path", "current_rotation", "current_length", "is_ally", "icon_only", "show_outer_circle", "phase_index", "note"},
			rows:       rows.abilities,
			keyIndices: []int{0, 1, 13},
			label:      "abilities",
		},
		{
			table:      "canvas_draw_lines",
			columns:    []string{"id", "lobby_code", "tool", "points", "color", "size", "is_dashed", "is_arrow_head", "shape", "opacity", "traversal_time", "phase_index"},
			rows:       rows.drawLines,
			keyIndices: []int{0, 1, 11},
			label:      "draw lines",
		},
		{
			table:      "canvas_texts",
			columns:    []string{"id", "lobby_code", "text", "x", "y", "width", "height", "phase_index", "spans", "font_size", "note"},
			rows:       rows.texts,
			keyIndices: []int{0, 1, 7},
			label:      "texts",
		},
		{
			table:      "canvas_images",
			columns:    []string{"id", "lobby_code", "src", "x", "y", "width", "height", "phase_index", "note"},
			rows:       rows.images,
			keyIndices: []int{0, 1, 7},
			label:      "images",
		},
		{
			table:      "canvas_tool_icons",
			columns:    []string{"id", "lobby_code", "name", "x", "y", "width", "height", "attached_to_id", "phase_index", "note"},
			rows:       rows.toolIcons,
			keyIndices: []int{0, 1, 8},
			label:      "tool icons",
		},
		{
			table:      "canvas_connecting_lines",
			columns:    []string{"id", "lobby_code", "from_id", "to_id", "stroke_color", "stroke_width", "uploaded_images", "youtube_link", "notes", "phase_index"},
			rows:       rows.connectingLines,
			keyIndices: []int{0, 1, 9},
			label:      "connecting lines",
		},
	}
	for _, spec := range specs {
		if err := insertCanvasTable(ctx, tx, spec); err != nil {
			return err
		}
	}
	return nil
}

func insertCanvasTable(ctx context.Context, tx pgx.Tx, spec canvasTableSpec) error {
	if len(spec.rows) == 0 {
		return nil
	}

	rows := dedupeRows(spec.rows, spec.keyIndices)
	_, err := tx.CopyFrom(
		ctx,
		pgx.Identifier{spec.table},
		spec.columns,
		pgx.CopyFromRows(rows),
	)
	if err != nil {
		return fmt.Errorf("failed to insert %s: %w", spec.label, err)
	}

	return nil
}

func updateLobbyCanvasState(ctx context.Context, tx pgx.Tx, lobbyCode string, state FullCanvasState) error {
	agentsJSON, err := marshalIconSettings(state.AgentsSettings)
	if err != nil {
		return err
	}
	abilitiesJSON, err := marshalIconSettings(state.AbilitiesSettings)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `
		UPDATE lobbies
		SET selected_map_id = COALESCE(NULLIF($1, ''), selected_map_id),
		    map_side = COALESCE(NULLIF($2, ''), map_side),
		    current_phase_index = $3,
		    edited_phases = $4,
		    agents_settings = $5,
		    abilities_settings = $6,
		    updated_at = NOW()
		WHERE code = $7`,
		state.SelectedMap.ID, state.MapSide, state.CurrentPhaseIndex,
		state.EditedPhases, agentsJSON, abilitiesJSON, lobbyCode)
	return err
}
