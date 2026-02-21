import io, csv
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models, schemas
from app.database import get_db
from app.auth.security import get_current_user
from app.models import DictionaryEntry, User

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
    return q.order_by(DictionaryEntry.last_name, DictionaryEntry.year).offset(skip).limit(limit).all()


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
# POST /dictionary/import-csv  — bulk import
# CSV format: First,Last,RookieYear,Brand,Year,CardNumber
# ---------------------------------------------------------------------------
@router.post("/import-csv")
async def import_dictionary_csv(
    file: UploadFile = File(...),
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

    new_entries = []
    rownum = 0
    for row in reader:
        rownum += 1
        try:
            new_entries.append(DictionaryEntry(
                first_name=(row["First"] or "").strip(),
                last_name=(row["Last"] or "").strip(),
                rookie_year=int((row["RookieYear"] or "").strip()),
                brand=(row["Brand"] or "").strip(),
                year=int((row["Year"] or "").strip()),
                card_number=(row["CardNumber"] or "").strip(),
            ))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Row {rownum} invalid: {e}")

    if not new_entries:
        return {"imported": 0}

    db.add_all(new_entries)
    db.commit()
    return {"imported": len(new_entries), "message": f"Successfully imported {len(new_entries)} dictionary entries."}
