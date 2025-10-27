import logging
from os import getenv

LADDER_API_BASE = getenv("CARDLADDER_API_BASE")
LADDER_API_KEY = getenv("CARDLADDER_API_KEY")

def fetch_cardladder_sales(db, card, limit: int = 10):
    if not LADDER_API_KEY or not LADDER_API_BASE:
        logging.error("[CardLadder] Missing API configuration")
        return 0
    # TODO: implement once API docs are in hand
    return 0
