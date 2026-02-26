# Standard library
import io, os, csv, shutil, json
from pathlib import Path as FSPath
from typing import Optional
from datetime import datetime, timezone

# Third-party
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Path
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from werkzeug.utils import secure_filename

# Local
from app import models, schemas
from app.schemas import VALID_GRADES
from app.constants import CARD_NOT_FOUND_MSG
from app.database import get_db
from app.auth.security import get_current_user
from app.models import Card, User, ValuationHistory, DictionaryEntry
from app.services.card_value import calculate_card_value, calculate_market_factor, pick_avg_book

# OCR / Card Identification
#from app.services.image_pipeline import run_crop_pipeline, CardCropError, run_ocr, structured_ocr
#from app.services.quickadd_parser import parse_card_back
#from app.services.fuzzy_match import fuzzy_match_name, fuzzy_match_brand

router = APIRouter(prefix="/cards", tags=["cards"])

# Photo upload location
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "cards")
os.makedirs(UPLOAD_DIR, exist_ok=True)   # ensure dir exists

# Card Photos
@router.post("/{card_id}/upload-front")
def upload_front(
    card_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    card = db.query(models.Card).filter(
        models.Card.id == card_id,
        models.Card.user_id == current.id,
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail=CARD_NOT_FOUND_MSG)

    # Securely build filename + path
    safe_name = secure_filename(file.filename)
    filename = f"card_{card_id}_front_{safe_name}"

    upload_dir = Path(UPLOAD_DIR).resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)
    filepath = (upload_dir / filename).resolve()

    # Ensure no path traversal outside upload directory
    if not str(filepath).startswith(str(upload_dir)):
        raise HTTPException(status_code=400, detail="Invalid file path")

    # Save file safely
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Store relative path in DB
    card.front_image = f"/static/cards/{filename}"
    db.commit()
    db.refresh(card)

    return {"message": "Front image uploaded", "front_image": card.front_image}


@router.post("/{card_id}/upload-back")
def upload_back(
    card_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    card = db.query(models.Card).filter(
        models.Card.id == card_id,
        models.Card.user_id == current.id,
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail=CARD_NOT_FOUND_MSG)

    # Securely build filename + path
    safe_name = secure_filename(file.filename)
    filename = f"card_{card_id}_back_{safe_name}"

    upload_dir = Path(UPLOAD_DIR).resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)
    filepath = (upload_dir / filename).resolve()

    if not str(filepath).startswith(str(upload_dir)):
        raise HTTPException(status_code=400, detail="Invalid file path")

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    card.back_image = f"/static/cards/{filename}"
    db.commit()
    db.refresh(card)

    return {"message": "Back image uploaded", "back_image": card.back_image}

# Import cards
@router.post("/import-csv")
async def import_cards(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),   # ✅ inject current user
):
    # Basic validation
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")

    # Read file (async) and decode
    content = (await file.read()).decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))

    # Expected headers
    expected = {
        "First", "Last", "Year", "Brand", "Rookie", "Card Number",
        "BookHi", "BookHiMid", "BookMid", "BookLowMid", "BookLow", "Grade",
    }
    if not reader.fieldnames or not expected.issubset(set(reader.fieldnames)):
        missing = expected.difference(set(reader.fieldnames or []))
        raise HTTPException(
            status_code=400,
            detail=f"CSV is missing required headers: {', '.join(sorted(missing))}"
        )

    def to_int(v):
        v = (v or "").strip()
        return int(v) if v != "" else None

    def to_float(v):
        v = (v or "").strip()
        return float(v) if v != "" else None

    def to_rookie(v):
        v = (v or "").strip().lower()
        return 1 if v in {"1", "yes", "true", "y", "t", "*"} else 0

    GRADE_MAP = {0.6: 0.8, 1.0: 1.0}  # normalize legacy grade values

    new_cards = []
    rownum = 0
    for row in reader:
        rownum += 1
        try:
            grade = to_float(row["Grade"]) or 1.0
            grade = GRADE_MAP.get(grade, grade)
            if grade is None or grade not in VALID_GRADES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Row {rownum} ({row['First']} {row['Last']}): invalid grade '{row['Grade']}' — must be one of {sorted(VALID_GRADES)}"
                )
            card = models.Card(
                first_name=(row["First"] or "").strip(),
                last_name=(row["Last"] or "").strip(),
                year=to_int(row["Year"]) or 0,
                brand=(row["Brand"] or "").strip(),
                rookie=to_rookie(row["Rookie"]),
                card_number=(row["Card Number"] or "").strip(),
                book_high=to_float(row["BookHi"]),
                book_high_mid=to_float(row["BookHiMid"]),
                book_mid=to_float(row["BookMid"]),
                book_low_mid=to_float(row["BookLowMid"]),
                book_low=to_float(row["BookLow"]),
                grade=grade,
                user_id=current.id,
            )
            new_cards.append(card)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Row {rownum} invalid: {e}")

    if not new_cards:
        return {"imported": 0}

    db.add_all(new_cards)
    db.commit()

    # Apply valuation
    settings = db.query(models.GlobalSettings).filter(
        models.GlobalSettings.user_id == current.id
    ).first()

    if settings:
        for card in new_cards:
            avg_book = pick_avg_book(card)
            g = float(card.grade) if card.grade else None
            factor = calculate_market_factor(card, settings)
            value = calculate_card_value(avg_book, g, factor)

            card.value = value
            card.market_factor = factor

        db.commit()

        # Merge any new brands into card_makes
        imported_brands = {c.brand for c in new_cards if c.brand}
        existing_brands = set(settings.card_makes or [])
        new_brands = imported_brands - existing_brands
        if new_brands:
            settings.card_makes = sorted(existing_brands | imported_brands)
            db.commit()

    return {
    "imported": len(new_cards),
    "message": f"Successfully imported {len(new_cards)} cards."
    }

# Create a card
@router.post("/", response_model=schemas.Card)
def create_card(
    card: schemas.CardCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    try:
        data = card.dict(exclude_unset=True)
        data.pop("market_factor", None)
        data.pop("value", None)

        db_card = models.Card(**data, user_id=current.id)
        db.add(db_card)
        db.commit()
        db.refresh(db_card)

        # Compute market_factor and value from settings, same as update/import paths
        settings = db.query(models.GlobalSettings).filter(
            models.GlobalSettings.user_id == current.id
        ).first()
        if settings:
            avg_book = pick_avg_book(db_card)
            g = float(db_card.grade) if db_card.grade is not None else None
            factor = calculate_market_factor(db_card, settings)
            db_card.market_factor = factor
            db_card.value = calculate_card_value(avg_book, g, factor)
            db.commit()
            db.refresh(db_card)

        # Auto-populate dictionary if card has all required fields
        if (db_card.card_number and db_card.first_name and db_card.last_name
                and db_card.brand and db_card.year):
            existing = db.query(DictionaryEntry).filter(
                func.lower(DictionaryEntry.first_name) == db_card.first_name.lower(),
                func.lower(DictionaryEntry.last_name) == db_card.last_name.lower(),
                func.lower(DictionaryEntry.brand) == db_card.brand.lower(),
                DictionaryEntry.year == db_card.year,
            ).first()
            if not existing:
                db.add(DictionaryEntry(
                    first_name=db_card.first_name,
                    last_name=db_card.last_name,
                    rookie_year=db_card.year,
                    brand=db_card.brand,
                    year=db_card.year,
                    card_number=db_card.card_number,
                ))
                db.commit()

        return db_card

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Card creation failed for user {current.id}: {repr(e)}")
        raise HTTPException(status_code=500, detail="Card creation failed.")

# List all cards
@router.get("/", response_model=list[schemas.Card])
def read_cards(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    cards = (
        db.query(models.Card)
        .filter(Card.user_id == current.id)
        .offset(skip)
        .limit(limit)
        .all()
    )

    # attach market_factor (backend calc) to each card instance
    settings = db.query(models.GlobalSettings).filter(
        models.GlobalSettings.user_id == current.id
    ).first()

    for c in cards:
        c.market_factor = calculate_market_factor(c, settings) if settings else None

    return cards

# Count cards
@router.get("/count")
def count_cards(db: Session = Depends(get_db), current: User = Depends(get_current_user),):
    total = db.query(models.Card).filter(Card.user_id == current.id).count()
    return {"count": total}

# Player name list for autocomplete
@router.get("/players")
async def get_players(db: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    # Dictionary entries
    dict_names = (
        db.query(DictionaryEntry.first_name, DictionaryEntry.last_name)
        .distinct()
        .all()
    )
    players = [{"first_name": r.first_name, "last_name": r.last_name} for r in dict_names]
    # User's own previously entered cards
    user_names = (
        db.query(models.Card.first_name, models.Card.last_name)
        .filter(models.Card.user_id == current.id)
        .distinct()
        .all()
    )
    for row in user_names:
        players.append({"first_name": row.first_name, "last_name": row.last_name})
    return {"players": players}

# Smart Fill
@router.get("/smart-fill")
async def smart_fill(
    first_name: str,
    last_name: str,
    brand: Optional[str] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    try:
        settings = db.query(models.GlobalSettings).filter(
            models.GlobalSettings.user_id == current.id
        ).first()

        if not settings or not settings.enable_smart_fill:
            return {"status": "disabled", "fields": {}}

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

    except Exception as e:
        return {"detail": f"Unexpected error in smart-fill: {repr(e)}"}

# Export card data (CSV / TSV / JSON)
@router.get("/export")
def export_cards(
    format: str = "csv",
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    cards = db.query(models.Card).filter(Card.user_id == current.id).all()

    def _val(v):
        return "" if v is None else v

    if format == "json":
        data = [
            {
                "first_name": c.first_name,
                "last_name": c.last_name,
                "year": c.year,
                "brand": c.brand,
                "rookie": 1 if c.rookie else 0,
                "card_number": _val(c.card_number),
                "book_high": c.book_high,
                "book_high_mid": c.book_high_mid,
                "book_mid": c.book_mid,
                "book_low_mid": c.book_low_mid,
                "book_low": c.book_low,
                "grade": c.grade,
                "value": c.value,
            }
            for c in cards
        ]
        content = json.dumps(data, indent=2)
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=cards.json"},
        )

    delimiter = "\t" if format == "tsv" else ","
    ext = "tsv" if format == "tsv" else "csv"
    output = io.StringIO()
    writer = csv.writer(output, delimiter=delimiter)
    writer.writerow([
        "First", "Last", "Year", "Brand", "Rookie", "Card Number",
        "BookHi", "BookHiMid", "BookMid", "BookLowMid", "BookLow", "Grade", "Value",
    ])
    for c in cards:
        writer.writerow([
            c.first_name, c.last_name, _val(c.year), _val(c.brand),
            1 if c.rookie else 0, _val(c.card_number),
            _val(c.book_high), _val(c.book_high_mid), _val(c.book_mid),
            _val(c.book_low_mid), _val(c.book_low), _val(c.grade), _val(c.value),
        ])
    output.seek(0)
    media = "text/tab-separated-values" if format == "tsv" else "text/csv"
    return StreamingResponse(
        io.BytesIO(output.read().encode()),
        media_type=media,
        headers={"Content-Disposition": f"attachment; filename=cards.{ext}"},
    )


# Full backup (cards + settings) as JSON
@router.get("/backup")
def backup_data(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    cards = db.query(models.Card).filter(Card.user_id == current.id).all()
    settings = db.query(models.GlobalSettings).filter(
        models.GlobalSettings.user_id == current.id
    ).first()

    card_list = [
        {
            "first_name": c.first_name,
            "last_name": c.last_name,
            "year": c.year,
            "brand": c.brand,
            "card_number": c.card_number,
            "rookie": bool(c.rookie),
            "grade": c.grade,
            "book_high": c.book_high,
            "book_high_mid": c.book_high_mid,
            "book_mid": c.book_mid,
            "book_low_mid": c.book_low_mid,
            "book_low": c.book_low,
            "value": c.value,
        }
        for c in cards
    ]

    settings_dict = {}
    if settings:
        skip_fields = {"id", "user_id"}
        settings_dict = {
            k: v for k, v in settings.__dict__.items()
            if not k.startswith("_") and k not in skip_fields
        }

    backup = {
        "version": 1,
        "user": current.username,
        "cards": card_list,
        "settings": settings_dict,
    }
    content = json.dumps(backup, indent=2, default=str)
    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=cardstoard_backup_{current.username}.json"
        },
    )


# Restore from backup JSON
@router.post("/restore")
async def restore_data(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if not file.filename.lower().endswith(".json"):
        raise HTTPException(status_code=400, detail="Please upload a .json backup file")

    content = (await file.read()).decode("utf-8", errors="ignore")
    try:
        backup = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")

    if "cards" not in backup or not isinstance(backup["cards"], list):
        raise HTTPException(status_code=400, detail="Invalid backup file: missing 'cards' array")

    # Delete all existing cards for this user
    db.query(models.Card).filter(Card.user_id == current.id).delete(synchronize_session=False)

    # Re-create cards
    skip_card_fields = {"id", "user_id", "front_image", "back_image"}
    new_cards = []
    for card_data in backup["cards"]:
        fields = {k: v for k, v in card_data.items() if k not in skip_card_fields}
        new_cards.append(models.Card(user_id=current.id, **fields))
    db.add_all(new_cards)

    # Restore settings if present
    if backup.get("settings"):
        settings = db.query(models.GlobalSettings).filter(
            models.GlobalSettings.user_id == current.id
        ).first()
        if settings:
            skip_settings_fields = {"id", "user_id"}
            for k, v in backup["settings"].items():
                if k not in skip_settings_fields and hasattr(settings, k):
                    setattr(settings, k, v)

    db.commit()
    return {
        "restored": len(new_cards),
        "message": f"Successfully restored {len(new_cards)} cards.",
    }


# Read one card
@router.get("/{card_id}", response_model=schemas.Card)
def read_card(
    card_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    card = (
        db.query(models.Card)
        .filter(Card.user_id == current.id)
        .filter(models.Card.id == card_id)
        .first()
    )
    if not card:
        raise HTTPException(status_code=404, detail=CARD_NOT_FOUND_MSG)

    # attach market_factor to single card
    settings = db.query(models.GlobalSettings).filter(
        models.GlobalSettings.user_id == current.id
    ).first()
    card.market_factor = calculate_market_factor(card, settings) if settings else None

    return card

# Update a card
@router.put("/{card_id}", response_model=schemas.Card)
def update_card(card_id: int, updated: schemas.CardUpdate, db: Session = Depends(get_db), current: User = Depends(get_current_user),):
    card = db.query(models.Card).filter(Card.user_id == current.id).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail=CARD_NOT_FOUND_MSG)

    for field, value in updated.dict(exclude_unset=True).items():
        setattr(card, field, value)

    # Recalculate market factor and value after update
    settings = (
        db.query(models.GlobalSettings)
        .filter(models.GlobalSettings.user_id == current.id)
        .first()
    )
    if settings:
        from ..services.card_value import (
            calculate_market_factor,
            pick_avg_book,
            calculate_card_value,
        )

        avg_book = pick_avg_book(card)
        g = float(card.grade) if card.grade is not None else None
        factor = calculate_market_factor(card, settings)
        value = calculate_card_value(avg_book, g, factor)

        card.market_factor = factor
        card.value = value

    db.commit()
    db.refresh(card)
    return card

# Identify a card
#@router.post("/identify")
#async def identify_card(file: UploadFile = File(...)):
#    try:
#        content = await file.read()
#        result = run_crop_pipeline(content)
#        dbg = result["debug"]
#
#        # Run structured OCR instead of full-image OCR
#        structured = structured_ocr(result["cropped_image"])
#
#        return {
#            "status": "ok",
#            "pipeline": dbg,
#            "ocr": structured
#        }
#
#    except CardCropError as e:
#        raise HTTPException(status_code=400, detail=str(e))
#    except Exception as e:
#        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

# Delete a card
@router.delete("/{card_id}")
def delete_card(
    card_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    card = db.query(models.Card).filter(
        Card.user_id == current.id,
        models.Card.id == card_id
    ).first()

    if not card:
        raise HTTPException(status_code=404, detail=CARD_NOT_FOUND_MSG)

    # Delete associated images from disk (if present)
    for image_field in [card.front_image, card.back_image]:
        if image_field:
            image_path = os.path.join(BASE_DIR, image_field.lstrip("/"))
            try:
                os.remove(image_path)
            except FileNotFoundError:
                pass
            except Exception as e:
                # Log unexpected issues but don’t block deletion
                print(f"Warning: could not delete file {image_path}: {e}")

    db.delete(card)
    db.commit()
    return {"ok": True, "message": "Card and associated images deleted"}

# AI Quick Add
#@router.post("/quick-add")
#async def quick_add(file: UploadFile = File(...)):
#    try:
#        contents = await file.read()
#        image = Image.open(io.BytesIO(contents)).convert("L")  # PIL grayscale
#
#        # OCR (only once, only with PIL image)
#        ocr_text = pytesseract.image_to_string(image)
#
#        # Parse OCR into structured fields
#        fields = structured_ocr(ocr_text)
#
#        # 🔹 Run fuzzy matching cleanup
#        matched = fuzzy_match_name(fields.get("first_name", ""), fields.get("last_name", ""))
#        if matched:
#            fields["first_name"] = matched["first_name"]
#            fields["last_name"] = matched["last_name"]
#            # fill in year if missing
#            if not fields.get("year"):
#                fields["year"] = matched["rookie_year"]
#            # try brand detection if missing
#            if not fields.get("brand"):
#                fields["brand"] = fuzzy_match_brand(ocr_text)
#
#        return JSONResponse(content={
#            "status": "ok",
#            "pipeline": {"steps": ["PIL load", "grayscale", "tesseract OCR", "structured parsing", "fuzzy match"]},
#            "ocr_text": ocr_text,
#            "fields": fields
#        })
#
#    except Exception as e:
#        return JSONResponse(
#            content={"detail": f"Unexpected error in quick-add: {repr(e)}"},
#            status_code=500
#        )

# Calculate Card Value
@router.post("/{card_id}/value", response_model=schemas.Card)
def compute_and_save_card_value(
    card_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """
    Compute value using:
      avg_book  = pick_avg_book(card)   (prefers book_mid)
      g         = card.grade
      factor    = calculate_market_factor(card, settings)

    Persist to cards.value and return updated card.
    """
    # 1) Load the card (scoped to current user)
    card = db.query(models.Card).filter(
        models.Card.id == card_id,
        models.Card.user_id == current.id
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail=CARD_NOT_FOUND_MSG)

    # 2) Load settings for this user
    settings = db.query(models.GlobalSettings).filter(
        models.GlobalSettings.user_id == current.id
    ).first()
    if not settings:
        # You can choose to treat missing settings as default values.
        # Here we error to make it explicit.
        raise HTTPException(status_code=400, detail="Global settings not found for user")

    # 3) Build inputs for valuation
    avg_book = pick_avg_book(card)
    g = float(card.grade) if card.grade is not None else None
    factor = calculate_market_factor(card, settings)

    # 4) Compute via service
    value = calculate_card_value(avg_book, g, factor)

    # 5) Persist and return
    card.value = value
    card.market_factor = factor
    db.add(card)
    db.commit()
    db.refresh(card)
    return card

# Recalculate All Card Values
@router.post("/revalue-all")
def revalue_all_cards(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Recompute and persist values for all cards belonging to the current user."""
    cards = db.query(models.Card).filter(models.Card.user_id == current.id).all()
    if not cards:
        return {"updated": 0, "message": "No cards found for user."}

    settings = db.query(models.GlobalSettings).filter(
        models.GlobalSettings.user_id == current.id
    ).first()
    if not settings:
        raise HTTPException(status_code=400, detail="Global settings not found for user")

    updated = 0
    for card in cards:
        avg_book = pick_avg_book(card)
        g = float(card.grade) if card.grade else None
        factor = calculate_market_factor(card, settings)
        value = calculate_card_value(avg_book, g, factor)

        card.value = value
        card.market_factor = factor
        updated += 1

    db.commit()
    
    total_value = db.query(func.coalesce(func.sum(models.Card.value), 0)).filter(models.Card.user_id == current.id).scalar()
    card_count = db.query(func.count(models.Card.id)).filter(models.Card.user_id == current.id).scalar()

    snapshot = ValuationHistory(
        user_id=current.id,
        timestamp=datetime.now(timezone.utc),
        total_value=float(total_value or 0),
        card_count=card_count,
    )
    
    db.add(snapshot)
    db.commit()
    return {"updated": updated, "message": f"✅ Revalued {updated} cards."}
