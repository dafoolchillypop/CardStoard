import os
import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Card, GlobalSettings, AutoBall, WaxBox, WaxPack, BoxBinder
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
    # -------------------------------------------------------------------------
    # Cards
    # -------------------------------------------------------------------------
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
    # -------------------------------------------------------------------------
    # Auto Balls
    # -------------------------------------------------------------------------
    {
        "name": "find_balls",
        "description": "Search for autographed balls by signer name, brand, or authentication status. Use before update_ball or delete_ball.",
        "input_schema": {
            "type": "object",
            "properties": {
                "first_name": {"type": "string", "description": "Signer first name (partial match)"},
                "last_name": {"type": "string", "description": "Signer last name (partial match)"},
                "brand": {"type": "string", "description": "Ball brand (partial match)"},
                "auth": {"type": "boolean", "description": "Filter by authentication status"},
            },
        },
    },
    {
        "name": "add_ball",
        "description": "Add a new autographed ball to the collection.",
        "input_schema": {
            "type": "object",
            "properties": {
                "first_name": {"type": "string", "description": "Signer's first name"},
                "last_name": {"type": "string", "description": "Signer's last name"},
                "brand": {"type": "string", "description": "Ball brand"},
                "commissioner": {"type": "string", "description": "Commissioner name stamped on ball"},
                "auth": {"type": "boolean", "description": "Whether the ball is authenticated"},
                "inscription": {"type": "string", "description": "Any inscription on the ball"},
                "value": {"type": "number", "description": "Estimated value"},
                "notes": {"type": "string", "description": "Free-text notes"},
            },
            "required": ["first_name", "last_name"],
        },
    },
    {
        "name": "update_ball",
        "description": "Update fields on an existing autographed ball by its ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "The ID of the ball to update"},
                "first_name": {"type": "string"},
                "last_name": {"type": "string"},
                "brand": {"type": "string"},
                "commissioner": {"type": "string"},
                "auth": {"type": "boolean"},
                "inscription": {"type": "string"},
                "value": {"type": "number"},
                "notes": {"type": "string"},
            },
            "required": ["id"],
        },
    },
    {
        "name": "delete_ball",
        "description": "Delete an autographed ball by its ID. Only call after explicit user confirmation.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "The ID of the ball to delete"},
            },
            "required": ["id"],
        },
    },
    # -------------------------------------------------------------------------
    # Wax Boxes
    # -------------------------------------------------------------------------
    {
        "name": "find_wax",
        "description": "Search for wax boxes by year or brand. Use before update_wax or delete_wax.",
        "input_schema": {
            "type": "object",
            "properties": {
                "year": {"type": "integer", "description": "Box year"},
                "brand": {"type": "string", "description": "Brand (partial match)"},
            },
        },
    },
    {
        "name": "add_wax",
        "description": "Add a new wax box to the collection.",
        "input_schema": {
            "type": "object",
            "properties": {
                "year": {"type": "integer", "description": "Box year"},
                "brand": {"type": "string", "description": "Brand"},
                "set_name": {"type": "string", "description": "Set name (optional)"},
                "quantity": {"type": "integer", "description": "Quantity (default 1)"},
                "value": {"type": "number", "description": "Estimated value"},
                "notes": {"type": "string", "description": "Free-text notes"},
            },
            "required": ["year", "brand"],
        },
    },
    {
        "name": "update_wax",
        "description": "Update fields on an existing wax box by its ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "The ID of the wax box to update"},
                "year": {"type": "integer"},
                "brand": {"type": "string"},
                "set_name": {"type": "string"},
                "quantity": {"type": "integer"},
                "value": {"type": "number"},
                "notes": {"type": "string"},
            },
            "required": ["id"],
        },
    },
    {
        "name": "delete_wax",
        "description": "Delete a wax box by its ID. Only call after explicit user confirmation.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "The ID of the wax box to delete"},
            },
            "required": ["id"],
        },
    },
    # -------------------------------------------------------------------------
    # Wax Packs
    # -------------------------------------------------------------------------
    {
        "name": "find_packs",
        "description": "Search for wax packs by year, brand, or pack type. Use before update_pack or delete_pack.",
        "input_schema": {
            "type": "object",
            "properties": {
                "year": {"type": "integer", "description": "Pack year"},
                "brand": {"type": "string", "description": "Brand (partial match)"},
                "pack_type": {"type": "string", "description": "Pack type: cello, rack, wax, or blister"},
            },
        },
    },
    {
        "name": "add_pack",
        "description": "Add a new wax pack to the collection.",
        "input_schema": {
            "type": "object",
            "properties": {
                "year": {"type": "integer", "description": "Pack year"},
                "brand": {"type": "string", "description": "Brand"},
                "set_name": {"type": "string", "description": "Set name (optional)"},
                "pack_type": {"type": "string", "description": "Pack type: cello, rack, wax, or blister"},
                "quantity": {"type": "integer", "description": "Quantity (default 1)"},
                "value": {"type": "number", "description": "Estimated value"},
                "notes": {"type": "string", "description": "Free-text notes"},
            },
            "required": ["year", "brand"],
        },
    },
    {
        "name": "update_pack",
        "description": "Update fields on an existing wax pack by its ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "The ID of the wax pack to update"},
                "year": {"type": "integer"},
                "brand": {"type": "string"},
                "set_name": {"type": "string"},
                "pack_type": {"type": "string"},
                "quantity": {"type": "integer"},
                "value": {"type": "number"},
                "notes": {"type": "string"},
            },
            "required": ["id"],
        },
    },
    {
        "name": "delete_pack",
        "description": "Delete a wax pack by its ID. Only call after explicit user confirmation.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "The ID of the wax pack to delete"},
            },
            "required": ["id"],
        },
    },
]


def build_collection_context(
    cards: list,
    balls: list,
    wax_boxes: list,
    wax_packs: list,
    box_binders: list,
    settings: GlobalSettings | None,
) -> str:
    from collections import defaultdict

    lines = []

    # ------------------------------------------------------------------
    # Cards
    # ------------------------------------------------------------------
    if not cards:
        lines.append("The user has no cards in their collection.\n")
    else:
        lines.append(f"The user has {len(cards)} cards in their collection.\n")
        total_value = sum(float(c.value or 0) for c in cards)
        lines.append(f"Total card collection value: ${round(total_value):,}\n")

        if settings:
            market_factor = getattr(settings, 'market_factor', None)
            if market_factor:
                lines.append(f"Current market factor: {market_factor}\n")

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

    # ------------------------------------------------------------------
    # Auto Balls
    # ------------------------------------------------------------------
    lines.append("\n\nAUTO BALLS SUMMARY:")
    if not balls:
        lines.append("  No autographed balls in collection.")
    else:
        total_val = sum(float(b.value or 0) for b in balls)
        total_qty = len(balls)
        lines.append(f"  Total: {total_qty} balls | Total value: ${round(total_val):,}")

        signer_stats = defaultdict(lambda: {"count": 0, "value": 0.0})
        for b in balls:
            key = f"{b.first_name} {b.last_name}"
            signer_stats[key]["count"] += 1
            signer_stats[key]["value"] += float(b.value or 0)

        top_signers = sorted(signer_stats.items(), key=lambda x: x[1]["count"], reverse=True)[:5]
        signer_parts = [
            f"{signer}: {s['count']} ball(s), value ${round(s['value']):,}"
            for signer, s in top_signers
        ]
        lines.append(f"  Top signers: {' | '.join(signer_parts)}")

        auth_count = sum(1 for b in balls if b.auth)
        unauth_count = total_qty - auth_count
        lines.append(f"  Auth breakdown: {auth_count} authenticated, {unauth_count} unauthenticated")
        lines.append("  To look up specific balls, use the find_balls tool.")

    # ------------------------------------------------------------------
    # Wax Boxes
    # ------------------------------------------------------------------
    lines.append("\n\nWAX BOXES SUMMARY:")
    if not wax_boxes:
        lines.append("  No wax boxes in collection.")
    else:
        total_qty = sum(int(w.quantity or 1) for w in wax_boxes)
        total_val = sum(float(w.value or 0) for w in wax_boxes)
        lines.append(f"  Total: {len(wax_boxes)} boxes ({total_qty} qty) | Total value: ${round(total_val):,}")

        brand_counts = defaultdict(int)
        for w in wax_boxes:
            brand_counts[w.brand or "Unknown"] += 1
        brand_parts = [f"{brand}: {count} box(es)" for brand, count in sorted(brand_counts.items())]
        lines.append(f"  By brand: {', '.join(brand_parts)}")
        lines.append("  To look up specific wax boxes, use the find_wax tool.")

    # ------------------------------------------------------------------
    # Wax Packs
    # ------------------------------------------------------------------
    lines.append("\n\nWAX PACKS SUMMARY:")
    if not wax_packs:
        lines.append("  No wax packs in collection.")
    else:
        total_qty = sum(int(p.quantity or 1) for p in wax_packs)
        total_val = sum(float(p.value or 0) for p in wax_packs)
        lines.append(f"  Total: {len(wax_packs)} packs ({total_qty} qty) | Total value: ${round(total_val):,}")

        type_counts = defaultdict(int)
        for p in wax_packs:
            type_counts[p.pack_type or "(none)"] += 1
        type_parts = [f"{t}: {n}" for t, n in sorted(type_counts.items())]
        lines.append(f"  By type: {', '.join(type_parts)}")

        brand_counts = defaultdict(int)
        for p in wax_packs:
            brand_counts[p.brand or "Unknown"] += 1
        brand_parts = [f"{brand}: {count} pack(s)" for brand, count in sorted(brand_counts.items())]
        lines.append(f"  By brand: {', '.join(brand_parts)}")
        lines.append("  To look up specific wax packs, use the find_packs tool.")

    # ------------------------------------------------------------------
    # Sets / Binders
    # ------------------------------------------------------------------
    lines.append("\n\nSETS/BINDERS SUMMARY:")
    if not box_binders:
        lines.append("  No sets/binders in collection.")
    else:
        total_qty = sum(int(s.quantity or 1) for s in box_binders)
        total_val = sum(float(s.value or 0) for s in box_binders)
        lines.append(f"  Total: {len(box_binders)} sets ({total_qty} qty) | Total value: ${round(total_val):,}")

        type_counts = defaultdict(int)
        for s in box_binders:
            type_counts[s.set_type or "Unknown"] += 1
        type_parts = [f"{t.capitalize()}: {n}" for t, n in sorted(type_counts.items())]
        lines.append(f"  By type: {', '.join(type_parts)}")
        lines.append("  Sets/Binders are read-only — Cy cannot add, update, or delete them via chat.")

    return "\n".join(lines)


def execute_tool(name: str, inputs: dict, db: Session, current: User, settings: GlobalSettings | None) -> str:
    # ------------------------------------------------------------------
    # Cards
    # ------------------------------------------------------------------
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

    # ------------------------------------------------------------------
    # Auto Balls
    # ------------------------------------------------------------------
    elif name == "find_balls":
        query = db.query(AutoBall).filter(AutoBall.user_id == current.id)
        if inputs.get("first_name"):
            query = query.filter(AutoBall.first_name.ilike(f"%{inputs['first_name']}%"))
        if inputs.get("last_name"):
            query = query.filter(AutoBall.last_name.ilike(f"%{inputs['last_name']}%"))
        if inputs.get("brand"):
            query = query.filter(AutoBall.brand.ilike(f"%{inputs['brand']}%"))
        if inputs.get("auth") is not None:
            query = query.filter(AutoBall.auth == inputs["auth"])
        results = query.limit(20).all()
        if not results:
            return "No autographed balls found matching those criteria."
        lines = []
        for b in results:
            auth_str = "Authenticated" if b.auth else "Not authenticated"
            lines.append(
                f"[ID:{b.id}] {b.first_name} {b.last_name}, Brand:{b.brand or 'N/A'}, "
                f"Commissioner:{b.commissioner or 'N/A'}, {auth_str}, "
                f"Value:${round(float(b.value or 0)):,}"
            )
        return "\n".join(lines)

    elif name == "add_ball":
        ball = AutoBall(
            user_id=current.id,
            first_name=inputs["first_name"],
            last_name=inputs["last_name"],
            brand=inputs.get("brand"),
            commissioner=inputs.get("commissioner"),
            auth=inputs.get("auth", False),
            inscription=inputs.get("inscription"),
            value=inputs.get("value"),
            notes=inputs.get("notes"),
        )
        db.add(ball)
        db.commit()
        return (
            f"Added autographed ball [ID:{ball.id}]: {ball.first_name} {ball.last_name}, "
            f"Brand:{ball.brand or 'N/A'}"
        )

    elif name == "update_ball":
        ball_id = inputs.get("id")
        ball = db.query(AutoBall).filter(AutoBall.id == ball_id, AutoBall.user_id == current.id).first()
        if not ball:
            return f"Error: Autographed ball ID {ball_id} not found."

        for field in ["first_name", "last_name", "brand", "commissioner", "auth", "inscription", "value", "notes"]:
            if field in inputs and inputs[field] is not None:
                setattr(ball, field, inputs[field])

        db.commit()
        return (
            f"Updated autographed ball [ID:{ball.id}]: {ball.first_name} {ball.last_name}, "
            f"Value:${round(float(ball.value or 0)):,}"
        )

    elif name == "delete_ball":
        ball_id = inputs.get("id")
        ball = db.query(AutoBall).filter(AutoBall.id == ball_id, AutoBall.user_id == current.id).first()
        if not ball:
            return f"Error: Autographed ball ID {ball_id} not found."

        label = f"{ball.first_name} {ball.last_name}, Brand:{ball.brand or 'N/A'}"
        db.delete(ball)
        db.commit()
        return f"Deleted autographed ball: {label}"

    # ------------------------------------------------------------------
    # Wax Boxes
    # ------------------------------------------------------------------
    elif name == "find_wax":
        query = db.query(WaxBox).filter(WaxBox.user_id == current.id)
        if inputs.get("year"):
            query = query.filter(WaxBox.year == inputs["year"])
        if inputs.get("brand"):
            query = query.filter(WaxBox.brand.ilike(f"%{inputs['brand']}%"))
        results = query.limit(20).all()
        if not results:
            return "No wax boxes found matching those criteria."
        lines = []
        for w in results:
            lines.append(
                f"[ID:{w.id}] {w.year} {w.brand}, Set:{w.set_name or 'N/A'}, "
                f"Qty:{w.quantity or 1}, Value:${round(float(w.value or 0)):,}"
            )
        return "\n".join(lines)

    elif name == "add_wax":
        box = WaxBox(
            user_id=current.id,
            year=inputs["year"],
            brand=inputs["brand"],
            set_name=inputs.get("set_name"),
            quantity=inputs.get("quantity", 1),
            value=inputs.get("value"),
            notes=inputs.get("notes"),
        )
        db.add(box)
        db.commit()
        return (
            f"Added wax box [ID:{box.id}]: {box.year} {box.brand}, "
            f"Qty:{box.quantity or 1}"
        )

    elif name == "update_wax":
        box_id = inputs.get("id")
        box = db.query(WaxBox).filter(WaxBox.id == box_id, WaxBox.user_id == current.id).first()
        if not box:
            return f"Error: Wax box ID {box_id} not found."

        for field in ["year", "brand", "set_name", "quantity", "value", "notes"]:
            if field in inputs and inputs[field] is not None:
                setattr(box, field, inputs[field])

        db.commit()
        return (
            f"Updated wax box [ID:{box.id}]: {box.year} {box.brand}, "
            f"Qty:{box.quantity or 1}, Value:${round(float(box.value or 0)):,}"
        )

    elif name == "delete_wax":
        box_id = inputs.get("id")
        box = db.query(WaxBox).filter(WaxBox.id == box_id, WaxBox.user_id == current.id).first()
        if not box:
            return f"Error: Wax box ID {box_id} not found."

        label = f"{box.year} {box.brand}, Set:{box.set_name or 'N/A'}"
        db.delete(box)
        db.commit()
        return f"Deleted wax box: {label}"

    # ------------------------------------------------------------------
    # Wax Packs
    # ------------------------------------------------------------------
    elif name == "find_packs":
        query = db.query(WaxPack).filter(WaxPack.user_id == current.id)
        if inputs.get("year"):
            query = query.filter(WaxPack.year == inputs["year"])
        if inputs.get("brand"):
            query = query.filter(WaxPack.brand.ilike(f"%{inputs['brand']}%"))
        if inputs.get("pack_type"):
            query = query.filter(WaxPack.pack_type == inputs["pack_type"])
        results = query.limit(20).all()
        if not results:
            return "No wax packs found matching those criteria."
        lines = []
        for p in results:
            lines.append(
                f"[ID:{p.id}] {p.year} {p.brand}, Type:{p.pack_type or 'N/A'}, "
                f"Set:{p.set_name or 'N/A'}, Qty:{p.quantity or 1}, "
                f"Value:${round(float(p.value or 0)):,}"
            )
        return "\n".join(lines)

    elif name == "add_pack":
        pack = WaxPack(
            user_id=current.id,
            year=inputs["year"],
            brand=inputs["brand"],
            set_name=inputs.get("set_name"),
            pack_type=inputs.get("pack_type"),
            quantity=inputs.get("quantity", 1),
            value=inputs.get("value"),
            notes=inputs.get("notes"),
        )
        db.add(pack)
        db.commit()
        return (
            f"Added wax pack [ID:{pack.id}]: {pack.year} {pack.brand}, "
            f"Type:{pack.pack_type or 'N/A'}, Qty:{pack.quantity or 1}"
        )

    elif name == "update_pack":
        pack_id = inputs.get("id")
        pack = db.query(WaxPack).filter(WaxPack.id == pack_id, WaxPack.user_id == current.id).first()
        if not pack:
            return f"Error: Wax pack ID {pack_id} not found."

        for field in ["year", "brand", "set_name", "pack_type", "quantity", "value", "notes"]:
            if field in inputs and inputs[field] is not None:
                setattr(pack, field, inputs[field])

        db.commit()
        return (
            f"Updated wax pack [ID:{pack.id}]: {pack.year} {pack.brand}, "
            f"Type:{pack.pack_type or 'N/A'}, Qty:{pack.quantity or 1}, Value:${round(float(pack.value or 0)):,}"
        )

    elif name == "delete_pack":
        pack_id = inputs.get("id")
        pack = db.query(WaxPack).filter(WaxPack.id == pack_id, WaxPack.user_id == current.id).first()
        if not pack:
            return f"Error: Wax pack ID {pack_id} not found."

        label = f"{pack.year} {pack.brand}, Type:{pack.pack_type or 'N/A'}"
        db.delete(pack)
        db.commit()
        return f"Deleted wax pack: {label}"

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
    balls = db.query(AutoBall).filter(AutoBall.user_id == current.id).all()
    wax_boxes = db.query(WaxBox).filter(WaxBox.user_id == current.id).all()
    wax_packs = db.query(WaxPack).filter(WaxPack.user_id == current.id).all()
    box_binders = db.query(BoxBinder).filter(BoxBinder.user_id == current.id).all()
    settings = db.query(GlobalSettings).filter(GlobalSettings.user_id == current.id).first()
    context = build_collection_context(cards, balls, wax_boxes, wax_packs, box_binders, settings)

    client = anthropic.Anthropic(api_key=api_key)

    system_prompt = f"""You are Cy, a helpful AI assistant for managing a sports memorabilia collection.

Your collection includes 5 inventory types:
1. **Cards** — trading cards with player, year, brand, grade, and book/market values
2. **Auto Balls** — autographed baseballs with signer, brand, commissioner, authentication, and inscription
3. **Wax Boxes** — sealed wax boxes with year, brand, set name, and quantity
4. **Wax Packs** — individual wax/cello/rack/blister packs with year, brand, pack type, and quantity
5. **Sets/Binders** — factory sets, collated sets, and binders (read-only — cannot be modified via chat)

You can answer questions AND perform actions using the tools provided. Use the pre-computed summaries \
below for counts and totals — do not count items manually from any list.

Rules you must follow strictly:
- Answer ONLY using data in the collection context below. Never invent or guess items.
- For counting or totalling questions, use the pre-computed summary sections — they are accurate.
- When filtering by year or decade, be exact. "1960s" means 1960–1969 only.
- If no items match a filter, say so clearly — do not substitute items from other years or types.
- Use dollar amounts rounded to whole numbers.
- Keep responses brief and friendly.
- For deletions: always ask the user to confirm before calling any delete tool. Do not delete unless \
the user has explicitly said yes.
- When the user confirms a deletion, you MUST call the appropriate find tool to locate the item and \
get its ID, then call the delete tool. Never respond with a deletion confirmation without actually \
calling these tools.
- After performing any action (add/update/delete), briefly confirm what was done — but only after \
the tool call has completed, never before.
- To update or delete any item, you MUST call the corresponding find tool first to get the ID. \
Never assume an ID — always look it up.
- Sets/Binders are read-only in chat. If asked to add, update, or delete a set/binder, politely \
explain that must be done through the Sets page.

{context}"""

    recent_history = req.history[-10:] if len(req.history) > 10 else req.history
    messages = [
        {"role": m.role, "content": m.text}
        for m in recent_history
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
