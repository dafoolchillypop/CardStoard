from sqlalchemy import Column, Integer, String, Boolean
from .database import Base


class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    player_name = Column(String, index=True, nullable=False)
    team = Column(String, index=True, nullable=True)
    year = Column(Integer, index=True, nullable=True)
    brand = Column(String, index=True, nullable=True)
    rookie = Column(Boolean, default=False)
