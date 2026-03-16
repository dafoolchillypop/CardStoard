-- Migration 012: default_sort_boxes column in global_settings
ALTER TABLE global_settings
    ADD COLUMN IF NOT EXISTS default_sort_boxes JSON DEFAULT NULL;
