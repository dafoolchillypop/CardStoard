import io, base64, os
import qrcode
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.auth.security import get_current_user
from app.models import User

router = APIRouter(prefix="/boxes", tags=["boxes"])


# ---------------------------------------------------------------------------
# GET /boxes/{box_id}/public  — label data + QR (no auth required)
# ---------------------------------------------------------------------------
@router.get("/{box_id}/public")
def get_set_public(box_id: int, db: Session = Depends(get_db)):
    record = db.query(models.BoxBinder).filter(models.BoxBinder.id == box_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Set not found")

    frontend_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
    set_url = f"{frontend_url}/set-view/{record.id}"

    qr_obj = qrcode.QRCode(version=1, box_size=10, border=2)
    qr_obj.add_data(set_url)
    qr_obj.make(fit=True)
    img = qr_obj.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()

    type_labels = {"factory": "Factory", "collated": "Collated", "binder": "Binder"}
    descriptor = " · ".join(str(p) for p in [record.brand, record.year, record.name] if p)

    return {
        "id":         record.id,
        "label_id":   f"CS-ST-{record.id:06d}",
        "descriptor": descriptor,
        "set_type":   type_labels.get(record.set_type, record.set_type),
        "brand":      record.brand,
        "year":       record.year,
        "name":       record.name or "",
        "notes":      record.notes or "",
        "created_at": record.created_at.strftime("%m/%d/%Y") if record.created_at else "",
        "qr_b64":     qr_b64,
    }


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
# GET /boxes/{box_id}  — fetch single record (authenticated)
# ---------------------------------------------------------------------------
@router.get("/{box_id}", response_model=schemas.BoxBinderOut)
def get_box(
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
