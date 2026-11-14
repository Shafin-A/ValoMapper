package models

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

type entityPatch struct {
	label       string
	table       string
	columns     []string
	conflictSet string
	insertSQL   string
	deleteSQL   string
	buildValues func(context.Context, pgx.Tx, string, CanvasPatchEntry) ([]any, error)
}

var entityPatchDefinitions = map[string]entityPatch{
	"agent": {
		label:   "agent",
		table:   "canvas_agents",
		columns: []string{"id", "lobby_code", "phase_index", "name", "x", "y", "is_ally", "is_gray", "note"},
		conflictSet: `name = EXCLUDED.name, x = EXCLUDED.x, y = EXCLUDED.y,
			is_ally = EXCLUDED.is_ally, is_gray = EXCLUDED.is_gray, note = EXCLUDED.note`,
		buildValues: agentPatchValues,
	},
	"ability": {
		label:   "ability",
		table:   "canvas_abilities",
		columns: []string{"id", "lobby_code", "phase_index", "name", "action", "x", "y", "attached_to_id", "current_path", "current_rotation", "current_length", "is_ally", "icon_only", "show_outer_circle", "note"},
		conflictSet: `name = EXCLUDED.name, action = EXCLUDED.action, x = EXCLUDED.x, y = EXCLUDED.y,
			attached_to_id = EXCLUDED.attached_to_id, current_path = EXCLUDED.current_path,
			current_rotation = EXCLUDED.current_rotation, current_length = EXCLUDED.current_length,
			is_ally = EXCLUDED.is_ally, icon_only = EXCLUDED.icon_only,
			show_outer_circle = EXCLUDED.show_outer_circle, note = EXCLUDED.note,
			sort_order = nextval('canvas_abilities_sort_order_seq')`,
		buildValues: abilityPatchValues,
	},
	"drawline": {
		label:   "draw line",
		table:   "canvas_draw_lines",
		columns: []string{"id", "lobby_code", "phase_index", "tool", "points", "color", "size", "is_dashed", "is_arrow_head", "shape", "opacity", "traversal_time"},
		conflictSet: `tool = EXCLUDED.tool, points = EXCLUDED.points, color = EXCLUDED.color, size = EXCLUDED.size,
			is_dashed = EXCLUDED.is_dashed, is_arrow_head = EXCLUDED.is_arrow_head, shape = EXCLUDED.shape,
			opacity = EXCLUDED.opacity, traversal_time = EXCLUDED.traversal_time`,
		deleteSQL:   `DELETE FROM canvas_draw_lines WHERE (id = $1 OR id LIKE $1 || '-chunk-%') AND lobby_code = $2 AND phase_index = $3`,
		buildValues: drawLinePatchValues,
	},
	"connectingline": {
		label:   "connecting line",
		table:   "canvas_connecting_lines",
		columns: []string{"id", "lobby_code", "phase_index", "from_id", "to_id", "stroke_color", "stroke_width", "uploaded_images", "youtube_link", "notes"},
		conflictSet: `from_id = EXCLUDED.from_id, to_id = EXCLUDED.to_id, stroke_color = EXCLUDED.stroke_color,
			stroke_width = EXCLUDED.stroke_width, uploaded_images = EXCLUDED.uploaded_images,
			youtube_link = EXCLUDED.youtube_link, notes = EXCLUDED.notes`,
		buildValues: connectingLinePatchValues,
	},
	"text": {
		label:   "text",
		table:   "canvas_texts",
		columns: []string{"id", "lobby_code", "phase_index", "text", "x", "y", "width", "height", "spans", "font_size", "note"},
		conflictSet: `text = EXCLUDED.text, x = EXCLUDED.x, y = EXCLUDED.y, width = EXCLUDED.width,
			height = EXCLUDED.height, spans = EXCLUDED.spans, font_size = EXCLUDED.font_size, note = EXCLUDED.note`,
		buildValues: textPatchValues,
	},
	"image": {
		label:   "image",
		table:   "canvas_images",
		columns: []string{"id", "lobby_code", "phase_index", "src", "x", "y", "width", "height", "note"},
		conflictSet: `src = EXCLUDED.src, x = EXCLUDED.x, y = EXCLUDED.y, width = EXCLUDED.width,
			height = EXCLUDED.height, note = EXCLUDED.note`,
		buildValues: imagePatchValues,
	},
	"toolicon": {
		label:   "tool icon",
		table:   "canvas_tool_icons",
		columns: []string{"id", "lobby_code", "phase_index", "name", "x", "y", "width", "height", "attached_to_id", "note"},
		conflictSet: `name = EXCLUDED.name, x = EXCLUDED.x, y = EXCLUDED.y, width = EXCLUDED.width,
			height = EXCLUDED.height, attached_to_id = EXCLUDED.attached_to_id, note = EXCLUDED.note`,
		buildValues: toolIconPatchValues,
	},
}

func init() {
	for entity, def := range entityPatchDefinitions {
		placeholders := make([]string, len(def.columns))
		for i := range def.columns {
			placeholders[i] = fmt.Sprintf("$%d", i+1)
		}

		def.insertSQL = fmt.Sprintf(
			"INSERT INTO %s (%s) VALUES (%s) ON CONFLICT (id, lobby_code, phase_index) DO UPDATE SET %s",
			pgx.Identifier{def.table}.Sanitize(),
			strings.Join(def.columns, ", "),
			strings.Join(placeholders, ", "),
			def.conflictSet,
		)

		if def.deleteSQL == "" {
			def.deleteSQL = fmt.Sprintf(
				"DELETE FROM %s WHERE id = $1 AND lobby_code = $2 AND phase_index = $3",
				pgx.Identifier{def.table}.Sanitize(),
			)
		}

		entityPatchDefinitions[entity] = def
	}
}

func applyPatchEntry(ctx context.Context, tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	entity := strings.ToLower(entry.Entity)

	if def, ok := entityPatchDefinitions[entity]; ok {
		if entry.PhaseIndex < 0 || entry.PhaseIndex >= phaseCount {
			return invalidPatchError("invalid phase index: %d", entry.PhaseIndex)
		}
		return applyEntityPatch(ctx, tx, lobbyCode, entry, def)
	}

	switch entity {
	case "map":
		return applyMapPatch(ctx, tx, lobbyCode, entry)
	case "side":
		return applyMapSidePatch(ctx, tx, lobbyCode, entry)
	case "phase":
		return applyPhasePatch(ctx, tx, lobbyCode, entry)
	case "edited_phases":
		return applyEditedPhasesPatch(ctx, tx, lobbyCode, entry)
	case "canvas":
		return applyCanvasClearPatch(ctx, tx, lobbyCode, entry)
	case "agents_settings":
		return applyAgentsSettingsPatch(ctx, tx, lobbyCode, entry)
	case "abilities_settings":
		return applyAbilitiesSettingsPatch(ctx, tx, lobbyCode, entry)
	default:
		return invalidPatchError("unsupported canvas entity: %s", entry.Entity)
	}
}

func applyEntityPatch(ctx context.Context, tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry, def entityPatch) error {
	action := strings.ToLower(entry.Action)
	if action == "remove" || action == "delete" {
		if entry.ID == "" {
			return invalidPatchError("missing id for %s remove", def.label)
		}

		_, err := tx.Exec(ctx, def.deleteSQL, entry.ID, lobbyCode, entry.PhaseIndex)
		return err
	}

	values, err := def.buildValues(ctx, tx, lobbyCode, entry)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, def.insertSQL, values...)
	return err
}

func decodePatchPayload[T any](entry CanvasPatchEntry) (T, error) {
	var value T
	if entry.Payload == nil {
		return value, nil
	}

	payloadJSON, err := json.Marshal(entry.Payload)
	if err != nil {
		return value, err
	}

	if err := json.Unmarshal(payloadJSON, &value); err != nil {
		return value, invalidPatchError("invalid payload: %v", err)
	}

	return value, nil
}

func agentPatchValues(_ context.Context, _ pgx.Tx, lobbyCode string, entry CanvasPatchEntry) ([]any, error) {
	p, err := decodePatchPayload[CanvasAgent](entry)
	if err != nil {
		return nil, err
	}
	if p.ID == "" {
		p.ID = entry.ID
	}
	if p.ID == "" {
		return nil, invalidPatchError("missing id for agent upsert")
	}

	return []any{p.ID, lobbyCode, entry.PhaseIndex, p.AgentName, p.X, p.Y, p.IsAlly, p.IsGray, p.Note}, nil
}

func abilityPatchValues(_ context.Context, _ pgx.Tx, lobbyCode string, entry CanvasPatchEntry) ([]any, error) {
	p, err := decodePatchPayload[CanvasAbility](entry)
	if err != nil {
		return nil, err
	}
	if p.ID == "" {
		p.ID = entry.ID
	}
	if p.ID == "" {
		return nil, invalidPatchError("missing id for ability upsert")
	}

	pathArray := make([]float64, 0, len(p.CurrentPath)*2)
	for _, point := range p.CurrentPath {
		pathArray = append(pathArray, point.X, point.Y)
	}

	return []any{
		p.ID, lobbyCode, entry.PhaseIndex, p.AgentName, p.Action, p.X, p.Y,
		p.AttachedToID, pathArray, p.CurrentRotation, p.CurrentLength,
		p.IsAlly, p.IconOnly, p.ShowOuterCircle, p.Note,
	}, nil
}

func drawLinePatchValues(_ context.Context, _ pgx.Tx, lobbyCode string, entry CanvasPatchEntry) ([]any, error) {
	p, err := decodePatchPayload[CanvasDrawLine](entry)
	if err != nil {
		return nil, err
	}
	if p.ID == "" {
		p.ID = entry.ID
	}
	if p.ID == "" {
		return nil, invalidPatchError("missing id for draw line upsert")
	}

	pointsArray := make([]float64, 0, len(p.Points)*2)
	for _, point := range p.Points {
		pointsArray = append(pointsArray, point.X, point.Y)
	}

	return []any{
		p.ID, lobbyCode, entry.PhaseIndex, p.Tool, pointsArray, p.Color, p.Size,
		p.IsDashed, p.IsArrowHead, p.Shape, p.Opacity, p.TraversalTime,
	}, nil
}

func connectingLinePatchValues(_ context.Context, _ pgx.Tx, lobbyCode string, entry CanvasPatchEntry) ([]any, error) {
	p, err := decodePatchPayload[CanvasConnectingLine](entry)
	if err != nil {
		return nil, err
	}
	if p.ID == "" {
		p.ID = entry.ID
	}
	if p.ID == "" {
		return nil, invalidPatchError("missing id for connecting line upsert")
	}

	for _, img := range p.UploadedImages {
		if img != "" && !isAllowedImageSource(img) {
			return nil, invalidPatchError("invalid uploaded image source in connecting line: %s", img)
		}
	}

	if p.YoutubeLink != "" && !isAllowedLink(p.YoutubeLink) {
		return nil, invalidPatchError("invalid link in connecting line: %s", p.YoutubeLink)
	}

	return []any{
		p.ID, lobbyCode, entry.PhaseIndex, p.FromID, p.ToID, p.StrokeColor,
		p.StrokeWidth, p.UploadedImages, p.YoutubeLink, p.Notes,
	}, nil
}

func textPatchValues(_ context.Context, _ pgx.Tx, lobbyCode string, entry CanvasPatchEntry) ([]any, error) {
	p, err := decodePatchPayload[CanvasText](entry)
	if err != nil {
		return nil, err
	}
	if p.ID == "" {
		p.ID = entry.ID
	}
	if p.ID == "" {
		return nil, invalidPatchError("missing id for text upsert")
	}

	var spansJSON any
	if len(p.Spans) > 0 {
		data, err := json.Marshal(p.Spans)
		if err != nil {
			return nil, err
		}
		spansJSON = data
	}

	var fontSize any
	if p.FontSize > 0 {
		fontSize = p.FontSize
	}

	return []any{
		p.ID, lobbyCode, entry.PhaseIndex, p.Text, p.X, p.Y, p.Width, p.Height,
		spansJSON, fontSize, p.Note,
	}, nil
}

func imagePatchValues(ctx context.Context, tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) ([]any, error) {
	p, err := decodePatchPayload[CanvasImage](entry)
	if err != nil {
		return nil, err
	}
	if p.ID == "" {
		p.ID = entry.ID
	}
	if p.ID == "" {
		return nil, invalidPatchError("missing id for image upsert")
	}

	if p.Src == "" {
		var existingSrc string
		err := tx.QueryRow(ctx,
			"SELECT src FROM canvas_images WHERE id = $1 AND lobby_code = $2 AND phase_index = $3",
			p.ID, lobbyCode, entry.PhaseIndex).Scan(&existingSrc)
		if err != nil && err != pgx.ErrNoRows {
			return nil, err
		}
		if existingSrc != "" {
			p.Src = existingSrc
		}
	}

	if p.Src != "" && !isAllowedImageSource(p.Src) {
		return nil, invalidPatchError("invalid image source: %s", p.Src)
	}

	return []any{p.ID, lobbyCode, entry.PhaseIndex, p.Src, p.X, p.Y, p.Width, p.Height, p.Note}, nil
}

func toolIconPatchValues(_ context.Context, _ pgx.Tx, lobbyCode string, entry CanvasPatchEntry) ([]any, error) {
	p, err := decodePatchPayload[CanvasToolIcon](entry)
	if err != nil {
		return nil, err
	}
	if p.ID == "" {
		p.ID = entry.ID
	}
	if p.ID == "" {
		return nil, invalidPatchError("missing id for tool icon upsert")
	}

	return []any{
		p.ID, lobbyCode, entry.PhaseIndex, p.Name, p.X, p.Y, p.Width, p.Height,
		p.AttachedToID, p.Note,
	}, nil
}

func setLobbyUpdatedAt(ctx context.Context, tx pgx.Tx, lobbyCode string) error {
	_, err := tx.Exec(ctx, "UPDATE lobbies SET updated_at = NOW() WHERE code = $1", lobbyCode)
	return err
}

func applyMapPatch(ctx context.Context, tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	if !strings.EqualFold(entry.Action, "update") && !strings.EqualFold(entry.Action, "set") && !strings.EqualFold(entry.Action, "change") {
		return invalidPatchError("invalid action for map patch: %s", entry.Action)
	}

	if entry.Payload == nil {
		return invalidPatchError("payload required for map patch")
	}

	idRaw, ok := entry.Payload["id"]
	if !ok {
		return invalidPatchError("map patch payload missing id")
	}
	id, ok := idRaw.(string)
	if !ok || id == "" {
		return invalidPatchError("invalid map id in payload")
	}

	var exists bool
	if err := tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM maps WHERE id = $1)", id).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return invalidPatchError("map id not found: %s", id)
	}

	_, err := tx.Exec(ctx, "UPDATE lobbies SET selected_map_id = $1 WHERE code = $2", id, lobbyCode)
	return err
}

func applyMapSidePatch(ctx context.Context, tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	if !strings.EqualFold(entry.Action, "update") && !strings.EqualFold(entry.Action, "set") {
		return invalidPatchError("invalid action for side patch: %s", entry.Action)
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
		mapSide = entry.ID
	}

	if mapSide == "" {
		return invalidPatchError("map side is required")
	}

	allowed := map[string]struct{}{"attack": {}, "defense": {}, "defend": {}}
	if _, ok := allowed[strings.ToLower(mapSide)]; !ok {
		return invalidPatchError("invalid map side: %s", mapSide)
	}

	if strings.EqualFold(mapSide, "defend") {
		mapSide = "defense"
	}

	_, err := tx.Exec(ctx, "UPDATE lobbies SET map_side = $1 WHERE code = $2", mapSide, lobbyCode)
	return err
}

func applyPhasePatch(ctx context.Context, tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	if !strings.EqualFold(entry.Action, "update") && !strings.EqualFold(entry.Action, "set") {
		return invalidPatchError("invalid action for phase patch: %s", entry.Action)
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
		return invalidPatchError("invalid phase index: %d", phaseIndex)
	}

	_, err := tx.Exec(ctx, `
		UPDATE lobbies SET current_phase_index = $1 WHERE code = $2`,
		phaseIndex, lobbyCode)
	return err
}

func applyEditedPhasesPatch(ctx context.Context, tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	if !strings.EqualFold(entry.Action, "update") && !strings.EqualFold(entry.Action, "set") {
		return invalidPatchError("invalid action for edited_phases patch: %s", entry.Action)
	}

	edited, ok := entry.Payload["editedPhases"]
	if !ok {
		edited, ok = entry.Payload["edited_phases"]
	}
	if !ok {
		return invalidPatchError("editedPhases payload is required")
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
		return invalidPatchError("invalid editedPhases type")
	}

	for _, phase := range phases {
		if phase < 0 || phase >= phaseCount {
			return invalidPatchError("invalid edited phase index: %d", phase)
		}
	}

	_, err := tx.Exec(ctx, `
		UPDATE lobbies SET edited_phases = $1 WHERE code = $2`,
		phases, lobbyCode)
	return err
}

func applyCanvasClearPatch(ctx context.Context, tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	if !strings.EqualFold(entry.Action, "clear") && !strings.EqualFold(entry.Action, "reset") {
		return invalidPatchError("invalid action for canvas patch: %s", entry.Action)
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
			if _, err := tx.Exec(ctx, query, lobbyCode); err != nil {
				return err
			}
		}

		_, err := tx.Exec(ctx, `
			UPDATE lobbies
			SET current_phase_index = $1, edited_phases = $2
			WHERE code = $3`,
			0, []int{0}, lobbyCode)
		return err
	}

	phaseIndex := entry.PhaseIndex
	if phaseIndex < 0 || phaseIndex >= phaseCount {
		return invalidPatchError("invalid phase index for canvas clear: %d", phaseIndex)
	}

	for _, table := range canvasTables {
		query := fmt.Sprintf("DELETE FROM %s WHERE lobby_code = $1 AND phase_index = $2", pgx.Identifier{table}.Sanitize())
		if _, err := tx.Exec(ctx, query, lobbyCode, phaseIndex); err != nil {
			return err
		}
	}

	var editedPhases []int
	if err := tx.QueryRow(ctx, "SELECT edited_phases FROM lobbies WHERE code = $1", lobbyCode).Scan(&editedPhases); err != nil {
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

	_, err := tx.Exec(ctx, "UPDATE lobbies SET edited_phases = $1 WHERE code = $2", updatedEdited, lobbyCode)
	return err
}

func applyAgentsSettingsPatch(ctx context.Context, tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	if !strings.EqualFold(entry.Action, "update") && !strings.EqualFold(entry.Action, "set") {
		return invalidPatchError("invalid action for agents_settings patch: %s", entry.Action)
	}

	if entry.Payload == nil {
		return invalidPatchError("payload required for agents_settings patch")
	}

	data, ok := entry.Payload["agentsSettings"]
	if !ok {
		return invalidPatchError("agentsSettings payload is required")
	}

	payloadJSON, err := json.Marshal(data)
	if err != nil {
		return err
	}

	var settings IconSettings
	if err := json.Unmarshal(payloadJSON, &settings); err != nil {
		return invalidPatchError("invalid payload: %v", err)
	}

	settingsJSON, err := json.Marshal(settings)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, "UPDATE lobbies SET agents_settings = $1 WHERE code = $2", settingsJSON, lobbyCode)
	return err
}

func applyAbilitiesSettingsPatch(ctx context.Context, tx pgx.Tx, lobbyCode string, entry CanvasPatchEntry) error {
	if !strings.EqualFold(entry.Action, "update") && !strings.EqualFold(entry.Action, "set") {
		return invalidPatchError("invalid action for abilities_settings patch: %s", entry.Action)
	}

	if entry.Payload == nil {
		return invalidPatchError("payload required for abilities_settings patch")
	}

	data, ok := entry.Payload["abilitiesSettings"]
	if !ok {
		return invalidPatchError("abilitiesSettings payload is required")
	}

	payloadJSON, err := json.Marshal(data)
	if err != nil {
		return err
	}

	var settings IconSettings
	if err := json.Unmarshal(payloadJSON, &settings); err != nil {
		return invalidPatchError("invalid payload: %v", err)
	}

	settingsJSON, err := json.Marshal(settings)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, "UPDATE lobbies SET abilities_settings = $1 WHERE code = $2", settingsJSON, lobbyCode)
	return err
}
