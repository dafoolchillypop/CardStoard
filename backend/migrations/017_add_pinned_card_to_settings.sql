-- Migration 017: add pinned_card_id to global_settings
-- Moves pin/bookmark persistence from localStorage to the database so
-- the pinned row follows the user across devices and sessions.

ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS pinned_card_id INTEGER;
