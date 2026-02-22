import os
import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Card, GlobalSettings
from ..auth.security import get_current_user
from ..models import User

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []

def build_collection_context(cards: list[Card], settings: GlobalSettings | None) -> str:
    if not cards:
        return "The user has no cards in their collection."

    lines = [f"The user has {len(cards)} cards in their collection.\n"]

    total_value = sum(float(c.value or 0) for c in cards)
    lines.append(f"Total collection value: ${round(total_value):,}\n")

    if settings:
        market_factor = getattr(settings, 'market_factor', None)
        if market_factor:
            lines.append(f"Current market factor: {market_factor}\n")

    # Pre-computed summaries so the AI doesn't have to count manually
    from collections import defaultdict

    # Player summary
    player_stats = defaultdict(lambda: {"total": 0, "rookie": 0, "value": 0.0})
    # Grade summary
    grade_stats = defaultdict(lambda: {"total": 0, "value": 0.0})
    # Brand summary
    brand_stats = defaultdict(lambda: {"total": 0, "value": 0.0})

    for c in cards:
        key = f"{c.first_name} {c.last_name}"
        player_stats[key]["total"] += 1
        if int(c.rookie or 0) == 1:
            player_stats[key]["rookie"] += 1
        player_stats[key]["value"] += float(c.value or 0)

        grade_stats[c.grade]["total"] += 1
        grade_stats[c.grade]["value"] += float(c.value or 0)

        brand = c.brand or "Unknown"
        brand_stats[brand]["total"] += 1
        brand_stats[brand]["value"] += float(c.value or 0)

    lines.append("\nPLAYER SUMMARY (use for counting/totalling by player):")
    for player, stats in sorted(player_stats.items()):
        lines.append(
            f"  - {player}: {stats['total']} cards ({stats['rookie']} rookie), "
            f"total value ${round(stats['value']):,}"
        )

    lines.append("\nGRADE SUMMARY (use for counting/totalling by grade):")
    for grade, stats in sorted(grade_stats.items(), key=lambda x: x[0], reverse=True):
        lines.append(
            f"  - Grade {grade}: {stats['total']} cards, total value ${round(stats['value']):,}"
        )

    lines.append("\nBRAND SUMMARY (use for counting/totalling by brand):")
    for brand, stats in sorted(brand_stats.items()):
        lines.append(
            f"  - {brand}: {stats['total']} cards, total value ${round(stats['value']):,}"
        )

    lines.append("\nFULL CARD LIST (First, Last, Year, Brand, Card#, Rookie, Grade, Value):")
    for c in sorted(cards, key=lambda c: int(c.year or 9999)):
        rookie = "Yes" if int(c.rookie or 0) == 1 else "No"
        lines.append(
            f"  - {c.first_name} {c.last_name}, {c.year}, {c.brand}, "
            f"#{c.card_number or 'N/A'}, Rookie:{rookie}, "
            f"Grade:{c.grade}, Value:${round(float(c.value or 0)):,}"
        )

    return "\n".join(lines)

@router.post("/")
def chat(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")

    cards = db.query(Card).filter(Card.user_id == current.id).all()
    settings = db.query(GlobalSettings).filter(GlobalSettings.user_id == current.id).first()
    context = build_collection_context(cards, settings)

    client = anthropic.Anthropic(api_key=api_key)

    system_prompt = f"""You are CardStoard Assistant, a helpful AI for managing a sports card collection.

Rules you must follow strictly:
- Answer ONLY using the cards listed below. Never invent, guess, or add cards not in the list.
- For counting or totalling questions (e.g. "how many", "total value"), use the pre-computed PLAYER SUMMARY, GRADE SUMMARY, and BRAND SUMMARY sections — they are accurate. Do not count the full card list manually.
- When filtering by year or decade, be exact. "1960s" means year 1960–1969 only. Do not include 1953 or 1957.
- If no cards match a filter (e.g. no 1960s cards), say so clearly — do not substitute cards from other years.
- Use dollar amounts rounded to whole numbers.
- Keep responses brief and friendly.

{context}"""

    # Build full conversation history for multi-turn context
    messages = [
        {"role": m.role, "content": m.text}
        for m in req.history
        if m.role in ("user", "assistant")
    ]
    messages.append({"role": "user", "content": req.message})

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            system=system_prompt,
            messages=messages,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"response": message.content[0].text}
