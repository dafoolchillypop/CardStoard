import io, csv
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app import models, schemas
from app.database import get_db
from app.auth.security import get_current_user
from app.models import Card, DictionaryEntry, User

router = APIRouter(prefix="/dictionary", tags=["dictionary"])

# ---------------------------------------------------------------------------
# GET /dictionary/entries  — paginated list with optional filters
# ---------------------------------------------------------------------------
@router.get("/entries", response_model=list[schemas.DictionaryEntryRead])
def list_entries(
    skip: int = 0,
    limit: int = 50,
    last_name: Optional[str] = None,
    brand: Optional[str] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    q = db.query(DictionaryEntry)
    if last_name:
        q = q.filter(func.lower(DictionaryEntry.last_name).contains(last_name.lower()))
    if brand:
        q = q.filter(func.lower(DictionaryEntry.brand).contains(brand.lower()))
    if year is not None:
        q = q.filter(DictionaryEntry.year == year)
    entries = q.order_by(DictionaryEntry.last_name, DictionaryEntry.year).offset(skip).limit(limit).all()

    # Build set of card fingerprints owned by this user for in_collection annotation
    user_cards = db.query(
        func.lower(Card.first_name),
        func.lower(Card.last_name),
        func.lower(Card.brand),
        Card.year,
    ).filter(Card.user_id == current.id).all()
    owned = {(r[0], r[1], r[2], r[3]) for r in user_cards}

    result = []
    for e in entries:
        key = (e.first_name.lower(), e.last_name.lower(), e.brand.lower(), e.year)
        result.append(schemas.DictionaryEntryRead(
            id=e.id, first_name=e.first_name, last_name=e.last_name,
            rookie_year=e.rookie_year, brand=e.brand, year=e.year,
            card_number=e.card_number, in_collection=(key in owned),
            book_high=e.book_high, book_high_mid=e.book_high_mid,
            book_mid=e.book_mid, book_low_mid=e.book_low_mid,
            book_low=e.book_low, book_values_imported_at=e.book_values_imported_at,
        ))
    return result


# ---------------------------------------------------------------------------
# GET /dictionary/count
# ---------------------------------------------------------------------------
@router.get("/count")
def count_entries(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    return {"count": db.query(DictionaryEntry).count()}


# ---------------------------------------------------------------------------
# GET /dictionary/players  — unique (first, last) pairs for autocomplete
# ---------------------------------------------------------------------------
@router.get("/players")
def get_dictionary_players(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    rows = (
        db.query(DictionaryEntry.first_name, DictionaryEntry.last_name)
        .distinct()
        .all()
    )
    return {"players": [{"first_name": r.first_name, "last_name": r.last_name} for r in rows]}


# ---------------------------------------------------------------------------
# GET /dictionary/search  — smart-fill lookup
# ---------------------------------------------------------------------------
@router.get("/search")
def search_entry(
    first_name: str,
    last_name: str,
    brand: Optional[str] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    q = db.query(DictionaryEntry).filter(
        func.lower(DictionaryEntry.first_name) == first_name.strip().lower(),
        func.lower(DictionaryEntry.last_name) == last_name.strip().lower(),
    )
    if brand:
        q = q.filter(func.lower(DictionaryEntry.brand) == brand.strip().lower())
    if year is not None:
        q = q.filter(DictionaryEntry.year == year)

    entry = q.first()
    if not entry:
        return {"status": "not_found", "fields": {}}

    fields = {"card_number": entry.card_number}
    if year is not None:
        fields["rookie"] = (year == entry.rookie_year)

    return {"status": "ok", "fields": fields}


# ---------------------------------------------------------------------------
# GET /dictionary/entries/{id}  — fetch single entry
# ---------------------------------------------------------------------------
@router.get("/entries/{entry_id}", response_model=schemas.DictionaryEntryRead)
def get_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    entry = db.query(DictionaryEntry).filter(DictionaryEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Dictionary entry not found")
    return entry


# ---------------------------------------------------------------------------
# POST /dictionary/entries  — create one entry
# ---------------------------------------------------------------------------
@router.post("/entries", response_model=schemas.DictionaryEntryRead)
def create_entry(
    data: schemas.DictionaryEntryCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    entry = DictionaryEntry(**data.dict())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


# ---------------------------------------------------------------------------
# PUT /dictionary/entries/{id}  — update one entry
# ---------------------------------------------------------------------------
@router.put("/entries/{entry_id}", response_model=schemas.DictionaryEntryRead)
def update_entry(
    entry_id: int,
    data: schemas.DictionaryEntryCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    entry = db.query(DictionaryEntry).filter(DictionaryEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Dictionary entry not found")
    for field, value in data.dict().items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


# ---------------------------------------------------------------------------
# DELETE /dictionary/entries/{id}
# ---------------------------------------------------------------------------
@router.delete("/entries/{entry_id}")
def delete_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    entry = db.query(DictionaryEntry).filter(DictionaryEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Dictionary entry not found")
    db.delete(entry)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# POST /dictionary/validate-csv  — format check + duplicate detection
# ---------------------------------------------------------------------------
@router.post("/validate-csv")
async def validate_dictionary_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    errors = []
    warnings = []

    if not file.filename.lower().endswith(".csv"):
        return {"valid": False, "row_count": 0, "duplicate_count": 0,
                "errors": ["File must be a .csv"], "warnings": [], "duplicates": []}

    content = (await file.read()).decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))

    expected = {"First", "Last", "RookieYear", "Brand", "Year", "CardNumber"}
    if not reader.fieldnames or not expected.issubset(set(reader.fieldnames)):
        missing = expected.difference(set(reader.fieldnames or []))
        return {"valid": False, "row_count": 0, "duplicate_count": 0,
                "errors": [f"Missing required columns: {', '.join(sorted(missing))}"],
                "warnings": [], "duplicates": []}

    parsed = []
    rownum = 0
    for row in reader:
        rownum += 1
        first = (row.get("First") or "").strip()
        last  = (row.get("Last") or "").strip()
        brand = (row.get("Brand") or "").strip()
        year_raw = (row.get("Year") or "").strip()
        rookie_raw = (row.get("RookieYear") or "").strip()
        card_number = (row.get("CardNumber") or "").strip()

        for field, val in [("First", first), ("Last", last), ("Brand", brand), ("Year", year_raw)]:
            if not val:
                warnings.append(f"Row {rownum}: blank {field} field")

        try:
            year = int(year_raw)
        except (ValueError, TypeError):
            errors.append(f"Row {rownum}: could not parse Year '{year_raw}'")
            continue

        if rookie_raw:
            try:
                int(rookie_raw)
            except (ValueError, TypeError):
                errors.append(f"Row {rownum}: could not parse RookieYear '{rookie_raw}'")
                continue

        parsed.append((first.lower(), last.lower(), brand.lower(), year, card_number))

    # Bulk duplicate check
    duplicates = []
    if parsed:
        existing = db.query(
            func.lower(DictionaryEntry.first_name),
            func.lower(DictionaryEntry.last_name),
            func.lower(DictionaryEntry.brand),
            DictionaryEntry.year,
            DictionaryEntry.card_number,
        ).all()
        existing_set = {(r[0], r[1], r[2], r[3], r[4]) for r in existing}

        for (fn, ln, br, yr, cn) in parsed:
            if (fn, ln, br, yr, cn) in existing_set:
                duplicates.append({"first_name": fn, "last_name": ln,
                                   "brand": br, "year": yr, "card_number": cn})

    return {
        "valid": len(errors) == 0,
        "row_count": rownum,
        "duplicate_count": len(duplicates),
        "errors": errors,
        "warnings": warnings,
        "duplicates": duplicates[:20],  # cap preview at 20
    }


# ---------------------------------------------------------------------------
# POST /dictionary/import-csv  — bulk import
# CSV format: First,Last,RookieYear,Brand,Year,CardNumber
# ---------------------------------------------------------------------------
@router.post("/import-csv")
async def import_dictionary_csv(
    file: UploadFile = File(...),
    skip_duplicates: bool = True,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")

    content = (await file.read()).decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))

    expected = {"First", "Last", "RookieYear", "Brand", "Year", "CardNumber"}
    if not reader.fieldnames or not expected.issubset(set(reader.fieldnames)):
        missing = expected.difference(set(reader.fieldnames or []))
        raise HTTPException(
            status_code=400,
            detail=f"CSV is missing required headers: {', '.join(sorted(missing))}"
        )

    # Build existing fingerprint set when skipping duplicates
    existing_set: set = set()
    if skip_duplicates:
        existing = db.query(
            func.lower(DictionaryEntry.first_name),
            func.lower(DictionaryEntry.last_name),
            func.lower(DictionaryEntry.brand),
            DictionaryEntry.year,
            DictionaryEntry.card_number,
        ).all()
        existing_set = {(r[0], r[1], r[2], r[3], r[4]) for r in existing}

    new_entries = []
    skipped = 0
    rownum = 0
    for row in reader:
        rownum += 1
        try:
            first = (row["First"] or "").strip()
            last  = (row["Last"] or "").strip()
            brand = (row["Brand"] or "").strip()
            year  = int((row["Year"] or "").strip())
            card_number = (row["CardNumber"] or "").strip()
            rookie_year = int(row["RookieYear"].strip()) if row.get("RookieYear", "").strip() else None

            if skip_duplicates and (first.lower(), last.lower(), brand.lower(), year, card_number) in existing_set:
                skipped += 1
                continue

            new_entries.append(DictionaryEntry(
                first_name=first, last_name=last, rookie_year=rookie_year,
                brand=brand, year=year, card_number=card_number,
            ))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Row {rownum} invalid: {e}")

    if not new_entries and skipped == 0:
        return {"imported": 0, "skipped": 0, "message": "No entries found in file."}

    db.add_all(new_entries)
    db.commit()
    msg = f"Imported {len(new_entries)} entries."
    if skipped:
        msg += f" Skipped {skipped} duplicates."
    return {"imported": len(new_entries), "skipped": skipped, "message": msg}


# ---------------------------------------------------------------------------
# PATCH /dictionary/players/rookie-year  — set rookie year for all entries
#                                          matching a player name
# ---------------------------------------------------------------------------
@router.patch("/players/rookie-year")
def set_player_rookie_year(
    first_name: str,
    last_name: str,
    rookie_year: Optional[int] = None,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    updated = (
        db.query(DictionaryEntry)
        .filter(
            func.lower(DictionaryEntry.first_name) == first_name.lower().strip(),
            func.lower(DictionaryEntry.last_name)  == last_name.lower().strip(),
        )
        .update({"rookie_year": rookie_year}, synchronize_session=False)
    )
    db.commit()
    return {"updated": updated}


# ---------------------------------------------------------------------------
# GET /dictionary/values-stats  — count of entries with book values + last import date
# ---------------------------------------------------------------------------
@router.get("/values-stats")
def get_values_stats(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    values_count = db.query(DictionaryEntry).filter(DictionaryEntry.book_high.isnot(None)).count()
    # Latest import timestamp across all entries
    latest = db.query(func.max(DictionaryEntry.book_values_imported_at)).scalar()
    return {"values_count": values_count, "last_imported_at": latest}


# ---------------------------------------------------------------------------
# POST /dictionary/validate-values-csv  — validate a book-value CSV before import
# CSV format: Brand,Year,CardNumber,BookHigh,BookHighMid,BookMid,BookLowMid,BookLow
# ---------------------------------------------------------------------------
@router.post("/validate-values-csv")
async def validate_values_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    errors = []

    if not file.filename.lower().endswith(".csv"):
        return {"valid": False, "row_count": 0, "match_count": 0, "not_found_count": 0,
                "errors": ["File must be a .csv"], "not_found": []}

    content = (await file.read()).decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))

    expected = {"Brand", "Year", "CardNumber", "BookHigh", "BookHighMid", "BookMid", "BookLowMid", "BookLow"}
    if not reader.fieldnames or not expected.issubset(set(reader.fieldnames)):
        missing = expected.difference(set(reader.fieldnames or []))
        return {"valid": False, "row_count": 0, "match_count": 0, "not_found_count": 0,
                "errors": [f"Missing required columns: {', '.join(sorted(missing))}"], "not_found": []}

    parsed = []
    rownum = 0
    for row in reader:
        rownum += 1
        brand      = (row.get("Brand") or "").strip()
        year_raw   = (row.get("Year") or "").strip()
        card_number = (row.get("CardNumber") or "").strip()

        try:
            year = int(year_raw)
        except (ValueError, TypeError):
            errors.append(f"Row {rownum}: could not parse Year '{year_raw}'")
            continue

        for col in ("BookHigh", "BookHighMid", "BookMid", "BookLowMid", "BookLow"):
            val = (row.get(col) or "").strip()
            if not val:
                errors.append(f"Row {rownum}: missing {col} — all 5 value tiers are required")
            else:
                try:
                    float(val)
                except (ValueError, TypeError):
                    errors.append(f"Row {rownum}: non-numeric {col} '{val}'")

        parsed.append((brand.lower(), year, card_number.lower()))

    # Check which rows match existing dictionary entries
    not_found = []
    match_count = 0
    if parsed and not errors:
        existing = db.query(
            func.lower(DictionaryEntry.brand),
            DictionaryEntry.year,
            func.lower(DictionaryEntry.card_number),
        ).all()
        existing_set = {(r[0], r[1], r[2]) for r in existing}

        for idx, (br, yr, cn) in enumerate(parsed):
            if (br, yr, cn) in existing_set:
                match_count += 1
            else:
                not_found.append({"brand": br, "year": yr, "card_number": cn})

    return {
        "valid": len(errors) == 0,
        "row_count": rownum,
        "match_count": match_count,
        "not_found_count": len(not_found),
        "errors": errors,
        "not_found": not_found[:20],  # cap preview at 20
    }


# ---------------------------------------------------------------------------
# POST /dictionary/import-values-csv  — bulk update book values from CSV
# CSV format: Brand,Year,CardNumber,BookHigh,BookHighMid,BookMid,BookLowMid,BookLow
# ---------------------------------------------------------------------------
@router.post("/import-values-csv")
async def import_values_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")

    content = (await file.read()).decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))

    expected = {"Brand", "Year", "CardNumber", "BookHigh", "BookHighMid", "BookMid", "BookLowMid", "BookLow"}
    if not reader.fieldnames or not expected.issubset(set(reader.fieldnames)):
        missing = expected.difference(set(reader.fieldnames or []))
        raise HTTPException(
            status_code=400,
            detail=f"CSV is missing required headers: {', '.join(sorted(missing))}"
        )

    now = datetime.now(timezone.utc)
    updated = 0
    not_found = 0
    rownum = 0

    for row in reader:
        rownum += 1
        try:
            brand       = (row["Brand"] or "").strip()
            year        = int((row["Year"] or "").strip())
            card_number = (row["CardNumber"] or "").strip()

            def _f(col):
                v = (row.get(col) or "").strip()
                return float(v) if v else None

            book_high     = _f("BookHigh")
            book_high_mid = _f("BookHighMid")
            book_mid      = _f("BookMid")
            book_low_mid  = _f("BookLowMid")
            book_low      = _f("BookLow")

        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Row {rownum} invalid: {e}")

        # Skip rows missing any of the 5 value tiers
        if not all([book_high, book_high_mid, book_mid, book_low_mid, book_low]):
            not_found += 1
            continue

        entry = db.query(DictionaryEntry).filter(
            func.lower(DictionaryEntry.brand) == brand.lower(),
            DictionaryEntry.year == year,
            func.lower(DictionaryEntry.card_number) == card_number.lower(),
        ).first()

        if entry:
            entry.book_high     = book_high
            entry.book_high_mid = book_high_mid
            entry.book_mid      = book_mid
            entry.book_low_mid  = book_low_mid
            entry.book_low      = book_low
            entry.book_values_imported_at = now
            updated += 1
        else:
            not_found += 1

    db.commit()
    msg = f"Updated {updated} entries."
    if not_found:
        msg += f" {not_found} rows had no matching dictionary entry (skipped)."
    return {"updated": updated, "not_found": not_found, "message": msg}


# ---------------------------------------------------------------------------
# POST /dictionary/seed-values-from-cards  — one-time seed from user's cards table
# Copies book values from cards to dictionary_entries where brand+year+card_number match
# and book_high > 0. Admin-only convenience endpoint for initial population.
# ---------------------------------------------------------------------------
@router.post("/seed-values-from-cards")
def seed_values_from_cards(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)

    # Fetch all cards with all 5 book values set belonging to this user
    cards_with_values = db.query(Card).filter(
        Card.user_id == current.id,
        Card.book_high.isnot(None),    Card.book_high > 0,
        Card.book_high_mid.isnot(None), Card.book_high_mid > 0,
        Card.book_mid.isnot(None),      Card.book_mid > 0,
        Card.book_low_mid.isnot(None),  Card.book_low_mid > 0,
        Card.book_low.isnot(None),      Card.book_low > 0,
    ).all()

    created = 0
    updated = 0
    for card in cards_with_values:
        if not card.brand or not card.year or not card.card_number:
            continue
        entry = db.query(DictionaryEntry).filter(
            func.lower(DictionaryEntry.brand) == card.brand.lower(),
            DictionaryEntry.year == card.year,
            func.lower(DictionaryEntry.card_number) == card.card_number.lower(),
        ).first()

        if entry:
            entry.book_high     = card.book_high
            entry.book_high_mid = card.book_high_mid
            entry.book_mid      = card.book_mid
            entry.book_low_mid  = card.book_low_mid
            entry.book_low      = card.book_low
            entry.book_values_imported_at = now
            updated += 1
        else:
            db.add(DictionaryEntry(
                first_name=card.first_name,
                last_name=card.last_name,
                rookie_year=None,
                brand=card.brand,
                year=card.year,
                card_number=card.card_number,
                book_high=card.book_high,
                book_high_mid=card.book_high_mid,
                book_mid=card.book_mid,
                book_low_mid=card.book_low_mid,
                book_low=card.book_low,
                book_values_imported_at=now,
            ))
            created += 1

    db.commit()
    return {
        "updated": updated,
        "created": created,
        "message": f"Seeded {updated + created} dictionary entries ({updated} updated, {created} created).",
    }


# ---------------------------------------------------------------------------
# GET /dictionary/duplicate-stats  — count duplicate entry groups + rows to remove
# Duplicates defined as same (lower first_name, lower last_name, lower brand,
# year, lower card_number). Returns counts without making any changes.
# ---------------------------------------------------------------------------
@router.get("/duplicate-stats")
def get_duplicate_stats(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    row = db.execute(text("""
        SELECT
            COUNT(*)                  AS duplicate_groups,
            COALESCE(SUM(cnt - 1), 0) AS entries_to_remove
        FROM (
            SELECT COUNT(*) AS cnt
            FROM dictionary_entries
            GROUP BY LOWER(first_name), LOWER(last_name), LOWER(brand), year, LOWER(card_number)
            HAVING COUNT(*) > 1
        ) sub
    """)).fetchone()
    return {
        "duplicate_groups":  int(row[0]),
        "entries_to_remove": int(row[1]),
    }


# ---------------------------------------------------------------------------
# POST /dictionary/deduplicate  — remove duplicate entries, keeping the one
# with the most recent book_values_imported_at (tiebreak: highest id).
# ---------------------------------------------------------------------------
@router.post("/deduplicate")
def deduplicate_entries(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    result = db.execute(text("""
        WITH ranked AS (
            SELECT id,
                   ROW_NUMBER() OVER (
                       PARTITION BY LOWER(first_name), LOWER(last_name), LOWER(brand),
                                    year, LOWER(card_number)
                       ORDER BY book_values_imported_at DESC NULLS LAST, id DESC
                   ) AS rn
            FROM dictionary_entries
        ),
        to_delete AS (
            SELECT id FROM ranked WHERE rn > 1
        )
        DELETE FROM dictionary_entries
        WHERE id IN (SELECT id FROM to_delete)
        RETURNING id
    """))
    removed = len(result.fetchall())
    db.commit()
    return {
        "removed": removed,
        "message": f"Removed {removed} duplicate {'entry' if removed == 1 else 'entries'}. Dictionary is now clean.",
    }


# ---------------------------------------------------------------------------
# Historically impossible brand/year combinations
# Score didn't exist until 1988; Upper Deck 1989; Donruss/Fleer 1981;
# Fleer ran 1959-1963 then stopped until 1981; Bowman ran 1948-1955 then
# stopped until 1989. Entries outside these windows are garbage — typically
# created by the card auto-seed when a card was saved with a wrong brand.
# ---------------------------------------------------------------------------
_INVALID_BRAND_SQL = """
    LOWER(brand) = 'score'      AND year < 1988  OR
    LOWER(brand) = 'upper deck' AND year < 1989  OR
    LOWER(brand) = 'donruss'    AND year < 1981  OR
    LOWER(brand) = 'fleer'      AND year < 1959  OR
    LOWER(brand) = 'fleer'      AND year > 1963 AND year < 1981  OR
    LOWER(brand) = 'bowman'     AND year > 1955 AND year < 1989
"""


# GET /dictionary/invalid-stats  — count historically impossible entries
@router.get("/invalid-stats")
def get_invalid_stats(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    row = db.execute(text(f"""
        SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE LOWER(brand) = 'score')      AS score_count,
               COUNT(*) FILTER (WHERE LOWER(brand) = 'upper deck') AS upper_deck_count,
               COUNT(*) FILTER (WHERE LOWER(brand) = 'donruss')    AS donruss_count,
               COUNT(*) FILTER (WHERE LOWER(brand) = 'fleer')      AS fleer_count,
               COUNT(*) FILTER (WHERE LOWER(brand) = 'bowman')     AS bowman_count
        FROM dictionary_entries
        WHERE {_INVALID_BRAND_SQL}
    """)).fetchone()
    by_brand = {}
    if row[1]: by_brand["Score"]      = int(row[1])
    if row[2]: by_brand["Upper Deck"] = int(row[2])
    if row[3]: by_brand["Donruss"]    = int(row[3])
    if row[4]: by_brand["Fleer"]      = int(row[4])
    if row[5]: by_brand["Bowman"]     = int(row[5])
    return {"total": int(row[0]), "by_brand": by_brand}


# POST /dictionary/purge-invalid  — delete all historically impossible entries
@router.post("/purge-invalid")
def purge_invalid_entries(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    result = db.execute(text(f"""
        DELETE FROM dictionary_entries
        WHERE {_INVALID_BRAND_SQL}
        RETURNING id
    """))
    removed = len(result.fetchall())
    db.commit()
    return {
        "removed": removed,
        "message": f"Removed {removed} invalid {'entry' if removed == 1 else 'entries'}. Dictionary is now clean.",
    }
