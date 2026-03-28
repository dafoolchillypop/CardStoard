import io, base64, os
from datetime import datetime, timezone

import qrcode
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.auth.security import get_current_user
from app.models import User

router = APIRouter(prefix="/wax", tags=["wax"])


# ---------------------------------------------------------------------------
# GET /wax/{wax_id}/public  — label data + QR (no auth required)
# ---------------------------------------------------------------------------
@router.get("/{wax_id}/public")
def get_wax_public(wax_id: int, db: Session = Depends(get_db)):
    record = db.query(models.WaxBox).filter(models.WaxBox.id == wax_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Wax box not found")

    frontend_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
    view_url = f"{frontend_url}/wax-view/{record.id}"

    qr_obj = qrcode.QRCode(version=1, box_size=10, border=2)
    qr_obj.add_data(view_url)
    qr_obj.make(fit=True)
    img = qr_obj.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()

    descriptor = f"{record.year} {record.brand}"
    if record.set_name:
        descriptor += f" {record.set_name}"

    return {
        "id":         record.id,
        "label_id":   f"CS-WX-{record.id:06d}",
        "descriptor": descriptor,
        "year":       record.year,
        "brand":      record.brand,
        "set_name":   record.set_name or "",
        "quantity":   record.quantity,
        "notes":      record.notes or "",
        "created_at": record.created_at.strftime("%m/%d/%Y") if record.created_at else "",
        "qr_b64":     qr_b64,
    }


# ---------------------------------------------------------------------------
# GET /wax/  — list user's wax boxes
# ---------------------------------------------------------------------------
@router.get("/", response_model=list[schemas.WaxBoxOut])
def list_wax(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    return (
        db.query(models.WaxBox)
        .filter(models.WaxBox.user_id == current.id)
        .order_by(models.WaxBox.year.desc(), models.WaxBox.brand)
        .all()
    )


# ---------------------------------------------------------------------------
# POST /wax/  — create
# ---------------------------------------------------------------------------
@router.post("/", response_model=schemas.WaxBoxOut, status_code=201)
def create_wax(
    body: schemas.WaxBoxCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    box = models.WaxBox(user_id=current.id, **body.dict())
    if box.value is not None:
        box.value_updated_at = datetime.now(timezone.utc)
    db.add(box)
    db.commit()
    db.refresh(box)
    return box


# ---------------------------------------------------------------------------
# GET /wax/{wax_id}  — fetch single record (authenticated)
# ---------------------------------------------------------------------------
@router.get("/{wax_id}", response_model=schemas.WaxBoxOut)
def get_wax(
    wax_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    box = (
        db.query(models.WaxBox)
        .filter(models.WaxBox.id == wax_id, models.WaxBox.user_id == current.id)
        .first()
    )
    if not box:
        raise HTTPException(status_code=404, detail="Not found")
    return box


# ---------------------------------------------------------------------------
# PATCH /wax/{wax_id}  — partial update
# ---------------------------------------------------------------------------
@router.patch("/{wax_id}", response_model=schemas.WaxBoxOut)
def update_wax(
    wax_id: int,
    body: schemas.WaxBoxUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    box = (
        db.query(models.WaxBox)
        .filter(models.WaxBox.id == wax_id, models.WaxBox.user_id == current.id)
        .first()
    )
    if not box:
        raise HTTPException(status_code=404, detail="Not found")

    updates = body.dict(exclude_unset=True)
    old_value = box.value
    for k, v in updates.items():
        setattr(box, k, v)
    if "value" in updates and updates["value"] != old_value:
        box.value_updated_at = datetime.now(timezone.utc)
    box.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(box)
    return box


# ---------------------------------------------------------------------------
# POST /wax/{wax_id}/refresh-value  — stamp value_updated_at = now()
# ---------------------------------------------------------------------------
@router.post("/{wax_id}/refresh-value", response_model=schemas.WaxBoxOut)
def refresh_wax_value(
    wax_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    box = (
        db.query(models.WaxBox)
        .filter(models.WaxBox.id == wax_id, models.WaxBox.user_id == current.id)
        .first()
    )
    if not box:
        raise HTTPException(status_code=404, detail="Not found")
    box.value_updated_at = datetime.now(timezone.utc)
    box.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(box)
    return box


# ---------------------------------------------------------------------------
# DELETE /wax/{wax_id}
# ---------------------------------------------------------------------------
@router.delete("/{wax_id}", status_code=204)
def delete_wax(
    wax_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    box = (
        db.query(models.WaxBox)
        .filter(models.WaxBox.id == wax_id, models.WaxBox.user_id == current.id)
        .first()
    )
    if not box:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(box)
    db.commit()
