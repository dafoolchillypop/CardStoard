"""
Seed the dictionary_entries table from the two static source files.
Additive/idempotent: skips individual rows that already exist so new entries
in player_dictionary.py are picked up on subsequent deploys without wiping
existing data.
"""
from sqlalchemy.orm import Session
from app.models import DictionaryEntry


def seed_dictionary(db: Session) -> None:
    # Build a lookup set of (first_name, last_name, brand, year, card_number)
    # for all rows already in the table.
    existing = set(
        db.query(
            DictionaryEntry.first_name,
            DictionaryEntry.last_name,
            DictionaryEntry.brand,
            DictionaryEntry.year,
            DictionaryEntry.card_number,
        ).all()
    )

    rows = []

    # -- Source 1: Historical dict (year-keyed card numbers) --
    from app.data.player_dictionary import PLAYER_DICTIONARY as HISTORICAL_DICT
    for _key, player in HISTORICAL_DICT.items():
        first_name = player["first_name"]
        last_name  = player["last_name"]
        rookie_year = player["rookie_year"]
        for brand, year_map in player["cards"].items():
            for year, card_number in year_map.items():
                key = (first_name, last_name, brand, int(year), str(card_number))
                if key not in existing:
                    rows.append(DictionaryEntry(
                        first_name=first_name,
                        last_name=last_name,
                        rookie_year=rookie_year,
                        brand=brand,
                        year=int(year),
                        card_number=str(card_number),
                    ))

    # -- Source 2: Modern players.json (single card_number per brand) --
    import json
    from pathlib import Path
    players_path = Path(__file__).resolve().parent / "players.json"
    with open(players_path, "r") as f:
        modern = json.load(f)

    for full_name, data in modern.items():
        parts = full_name.strip().split(" ", 1)
        first_name = parts[0].title()
        last_name  = parts[1].title() if len(parts) > 1 else ""
        rookie_year = data["rookie_year"]
        for brand, card_number in data["cards"].items():
            key = (first_name, last_name, brand, rookie_year, str(card_number))
            if key not in existing:
                rows.append(DictionaryEntry(
                    first_name=first_name,
                    last_name=last_name,
                    rookie_year=rookie_year,
                    brand=brand,
                    year=rookie_year,
                    card_number=str(card_number),
                ))

    if rows:
        db.add_all(rows)
        db.commit()
        print(f"[seed] Seeded {len(rows)} new dictionary_entries rows ({len(existing)} already existed).", flush=True)
    else:
        print(f"[seed] dictionary_entries up to date ({len(existing)} rows, nothing to add).", flush=True)
