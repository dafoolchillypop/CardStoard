# backend/app/services/quickadd_parser.py
import re
from typing import Dict

BRANDS = [
    "Topps", "Bowman", "Fleer", "Donruss", "Upper Deck",
    "Score", "Leaf", "Pinnacle", "Pacific", "Stadium Club",
    "Heritage", "Archives", "Gypsy Queen", "Allen & Ginter"
]

def normalize_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()

def guess_player(lines: list[str]) -> tuple[str, str]:
    """
    Heuristic: first non-empty line with 2+ tokens is likely the player line on backs.
    We take first & last token as first/last name (handles middle names/initials reasonably).
    """
    for line in lines[:6]:  # only look near the top of the back
        toks = re.findall(r"[A-Za-z][A-Za-z\.'-]*", line)
        if len(toks) >= 2:
            return toks[0], toks[-1]
    return "", ""

def parse_card_back(ocr_text: str) -> Dict:
    data = {
        "first_name": "",
        "last_name": "",
        "year": None,
        "brand": "",
        "card_number": "",
        "rookie": False,
        "confidence": 0.0,  # optional heuristic confidence you can surface in UI
    }

    text = ocr_text or ""
    lines = [normalize_spaces(x) for x in text.splitlines() if normalize_spaces(x)]

    # 1) Player name guess
    fn, ln = guess_player(lines)
    data["first_name"], data["last_name"] = fn, ln

    # 2) Brand
    low = text.lower()
    for b in BRANDS:
        if b.lower() in low:
            data["brand"] = b
            break

    # 3) Year (prefer © year at bottom, but allow any 19xx/20xx)
    year = None
    m_c = re.search(r"©\s*((?:19|20)\d{2})", text)
    if m_c:
        year = int(m_c.group(1))
    else:
        m = re.search(r"\b((?:19|20)\d{2})\b", text)
        if m:
            year = int(m.group(1))
    data["year"] = year

    # 4) Card number (No. 123, No 123, #123)
    m_no = re.search(r"(?:No\.?|#)\s*([0-9]{1,4}[A-Z]?)", text, re.IGNORECASE)
    if m_no:
        data["card_number"] = m_no.group(1)

    # 5) Rookie flag
    if re.search(r"\brookie\b|\brc\b", text, re.IGNORECASE):
        data["rookie"] = True

    # 6) Confidence (very basic)
    score = 0
    score += 0.2 if data["first_name"] else 0
    score += 0.2 if data["last_name"] else 0
    score += 0.2 if data["brand"] else 0
    score += 0.2 if data["year"] else 0
    score += 0.2 if data["card_number"] else 0
    data["confidence"] = round(score, 2)

    return data
