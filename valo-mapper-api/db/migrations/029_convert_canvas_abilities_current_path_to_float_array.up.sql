ALTER TABLE canvas_abilities ADD COLUMN current_path_float double precision[];

UPDATE canvas_abilities
SET current_path_float = (
    SELECT array_agg(coord ORDER BY ord)
    FROM (
        SELECT (entry->>'x')::double precision AS coord, (idx * 2 - 1) AS ord
        FROM jsonb_array_elements(current_path) WITH ORDINALITY AS t(entry, idx)
        UNION ALL
        SELECT (entry->>'y')::double precision AS coord, (idx * 2) AS ord
        FROM jsonb_array_elements(current_path) WITH ORDINALITY AS t(entry, idx)
    ) coords
)
WHERE current_path IS NOT NULL AND jsonb_array_length(current_path) > 0;

ALTER TABLE canvas_abilities DROP COLUMN current_path;
ALTER TABLE canvas_abilities RENAME COLUMN current_path_float TO current_path;
