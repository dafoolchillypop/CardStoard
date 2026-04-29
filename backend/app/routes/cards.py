"""
backend/app/routes/cards.py
----------------------------
Card inventory CRUD and related operations — all mounted under /cards.

Key endpoints:
  POST /cards/                     Create card, auto-calculate value, auto-seed DictionaryEntry
  GET  /cards/                     List all cards for current user (paginated)
  GET  /cards/count                Total card count
  GET  /cards/players              Distinct player names (dictionary + user's cards)
  GET  /cards/smart-fill           Lookup card_number + rookie flag from DictionaryEntry
  GET  /cards/{id}                 Single card with computed market_factor
  PUT  /cards/{id}                 Partial update + recalculate value, track value change
  DELETE /cards/{id}               Delete card and associated disk images
  POST /cards/{id}/upload-front    Upload front image to /static/cards/
  POST /cards/{id}/upload-back     Upload back image to /static/cards/
  POST /cards/{id}/value           Compute and persist value for a single card
  POST /cards/{id}/refresh-book-values  Touch book freshness timestamp
  GET  /cards/{id}/public          Public label data + QR code (no auth required)
  GET  /cards/{id}/duplicate-count Count similar cards for the same player/brand/year
  POST /cards/labels/batch         Batch label data for selected card IDs
  GET  /cards/labels/all           Label data for all user's cards
  POST /cards/import-csv           Bulk import from CSV file
  POST /cards/validate-csv         Validate CSV structure without importing
  GET  /cards/export               Export cards as CSV / TSV / JSON
  GET  /cards/backup               Full user backup (cards + settings) as JSON
  POST /cards/restore              Restore from backup JSON (replaces all cards)
  POST /cards/revalue-all          Recompute all values, snapshot ValuationHistory
  POST /cards/refresh-all-book-values  Touch book freshness for all cards with values
  POST /cards/clear-book-freshness     Nullify book freshness timestamp for all cards
  PATCH /cards/propagate-book-values   Spread book values to all duplicate cards
  PATCH /cards/propagate-attributes    Spread card_attributes to all duplicate cards
"""
# Standard library
import io, os, csv, re, shutil, json, base64, qrcode
from pydantic import BaseModel
from pathlib import Path as FSPath
from typing import Optional
from datetime import datetime, timezone

# Third-party
import anthropic as _anthropic
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Path, Query
from fastapi.responses import JSONResponse, StreamingResponse
from PIL import Image as PILImage
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

# ---------------------------------------------------------------------------
# Brand/year plausibility guard
# Only applies to the six known major brands. Unknown/custom brands pass
# through so user-added brands are never blocked.
# ---------------------------------------------------------------------------
def _brand_year_valid(brand: str, year: int) -> bool:
    b = brand.lower().strip()
    if b == "topps":      return year >= 1951
    if b == "bowman":     return 1948 <= year <= 1955 or year >= 1989
    if b == "fleer":      return 1959 <= year <= 1963 or year >= 1981
    if b == "donruss":    return year >= 1981
    if b == "score":      return year >= 1988
    if b == "upper deck": return year >= 1989
    return True  # unknown brand — allow

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

    upload_dir = FSPath(UPLOAD_DIR).resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)
    filepath = (FSPath(upload_dir) / filename).resolve()

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

    upload_dir = FSPath(UPLOAD_DIR).resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)
    filepath = (FSPath(upload_dir) / filename).resolve()

    if not str(filepath).startswith(str(upload_dir)):
        raise HTTPException(status_code=400, detail="Invalid file path")

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    card.back_image = f"/static/cards/{filename}"
    db.commit()
    db.refresh(card)

    return {"message": "Back image uploaded", "back_image": card.back_image}

# --- CSV import helpers (module-level to reduce cognitive complexity) ---
def _to_int(v):
    v = (v or "").strip()
    return int(v) if v != "" else None

def _to_float(v):
    v = (v or "").strip()
    return float(v) if v != "" else None

def _to_rookie(v):
    v = (v or "").strip().lower()
    return 1 if v in {"1", "yes", "true", "y", "t", "*"} else 0

_IMPORT_GRADE_MAP = {0.6: 0.8, 1.0: 1.0}  # normalize legacy grade values

def _build_card_from_row(row, rownum, user_id):
    """Parse one CSV row into a Card model. Raises ValueError on invalid data."""
    grade = _to_float(row["Grade"]) or 1.0
    grade = _IMPORT_GRADE_MAP.get(grade, grade)
    if grade not in VALID_GRADES:
        raise ValueError(
            f"Row {rownum} ({row['First']} {row['Last']}): invalid grade '{row['Grade']}'"
            f" — must be one of {sorted(VALID_GRADES)}"
        )
    bh  = _to_float(row["BookHi"])
    bhm = _to_float(row["BookHiMid"])
    bm  = _to_float(row["BookMid"])
    blm = _to_float(row["BookLowMid"])
    bl  = _to_float(row["BookLow"])
    book_ts = datetime.now(timezone.utc) if any([bh, bhm, bm, blm, bl]) else None
    return models.Card(
        first_name=(row["First"] or "").strip(),
        last_name=(row["Last"] or "").strip(),
        year=_to_int(row["Year"]) or 0,
        brand=(row["Brand"] or "").strip(),
        rookie=_to_rookie(row["Rookie"]),
        card_number=(row["Card Number"] or "").strip(),
        book_high=bh,
        book_high_mid=bhm,
        book_mid=bm,
        book_low_mid=blm,
        book_low=bl,
        grade=grade,
        user_id=user_id,
        book_values_updated_at=book_ts,
    )

# Import cards
@router.post("/import-csv")
async def import_cards(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")

    content = (await file.read()).decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))

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

    new_cards = []
    for rownum, row in enumerate(reader, start=1):
        try:
            new_cards.append(_build_card_from_row(row, rownum, current.id))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Row {rownum} invalid: {e}")

    if not new_cards:
        return {"imported": 0}

    db.add_all(new_cards)
    db.commit()

    settings = db.query(models.GlobalSettings).filter(
        models.GlobalSettings.user_id == current.id
    ).first()

    if settings:
        for card in new_cards:
            avg_book = pick_avg_book(card)
            g = float(card.grade) if card.grade else None
            factor = calculate_market_factor(card, settings)
            card.value = calculate_card_value(avg_book, g, factor)
            card.market_factor = factor

        db.commit()

        imported_brands = {c.brand for c in new_cards if c.brand}
        existing_brands = set(settings.card_makes or [])
        if imported_brands - existing_brands:
            settings.card_makes = sorted(existing_brands | imported_brands)
            db.commit()

    return {
        "imported": len(new_cards),
        "message": f"Successfully imported {len(new_cards)} cards."
    }

# Validate CSV without importing
@router.post("/validate-csv")
async def validate_csv(
    file: UploadFile = File(...),
    current: User = Depends(get_current_user),
):
    errors = []
    warnings = []

    if not file.filename.lower().endswith(".csv"):
        return {"valid": False, "row_count": 0, "errors": ["File must be a .csv"], "warnings": []}

    content = (await file.read()).decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))

    expected = {
        "First", "Last", "Year", "Brand", "Rookie", "Card Number",
        "BookHi", "BookHiMid", "BookMid", "BookLowMid", "BookLow", "Grade",
    }
    if not reader.fieldnames or not expected.issubset(set(reader.fieldnames)):
        missing = expected.difference(set(reader.fieldnames or []))
        return {
            "valid": False,
            "row_count": 0,
            "errors": [f"Missing required columns: {', '.join(sorted(missing))}"],
            "warnings": [],
        }

    def to_float(v):
        v = (v or "").strip()
        return float(v) if v != "" else None

    GRADE_MAP = {0.6: 0.8, 1.0: 1.0}

    rownum = 0
    for row in reader:
        rownum += 1
        name = f"{(row.get('First') or '').strip()} {(row.get('Last') or '').strip()}".strip() or f"Row {rownum}"

        # Grade validation
        try:
            grade = to_float(row["Grade"]) or 1.0
            grade = GRADE_MAP.get(grade, grade)
            if grade not in VALID_GRADES:
                errors.append(f"Row {rownum} ({name}): invalid grade '{row['Grade']}' — must be one of {sorted(VALID_GRADES)}")
        except Exception:
            errors.append(f"Row {rownum} ({name}): could not parse grade '{row.get('Grade')}'")

        # Warnings for blank key fields
        for field in ("First", "Last", "Year", "Brand"):
            if not (row.get(field) or "").strip():
                warnings.append(f"Row {rownum}: blank {field} field")

    return {
        "valid": len(errors) == 0,
        "row_count": rownum,
        "errors": errors,
        "warnings": warnings,
    }

# Create a card
@router.post("/", response_model=schemas.Card)
def create_card(
    card: schemas.CardCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """
    Create a new card for the current user.
    - Strips market_factor and value from input (both are computed server-side).
    - Calculates value using GlobalSettings factors after insert.
    - Auto-seeds DictionaryEntry if the card has all required fields and no entry exists.
    """
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

        # Auto-populate dictionary if card has all required fields and the
        # brand/year combination is historically plausible.
        if (db_card.card_number and db_card.first_name and db_card.last_name
                and db_card.brand and db_card.year
                and _brand_year_valid(db_card.brand, db_card.year)):
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
                    rookie_year=db_card.year if db_card.rookie else None,
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
    """Return paginated list of cards for the current user with market_factor attached."""
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
    card_number: Optional[str] = None,
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
        if card_number:
            q = q.filter(func.lower(DictionaryEntry.card_number) == card_number.strip().lower())

        entry = q.first()
        if not entry:
            return {"status": "not_found", "fields": {}}

        fields = {}

        # Only suggest card_number and rookie when the user hasn't entered a card number yet
        if not card_number:
            fields["card_number"] = entry.card_number
            if year is not None:
                fields["rookie"] = (year == entry.rookie_year)

        # Include book values only when card_number is pinned to an exact entry
        if card_number:
            for bv_field in ("book_high", "book_high_mid", "book_mid", "book_low_mid", "book_low"):
                val = getattr(entry, bv_field, None)
                if val is not None:
                    fields[bv_field] = val

        return {"status": "ok", "fields": fields}

    except Exception as e:
        return {"detail": f"Unexpected error in smart-fill: {repr(e)}"}

# ---- AI prompts (module-level constants to keep endpoint code concise) ----
_IDENTIFY_PROMPT = """\
You are reading a sports trading card. Extract exactly what is printed on the card.

Return ONLY this JSON (no other text):
{
  "first_name": "<player first name as printed, or null>",
  "last_name": "<player last name as printed, or null>",
  "year": <4-digit year from copyright line or set name, or null>,
  "brand": "<manufacturer: Topps/Bowman/Fleer/Donruss/Upper Deck/Score/Panini/Leaf/Goudey, or null>",
  "card_number": "<number as printed (digits only, no #), or null>",
  "confidence": <0.0-1.0, your confidence in the extraction>
}"""

_GRADE_EXTENSION = """\


Also assess the card's physical condition. Add these fields to your JSON response:
  "grade": <one of: 3.0=Mint, 1.5=Excellent, 1.0=VeryGood, 0.8=Good, 0.4=Fair, 0.2=Poor>,
  "grade_label": "<MT|EX|VG|GD|FR|PR>",
  "condition_notes": "<1-2 sentence description of visible condition issues>"

Return ONLY the complete JSON object with all fields including the ones above."""

_VALID_MEDIA_TYPES = {"image/jpeg", "image/png", "image/jpg"}
_MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5MB
_MAX_IMAGE_DIM = 2100


def _resize_image(content: bytes, media_type: str) -> tuple[bytes, str]:
    """Resize image to max 2100px on longest side. Returns (bytes, media_type)."""
    img = PILImage.open(io.BytesIO(content))
    # Convert RGBA or palette to RGB for JPEG compatibility
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
        media_type = "image/jpeg"
    if max(img.width, img.height) > _MAX_IMAGE_DIM:
        ratio = _MAX_IMAGE_DIM / max(img.width, img.height)
        new_size = (int(img.width * ratio), int(img.height * ratio))
        img = img.resize(new_size, PILImage.LANCZOS)
    fmt = "PNG" if media_type == "image/png" else "JPEG"
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue(), media_type


# AI card identification
@router.post("/identify-image")
async def identify_image(
    file: UploadFile = File(...),
    include_grade: bool = Query(False),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """
    Identify a card from a photo using Claude Vision.
    Returns extracted fields, confidence, optional grade estimate,
    dictionary match, and collection match.
    Requires enable_image_ai = True in GlobalSettings.
    """
    settings = db.query(models.GlobalSettings).filter(
        models.GlobalSettings.user_id == current.id
    ).first()
    if not settings or not settings.enable_image_ai:
        raise HTTPException(status_code=403, detail="Image AI is not enabled")

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")

    # Validate file type
    ct = (file.content_type or "").lower()
    fname = (file.filename or "").lower()
    if ct not in _VALID_MEDIA_TYPES and not (fname.endswith((".jpg", ".jpeg", ".png"))):
        raise HTTPException(status_code=400, detail="Only JPEG and PNG images are supported")
    media_type = "image/png" if (ct == "image/png" or fname.endswith(".png")) else "image/jpeg"

    content = await file.read()
    if len(content) > _MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image exceeds 5MB limit")

    # Resize and base64-encode
    try:
        img_bytes, media_type = _resize_image(content, media_type)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not process image: {exc}")
    img_b64 = base64.b64encode(img_bytes).decode()

    # Call Claude Vision
    prompt_text = _IDENTIFY_PROMPT + (_GRADE_EXTENSION if include_grade else "")
    client = _anthropic.Anthropic(api_key=api_key)
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": img_b64}},
                    {"type": "text", "text": prompt_text},
                ],
            }],
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI request failed: {exc}")

    # Parse JSON from response — try several extraction strategies
    raw = response.content[0].text.strip()
    # 1. Strip markdown code fences
    if "```" in raw:
        fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
        if fence_match:
            raw = fence_match.group(1)
    # 2. If still not a JSON object, grab the first {...} block
    if not raw.startswith("{"):
        obj_match = re.search(r"\{.*\}", raw, re.DOTALL)
        raw = obj_match.group(0) if obj_match else raw
    raw = raw.strip()
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned unexpected format")

    fields = {
        "first_name": parsed.get("first_name"),
        "last_name": parsed.get("last_name"),
        "year": parsed.get("year"),
        "brand": parsed.get("brand"),
        "card_number": parsed.get("card_number"),
    }
    confidence = float(parsed.get("confidence") or 0.0)

    grade_estimate = None
    if include_grade and "grade" in parsed:
        grade_estimate = {
            "grade": parsed.get("grade"),
            "grade_label": parsed.get("grade_label"),
            "condition_notes": parsed.get("condition_notes"),
        }

    # Dictionary lookup for book values
    dictionary_match = None
    fn = (fields["first_name"] or "").strip().lower()
    ln = (fields["last_name"] or "").strip().lower()
    if fn and ln:
        q = db.query(DictionaryEntry).filter(
            func.lower(DictionaryEntry.first_name) == fn,
            func.lower(DictionaryEntry.last_name) == ln,
        )
        if fields["brand"]:
            q = q.filter(func.lower(DictionaryEntry.brand) == fields["brand"].lower())
        if fields["year"]:
            q = q.filter(DictionaryEntry.year == fields["year"])
        if fields["card_number"]:
            q = q.filter(func.lower(DictionaryEntry.card_number) == fields["card_number"].lower())
        entry = q.first()
        # If matched entry has no book values, fall back to card_number+year+brand
        # to find a valued entry (handles duplicate entries with different name spellings)
        if entry and not any([entry.book_high, entry.book_mid, entry.book_low]):
            cn = fields.get("card_number") or entry.card_number
            if cn and fields.get("year") and fields.get("brand"):
                valued = db.query(DictionaryEntry).filter(
                    func.lower(DictionaryEntry.card_number) == str(cn).lower(),
                    DictionaryEntry.year == fields["year"],
                    func.lower(DictionaryEntry.brand) == fields["brand"].lower(),
                    DictionaryEntry.book_high.isnot(None),
                ).first()
                if valued:
                    entry = valued
        if entry:
            dictionary_match = {
                "found": True,
                "book_high": entry.book_high,
                "book_high_mid": entry.book_high_mid,
                "book_mid": entry.book_mid,
                "book_low_mid": entry.book_low_mid,
                "book_low": entry.book_low,
                "rookie": (entry.rookie_year is not None and fields.get("year") == entry.rookie_year),
            }
            # Back-fill card_number if Claude didn't extract it
            if not fields["card_number"] and entry.card_number:
                fields["card_number"] = entry.card_number

    # Collection match
    collection_match = {"found": False, "cards": [], "duplicate_count": 0}
    if fn and ln:
        q = db.query(models.Card).filter(
            models.Card.user_id == current.id,
            func.lower(models.Card.first_name) == fn,
            func.lower(models.Card.last_name) == ln,
        )
        if fields["brand"]:
            q = q.filter(func.lower(models.Card.brand) == fields["brand"].lower())
        if fields["year"]:
            q = q.filter(models.Card.year == fields["year"])
        matches = q.limit(10).all()
        if matches:
            collection_match = {
                "found": True,
                "cards": [
                    {"id": c.id, "year": c.year, "brand": c.brand, "card_number": c.card_number, "grade": c.grade, "value": c.value}
                    for c in matches
                ],
                "duplicate_count": len(matches),
            }

    return {
        "fields": fields,
        "confidence": confidence,
        "grade_estimate": grade_estimate,
        "dictionary_match": dictionary_match,
        "collection_match": collection_match,
    }


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


# Public card info + QR code (no auth required)
@router.get("/{card_id}/public")
def get_card_public(card_id: int, db: Session = Depends(get_db)):
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail=CARD_NOT_FOUND_MSG)
    frontend_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
    return _card_label_data(card, frontend_url)


def _card_label_data(card, frontend_url: str) -> dict:
    """Build label dict with QR code for a single card."""
    card_url = f"{frontend_url}/card-view/{card.id}"
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(card_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()

    first = card.first_name or ""
    last = card.last_name or ""
    initials = ((first[0] if first else "?") + (last[0] if last else "?")).upper()

    return {
        "id": card.id,
        "label_id": f"CS-CD-{card.id:06d}",
        "descriptor": f"{initials}.{card.year}.{card.card_number}",
        "grade": card.grade,
        "first_name": first,
        "last_name": last,
        "year": card.year,
        "brand": card.brand,
        "card_number": card.card_number,
        "front_image": card.front_image,
        "qr_b64": qr_b64,
    }


class BatchLabelRequest(BaseModel):
    ids: list[int]


# Batch label data for selected cards (auth required)
@router.post("/labels/batch")
def get_labels_batch(
    payload: BatchLabelRequest,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    frontend_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
    cards = (
        db.query(models.Card)
        .filter(Card.user_id == current.id)
        .filter(models.Card.id.in_(payload.ids))
        .all()
    )
    # Return in requested order
    card_map = {c.id: c for c in cards}
    return [_card_label_data(card_map[i], frontend_url) for i in payload.ids if i in card_map]


# All label data for current user (auth required)
@router.get("/labels/all")
def get_labels_all(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    frontend_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
    cards = db.query(models.Card).filter(Card.user_id == current.id).all()
    return [_card_label_data(c, frontend_url) for c in cards]


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
    """
    Partial update for a card. Applies only fields present in the request body.
    - Resets book_values_updated_at if any book_* field changed.
    - Recalculates value and market_factor from current settings.
    - Tracks value change: if rounded value differs from previous, saves previous_value
      and sets value_changed_at (used by the value change indicator in CardDetail).
    """
    card = db.query(models.Card).filter(Card.user_id == current.id).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail=CARD_NOT_FOUND_MSG)

    # Capture value + book values before any field changes
    old_value = card.value
    BOOK_FIELDS = {"book_high", "book_high_mid", "book_mid", "book_low_mid", "book_low"}
    old_books = {f: getattr(card, f) for f in BOOK_FIELDS}

    for field, value in updated.dict(exclude_unset=True).items():
        setattr(card, field, value)

    # Reset book freshness timer if any book value changed
    new_books = {f: getattr(card, f) for f in BOOK_FIELDS}
    if new_books != old_books:
        card.book_values_updated_at = datetime.now(timezone.utc)

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

        # Track value change — only when value actually moves
        if (old_value is not None and value is not None
                and round(value, 2) != round(old_value, 2)):
            card.previous_value = old_value
            card.value_changed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(card)
    return card


# Count duplicate cards (same player / brand / year / card_number, different id)
@router.get("/{card_id}/duplicate-count")
def get_duplicate_count(
    card_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    card = db.query(models.Card).filter(
        models.Card.id == card_id,
        models.Card.user_id == current.id,
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail=CARD_NOT_FOUND_MSG)

    count = db.query(models.Card).filter(
        models.Card.user_id == current.id,
        models.Card.id != card_id,
        func.lower(models.Card.first_name) == (card.first_name or "").lower(),
        func.lower(models.Card.last_name) == (card.last_name or "").lower(),
        func.lower(models.Card.brand) == (card.brand or "").lower(),
        models.Card.year == card.year,
        models.Card.card_number == card.card_number,
    ).count()

    return {"duplicate_count": count}

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

# Propagate book values to all duplicate cards (same player/brand/year/card_number)
@router.patch("/propagate-book-values")
def propagate_book_values(
    first_name: str,
    last_name: str,
    brand: str,
    year: int,
    card_number: str,
    book_high: Optional[float] = None,
    book_high_mid: Optional[float] = None,
    book_mid: Optional[float] = None,
    book_low_mid: Optional[float] = None,
    book_low: Optional[float] = None,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    cards = db.query(models.Card).filter(
        models.Card.user_id == current.id,
        func.lower(models.Card.first_name) == first_name.lower().strip(),
        func.lower(models.Card.last_name) == last_name.lower().strip(),
        func.lower(models.Card.brand) == brand.lower().strip(),
        models.Card.year == year,
        models.Card.card_number == card_number,
    ).all()

    settings = db.query(models.GlobalSettings).filter(
        models.GlobalSettings.user_id == current.id
    ).first()

    now = datetime.now(timezone.utc)
    for card in cards:
        card.book_high = book_high
        card.book_high_mid = book_high_mid
        card.book_mid = book_mid
        card.book_low_mid = book_low_mid
        card.book_low = book_low
        card.book_values_updated_at = now
        if settings:
            avg_book = pick_avg_book(card)
            factor = calculate_market_factor(card, settings)
            card.market_factor = factor
            card.value = calculate_card_value(avg_book, float(card.grade) if card.grade else None, factor)

    db.commit()
    for card in cards:
        db.refresh(card)
    return {"updated": len(cards), "cards": [schemas.Card.model_validate(c) for c in cards]}


# Propagate card_attributes to all duplicate cards (same player/brand/year/card_number)
@router.patch("/propagate-attributes")
def propagate_attributes(
    first_name: str,
    last_name: str,
    brand: str,
    year: int,
    card_number: str,
    attributes: str,  # JSON-encoded dict passed as query param
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    import json as _json
    try:
        attrs = _json.loads(attributes)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid attributes JSON")

    cards = db.query(models.Card).filter(
        models.Card.user_id == current.id,
        func.lower(models.Card.first_name) == first_name.lower().strip(),
        func.lower(models.Card.last_name) == last_name.lower().strip(),
        func.lower(models.Card.brand) == brand.lower().strip(),
        models.Card.year == year,
        models.Card.card_number == card_number,
    ).all()

    for card in cards:
        card.card_attributes = attrs

    db.commit()
    for card in cards:
        db.refresh(card)
    return {"updated": len(cards), "cards": [schemas.Card.model_validate(c) for c in cards]}


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


# Confirm book values are current (touch freshness timestamp without changing values)
@router.post("/{card_id}/refresh-book-values", response_model=schemas.Card)
def refresh_book_values(
    card_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    card = db.query(Card).filter(Card.id == card_id, Card.user_id == current.id).first()
    if not card:
        raise HTTPException(status_code=404, detail=CARD_NOT_FOUND_MSG)
    card.book_values_updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(card)
    settings = db.query(models.GlobalSettings).filter(
        models.GlobalSettings.user_id == current.id
    ).first()
    card.market_factor = calculate_market_factor(card, settings) if settings else None
    return card


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

# Reset book freshness timers for all cards that have book values
@router.post("/refresh-all-book-values")
def refresh_all_book_values(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Touch book_values_updated_at to now for every card with at least one book value set."""
    from sqlalchemy import or_
    updated = (
        db.query(models.Card)
        .filter(
            models.Card.user_id == current.id,
            or_(
                models.Card.book_high.isnot(None),
                models.Card.book_mid.isnot(None),
                models.Card.book_low.isnot(None),
            )
        )
        .update({"book_values_updated_at": datetime.now(timezone.utc)}, synchronize_session=False)
    )
    db.commit()
    return {"updated": updated, "message": f"Reset freshness timer for {updated} cards."}


# Nullify book freshness timers for all cards (mark all as never reviewed)
@router.post("/clear-book-freshness")
def clear_book_freshness(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Set book_values_updated_at to NULL for every card owned by the user."""
    updated = (
        db.query(models.Card)
        .filter(models.Card.user_id == current.id)
        .update({"book_values_updated_at": None}, synchronize_session=False)
    )
    db.commit()
    return {"updated": updated, "message": f"Cleared freshness timer for {updated} cards."}


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
