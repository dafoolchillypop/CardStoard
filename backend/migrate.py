#!/usr/bin/env python3
"""
CardStoard database migration runner.

Usage:
    python migrate.py

Reads DATABASE_URL from the environment (falls back to local dev default).
Creates a schema_migrations table to track applied migrations.
Applies any unapplied .sql files from the migrations/ directory in sorted order.

Add to deployment:
    Run `python migrate.py` before restarting the backend container/process.
"""

import os
import sys
from pathlib import Path

import psycopg2

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@stoarddb:5432/cardstoardb"
)

MIGRATIONS_DIR = Path(__file__).parent / "migrations"


def get_connection():
    return psycopg2.connect(DATABASE_URL)


def ensure_migrations_table(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id         SERIAL PRIMARY KEY,
                filename   VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMP DEFAULT NOW()
            )
        """)
    conn.commit()


def get_applied(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT filename FROM schema_migrations ORDER BY filename")
        return {row[0] for row in cur.fetchall()}


def apply_migration(conn, filepath):
    sql = filepath.read_text()
    with conn.cursor() as cur:
        cur.execute(sql)
        cur.execute(
            "INSERT INTO schema_migrations (filename) VALUES (%s)",
            (filepath.name,)
        )
    conn.commit()
    print(f"  ✓ {filepath.name}")


def main():
    print(f"Connecting to database...")
    try:
        conn = get_connection()
    except Exception as e:
        print(f"ERROR: Could not connect: {e}")
        sys.exit(1)

    ensure_migrations_table(conn)
    applied = get_applied(conn)

    migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not migration_files:
        print("No migration files found in migrations/")
        return

    pending = [f for f in migration_files if f.name not in applied]

    if not pending:
        print(f"Database is up to date. ({len(applied)}/{len(migration_files)} migrations applied)")
        conn.close()
        return

    print(f"Applying {len(pending)} pending migration(s)...")
    for filepath in pending:
        try:
            apply_migration(conn, filepath)
        except Exception as e:
            conn.rollback()
            print(f"  ✗ {filepath.name} FAILED: {e}")
            sys.exit(1)

    print(f"Done. {len(pending)} migration(s) applied.")
    conn.close()


if __name__ == "__main__":
    main()
