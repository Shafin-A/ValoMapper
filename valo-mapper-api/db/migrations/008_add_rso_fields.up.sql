ALTER TABLE users ADD COLUMN rso_subject_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN rso_access_token TEXT;
ALTER TABLE users ADD COLUMN rso_refresh_token TEXT;
ALTER TABLE users ADD COLUMN rso_id_token TEXT;
ALTER TABLE users ADD COLUMN rso_linked_at TIMESTAMP;
