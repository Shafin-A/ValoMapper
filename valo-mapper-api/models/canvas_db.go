package models

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/url"
	"path"
	"strings"
	"time"
	"valo-mapper-api/db"

	"github.com/jackc/pgx/v5"
)

const (
	phaseCount         = 10
	dbOperationTimeout = 10 * time.Second
)

var allowedImageExtensions = map[string]struct{}{
	".jpg":  {},
	".jpeg": {},
	".png":  {},
	".gif":  {},
	".webp": {},
}

func hasBlockedProtocol(raw string) bool {
	trimmed := strings.TrimSpace(strings.ToLower(raw))
	return strings.HasPrefix(trimmed, "javascript:") || strings.HasPrefix(trimmed, "data:") || strings.HasPrefix(trimmed, "vbscript:") || strings.HasPrefix(trimmed, "file:")
}

func isAllowedYoutubeLink(raw string) bool {
	link := strings.TrimSpace(raw)
	if link == "" {
		return true
	}

	if hasBlockedProtocol(link) {
		return false
	}

	parsed, err := url.Parse(link)
	if err != nil {
		return false
	}

	host := strings.ToLower(parsed.Host)
	if host == "youtube.com" || host == "www.youtube.com" || host == "m.youtube.com" || host == "youtu.be" {
		return true
	}

	return false
}

func isAllowedImageSource(raw string) bool {
	ref := strings.TrimSpace(raw)
	if ref == "" {
		return false
	}

	if hasBlockedProtocol(ref) {
		return false
	}

	if strings.HasPrefix(ref, "images/") {
		return true
	}

	if strings.HasPrefix(ref, "/api/images/object") {
		u, err := url.Parse(ref)
		if err != nil {
			return false
		}
		if key := strings.TrimSpace(u.Query().Get("key")); key != "" {
			return true
		}
		return false
	}

	parsed, err := url.Parse(ref)
	if err != nil {
		return false
	}

	if parsed.Scheme == "" {
		ext := strings.ToLower(path.Ext(parsed.Path))
		_, ok := allowedImageExtensions[ext]
		return ok
	}

	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return false
	}
	if parsed.Host == "" {
		return false
	}

	ext := strings.ToLower(path.Ext(parsed.Path))
	if ext != "" {
		_, ok := allowedImageExtensions[ext]
		if ok {
			return true
		}
	}

	if strings.Contains(strings.ToLower(parsed.Path), "/images/") {
		return true
	}

	return false
}

func GetAllCanvasPhases(lobbyCode string) ([]PhaseState, error) {
	conn, err := db.GetDB()
	if err != nil {
		return nil, err
	}

	phases := make([]PhaseState, phaseCount)
	for i := range phaseCount {
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

	// ---- AGENTS ----
	rows, err := tx.Query(ctx, `
		SELECT id, name, is_ally, x, y, phase_index 
		FROM canvas_agents 
		WHERE lobby_code = $1 
		ORDER BY phase_index`, lobbyCode)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var agent CanvasAgent
		var phaseIndex int
		var agentName sql.NullString
		if err := rows.Scan(&agent.ID, &agentName, &agent.IsAlly, &agent.X, &agent.Y, &phaseIndex); err != nil {
			rows.Close()
			return nil, err
		}
		agent.AgentName = ""
		if agentName.Valid {
			agent.AgentName = agentName.String
		}
		agent.Role = agentRoleByName[agent.AgentName]
		if phaseIndex >= 0 && phaseIndex < len(phases) {
			phases[phaseIndex].AgentsOnCanvas = append(phases[phaseIndex].AgentsOnCanvas, agent)
		} else {
			slog.Warn("agent has invalid phase index", "agent_id", agent.ID, "phase_index", phaseIndex, "max_index", len(phases)-1, "lobby_code", lobbyCode)
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// ---- ABILITIES ----
	rows, err = tx.Query(ctx, `
		SELECT id, name, action, x, y, current_path, current_rotation, current_length, is_ally, icon_only, show_outer_circle, phase_index 
		FROM canvas_abilities 
		WHERE lobby_code = $1 
		ORDER BY phase_index`, lobbyCode)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var ability CanvasAbility
		var phaseIndex int
		var abilityName sql.NullString
		var pathArray []float64
		if err := rows.Scan(&ability.ID, &abilityName, &ability.Action, &ability.X, &ability.Y,
			&pathArray, &ability.CurrentRotation, &ability.CurrentLength, &ability.IsAlly, &ability.IconOnly, &ability.ShowOuterCircle, &phaseIndex); err != nil {
			rows.Close()
			return nil, err
		}
		ability.CurrentPath = make([]Position, 0, len(pathArray)/2)
		for i := 0; i+1 < len(pathArray); i += 2 {
			ability.CurrentPath = append(ability.CurrentPath, Position{X: pathArray[i], Y: pathArray[i+1]})
		}
		ability.AgentName = ""
		if abilityName.Valid {
			ability.AgentName = abilityName.String
		}
		if phaseIndex >= 0 && phaseIndex < len(phases) {
			phases[phaseIndex].AbilitiesOnCanvas = append(phases[phaseIndex].AbilitiesOnCanvas, ability)
		} else {
			slog.Warn("ability has invalid phase index", "ability_id", ability.ID, "phase_index", phaseIndex, "max_index", len(phases)-1, "lobby_code", lobbyCode)
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// ---- DRAW LINES ----
	rows, err = tx.Query(ctx, `
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
		var pointsArray []float64
		if err := rows.Scan(&line.ID, &line.Tool, &pointsArray, &line.Color, &line.Size, &line.IsDashed, &line.IsArrowHead, &phaseIndex); err != nil {
			rows.Close()
			return nil, err
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
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// ---- TEXTS ----
	rows, err = tx.Query(ctx, `
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
			slog.Warn("text has invalid phase index", "text_id", text.ID, "phase_index", phaseIndex, "max_index", len(phases)-1, "lobby_code", lobbyCode)
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// ---- IMAGES ----
	rows, err = tx.Query(ctx, `
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
			slog.Warn("image has invalid phase index", "image_id", image.ID, "phase_index", phaseIndex, "max_index", len(phases)-1, "lobby_code", lobbyCode)
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// ---- TOOL ICONS ----
	rows, err = tx.Query(ctx, `
		SELECT id, name, x, y, width, height, phase_index 
		FROM canvas_tool_icons 
		WHERE lobby_code = $1 
		ORDER BY phase_index`, lobbyCode)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var icon CanvasToolIcon
		var phaseIndex int
		var iconName sql.NullString
		if err := rows.Scan(&icon.ID, &iconName, &icon.X, &icon.Y, &icon.Width, &icon.Height, &phaseIndex); err != nil {
			rows.Close()
			return nil, err
		}
		icon.Name = ""
		if iconName.Valid {
			icon.Name = iconName.String
		}
		if phaseIndex >= 0 && phaseIndex < len(phases) {
			phases[phaseIndex].ToolIconsOnCanvas = append(phases[phaseIndex].ToolIconsOnCanvas, icon)
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// ---- CONNECTING LINES ----
	rows, err = tx.Query(ctx, `
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
			slog.Warn("connecting line has invalid phase index", "line_id", line.ID, "phase_index", phaseIndex, "max_index", len(phases)-1, "lobby_code", lobbyCode)
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return phases, nil
}

func validateCanvasState(state FullCanvasState) error {
	for _, phase := range state.Phases {
		for _, i := range phase.ImagesOnCanvas {
			if i.Src != "" && !isAllowedImageSource(i.Src) {
				return fmt.Errorf("invalid image source in canvas state: %s", i.Src)
			}
		}

		for _, cl := range phase.ConnectingLines {
			for _, img := range cl.UploadedImages {
				if img != "" && !isAllowedImageSource(img) {
					return fmt.Errorf("invalid uploaded image source in connecting line canvas state: %s", img)
				}
			}

			if cl.YoutubeLink != "" && !isAllowedYoutubeLink(cl.YoutubeLink) {
				return fmt.Errorf("invalid youtube link in connecting line canvas state: %s", cl.YoutubeLink)
			}
		}
	}
	return nil
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
	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	// Prevent race conditions from concurrent lobby updates.
	// Use NOWAIT to fail fast if another writer has the lobby lock.
	if _, err = tx.Exec(ctx, "SELECT 1 FROM lobbies WHERE code = $1 FOR UPDATE NOWAIT", lobbyCode); err != nil {
		return err
	}

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
		agentRows          [][]any
		abilityRows        [][]any
		lineRows           [][]any
		textRows           [][]any
		imageRows          [][]any
		iconRows           [][]any
		connectingLineRows [][]any
	)

	for phaseIndex, phase := range state.Phases {

		// Agents
		for _, a := range phase.AgentsOnCanvas {
			agentRows = append(agentRows, []any{
				a.ID, lobbyCode, a.AgentName, a.X, a.Y, a.IsAlly, phaseIndex,
			})
		}

		// Abilities
		for _, ab := range phase.AbilitiesOnCanvas {
			pathArray := make([]float64, 0)
			for _, pt := range ab.CurrentPath {
				pathArray = append(pathArray, pt.X, pt.Y)
			}
			abilityRows = append(abilityRows, []any{
				ab.ID, lobbyCode, ab.AgentName, ab.Action, ab.X, ab.Y,
				pathArray, ab.CurrentRotation, ab.CurrentLength, ab.IsAlly, ab.IconOnly, ab.ShowOuterCircle, phaseIndex,
			})
		}

		// Draw lines
		for _, l := range phase.DrawLines {
			pointsArray := make([]float64, 0)
			for _, p := range l.Points {
				pointsArray = append(pointsArray, p.X, p.Y)
			}
			lineRows = append(lineRows, []any{
				l.ID, lobbyCode, l.Tool, pointsArray, l.Color, l.Size,
				l.IsDashed, l.IsArrowHead, phaseIndex,
			})
		}

		// Texts
		for _, t := range phase.TextsOnCanvas {
			textRows = append(textRows, []any{
				t.ID, lobbyCode, t.Text, t.X, t.Y, t.Width, t.Height, phaseIndex,
			})
		}

		// Images
		for _, i := range phase.ImagesOnCanvas {
			imageRows = append(imageRows, []any{
				i.ID, lobbyCode, i.Src, i.X, i.Y, i.Width, i.Height, phaseIndex,
			})
		}

		// Tool Icons
		for _, ic := range phase.ToolIconsOnCanvas {
			iconRows = append(iconRows, []any{
				ic.ID, lobbyCode, ic.Name, ic.X, ic.Y, ic.Width, ic.Height, phaseIndex,
			})
		}

		// Connecting Lines
		for _, cl := range phase.ConnectingLines {
			connectingLineRows = append(connectingLineRows, []any{
				cl.ID, lobbyCode, cl.FromID, cl.ToID, cl.StrokeColor, cl.StrokeWidth,
				cl.UploadedImages, cl.YoutubeLink, cl.Notes, phaseIndex,
			})
		}
	}

	// ---- INSERT DATA ----
	// Deduplicate row inserts in case the client has repeated elements in the snapshot.
	dedupeRows := func(rows [][]any, keyIndices []int) [][]any {
		seen := make(map[string]struct{}, len(rows))
		filtered := make([][]any, 0, len(rows))

		for _, row := range rows {
			keyParts := make([]string, 0, len(keyIndices))
			for _, idx := range keyIndices {
				if idx < 0 || idx >= len(row) {
					keyParts = append(keyParts, "")
					continue
				}
				keyParts = append(keyParts, fmt.Sprintf("%v", row[idx]))
			}
			key := strings.Join(keyParts, "\x00")
			if _, exists := seen[key]; exists {
				continue
			}
			seen[key] = struct{}{}
			filtered = append(filtered, row)
		}
		return filtered
	}

	if len(agentRows) > 0 {
		agentRows = dedupeRows(agentRows, []int{0, 1, 6})
		_, err = tx.CopyFrom(
			ctx,
			pgx.Identifier{"canvas_agents"},
			[]string{"id", "lobby_code", "name", "x", "y", "is_ally", "phase_index"},
			pgx.CopyFromRows(agentRows),
		)
		if err != nil {
			return fmt.Errorf("failed to insert agents: %w", err)
		}
	}

	if len(abilityRows) > 0 {
		abilityRows = dedupeRows(abilityRows, []int{0, 1, 12})
		_, err = tx.CopyFrom(
			ctx,
			pgx.Identifier{"canvas_abilities"},
			[]string{"id", "lobby_code", "name", "action", "x", "y", "current_path", "current_rotation", "current_length", "is_ally", "icon_only", "show_outer_circle", "phase_index"},
			pgx.CopyFromRows(abilityRows),
		)
		if err != nil {
			return fmt.Errorf("failed to insert abilities: %w", err)
		}
	}

	if len(lineRows) > 0 {
		lineRows = dedupeRows(lineRows, []int{0, 1, 8})
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
		textRows = dedupeRows(textRows, []int{0, 1, 7})
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
		imageRows = dedupeRows(imageRows, []int{0, 1, 7})
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
		iconRows = dedupeRows(iconRows, []int{0, 1, 7})
		_, err = tx.CopyFrom(
			ctx,
			pgx.Identifier{"canvas_tool_icons"},
			[]string{"id", "lobby_code", "name", "x", "y", "width", "height", "phase_index"},
			pgx.CopyFromRows(iconRows),
		)
		if err != nil {
			return fmt.Errorf("failed to insert tool icons: %w", err)
		}
	}

	if len(connectingLineRows) > 0 {
		connectingLineRows = dedupeRows(connectingLineRows, []int{0, 1, 9})
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

func ApplyCanvasPatch(lobbyCode string, patch CanvasPatch) (retErr error) {
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
		if retErr != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	// Lock lobby row to avoid race with full SaveCanvasState path.
	if _, err = tx.Exec(ctx, "SELECT 1 FROM lobbies WHERE code = $1 FOR UPDATE", lobbyCode); err != nil {
		return err
	}

	for _, entry := range patch.Entries {
		if err := applyPatchEntry(tx, lobbyCode, entry); err != nil {
			return err
		}
	}

	if err := setLobbyUpdatedAt(tx, lobbyCode); err != nil {
		return err
	}

	retErr = tx.Commit(ctx)
	return retErr
}

func setLobbyUpdatedAt(tx pgx.Tx, lobbyCode string) error {
	_, err := tx.Exec(context.Background(), "UPDATE lobbies SET updated_at = NOW() WHERE code = $1", lobbyCode)
	return err
}

func applyPatchEntry(tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	switch strings.ToLower(entry.Entity) {
	case "agent":
		return applyAgentPatch(tx, lobbyCode, entry)
	case "ability":
		return applyAbilityPatch(tx, lobbyCode, entry)
	case "drawline":
		return applyDrawLinePatch(tx, lobbyCode, entry)
	case "connectingline":
		return applyConnectingLinePatch(tx, lobbyCode, entry)
	case "text":
		return applyTextPatch(tx, lobbyCode, entry)
	case "image":
		return applyImagePatch(tx, lobbyCode, entry)
	case "toolicon":
		return applyToolIconPatch(tx, lobbyCode, entry)
	case "map":
		return applyMapPatch(tx, lobbyCode, entry)
	case "side":
		return applyMapSidePatch(tx, lobbyCode, entry)
	case "phase":
		return applyPhasePatch(tx, lobbyCode, entry)
	case "edited_phases":
		return applyEditedPhasesPatch(tx, lobbyCode, entry)
	case "canvas":
		return applyCanvasClearPatch(tx, lobbyCode, entry)
	case "agents_settings":
		return applyAgentsSettingsPatch(tx, lobbyCode, entry)
	case "abilities_settings":
		return applyAbilitiesSettingsPatch(tx, lobbyCode, entry)
	default:
		return fmt.Errorf("unsupported canvas entity: %s", entry.Entity)
	}
}

func applyAgentPatch(tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	if strings.EqualFold(entry.Action, "remove") || strings.EqualFold(entry.Action, "delete") {
		if entry.ID == "" {
			return fmt.Errorf("missing id for agent remove")
		}
		_, err := tx.Exec(context.Background(), "DELETE FROM canvas_agents WHERE id = $1 AND lobby_code = $2 AND phase_index = $3", entry.ID, lobbyCode, entry.PhaseIndex)
		return err
	}

	var p CanvasAgent
	if entry.Payload != nil {
		payloadJSON, err := json.Marshal(entry.Payload)
		if err != nil {
			return err
		}
		if err := json.Unmarshal(payloadJSON, &p); err != nil {
			return err
		}
	}

	if p.ID == "" {
		p.ID = entry.ID
	}
	if p.ID == "" {
		return fmt.Errorf("missing id for agent upsert")
	}

	_, err := tx.Exec(context.Background(), `
		INSERT INTO canvas_agents (id, lobby_code, phase_index, name, x, y, is_ally)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (id, lobby_code, phase_index) DO UPDATE
		SET name = EXCLUDED.name, x = EXCLUDED.x, y = EXCLUDED.y, is_ally = EXCLUDED.is_ally`,
		p.ID, lobbyCode, entry.PhaseIndex, p.AgentName, p.X, p.Y, p.IsAlly)
	return err
}

func applyAbilityPatch(tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	if strings.EqualFold(entry.Action, "remove") || strings.EqualFold(entry.Action, "delete") {
		if entry.ID == "" {
			return fmt.Errorf("missing id for ability remove")
		}
		_, err := tx.Exec(context.Background(), "DELETE FROM canvas_abilities WHERE id = $1 AND lobby_code = $2 AND phase_index = $3", entry.ID, lobbyCode, entry.PhaseIndex)
		return err
	}

	var p CanvasAbility
	if entry.Payload != nil {
		payloadJSON, err := json.Marshal(entry.Payload)
		if err != nil {
			return err
		}
		if err := json.Unmarshal(payloadJSON, &p); err != nil {
			return err
		}
	}

	if p.ID == "" {
		p.ID = entry.ID
	}
	if p.ID == "" {
		return fmt.Errorf("missing id for ability upsert")
	}

	pathArray := make([]float64, 0)
	for _, pt := range p.CurrentPath {
		pathArray = append(pathArray, pt.X, pt.Y)
	}

	_, err := tx.Exec(context.Background(), `
		INSERT INTO canvas_abilities (id, lobby_code, phase_index, name, action, x, y, current_path, current_rotation, current_length, is_ally, icon_only, show_outer_circle)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (id, lobby_code, phase_index) DO UPDATE
		SET name = EXCLUDED.name, action = EXCLUDED.action, x = EXCLUDED.x, y = EXCLUDED.y,
		    current_path = EXCLUDED.current_path, current_rotation = EXCLUDED.current_rotation, current_length = EXCLUDED.current_length,
		    is_ally = EXCLUDED.is_ally, icon_only = EXCLUDED.icon_only, show_outer_circle = EXCLUDED.show_outer_circle`,
		p.ID, lobbyCode, entry.PhaseIndex, p.AgentName, p.Action, p.X, p.Y, pathArray, p.CurrentRotation, p.CurrentLength, p.IsAlly, p.IconOnly, p.ShowOuterCircle)
	return err
}

func applyDrawLinePatch(tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	if strings.EqualFold(entry.Action, "remove") || strings.EqualFold(entry.Action, "delete") {
		if entry.ID == "" {
			return fmt.Errorf("missing id for draw line remove")
		}
		_, err := tx.Exec(context.Background(), `DELETE FROM canvas_draw_lines WHERE (id = $1 OR id LIKE $1 || '-chunk-%') AND lobby_code = $2 AND phase_index = $3`, entry.ID, lobbyCode, entry.PhaseIndex)
		return err
	}

	var p CanvasDrawLine
	if entry.Payload != nil {
		payloadJSON, err := json.Marshal(entry.Payload)
		if err != nil {
			return err
		}
		if err := json.Unmarshal(payloadJSON, &p); err != nil {
			return err
		}
	}

	if p.ID == "" {
		p.ID = entry.ID
	}
	if p.ID == "" {
		return fmt.Errorf("missing id for draw line upsert")
	}

	pointsArray := make([]float64, 0)
	for _, pt := range p.Points {
		pointsArray = append(pointsArray, pt.X, pt.Y)
	}

	_, err := tx.Exec(context.Background(), `
		INSERT INTO canvas_draw_lines (id, lobby_code, phase_index, tool, points, color, size, is_dashed, is_arrow_head)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (id, lobby_code, phase_index) DO UPDATE
		SET tool = EXCLUDED.tool, points = EXCLUDED.points, color = EXCLUDED.color, size = EXCLUDED.size,
		    is_dashed = EXCLUDED.is_dashed, is_arrow_head = EXCLUDED.is_arrow_head`,
		p.ID, lobbyCode, entry.PhaseIndex, p.Tool, pointsArray, p.Color, p.Size, p.IsDashed, p.IsArrowHead)
	return err
}

func applyConnectingLinePatch(tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	if strings.EqualFold(entry.Action, "remove") || strings.EqualFold(entry.Action, "delete") {
		if entry.ID == "" {
			return fmt.Errorf("missing id for connecting line remove")
		}
		_, err := tx.Exec(context.Background(), "DELETE FROM canvas_connecting_lines WHERE id = $1 AND lobby_code = $2 AND phase_index = $3", entry.ID, lobbyCode, entry.PhaseIndex)
		return err
	}

	var p CanvasConnectingLine
	if entry.Payload != nil {
		payloadJSON, err := json.Marshal(entry.Payload)
		if err != nil {
			return err
		}
		if err := json.Unmarshal(payloadJSON, &p); err != nil {
			return err
		}
	}

	if p.ID == "" {
		p.ID = entry.ID
	}
	if p.ID == "" {
		return fmt.Errorf("missing id for connecting line upsert")
	}

	for _, img := range p.UploadedImages {
		if img != "" && !isAllowedImageSource(img) {
			return fmt.Errorf("invalid uploaded image source in connecting line: %s", img)
		}
	}

	if p.YoutubeLink != "" && !isAllowedYoutubeLink(p.YoutubeLink) {
		return fmt.Errorf("invalid youtube link in connecting line: %s", p.YoutubeLink)
	}

	_, err := tx.Exec(context.Background(), `
		INSERT INTO canvas_connecting_lines (id, lobby_code, phase_index, from_id, to_id, stroke_color, stroke_width, uploaded_images, youtube_link, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (id, lobby_code, phase_index) DO UPDATE
		SET from_id = EXCLUDED.from_id, to_id = EXCLUDED.to_id, stroke_color = EXCLUDED.stroke_color,
		    stroke_width = EXCLUDED.stroke_width, uploaded_images = EXCLUDED.uploaded_images,
		    youtube_link = EXCLUDED.youtube_link, notes = EXCLUDED.notes`,
		p.ID, lobbyCode, entry.PhaseIndex, p.FromID, p.ToID, p.StrokeColor, p.StrokeWidth, p.UploadedImages, p.YoutubeLink, p.Notes)
	return err
}

func applyTextPatch(tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	if strings.EqualFold(entry.Action, "remove") || strings.EqualFold(entry.Action, "delete") {
		if entry.ID == "" {
			return fmt.Errorf("missing id for text remove")
		}
		_, err := tx.Exec(context.Background(), "DELETE FROM canvas_texts WHERE id = $1 AND lobby_code = $2 AND phase_index = $3", entry.ID, lobbyCode, entry.PhaseIndex)
		return err
	}

	var p CanvasText
	if entry.Payload != nil {
		payloadJSON, err := json.Marshal(entry.Payload)
		if err != nil {
			return err
		}
		if err := json.Unmarshal(payloadJSON, &p); err != nil {
			return err
		}
	}

	if p.ID == "" {
		p.ID = entry.ID
	}
	if p.ID == "" {
		return fmt.Errorf("missing id for text upsert")
	}

	_, err := tx.Exec(context.Background(), `
		INSERT INTO canvas_texts (id, lobby_code, phase_index, text, x, y, width, height)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (id, lobby_code, phase_index) DO UPDATE
		SET text = EXCLUDED.text, x = EXCLUDED.x, y = EXCLUDED.y, width = EXCLUDED.width, height = EXCLUDED.height`,
		p.ID, lobbyCode, entry.PhaseIndex, p.Text, p.X, p.Y, p.Width, p.Height)
	return err
}

func applyImagePatch(tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	if strings.EqualFold(entry.Action, "remove") || strings.EqualFold(entry.Action, "delete") {
		if entry.ID == "" {
			return fmt.Errorf("missing id for image remove")
		}
		_, err := tx.Exec(context.Background(), "DELETE FROM canvas_images WHERE id = $1 AND lobby_code = $2 AND phase_index = $3", entry.ID, lobbyCode, entry.PhaseIndex)
		return err
	}

	var p CanvasImage
	if entry.Payload != nil {
		payloadJSON, err := json.Marshal(entry.Payload)
		if err != nil {
			return err
		}
		if err := json.Unmarshal(payloadJSON, &p); err != nil {
			return err
		}
	}

	if p.ID == "" {
		p.ID = entry.ID
	}
	if p.ID == "" {
		return fmt.Errorf("missing id for image upsert")
	}

	if p.Src == "" {
		var existingSrc string
		err := tx.QueryRow(context.Background(), "SELECT src FROM canvas_images WHERE id = $1 AND lobby_code = $2 AND phase_index = $3", p.ID, lobbyCode, entry.PhaseIndex).Scan(&existingSrc)
		if err != nil && err != pgx.ErrNoRows {
			return err
		}
		if existingSrc != "" {
			p.Src = existingSrc
		}
	}

	if p.Src != "" && !isAllowedImageSource(p.Src) {
		return fmt.Errorf("invalid image source: %s", p.Src)
	}

	_, err := tx.Exec(context.Background(), `
		INSERT INTO canvas_images (id, lobby_code, phase_index, src, x, y, width, height)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (id, lobby_code, phase_index) DO UPDATE
		SET src = EXCLUDED.src, x = EXCLUDED.x, y = EXCLUDED.y, width = EXCLUDED.width, height = EXCLUDED.height`,
		p.ID, lobbyCode, entry.PhaseIndex, p.Src, p.X, p.Y, p.Width, p.Height)
	return err
}

func applyToolIconPatch(tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	if strings.EqualFold(entry.Action, "remove") || strings.EqualFold(entry.Action, "delete") {
		if entry.ID == "" {
			return fmt.Errorf("missing id for tool icon remove")
		}
		_, err := tx.Exec(context.Background(), "DELETE FROM canvas_tool_icons WHERE id = $1 AND lobby_code = $2 AND phase_index = $3", entry.ID, lobbyCode, entry.PhaseIndex)
		return err
	}

	var p CanvasToolIcon
	if entry.Payload != nil {
		payloadJSON, err := json.Marshal(entry.Payload)
		if err != nil {
			return err
		}
		if err := json.Unmarshal(payloadJSON, &p); err != nil {
			return err
		}
	}

	if p.ID == "" {
		p.ID = entry.ID
	}
	if p.ID == "" {
		return fmt.Errorf("missing id for tool icon upsert")
	}

	_, err := tx.Exec(context.Background(), `
		INSERT INTO canvas_tool_icons (id, lobby_code, phase_index, name, x, y, width, height)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (id, lobby_code, phase_index) DO UPDATE
		SET name = EXCLUDED.name, x = EXCLUDED.x, y = EXCLUDED.y, width = EXCLUDED.width, height = EXCLUDED.height`,
		p.ID, lobbyCode, entry.PhaseIndex, p.Name, p.X, p.Y, p.Width, p.Height)
	return err
}

func applyMapPatch(tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	if !strings.EqualFold(entry.Action, "update") && !strings.EqualFold(entry.Action, "set") && !strings.EqualFold(entry.Action, "change") {
		return fmt.Errorf("invalid action for map patch: %s", entry.Action)
	}

	if entry.Payload == nil {
		return fmt.Errorf("payload required for map patch")
	}

	idRaw, ok := entry.Payload["id"]
	if !ok {
		return fmt.Errorf("map patch payload missing id")
	}
	id, ok := idRaw.(string)
	if !ok || id == "" {
		return fmt.Errorf("invalid map id in payload")
	}

	// validate map exists.
	var exists bool
	if err := tx.QueryRow(context.Background(), "SELECT EXISTS(SELECT 1 FROM maps WHERE id = $1)", id).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("map id not found: %s", id)
	}

	_, err := tx.Exec(context.Background(), "UPDATE lobbies SET selected_map_id = $1 WHERE code = $2", id, lobbyCode)
	return err
}

func applyMapSidePatch(tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	if !strings.EqualFold(entry.Action, "update") && !strings.EqualFold(entry.Action, "set") {
		return fmt.Errorf("invalid action for side patch: %s", entry.Action)
	}

	var mapSide string
	if entry.Payload != nil {
		if side, ok := entry.Payload["mapSide"]; ok {
			if s, ok := side.(string); ok {
				mapSide = s
			}
		}
	}

	if mapSide == "" {
		if entry.ID != "" {
			mapSide = entry.ID
		}
	}

	if mapSide == "" {
		return fmt.Errorf("map side is required")
	}

	allowed := map[string]struct{}{"attack": {}, "defense": {}, "defend": {}}
	if _, ok := allowed[strings.ToLower(mapSide)]; !ok {
		return fmt.Errorf("invalid map side: %s", mapSide)
	}

	// standardize to canonical value
	if strings.EqualFold(mapSide, "defend") {
		mapSide = "defense"
	}

	_, err := tx.Exec(context.Background(), "UPDATE lobbies SET map_side = $1 WHERE code = $2", mapSide, lobbyCode)
	return err
}

func applyPhasePatch(tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	if !strings.EqualFold(entry.Action, "update") && !strings.EqualFold(entry.Action, "set") {
		return fmt.Errorf("invalid action for phase patch: %s", entry.Action)
	}

	phaseIndex := entry.PhaseIndex
	if entry.Payload != nil {
		if pv, ok := entry.Payload["phaseIndex"]; ok {
			if pi, ok := pv.(float64); ok {
				phaseIndex = int(pi)
			}
		}
	}

	if phaseIndex < 0 || phaseIndex >= phaseCount {
		return fmt.Errorf("invalid phase index: %d", phaseIndex)
	}

	_, err := tx.Exec(context.Background(), `
		UPDATE lobbies SET current_phase_index = $1 WHERE code = $2`,
		phaseIndex, lobbyCode)
	return err
}

func applyEditedPhasesPatch(tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	if !strings.EqualFold(entry.Action, "update") && !strings.EqualFold(entry.Action, "set") {
		return fmt.Errorf("invalid action for edited_phases patch: %s", entry.Action)
	}

	edited, ok := entry.Payload["editedPhases"]
	if !ok {
		edited, ok = entry.Payload["edited_phases"]
	}
	if !ok {
		return fmt.Errorf("editedPhases payload is required")
	}

	var phases []int

	switch v := edited.(type) {
	case []any:
		for _, item := range v {
			if n, ok := item.(float64); ok {
				phases = append(phases, int(n))
			}
		}
	case []int:
		phases = v
	default:
		return fmt.Errorf("invalid editedPhases type")
	}

	for _, p := range phases {
		if p < 0 || p >= phaseCount {
			return fmt.Errorf("invalid edited phase index: %d", p)
		}
	}

	_, err := tx.Exec(context.Background(), `
		UPDATE lobbies SET edited_phases = $1 WHERE code = $2`,
		phases, lobbyCode)
	return err
}

func applyCanvasClearPatch(tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	if !strings.EqualFold(entry.Action, "clear") && !strings.EqualFold(entry.Action, "reset") {
		return fmt.Errorf("invalid action for canvas patch: %s", entry.Action)
	}

	resetAll := false
	if entry.Payload != nil {
		if ra, ok := entry.Payload["resetAll"]; ok {
			if b, ok := ra.(bool); ok {
				resetAll = b
			}
		}
	}
	if strings.EqualFold(entry.Action, "reset") {
		resetAll = true
	}

	canvasTables := []string{
		"canvas_agents",
		"canvas_abilities",
		"canvas_draw_lines",
		"canvas_texts",
		"canvas_images",
		"canvas_tool_icons",
		"canvas_connecting_lines",
	}

	if resetAll {
		for _, table := range canvasTables {
			query := fmt.Sprintf("DELETE FROM %s WHERE lobby_code = $1", pgx.Identifier{table}.Sanitize())
			if _, err := tx.Exec(context.Background(), query, lobbyCode); err != nil {
				return err
			}
		}

		_, err := tx.Exec(context.Background(), `
			UPDATE lobbies
			SET current_phase_index = $1, edited_phases = $2
			WHERE code = $3`,
			0, []int{0}, lobbyCode)
		return err
	}

	phaseIndex := entry.PhaseIndex
	if phaseIndex < 0 || phaseIndex >= phaseCount {
		return fmt.Errorf("invalid phase index for canvas clear: %d", phaseIndex)
	}

	for _, table := range canvasTables {
		query := fmt.Sprintf("DELETE FROM %s WHERE lobby_code = $1 AND phase_index = $2", pgx.Identifier{table}.Sanitize())
		if _, err := tx.Exec(context.Background(), query, lobbyCode, phaseIndex); err != nil {
			return err
		}
	}

	var editedPhases []int
	if err := tx.QueryRow(context.Background(), "SELECT edited_phases FROM lobbies WHERE code = $1", lobbyCode).Scan(&editedPhases); err != nil {
		return err
	}

	updatedEdited := make([]int, 0, len(editedPhases)+1)
	hasZero := false
	for _, phase := range editedPhases {
		if phase == phaseIndex {
			continue
		}
		if phase == 0 {
			hasZero = true
		}
		updatedEdited = append(updatedEdited, phase)
	}
	if !hasZero {
		updatedEdited = append(updatedEdited, 0)
	}

	_, err := tx.Exec(context.Background(), "UPDATE lobbies SET edited_phases = $1 WHERE code = $2", updatedEdited, lobbyCode)
	return err
}

func applyAgentsSettingsPatch(tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	if !strings.EqualFold(entry.Action, "update") && !strings.EqualFold(entry.Action, "set") {
		return fmt.Errorf("invalid action for agents_settings patch: %s", entry.Action)
	}

	if entry.Payload == nil {
		return fmt.Errorf("payload required for agents_settings patch")
	}

	data, ok := entry.Payload["agentsSettings"]
	if !ok {
		return fmt.Errorf("agentsSettings payload is required")
	}

	payloadJSON, err := json.Marshal(data)
	if err != nil {
		return err
	}

	var settings IconSettings
	if err := json.Unmarshal(payloadJSON, &settings); err != nil {
		return err
	}

	settingsJSON, err := json.Marshal(settings)
	if err != nil {
		return err
	}

	_, err = tx.Exec(context.Background(), "UPDATE lobbies SET agents_settings = $1 WHERE code = $2", settingsJSON, lobbyCode)
	return err
}

func applyAbilitiesSettingsPatch(tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	if !strings.EqualFold(entry.Action, "update") && !strings.EqualFold(entry.Action, "set") {
		return fmt.Errorf("invalid action for abilities_settings patch: %s", entry.Action)
	}

	if entry.Payload == nil {
		return fmt.Errorf("payload required for abilities_settings patch")
	}

	data, ok := entry.Payload["abilitiesSettings"]
	if !ok {
		return fmt.Errorf("abilitiesSettings payload is required")
	}

	payloadJSON, err := json.Marshal(data)
	if err != nil {
		return err
	}

	var settings IconSettings
	if err := json.Unmarshal(payloadJSON, &settings); err != nil {
		return err
	}

	settingsJSON, err := json.Marshal(settings)
	if err != nil {
		return err
	}

	_, err = tx.Exec(context.Background(), "UPDATE lobbies SET abilities_settings = $1 WHERE code = $2", settingsJSON, lobbyCode)
	return err
}
