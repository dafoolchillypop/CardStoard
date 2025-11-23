# app/utils/email_service.py

import os
import smtplib
import email.utils
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
    Production-safe Gmail SMTP sender.
    Adds Message-ID, Date, RFC-compliant headers, UTF-8 handling, and a proper envelope sender.
    """

    try:
        # RFC-compliant From header
        msg = MIMEMultipart("alternative")
        msg["From"] = email.utils.formataddr((MAIL_FROM_NAME, MAIL_FROM))
        msg["To"] = to_address
        msg["Subject"] = subject

        # Required for Gmail → Gmail delivery
        msg["Date"] = email.utils.formatdate(localtime=True)
        msg["Message-ID"] = email.utils.make_msgid(domain="cardstoard.com")

        # Plain text part
        msg.attach(MIMEText(body, "plain", "utf-8"))

        # Optional HTML part
        if html:
            msg.attach(MIMEText(html, "html", "utf-8"))

        # Send email through Gmail SMTP
        with smtplib.SMTP(MAIL_SERVER, MAIL_PORT) as server:
            # Required for many Gmail auth setups
            server.ehlo()
            server.starttls()
            server.ehlo()

            server.login(MAIL_USERNAME, MAIL_PASSWORD)

            # Send from MAIL_FROM (envelope sender) to avoid DMARC/ARC failures inside Gmail
            server.sendmail(MAIL_FROM, [to_address], msg.as_string())

        print(f"✅ Email sent to {to_address}")
        return True

    except Exception as e:
        print(f"❌ Email send failed: {e}")
        return False
