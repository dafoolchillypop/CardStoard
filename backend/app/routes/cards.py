# Standard library
import csv
import io
import shutil, os

# Third-party
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

# Local
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/cards", tags=["cards"])

# Photo upload location
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "cards")
os.makedirs(UPLOAD_DIR, exist_ok=True)   # ✅ ensure dir exists


# Card Photos

@router.post("/{card_id}/upload-front")
def upload_front(card_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    filename = f"card_{card_id}_front_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    card.front_image = f"/static/cards/{filename}"
    db.commit()
    db.refresh(card)
    return {"message": "Front image uploaded", "front_image": card.front_image}

@router.post("/{card_id}/upload-back")
def upload_back(card_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
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
async def import_cards(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Basic validation
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")

    # Read file (async) and decode
    content = (await file.read()).decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))

    # Expected headers (exactly as you specified)
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
                # ✅ book_* fields (renamed from value_*)
                book_high=to_float(row["BookHi"]),
                book_high_mid=to_float(row["BookHiMid"]),
                book_mid=to_float(row["BookMid"]),
                book_low_mid=to_float(row["BookLowMid"]),
                book_low=to_float(row["BookLow"]),
                grade=to_float(row["Grade"]),
            )
            new_cards.append(card)
        except Exception as e:
            # Fail fast with row context
            raise HTTPException(status_code=400, detail=f"Row {rownum} invalid: {e}")

    if not new_cards:
        return {"imported": 0}

    db.add_all(new_cards)
    db.commit()
    return {"imported": len(new_cards)}

# Create a card
@router.post("/", response_model=schemas.Card)
def create_card(card: schemas.CardCreate, db: Session = Depends(get_db)):
    db_card = models.Card(**card.dict())
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card

# List all cards
@router.get("/", response_model=list[schemas.Card])
def read_cards(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    cards = db.query(models.Card).offset(skip).limit(limit).all()
    return cards

# Count cards
@router.get("/count")
def count_cards(db: Session = Depends(get_db)):
    total = db.query(models.Card).count()
    return {"count": total}

# Read one card
@router.get("/{card_id}", response_model=schemas.Card)
def read_card(card_id: int, db: Session = Depends(get_db)):
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card

# Update a card
@router.put("/{card_id}", response_model=schemas.Card)
def update_card(card_id: int, updated: schemas.CardUpdate, db: Session = Depends(get_db)):
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    for field, value in updated.dict(exclude_unset=True).items():
        setattr(card, field, value)

    db.commit()
    db.refresh(card)
    return card

# Delete a card
@router.delete("/{card_id}")
def delete_card(card_id: int, db: Session = Depends(get_db)):
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    db.delete(card)
    db.commit()
    return {"ok": True, "message": "Card deleted"}

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

