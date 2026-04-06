-- Drop the redundant single-column lobby_code and phase_index indexes on all
-- canvas item tables. The composite (lobby_code, phase_index) index already
-- covers any query filtering on lobby_code alone (leading column), making the
-- standalone lobby_code indexes redundant. The standalone phase_index indexes
-- are also useless because phase_index (0-9) has near-zero selectivity on its
-- own and is never queried in isolation.

DROP INDEX IF EXISTS idx_canvas_agents_lobby_code;
DROP INDEX IF EXISTS idx_canvas_agents_phase_index;

DROP INDEX IF EXISTS idx_canvas_abilities_lobby_code;
DROP INDEX IF EXISTS idx_canvas_abilities_phase_index;

DROP INDEX IF EXISTS idx_canvas_draw_lines_lobby_code;
DROP INDEX IF EXISTS idx_canvas_draw_lines_phase_index;

DROP INDEX IF EXISTS idx_canvas_texts_lobby_code;
DROP INDEX IF EXISTS idx_canvas_texts_phase_index;

DROP INDEX IF EXISTS idx_canvas_images_lobby_code;
DROP INDEX IF EXISTS idx_canvas_images_phase_index;

DROP INDEX IF EXISTS idx_canvas_tool_icons_lobby_code;
DROP INDEX IF EXISTS idx_canvas_tool_icons_phase_index;
