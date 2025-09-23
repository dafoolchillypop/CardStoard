from fastapi import APIRouter, Depends, HTTPException, Response, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
import pyotp, qrcode
from io import BytesIO
from base64 import b64encode
from ..database import get_db
from ..models import User, GlobalSettings
from . import settings as settings_routes  # if you want defaults
from ..auth.security import hash_password, verify_password, create_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterIn(BaseModel):
    email: EmailStr
    password: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str
    totp: str | None = None

@router.post("/register")
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "Email already registered")
    user = User(email=payload.email, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    # create default settings row for the new user
    if not db.query(GlobalSettings).filter(GlobalSettings.user_id == user.id).first():
        s = GlobalSettings(user_id=user.id, app_name="CardStoard")
        db.add(s); db.commit()
    return {"ok": True}

@router.post("/login")
def login(payload: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")

    if user.mfa_enabled:
        # Require TOTP
        if not payload.totp:
            return {"mfa_required": True}
        totp = pyotp.TOTP(user.mfa_secret)
        if not totp.verify(payload.totp, valid_window=1):
            raise HTTPException(401, "Invalid MFA code")

    access = create_token(user.id, "access")
    refresh = create_token(user.id, "refresh")
    # HttpOnly cookies
    response.set_cookie("access_token", access, httponly=True, samesite="Lax", secure=False)
    response.set_cookie("refresh_token", refresh, httponly=True, samesite="Lax", secure=False)
    return {"ok": True}

@router.post("/refresh")
def refresh(request: Request, response: Response):
    import jwt, os
    JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
    JWT_ALG = "HS256"
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(401, "No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    new_access = create_token(payload["sub"], "access")
    response.set_cookie("access_token", new_access, httponly=True, samesite="Lax", secure=False)
    return {"ok": True}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"ok": True}

# ----- MFA enable/verify -----

@router.post("/mfa/setup")
def mfa_setup(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current.mfa_enabled and current.mfa_secret:
        return {"already_enabled": True}

    secret = pyotp.random_base32()
    current.mfa_secret = secret
    db.commit()

    otp_uri = pyotp.totp.TOTP(secret).provisioning_uri(name=current.email, issuer_name="CardStoard")
    # Make QR PNG and return as base64
    img_io = BytesIO()
    qrcode.make(otp_uri).save(img_io, format="PNG")
    b64 = b64encode(img_io.getvalue()).decode()
    return {"secret": secret, "qr_png_base64": f"data:image/png;base64,{b64}"}

class VerifyMFAIn(BaseModel):
    code: str

@router.post("/mfa/enable")
def mfa_enable(payload: VerifyMFAIn, current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current.mfa_secret:
        raise HTTPException(400, "Run setup first")
    totp = pyotp.TOTP(current.mfa_secret)
    if not totp.verify(payload.code, valid_window=1):
        raise HTTPException(400, "Invalid code")
    current.mfa_enabled = True
    db.commit()
    return {"ok": True}

@router.post("/mfa/disable")
def mfa_disable(payload: VerifyMFAIn, current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current.mfa_enabled:
        return {"ok": True}
    totp = pyotp.TOTP(current.mfa_secret) if current.mfa_secret else None
    if totp and not totp.verify(payload.code, valid_window=1):
        raise HTTPException(400, "Invalid code")
    current.mfa_enabled = False
    current.mfa_secret = None
    db.commit()
    return {"ok": True}
