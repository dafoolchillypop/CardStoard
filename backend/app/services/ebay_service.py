# backend/app/services/ebay_service.py
import logging
import requests
import time
from datetime import datetime, timedelta
from app.models import Card, CardSale
import re

EBAY_FINDING_URL = "https://svcs.ebay.com/services/search/FindingService/v1"

GRADED_KEYWORDS = [
    "PSA", "BGS", "SGC", "CGC", "GMA", "HGA",
    "BCCG", "CSG", "BVG", "GRADED"
]

def is_raw_ungraded(title: str) -> bool:
    if not title:
        return True
    upper = title.upper()
    for kw in GRADED_KEYWORDS:
        if re.search(rf"\b{kw}\b", upper):
            return False
    return True

def sync_recent_sales(db, days: int = 30, per_card: int = 10):
    cards = db.query(Card).all()
    cutoff = datetime.utcnow() - timedelta(days=days)
    new_count = 0

    from os import getenv
    app_id = getenv("EBAY_CLIENT_ID")
    if not app_id:
        logging.error("[eBay Sync] Missing EBAY_CLIENT_ID env var")
        return 0

    for card in cards:
        # clean query (remove #)
        query = f"{card.year} {card.brand} {card.first_name} {card.last_name} {card.card_number}".replace("#", " ")
        logging.info(f"[eBay Sync] Fetching completed raw sales for: {query}")

        try:
            resp = requests.get(
                EBAY_FINDING_URL,
                params={
                    "OPERATION-NAME": "findCompletedItems",
                    "SERVICE-VERSION": "1.13.0",
                    "SECURITY-APPNAME": app_id,
                    "RESPONSE-DATA-FORMAT": "JSON",
                    "REST-PAYLOAD": "",
                    "keywords": query,
                    "itemFilter(0).name": "SoldItemsOnly",
                    "itemFilter(0).value": "true",
                    "itemFilter(1).name": "Condition",
                    "itemFilter(1).value": "3000",  # Used
                    "paginationInput.entriesPerPage": str(per_card),
                    "sortOrder": "EndTimeNewest"
                },
                timeout=20
            )
            resp.raise_for_status()
            data = resp.json()
            items = (
                data.get("findCompletedItemsResponse", [{}])[0]
                    .get("searchResult", [{}])[0]
                    .get("item", [])
            )
        except Exception as e:
            logging.error(f"[eBay Sync] API error for {query}: {e}")
            continue

        for item in items:
            try:
                title = item.get("title", [""])[0] if isinstance(item.get("title"), list) else item.get("title", "")
                if not is_raw_ungraded(title):
                    logging.info(f"[eBay Sync] Skipping graded item: {title}")
                    continue

                price = float(item["sellingStatus"][0]["currentPrice"][0]["__value__"])
                url = item["viewItemURL"][0]
                raw_date = item["listingInfo"][0]["endTime"][0]
                sale_date = datetime.fromisoformat(raw_date.replace("Z", "+00:00")).date()
            except Exception as e:
                logging.warning(f"[eBay Sync] Skipping bad item parse: {e}")
                continue

            if sale_date < cutoff.date():
                continue

            exists = db.query(CardSale).filter(
                CardSale.card_id == card.id,
                CardSale.url == url
            ).first()
            if exists:
                continue

            sale = CardSale(
                card_id=card.id,
                price=price,
                sale_date=sale_date,
                url=url,
                source="eBay"
            )
            db.add(sale)
            new_count += 1
            logging.info(
                f"[eBay Sync] Added RAW sale for card {card.id}: ${price} on {sale_date} ({url})"
            )

        # small throttle to avoid eBay 500s
        time.sleep(1)

    db.commit()
    return new_count
