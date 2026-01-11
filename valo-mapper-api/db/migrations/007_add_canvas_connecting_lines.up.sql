CREATE TABLE IF NOT EXISTS canvas_connecting_lines (
    id VARCHAR(50) NOT NULL,
    lobby_code VARCHAR(10) NOT NULL REFERENCES lobbies(code) ON DELETE CASCADE,
    phase_index INTEGER NOT NULL,
    from_id VARCHAR(50) NOT NULL,
    to_id VARCHAR(50) NOT NULL,
    stroke_color VARCHAR(20),
    stroke_width FLOAT,
    uploaded_images TEXT[],
    youtube_link TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, lobby_code, phase_index)
);

CREATE INDEX IF NOT EXISTS idx_canvas_connecting_lines_lobby_code ON canvas_connecting_lines(lobby_code);
