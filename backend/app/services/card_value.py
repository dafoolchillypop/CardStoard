# backend/app/services/card_value.py
"""
Card valuation service.

Valuation formula:   value = avg_book × grade × market_factor

- avg_book      — mean of all non-null book_* fields (book_high through book_low)
- grade         — the card's numeric condition value (3.0, 1.5, 1.0, 0.8, 0.4, 0.2)
- market_factor — selected from GlobalSettings based on attributes, grade + rookie flag:
                    Autograph attr   → auto_factor      (highest priority)
                    Rookie + MT(3.0) → rookie_mt_factor
                    MT only          → mtgrade_factor
                    Rookie only      → rookie_factor
                    EX(1.5)          → exgrade_factor
                    VG(1.0)          → vggrade_factor
                    GD(0.8)          → gdgrade_factor
                    FR(0.4)          → frgrade_factor
                    PR(0.2)          → prgrade_factor

All three functions are called from create_card, update_card, import_csv,
revalue_all, and the sets overlay (with a duck-typed proxy object).
"""

import math
from typing import Optional
from .. import models

def calculate_market_factor(card, settings):
    """Return the appropriate market factor given a card and settings."""
    g = float(card.grade or 0)
    is_rookie = bool(card.rookie in ("*", "1", 1, True))
    attrs = card.card_attributes or {}
    is_auto = bool(attrs.get("autograph"))

    if is_auto:
        return settings.auto_factor
    elif math.isclose(g, 3.0) and is_rookie:
        return getattr(settings, "rookie_mt_factor", settings.auto_factor)
    elif math.isclose(g, 3.0):
        return settings.mtgrade_factor
    elif is_rookie:
        return settings.rookie_factor
    elif math.isclose(g, 1.5):
        return settings.exgrade_factor
    elif math.isclose(g, 1.0):
        return settings.vggrade_factor
    elif math.isclose(g, 0.8):
        return settings.gdgrade_factor
    elif math.isclose(g, 0.4):
        return settings.frgrade_factor
    elif math.isclose(g, 0.2):
        return settings.prgrade_factor
    return 1.0

# Pull average for card value calculation
def pick_avg_book(card: models.Card) -> Optional[float]:
    """
    Compute the true average of all available book_* values.

    Mirrors the frontend logic:
        const avgBook = books.reduce((a, b) => a + b, 0) / books.length;

    Includes all non-null fields: book_high, book_high_mid, book_mid,
    book_low_mid, and book_low.
    """
    values = [
        card.book_high,
        card.book_high_mid,
        card.book_mid,
        card.book_low_mid,
        card.book_low,
    ]

    nums = [float(v) for v in values if v is not None]
    if not nums:
        return None

    avg = sum(nums) / len(nums)
    return round(avg, 2)

def calculate_card_value(avg_book: float | None, g: float | None, factor: float | None) -> float | None:
    """
    Compute the estimated card value based on avg_book, g, and factor.
    Mirrors frontend formula: avgBook * g * factor

    Args:
        avg_book: Average book value (float)
        g: Grading multiplier or condition factor (float)
        factor: Additional adjustment factor (float)

    Returns:
        float | None: Computed value, or None if inputs are incomplete.
    """
    if avg_book is None or g is None or factor is None:
        return None

    try:
        value = avg_book * g * factor
        return round(value) # round to nearest whole dollar
    except (TypeError, ValueError):
        return None
