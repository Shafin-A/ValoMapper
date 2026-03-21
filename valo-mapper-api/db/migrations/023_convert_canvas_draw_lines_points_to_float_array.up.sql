ALTER TABLE canvas_draw_lines ADD COLUMN points_float double precision[];

UPDATE canvas_draw_lines SET points_float = (
    SELECT array_agg(coord ORDER BY ord)
    FROM (
        SELECT (entry->>'x')::double precision AS coord, (idx * 2 - 1) AS ord
        FROM jsonb_array_elements(points) WITH ORDINALITY AS t(entry, idx)
        UNION ALL
        SELECT (entry->>'y')::double precision AS coord, (idx * 2) AS ord
        FROM jsonb_array_elements(points) WITH ORDINALITY AS t(entry, idx)
    ) coords
);

ALTER TABLE canvas_draw_lines DROP COLUMN points;
ALTER TABLE canvas_draw_lines RENAME COLUMN points_float TO points;
