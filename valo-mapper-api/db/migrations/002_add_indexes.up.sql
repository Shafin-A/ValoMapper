-- Add indexes for frequently queried columns

-- Indexes for canvas_agents
CREATE INDEX IF NOT EXISTS idx_canvas_agents_lobby_code ON canvas_agents(lobby_code);
CREATE INDEX IF NOT EXISTS idx_canvas_agents_phase_index ON canvas_agents(phase_index);
CREATE INDEX IF NOT EXISTS idx_canvas_agents_lobby_phase ON canvas_agents(lobby_code, phase_index);

-- Indexes for canvas_abilities
CREATE INDEX IF NOT EXISTS idx_canvas_abilities_lobby_code ON canvas_abilities(lobby_code);
CREATE INDEX IF NOT EXISTS idx_canvas_abilities_phase_index ON canvas_abilities(phase_index);
CREATE INDEX IF NOT EXISTS idx_canvas_abilities_lobby_phase ON canvas_abilities(lobby_code, phase_index);

-- Indexes for canvas_draw_lines
CREATE INDEX IF NOT EXISTS idx_canvas_draw_lines_lobby_code ON canvas_draw_lines(lobby_code);
CREATE INDEX IF NOT EXISTS idx_canvas_draw_lines_phase_index ON canvas_draw_lines(phase_index);
CREATE INDEX IF NOT EXISTS idx_canvas_draw_lines_lobby_phase ON canvas_draw_lines(lobby_code, phase_index);

-- Indexes for canvas_texts
CREATE INDEX IF NOT EXISTS idx_canvas_texts_lobby_code ON canvas_texts(lobby_code);
CREATE INDEX IF NOT EXISTS idx_canvas_texts_phase_index ON canvas_texts(phase_index);
CREATE INDEX IF NOT EXISTS idx_canvas_texts_lobby_phase ON canvas_texts(lobby_code, phase_index);

-- Indexes for canvas_images
CREATE INDEX IF NOT EXISTS idx_canvas_images_lobby_code ON canvas_images(lobby_code);
CREATE INDEX IF NOT EXISTS idx_canvas_images_phase_index ON canvas_images(phase_index);
CREATE INDEX IF NOT EXISTS idx_canvas_images_lobby_phase ON canvas_images(lobby_code, phase_index);

-- Indexes for canvas_tool_icons
CREATE INDEX IF NOT EXISTS idx_canvas_tool_icons_lobby_code ON canvas_tool_icons(lobby_code);
CREATE INDEX IF NOT EXISTS idx_canvas_tool_icons_phase_index ON canvas_tool_icons(phase_index);
CREATE INDEX IF NOT EXISTS idx_canvas_tool_icons_lobby_phase ON canvas_tool_icons(lobby_code, phase_index);

-- Index for lobbies
CREATE INDEX IF NOT EXISTS idx_lobbies_created_at ON lobbies(created_at);
CREATE INDEX IF NOT EXISTS idx_lobbies_selected_map_id ON lobbies(selected_map_id);