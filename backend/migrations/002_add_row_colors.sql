-- 002_add_row_colors.sql
-- Add row highlight color settings to global_settings.

ALTER TABLE global_settings
    ADD COLUMN IF NOT EXISTS row_color_rookie        VARCHAR DEFAULT '#fff3c4',
    ADD COLUMN IF NOT EXISTS row_color_grade3        VARCHAR DEFAULT '#e8dcff',
    ADD COLUMN IF NOT EXISTS row_color_rookie_grade3 VARCHAR DEFAULT '#b8d8f7';
