# backend/app/routes/valuation.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List
from app import models, schemas
from app.database import get_db
from app.models import Card, CardSale, User
from app.schemas import Sale, SaleCreate
from app.auth.security import get_current_user
from app.jobs.scheduler import fetch_sales_job

router = APIRouter(prefix="/valuation", tags=["valuation"])

# --- Create a new sale record ---

@router.post("/sales/", response_model=Sale)
def create_sale(
    sale: SaleCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    # make sure card exists and belongs to current user
    card = db.query(Card).filter(Card.id == sale.card_id, Card.user_id == current.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    new_sale = CardSale(
        card_id=sale.card_id,
        price=sale.price,
        sale_date=sale.sale_date,
        source=sale.source,
        url=sale.url,
    )
    db.add(new_sale)
    db.commit()
    db.refresh(new_sale)
    return new_sale

@router.post("/fetch-ebay-now")
def trigger_ebay_fetch(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user)
):
    """
    Manually trigger eBay sales sync for testing.
    """
    # Run the same function that the scheduler uses
    fetch_sales_job()
    return {"status": "ok", "message": "eBay sales fetch triggered"}

# --- Get all sales for a specific card (with optional limiter) ---

@router.get("/sales/{card_id}", response_model=List[Sale])
def get_sales_for_card(
    card_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=500, description="Max number of sales to return"),
):
    # validate ownership
    card = db.query(Card).filter(Card.id == card_id, Card.user_id == current.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    # query with limit
    sales = (
        db.query(CardSale)
        .filter(CardSale.card_id == card_id)
        .order_by(CardSale.sale_date.desc())
        .limit(limit)
        .all()
    )
    return sales

#--- Card Statistics ---

@router.get("/stats/{card_id}")
def get_card_stats(
    card_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    # Ensure the card belongs to the current user
    card = db.query(Card).filter(Card.id == card_id, Card.user_id == current.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    # Aggregate sales stats
    result = db.query(
        func.count(CardSale.id).label("count"),
        func.min(CardSale.price).label("min"),
        func.max(CardSale.price).label("max"),
        func.avg(CardSale.price).label("avg"),
        func.max(CardSale.sale_date).label("last_sale_date"),
    ).filter(CardSale.card_id == card_id).first()

    if not result or result.count == 0:
        return {"card_id": card_id, "message": "No sales data yet"}

    return {
        "card_id": card_id,
        "count": result.count,
        "min": result.min,
        "max": result.max,
        "avg": round(result.avg, 2) if result.avg else None,
        "last_sale_date": result.last_sale_date.isoformat() if result.last_sale_date else None,
    }

#--- Card Trends ---

@router.get("/trends/{card_id}")
def get_card_trends(
    card_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
    windows: str = Query("3,6,12", description="Comma-separated list of rolling windows (in months)"),
):
    # Parse windows
    try:
        win_sizes = [int(w.strip()) for w in windows.split(",") if w.strip().isdigit()]
    except Exception:
        raise HTTPException(400, "Invalid windows parameter, must be comma-separated integers")

    # Aggregate monthly averages
    rows = (
        db.query(
            extract("year", CardSale.sale_date).label("year"),
            extract("month", CardSale.sale_date).label("month"),
            func.avg(CardSale.price).label("avg_price"),
            func.count(CardSale.id).label("count")
        )
        .filter(CardSale.card_id == card_id)
        .group_by("year", "month")
        .order_by("year", "month")
        .all()
    )

    if not rows:
        raise HTTPException(status_code=404, detail="No sales found for this card")

    # Convert rows into structured list
    trends = []
    for r in rows:
        trends.append({
            "date": f"{int(r.year):04d}-{int(r.month):02d}",
            "avg_price": round(r.avg_price, 2),
            "count": r.count
        })

    # Compute rolling averages for each selected window
    for i in range(len(trends)):
        for w in win_sizes:
            window_vals = trends[max(0, i-w+1): i+1]
            trends[i][f"rolling_{w}mo"] = round(
                sum(t["avg_price"] for t in window_vals) / len(window_vals),
                2
            )

    return {"card_id": card_id, "trends": trends}