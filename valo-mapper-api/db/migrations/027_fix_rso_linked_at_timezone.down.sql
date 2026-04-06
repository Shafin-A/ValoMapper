ALTER TABLE users
    ALTER COLUMN rso_linked_at TYPE TIMESTAMP
    USING rso_linked_at AT TIME ZONE 'UTC';
