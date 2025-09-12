from sqlalchemy import Column, Integer, String, Boolean, Float, JSON
from .database import Base

class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, index=True, nullable=False)
    last_name = Column(String, index=True, nullable=False)
    year = Column(Integer, index=True)
    brand = Column(String, index=True)
    card_number = Column(String, index=True)

    rookie = Column(Boolean, default=False)
    grade = Column(String, nullable=True)

    value_high = Column(Float, nullable=True)
    value_high_mid = Column(Float, nullable=True)
    value_mid = Column(Float, nullable=True)
    value_low_mid = Column(Float, nullable=True)
    value_low = Column(Float, nullable=True)

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