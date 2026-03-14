from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.auth.security import get_current_user
from app.models import User

router = APIRouter(prefix="/boxes", tags=["boxes"])


# ---------------------------------------------------------------------------
# GET /boxes/  — list user's boxes/binders
# ---------------------------------------------------------------------------
@router.get("/", response_model=list[schemas.BoxBinderOut])
def list_boxes(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    return (
        db.query(models.BoxBinder)
        .filter(models.BoxBinder.user_id == current.id)
        .order_by(models.BoxBinder.year.desc(), models.BoxBinder.brand)
        .all()
    )


# ---------------------------------------------------------------------------
# POST /boxes/  — create
# ---------------------------------------------------------------------------
@router.post("/", response_model=schemas.BoxBinderOut, status_code=201)
def create_box(
    body: schemas.BoxBinderCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if body.set_type not in schemas.BOX_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"set_type must be one of {sorted(schemas.BOX_TYPES)}",
        )
    box = models.BoxBinder(user_id=current.id, **body.dict())
    db.add(box)
    db.commit()
    db.refresh(box)
    return box


# ---------------------------------------------------------------------------
# PATCH /boxes/{box_id}  — partial update
# ---------------------------------------------------------------------------
@router.patch("/{box_id}", response_model=schemas.BoxBinderOut)
def update_box(
    box_id: int,
    body: schemas.BoxBinderUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    box = (
        db.query(models.BoxBinder)
        .filter(models.BoxBinder.id == box_id, models.BoxBinder.user_id == current.id)
        .first()
    )
    if not box:
        raise HTTPException(status_code=404, detail="Not found")

    updates = body.dict(exclude_unset=True)
    if "set_type" in updates and updates["set_type"] not in schemas.BOX_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"set_type must be one of {sorted(schemas.BOX_TYPES)}",
        )
    for k, v in updates.items():
        setattr(box, k, v)
    box.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(box)
    return box


# ---------------------------------------------------------------------------
# DELETE /boxes/{box_id}
# ---------------------------------------------------------------------------
@router.delete("/{box_id}", status_code=204)
def delete_box(
    box_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    box = (
        db.query(models.BoxBinder)
        .filter(models.BoxBinder.id == box_id, models.BoxBinder.user_id == current.id)
        .first()
    )
    if not box:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(box)
    db.commit()
