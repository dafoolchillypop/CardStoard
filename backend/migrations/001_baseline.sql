-- 001_baseline.sql
-- Full initial CardStoard schema.
-- All statements use IF NOT EXISTS so this is safe to run against an existing database.

-- Users
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    username      VARCHAR UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    mfa_enabled   BOOLEAN DEFAULT FALSE,
    mfa_secret    VARCHAR(32),
    is_active     BOOLEAN DEFAULT TRUE,
    is_verified   BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email    ON users (email);
CREATE        INDEX IF NOT EXISTS ix_users_id       ON users (id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username);

-- Cards
CREATE TABLE IF NOT EXISTS cards (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id),
    first_name    VARCHAR NOT NULL,
    last_name     VARCHAR NOT NULL,
    year          INTEGER,
    brand         VARCHAR,
    card_number   VARCHAR,
    rookie        BOOLEAN DEFAULT FALSE,
    grade         DOUBLE PRECISION NOT NULL,
    book_high     DOUBLE PRECISION,
    book_high_mid DOUBLE PRECISION,
    book_mid      DOUBLE PRECISION,
    book_low_mid  DOUBLE PRECISION,
    book_low      DOUBLE PRECISION,
    value         DOUBLE PRECISION,
    front_image   VARCHAR,
    back_image    VARCHAR,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_cards_id ON cards (id);

-- Global Settings
CREATE TABLE IF NOT EXISTS global_settings (
    id                   SERIAL PRIMARY KEY,
    user_id              INTEGER NOT NULL REFERENCES users(id),
    enable_smart_fill    BOOLEAN DEFAULT FALSE,
    chatbot_enabled      BOOLEAN DEFAULT FALSE,
    app_name             VARCHAR DEFAULT 'CardStoard',
    card_makes           JSON DEFAULT '["Bowman","Donruss","Fleer","Score","Topps","Upper Deck"]',
    card_grades          JSON DEFAULT '["3","1.5","1","0.8","0.4","0.2"]',
    rookie_factor        DOUBLE PRECISION DEFAULT 0.80,
    auto_factor          DOUBLE PRECISION DEFAULT 1.00,
    mtgrade_factor       DOUBLE PRECISION DEFAULT 0.85,
    exgrade_factor       DOUBLE PRECISION DEFAULT 0.75,
    vggrade_factor       DOUBLE PRECISION DEFAULT 0.60,
    gdgrade_factor       DOUBLE PRECISION DEFAULT 0.55,
    frgrade_factor       DOUBLE PRECISION DEFAULT 0.50,
    prgrade_factor       DOUBLE PRECISION DEFAULT 0.40,
    vintage_era_year     INTEGER DEFAULT 1970,
    modern_era_year      INTEGER DEFAULT 1980,
    vintage_era_factor   DOUBLE PRECISION DEFAULT 1.00,
    modern_era_factor    DOUBLE PRECISION DEFAULT 1.00
);
CREATE INDEX IF NOT EXISTS ix_global_settings_id ON global_settings (id);

-- Valuation History
CREATE TABLE IF NOT EXISTS valuation_history (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    timestamp   TIMESTAMP NOT NULL DEFAULT NOW(),
    total_value DOUBLE PRECISION NOT NULL,
    card_count  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_valuation_history_id ON valuation_history (id);

-- Dictionary Entries
CREATE TABLE IF NOT EXISTS dictionary_entries (
    id          SERIAL PRIMARY KEY,
    first_name  VARCHAR NOT NULL,
    last_name   VARCHAR NOT NULL,
    rookie_year INTEGER NOT NULL,
    brand       VARCHAR NOT NULL,
    year        INTEGER NOT NULL,
    card_number VARCHAR NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_dictionary_entries_id ON dictionary_entries (id);
