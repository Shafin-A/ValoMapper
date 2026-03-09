ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_firebase_uid_key;

CREATE UNIQUE INDEX idx_users_firebase_uid_not_null ON users(firebase_uid) WHERE firebase_uid IS NOT NULL;
