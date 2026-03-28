-- 020_add_wax_packs.sql
-- Adds the wax_packs table and supporting GlobalSettings columns for Packs inventory type.
CREATE TABLE IF NOT EXISTS wax_packs (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id),
    year             INTEGER NOT NULL,
    brand            VARCHAR NOT NULL,
    set_name         VARCHAR,
    pack_type        VARCHAR,
    quantity         INTEGER DEFAULT 1,
    value            FLOAT,
    value_updated_at TIMESTAMP WITH TIME ZONE,
    notes            TEXT,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS pinned_pack_id INTEGER;
ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS default_sort_packs JSONB;
