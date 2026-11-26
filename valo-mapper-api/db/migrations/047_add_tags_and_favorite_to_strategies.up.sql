ALTER TABLE strategies
    ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE strategies
    ADD CONSTRAINT strategies_tags_max CHECK (cardinality(tags) <= 8) NOT VALID;

ALTER TABLE strategies VALIDATE CONSTRAINT strategies_tags_max;

CREATE INDEX IF NOT EXISTS idx_strategies_tags_gin ON strategies USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_strategies_user_favorite ON strategies(user_id, is_favorite);
