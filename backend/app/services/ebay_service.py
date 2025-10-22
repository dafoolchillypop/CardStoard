# backend/app/services/ebay_service.py
import logging
from datetime import datetime, timedelta
from app.models import Card, CardSale

def sync_recent_sales(db):
    # get all user cards
    cards = db.query(Card).all()
    cutoff = datetime.utcnow() - timedelta(days=1)
    new_count = 0

    for card in cards:
        # 🔑 placeholder search: real eBay API call would use card.year, brand, player, number
        query = f"{card.year} {card.brand} {card.first_name} {card.last_name} #{card.card_number}"
        logging.info(f"[eBay Sync] Fetching sales for: {query}")

        # TODO: call eBay Browse API (sandbox/test for now)
        # Example pseudo-response (pretend we got 1 new sale today):
        sales = [
            {
                "price": 125.50,
                "sale_date": datetime.utcnow().date(),  # today
                "url": "https://www.ebay.com/itm/123456",
                "source": "eBay"
            }
        ]

        for s in sales:
            # normalize sale_date
            sale_date = s["sale_date"].date() if isinstance(s["sale_date"], datetime) else s["sale_date"]

            if sale_date < cutoff.date():
                logging.info(f"[eBay Sync] Skipping old sale ({sale_date}) for card {card.id}")
                continue

            # check duplicate by URL
            exists = db.query(CardSale).filter(
                CardSale.card_id == card.id,
                CardSale.url == s["url"]
            ).first()
            if exists:
                logging.info(f"[eBay Sync] Duplicate sale skipped for card {card.id}: {s['url']}")
                continue

            # insert new sale
            sale = CardSale(
                card_id=card.id,
                price=s["price"],
                sale_date=sale_date,
                url=s["url"],
                source=s["source"]
            )
            db.add(sale)
            new_count += 1
            logging.info(
                f"[eBay Sync] Added sale for card {card.id}: ${s['price']} on {sale_date} ({s['url']})"
            )

    db.commit()
    return new_count
