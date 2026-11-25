package models

import (
	"context"
	"database/sql"
	"encoding/json"
	"log/slog"

	"valo-mapper-api/db"
	"valo-mapper-api/valorant"

	"github.com/jackc/pgx/v5"
)

func GetAllCanvasPhases(lobbyCode string) ([]PhaseState, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	phases := NewEmptyPhaseStates()

	ctx, cancel := context.WithTimeout(context.Background(), dbOperationTimeout)
	defer cancel()

	// Use a repeatable-read transaction so all queries see a consistent snapshot,
	// even if a concurrent SaveCanvasState commits between our queries.
	tx, err := conn.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead})
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = tx.Rollback(ctx) // no-op after commit; harmless on read-only tx
	}()

	if err := loadCanvasAgents(ctx, tx, lobbyCode, phases); err != nil {
		return nil, err
	}
	if err := loadCanvasAbilities(ctx, tx, lobbyCode, phases); err != nil {
		return nil, err
	}
	if err := loadCanvasDrawLines(ctx, tx, lobbyCode, phases); err != nil {
		return nil, err
	}
	if err := loadCanvasTexts(ctx, tx, lobbyCode, phases); err != nil {
		return nil, err
	}
	if err := loadCanvasImages(ctx, tx, lobbyCode, phases); err != nil {
		return nil, err
	}
	if err := loadCanvasToolIcons(ctx, tx, lobbyCode, phases); err != nil {
		return nil, err
	}
	if err := loadCanvasConnectingLines(ctx, tx, lobbyCode, phases); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return phases, nil
}

func readCanvasRows(
	ctx context.Context,
	tx pgx.Tx,
	query string,
	lobbyCode string,
	scan func(pgx.Rows) error,
) error {
	rows, err := tx.Query(ctx, query, lobbyCode)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		if err := scan(rows); err != nil {
			return err
		}
	}

	return rows.Err()
}

func loadCanvasAgents(
	ctx context.Context,
	tx pgx.Tx,
	lobbyCode string,
	phases []PhaseState,
) error {
	return readCanvasRows(ctx, tx, `
		SELECT id, name, is_ally, is_gray, x, y, note, phase_index
		FROM canvas_agents 
		WHERE lobby_code = $1 
		ORDER BY phase_index`, lobbyCode, func(rows pgx.Rows) error {
		var agent CanvasAgent
		var phaseIndex int
		var agentName sql.NullString
		var agentNote sql.NullString
		if err := rows.Scan(&agent.ID, &agentName, &agent.IsAlly, &agent.IsGray, &agent.X, &agent.Y, &agentNote, &phaseIndex); err != nil {
			return err
		}
		agent.AgentName = ""
		if agentName.Valid {
			agent.AgentName = agentName.String
		}
		agent.Note = ""
		if agentNote.Valid {
			agent.Note = agentNote.String
		}
		agent.Role = valorant.AgentRoleByName(agent.AgentName)
		if phaseIndex >= 0 && phaseIndex < len(phases) {
			phases[phaseIndex].AgentsOnCanvas = append(phases[phaseIndex].AgentsOnCanvas, agent)
		} else {
			slog.Warn("agent has invalid phase index", "agent_id", agent.ID, "phase_index", phaseIndex, "max_index", len(phases)-1, "lobby_code", lobbyCode)
		}
		return nil
	})
}

func loadCanvasAbilities(
	ctx context.Context,
	tx pgx.Tx,
	lobbyCode string,
	phases []PhaseState,
) error {
	return readCanvasRows(ctx, tx, `
		SELECT id, name, action, x, y, attached_to_id, current_path, current_rotation, current_length, is_ally, icon_only, show_outer_circle, note, phase_index
		FROM canvas_abilities 
		WHERE lobby_code = $1 
		ORDER BY phase_index, sort_order`, lobbyCode, func(rows pgx.Rows) error {
		var ability CanvasAbility
		var phaseIndex int
		var abilityName sql.NullString
		var attachedToID sql.NullString
		var abilityNote sql.NullString
		var pathArray []float64
		if err := rows.Scan(&ability.ID, &abilityName, &ability.Action, &ability.X, &ability.Y,
			&attachedToID, &pathArray, &ability.CurrentRotation, &ability.CurrentLength, &ability.IsAlly, &ability.IconOnly, &ability.ShowOuterCircle, &abilityNote, &phaseIndex); err != nil {
			return err
		}
		ability.CurrentPath = make([]Position, 0, len(pathArray)/2)
		for i := 0; i+1 < len(pathArray); i += 2 {
			ability.CurrentPath = append(ability.CurrentPath, Position{X: pathArray[i], Y: pathArray[i+1]})
		}
		ability.AgentName = ""
		if abilityName.Valid {
			ability.AgentName = abilityName.String
		}
		ability.AttachedToID = ""
		if attachedToID.Valid {
			ability.AttachedToID = attachedToID.String
		}
		ability.Note = ""
		if abilityNote.Valid {
			ability.Note = abilityNote.String
		}
		if phaseIndex >= 0 && phaseIndex < len(phases) {
			phases[phaseIndex].AbilitiesOnCanvas = append(phases[phaseIndex].AbilitiesOnCanvas, ability)
		} else {
			slog.Warn("ability has invalid phase index", "ability_id", ability.ID, "phase_index", phaseIndex, "max_index", len(phases)-1, "lobby_code", lobbyCode)
		}
		return nil
	})
}

func loadCanvasDrawLines(
	ctx context.Context,
	tx pgx.Tx,
	lobbyCode string,
	phases []PhaseState,
) error {
	return readCanvasRows(ctx, tx, `
		SELECT id, tool, points, color, size, is_dashed, is_arrow_head, shape, opacity, traversal_time, phase_index 
		FROM canvas_draw_lines 
		WHERE lobby_code = $1 
		ORDER BY phase_index, sort_order`, lobbyCode, func(rows pgx.Rows) error {
		var line CanvasDrawLine
		var phaseIndex int
		var pointsArray []float64
		if err := rows.Scan(&line.ID, &line.Tool, &pointsArray, &line.Color, &line.Size, &line.IsDashed, &line.IsArrowHead, &line.Shape, &line.Opacity, &line.TraversalTime, &phaseIndex); err != nil {
			return err
		}
		line.Points = make([]Position, 0, len(pointsArray)/2)
		for i := 0; i+1 < len(pointsArray); i += 2 {
			line.Points = append(line.Points, Position{X: pointsArray[i], Y: pointsArray[i+1]})
		}
		if phaseIndex >= 0 && phaseIndex < len(phases) {
			phases[phaseIndex].DrawLines = append(phases[phaseIndex].DrawLines, line)
		} else {
			slog.Warn("draw line has invalid phase index", "line_id", line.ID, "phase_index", phaseIndex, "max_index", len(phases)-1, "lobby_code", lobbyCode)
		}
		return nil
	})
}

func loadCanvasTexts(
	ctx context.Context,
	tx pgx.Tx,
	lobbyCode string,
	phases []PhaseState,
) error {
	return readCanvasRows(ctx, tx, `
		SELECT id, text, spans, font_size, x, y, width, height, note, phase_index
		FROM canvas_texts
		WHERE lobby_code = $1
		ORDER BY phase_index`, lobbyCode, func(rows pgx.Rows) error {
		var text CanvasText
		var spansJSON []byte
		var fontSize sql.NullFloat64
		var textNote sql.NullString
		var phaseIndex int
		if err := rows.Scan(&text.ID, &text.Text, &spansJSON, &fontSize, &text.X, &text.Y, &text.Width, &text.Height, &textNote, &phaseIndex); err != nil {
			return err
		}
		if len(spansJSON) > 0 {
			if err := json.Unmarshal(spansJSON, &text.Spans); err != nil {
				return err
			}
		}
		if fontSize.Valid {
			text.FontSize = fontSize.Float64
		}
		text.Note = ""
		if textNote.Valid {
			text.Note = textNote.String
		}
		if phaseIndex >= 0 && phaseIndex < len(phases) {
			phases[phaseIndex].TextsOnCanvas = append(phases[phaseIndex].TextsOnCanvas, text)
		} else {
			slog.Warn("text has invalid phase index", "text_id", text.ID, "phase_index", phaseIndex, "max_index", len(phases)-1, "lobby_code", lobbyCode)
		}
		return nil
	})
}

func loadCanvasImages(
	ctx context.Context,
	tx pgx.Tx,
	lobbyCode string,
	phases []PhaseState,
) error {
	return readCanvasRows(ctx, tx, `
		SELECT id, src, x, y, width, height, note, phase_index
		FROM canvas_images 
		WHERE lobby_code = $1 
		ORDER BY phase_index`, lobbyCode, func(rows pgx.Rows) error {
		var image CanvasImage
		var imageNote sql.NullString
		var phaseIndex int
		if err := rows.Scan(&image.ID, &image.Src, &image.X, &image.Y, &image.Width, &image.Height, &imageNote, &phaseIndex); err != nil {
			return err
		}
		image.Note = ""
		if imageNote.Valid {
			image.Note = imageNote.String
		}
		if phaseIndex >= 0 && phaseIndex < len(phases) {
			phases[phaseIndex].ImagesOnCanvas = append(phases[phaseIndex].ImagesOnCanvas, image)
		} else {
			slog.Warn("image has invalid phase index", "image_id", image.ID, "phase_index", phaseIndex, "max_index", len(phases)-1, "lobby_code", lobbyCode)
		}
		return nil
	})
}

func loadCanvasToolIcons(
	ctx context.Context,
	tx pgx.Tx,
	lobbyCode string,
	phases []PhaseState,
) error {
	return readCanvasRows(ctx, tx, `
		SELECT id, name, x, y, width, height, attached_to_id, note, phase_index
		FROM canvas_tool_icons 
		WHERE lobby_code = $1 
		ORDER BY phase_index`, lobbyCode, func(rows pgx.Rows) error {
		var icon CanvasToolIcon
		var phaseIndex int
		var iconName sql.NullString
		var attachedToID sql.NullString
		var iconNote sql.NullString
		if err := rows.Scan(&icon.ID, &iconName, &icon.X, &icon.Y, &icon.Width, &icon.Height, &attachedToID, &iconNote, &phaseIndex); err != nil {
			return err
		}
		icon.Name = ""
		if iconName.Valid {
			icon.Name = iconName.String
		}
		icon.AttachedToID = ""
		if attachedToID.Valid {
			icon.AttachedToID = attachedToID.String
		}
		icon.Note = ""
		if iconNote.Valid {
			icon.Note = iconNote.String
		}
		if phaseIndex >= 0 && phaseIndex < len(phases) {
			phases[phaseIndex].ToolIconsOnCanvas = append(phases[phaseIndex].ToolIconsOnCanvas, icon)
		}
		return nil
	})
}

func loadCanvasConnectingLines(
	ctx context.Context,
	tx pgx.Tx,
	lobbyCode string,
	phases []PhaseState,
) error {
	return readCanvasRows(ctx, tx, `
		SELECT id, from_id, to_id, stroke_color, stroke_width, uploaded_images, youtube_link, notes, phase_index 
		FROM canvas_connecting_lines 
		WHERE lobby_code = $1 
		ORDER BY phase_index`, lobbyCode, func(rows pgx.Rows) error {
		var line CanvasConnectingLine
		var phaseIndex int
		if err := rows.Scan(&line.ID, &line.FromID, &line.ToID, &line.StrokeColor, &line.StrokeWidth,
			&line.UploadedImages, &line.YoutubeLink, &line.Notes, &phaseIndex); err != nil {
			return err
		}
		if phaseIndex >= 0 && phaseIndex < len(phases) {
			phases[phaseIndex].ConnectingLines = append(phases[phaseIndex].ConnectingLines, line)
		} else {
			slog.Warn("connecting line has invalid phase index", "line_id", line.ID, "phase_index", phaseIndex, "max_index", len(phases)-1, "lobby_code", lobbyCode)
		}
		return nil
	})
}
