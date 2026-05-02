-- Migration 027: add rookie_mt_factor to global_settings
-- Separates the Rookie+MT valuation factor from the autograph (auto) factor.
-- Default matches the existing auto_factor default (1.00) so existing valuations are unchanged.
ALTER TABLE global_settings
  ADD COLUMN IF NOT EXISTS rookie_mt_factor FLOAT NOT NULL DEFAULT 1.00;
