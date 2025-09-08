from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(
    # Leave prefix out here if you include router with prefix in main.py.
    # If you prefer to include the prefix inside this file, change paths below to "/cards" and omit prefix in main.py.
    # We'll assume main.py does: app.include_router(cards.router, prefix="/cards", tags=["Cards"])
    tags=["Cards"],
)


@router.get("/", response_model=List[schemas.Card])
def list_cards(db: Session = Depends(get_db)):
    """List all cards"""
    return db.query(models.Card).all()


@router.post("/", response_model=schemas.Card, status_code=status.HTTP_201_CREATED)
def create_card(card: schemas.CardCreate, db: Session = Depends(get_db)):
    """Create a new card"""
    # Support Pydantic v2 (.model_dump) and v1 (.dict)
    card_data = card.model_dump() if hasattr(card, "model_dump") else card.dict()
    db_card = models.Card(**card_data)
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card


@router.put("/{card_id}", response_model=schemas.Card)
def update_card(card_id: int, updated_card: schemas.CardCreate, db: Session = Depends(get_db)):
    """Update an existing card"""
    db_card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not db_card:
        raise HTTPException(status_code=404, detail="Card not found")

    updated_data = (
        updated_card.model_dump()
        if hasattr(updated_card, "model_dump")
        else updated_card.dict()
    )

    for key, value in updated_data.items():
        setattr(db_card, key, value)

    db.commit()
    db.refresh(db_card)
    return db_card


@router.delete("/{card_id}", status_code=status.HTTP_200_OK)
def delete_card(card_id: int, db: Session = Depends(get_db)):
    """Delete a card"""
    db_card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not db_card:
        raise HTTPException(status_code=404, detail="Card not found")

    db.delete(db_card)
    db.commit()
    return {"detail": "Card deleted"}
