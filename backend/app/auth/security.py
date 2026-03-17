"""
backend/app/auth/security.py
-----------------------------
Authentication utilities: password hashing, JWT creation, and the
get_current_user dependency used by all protected endpoints.

Token types:
- access  — short-lived (ACCESS_MIN minutes), stored in HttpOnly cookie
- refresh — long-lived (REFRESH_DAYS days), stored in HttpOnly cookie

Silent refresh: get_current_user() attempts to auto-refresh an expired access
token using the refresh cookie, issuing a new token via request.state. The HTTP
middleware in main.py picks this up and sets the new cookie on the response.
"""
from datetime import datetime, timezone, timedelta
import jwt, bcrypt
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..config import cfg_settings   # single source of truth for token config

def hash_password(pw: str) -> str:
    """Hash a plaintext password using bcrypt. Returns the hashed string."""
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, pw_hash: str) -> bool:
    """Compare a plaintext password against a stored bcrypt hash."""
    return bcrypt.checkpw(pw.encode(), pw_hash.encode())

def create_token(sub: int, kind: str = "access"):
    """
    Create a signed JWT with the user id as subject.

    Args:
        sub:  User.id to embed as the 'sub' claim.
        kind: "access" (short-lived) or "refresh" (long-lived).

    Returns a signed JWT string using HS256 and the configured JWT_SECRET.
    """
    now = datetime.now(timezone.utc)
    exp = now + (
        timedelta(minutes=cfg_settings.ACCESS_MIN)
        if kind == "access"
        else timedelta(days=cfg_settings.REFRESH_DAYS)
    )
    return jwt.encode(
        {"sub": sub, "type": kind, "exp": exp},
        cfg_settings.JWT_SECRET,
        algorithm=cfg_settings.JWT_ALG,
    )

bearer = HTTPBearer(auto_error=False)

def get_current_user(request: Request, db: Session = Depends(get_db)):
    """
    FastAPI dependency that validates the access token cookie and returns the User.

    Flow:
    1. Read access_token cookie — 401 if missing.
    2. Decode JWT — if valid, look up and return user.
    3. If expired — attempt silent refresh using refresh_token cookie:
         a. Decode refresh token — 401 if missing or invalid.
         b. Issue a new access token stored on request.state.new_access_token.
         c. The HTTP middleware (main.py) attaches it to the response automatically.
    4. 401 if token is invalid for any other reason.
    """
    access_token = request.cookies.get("access_token")
    refresh_token = request.cookies.get("refresh_token")
    if not access_token:
        raise HTTPException(401, "No access token")

    try:
        payload = jwt.decode(access_token, cfg_settings.JWT_SECRET, algorithms=[cfg_settings.JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
    except jwt.ExpiredSignatureError:
        # ⏳ Access expired — try refresh
        if not refresh_token:
            raise HTTPException(401, "Token expired")

        try:
            refresh_payload = jwt.decode(refresh_token, cfg_settings.JWT_SECRET, algorithms=[cfg_settings.JWT_ALG])
            if refresh_payload.get("type") != "refresh":
                raise HTTPException(401, "Invalid refresh token")
        except jwt.PyJWTError:
            raise HTTPException(401, "Invalid refresh token")

        # issue new access token
        new_access = create_token(refresh_payload["sub"], "access")
        request.state.new_access_token = new_access

        payload = {"sub": refresh_payload["sub"], "type": "access"}

    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")

    # lookup user
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(401, "User not found")

    return user
