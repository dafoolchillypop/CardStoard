-- 019_add_wax_boxes.sql
-- Adds the wax_boxes table and supporting GlobalSettings columns for Wax inventory type.
CREATE TABLE IF NOT EXISTS wax_boxes (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id),
    year             INTEGER NOT NULL,
    brand            VARCHAR NOT NULL,
    set_name         VARCHAR,
    quantity         INTEGER DEFAULT 1,
    value            FLOAT,
    value_updated_at TIMESTAMP WITH TIME ZONE,
    notes            TEXT,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS pinned_wax_id INTEGER;
ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS default_sort_wax JSONB;
