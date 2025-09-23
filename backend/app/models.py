from sqlalchemy import Column, Integer, String, Boolean, Float, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(32), nullable=True)   # base32 TOTP secret
    created_at = Column(DateTime, default=datetime.utcnow)

    cards = relationship("Card", back_populates="owner", cascade="all, delete-orphan")
    settings = relationship("GlobalSettings", back_populates="owner", uselist=False, cascade="all, delete-orphan")

class Card(Base):
    __tablename__ = "cards"

    # Columns
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, index=True, nullable=False)
    last_name = Column(String, index=True, nullable=False)
    year = Column(Integer, index=True)
    brand = Column(String, index=True)
    card_number = Column(String, index=True)
    rookie = Column(Boolean, default=False)
    grade = Column(String, nullable=True)
    book_high = Column(Float, nullable=True)
    book_high_mid = Column(Float, nullable=True)
    book_mid = Column(Float, nullable=True)
    book_low_mid = Column(Float, nullable=True)
    book_low = Column(Float, nullable=True)

    # Photos
    front_image = Column(String, nullable=True)  
    back_image = Column(String, nullable=True)  

    # Auth
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    owner = relationship("User", back_populates="cards")

class GlobalSettings(Base):
    __tablename__ = "global_settings"

    id = Column(Integer, primary_key=True, index=True)

    app_name = Column(String, default="Baseball Memorabilia App")
    card_makes = Column(JSON, default=["Donruss","Fleer","Topps"])
    card_grades = Column(JSON, default=["3.0","1.5","1.0","0.8","0.4","0.2"])

    rookie_factor = Column(Float, default=1.00)
    auto_factor = Column(Float, default=1.00)
    mtgrade_factor = Column(Float, default=1.00)
    exgrade_factor = Column(Float, default=1.00)
    vggrade_factor = Column(Float, default=1.00)
    gdgrade_factor = Column(Float, default=1.00)
    frgrade_factor = Column(Float, default=1.00)
    prgrade_factor = Column(Float, default=1.00)

    vintage_era_year = Column(Integer, default=1970)
    modern_era_year = Column(Integer, default=1980)

    vintage_era_factor = Column(Float, default=1.00)
    modern_era_factor = Column(Float, default=1.00)