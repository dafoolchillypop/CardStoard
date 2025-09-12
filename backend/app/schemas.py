from pydantic import BaseModel
from typing import List, Optional

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

class GlobalSettingsBase(BaseModel):
    app_name: Optional[str] = "CardStoard"
    card_makes: Optional[List[str]] = []
    card_grades: Optional[List[int]] = []

    rookie_factor: Optional[float] = 1.00
    auto_factor: Optional[float] = 1.00
    mtgrade_factor: Optional[float] = 1.00
    exgrade_factor: Optional[float] = 1.00
    vggrade_factor: Optional[float] = 1.00
    gdgrade_factor: Optional[float] = 1.00
    frgrade_factor: Optional[float] = 1.00
    prgrade_factor: Optional[float] = 1.00

    vintage_era_year: Optional[int] = 1970
    modern_era_year: Optional[int] = 1980

    vintage_era_factor: Optional[float] = 1.00
    modern_era_factor: Optional[float] = 1.00

class GlobalSettingsCreate(GlobalSettingsBase):
    pass

class GlobalSettingsUpdate(GlobalSettingsBase):
    pass

class GlobalSettings(GlobalSettingsBase):
    id: int

    class Config:
        from_attributes = True