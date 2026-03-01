ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN DEFAULT FALSE;
UPDATE global_settings SET dark_mode = FALSE WHERE dark_mode IS NULL;
