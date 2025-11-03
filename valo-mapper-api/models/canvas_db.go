package models

import (
	"context"
	"encoding/json"
	"valo-mapper-api/db"
)

func GetCanvasStateDetails(lobbyCode string, phaseIndex int, baseState *FullCanvasState) error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	// Get agents
	rows, err := conn.Query(context.Background(),
		`SELECT id, name, role, is_ally, x, y, phase_index 
		FROM canvas_agents 
		WHERE lobby_code = $1 AND phase_index = $2`,
		lobbyCode, phaseIndex)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		agent := CanvasAgent{}
		err := rows.Scan(
			&agent.ID,
			&agent.AgentName,
			&agent.Role,
			&agent.IsAlly,
			&agent.X,
			&agent.Y,
			&agent.PhaseIndex,
		)
		if err != nil {
			return err
		}
		baseState.AgentsOnCanvas = append(baseState.AgentsOnCanvas, agent)
	}

	// Get abilities
	rows, err = conn.Query(context.Background(),
		`SELECT id, name, action, x, y, current_path, current_rotation, current_length, is_ally 
		FROM canvas_abilities 
		WHERE lobby_code = $1 AND phase_index = $2`,
		lobbyCode, phaseIndex)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		ability := CanvasAbility{}
		err := rows.Scan(
			&ability.ID,
			&ability.AgentName,
			&ability.Action,
			&ability.X,
			&ability.Y,
			&ability.CurrentPath,
			&ability.CurrentRotation,
			&ability.CurrentLength,
			&ability.IsAlly,
		)
		if err != nil {
			return err
		}
		baseState.AbilitiesOnCanvas = append(baseState.AbilitiesOnCanvas, ability)
	}

	// Get draw lines
	rows, err = conn.Query(context.Background(),
		`SELECT id, tool, points, color, size, is_dashed, is_arrow_head 
		FROM canvas_draw_lines 
		WHERE lobby_code = $1 AND phase_index = $2`,
		lobbyCode, phaseIndex)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		line := CanvasDrawLine{}
		var pointsJson []byte
		err := rows.Scan(
			&line.ID,
			&line.Tool,
			&pointsJson,
			&line.Color,
			&line.Size,
			&line.IsDashed,
			&line.IsArrowHead,
		)
		if err != nil {
			return err
		}
		baseState.DrawLines = append(baseState.DrawLines, line)
	}

	// Get texts
	rows, err = conn.Query(context.Background(),
		`SELECT id, text, x, y, width, height, phase_index 
		FROM canvas_texts 
		WHERE lobby_code = $1 AND phase_index = $2`,
		lobbyCode, phaseIndex)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		text := CanvasText{}
		err := rows.Scan(
			&text.ID,
			&text.Text,
			&text.X,
			&text.Y,
			&text.Width,
			&text.Height,
			&text.PhaseIndex,
		)
		if err != nil {
			return err
		}
		baseState.TextsOnCanvas = append(baseState.TextsOnCanvas, text)
	}

	// Get images
	rows, err = conn.Query(context.Background(),
		`SELECT id, src, x, y, width, height, phase_index 
		FROM canvas_images 
		WHERE lobby_code = $1 AND phase_index = $2`,
		lobbyCode, phaseIndex)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		image := CanvasImage{}
		err := rows.Scan(
			&image.ID,
			&image.Src,
			&image.X,
			&image.Y,
			&image.Width,
			&image.Height,
			&image.PhaseIndex,
		)
		if err != nil {
			return err
		}
		baseState.ImagesOnCanvas = append(baseState.ImagesOnCanvas, image)
	}

	// Get tool icons
	rows, err = conn.Query(context.Background(),
		`SELECT id, x, y, width, height, phase_index 
		FROM canvas_tool_icons 
		WHERE lobby_code = $1 AND phase_index = $2`,
		lobbyCode, phaseIndex)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		icon := CanvasToolIcon{}
		err := rows.Scan(
			&icon.ID,
			&icon.X,
			&icon.Y,
			&icon.Width,
			&icon.Height,
			&icon.PhaseIndex,
		)
		if err != nil {
			return err
		}
		baseState.ToolIconsOnCanvas = append(baseState.ToolIconsOnCanvas, icon)
	}

	return nil
}

func SaveCanvasState(lobbyCode string, state FullCanvasState) error {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	tx, err := conn.Begin(context.Background())
	if err != nil {
		return err
	}
	defer tx.Rollback(context.Background())

	for _, table := range []string{
		"canvas_agents", "canvas_abilities", "canvas_draw_lines",
		"canvas_texts", "canvas_images", "canvas_tool_icons",
	} {
		_, err = tx.Exec(context.Background(),
			`DELETE FROM `+table+` WHERE lobby_code = $1 AND phase_index = $2`,
			lobbyCode, state.CurrentPhaseIndex)
		if err != nil {
			return err
		}
	}

	// Insert agents
	for _, agent := range state.AgentsOnCanvas {
		_, err := tx.Exec(context.Background(),
			`INSERT INTO canvas_agents (id, lobby_code, name, role, x, y, is_ally, phase_index) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			agent.ID, lobbyCode, agent.AgentName, agent.Role,
			agent.X, agent.Y, agent.IsAlly,
			state.CurrentPhaseIndex)
		if err != nil {
			return err
		}
	}

	// Insert abilities
	for _, ability := range state.AbilitiesOnCanvas {
		var currentPathJson []byte
		if ability.CurrentPath != nil {
			currentPathJson, err = json.Marshal(ability.CurrentPath)
			if err != nil {
				return err
			}
		}

		_, err = tx.Exec(context.Background(),
			`INSERT INTO canvas_abilities (
				id, lobby_code, name, action, x, y,
				current_path, current_rotation, current_length,
				is_ally,phase_index
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
			ability.ID, lobbyCode, ability.AgentName, ability.Action,
			ability.X, ability.Y,
			currentPathJson, ability.CurrentRotation, ability.CurrentLength,
			ability.IsAlly, state.CurrentPhaseIndex)
		if err != nil {
			return err
		}
	}

	// Insert draw lines
	for _, line := range state.DrawLines {
		pointsJson, err := json.Marshal(line.Points)
		if err != nil {
			return err
		}

		_, err = tx.Exec(context.Background(),
			`INSERT INTO canvas_draw_lines (
				id, lobby_code, tool, points, color, size,
				is_dashed, is_arrow_head, phase_index
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			line.ID, lobbyCode, line.Tool, pointsJson,
			line.Color, line.Size, line.IsDashed, line.IsArrowHead,
			state.CurrentPhaseIndex)
		if err != nil {
			return err
		}
	}

	// Insert texts
	for _, text := range state.TextsOnCanvas {
		_, err = tx.Exec(context.Background(),
			`INSERT INTO canvas_texts (
				id, lobby_code, text, x, y,
				width, height, phase_index
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			text.ID, lobbyCode, text.Text,
			text.X, text.Y,
			text.Width, text.Height,
			state.CurrentPhaseIndex)
		if err != nil {
			return err
		}
	}

	// Insert images
	for _, img := range state.ImagesOnCanvas {
		_, err = tx.Exec(context.Background(),
			`INSERT INTO canvas_images (
				id, lobby_code, src, x, y,
				width, height, phase_index
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			img.ID, lobbyCode, img.Src,
			img.X, img.Y,
			img.Width, img.Height,
			state.CurrentPhaseIndex)
		if err != nil {
			return err
		}
	}

	// Insert tool icons
	for _, icon := range state.ToolIconsOnCanvas {
		_, err = tx.Exec(context.Background(),
			`INSERT INTO canvas_tool_icons (
				id, lobby_code, x, y,
				width, height, phase_index
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			icon.ID, lobbyCode,
			icon.X, icon.Y,
			icon.Width, icon.Height,
			state.CurrentPhaseIndex)
		if err != nil {
			return err
		}
	}

	return tx.Commit(context.Background())
}
