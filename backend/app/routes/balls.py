import io, base64, os
from datetime import datetime, timezone

import qrcode
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.auth.security import get_current_user
from app.models import User

router = APIRouter(prefix="/balls", tags=["balls"])


# ---------------------------------------------------------------------------
# GET /balls/{ball_id}/public  — label data + QR (no auth required)
# ---------------------------------------------------------------------------
@router.get("/{ball_id}/public")
def get_ball_public(ball_id: int, db: Session = Depends(get_db)):
    record = db.query(models.AutoBall).filter(models.AutoBall.id == ball_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Ball not found")

    frontend_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
    ball_url = f"{frontend_url}/ball-view/{record.id}"

    qr_obj = qrcode.QRCode(version=1, box_size=10, border=2)
    qr_obj.add_data(ball_url)
    qr_obj.make(fit=True)
    img = qr_obj.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()

    return {
        "id":           record.id,
        "label_id":     f"CS-BL-{record.id:06d}",
        "name":         f"{record.first_name} {record.last_name}",
        "brand":        record.brand or "",
        "commissioner": record.commissioner or "",
        "auth":         record.auth,
        "inscription":  record.inscription or "",
        "notes":        record.notes or "",
        "created_at":   record.created_at.strftime("%m/%d/%Y") if record.created_at else "",
        "qr_b64":       qr_b64,
    }


# ---------------------------------------------------------------------------
# GET /balls/  — list user's auto balls
# ---------------------------------------------------------------------------
@router.get("/", response_model=list[schemas.AutoBallOut])
def list_balls(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    return (
        db.query(models.AutoBall)
        .filter(models.AutoBall.user_id == current.id)
        .order_by(models.AutoBall.last_name, models.AutoBall.first_name)
        .all()
    )


# ---------------------------------------------------------------------------
# POST /balls/  — create
# ---------------------------------------------------------------------------
@router.post("/", response_model=schemas.AutoBallOut, status_code=201)
def create_ball(
    body: schemas.AutoBallCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    ball = models.AutoBall(user_id=current.id, **body.dict())
    if ball.value is not None:
        ball.value_updated_at = datetime.now(timezone.utc)
    db.add(ball)
    db.commit()
    db.refresh(ball)
    return ball


# ---------------------------------------------------------------------------
# GET /balls/{ball_id}  — fetch single record (authenticated)
# ---------------------------------------------------------------------------
@router.get("/{ball_id}", response_model=schemas.AutoBallOut)
def get_ball(
    ball_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    ball = (
        db.query(models.AutoBall)
        .filter(models.AutoBall.id == ball_id, models.AutoBall.user_id == current.id)
        .first()
    )
    if not ball:
        raise HTTPException(status_code=404, detail="Not found")
    return ball


# ---------------------------------------------------------------------------
# PATCH /balls/{ball_id}  — partial update
# ---------------------------------------------------------------------------
@router.patch("/{ball_id}", response_model=schemas.AutoBallOut)
def update_ball(
    ball_id: int,
    body: schemas.AutoBallUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    ball = (
        db.query(models.AutoBall)
        .filter(models.AutoBall.id == ball_id, models.AutoBall.user_id == current.id)
        .first()
    )
    if not ball:
        raise HTTPException(status_code=404, detail="Not found")

    updates = body.dict(exclude_unset=True)
    old_value = ball.value
    for k, v in updates.items():
        setattr(ball, k, v)
    # Auto-set value_updated_at when value changes
    if "value" in updates and updates["value"] != old_value:
        ball.value_updated_at = datetime.now(timezone.utc)
    ball.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ball)
    return ball


# ---------------------------------------------------------------------------
# DELETE /balls/{ball_id}
# ---------------------------------------------------------------------------
@router.delete("/{ball_id}", status_code=204)
def delete_ball(
    ball_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    ball = (
        db.query(models.AutoBall)
        .filter(models.AutoBall.id == ball_id, models.AutoBall.user_id == current.id)
        .first()
    )
    if not ball:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(ball)
    db.commit()
