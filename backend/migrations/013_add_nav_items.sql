-- Migration 013: nav_items column in global_settings
ALTER TABLE global_settings
    ADD COLUMN IF NOT EXISTS nav_items JSON DEFAULT NULL;
