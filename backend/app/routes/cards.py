from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/cards",
    tags=["cards"],
)

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
