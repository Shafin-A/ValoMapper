package models

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
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

var (
	ErrLobbyNotFound = errors.New("lobby not found")
	ErrInvalidPatch  = errors.New("invalid canvas patch")
)

func invalidPatchError(format string, args ...any) error {
	return fmt.Errorf("%w: %s", ErrInvalidPatch, fmt.Sprintf(format, args...))
}

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

func isAllowedLink(raw string) bool {
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

	if parsed.Scheme == "" {
		return true
	}

	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return false
	}

	if parsed.Host == "" {
		return false
	}

	return true
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

	// ---- AGENTS ----
	rows, err := tx.Query(ctx, `
		SELECT id, name, is_ally, is_gray, x, y, note, phase_index
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
		var agentNote sql.NullString
		if err := rows.Scan(&agent.ID, &agentName, &agent.IsAlly, &agent.IsGray, &agent.X, &agent.Y, &agentNote, &phaseIndex); err != nil {
			rows.Close()
			return nil, err
		}
		agent.AgentName = ""
		if agentName.Valid {
			agent.AgentName = agentName.String
		}
		agent.Note = ""
		if agentNote.Valid {
			agent.Note = agentNote.String
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
		SELECT id, name, action, x, y, attached_to_id, current_path, current_rotation, current_length, is_ally, icon_only, show_outer_circle, note, phase_index
		FROM canvas_abilities 
		WHERE lobby_code = $1 
		ORDER BY phase_index, sort_order`, lobbyCode)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var ability CanvasAbility
		var phaseIndex int
		var abilityName sql.NullString
		var attachedToID sql.NullString
		var abilityNote sql.NullString
		var pathArray []float64
		if err := rows.Scan(&ability.ID, &abilityName, &ability.Action, &ability.X, &ability.Y,
			&attachedToID, &pathArray, &ability.CurrentRotation, &ability.CurrentLength, &ability.IsAlly, &ability.IconOnly, &ability.ShowOuterCircle, &abilityNote, &phaseIndex); err != nil {
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
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// ---- DRAW LINES ----
	rows, err = tx.Query(ctx, `
		SELECT id, tool, points, color, size, is_dashed, is_arrow_head, shape, opacity, traversal_time, phase_index 
		FROM canvas_draw_lines 
		WHERE lobby_code = $1 
		ORDER BY phase_index, sort_order`, lobbyCode)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var line CanvasDrawLine
		var phaseIndex int
		var pointsArray []float64
		if err := rows.Scan(&line.ID, &line.Tool, &pointsArray, &line.Color, &line.Size, &line.IsDashed, &line.IsArrowHead, &line.Shape, &line.Opacity, &line.TraversalTime, &phaseIndex); err != nil {
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
		SELECT id, text, spans, font_size, x, y, width, height, note, phase_index
		FROM canvas_texts
		WHERE lobby_code = $1
		ORDER BY phase_index`, lobbyCode)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var text CanvasText
		var spansJSON []byte
		var fontSize sql.NullFloat64
		var textNote sql.NullString
		var phaseIndex int
		if err := rows.Scan(&text.ID, &text.Text, &spansJSON, &fontSize, &text.X, &text.Y, &text.Width, &text.Height, &textNote, &phaseIndex); err != nil {
			rows.Close()
			return nil, err
		}
		if len(spansJSON) > 0 {
			if err := json.Unmarshal(spansJSON, &text.Spans); err != nil {
				rows.Close()
				return nil, err
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
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// ---- IMAGES ----
	rows, err = tx.Query(ctx, `
		SELECT id, src, x, y, width, height, note, phase_index
		FROM canvas_images 
		WHERE lobby_code = $1 
		ORDER BY phase_index`, lobbyCode)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var image CanvasImage
		var imageNote sql.NullString
		var phaseIndex int
		if err := rows.Scan(&image.ID, &image.Src, &image.X, &image.Y, &image.Width, &image.Height, &imageNote, &phaseIndex); err != nil {
			rows.Close()
			return nil, err
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
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// ---- TOOL ICONS ----
	rows, err = tx.Query(ctx, `
		SELECT id, name, x, y, width, height, attached_to_id, note, phase_index
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
		var attachedToID sql.NullString
		var iconNote sql.NullString
		if err := rows.Scan(&icon.ID, &iconName, &icon.X, &icon.Y, &icon.Width, &icon.Height, &attachedToID, &iconNote, &phaseIndex); err != nil {
			rows.Close()
			return nil, err
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
	if len(state.Phases) > phaseCount {
		return invalidPatchError("canvas state has %d phases (max %d)", len(state.Phases), phaseCount)
	}

	for _, phase := range state.Phases {
		for _, i := range phase.ImagesOnCanvas {
			if i.Src != "" && !isAllowedImageSource(i.Src) {
				return invalidPatchError("invalid image source in canvas state: %s", i.Src)
			}
		}

		for _, cl := range phase.ConnectingLines {
			for _, img := range cl.UploadedImages {
				if img != "" && !isAllowedImageSource(img) {
					return invalidPatchError("invalid uploaded image source in connecting line canvas state: %s", img)
				}
			}

			if cl.YoutubeLink != "" && !isAllowedLink(cl.YoutubeLink) {
				return invalidPatchError("invalid link in connecting line canvas state: %s", cl.YoutubeLink)
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
	defer func() { _ = tx.Rollback(ctx) }()

	// Fail fast if another writer holds the lobby lock.
	var lobbyExists int
	if err = tx.QueryRow(ctx, "SELECT 1 FROM lobbies WHERE code = $1 FOR UPDATE NOWAIT", lobbyCode).Scan(&lobbyExists); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrLobbyNotFound
		}
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
				a.ID, lobbyCode, a.AgentName, a.X, a.Y, a.IsAlly, a.IsGray, phaseIndex, a.Note,
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
				ab.AttachedToID, pathArray, ab.CurrentRotation, ab.CurrentLength, ab.IsAlly, ab.IconOnly, ab.ShowOuterCircle, phaseIndex, ab.Note,
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
				l.IsDashed, l.IsArrowHead, l.Shape, l.Opacity, l.TraversalTime, phaseIndex,
			})
		}

		// Texts
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

			textRows = append(textRows, []any{
				t.ID, lobbyCode, t.Text, t.X, t.Y, t.Width, t.Height, phaseIndex,
				spansJSON, fontSize, t.Note,
			})
		}

		// Images
		for _, i := range phase.ImagesOnCanvas {
			imageRows = append(imageRows, []any{
				i.ID, lobbyCode, i.Src, i.X, i.Y, i.Width, i.Height, phaseIndex, i.Note,
			})
		}

		// Tool Icons
		for _, ic := range phase.ToolIconsOnCanvas {
			iconRows = append(iconRows, []any{
				ic.ID, lobbyCode, ic.Name, ic.X, ic.Y, ic.Width, ic.Height, ic.AttachedToID, phaseIndex, ic.Note,
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
		agentRows = dedupeRows(agentRows, []int{0, 1, 7})
		_, err = tx.CopyFrom(
			ctx,
			pgx.Identifier{"canvas_agents"},
			[]string{"id", "lobby_code", "name", "x", "y", "is_ally", "is_gray", "phase_index", "note"},
			pgx.CopyFromRows(agentRows),
		)
		if err != nil {
			return fmt.Errorf("failed to insert agents: %w", err)
		}
	}

	if len(abilityRows) > 0 {
		abilityRows = dedupeRows(abilityRows, []int{0, 1, 13})
		_, err = tx.CopyFrom(
			ctx,
			pgx.Identifier{"canvas_abilities"},
			[]string{"id", "lobby_code", "name", "action", "x", "y", "attached_to_id", "current_path", "current_rotation", "current_length", "is_ally", "icon_only", "show_outer_circle", "phase_index", "note"},
			pgx.CopyFromRows(abilityRows),
		)
		if err != nil {
			return fmt.Errorf("failed to insert abilities: %w", err)
		}
	}

	if len(lineRows) > 0 {
		lineRows = dedupeRows(lineRows, []int{0, 1, 11})
		_, err = tx.CopyFrom(
			ctx,
			pgx.Identifier{"canvas_draw_lines"},
			[]string{"id", "lobby_code", "tool", "points", "color", "size", "is_dashed", "is_arrow_head", "shape", "opacity", "traversal_time", "phase_index"},
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
			[]string{"id", "lobby_code", "text", "x", "y", "width", "height", "phase_index", "spans", "font_size", "note"},
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
			[]string{"id", "lobby_code", "src", "x", "y", "width", "height", "phase_index", "note"},
			pgx.CopyFromRows(imageRows),
		)
		if err != nil {
			return fmt.Errorf("failed to insert images: %w", err)
		}
	}

	if len(iconRows) > 0 {
		iconRows = dedupeRows(iconRows, []int{0, 1, 8})
		_, err = tx.CopyFrom(
			ctx,
			pgx.Identifier{"canvas_tool_icons"},
			[]string{"id", "lobby_code", "name", "x", "y", "width", "height", "attached_to_id", "phase_index", "note"},
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

	agentsJSON, err := marshalIconSettings(state.AgentsSettings)
	if err != nil {
		return err
	}
	abilitiesJSON, err := marshalIconSettings(state.AbilitiesSettings)
	if err != nil {
		return err
	}

	if _, err = tx.Exec(ctx, `
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
		state.EditedPhases, agentsJSON, abilitiesJSON, lobbyCode); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func marshalIconSettings(settings *IconSettings) ([]byte, error) {
	if settings == nil {
		return nil, nil
	}
	return json.Marshal(settings)
}

func ApplyCanvasPatch(ctx context.Context, lobbyCode string, patch CanvasPatch) (retErr error) {
	conn, err := db.GetDB()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(ctx, dbOperationTimeout)
	defer cancel()

	tx, err := conn.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if retErr != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	if _, err = tx.Exec(ctx, "SET LOCAL lock_timeout = '5s'"); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, "SET LOCAL statement_timeout = '10s'"); err != nil {
		return err
	}

	// The row lock also verifies the lobby exists.
	var lobbyExists int
	if err = tx.QueryRow(ctx, "SELECT 1 FROM lobbies WHERE code = $1 FOR UPDATE", lobbyCode).Scan(&lobbyExists); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrLobbyNotFound
		}
		return err
	}

	for _, entry := range patch.Entries {
		if err := applyPatchEntry(ctx, tx, lobbyCode, entry); err != nil {
			return err
		}
	}

	if err := setLobbyUpdatedAt(ctx, tx, lobbyCode); err != nil {
		return err
	}

	retErr = tx.Commit(ctx)
	return retErr
}
