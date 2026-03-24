"""
backend/app/models.py
----------------------
SQLAlchemy ORM models — one class per database table.

Models and tables:
  User             → users              Auth accounts
  Card             → cards              Individual card inventory entries
  GlobalSettings   → global_settings    Per-user configuration (1:1 with User)
  SetList          → sets               Reference set definitions (global, shared)
  SetEntry         → set_entries        Cards within a reference set (global)
  UserSetCard      → user_set_cards     Per-user build progress overlay on a set
  BoxBinder        → boxes_binders      Physical set/binder containers owned by a user
  AutoBall         → auto_balls         Autographed baseballs owned by a user
  ValuationHistory → valuation_history  Time-series collection value snapshots
  DictionaryEntry  → dictionary_entries Global player/card reference for Smart Fill

Key constraints:
- User.cards and User.settings are cascade-deleted when User is deleted.
- SetEntry rows must NOT be deleted if referenced by UserSetCard rows (FK constraint).
- BoxBinder.quantity column is nullable in DB (SQLAlchemy create_all doesn't enforce NOT NULL
  for default-only columns); Pydantic coerces NULL → 1 in BoxBinderOut.

See migrations/ for schema change history (001–018).
"""
from sqlalchemy import Column, Integer, String, Boolean, Float, JSON, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base
from app.constants import USER_ID_REF

class User(Base):
    """Auth account. Related 1:1 to GlobalSettings and 1:N to Card, BoxBinder, UserSetCard, ValuationHistory."""
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
    last_login = Column(DateTime, nullable=True)

    # Relationships
    cards = relationship("Card", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("GlobalSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Card(Base):
    """Individual card in a user's collection. Grade must be one of VALID_GRADES (3.0/1.5/1.0/0.8/0.4/0.2)."""
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
    previous_value = Column(Float, nullable=True)
    value_changed_at = Column(DateTime, nullable=True)
    book_values_updated_at = Column(DateTime, nullable=True)

    # Free-text notes
    notes = Column(Text, nullable=True)

    # Card variant attributes (JSON: parallel, refractor, short_print, autograph, numbered, traded, subset)
    card_attributes = Column(JSON, nullable=True, default=dict)

    # Image paths (relative URLs)
    front_image = Column(String, nullable=True)
    back_image = Column(String, nullable=True)

    # Action timestamps
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="cards")

class GlobalSettings(Base):
    """Per-user app configuration: valuation factors, UI preferences, feature flags, dark mode."""
    __tablename__ = "global_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(USER_ID_REF), nullable=False)
    enable_smart_fill = Column(Boolean, default=False)
    chatbot_enabled = Column(Boolean, default=False)

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

    row_color_rookie = Column(String, default="#fff3c4")
    row_color_grade3 = Column(String, default="#e8dcff")
    row_color_rookie_grade3 = Column(String, default="#b8d8f7")

    dark_mode = Column(Boolean, default=False)
    default_sort = Column(JSON, nullable=True, default=None)
    default_sort_boxes = Column(JSON, nullable=True, default=None)
    default_sort_balls = Column(JSON, nullable=True, default=None)
    visible_set_ids = Column(JSON, nullable=True, default=None)
    nav_items = Column(JSON, nullable=True, default=None)
    pinned_card_id = Column(Integer, nullable=True)
    pinned_ball_id = Column(Integer, nullable=True)

class SetList(Base):
    """Global reference set definition (e.g. '1952 Topps Baseball'). Not user-scoped."""
    __tablename__ = "sets"
    id         = Column(Integer, primary_key=True)
    name       = Column(String, nullable=False)
    brand      = Column(String, nullable=False)
    year       = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    entries    = relationship("SetEntry", back_populates="set_list", cascade="all, delete-orphan")

class SetEntry(Base):
    """A single card slot within a global SetList. Referenced by UserSetCard — do not delete rows in use."""
    __tablename__ = "set_entries"
    id          = Column(Integer, primary_key=True)
    set_id      = Column(Integer, ForeignKey("sets.id"))
    card_number = Column(String, nullable=False)
    first_name  = Column(String, nullable=True)
    last_name   = Column(String, nullable=True)
    rookie      = Column(Boolean, default=False)
    set_list    = relationship("SetList", back_populates="entries")

class UserSetCard(Base):
    """Per-user overlay on a SetEntry — tracks which set cards the user owns plus grade/value/notes."""
    __tablename__ = "user_set_cards"
    id                     = Column(Integer, primary_key=True)
    user_id                = Column(Integer, ForeignKey(USER_ID_REF))
    set_entry_id           = Column(Integer, ForeignKey("set_entries.id"))
    grade                  = Column(Float, nullable=True)
    book_high              = Column(Float, nullable=True)
    book_high_mid          = Column(Float, nullable=True)
    book_mid               = Column(Float, nullable=True)
    book_low_mid           = Column(Float, nullable=True)
    book_low               = Column(Float, nullable=True)
    value                  = Column(Float, nullable=True)
    notes                  = Column(Text, nullable=True)
    book_values_updated_at = Column(DateTime, nullable=True)
    updated_at             = Column(DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

class BoxBinder(Base):
    """Physical container (factory set, collated set, or binder) owned by a user.
    NOTE: quantity column is nullable in the DB — Pydantic coerces NULL→1 via BoxBinderOut validator."""
    __tablename__ = "boxes_binders"
    id         = Column(Integer, primary_key=True)
    user_id    = Column(Integer, ForeignKey(USER_ID_REF), nullable=False)
    brand      = Column(String, nullable=False)
    year       = Column(Integer, nullable=False)
    name       = Column(String, nullable=True)
    set_type   = Column(String, nullable=False, default="factory")
    quantity   = Column(Integer, default=1)
    value      = Column(Float, nullable=True)
    notes      = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))
    user       = relationship("User")

class AutoBall(Base):
    """Autographed baseball owned by a user. Tracks signer, brand, commissioner, COA, inscription, and value."""
    __tablename__ = "auto_balls"
    id               = Column(Integer, primary_key=True)
    user_id          = Column(Integer, ForeignKey(USER_ID_REF), nullable=False)
    first_name       = Column(String, nullable=False)
    last_name        = Column(String, nullable=False)
    brand            = Column(String, nullable=True)
    commissioner     = Column(String, nullable=True)
    auth             = Column(Boolean, default=False)
    inscription      = Column(Text, nullable=True)
    value            = Column(Float, nullable=True)
    value_updated_at = Column(DateTime, nullable=True)
    notes            = Column(Text, nullable=True)
    created_at       = Column(DateTime, default=datetime.now(timezone.utc))
    updated_at       = Column(DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))
    user             = relationship("User")

class ValuationHistory(Base):
    """Snapshot of a user's total collection value at a point in time. Created by POST /cards/revalue-all."""
    __tablename__ = "valuation_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(USER_ID_REF), nullable=False)
    timestamp = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)
    total_value = Column(Float, nullable=False)
    card_count = Column(Integer, nullable=False)

class DictionaryEntry(Base):
    """Global player/card reference used for Smart Fill lookups. Not user-scoped. Seeded on startup.
    Book value columns (book_high through book_low) are admin-maintained via CSV import and
    auto-filled by Smart Fill when adding cards. book_values_imported_at tracks the last import."""
    __tablename__ = "dictionary_entries"
    id          = Column(Integer, primary_key=True, index=True)
    first_name  = Column(String, nullable=False)
    last_name   = Column(String, nullable=False)
    rookie_year = Column(Integer, nullable=True)
    brand       = Column(String, nullable=False)
    year        = Column(Integer, nullable=False)
    card_number = Column(String, nullable=False)

    # Book values — nullable; populated via CSV import or seed-from-cards
    book_high               = Column(Float, nullable=True)
    book_high_mid           = Column(Float, nullable=True)
    book_mid                = Column(Float, nullable=True)
    book_low_mid            = Column(Float, nullable=True)
    book_low                = Column(Float, nullable=True)
    book_values_imported_at = Column(DateTime, nullable=True)