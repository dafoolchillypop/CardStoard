from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from app.auth.security import get_current_user

router = APIRouter(prefix="/settings", tags=["settings"])

# -------------------------
# Get settings
# -------------------------
@router.get("/", response_model=schemas.GlobalSettings)
def get_settings(
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    settings = db.query(models.GlobalSettings).filter(
        models.GlobalSettings.user_id == current.id
    ).first()

    if not settings:
        settings = models.GlobalSettings(user_id=current.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


# -------------------------
# Update settings
# -------------------------
@router.put("/", response_model=schemas.GlobalSettings)
def update_settings(
    updated: schemas.GlobalSettingsUpdate,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    settings = db.query(models.GlobalSettings).filter(
        models.GlobalSettings.user_id == current.id
    ).first()

    if not settings:
        settings = models.GlobalSettings(user_id=current.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    for field, value in updated.dict(exclude_unset=True).items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)
    return settings
