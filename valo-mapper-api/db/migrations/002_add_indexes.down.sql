-- Drop lobbies indexes
DROP INDEX IF EXISTS idx_lobbies_selected_map_id;
DROP INDEX IF EXISTS idx_lobbies_created_at;

-- Drop canvas_tool_icons indexes
DROP INDEX IF EXISTS idx_canvas_tool_icons_lobby_phase;
DROP INDEX IF EXISTS idx_canvas_tool_icons_phase_index;
DROP INDEX IF EXISTS idx_canvas_tool_icons_lobby_code;

-- Drop canvas_images indexes
DROP INDEX IF EXISTS idx_canvas_images_lobby_phase;
DROP INDEX IF EXISTS idx_canvas_images_phase_index;
DROP INDEX IF EXISTS idx_canvas_images_lobby_code;

-- Drop canvas_texts indexes
DROP INDEX IF EXISTS idx_canvas_texts_lobby_phase;
DROP INDEX IF EXISTS idx_canvas_texts_phase_index;
DROP INDEX IF EXISTS idx_canvas_texts_lobby_code;

-- Drop canvas_draw_lines indexes
DROP INDEX IF EXISTS idx_canvas_draw_lines_lobby_phase;
DROP INDEX IF EXISTS idx_canvas_draw_lines_phase_index;
DROP INDEX IF EXISTS idx_canvas_draw_lines_lobby_code;

-- Drop canvas_abilities indexes
DROP INDEX IF EXISTS idx_canvas_abilities_lobby_phase;
DROP INDEX IF EXISTS idx_canvas_abilities_phase_index;
DROP INDEX IF EXISTS idx_canvas_abilities_lobby_code;

-- Drop canvas_agents indexes
DROP INDEX IF EXISTS idx_canvas_agents_lobby_phase;
DROP INDEX IF EXISTS idx_canvas_agents_phase_index;
DROP INDEX IF EXISTS idx_canvas_agents_lobby_code;