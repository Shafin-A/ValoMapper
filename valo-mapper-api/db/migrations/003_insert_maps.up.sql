INSERT INTO maps (id, text, text_color) VALUES
    ('abyss', 'Abyss', '#37474F'),
    ('ascent', 'Ascent', '#37474F'),
    ('bind', 'Bind', '#37474F'),
    ('breeze', 'Breeze', '#37474F'),
    ('corrode', 'Corrode', '#37474F'),
    ('fracture', 'Fracture', '#37474F'),
    ('haven', 'Haven', '#37474F'),
    ('icebox', 'Icebox', '#37474F'),
    ('lotus', 'Lotus', '#37474F'),
    ('pearl', 'Pearl', '#37474F'),
    ('split', 'Split', '#37474F'),
    ('sunset', 'Sunset', '#37474F')
ON CONFLICT (id) DO NOTHING;