ALTER TABLE users DROP CONSTRAINT users_firebase_uid_key;

ALTER TABLE users
ALTER COLUMN firebase_uid DROP NOT NULL;

CREATE UNIQUE INDEX idx_users_firebase_uid_not_null ON users(firebase_uid) WHERE firebase_uid IS NOT NULL;
