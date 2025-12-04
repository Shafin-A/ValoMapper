ALTER TABLE lobbies
    ADD COLUMN IF NOT EXISTS agents_settings JSONB,
    ADD COLUMN IF NOT EXISTS abilities_settings JSONB;
