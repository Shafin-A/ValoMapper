-- users_firebase_uid_key already provides a unique index on firebase_uid, so
-- idx_users_firebase_uid only duplicates write cost. No query filters lobbies by
-- selected_map_id, so that index is unused as well.
DROP INDEX IF EXISTS idx_users_firebase_uid;
DROP INDEX IF EXISTS idx_lobbies_selected_map_id;
