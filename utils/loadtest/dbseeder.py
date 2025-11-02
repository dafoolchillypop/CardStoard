#!/usr/bin/env python3
"""
db_seeder_v0.9.py — Auto-generates verified test users and cards for load testing.
"""

import argparse, time, random, json, uuid, os
from datetime import datetime
from faker import Faker
import psycopg2
from psycopg2.extras import execute_values
from passlib.hash import bcrypt

fake = Faker()

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--users", type=int, default=10)
    p.add_argument("--cards", type=int, default=100)
    p.add_argument("--rate", type=int, default=0)
    p.add_argument("--out", default="utils/loadtest/seeded_users.txt", help="output file for seeded emails")
    return p.parse_args()

def insert_users(conn, n_users, plain_password="TestPass123!"):
    users = []
    now = datetime.utcnow()
    for _ in range(n_users):
        username = fake.user_name() + "_" + uuid.uuid4().hex[:6]
        email = f"{username}@loadtest.cardstoard.com"
        password_hash = bcrypt.hash(plain_password)
        users.append((email, username, password_hash, True, True, now))
    sql = """
        INSERT INTO users (email, username, password_hash, is_active, is_verified, created_at)
        VALUES %s RETURNING id, email
    """
    with conn.cursor() as cur:
        execute_values(cur, sql, users)
        rows = cur.fetchall()
        conn.commit()
    return rows

def insert_settings(conn, user_id):
    sql = """
      INSERT INTO global_settings (
        user_id, enable_smart_fill, app_name, card_makes, card_grades,
        rookie_factor, auto_factor, mtgrade_factor, exgrade_factor,
        vggrade_factor, gdgrade_factor, frgrade_factor, prgrade_factor,
        vintage_era_year, modern_era_year, vintage_era_factor, modern_era_factor
      )
      VALUES (%s, true, 'CardStoard', %s, %s,
              0.80, 1.00, 0.85, 0.75, 0.60, 0.55, 0.50, 0.40,
              1970, 1980, 1.00, 1.00)
      ON CONFLICT (user_id) DO NOTHING
    """
    makes = ['Topps', 'Donruss', 'Fleer', 'Bowman']
    grades = ['3', '1.5', '1', '0.8', '0.4', '0.2']
    with conn.cursor() as cur:
        cur.execute(sql, (user_id, json.dumps(makes), json.dumps(grades)))
        conn.commit()

def generate_card(user_id):
    now = datetime.utcnow()
    brand = random.choice(['Topps', 'Donruss', 'Fleer', 'Bowman'])
    grade = random.choice([3, 1.5, 1, 0.8, 0.4, 0.2])
    rookie = random.choice([True, False])
    high = round(random.uniform(1, 300), 2)
    return (
        user_id, fake.first_name(), fake.last_name(),
        random.randint(1950, 1995), brand, str(random.randint(1, 999)),
        rookie, grade,
        high, high*0.9, high*0.7, high*0.5, high*0.3, now, now
    )

def insert_cards(conn, user_id, cards, rate=0):
    sql = """
      INSERT INTO cards (
        user_id, first_name, last_name, year, brand, card_number, rookie, grade,
        book_high, book_high_mid, book_mid, book_low_mid, book_low,
        created_at, updated_at
      ) VALUES %s
    """
    batch, count = [], 0
    for i in range(cards):
        batch.append(generate_card(user_id))
        if len(batch) >= 200:
            with conn.cursor() as cur:
                execute_values(cur, sql, batch)
                conn.commit()
            count += len(batch)
            batch.clear()
            if rate:
                time.sleep(max(0, 200 / rate))
    if batch:
        with conn.cursor() as cur:
            execute_values(cur, sql, batch)
            conn.commit()
        count += len(batch)
    return count

def main():
    args = parse_args()
    conn = psycopg2.connect(args.db)
    output_file = args.out
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    try:
        users = insert_users(conn, args.users)
        total_cards = args.users * args.cards
        print(f"✅ Created {len(users)} users; seeding {total_cards} cards...")

        inserted = 0
        for uid, email in users:
            insert_settings(conn, uid)
            inserted += insert_cards(conn, uid, args.cards, args.rate)
            print(f"→ {email} seeded with {args.cards} cards.")

        print(f"🏁 Done. {inserted} total cards inserted.")

        # ✅ Write out user list for Locust
        with open(output_file, "w") as f:
            for _, email in users:
                f.write(email + "\n")

        print(f"📄 Seeded user emails written to: {output_file}")

    finally:
        conn.close()

if __name__ == "__main__":
    main()