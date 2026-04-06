ALTER TABLE users
    ALTER COLUMN rso_linked_at TYPE TIMESTAMPTZ
    USING rso_linked_at AT TIME ZONE 'UTC';
