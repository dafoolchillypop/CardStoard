from fastapi import APIRouter, Depends, HTTPException, Response, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
import pyotp, qrcode, os, jwt
from io import BytesIO
from base64 import b64encode
from ..database import get_db
from ..models import User, GlobalSettings
from ..schemas import UserCreate
from ..auth.security import hash_password, verify_password, create_token, get_current_user
from ..auth.cookies import set_auth_cookie, set_access_cookie, clear_auth_cookie
from ..auth.email_verify import generate_email_token, verify_email_token
from ..utils.email_service import send_email

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterIn(BaseModel):
    email: EmailStr
    password: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str
    totp: str | None = None

#--Registration--#

@router.post("/register")
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # Prevent duplicates
    if db.query(User).filter((User.email == user.email) | (User.username == user.username)).first():
        raise HTTPException(status_code=400, detail="Email or username already taken")

    hashed_pw = hash_password(user.password)
    new_user = User(
        email=user.email,
        username=user.username,
        password_hash=hashed_pw,
        is_verified=False,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # create default settings row for the new user
    if not db.query(GlobalSettings).filter(GlobalSettings.user_id == new_user.id).first():
        s = GlobalSettings(user_id=new_user.id, app_name="CardStoard")
        db.add(s); db.commit()

    # Dynamically set base URL depending on environment
    backend_base_url = os.getenv("BACKEND_BASE_URL", "http://localhost:8000")

    # Generate verification link
    token = generate_email_token(new_user.email)
    verify_link = f"{backend_base_url}/auth/verify?token={token}"

    # verification email structure
    subject = "Verify your CardStoard account"
    body = f"""
    Welcome to CardStoard!

    Please verify your email by clicking the link below:

    {verify_link}

    If you did not register for CardStoard, please ignore this message.
    """
    
    # send verification email
    send_email(new_user.email, subject, body)
    
    return {"ok": True, "message": f"Verification email sent to {new_user.email}"}

#--Login--#

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

    if not user.is_verified:
        raise HTTPException(403, "Email not verified. Please check your inbox.")

    access = create_token(user.id, "access")
    refresh = create_token(user.id, "refresh")

    set_auth_cookie(response, "access_token", access)
    set_auth_cookie(response, "refresh_token", refresh)

    return {
        "ok": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "is_verified": user.is_verified,
            "is_active": user.is_active,
        },
    }

#--Verification--#

from fastapi.responses import RedirectResponse, HTMLResponse

@router.get("/verify")
def verify_email(token: str, db: Session = Depends(get_db)):
    """Confirm a user's email address and redirect to success page."""
    email = verify_email_token(token)
    user = db.query(User).filter(User.email == email).first()

    # Dynamically set base URL depending on environment
    frontend_base_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")

    if not user:
        # Optional: redirect to a frontend error page instead of raising HTTPException
        return RedirectResponse(url=f"{frontend_base_url}/verify-error")

    if not user.is_verified:
        user.is_verified = True
        db.commit()

    # ✅ Redirect to frontend success page
    return RedirectResponse(url=f"{frontend_base_url}/verify-success")

#--Refresh--#

@router.post("/refresh")
def refresh(request: Request, response: Response):
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
    set_access_cookie(response, new_access)

    return {"ok": True}

#--Logout--#

@router.post("/logout")
def logout(response: Response):
    clear_auth_cookie(response)
    return {"ok": True, "message": "Logged out"}

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

@router.get("/me")
def me(current: User = Depends(get_current_user)):
    return {
        "id": current.id,
        "email": current.email,
        "username": current.username,
        "is_verified": current.is_verified,
        "is_active": current.is_active,
    }