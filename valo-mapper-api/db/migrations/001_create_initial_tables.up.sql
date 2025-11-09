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
    current_phase_index INTEGER DEFAULT 0,
    edited_phases INTEGER[] DEFAULT ARRAY[0],
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create canvas_agents table
CREATE TABLE IF NOT EXISTS canvas_agents (
    id VARCHAR(50) NOT NULL,
    lobby_code VARCHAR(10) NOT NULL REFERENCES lobbies(code) ON DELETE CASCADE,
    phase_index INTEGER NOT NULL,
    name VARCHAR(100),
    role VARCHAR(50),
    x FLOAT,
    y FLOAT,
    is_ally BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, lobby_code, phase_index)
);

-- Create canvas_abilities table
CREATE TABLE IF NOT EXISTS canvas_abilities (
    id VARCHAR(50) NOT NULL,
    lobby_code VARCHAR(10) NOT NULL REFERENCES lobbies(code) ON DELETE CASCADE,
    phase_index INTEGER NOT NULL,
    name VARCHAR(100),
    action VARCHAR(50),
    x FLOAT,
    y FLOAT,
    current_path JSONB,
    current_rotation FLOAT,
    current_length FLOAT,
    is_ally BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, lobby_code, phase_index)
);

-- Create canvas_draw_lines table
CREATE TABLE IF NOT EXISTS canvas_draw_lines (
    id VARCHAR(50) NOT NULL,
    lobby_code VARCHAR(10) NOT NULL REFERENCES lobbies(code) ON DELETE CASCADE,
    phase_index INTEGER NOT NULL,
    tool VARCHAR(20),
    points JSONB,
    color VARCHAR(20),
    size INTEGER,
    is_dashed BOOLEAN,
    is_arrow_head BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, lobby_code, phase_index)
);

-- Create canvas_texts table
CREATE TABLE IF NOT EXISTS canvas_texts (
    id VARCHAR(50) NOT NULL,
    lobby_code VARCHAR(10) NOT NULL REFERENCES lobbies(code) ON DELETE CASCADE,
    phase_index INTEGER NOT NULL,
    text TEXT,
    x FLOAT,
    y FLOAT,
    width FLOAT,
    height FLOAT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, lobby_code, phase_index)
);

-- Create canvas_images table
CREATE TABLE IF NOT EXISTS canvas_images (
    id VARCHAR(50) NOT NULL,
    lobby_code VARCHAR(10) NOT NULL REFERENCES lobbies(code) ON DELETE CASCADE,
    phase_index INTEGER NOT NULL,
    src TEXT,
    x FLOAT,
    y FLOAT,
    width FLOAT,
    height FLOAT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, lobby_code, phase_index)
);

-- Create canvas_tool_icons table
CREATE TABLE IF NOT EXISTS canvas_tool_icons (
    id VARCHAR(50) NOT NULL,
    lobby_code VARCHAR(10) NOT NULL REFERENCES lobbies(code) ON DELETE CASCADE,
    phase_index INTEGER NOT NULL,
    x FLOAT,
    y FLOAT,
    width FLOAT,
    height FLOAT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, lobby_code, phase_index)
);

-- Create users table --
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -- Create folders table --
CREATE TABLE IF NOT EXISTS folders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_folder_id INTEGER NULL REFERENCES folders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, parent_folder_id, name)
);

-- -- Create strategies table --
CREATE TABLE IF NOT EXISTS strategies (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_id INTEGER NULL REFERENCES folders(id) ON DELETE CASCADE,
    lobby_code VARCHAR(10) NOT NULL REFERENCES lobbies(code) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, lobby_code)
);