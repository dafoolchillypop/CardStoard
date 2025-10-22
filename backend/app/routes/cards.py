# Standard library
import io, os, csv, shutil, json
from pathlib import Path
from typing import Optional

# Third-party
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

# Local
from app import models, schemas
from app.database import get_db

# Auth imports
from app.auth.security import get_current_user
from app.models import Card, User

# OCR / Card Identification
#from app.services.image_pipeline import run_crop_pipeline, CardCropError, run_ocr, structured_ocr
#from app.services.quickadd_parser import parse_card_back
#from app.services.fuzzy_match import fuzzy_match_name, fuzzy_match_brand

router = APIRouter(prefix="/cards", tags=["cards"])

# Photo upload location
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "cards")
os.makedirs(UPLOAD_DIR, exist_ok=True)   # ✅ ensure dir exists

# Dictionary JSON
DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "players.json"

with open(DATA_PATH, "r") as f:
    PLAYER_DICTIONARY = json.load(f)

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
        raise HTTPException(status_code=404, detail="Card not found")

    # Build filename + filesystem path
    filename = f"card_{card_id}_front_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    # Save file
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Always store relative path
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
        raise HTTPException(status_code=404, detail="Card not found")

    filename = f"card_{card_id}_back_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)

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

    new_cards = []
    rownum = 0
    for row in reader:
        rownum += 1
        try:
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
                grade=to_float(row["Grade"]),
                user_id=current.id,   # ✅ tie to logged-in user
            )
            new_cards.append(card)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Row {rownum} invalid: {e}")

    if not new_cards:
        return {"imported": 0}

    db.add_all(new_cards)
    db.commit()
    return {
    "imported": len(new_cards),
    "message": f"Successfully imported {len(new_cards)} cards."
    }

# Create a card
@router.post("/", response_model=schemas.Card)
def create_card(card: schemas.CardCreate, db: Session = Depends(get_db), current: User = Depends(get_current_user),):
    db_card = models.Card(**card.dict(), user_id=current.id)
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card

# List all cards
@router.get("/", response_model=list[schemas.Card])
def read_cards(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current: User = Depends(get_current_user),):
    cards = db.query(models.Card).filter(Card.user_id == current.id).offset(skip).limit(limit).all()
    return cards

# Count cards
@router.get("/count")
def count_cards(db: Session = Depends(get_db), current: User = Depends(get_current_user),):
    total = db.query(models.Card).filter(Card.user_id == current.id).count()
    return {"count": total}

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
        # ✅ Check global settings for this user
        settings = db.query(models.GlobalSettings).filter(
            models.GlobalSettings.user_id == current.id
        ).first()

        if not settings or not settings.enable_smart_fill:
            return {"status": "disabled", "fields": {}}

        # ✅ Normalize the name for lookup
        full_name = f"{first_name.strip()} {last_name.strip()}".lower()
        data = PLAYER_DICTIONARY.get(full_name)

        if not data:
            return {"status": "not_found", "fields": {}}

        fields = {}
        if year is not None:
            fields["rookie"] = (year == data["rookie_year"])
        if brand and brand in data["cards"]:
            fields["card_number"] = data["cards"][brand]

        return {"status": "ok", "fields": fields, "dictionary": data}

    except Exception as e:
        return {"detail": f"Unexpected error in smart-fill: {repr(e)}"}
    
# Read one card
@router.get("/{card_id}", response_model=schemas.Card)
def read_card(card_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user),):
    card = db.query(models.Card).filter(Card.user_id == current.id).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card

# Update a card
@router.put("/{card_id}", response_model=schemas.Card)
def update_card(card_id: int, updated: schemas.CardUpdate, db: Session = Depends(get_db), current: User = Depends(get_current_user),):
    card = db.query(models.Card).filter(Card.user_id == current.id).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    for field, value in updated.dict(exclude_unset=True).items():
        setattr(card, field, value)

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
        raise HTTPException(status_code=404, detail="Card not found")

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

# Calculate Market Factor
def calculate_market_factor(card, settings):
    # grade and rookie come from card
    g = float(card.grade) if card.grade else None
    rookie = bool(card.rookie)

    if g == 3 and rookie:
        return settings.auto_factor
    elif g == 3:
        return settings.mtgrade_factor
    elif rookie:
        return settings.rookie_factor
    elif g == 1.5:
        return settings.exgrade_factor
    elif g == 1:
        return settings.vggrade_factor
    elif g == 0.8:
        return settings.gdgrade_factor
    elif g == 0.4:
        return settings.frgrade_factor
    elif g == 0.2:
        return settings.prgrade_factor
    else:
        return None

