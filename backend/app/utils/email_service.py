# app/utils/email_service.py
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
MAIL_FROM = os.getenv("MAIL_FROM", MAIL_USERNAME)
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "CardStoard")

def send_email(to_address: str, subject: str, body: str, html: str | None = None) -> bool:
    """
    Send a plain-text or HTML email using Gmail SMTP credentials.
    Returns True if successful, False otherwise.
    """
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{MAIL_FROM_NAME} <{MAIL_FROM}>"
        msg["To"] = to_address
        msg["Subject"] = subject

        # Plain text
        msg.attach(MIMEText(body, "plain"))
        # Optional HTML
        if html:
            msg.attach(MIMEText(html, "html"))

        # Optional debug mode
        if MAIL_SERVER.lower() == "debug":
            print(f"\n📧 [DEBUG EMAIL]\nTo: {to_address}\nSubject: {subject}\nBody:\n{body}\n")
            return True

        with smtplib.SMTP(MAIL_SERVER, MAIL_PORT) as server:
            server.starttls()
            server.login(MAIL_USERNAME, MAIL_PASSWORD)
            server.send_message(msg)

        print(f"✅ Email sent to {to_address}")
        return True

    except Exception as e:
        print(f"❌ Email send failed: {e}")
        return False
