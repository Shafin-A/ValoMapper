ALTER TABLE canvas_draw_lines ADD COLUMN points_jsonb jsonb;

UPDATE canvas_draw_lines SET points_jsonb = (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('x', points[i], 'y', points[i+1])), '[]'::jsonb)
    FROM generate_series(1, COALESCE(array_length(points, 1), 0), 2) AS i
);

ALTER TABLE canvas_draw_lines DROP COLUMN points;
ALTER TABLE canvas_draw_lines RENAME COLUMN points_jsonb TO points;
