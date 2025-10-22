from sqlalchemy import Column, Integer, String, Boolean, Float, JSON, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

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
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    cards = relationship("Card", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("GlobalSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    year = Column(Integer, nullable=True)
    brand = Column(String, nullable=True)
    card_number = Column(String, nullable=True)
    rookie = Column(Boolean, default=False)

    # ✅ grade stored as float, matches schema & factor logic
    grade = Column(Float, nullable=True)

    # Book values
    book_high = Column(Float, nullable=True)
    book_high_mid = Column(Float, nullable=True)
    book_mid = Column(Float, nullable=True)
    book_low_mid = Column(Float, nullable=True)
    book_low = Column(Float, nullable=True)

    # Image paths (relative URLs)
    front_image = Column(String, nullable=True)
    back_image = Column(String, nullable=True)

    # Action timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="cards")
    sales = relationship("CardSale", back_populates="card", cascade="all, delete-orphan")

class GlobalSettings(Base):
    __tablename__ = "global_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
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

class CardSale(Base):
    __tablename__ = "card_sales"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False, index=True)
    price = Column(Float, nullable=False)
    sale_date = Column(Date, nullable=False)
    source = Column(String, default="eBay")
    url = Column(String, nullable=True)   # <--- add this back
    created_at = Column(DateTime, default=datetime.utcnow)

    card = relationship("Card", back_populates="sales")

