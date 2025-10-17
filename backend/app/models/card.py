from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from .base import Base

class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    player = Column(String, index=True)
    year = Column(Integer)
    image_path = Column(String, nullable=True)  # path to stored photo
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
