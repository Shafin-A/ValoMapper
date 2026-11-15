CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_lobbies_selected_map_id ON lobbies(selected_map_id);
