-- Migration 010: add visible_set_ids to global_settings
ALTER TABLE global_settings
    ADD COLUMN IF NOT EXISTS visible_set_ids JSON DEFAULT NULL;
