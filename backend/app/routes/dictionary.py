import io, csv
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func

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
            card_number=e.card_number, in_collection=(key in owned)
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
