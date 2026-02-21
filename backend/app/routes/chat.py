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

    lines.append("\nCard list (First, Last, Year, Brand, Card#, Rookie, Grade, Value):")
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
You have access to the user's EXACT collection data below. Answer questions ONLY using the cards listed — do not invent, assume, or add cards from outside this list. If a card is not in the list, it is not in the collection.
Use dollar amounts rounded to whole numbers. Keep responses brief and friendly.

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
