-- Migration 014: last_login column in users
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_login TIMESTAMP DEFAULT NULL;
