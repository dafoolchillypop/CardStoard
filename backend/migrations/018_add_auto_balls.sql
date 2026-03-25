-- Migration 018: add auto_balls table and related settings columns
-- Adds a first-class collection item type for autographed baseballs (Auto Balls).
-- Also adds pinned_ball_id and default_sort_balls to global_settings for
-- persistent bookmark and default sort order.

CREATE TABLE IF NOT EXISTS auto_balls (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id),
    first_name       VARCHAR NOT NULL,
    last_name        VARCHAR NOT NULL,
    brand            VARCHAR,
    commissioner     VARCHAR,
    auth             BOOLEAN DEFAULT FALSE,
    inscription      TEXT,
    value            FLOAT,
    value_updated_at TIMESTAMP WITH TIME ZONE,
    notes            TEXT,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS pinned_ball_id INTEGER;
ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS default_sort_balls JSONB;
