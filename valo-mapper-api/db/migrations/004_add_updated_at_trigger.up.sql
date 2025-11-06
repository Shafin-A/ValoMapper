CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lobbies_updated_at 
    BEFORE UPDATE ON lobbies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();