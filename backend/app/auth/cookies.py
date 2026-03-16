# backend/app/auth/cookies.py
"""
Cookie helpers for JWT auth tokens.

All cookies are HttpOnly to prevent JavaScript access. Production mode sets
Secure=True and SameSite=None (required for cross-origin cookie delivery via
the Nginx /api proxy). Dev mode uses SameSite=Lax and no Secure flag.

IS_PROD is determined by the ENV environment variable ("prod" = production).
"""

import os
from fastapi import Response
from ..config import cfg_settings

IS_PROD = os.getenv("ENV") == "prod"

def _cookie_kwargs():
    """
    Return environment-aware keyword args for set_cookie / delete_cookie calls.
    Centralised so all cookie setters use consistent security attributes.
    """
    return {
        "httponly": True,
        "samesite": "None" if IS_PROD else "Lax",
        "secure": True if IS_PROD else False,
        "domain": "cardstoard.com" if IS_PROD else None,
        "path": "/",
    }

def set_auth_cookie(response: Response, key: str, value: str, max_age: int | None = None):
    """Generic setter used by routes that already call set_auth_cookie(key, value)."""
    kwargs = _cookie_kwargs()
    if max_age is None:
        max_age = getattr(cfg_settings, "ACCESS_MIN", 15) * 60
    response.set_cookie(key=key, value=value, max_age=max_age, **kwargs)

def set_access_cookie(response: Response, value: str):
    """Set the access_token HttpOnly cookie. Expires in ACCESS_MIN minutes."""
    response.set_cookie(
        key="access_token",
        value=value,
        max_age=getattr(cfg_settings, "ACCESS_MIN", 15) * 60,
        **_cookie_kwargs(),
    )

def set_refresh_cookie(response: Response, value: str):
    """Set the refresh_token HttpOnly cookie. Expires in REFRESH_DAYS days."""
    response.set_cookie(
        key="refresh_token",
        value=value,
        max_age=getattr(cfg_settings, "REFRESH_DAYS", 14) * 86400,
        **_cookie_kwargs(),
    )

def clear_auth_cookie(response: Response):
    """
    Forcefully clear both access and refresh tokens for all environments.
    Ensures same attributes used for set_cookie but broad enough to cover localhost.
    """
    base_kwargs = _cookie_kwargs()

    # normal delete
    response.delete_cookie("access_token", **base_kwargs)
    response.delete_cookie("refresh_token", **base_kwargs)

    # extra safety: also clear with domain=None and domain="cardstoard.com"
    for domain in [None, "cardstoard.com"]:
        response.delete_cookie("access_token", path="/", domain=domain)
        response.delete_cookie("refresh_token", path="/", domain=domain)
