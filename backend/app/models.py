from sqlalchemy import Column, Integer, String, Boolean, Float
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
