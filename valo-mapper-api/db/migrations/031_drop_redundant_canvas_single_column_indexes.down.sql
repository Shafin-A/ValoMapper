CREATE INDEX IF NOT EXISTS idx_canvas_agents_lobby_code ON canvas_agents(lobby_code);
CREATE INDEX IF NOT EXISTS idx_canvas_agents_phase_index ON canvas_agents(phase_index);

CREATE INDEX IF NOT EXISTS idx_canvas_abilities_lobby_code ON canvas_abilities(lobby_code);
CREATE INDEX IF NOT EXISTS idx_canvas_abilities_phase_index ON canvas_abilities(phase_index);

CREATE INDEX IF NOT EXISTS idx_canvas_draw_lines_lobby_code ON canvas_draw_lines(lobby_code);
CREATE INDEX IF NOT EXISTS idx_canvas_draw_lines_phase_index ON canvas_draw_lines(phase_index);

CREATE INDEX IF NOT EXISTS idx_canvas_texts_lobby_code ON canvas_texts(lobby_code);
CREATE INDEX IF NOT EXISTS idx_canvas_texts_phase_index ON canvas_texts(phase_index);

CREATE INDEX IF NOT EXISTS idx_canvas_images_lobby_code ON canvas_images(lobby_code);
CREATE INDEX IF NOT EXISTS idx_canvas_images_phase_index ON canvas_images(phase_index);

CREATE INDEX IF NOT EXISTS idx_canvas_tool_icons_lobby_code ON canvas_tool_icons(lobby_code);
CREATE INDEX IF NOT EXISTS idx_canvas_tool_icons_phase_index ON canvas_tool_icons(phase_index);
