ALTER TABLE canvas_abilities ADD COLUMN current_path_jsonb JSONB;

UPDATE canvas_abilities
SET current_path_jsonb = path_data.path_json
FROM (
    SELECT id, lobby_code, phase_index,
        jsonb_agg(jsonb_build_object('x', current_path[gs], 'y', current_path[gs+1]) ORDER BY gs) AS path_json
    FROM canvas_abilities, generate_series(1, array_upper(current_path, 1) - 1, 2) AS gs
    WHERE current_path IS NOT NULL AND array_length(current_path, 1) >= 2
    GROUP BY id, lobby_code, phase_index
) path_data
WHERE canvas_abilities.id = path_data.id
  AND canvas_abilities.lobby_code = path_data.lobby_code
  AND canvas_abilities.phase_index = path_data.phase_index;

ALTER TABLE canvas_abilities DROP COLUMN current_path;
ALTER TABLE canvas_abilities RENAME COLUMN current_path_jsonb TO current_path;
