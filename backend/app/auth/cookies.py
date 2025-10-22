# backend/app/auth/cookies.py

import os
from fastapi import Response
from app.config import cfg_settings

IS_PROD = os.getenv("ENV") == "prod"

def _cookie_kwargs():
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
    response.set_cookie(
        key="access_token",
        value=value,
        max_age=getattr(cfg_settings, "ACCESS_MIN", 15) * 60,
        **_cookie_kwargs(),
    )

def set_refresh_cookie(response: Response, value: str):
    response.set_cookie(
        key="refresh_token",
        value=value,
        max_age=getattr(cfg_settings, "REFRESH_DAYS", 14) * 86400,
        **_cookie_kwargs(),
    )

def clear_auth_cookie(response: Response):
    kwargs = _cookie_kwargs()
    response.delete_cookie("access_token", **kwargs)
    response.delete_cookie("refresh_token", **kwargs)
