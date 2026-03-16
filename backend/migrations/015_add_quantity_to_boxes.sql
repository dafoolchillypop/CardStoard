-- Migration 015: quantity column in boxes_binders
ALTER TABLE boxes_binders
    ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
