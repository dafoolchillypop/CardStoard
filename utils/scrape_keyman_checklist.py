#!/usr/bin/env python3
"""
scrape_keyman_checklist.py

Scrape a Keyman Collectibles checklist page and output a CSV ready for
CardStoard's Set Import format.

Usage:
    python3 scrape_keyman_checklist.py <URL> [--set-name "..."] [--brand Topps] [--year 1952] [--out file.csv]

If --set-name / --brand / --year are omitted, inferred from the page title/URL.

Example:
    python3 scrape_keyman_checklist.py \
        https://keymancollectibles.com/baseballcards/1952toppsbaseballcardchecklist.htm \
        --out 1952_topps.csv

Output CSV columns:
    SetName, Brand, Year, CardNumber, First, Last, Rookie
"""

import argparse
import csv
import re
import sys
from typing import Optional, Tuple, List, Dict
from urllib.request import urlopen, Request

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("ERROR: beautifulsoup4 not installed. Run:  pip3 install beautifulsoup4", file=sys.stderr)
    sys.exit(1)

# ---------------------------------------------------------------------------
# Known annotation tokens (may appear inline or on their own line)
# ---------------------------------------------------------------------------
RC_TOKENS   = {"RC", "RC1"}
ALL_TOKENS  = RC_TOKENS | {
    "SP", "FTC", "DP", "MG", "CO", "COR", "ERR", "IA", "HL",
    "AS", "UER", "CP", "TC", "CL", "RB", "WS", "TP", "SA",
    "TL", "NNO", "A", "B",
}

# ---------------------------------------------------------------------------
# Brand inference
# ---------------------------------------------------------------------------
BRAND_HINTS = {
    "topps":      "Topps",
    "bowman":     "Bowman",
    "donruss":    "Donruss",
    "fleer":      "Fleer",
    "upperdeck":  "Upper Deck",
    "upper deck": "Upper Deck",
    "score":      "Score",
    "leaf":       "Leaf",
    "kellogg":    "Kellogg's",
    "exhibit":    "Exhibit",
    "flair":      "Flair",
}

CARD_NUM_RE      = re.compile(r"^\d+[A-C]?$")        # standalone: "1", "48A", "311"
CARD_LINE_RE     = re.compile(r"^(\d+[A-C]?)\s+(.+)$")  # inline: "1 Hoyt Wilhelm RC"


def is_card_number(s: str) -> bool:
    return bool(CARD_NUM_RE.match(s.strip()))


def is_annotation(s: str) -> bool:
    """True if the line is a standalone annotation token like RC, SP, DP…"""
    return s.strip().upper() in ALL_TOKENS


def parse_name(raw: str) -> Tuple[str, bool]:
    """
    Given a name line like "Pete Runnels RC" or "Billy Loes RC SP",
    strip trailing annotation tokens and return (clean_name, is_rookie).
    """
    tokens = raw.strip().split()
    is_rookie = False
    while tokens and tokens[-1].upper() in ALL_TOKENS:
        if tokens[-1].upper() in RC_TOKENS:
            is_rookie = True
        tokens.pop()
    name = " ".join(tokens).strip()
    return name, is_rookie


def split_name(full_name: str) -> Tuple[str, str]:
    """Split 'First Last' → (first, last). Multi-word last names handled."""
    parts = full_name.strip().split()
    if not parts:
        return ("", "")
    if len(parts) == 1:
        return ("", parts[0])
    return (parts[0], " ".join(parts[1:]))


def infer_meta(url: str, title: str) -> Dict:
    meta: Dict = {"set_name": None, "brand": None, "year": None}
    combined = url + " " + title

    year_m = re.search(r"\b(19\d{2}|20\d{2})\b", combined)
    if year_m:
        meta["year"] = int(year_m.group(1))

    for hint, brand in BRAND_HINTS.items():
        if hint in combined.lower():
            meta["brand"] = brand
            break

    if title:
        clean = re.sub(r"\s*(card\s*)?checklist.*$", "", title, flags=re.IGNORECASE).strip()
        meta["set_name"] = clean or title

    return meta


def scrape(url: str) -> Tuple[List[Dict], str]:
    """Fetch page, parse card data, return (cards, page_title)."""
    req = Request(url, headers={"User-Agent": "Mozilla/5.0 (CardStoard checklist importer)"})
    with urlopen(req, timeout=15) as resp:
        html = resp.read()

    soup = BeautifulSoup(html, "html.parser")
    page_title = soup.title.string.strip() if soup.title else ""

    for tag in soup(["script", "style"]):
        tag.decompose()

    raw_text = soup.get_text(separator="\n")
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]

    # -----------------------------------------------------------------------
    # Detect page layout:
    #   "split" layout — number on its own line, name on next line (1952 Topps)
    #   "inline" layout — "42 Player Name RC" on a single line (1955 Bowman)
    # Heuristic: count lines that are standalone card numbers vs lines that
    # start with a number and have more text after it.
    # -----------------------------------------------------------------------
    standalone = sum(1 for l in lines if CARD_NUM_RE.match(l))
    inline     = sum(1 for l in lines if CARD_LINE_RE.match(l) and not CARD_NUM_RE.match(l))
    layout = "split" if standalone >= inline else "inline"

    cards: List[Dict] = []
    seen: set = set()

    if layout == "inline":
        # -----------------------------------------------------------------------
        # Inline layout: "42 Player Name [flags]" — all on one line.
        # Standalone flag lines (e.g. "ERR", "COR") after a name line are consumed.
        # -----------------------------------------------------------------------
        i = 0
        while i < len(lines):
            line = lines[i]
            m = CARD_LINE_RE.match(line)
            if m and not is_annotation(line):
                card_number = m.group(1)
                name, is_rookie = parse_name(m.group(2))
                # Consume trailing annotation-only lines
                while i + 1 < len(lines) and is_annotation(lines[i + 1]):
                    if lines[i + 1].strip().upper() in RC_TOKENS:
                        is_rookie = True
                    i += 1
                if name and card_number not in seen:
                    seen.add(card_number)
                    first, last = split_name(name)
                    cards.append({
                        "card_number": card_number,
                        "first":  first,
                        "last":   last,
                        "rookie": 1 if is_rookie else 0,
                    })
            i += 1

    else:
        # -----------------------------------------------------------------------
        # Split layout: card number on its own line, player name on next line.
        # Two-column layout means the sequence is:
        #   <num> <name> [optional flag line] <num> <name> [optional flag] ...
        # -----------------------------------------------------------------------
        i = 0
        while i < len(lines):
            line = lines[i]

            if is_card_number(line):
                card_number = line.strip()
                i += 1
                if i >= len(lines):
                    break
                name_raw = lines[i]

                # If the "name" line is itself a card number, reprocess it next iteration
                if is_card_number(name_raw):
                    continue

                name, is_rookie = parse_name(name_raw)

                # Peek ahead for standalone flag line
                if i + 1 < len(lines) and is_annotation(lines[i + 1]):
                    if lines[i + 1].strip().upper() in RC_TOKENS:
                        is_rookie = True
                    i += 1

                if name and card_number not in seen:
                    seen.add(card_number)
                    first, last = split_name(name)
                    cards.append({
                        "card_number": card_number,
                        "first":  first,
                        "last":   last,
                        "rookie": 1 if is_rookie else 0,
                    })
                i += 1
            else:
                i += 1

    # Sort by numeric card number
    def sort_key(c: Dict):
        try:
            return (int(re.sub(r"\D", "", c["card_number"])), c["card_number"])
        except ValueError:
            return (9999, c["card_number"])

    cards.sort(key=sort_key)
    return cards, page_title


def main():
    parser = argparse.ArgumentParser(description="Scrape a Keyman checklist → CardStoard CSV")
    parser.add_argument("url", help="Keyman Collectibles checklist page URL")
    parser.add_argument("--set-name", default=None, help="Override set name")
    parser.add_argument("--brand",    default=None, help="Override brand (e.g. Topps)")
    parser.add_argument("--year",     type=int, default=None, help="Override year")
    parser.add_argument("--out",      default=None, help="Output CSV file (default: stdout)")
    args = parser.parse_args()

    print(f"Fetching: {args.url}", file=sys.stderr)
    cards, page_title = scrape(args.url)

    if not cards:
        print("ERROR: No cards found. Check the URL or inspect the page manually.", file=sys.stderr)
        sys.exit(1)

    meta = infer_meta(args.url, page_title)
    set_name = args.set_name or meta["set_name"] or "Unknown Set"
    brand    = args.brand    or meta["brand"]    or "Unknown"
    year     = args.year     or meta["year"]     or 0

    print(f"Set:   {set_name}", file=sys.stderr)
    print(f"Brand: {brand}",    file=sys.stderr)
    print(f"Year:  {year}",     file=sys.stderr)
    print(f"Cards: {len(cards)}", file=sys.stderr)

    rookies = sum(1 for c in cards if c["rookie"])
    print(f"Rookies flagged: {rookies}", file=sys.stderr)

    out_file = open(args.out, "w", newline="", encoding="utf-8") if args.out else sys.stdout
    writer = csv.writer(out_file)
    writer.writerow(["SetName", "Brand", "Year", "CardNumber", "First", "Last", "Rookie"])
    for c in cards:
        writer.writerow([set_name, brand, year, c["card_number"], c["first"], c["last"], c["rookie"]])

    if args.out:
        out_file.close()
        print(f"\nWrote {len(cards)} rows → {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
