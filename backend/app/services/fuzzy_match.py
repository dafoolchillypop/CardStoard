import csv
import difflib
import os

DATA_FILE = os.path.join(os.path.dirname(__file__), "../data/card_reference.csv")

def load_card_reference():
    reference = []
    with open(DATA_FILE, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            row["rookie_year"] = int(row["rookie_year"])
            row["brands"] = [b.strip() for b in row["brands"].split(",")]
            row["card_numbers"] = [c.strip() for c in row["card_numbers"].split(",")]
            reference.append(row)
    return reference

CARD_REFERENCE = load_card_reference()

def fuzzy_match_name(first: str, last: str, cutoff=0.6):
    """Try to map OCR’d name to closest known player in dictionary."""
    first_candidates = [r["first_name"] for r in CARD_REFERENCE]
    last_candidates = [r["last_name"] for r in CARD_REFERENCE]

    first_match = difflib.get_close_matches(first, first_candidates, n=1, cutoff=cutoff)
    last_match = difflib.get_close_matches(last, last_candidates, n=1, cutoff=cutoff)

    if first_match and last_match:
        for r in CARD_REFERENCE:
            if r["first_name"] == first_match[0] and r["last_name"] == last_match[0]:
                return r
    return None

def fuzzy_match_brand(ocr_text: str):
    """Find brand keyword inside OCR text."""
    for r in CARD_REFERENCE:
        for brand in r["brands"]:
            if brand.lower() in ocr_text.lower():
                return brand
    return ""
