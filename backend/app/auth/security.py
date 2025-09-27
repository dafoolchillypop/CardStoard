import datetime, jwt, bcrypt
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..config import cfg_settings   # 🔑 single source of truth

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, pw_hash: str) -> bool:
    return bcrypt.checkpw(pw.encode(), pw_hash.encode())

def create_token(sub: int, kind: str = "access"):
    now = datetime.datetime.utcnow()
    exp = now + (
        datetime.timedelta(minutes=cfg_settings.ACCESS_MIN)
        if kind == "access"
        else datetime.timedelta(days=cfg_settings.REFRESH_DAYS)
    )
    return jwt.encode(
        {"sub": sub, "type": kind, "exp": exp},
        cfg_settings.JWT_SECRET,
        algorithm=cfg_settings.JWT_ALG,
    )

bearer = HTTPBearer(auto_error=False)

def get_current_user(request: Request, db: Session = Depends(get_db)):
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
