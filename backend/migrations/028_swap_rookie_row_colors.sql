-- Migration 028: Swap rookie row highlight colors
-- Gold (#fff3c4) was for non-MT rookies; now gold is for MT (grade 3.0) rookies.
-- Blue (#b8d8f7) was for MT rookies; now blue is for non-MT rookies.
-- Only swap rows that still have the old defaults (custom colors are left untouched).
UPDATE global_settings
SET
  row_color_rookie       = CASE WHEN row_color_rookie = '#fff3c4' THEN '#b8d8f7' ELSE row_color_rookie END,
  row_color_rookie_grade3 = CASE WHEN row_color_rookie_grade3 = '#b8d8f7' THEN '#fff3c4' ELSE row_color_rookie_grade3 END;
