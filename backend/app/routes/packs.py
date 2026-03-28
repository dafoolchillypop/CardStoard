import io, base64, os
from datetime import datetime, timezone

import qrcode
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.auth.security import get_current_user
from app.models import User

router = APIRouter(prefix="/packs", tags=["packs"])


# ---------------------------------------------------------------------------
# GET /packs/{pack_id}/public  — label data + QR (no auth required)
# ---------------------------------------------------------------------------
@router.get("/{pack_id}/public")
def get_pack_public(pack_id: int, db: Session = Depends(get_db)):
    record = db.query(models.WaxPack).filter(models.WaxPack.id == pack_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Pack not found")

    frontend_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
    view_url = f"{frontend_url}/pack-view/{record.id}"

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
        "label_id":   f"CS-PK-{record.id:06d}",
        "descriptor": descriptor,
        "year":       record.year,
        "brand":      record.brand,
        "set_name":   record.set_name or "",
        "pack_type":  record.pack_type or "",
        "quantity":   record.quantity,
        "notes":      record.notes or "",
        "created_at": record.created_at.strftime("%m/%d/%Y") if record.created_at else "",
        "qr_b64":     qr_b64,
    }


# ---------------------------------------------------------------------------
# GET /packs/  — list user's packs
# ---------------------------------------------------------------------------
@router.get("/", response_model=list[schemas.WaxPackOut])
def list_packs(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    return (
        db.query(models.WaxPack)
        .filter(models.WaxPack.user_id == current.id)
        .order_by(models.WaxPack.year.desc(), models.WaxPack.brand)
        .all()
    )


# ---------------------------------------------------------------------------
# POST /packs/  — create
# ---------------------------------------------------------------------------
@router.post("/", response_model=schemas.WaxPackOut, status_code=201)
def create_pack(
    body: schemas.WaxPackCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    pack = models.WaxPack(user_id=current.id, **body.dict())
    if pack.value is not None:
        pack.value_updated_at = datetime.now(timezone.utc)
    db.add(pack)
    db.commit()
    db.refresh(pack)
    return pack


# ---------------------------------------------------------------------------
# GET /packs/{pack_id}  — fetch single record (authenticated)
# ---------------------------------------------------------------------------
@router.get("/{pack_id}", response_model=schemas.WaxPackOut)
def get_pack(
    pack_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    pack = (
        db.query(models.WaxPack)
        .filter(models.WaxPack.id == pack_id, models.WaxPack.user_id == current.id)
        .first()
    )
    if not pack:
        raise HTTPException(status_code=404, detail="Not found")
    return pack


# ---------------------------------------------------------------------------
# PATCH /packs/{pack_id}  — partial update
# ---------------------------------------------------------------------------
@router.patch("/{pack_id}", response_model=schemas.WaxPackOut)
def update_pack(
    pack_id: int,
    body: schemas.WaxPackUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    pack = (
        db.query(models.WaxPack)
        .filter(models.WaxPack.id == pack_id, models.WaxPack.user_id == current.id)
        .first()
    )
    if not pack:
        raise HTTPException(status_code=404, detail="Not found")

    updates = body.dict(exclude_unset=True)
    old_value = pack.value
    for k, v in updates.items():
        setattr(pack, k, v)
    if "value" in updates and updates["value"] != old_value:
        pack.value_updated_at = datetime.now(timezone.utc)
    pack.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(pack)
    return pack


# ---------------------------------------------------------------------------
# POST /packs/{pack_id}/refresh-value  — stamp value_updated_at = now()
# ---------------------------------------------------------------------------
@router.post("/{pack_id}/refresh-value", response_model=schemas.WaxPackOut)
def refresh_pack_value(
    pack_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    pack = (
        db.query(models.WaxPack)
        .filter(models.WaxPack.id == pack_id, models.WaxPack.user_id == current.id)
        .first()
    )
    if not pack:
        raise HTTPException(status_code=404, detail="Not found")
    pack.value_updated_at = datetime.now(timezone.utc)
    pack.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(pack)
    return pack


# ---------------------------------------------------------------------------
# DELETE /packs/{pack_id}
# ---------------------------------------------------------------------------
@router.delete("/{pack_id}", status_code=204)
def delete_pack(
    pack_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    pack = (
        db.query(models.WaxPack)
        .filter(models.WaxPack.id == pack_id, models.WaxPack.user_id == current.id)
        .first()
    )
    if not pack:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(pack)
    db.commit()
