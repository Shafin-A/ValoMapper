DROP INDEX IF EXISTS idx_strategies_user_favorite;
DROP INDEX IF EXISTS idx_strategies_tags_gin;

ALTER TABLE strategies DROP CONSTRAINT IF EXISTS strategies_tags_max;

ALTER TABLE strategies
    DROP COLUMN IF EXISTS is_favorite,
    DROP COLUMN IF EXISTS tags;
