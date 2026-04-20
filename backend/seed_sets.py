#!/usr/bin/env python3
"""
CardStoard — Set reference data seeder.

Idempotent: safe to run on every deploy. Upserts set records and entries
from the bundled checklist CSVs. Skips entries that already exist.

Usage:
    python seed_sets.py

Reads DATABASE_URL from the environment (falls back to local dev default).
CSVs live in app/data/set-checklists/ (bundled in the Docker image).
"""

import csv
import os
import sys
from collections import defaultdict
from pathlib import Path

import psycopg2

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@stoarddb:5432/cardstoardb"
)

CHECKLISTS_DIR = Path(__file__).parent / "app" / "data" / "set-checklists"

CSV_FILES = [
    "topps_1952_1990.csv",
    "bowman_1948_1955.csv",
    "fleer_1959_1963.csv",
]


def seed_csv(conn, csv_path: Path):
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    # Group by (set_name, brand, year)
    set_rows = defaultdict(list)
    for row in rows:
        key = (
            row["SetName"].strip(),
            row["Brand"].strip(),
            int(row["Year"].strip()),
        )
        set_rows[key].append((
            row["CardNumber"].strip(),
            row["First"].strip() or None,
            row["Last"].strip() or None,
            row["Rookie"].strip() in ("1", "true", "True", "yes"),
        ))

    sets_created = sets_updated = entries_added = entries_skipped = 0

    with conn.cursor() as cur:
        for (set_name, brand, year), cards in set_rows.items():
            # Upsert the set row
            cur.execute(
                """
                SELECT id FROM sets
                WHERE LOWER(name) = LOWER(%s)
                  AND LOWER(brand) = LOWER(%s)
                  AND year = %s
                """,
                (set_name, brand, year),
            )
            row = cur.fetchone()
            if row:
                set_id = row[0]
                sets_updated += 1
            else:
                cur.execute(
                    "INSERT INTO sets (name, brand, year) VALUES (%s, %s, %s) RETURNING id",
                    (set_name, brand, year),
                )
                set_id = cur.fetchone()[0]
                sets_created += 1

            # Fetch existing card_numbers for this set
            cur.execute(
                "SELECT card_number FROM set_entries WHERE set_id = %s",
                (set_id,),
            )
            existing = {r[0] for r in cur.fetchall()}

            for (card_num, first, last, rookie) in cards:
                if card_num in existing:
                    entries_skipped += 1
                    continue
                cur.execute(
                    """
                    INSERT INTO set_entries (set_id, card_number, first_name, last_name, rookie)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (set_id, card_num, first, last, rookie),
                )
                existing.add(card_num)
                entries_added += 1

    conn.commit()
    print(
        f"  {csv_path.name}: {sets_created} sets created, {sets_updated} existing, "
        f"{entries_added} entries added, {entries_skipped} skipped"
    )


def main():
    print("Connecting to database...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
    except Exception as e:
        print(f"ERROR: Could not connect: {e}")
        sys.exit(1)

    print(f"Seeding set reference data from {CHECKLISTS_DIR}...")
    for csv_file in CSV_FILES:
        csv_path = CHECKLISTS_DIR / csv_file
        if not csv_path.exists():
            print(f"  WARNING: {csv_file} not found — skipped")
            continue
        try:
            seed_csv(conn, csv_path)
        except Exception as e:
            conn.rollback()
            print(f"  ERROR seeding {csv_file}: {e}")
            sys.exit(1)

    conn.close()
    print("Set seeding complete.")


if __name__ == "__main__":
    main()
