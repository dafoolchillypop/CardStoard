from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app import models
from app.database import get_db
from app.routes.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/")
def get_analytics(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    
    # --- Collection Totals ---
    total_cards = (
        db.query(func.count(models.Card.id))
        .filter(models.Card.user_id == current_user.id)
        .scalar()
    )

    total_value = (
        db.query(func.coalesce(func.sum(models.Card.value), 0))
        .filter(models.Card.user_id == current_user.id)
        .scalar()
    )
    
    # --- Breakdown by Brand ---
    by_brand = (
        db.query(models.Card.brand, func.count(models.Card.id), func.sum(models.Card.book_mid))
        .filter_by(user_id=current_user.id)
        .group_by(models.Card.brand)
        .all()
    )
    by_brand_out = [{"brand": b or "Unknown", "count": c, "value": float(v or 0)} for b, c, v in by_brand]

    # --- Breakdown by Year ---
    by_year = (
        db.query(models.Card.year, func.count(models.Card.id), func.sum(models.Card.book_mid))
        .filter_by(user_id=current_user.id)
        .group_by(models.Card.year)
        .order_by(models.Card.year)
        .all()
    )
    by_year_out = [{"year": y or 0, "count": c, "value": float(v or 0)} for y, c, v in by_year]

    # --- Breakdown by Player ---
    by_player = (
        db.query(models.Card.last_name, models.Card.first_name, func.count(models.Card.id), func.sum(models.Card.book_mid))
        .filter_by(user_id=current_user.id)
        .group_by(models.Card.last_name, models.Card.first_name)
        .all()
    )
    by_player_out = [
        {"name": f"{fn} {ln}", "count": c, "value": float(v or 0)}
        for ln, fn, c, v in by_player
    ]

    # --- Trend by Month (creation + updates) ---
    trend_created = (
        db.query(
            extract("year", models.Card.created_at).label("year"),
            extract("month", models.Card.created_at).label("month"),
            func.count(models.Card.id).label("count"),
            func.sum(models.Card.book_mid).label("value"),
        )
        .filter(models.Card.user_id == current_user.id,
                models.Card.created_at.isnot(None))
        .group_by(extract("year", models.Card.created_at),
                extract("month", models.Card.created_at))
        .order_by(extract("year", models.Card.created_at),
                extract("month", models.Card.created_at))
        .all()
    )

    trend_updated = (
        db.query(
            extract("year", models.Card.updated_at).label("year"),
            extract("month", models.Card.updated_at).label("month"),
            func.count(models.Card.id).label("count"),
            func.sum(models.Card.book_mid).label("value"),
        )
        .filter(models.Card.user_id == current_user.id,
                models.Card.updated_at.isnot(None))
        .group_by(extract("year", models.Card.updated_at),
                extract("month", models.Card.updated_at))
        .order_by(extract("year", models.Card.updated_at),
                extract("month", models.Card.updated_at))
        .all()
    )

    # Merge into dictionary keyed by YYYY-MM
    trend_dict = {}

    for y, m, c, v in trend_created:
        key = f"{int(y):04d}-{int(m):02d}"
        if key not in trend_dict:
            trend_dict[key] = {"month": key, "count": 0, "value": 0}
        trend_dict[key]["count"] += c
        trend_dict[key]["value"] += float(v or 0)

    for y, m, c, v in trend_updated:
        key = f"{int(y):04d}-{int(m):02d}"
        if key not in trend_dict:
            trend_dict[key] = {"month": key, "count": 0, "value": 0}
        trend_dict[key]["count"] += c
        trend_dict[key]["value"] += float(v or 0)

    trend_out = sorted(trend_dict.values(), key=lambda x: x["month"])

    return {
        "total_cards": total_cards,
        "total_value": float(total_value or 0),
        "unique_players": len(by_player_out),
        "brands_count": len(by_brand_out),
        "by_brand": by_brand_out,
        "by_year": by_year_out,
        "by_player": by_player_out,
        "trend": trend_out,
    }
