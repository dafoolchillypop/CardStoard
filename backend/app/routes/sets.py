import io, csv
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models, schemas
from app.database import get_db
from app.auth.security import get_current_user
from app.models import User

router = APIRouter(prefix="/sets", tags=["sets"])


# ---------------------------------------------------------------------------
# GET /sets/  — list all sets with user's in_collection counts
# ---------------------------------------------------------------------------
@router.get("/", response_model=list[schemas.SetListOut])
def list_sets(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    sets = db.query(models.SetList).order_by(models.SetList.year, models.SetList.name).all()

    # Count total entries and in-collection entries per set for this user
    entry_counts = dict(
        db.query(models.SetEntry.set_id, func.count(models.SetEntry.id))
        .group_by(models.SetEntry.set_id)
        .all()
    )

    in_col_counts = dict(
        db.query(models.SetEntry.set_id, func.count(models.UserSetCard.id))
        .join(models.UserSetCard, models.UserSetCard.set_entry_id == models.SetEntry.id)
        .filter(models.UserSetCard.user_id == current.id)
        .group_by(models.SetEntry.set_id)
        .all()
    )

    result = []
    for s in sets:
        result.append(schemas.SetListOut(
            id=s.id, name=s.name, brand=s.brand, year=s.year, created_at=s.created_at,
            entry_count=entry_counts.get(s.id, 0),
            in_collection_count=in_col_counts.get(s.id, 0),
        ))
    return result


# ---------------------------------------------------------------------------
# GET /sets/{set_id}/entries  — all entries, overlaid with user status
# ---------------------------------------------------------------------------
@router.get("/{set_id}/entries", response_model=list[schemas.SetEntryOut])
def list_set_entries(
    set_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    s = db.query(models.SetList).filter(models.SetList.id == set_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Set not found")

    entries = (
        db.query(models.SetEntry)
        .filter(models.SetEntry.set_id == set_id)
        .order_by(models.SetEntry.card_number)
        .all()
    )

    # Build lookup of user's set cards for this set
    entry_ids = [e.id for e in entries]
    user_cards = {}
    if entry_ids:
        rows = (
            db.query(models.UserSetCard)
            .filter(
                models.UserSetCard.user_id == current.id,
                models.UserSetCard.set_entry_id.in_(entry_ids),
            )
            .all()
        )
        user_cards = {uc.set_entry_id: uc for uc in rows}

    result = []
    for e in entries:
        uc = user_cards.get(e.id)
        result.append(schemas.SetEntryOut(
            id=e.id,
            set_id=e.set_id,
            card_number=e.card_number,
            first_name=e.first_name,
            last_name=e.last_name,
            rookie=bool(e.rookie),
            user_set_card_id=uc.id if uc else None,
            in_build=uc is not None,
            grade=uc.grade if uc else None,
            book_high=uc.book_high if uc else None,
            book_high_mid=uc.book_high_mid if uc else None,
            book_mid=uc.book_mid if uc else None,
            book_low_mid=uc.book_low_mid if uc else None,
            book_low=uc.book_low if uc else None,
            value=uc.value if uc else None,
            notes=uc.notes if uc else None,
            book_values_updated_at=uc.book_values_updated_at if uc else None,
        ))
    return result


# ---------------------------------------------------------------------------
# POST /sets/{set_id}/user-cards  — mark a card as in build
# ---------------------------------------------------------------------------
@router.post("/{set_id}/user-cards", response_model=schemas.SetEntryOut)
def add_to_build(
    set_id: int,
    data: schemas.UserSetCardCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    entry = db.query(models.SetEntry).filter(
        models.SetEntry.id == data.set_entry_id,
        models.SetEntry.set_id == set_id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Set entry not found")

    existing = db.query(models.UserSetCard).filter(
        models.UserSetCard.user_id == current.id,
        models.UserSetCard.set_entry_id == data.set_entry_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Card already in build")

    uc = models.UserSetCard(user_id=current.id, set_entry_id=data.set_entry_id)
    db.add(uc)
    db.commit()
    db.refresh(uc)

    return schemas.SetEntryOut(
        id=entry.id, set_id=entry.set_id, card_number=entry.card_number,
        first_name=entry.first_name, last_name=entry.last_name, rookie=bool(entry.rookie),
        user_set_card_id=uc.id, in_build=True,
        grade=uc.grade, book_high=uc.book_high, book_high_mid=uc.book_high_mid,
        book_mid=uc.book_mid, book_low_mid=uc.book_low_mid, book_low=uc.book_low,
        value=uc.value, notes=uc.notes, book_values_updated_at=uc.book_values_updated_at,
    )


# ---------------------------------------------------------------------------
# PATCH /sets/{set_id}/user-cards/{set_entry_id}  — update grade/values
# ---------------------------------------------------------------------------
@router.patch("/{set_id}/user-cards/{set_entry_id}", response_model=schemas.SetEntryOut)
def update_user_set_card(
    set_id: int,
    set_entry_id: int,
    data: schemas.UserSetCardUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    entry = db.query(models.SetEntry).filter(
        models.SetEntry.id == set_entry_id,
        models.SetEntry.set_id == set_id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Set entry not found")

    uc = db.query(models.UserSetCard).filter(
        models.UserSetCard.user_id == current.id,
        models.UserSetCard.set_entry_id == set_entry_id,
    ).first()
    if not uc:
        raise HTTPException(status_code=404, detail="Card not in build")

    BOOK_FIELDS = {"book_high", "book_high_mid", "book_mid", "book_low_mid", "book_low"}
    old_books = {f: getattr(uc, f) for f in BOOK_FIELDS}

    for field, value in data.dict(exclude_unset=True).items():
        setattr(uc, field, value)

    new_books = {f: getattr(uc, f) for f in BOOK_FIELDS}
    if new_books != old_books:
        uc.book_values_updated_at = datetime.now(timezone.utc)

    # Recalculate value using same service as cards
    settings = (
        db.query(models.GlobalSettings)
        .filter(models.GlobalSettings.user_id == current.id)
        .first()
    )
    if settings and uc.grade is not None:
        from ..services.card_value import calculate_market_factor, pick_avg_book, calculate_card_value

        # Build a duck-typed object for calculate_market_factor / pick_avg_book
        class _Proxy:
            pass
        proxy = _Proxy()
        proxy.grade = uc.grade
        proxy.rookie = entry.rookie
        proxy.book_high = uc.book_high
        proxy.book_high_mid = uc.book_high_mid
        proxy.book_mid = uc.book_mid
        proxy.book_low_mid = uc.book_low_mid
        proxy.book_low = uc.book_low

        avg_book = pick_avg_book(proxy)
        g = float(uc.grade)
        factor = calculate_market_factor(proxy, settings)
        uc.value = calculate_card_value(avg_book, g, factor)

    db.commit()
    db.refresh(uc)

    return schemas.SetEntryOut(
        id=entry.id, set_id=entry.set_id, card_number=entry.card_number,
        first_name=entry.first_name, last_name=entry.last_name, rookie=bool(entry.rookie),
        user_set_card_id=uc.id, in_build=True,
        grade=uc.grade, book_high=uc.book_high, book_high_mid=uc.book_high_mid,
        book_mid=uc.book_mid, book_low_mid=uc.book_low_mid, book_low=uc.book_low,
        value=uc.value, notes=uc.notes, book_values_updated_at=uc.book_values_updated_at,
    )


# ---------------------------------------------------------------------------
# DELETE /sets/{set_id}/user-cards/{set_entry_id}  — remove from build
# ---------------------------------------------------------------------------
@router.delete("/{set_id}/user-cards/{set_entry_id}")
def remove_from_build(
    set_id: int,
    set_entry_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    uc = db.query(models.UserSetCard).filter(
        models.UserSetCard.user_id == current.id,
        models.UserSetCard.set_entry_id == set_entry_id,
    ).first()
    if not uc:
        raise HTTPException(status_code=404, detail="Card not in build")
    db.delete(uc)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# DELETE /sets/{set_id}  — delete entire set (admin action)
# ---------------------------------------------------------------------------
@router.delete("/{set_id}")
def delete_set(
    set_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    s = db.query(models.SetList).filter(models.SetList.id == set_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Set not found")
    db.delete(s)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# POST /sets/validate-csv  — format check before import
# CSV: SetName,Brand,Year,CardNumber,First,Last,Rookie
# ---------------------------------------------------------------------------
@router.post("/validate-csv")
async def validate_set_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    errors = []
    warnings = []

    if not file.filename.lower().endswith(".csv"):
        return {"valid": False, "row_count": 0, "set_count": 0,
                "errors": ["File must be a .csv"], "warnings": []}

    content = (await file.read()).decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))

    expected = {"SetName", "Brand", "Year", "CardNumber", "First", "Last", "Rookie"}
    if not reader.fieldnames or not expected.issubset(set(reader.fieldnames)):
        missing = expected.difference(set(reader.fieldnames or []))
        return {"valid": False, "row_count": 0, "set_count": 0,
                "errors": [f"Missing required columns: {', '.join(sorted(missing))}"],
                "warnings": []}

    sets_seen = set()
    rownum = 0
    for row in reader:
        rownum += 1
        set_name = (row.get("SetName") or "").strip()
        brand    = (row.get("Brand") or "").strip()
        year_raw = (row.get("Year") or "").strip()
        card_num = (row.get("CardNumber") or "").strip()

        for field, val in [("SetName", set_name), ("Brand", brand), ("Year", year_raw), ("CardNumber", card_num)]:
            if not val:
                warnings.append(f"Row {rownum}: blank {field} field")

        try:
            year = int(year_raw)
        except (ValueError, TypeError):
            errors.append(f"Row {rownum}: could not parse Year '{year_raw}'")
            continue

        sets_seen.add((set_name.lower(), brand.lower(), year))

    return {
        "valid": len(errors) == 0,
        "row_count": rownum,
        "set_count": len(sets_seen),
        "errors": errors,
        "warnings": warnings[:20],
    }


# ---------------------------------------------------------------------------
# POST /sets/import-csv  — bulk import set + entries
# ---------------------------------------------------------------------------
@router.post("/import-csv")
async def import_set_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")

    content = (await file.read()).decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))

    expected = {"SetName", "Brand", "Year", "CardNumber", "First", "Last", "Rookie"}
    if not reader.fieldnames or not expected.issubset(set(reader.fieldnames)):
        missing = expected.difference(set(reader.fieldnames or []))
        raise HTTPException(
            status_code=400,
            detail=f"CSV is missing required headers: {', '.join(sorted(missing))}"
        )

    # Group rows by (set_name, brand, year)
    from collections import defaultdict
    set_rows = defaultdict(list)
    rownum = 0
    for row in reader:
        rownum += 1
        try:
            set_name = (row["SetName"] or "").strip()
            brand    = (row["Brand"] or "").strip()
            year     = int((row["Year"] or "").strip())
            card_num = (row["CardNumber"] or "").strip()
            first    = (row["First"] or "").strip()
            last     = (row["Last"] or "").strip()
            rookie   = (row["Rookie"] or "").strip() in ("1", "true", "True", "yes")
            set_rows[(set_name, brand, year)].append((card_num, first, last, rookie))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Row {rownum} invalid: {e}")

    sets_created = 0
    sets_updated = 0
    entries_added = 0
    entries_skipped = 0

    for (set_name, brand, year), cards in set_rows.items():
        # Upsert the set record
        s = db.query(models.SetList).filter(
            func.lower(models.SetList.name) == set_name.lower(),
            func.lower(models.SetList.brand) == brand.lower(),
            models.SetList.year == year,
        ).first()
        if not s:
            s = models.SetList(name=set_name, brand=brand, year=year)
            db.add(s)
            db.flush()  # get id
            sets_created += 1
        else:
            sets_updated += 1

        # Build existing card_number set for this set_id
        existing_nums = {
            r[0] for r in db.query(models.SetEntry.card_number)
            .filter(models.SetEntry.set_id == s.id).all()
        }

        new_entries = []
        for (card_num, first, last, rookie) in cards:
            if card_num in existing_nums:
                entries_skipped += 1
                continue
            new_entries.append(models.SetEntry(
                set_id=s.id, card_number=card_num,
                first_name=first or None, last_name=last or None, rookie=rookie,
            ))
            existing_nums.add(card_num)

        if new_entries:
            db.add_all(new_entries)
            entries_added += len(new_entries)

    db.commit()

    msg = f"Import complete: {sets_created} new set(s), {sets_updated} existing. {entries_added} entries added, {entries_skipped} skipped."
    return {
        "sets_created": sets_created,
        "sets_updated": sets_updated,
        "entries_added": entries_added,
        "entries_skipped": entries_skipped,
        "message": msg,
    }
