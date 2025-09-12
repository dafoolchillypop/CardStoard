from pydantic import BaseModel
from typing import Optional

class CardBase(BaseModel):
    first_name: str
    last_name: str
    year: Optional[int] = None
    brand: Optional[str] = None
    card_number: Optional[str] = None
    rookie: Optional[bool] = False
    grade: Optional[str] = None

    value_high: Optional[float] = None
    value_high_mid: Optional[float] = None
    value_mid: Optional[float] = None
    value_low_mid: Optional[float] = None
    value_low: Optional[float] = None

class CardCreate(CardBase):
    pass

class CardUpdate(CardBase):
    pass

class Card(CardBase):
    id: int

    class Config:
        from_attributes = True
