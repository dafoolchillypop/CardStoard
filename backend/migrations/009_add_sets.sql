-- Migration 009: Add global set lists with per-user collection tracking

CREATE TABLE IF NOT EXISTS sets (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR NOT NULL,
    brand      VARCHAR NOT NULL,
    year       INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS set_entries (
    id          SERIAL PRIMARY KEY,
    set_id      INTEGER NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
    card_number VARCHAR NOT NULL,
    first_name  VARCHAR,
    last_name   VARCHAR,
    rookie      BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS user_set_cards (
    id                     SERIAL PRIMARY KEY,
    user_id                INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    set_entry_id           INTEGER NOT NULL REFERENCES set_entries(id) ON DELETE CASCADE,
    -- presence of this row = card is in the user's set build
    grade                  FLOAT,
    book_high              FLOAT,
    book_high_mid          FLOAT,
    book_mid               FLOAT,
    book_low_mid           FLOAT,
    book_low               FLOAT,
    value                  FLOAT,
    notes                  TEXT,
    book_values_updated_at TIMESTAMP,
    updated_at             TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, set_entry_id)
);
