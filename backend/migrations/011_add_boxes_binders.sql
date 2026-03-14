-- Migration 011: boxes_binders table
CREATE TABLE IF NOT EXISTS boxes_binders (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand      VARCHAR NOT NULL,
    year       INTEGER NOT NULL,
    name       VARCHAR,
    set_type   VARCHAR NOT NULL DEFAULT 'factory',
    value      FLOAT,
    notes      TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
