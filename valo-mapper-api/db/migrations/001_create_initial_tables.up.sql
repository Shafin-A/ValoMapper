-- Create maps table
CREATE TABLE IF NOT EXISTS maps (
    id VARCHAR(50) PRIMARY KEY,
    text VARCHAR(100) NOT NULL,
    text_color VARCHAR(50) NOT NULL
);

-- Create lobbies table
CREATE TABLE IF NOT EXISTS lobbies (
    code VARCHAR(10) PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    selected_map_id VARCHAR(50) REFERENCES maps(id),
    map_side VARCHAR(10),
    current_phase_index INTEGER DEFAULT 0
);

-- Create canvas_agents table
CREATE TABLE IF NOT EXISTS canvas_agents (
    id VARCHAR(50) PRIMARY KEY,
    lobby_code VARCHAR(10) NOT NULL REFERENCES lobbies(code) ON DELETE CASCADE,
    name VARCHAR(100),
    role VARCHAR(50),
    x FLOAT,
    y FLOAT,
    is_ally BOOLEAN,
    phase_index INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create canvas_abilities table
CREATE TABLE IF NOT EXISTS canvas_abilities (
    id VARCHAR(50) PRIMARY KEY,
    lobby_code VARCHAR(10) NOT NULL REFERENCES lobbies(code) ON DELETE CASCADE,
    name VARCHAR(100),
    action VARCHAR(50),
    x FLOAT,
    y FLOAT,
    current_path JSONB,
    current_rotation FLOAT,
    current_length FLOAT,
    is_ally BOOLEAN,
    phase_index INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create canvas_draw_lines table
CREATE TABLE IF NOT EXISTS canvas_draw_lines (
    id VARCHAR(50) PRIMARY KEY,
    lobby_code VARCHAR(10) NOT NULL REFERENCES lobbies(code) ON DELETE CASCADE,
    tool VARCHAR(20),
    points JSONB,
    color VARCHAR(20),
    size INTEGER,
    is_dashed BOOLEAN,
    is_arrow_head BOOLEAN,
    phase_index INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create canvas_texts table
CREATE TABLE IF NOT EXISTS canvas_texts (
    id VARCHAR(50) PRIMARY KEY,
    lobby_code VARCHAR(10) NOT NULL REFERENCES lobbies(code) ON DELETE CASCADE,
    text TEXT,
    x FLOAT,
    y FLOAT,
    width FLOAT,
    height FLOAT,
    phase_index INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create canvas_images table
CREATE TABLE IF NOT EXISTS canvas_images (
    id VARCHAR(50) PRIMARY KEY,
    lobby_code VARCHAR(10) NOT NULL REFERENCES lobbies(code) ON DELETE CASCADE,
    src TEXT,
    x FLOAT,
    y FLOAT,
    width FLOAT,
    height FLOAT,
    phase_index INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create canvas_tool_icons table
CREATE TABLE IF NOT EXISTS canvas_tool_icons (
    id VARCHAR(50) PRIMARY KEY,
    lobby_code VARCHAR(10) NOT NULL REFERENCES lobbies(code) ON DELETE CASCADE,
    x FLOAT,
    y FLOAT,
    width FLOAT,
    height FLOAT,
    phase_index INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);