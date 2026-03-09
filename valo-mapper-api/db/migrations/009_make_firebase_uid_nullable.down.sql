DROP INDEX idx_users_firebase_uid_not_null;

ALTER TABLE users ADD CONSTRAINT users_firebase_uid_key UNIQUE (firebase_uid);

ALTER TABLE users
ALTER COLUMN firebase_uid SET NOT NULL;
