#!/usr/bin/env python3
"""
provision-testusers.py — Creates 5 named test users with realistic card data
and valuation history for UI/QA testing.

Run inside the backend container where DATABASE_URL is set:
    python3 /tmp/provision_testusers.py [--prod] [--reset]

Use the shell wrapper instead of calling this directly:
    ./utils/provision-testusers.sh [--prod] [--reset]
"""

import argparse
import json
import math
import os
import random
import sys
from datetime import datetime, timezone, timedelta

import bcrypt
import psycopg2
from psycopg2.extras import execute_values

random.seed(42)  # reproducible card layout; timestamps use real now()

# ---------------------------------------------------------------------------
# Player roster — 35 real Hall-of-Famers
# ---------------------------------------------------------------------------
PLAYERS = [
    {"first": "Mickey",  "last": "Mantle",      "rookie_year": 1951},
    {"first": "Willie",  "last": "Mays",         "rookie_year": 1951},
    {"first": "Ted",     "last": "Williams",     "rookie_year": 1939},
    {"first": "Hank",    "last": "Aaron",        "rookie_year": 1954},
    {"first": "Roberto", "last": "Clemente",     "rookie_year": 1955},
    {"first": "Sandy",   "last": "Koufax",       "rookie_year": 1955},
    {"first": "Yogi",    "last": "Berra",        "rookie_year": 1948},
    {"first": "Duke",    "last": "Snider",       "rookie_year": 1947},
    {"first": "Roy",     "last": "Campanella",   "rookie_year": 1948},
    {"first": "Whitey",  "last": "Ford",         "rookie_year": 1950},
    {"first": "Roger",   "last": "Maris",        "rookie_year": 1957},
    {"first": "Ernie",   "last": "Banks",        "rookie_year": 1954},
    {"first": "Eddie",   "last": "Mathews",      "rookie_year": 1952},
    {"first": "Al",      "last": "Kaline",       "rookie_year": 1954},
    {"first": "Frank",   "last": "Robinson",     "rookie_year": 1956},
    {"first": "Brooks",  "last": "Robinson",     "rookie_year": 1955},
    {"first": "Carl",    "last": "Yastrzemski",  "rookie_year": 1961},
    {"first": "Johnny",  "last": "Bench",        "rookie_year": 1968},
    {"first": "Pete",    "last": "Rose",         "rookie_year": 1963},
    {"first": "Reggie",  "last": "Jackson",      "rookie_year": 1968},
    {"first": "Tom",     "last": "Seaver",       "rookie_year": 1967},
    {"first": "Rod",     "last": "Carew",        "rookie_year": 1967},
    {"first": "Jim",     "last": "Palmer",       "rookie_year": 1965},
    {"first": "Joe",     "last": "Morgan",       "rookie_year": 1963},
    {"first": "Mike",    "last": "Schmidt",      "rookie_year": 1972},
    {"first": "George",  "last": "Brett",        "rookie_year": 1974},
    {"first": "Steve",   "last": "Carlton",      "rookie_year": 1965},
    {"first": "Nolan",   "last": "Ryan",         "rookie_year": 1968},
    {"first": "Bob",     "last": "Gibson",       "rookie_year": 1959},
    {"first": "Lou",     "last": "Brock",        "rookie_year": 1961},
    {"first": "Harmon",  "last": "Killebrew",    "rookie_year": 1954},
    {"first": "Billy",   "last": "Williams",     "rookie_year": 1959},
    {"first": "Wade",    "last": "Boggs",        "rookie_year": 1982},
    {"first": "Tony",    "last": "Gwynn",        "rookie_year": 1982},
    {"first": "Ryne",    "last": "Sandberg",     "rookie_year": 1981},
]

BRANDS = ["Topps", "Donruss", "Fleer", "Bowman", "Score", "Upper Deck"]
GRADES = [3.0, 1.5, 1.0, 0.8, 0.4, 0.2]
CARD_ATTRIBUTES = ["refractor", "autograph", "short_print", "parallel", "numbered"]

# ---------------------------------------------------------------------------
# User profiles
# ---------------------------------------------------------------------------
PROFILES = [
    {
        "n": 1,
        "username": "powerco",
        "password": "TestPass1!",
        "n_cards": 240,
        "year_range": (1952, 1975),
        # GRADES order: [3.0, 1.5, 1.0, 0.8, 0.4, 0.2]
        "grade_weights": [0.40, 0.25, 0.20, 0.10, 0.04, 0.01],  # MT-heavy
        "book_high_range": (50, 500),
        "freshness": {"fresh": 0.80, "aging": 0.15, "stale": 0.05, "null": 0.00},
        "history_months": 12,
        "history_growth": "strong",
    },
    {
        "n": 2,
        "username": "activeco",
        "password": "TestPass2!",
        "n_cards": 200,
        "year_range": (1952, 1990),
        "grade_weights": [0.20, 0.25, 0.25, 0.15, 0.10, 0.05],
        "book_high_range": (15, 200),
        "freshness": {"fresh": 0.40, "aging": 0.30, "stale": 0.20, "null": 0.10},
        "history_months": 8,
        "history_growth": "moderate",
    },
    {
        "n": 3,
        "username": "casualco",
        "password": "TestPass3!",
        "n_cards": 160,
        "year_range": (1975, 1995),
        "grade_weights": [0.05, 0.10, 0.20, 0.25, 0.25, 0.15],
        "book_high_range": (5, 75),
        "freshness": {"fresh": 0.10, "aging": 0.25, "stale": 0.40, "null": 0.25},
        "history_months": 6,
        "history_growth": "slow",
    },
    {
        "n": 4,
        "username": "newco",
        "password": "TestPass4!",
        "n_cards": 80,
        "year_range": (1982, 1995),
        "grade_weights": [0.05, 0.10, 0.15, 0.25, 0.25, 0.20],
        "book_high_range": (2, 40),
        "freshness": {"fresh": 0.00, "aging": 0.05, "stale": 0.15, "null": 0.80},
        "history_months": 3,
        "history_growth": "flat",
    },
    {
        "n": 5,
        "username": "analytico",
        "password": "TestPass5!",
        "n_cards": 220,
        "year_range": (1952, 1995),
        "grade_weights": [1/6, 1/6, 1/6, 1/6, 1/6, 1/6],  # evenly distributed
        "book_high_range": (2, 500),
        "freshness": {"fresh": 0.25, "aging": 0.25, "stale": 0.25, "null": 0.25},
        "history_months": 12,
        "history_growth": "scurve",
    },
]

# ---------------------------------------------------------------------------
# Value calculation — mirrors backend card_value.py exactly
# ---------------------------------------------------------------------------
# Default factors matching GlobalSettings defaults
_FACTORS = {
    "auto":   1.00,   # grade==3 and rookie
    "mt":     0.85,   # grade==3
    "rookie": 0.80,   # rookie (non-MT)
    "ex":     0.75,   # grade==1.5
    "vg":     0.60,   # grade==1.0
    "gd":     0.55,   # grade==0.8
    "fr":     0.50,   # grade==0.4
    "pr":     0.40,   # grade==0.2
}

def _get_factor(grade: float, is_rookie: bool) -> float:
    if grade == 3.0 and is_rookie: return _FACTORS["auto"]
    if grade == 3.0:               return _FACTORS["mt"]
    if is_rookie:                  return _FACTORS["rookie"]
    if grade == 1.5:               return _FACTORS["ex"]
    if grade == 1.0:               return _FACTORS["vg"]
    if grade == 0.8:               return _FACTORS["gd"]
    if grade == 0.4:               return _FACTORS["fr"]
    if grade == 0.2:               return _FACTORS["pr"]
    return 1.0

def _calc_value(book_high, book_high_mid, book_mid, book_low_mid, book_low,
                grade, is_rookie):
    vals = [v for v in [book_high, book_high_mid, book_mid, book_low_mid, book_low]
            if v is not None]
    if not vals:
        return None
    avg_book = sum(vals) / len(vals)
    factor = _get_factor(grade, is_rookie)
    return round(avg_book * grade * factor)

# ---------------------------------------------------------------------------
# Freshness helpers
# ---------------------------------------------------------------------------
def _pick_freshness(dist: dict) -> str:
    r = random.random()
    cumulative = 0.0
    for state, prob in dist.items():
        cumulative += prob
        if r < cumulative:
            return state
    return list(dist.keys())[-1]

def _freshness_to_dt(state: str, now: datetime):
    if state == "null":   return None
    if state == "fresh":  return now - timedelta(days=random.randint(1, 25))
    if state == "aging":  return now - timedelta(days=random.randint(31, 85))
    if state == "stale":  return now - timedelta(days=random.randint(95, 400))
    return None

# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------
def _hash_pw(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def upsert_user(conn, email: str, username: str, password: str) -> int:
    pw_hash = _hash_pw(password)
    now = datetime.now(timezone.utc)
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO users (email, username, password_hash, is_active, is_verified, created_at)
            VALUES (%s, %s, %s, true, true, %s)
            ON CONFLICT (email) DO UPDATE
                SET username      = EXCLUDED.username,
                    password_hash = EXCLUDED.password_hash,
                    is_active     = true,
                    is_verified   = true
            RETURNING id
        """, (email, username, pw_hash, now))
        user_id = cur.fetchone()[0]
        conn.commit()
    return user_id

def upsert_settings(conn, user_id: int):
    """Insert default settings if none exist; preserve existing on re-run."""
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM global_settings WHERE user_id = %s", (user_id,))
        if cur.fetchone():
            return
        makes  = json.dumps(["Bowman", "Donruss", "Fleer", "Score", "Topps", "Upper Deck"])
        grades = json.dumps(["3", "1.5", "1", "0.8", "0.4", "0.2"])
        cur.execute("""
            INSERT INTO global_settings (
                user_id, enable_smart_fill, chatbot_enabled, dark_mode,
                app_name, card_makes, card_grades,
                rookie_factor, auto_factor, mtgrade_factor, exgrade_factor,
                vggrade_factor, gdgrade_factor, frgrade_factor, prgrade_factor,
                vintage_era_year, modern_era_year, vintage_era_factor, modern_era_factor
            )
            VALUES (%s, false, false, false, 'CardStoard', %s, %s,
                    0.80, 1.00, 0.85, 0.75, 0.60, 0.55, 0.50, 0.40,
                    1970, 1980, 1.00, 1.00)
        """, (user_id, makes, grades))
        conn.commit()

def delete_existing_cards(conn, user_id: int):
    with conn.cursor() as cur:
        cur.execute("DELETE FROM cards WHERE user_id = %s", (user_id,))
        conn.commit()

def delete_existing_history(conn, user_id: int):
    with conn.cursor() as cur:
        cur.execute("DELETE FROM valuation_history WHERE user_id = %s", (user_id,))
        conn.commit()

def generate_cards(user_id: int, profile: dict) -> list:
    now = datetime.now(timezone.utc)
    year_lo, year_hi = profile["year_range"]
    book_lo, book_hi = profile["book_high_range"]
    freshness_dist   = profile["freshness"]
    grade_weights    = profile["grade_weights"]
    n_cards          = profile["n_cards"]

    rows = []
    for _ in range(n_cards):
        player     = random.choice(PLAYERS)
        year       = random.randint(year_lo, year_hi)
        brand      = random.choice(BRANDS)
        grade      = random.choices(GRADES, weights=grade_weights, k=1)[0]
        is_rookie  = (year == player["rookie_year"])
        card_num   = str(random.randint(1, 700))

        book_high     = round(random.uniform(book_lo, book_hi), 2)
        book_high_mid = round(book_high * random.uniform(0.80, 0.90), 2)
        book_mid      = round(book_high * random.uniform(0.55, 0.70), 2)
        book_low_mid  = round(book_high * random.uniform(0.35, 0.50), 2)
        book_low      = round(book_high * random.uniform(0.18, 0.30), 2)

        value = _calc_value(
            book_high, book_high_mid, book_mid, book_low_mid, book_low,
            grade, is_rookie,
        )

        freshness_state = _pick_freshness(freshness_dist)
        book_updated    = _freshness_to_dt(freshness_state, now)

        # ~15% of cards get a card_attribute
        attrs = None
        if random.random() < 0.15:
            attr_key = random.choice(CARD_ATTRIBUTES)
            if attr_key == "numbered":
                attrs = json.dumps({attr_key: str(random.choice([25, 50, 100, 250, 500, 1000]))})
            else:
                attrs = json.dumps({attr_key: True})

        rows.append((
            user_id,
            player["first"], player["last"],
            year, brand, card_num,
            is_rookie, grade,
            book_high, book_high_mid, book_mid, book_low_mid, book_low,
            value,
            book_updated,
            attrs,
            now, now,
        ))
    return rows

def insert_cards(conn, rows: list):
    sql = """
        INSERT INTO cards (
            user_id,
            first_name, last_name,
            year, brand, card_number,
            rookie, grade,
            book_high, book_high_mid, book_mid, book_low_mid, book_low,
            value,
            book_values_updated_at,
            card_attributes,
            created_at, updated_at
        ) VALUES %s
    """
    with conn.cursor() as cur:
        execute_values(cur, sql, rows)
        conn.commit()

def get_user_totals(conn, user_id: int) -> tuple:
    """Returns (total_value, card_count) for a user."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COALESCE(SUM(value), 0), COUNT(*)
            FROM cards WHERE user_id = %s
        """, (user_id,))
        return cur.fetchone()

# ---------------------------------------------------------------------------
# Valuation history
# ---------------------------------------------------------------------------
def _growth_factor(month_idx: int, total_months: int, growth_type: str) -> float:
    """
    Relative multiplier for total_value at month_idx compared to the final value.
    month_idx 0 = oldest snapshot, month_idx (total_months-1) = most recent.
    """
    if total_months <= 1:
        return 1.0

    months_before_end = (total_months - 1) - month_idx

    if growth_type == "strong":
        return 1.0 / (1.08 ** months_before_end)
    elif growth_type == "moderate":
        return 1.0 / (1.04 ** months_before_end)
    elif growth_type == "slow":
        return 1.0 / (1.02 ** months_before_end)
    elif growth_type == "flat":
        return 1.0 / (1.005 ** months_before_end)
    elif growth_type == "scurve":
        # Sigmoid: slow start, fast middle, plateau at end
        progress = month_idx / (total_months - 1)
        k = 10.0
        def _sig(x): return 1.0 / (1.0 + math.exp(-k * (x - 0.5)))
        return _sig(progress) / _sig(1.0)
    return 1.0

def insert_valuation_history(conn, user_id: int, profile: dict,
                              final_value: float, final_count: int):
    months      = profile["history_months"]
    growth_type = profile["history_growth"]
    now         = datetime.now(timezone.utc)

    # Build 1st-of-month timestamps going back `months` months, ending this month
    timestamps = []
    for i in range(months):
        months_ago = (months - 1) - i
        approx_past = now - timedelta(days=months_ago * 30)
        ts = approx_past.replace(day=1, hour=12, minute=0, second=0, microsecond=0)
        timestamps.append(ts)

    rows = []
    for i, ts in enumerate(timestamps):
        factor   = _growth_factor(i, months, growth_type)
        variance = random.uniform(0.95, 1.05)
        value    = max(1.0, round(final_value * factor * variance, 2))

        # card_count grows linearly from ~30% of final at oldest → 100% at newest
        if months <= 1:
            count = final_count
        else:
            count_factor = 0.30 + 0.70 * (i / (months - 1))
            count = max(1, round(final_count * count_factor))

        rows.append((user_id, ts, value, count))

    sql = """
        INSERT INTO valuation_history (user_id, timestamp, total_value, card_count)
        VALUES %s
    """
    with conn.cursor() as cur:
        execute_values(cur, sql, rows)
        conn.commit()

# ---------------------------------------------------------------------------
# Reset
# ---------------------------------------------------------------------------
def reset_test_users(conn, domain: str):
    """Hard-delete all test users matching the domain (smoketest user is never touched)."""
    pattern = f"%@{domain}"
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email LIKE %s", (pattern,))
        user_ids = [row[0] for row in cur.fetchall()]

    if not user_ids:
        print(f"[reset] No existing {domain} test users found.")
        return

    with conn.cursor() as cur:
        cur.execute("DELETE FROM valuation_history WHERE user_id = ANY(%s)", (user_ids,))
        cur.execute("DELETE FROM cards WHERE user_id = ANY(%s)", (user_ids,))
        cur.execute("DELETE FROM global_settings WHERE user_id = ANY(%s)", (user_ids,))
        cur.execute("DELETE FROM users WHERE id = ANY(%s)", (user_ids,))
        conn.commit()

    print(f"[reset] Deleted {len(user_ids)} test user(s) with domain @{domain}.")

# ---------------------------------------------------------------------------
# Per-user seed
# ---------------------------------------------------------------------------
def seed_user(conn, profile: dict, domain: str):
    n        = profile["n"]
    email    = f"test{n}@{domain}"
    username = profile["username"]
    password = profile["password"]

    print(f"\n[test{n}] Seeding {email} ...")

    user_id = upsert_user(conn, email, username, password)
    upsert_settings(conn, user_id)

    delete_existing_cards(conn, user_id)
    delete_existing_history(conn, user_id)

    cards = generate_cards(user_id, profile)
    insert_cards(conn, cards)

    final_value, final_count = get_user_totals(conn, user_id)
    insert_valuation_history(conn, user_id, profile, float(final_value), int(final_count))

    print(f"  cards:   {final_count}")
    print(f"  value:   ${final_value:,.0f}")
    print(f"  history: {profile['history_months']} monthly snapshots ({profile['history_growth']} growth)")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Provision CardStoard test users")
    parser.add_argument("--prod",  action="store_true",
                        help="Use cardstoard.prd domain (production environment)")
    parser.add_argument("--reset", action="store_true",
                        help="Hard-delete matching test users before seeding")
    args = parser.parse_args()

    domain = "cardstoard.prd" if args.prod else "cardstoard.dev"

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL environment variable is not set.", file=sys.stderr)
        sys.exit(1)

    print(f"Connecting to database ...")
    conn = psycopg2.connect(db_url)

    try:
        if args.reset:
            print(f"[reset] Removing existing test users @{domain} ...")
            reset_test_users(conn, domain)

        for profile in PROFILES:
            seed_user(conn, profile, domain)

        print(f"\n{'='*50}")
        print(f"All 5 test users seeded (@{domain}):\n")
        for p in PROFILES:
            print(f"  test{p['n']}@{domain}  /  {p['password']}")
        print()

    finally:
        conn.close()

if __name__ == "__main__":
    main()
