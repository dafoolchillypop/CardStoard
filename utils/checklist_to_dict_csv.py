#!/usr/bin/env python3
"""
checklist_to_dict_csv.py

Convert a set-checklist CSV (produced by scrape_keyman_checklist.py or imported
via Admin → Import Set CSV) into a dictionary CSV for import via
Admin → Dictionary → Import CSV.

Input format  (set-checklist):
    SetName, Brand, Year, CardNumber, First, Last, Rookie

Output format (dictionary import):
    First, Last, RookieYear, Brand, Year, CardNumber

Usage:
    python3 utils/checklist_to_dict_csv.py <input.csv> [--out output.csv]

    # Convert Bowman 1948-1955 checklist:
    python3 utils/checklist_to_dict_csv.py \\
        utils/set-checklists/bowman_1948_1955.csv \\
        --out utils/dict-imports/bowman_1948_1955_dict.csv

    # Convert Fleer 1959-1963 checklist:
    python3 utils/checklist_to_dict_csv.py \\
        utils/set-checklists/fleer_1959_1963.csv \\
        --out utils/dict-imports/fleer_1959_1963_dict.csv

Notes:
    - RookieYear is left blank for players not recognized as rookies in that
      set (i.e. Rookie column = 0). For players flagged as RC (Rookie = 1),
      the card's Year is used as RookieYear.
    - Players already in the existing player_dictionary.py (e.g. Mantle, Mays)
      will have their known rookie_year respected by the Admin import de-dup;
      duplicate rows are skipped automatically.
    - Run the output CSV through Admin → Dictionary → Import CSV (skip_duplicates
      is True by default, so re-runs are safe).
"""

import argparse
import csv
import sys
from pathlib import Path
from typing import Optional


def convert(input_path: str, output_path: Optional[str]) -> None:
    in_file = Path(input_path)
    if not in_file.exists():
        print(f"ERROR: input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    rows_in: list[dict] = []
    with open(in_file, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows_in.append(row)

    if not rows_in:
        print("ERROR: input CSV is empty.", file=sys.stderr)
        sys.exit(1)

    # Validate expected columns
    required = {"SetName", "Brand", "Year", "CardNumber", "First", "Last", "Rookie"}
    missing = required - set(rows_in[0].keys())
    if missing:
        print(f"ERROR: input CSV missing columns: {missing}", file=sys.stderr)
        sys.exit(1)

    rows_out: list[dict] = []
    skipped = 0

    for row in rows_in:
        first = row["First"].strip()
        last  = row["Last"].strip()

        if not first and not last:
            skipped += 1
            continue

        brand       = row["Brand"].strip()
        year_str    = row["Year"].strip()
        card_number = row["CardNumber"].strip()
        is_rookie   = str(row["Rookie"]).strip() in ("1", "true", "True", "yes", "RC")

        try:
            year = int(year_str)
        except ValueError:
            skipped += 1
            continue

        # Use the card year as rookie_year only when the Rookie flag is set;
        # otherwise leave blank so the import UI doesn't override existing data.
        rookie_year = str(year) if is_rookie else ""

        rows_out.append({
            "First":      first,
            "Last":       last,
            "RookieYear": rookie_year,
            "Brand":      brand,
            "Year":       year,
            "CardNumber": card_number,
        })

    out_file = open(output_path, "w", newline="", encoding="utf-8") if output_path else sys.stdout
    writer = csv.DictWriter(out_file, fieldnames=["First", "Last", "RookieYear", "Brand", "Year", "CardNumber"])
    writer.writeheader()
    writer.writerows(rows_out)
    if output_path:
        out_file.close()

    print(f"Converted {len(rows_out)} rows ({skipped} skipped).", file=sys.stderr)
    if output_path:
        print(f"Output → {output_path}", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert set-checklist CSV → dictionary import CSV"
    )
    parser.add_argument("input", help="Input set-checklist CSV file")
    parser.add_argument("--out", default=None, help="Output dict CSV (default: stdout)")
    args = parser.parse_args()
    convert(args.input, args.out)


if __name__ == "__main__":
    main()
