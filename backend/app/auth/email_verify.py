from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from fastapi import HTTPException, status
from os import getenv

SECRET_KEY = getenv("SECRET_KEY", "dev-secret")  # same as your app’s secret
SALT = "email-confirm-salt"

serializer = URLSafeTimedSerializer(SECRET_KEY)

def generate_email_token(email: str) -> str:
    """Create a signed token containing the email."""
    return serializer.dumps(email, salt=SALT)

def verify_email_token(token: str, max_age: int = 3600) -> str:
    """Decode the token and return email if valid."""
    try:
        email = serializer.loads(token, salt=SALT, max_age=max_age)
        return email
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
