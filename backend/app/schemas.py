from pydantic import BaseModel, EmailStr
from typing import List, Optional

class CardBase(BaseModel):
    first_name: str
    last_name: str
    year: Optional[int] = None
    brand: Optional[str] = None
    card_number: Optional[str] = None
    rookie: Optional[bool] = False
    grade: Optional[float] = None

    book_high: Optional[float] = None
    book_high_mid: Optional[float] = None
    book_mid: Optional[float] = None
    book_low_mid: Optional[float] = None
    book_low: Optional[float] = None

    # ✅ Always return relative paths
    front_image: Optional[str] = None
    back_image: Optional[str] = None

class CardCreate(CardBase):
    pass

class CardUpdate(BaseModel):
    # Allow partial updates, not full inheritance
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    year: Optional[int] = None
    brand: Optional[str] = None
    card_number: Optional[str] = None
    rookie: Optional[bool] = None
    grade: Optional[float] = None

    book_high: Optional[float] = None
    book_high_mid: Optional[float] = None
    book_mid: Optional[float] = None
    book_low_mid: Optional[float] = None
    book_low: Optional[float] = None

    front_image: Optional[str] = None
    back_image: Optional[str] = None

class Card(CardBase):
    id: int
    user_id: int   # ✅ include owner

    class Config:
        from_attributes = True

class GlobalSettingsBase(BaseModel):
    app_name: Optional[str] = "CardStoard"
    card_makes: Optional[List[str]] = ["Bowman","Donruss","Fleer","Score","Topps","Upper Deck"]
    card_grades: Optional[List[str]] = ["3","1.5","1","0.8","0.4","0.2"]

    rookie_factor: Optional[float] = .80
    auto_factor: Optional[float] = 1.00
    mtgrade_factor: Optional[float] = .85
    exgrade_factor: Optional[float] = .75
    vggrade_factor: Optional[float] = .60
    gdgrade_factor: Optional[float] = .55
    frgrade_factor: Optional[float] = .50
    prgrade_factor: Optional[float] = .40

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
    user_id: int

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int
    is_verified: bool

    class Config:
        orm_mode = True