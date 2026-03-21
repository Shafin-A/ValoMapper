package models

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"valo-mapper-api/db"

	"github.com/jackc/pgx/v5"
)

func GetAllCanvasPhases(lobbyCode string) ([]PhaseState, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	phases := make([]PhaseState, 10)
	for i := range 10 {
		phases[i] = PhaseState{
			AgentsOnCanvas:    []CanvasAgent{},
			AbilitiesOnCanvas: []CanvasAbility{},
			DrawLines:         []CanvasDrawLine{},
			ConnectingLines:   []CanvasConnectingLine{},
			TextsOnCanvas:     []CanvasText{},
			ImagesOnCanvas:    []CanvasImage{},
			ToolIconsOnCanvas: []CanvasToolIcon{},
		}
	}

	ctx := context.Background()

	// ---- AGENTS ----
	rows, err := conn.Query(ctx, `
		SELECT id, name, role, is_ally, x, y, phase_index 
		FROM canvas_agents 
		WHERE lobby_code = $1 
		ORDER BY phase_index`, lobbyCode)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var agent CanvasAgent
		var phaseIndex int
		if err := rows.Scan(&agent.ID, &agent.AgentName, &agent.Role, &agent.IsAlly, &agent.X, &agent.Y, &phaseIndex); err != nil {
			rows.Close()
			return nil, err
		}
		if phaseIndex >= 0 && phaseIndex < len(phases) {
			phases[phaseIndex].AgentsOnCanvas = append(phases[phaseIndex].AgentsOnCanvas, agent)
		} else {
			log.Printf("WARNING: Agent %s has invalid phase index %d (valid range: 0-%d) in lobby %s", agent.ID, phaseIndex, len(phases)-1, lobbyCode)
		}
	}
	rows.Close()

	// ---- ABILITIES ----
	rows, err = conn.Query(ctx, `
		SELECT id, name, action, x, y, current_path, current_rotation, current_length, is_ally, icon_only, phase_index 
		FROM canvas_abilities 
		WHERE lobby_code = $1 
		ORDER BY phase_index`, lobbyCode)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var ability CanvasAbility
		var phaseIndex int
		if err := rows.Scan(&ability.ID, &ability.AgentName, &ability.Action, &ability.X, &ability.Y,
			&ability.CurrentPath, &ability.CurrentRotation, &ability.CurrentLength, &ability.IsAlly, &ability.IconOnly, &phaseIndex); err != nil {
			rows.Close()
			return nil, err
		}
		if phaseIndex >= 0 && phaseIndex < len(phases) {
			phases[phaseIndex].AbilitiesOnCanvas = append(phases[phaseIndex].AbilitiesOnCanvas, ability)
		} else {
			log.Printf("WARNING: Ability %s has invalid phase index %d (valid range: 0-%d) in lobby %s", ability.ID, phaseIndex, len(phases)-1, lobbyCode)
		}
	}
	rows.Close()

	// ---- DRAW LINES ----
	rows, err = conn.Query(ctx, `
		SELECT id, tool, points, color, size, is_dashed, is_arrow_head, phase_index 
		FROM canvas_draw_lines 
		WHERE lobby_code = $1 
		ORDER BY phase_index`, lobbyCode)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var line CanvasDrawLine
		var phaseIndex int
		var pointsJSON []byte
		if err := rows.Scan(&line.ID, &line.Tool, &pointsJSON, &line.Color, &line.Size, &line.IsDashed, &line.IsArrowHead, &phaseIndex); err != nil {
			rows.Close()
			return nil, err
		}
		if err := json.Unmarshal(pointsJSON, &line.Points); err != nil {
			rows.Close()
			return nil, err
		}
		if phaseIndex >= 0 && phaseIndex < len(phases) {
			phases[phaseIndex].DrawLines = append(phases[phaseIndex].DrawLines, line)
		} else {
			log.Printf("WARNING: DrawLine %s has invalid phase index %d (valid range: 0-%d) in lobby %s", line.ID, phaseIndex, len(phases)-1, lobbyCode)
		}
	}
	rows.Close()

	// ---- TEXTS ----
	rows, err = conn.Query(ctx, `
		SELECT id, text, x, y, width, height, phase_index 
		FROM canvas_texts 
		WHERE lobby_code = $1 
		ORDER BY phase_index`, lobbyCode)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var text CanvasText
		var phaseIndex int
		if err := rows.Scan(&text.ID, &text.Text, &text.X, &text.Y, &text.Width, &text.Height, &phaseIndex); err != nil {
			rows.Close()
			return nil, err
		}
		if phaseIndex >= 0 && phaseIndex < len(phases) {
			phases[phaseIndex].TextsOnCanvas = append(phases[phaseIndex].TextsOnCanvas, text)
		} else {
			log.Printf("WARNING: Text %s has invalid phase index %d (valid range: 0-%d) in lobby %s", text.ID, phaseIndex, len(phases)-1, lobbyCode)
		}
	}
	rows.Close()

	// ---- IMAGES ----
	rows, err = conn.Query(ctx, `
		SELECT id, src, x, y, width, height, phase_index 
		FROM canvas_images 
		WHERE lobby_code = $1 
		ORDER BY phase_index`, lobbyCode)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var image CanvasImage
		var phaseIndex int
		if err := rows.Scan(&image.ID, &image.Src, &image.X, &image.Y, &image.Width, &image.Height, &phaseIndex); err != nil {
			rows.Close()
			return nil, err
		}
		if phaseIndex >= 0 && phaseIndex < len(phases) {
			phases[phaseIndex].ImagesOnCanvas = append(phases[phaseIndex].ImagesOnCanvas, image)
		} else {
			log.Printf("WARNING: Image %s has invalid phase index %d (valid range: 0-%d) in lobby %s", image.ID, phaseIndex, len(phases)-1, lobbyCode)
		}
	}
	rows.Close()

	// ---- TOOL ICONS ----
	rows, err = conn.Query(ctx, `
		SELECT id, x, y, width, height, phase_index 
		FROM canvas_tool_icons 
		WHERE lobby_code = $1 
		ORDER BY phase_index`, lobbyCode)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var icon CanvasToolIcon
		var phaseIndex int
		if err := rows.Scan(&icon.ID, &icon.X, &icon.Y, &icon.Width, &icon.Height, &phaseIndex); err != nil {
			rows.Close()
			return nil, err
		}
		if phaseIndex >= 0 && phaseIndex < len(phases) {
			phases[phaseIndex].ToolIconsOnCanvas = append(phases[phaseIndex].ToolIconsOnCanvas, icon)
		}
	}
	rows.Close()

	// ---- CONNECTING LINES ----
	rows, err = conn.Query(ctx, `
		SELECT id, from_id, to_id, stroke_color, stroke_width, uploaded_images, youtube_link, notes, phase_index 
		FROM canvas_connecting_lines 
		WHERE lobby_code = $1 
		ORDER BY phase_index`, lobbyCode)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var line CanvasConnectingLine
		var phaseIndex int
		if err := rows.Scan(&line.ID, &line.FromID, &line.ToID, &line.StrokeColor, &line.StrokeWidth,
			&line.UploadedImages, &line.YoutubeLink, &line.Notes, &phaseIndex); err != nil {
			rows.Close()
			return nil, err
		}
		if phaseIndex >= 0 && phaseIndex < len(phases) {
			phases[phaseIndex].ConnectingLines = append(phases[phaseIndex].ConnectingLines, line)
		} else {
			log.Printf("WARNING: ConnectingLine %s has invalid phase index %d (valid range: 0-%d) in lobby %s", line.ID, phaseIndex, len(phases)-1, lobbyCode)
		}
	}
	rows.Close()

	return phases, nil
}

func SaveCanvasState(lobbyCode string, state FullCanvasState) error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	ctx := context.Background()
	tx, err := conn.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	// Delete all previous data for this lobby
	tables := []string{
		"canvas_agents", "canvas_abilities", "canvas_draw_lines",
		"canvas_texts", "canvas_images", "canvas_tool_icons", "canvas_connecting_lines",
	}
	for _, table := range tables {
		query := fmt.Sprintf("DELETE FROM %s WHERE lobby_code = $1",
			pgx.Identifier{table}.Sanitize())
		if _, err = tx.Exec(ctx, query, lobbyCode); err != nil {
			return err
		}
	}

	// --- Prepare slices for each table ---
	var (
		agentRows          [][]interface{}
		abilityRows        [][]interface{}
		lineRows           [][]interface{}
		textRows           [][]interface{}
		imageRows          [][]interface{}
		iconRows           [][]interface{}
		connectingLineRows [][]interface{}
	)

	for phaseIndex, phase := range state.Phases {

		// Agents
		for _, a := range phase.AgentsOnCanvas {
			agentRows = append(agentRows, []interface{}{
				a.ID, lobbyCode, a.AgentName, a.Role, a.X, a.Y, a.IsAlly, phaseIndex,
			})
		}

		// Abilities
		for _, ab := range phase.AbilitiesOnCanvas {
			var pathJSON []byte
			if ab.CurrentPath != nil {
				pathJSON, err = json.Marshal(ab.CurrentPath)
				if err != nil {
					return err
				}
			}
			abilityRows = append(abilityRows, []interface{}{
				ab.ID, lobbyCode, ab.AgentName, ab.Action, ab.X, ab.Y,
				pathJSON, ab.CurrentRotation, ab.CurrentLength, ab.IsAlly, ab.IconOnly, phaseIndex,
			})
		}

		// Draw lines
		for _, l := range phase.DrawLines {
			pointsJSON, err := json.Marshal(l.Points)
			if err != nil {
				return err
			}
			lineRows = append(lineRows, []interface{}{
				l.ID, lobbyCode, l.Tool, pointsJSON, l.Color, l.Size,
				l.IsDashed, l.IsArrowHead, phaseIndex,
			})
		}

		// Texts
		for _, t := range phase.TextsOnCanvas {
			textRows = append(textRows, []interface{}{
				t.ID, lobbyCode, t.Text, t.X, t.Y, t.Width, t.Height, phaseIndex,
			})
		}

		// Images
		for _, i := range phase.ImagesOnCanvas {
			imageRows = append(imageRows, []interface{}{
				i.ID, lobbyCode, i.Src, i.X, i.Y, i.Width, i.Height, phaseIndex,
			})
		}

		// Tool Icons
		for _, ic := range phase.ToolIconsOnCanvas {
			iconRows = append(iconRows, []interface{}{
				ic.ID, lobbyCode, ic.X, ic.Y, ic.Width, ic.Height, phaseIndex,
			})
		}

		// Connecting Lines
		for _, cl := range phase.ConnectingLines {
			connectingLineRows = append(connectingLineRows, []interface{}{
				cl.ID, lobbyCode, cl.FromID, cl.ToID, cl.StrokeColor, cl.StrokeWidth,
				cl.UploadedImages, cl.YoutubeLink, cl.Notes, phaseIndex,
			})
		}
	}

	// ---- INSERT DATA ----
	if len(agentRows) > 0 {
		_, err = tx.CopyFrom(
			ctx,
			pgx.Identifier{"canvas_agents"},
			[]string{"id", "lobby_code", "name", "role", "x", "y", "is_ally", "phase_index"},
			pgx.CopyFromRows(agentRows),
		)
		if err != nil {
			return fmt.Errorf("failed to insert agents: %w", err)
		}
	}

	if len(abilityRows) > 0 {
		_, err = tx.CopyFrom(
			ctx,
			pgx.Identifier{"canvas_abilities"},
			[]string{"id", "lobby_code", "name", "action", "x", "y", "current_path", "current_rotation", "current_length", "is_ally", "icon_only", "phase_index"},
			pgx.CopyFromRows(abilityRows),
		)
		if err != nil {
			return fmt.Errorf("failed to insert abilities: %w", err)
		}
	}

	if len(lineRows) > 0 {
		_, err = tx.CopyFrom(
			ctx,
			pgx.Identifier{"canvas_draw_lines"},
			[]string{"id", "lobby_code", "tool", "points", "color", "size", "is_dashed", "is_arrow_head", "phase_index"},
			pgx.CopyFromRows(lineRows),
		)
		if err != nil {
			return fmt.Errorf("failed to insert draw lines: %w", err)
		}
	}

	if len(textRows) > 0 {
		_, err = tx.CopyFrom(
			ctx,
			pgx.Identifier{"canvas_texts"},
			[]string{"id", "lobby_code", "text", "x", "y", "width", "height", "phase_index"},
			pgx.CopyFromRows(textRows),
		)
		if err != nil {
			return fmt.Errorf("failed to insert texts: %w", err)
		}
	}

	if len(imageRows) > 0 {
		_, err = tx.CopyFrom(
			ctx,
			pgx.Identifier{"canvas_images"},
			[]string{"id", "lobby_code", "src", "x", "y", "width", "height", "phase_index"},
			pgx.CopyFromRows(imageRows),
		)
		if err != nil {
			return fmt.Errorf("failed to insert images: %w", err)
		}
	}

	if len(iconRows) > 0 {
		_, err = tx.CopyFrom(
			ctx,
			pgx.Identifier{"canvas_tool_icons"},
			[]string{"id", "lobby_code", "x", "y", "width", "height", "phase_index"},
			pgx.CopyFromRows(iconRows),
		)
		if err != nil {
			return fmt.Errorf("failed to insert tool icons: %w", err)
		}
	}

	if len(connectingLineRows) > 0 {
		_, err = tx.CopyFrom(
			ctx,
			pgx.Identifier{"canvas_connecting_lines"},
			[]string{"id", "lobby_code", "from_id", "to_id", "stroke_color", "stroke_width", "uploaded_images", "youtube_link", "notes", "phase_index"},
			pgx.CopyFromRows(connectingLineRows),
		)
		if err != nil {
			return fmt.Errorf("failed to insert connecting lines: %w", err)
		}
	}

	return tx.Commit(ctx)
}
