-- Migration 016: add book value columns to dictionary_entries
-- Supports Value Dictionary feature: admin-maintained book values keyed on
-- brand + year + card_number, auto-filled via Smart Fill in AddCard.

ALTER TABLE dictionary_entries ADD COLUMN IF NOT EXISTS book_high FLOAT;
ALTER TABLE dictionary_entries ADD COLUMN IF NOT EXISTS book_high_mid FLOAT;
ALTER TABLE dictionary_entries ADD COLUMN IF NOT EXISTS book_mid FLOAT;
ALTER TABLE dictionary_entries ADD COLUMN IF NOT EXISTS book_low_mid FLOAT;
ALTER TABLE dictionary_entries ADD COLUMN IF NOT EXISTS book_low FLOAT;
ALTER TABLE dictionary_entries ADD COLUMN IF NOT EXISTS book_values_imported_at TIMESTAMP;
