import os
import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Card, GlobalSettings
from ..auth.security import get_current_user
from ..models import User
from ..services.card_value import pick_avg_book, calculate_market_factor, calculate_card_value

router = APIRouter(prefix="/chat", tags=["chat"])

VALID_GRADES = {3.0, 1.5, 1.0, 0.8, 0.4, 0.2}

class ChatMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []

TOOLS = [
    {
        "name": "add_card",
        "description": "Add a new card to the user's collection.",
        "input_schema": {
            "type": "object",
            "properties": {
                "first_name": {"type": "string", "description": "Player's first name"},
                "last_name": {"type": "string", "description": "Player's last name"},
                "year": {"type": "integer", "description": "Card year"},
                "brand": {"type": "string", "description": "Card brand (e.g. Topps)"},
                "card_number": {"type": "string", "description": "Card number"},
                "rookie": {"type": "boolean", "description": "Whether this is a rookie card"},
                "grade": {"type": "number", "description": "Card grade. Must be one of: 3.0, 1.5, 1.0, 0.8, 0.4, 0.2"},
                "book_high": {"type": "number"},
                "book_high_mid": {"type": "number"},
                "book_mid": {"type": "number"},
                "book_low_mid": {"type": "number"},
                "book_low": {"type": "number"},
            },
            "required": ["first_name", "last_name", "grade"],
        },
    },
    {
        "name": "update_card",
        "description": "Update fields on an existing card by its ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "card_id": {"type": "integer", "description": "The ID of the card to update"},
                "first_name": {"type": "string"},
                "last_name": {"type": "string"},
                "year": {"type": "integer"},
                "brand": {"type": "string"},
                "card_number": {"type": "string"},
                "rookie": {"type": "boolean"},
                "grade": {"type": "number", "description": "Must be one of: 3.0, 1.5, 1.0, 0.8, 0.4, 0.2"},
                "book_high": {"type": "number"},
                "book_high_mid": {"type": "number"},
                "book_mid": {"type": "number"},
                "book_low_mid": {"type": "number"},
                "book_low": {"type": "number"},
            },
            "required": ["card_id"],
        },
    },
    {
        "name": "find_cards",
        "description": "Search for cards in the collection by player name, year, brand, or card number. Use this to find card IDs before calling update_card or delete_card.",
        "input_schema": {
            "type": "object",
            "properties": {
                "first_name": {"type": "string", "description": "Player first name (partial match)"},
                "last_name": {"type": "string", "description": "Player last name (partial match)"},
                "year": {"type": "integer", "description": "Card year"},
                "brand": {"type": "string", "description": "Card brand (partial match)"},
                "card_number": {"type": "string", "description": "Card number"},
            },
        },
    },
    {
        "name": "delete_card",
        "description": "Delete a card from the collection by its ID. Only call this after the user has explicitly confirmed the deletion.",
        "input_schema": {
            "type": "object",
            "properties": {
                "card_id": {"type": "integer", "description": "The ID of the card to delete"},
            },
            "required": ["card_id"],
        },
    },
]

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

    from collections import defaultdict

    player_stats = defaultdict(lambda: {"total": 0, "rookie": 0, "value": 0.0})
    grade_stats = defaultdict(lambda: {"total": 0, "value": 0.0})
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

    lines.append("\nTo look up specific cards (e.g. for update or delete), use the find_cards tool.")

    return "\n".join(lines)


def execute_tool(name: str, inputs: dict, db: Session, current: User, settings: GlobalSettings | None) -> str:
    if name == "find_cards":
        query = db.query(Card).filter(Card.user_id == current.id)
        if inputs.get("first_name"):
            query = query.filter(Card.first_name.ilike(f"%{inputs['first_name']}%"))
        if inputs.get("last_name"):
            query = query.filter(Card.last_name.ilike(f"%{inputs['last_name']}%"))
        if inputs.get("year"):
            query = query.filter(Card.year == inputs["year"])
        if inputs.get("brand"):
            query = query.filter(Card.brand.ilike(f"%{inputs['brand']}%"))
        if inputs.get("card_number"):
            query = query.filter(Card.card_number == inputs["card_number"])
        results = query.limit(20).all()
        if not results:
            return "No cards found matching those criteria."
        lines = []
        for c in results:
            rookie = "Yes" if int(c.rookie or 0) == 1 else "No"
            lines.append(
                f"[ID:{c.id}] {c.first_name} {c.last_name}, {c.year}, {c.brand}, "
                f"#{c.card_number or 'N/A'}, Rookie:{rookie}, Grade:{c.grade}, "
                f"Value:${round(float(c.value or 0)):,}"
            )
        return "\n".join(lines)

    elif name == "add_card":
        grade = inputs.get("grade")
        if grade not in VALID_GRADES:
            return f"Error: Invalid grade {grade}. Must be one of: {sorted(VALID_GRADES)}"

        card = Card(
            user_id=current.id,
            first_name=inputs["first_name"],
            last_name=inputs["last_name"],
            year=inputs.get("year"),
            brand=inputs.get("brand"),
            card_number=inputs.get("card_number"),
            rookie=inputs.get("rookie", False),
            grade=grade,
            book_high=inputs.get("book_high"),
            book_high_mid=inputs.get("book_high_mid"),
            book_mid=inputs.get("book_mid"),
            book_low_mid=inputs.get("book_low_mid"),
            book_low=inputs.get("book_low"),
        )
        db.add(card)
        db.flush()

        if settings:
            avg_book = pick_avg_book(card)
            g = float(card.grade)
            factor = calculate_market_factor(card, settings)
            card.value = calculate_card_value(avg_book, g, factor)
            card.market_factor = factor

        db.commit()
        return (
            f"Added card [ID:{card.id}]: {card.first_name} {card.last_name}, "
            f"{card.year}, {card.brand}, Grade:{card.grade}"
        )

    elif name == "update_card":
        card_id = inputs.get("card_id")
        card = db.query(Card).filter(Card.id == card_id, Card.user_id == current.id).first()
        if not card:
            return f"Error: Card ID {card_id} not found."

        updatable = [
            "first_name", "last_name", "year", "brand", "card_number", "rookie",
            "grade", "book_high", "book_high_mid", "book_mid", "book_low_mid", "book_low",
        ]
        for field in updatable:
            if field in inputs and inputs[field] is not None:
                if field == "grade" and inputs[field] not in VALID_GRADES:
                    return f"Error: Invalid grade {inputs[field]}. Must be one of: {sorted(VALID_GRADES)}"
                setattr(card, field, inputs[field])

        if settings:
            avg_book = pick_avg_book(card)
            g = float(card.grade)
            factor = calculate_market_factor(card, settings)
            card.value = calculate_card_value(avg_book, g, factor)
            card.market_factor = factor

        db.commit()
        return (
            f"Updated card [ID:{card.id}]: {card.first_name} {card.last_name}, "
            f"Grade:{card.grade}, Value:${round(float(card.value or 0)):,}"
        )

    elif name == "delete_card":
        card_id = inputs.get("card_id")
        card = db.query(Card).filter(Card.id == card_id, Card.user_id == current.id).first()
        if not card:
            return f"Error: Card ID {card_id} not found."

        label = f"{card.first_name} {card.last_name}, {card.year}, {card.brand}, Grade:{card.grade}"
        db.delete(card)
        db.commit()
        return f"Deleted card: {label}"

    return f"Error: Unknown tool {name}"


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

You can answer questions AND perform actions (add, update, or delete cards) using the tools provided.

Rules you must follow strictly:
- Answer ONLY using the cards listed below. Never invent, guess, or add cards not in the list.
- For counting or totalling questions (e.g. "how many", "total value"), use the pre-computed PLAYER SUMMARY, GRADE SUMMARY, and BRAND SUMMARY sections — they are accurate. Do not count the full card list manually.
- When filtering by year or decade, be exact. "1960s" means year 1960–1969 only. Do not include 1953 or 1957.
- If no cards match a filter (e.g. no 1960s cards), say so clearly — do not substitute cards from other years.
- Use dollar amounts rounded to whole numbers.
- Keep responses brief and friendly.
- For deletions: always ask the user to confirm before calling delete_card. Do not delete unless the user has explicitly said yes.
- After performing any action (add/update/delete), briefly confirm what was done.
- To update or delete a card, first call find_cards to locate it and get its ID, then call update_card or delete_card.

{context}"""

    messages = [
        {"role": m.role, "content": m.text}
        for m in req.history
        if m.role in ("user", "assistant")
    ]
    messages.append({"role": "user", "content": req.message})

    try:
        for _ in range(10):  # max 10 tool calls per turn
            response = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1024,
                system=system_prompt,
                tools=TOOLS,
                messages=messages,
            )
            messages.append({"role": "assistant", "content": response.content})

            if response.stop_reason != "tool_use":
                text = next(
                    (b.text for b in response.content if hasattr(b, "text")),
                    ""
                )
                return {"response": text}

            # Execute tool calls and feed results back
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = execute_tool(block.name, block.input, db, current, settings)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })
            messages.append({"role": "user", "content": tool_results})

        return {"response": "I wasn't able to complete this request. Please try again."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
