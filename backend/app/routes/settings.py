from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/settings",
    tags=["settings"],
)

# Get settings (we assume just one row)
@router.get("/", response_model=schemas.GlobalSettings)
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(models.GlobalSettings).first()
    if not settings:
        settings = models.GlobalSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

# Update settings
@router.put("/", response_model=schemas.GlobalSettings)
def update_settings(updated: schemas.GlobalSettingsUpdate, db: Session = Depends(get_db)):
    settings = db.query(models.GlobalSettings).first()
    if not settings:
        settings = models.GlobalSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)

    for field, value in updated.dict(exclude_unset=True).items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)
    return settings
