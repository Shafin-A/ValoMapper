DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_firebase_uid_key'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_firebase_uid_key UNIQUE (firebase_uid);
    END IF;
END$$;

DROP INDEX IF EXISTS idx_users_firebase_uid_not_null;
