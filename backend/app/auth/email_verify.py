# app/auth/email_verify.py

from fastapi import HTTPException, status
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from os import getenv

from app.utils.email_service import send_email
from app.config import cfg_settings

SECRET_KEY = getenv("SECRET_KEY", "dev-secret")
SALT = "email-confirm-salt"

serializer = URLSafeTimedSerializer(SECRET_KEY)

def generate_email_token(email: str) -> str:
    """Create a signed verification token."""
    return serializer.dumps(email, salt=SALT)


def verify_email_token(token: str, max_age: int = 3600) -> str:
    """Validate verification token."""
    try:
        return serializer.loads(token, salt=SALT, max_age=max_age)
    except SignatureExpired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired.",
        )
    except BadSignature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token.",
        )


def send_verification_email(email: str):
    """Build and send verification email with safe HTML/text."""

    token = generate_email_token(email)

    verify_url = f"{cfg_settings.FRONTEND_BASE_URL}/auth/verify?token={token}"

    # 🔹 Recommended — fully descriptive body avoids Gmail spam filters
    body = f"""
Welcome to CardStoard!

To complete your account setup, please verify your email address by visiting the link below:

{verify_url}

If you did not request an account, you can safely ignore this message.

—
CardStoard
https://cardstoard.com
"""

    # 🔹 HTML version (also improves Gmail scoring)
    html = f"""
<html>
  <body style="font-family: Arial, sans-serif; color: #333;">
    <h2>Welcome to <span style="color:#003366;">CardStoard</span>!</h2>
    <p>Thank you for creating an account. Please verify your email address by clicking the button below:</p>

    <p style="margin: 20px 0;">
      <a href="{verify_url}" 
         style="background:#167e30; color:white; padding:10px 20px; 
                border-radius:6px; text-decoration:none; font-weight:bold;">
         Verify Email
      </a>
    </p>

    <p>If the button doesn't work, you can copy and paste this link:</p>
    <p><a href="{verify_url}">{verify_url}</a></p>

    <p style="margin-top: 30px; font-size: 0.9rem; color:#777;">
      — CardStoard<br>
      <a href="https://cardstoard.com">https://cardstoard.com</a>
    </p>
  </body>
</html>
"""

    send_email(
        to_address=email,
        subject="Verify Your CardStoard Account",
        body=body,
        html=html,
    )
