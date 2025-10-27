# backend/app/services/ebay_auth.py
import os, time, logging, requests

EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token"
EBAY_SCOPE = "https://api.ebay.com/oauth/api_scope"

_client_id = os.getenv("EBAY_CLIENT_ID")
_client_secret = os.getenv("EBAY_CLIENT_SECRET")

_token_cache = {
    "access_token": None,
    "expires_at": 0
}

def get_access_token() -> str:
    """Fetch or reuse a valid eBay OAuth2 application token."""
    global _token_cache

    # Reuse if not expired
    if _token_cache["access_token"] and time.time() < _token_cache["expires_at"]:
        return _token_cache["access_token"]

    logging.info("[eBay Auth] Requesting new OAuth2 token...")

    resp = requests.post(
        EBAY_TOKEN_URL,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        auth=(_client_id, _client_secret),
        data={"grant_type": "client_credentials", "scope": EBAY_SCOPE},
    )
    if resp.status_code != 200:
        logging.error(f"[eBay Auth] Failed to get token: {resp.text}")
        raise Exception("eBay auth failed")

    data = resp.json()
    _token_cache["access_token"] = data["access_token"]
    _token_cache["expires_at"] = time.time() + data["expires_in"] - 60  # refresh 1m early

    return _token_cache["access_token"]
