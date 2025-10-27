# backend/app/services/beckett_service.py
import os
import requests
from bs4 import BeautifulSoup

LOGIN_URL = "https://www.beckett.com/login"
CARD_URL = "https://www.beckett.com/baseball/1983/topps/482-tony-gwynn-rc-3853400"

BECKETT_USER = os.getenv("BECKETT_USER")
BECKETT_PASS = os.getenv("BECKETT_PASS")

def fetch_beckett_values():
    if not BECKETT_USER or not BECKETT_PASS:
        raise RuntimeError("Missing BECKETT_USER / BECKETT_PASS env vars")

    session = requests.Session()

    payload = {
        "username": BECKETT_USER,
        "password": BECKETT_PASS,
    }

    # try login
    resp = session.post(LOGIN_URL, data=payload)
    resp.raise_for_status()

    if "logout" not in resp.text.lower():
        print("⚠️ Login may have failed — Beckett may be using captcha")
    else:
        print("✅ Logged in")

    # get card page
    resp = session.get(CARD_URL)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "lxml")

    # find the price table
    table = soup.find("table")
    prices = {}

    if table:
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        for row in table.find_all("tr")[1:]:
            cols = [td.get_text(strip=True) for td in row.find_all("td")]
            if len(cols) == len(headers):
                prices = dict(zip(headers, cols))

    target_grades = ["NM-MT+", "NM", "EX", "VG", "POOR"]
    return {k: v for k, v in prices.items() if k in target_grades}
