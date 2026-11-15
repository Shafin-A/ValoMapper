-- The 12h lobby cleanup deletes on updated_at and had no index for it, so every
-- run was a sequential scan of the growing lobbies table.
CREATE INDEX IF NOT EXISTS idx_lobbies_updated_at ON lobbies(updated_at);
