import os
from pydantic_settings import BaseSettings
from pydantic import Extra

class Settings(BaseSettings):
    MAIL_USERNAME: str = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD: str = os.getenv("MAIL_PASSWORD", "")
    MAIL_FROM: str = os.getenv("MAIL_FROM", "")
    MAIL_PORT: int = int(os.getenv("MAIL_PORT", "587"))
    MAIL_SERVER: str = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_FROM_NAME: str = os.getenv("MAIL_FROM_NAME", "CardStoard")
    MAIL_TLS: bool = bool(os.getenv("MAIL_TLS", "True").lower() == "true")
    MAIL_SSL: bool = bool(os.getenv("MAIL_SSL", "False").lower() == "true")

    class Config:
        # Ignore extra env vars like FRONTEND_BASE_URL, REACT_APP_API_BASE, etc.
        extra = Extra.ignore
        # Optional local fallback
        env_file = ".env" if os.path.exists(".env") else None