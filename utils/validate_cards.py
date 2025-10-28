#!/usr/bin/env python3
import requests, os, sys

API_URL = "http://localhost:8000"
ACCESS_TOKEN = os.getenv("ACCESS_TOKEN")
REFRESH_TOKEN = os.getenv("REFRESH_TOKEN")

if not ACCESS_TOKEN or not REFRESH_TOKEN:
    print("❌ Missing ACCESS_TOKEN or REFRESH_TOKEN env vars.")
    sys.exit(1)

cookies = {
    "access_token": ACCESS_TOKEN,
    "refresh_token": REFRESH_TOKEN,
}

print("🔎 Fetching all cards...")
res = requests.get(f"{API_URL}/cards/?limit=2000", cookies=cookies)
cards = res.json()
print(f"✅ Loaded {len(cards)} cards.\n")

issues = []

for c in cards:
    if c.get("value") in (None, 0):
        issues.append((c["id"], c["first_name"], c["last_name"], "Value is 0 or missing"))
    elif c.get("grade") in (None, 0):
        issues.append((c["id"], c["first_name"], c["last_name"], "Missing grade"))
    elif not any([c.get(k) for k in ["book_high","book_mid","book_low"]]):
        issues.append((c["id"], c["first_name"], c["last_name"], "Missing all book values"))

if not issues:
    print("✅ No issues found!")
else:
    print(f"⚠️ Found {len(issues)} potential issues:\n")
    for id, first, last, msg in issues:
        print(f" - Card #{id}: {first} {last} → {msg}")

