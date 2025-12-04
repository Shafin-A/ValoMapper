ALTER TABLE lobbies
    DROP COLUMN IF EXISTS agents_settings,
    DROP COLUMN IF EXISTS abilities_settings;
