INSERT INTO maps (id, text) VALUES
    ('summit', 'Summit')
ON CONFLICT (id) DO NOTHING;
