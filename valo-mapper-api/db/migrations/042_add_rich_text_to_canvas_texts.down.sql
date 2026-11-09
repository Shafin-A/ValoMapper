ALTER TABLE canvas_texts
    DROP COLUMN IF EXISTS spans,
    DROP COLUMN IF EXISTS font_size;
