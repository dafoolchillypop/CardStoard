# backend/app/services/card_value.py

from typing import Optional
from .. import models

def calculate_market_factor(card, settings):
    """Return the appropriate market factor given a card and settings."""
    g = float(card.grade or 0)
    is_rookie = bool(card.rookie in ("*", "1", 1, True))

    if g == 3 and is_rookie:
        return settings.auto_factor
    elif g == 3:
        return settings.mtgrade_factor
    elif is_rookie:
        return settings.rookie_factor
    elif g == 1.5:
        return settings.exgrade_factor
    elif g == 1:
        return settings.vggrade_factor
    elif g == 0.8:
        return settings.gdgrade_factor
    elif g == 0.4:
        return settings.frgrade_factor
    elif g == 0.2:
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
