from sqlalchemy import Column, Integer, String, Boolean, Float, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base
from app.constants import USER_ID_REF

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(32), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))

    # Relationships
    cards = relationship("Card", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("GlobalSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(USER_ID_REF), nullable=False)

    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    year = Column(Integer, nullable=True)
    brand = Column(String, nullable=True)
    card_number = Column(String, nullable=True)
    rookie = Column(Boolean, default=False)

    # grade stored as float, must be one of the 6 valid condition values
    grade = Column(Float, nullable=False)

    # Book values
    book_high = Column(Float, nullable=True)
    book_high_mid = Column(Float, nullable=True)
    book_mid = Column(Float, nullable=True)
    book_low_mid = Column(Float, nullable=True)
    book_low = Column(Float, nullable=True)

    # Computed card value (backend valuation)
    value = Column(Float, nullable=True)

    # Image paths (relative URLs)
    front_image = Column(String, nullable=True)
    back_image = Column(String, nullable=True)

    # Action timestamps
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="cards")

class GlobalSettings(Base):
    __tablename__ = "global_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(USER_ID_REF), nullable=False)
    enable_smart_fill = Column(Boolean, default=False)

    # Relationships
    user = relationship("User", back_populates="settings")

    app_name = Column(String, default="CardStoard")
    card_makes = Column(JSON, default=["Bowman","Donruss","Fleer","Score","Topps","Upper Deck"])
    card_grades = Column(JSON, default=["3","1.5","1","0.8","0.4","0.2"])

    rookie_factor = Column(Float, default=0.80)
    auto_factor   = Column(Float, default=1.00)
    mtgrade_factor = Column(Float, default=0.85)
    exgrade_factor = Column(Float, default=0.75)
    vggrade_factor = Column(Float, default=0.60)
    gdgrade_factor = Column(Float, default=0.55)
    frgrade_factor = Column(Float, default=0.50)
    prgrade_factor = Column(Float, default=0.40)

    vintage_era_year = Column(Integer, default=1970)
    modern_era_year = Column(Integer, default=1980)
    vintage_era_factor = Column(Float, default=1.00)
    modern_era_factor = Column(Float, default=1.00)

class ValuationHistory(Base):
    __tablename__ = "valuation_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(USER_ID_REF), nullable=False)
    timestamp = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)
    total_value = Column(Float, nullable=False)
    card_count = Column(Integer, nullable=False)