import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..auth.security import verify_password, hash_password
from ..auth.cookies import clear_auth_cookie
from ..auth.email_verify import generate_email_token
from ..utils.email_service import send_email
from ..auth.security import get_current_user

router = APIRouter(prefix="/account", tags=["account"])

# ---- Schemas ----

class UpdateUsernameIn(BaseModel):
    username: str

class UpdateEmailIn(BaseModel):
    email: EmailStr

class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str

# ---- Routes ----

@router.get("/")
def get_account(current: User = Depends(get_current_user)):
    return {
        "id": current.id,
        "email": current.email,
        "username": current.username,
        "is_verified": current.is_verified,
        "created_at": current.created_at,
    }

@router.post("/update-username")
def update_username(payload: UpdateUsernameIn, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(400, "Username already taken.")
    current.username = payload.username
    db.commit()
    return {"ok": True, "message": "Username updated successfully."}

@router.post("/update-email")
def update_email(payload: UpdateEmailIn, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "Email already in use.")

    current.email = payload.email
    current.is_verified = False
    db.commit()

    token = generate_email_token(payload.email)
    verify_link = f"{os.getenv('FRONTEND_BASE_URL', 'https://cardstoard.com')}/verify?token={token}"
    send_email(payload.email, "Verify your new email", f"Click to verify your new email: {verify_link}")

    return {"ok": True, "message": "Email updated. Please verify your new address."}

@router.post("/change-password")
def change_password(payload: ChangePasswordIn, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    if not verify_password(payload.current_password, current.password_hash):
        raise HTTPException(400, "Current password is incorrect.")
    current.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"ok": True, "message": "Password changed successfully."}

@router.delete("/delete")
def delete_account(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    db.delete(current)
    db.commit()
    response = {"ok": True, "message": "Account deleted successfully."}
    return response
