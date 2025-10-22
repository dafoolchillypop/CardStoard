# app/routes/test_email.py
from fastapi import APIRouter, HTTPException
from app.utils.email_service import send_email

router = APIRouter(prefix="/test-email", tags=["email"])

@router.get("/")
def test_email(to: str = None):
    """Send a test email using configured SMTP credentials."""
    to_addr = to or "cardstoard.app@gmail.com"
    subject = "CardStoard SMTP Test"
    body = "✅ This is a test email sent from the CardStoard backend using your Gmail SMTP settings."

    success = send_email(to_addr, subject, body)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email.")
    return {"ok": True, "to": to_addr, "message": "Test email sent successfully."}
