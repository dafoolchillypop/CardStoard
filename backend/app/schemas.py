from pydantic import BaseModel, EmailStr, field_validator
from typing import List, Optional

VALID_GRADES = {3.0, 1.5, 1.0, 0.8, 0.4, 0.2}

class CardBase(BaseModel):
    first_name: str
    last_name: str
    year: Optional[int] = None
    brand: Optional[str] = None
    card_number: Optional[str] = None
    rookie: Optional[bool] = False
    grade: float

    @field_validator("grade")
    @classmethod
    def grade_must_be_valid(cls, v: float) -> float:
        if v not in VALID_GRADES:
            raise ValueError(f"grade must be one of {sorted(VALID_GRADES)}")
        return v

    book_high: Optional[float] = None
    book_high_mid: Optional[float] = None
    book_mid: Optional[float] = None
    book_low_mid: Optional[float] = None
    book_low: Optional[float] = None
    market_factor: Optional[float] = None
    value: Optional[float] = None


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

    @field_validator("grade")
    @classmethod
    def grade_must_be_valid(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v not in VALID_GRADES:
            raise ValueError(f"grade must be one of {sorted(VALID_GRADES)}")
        return v

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
    enable_smart_fill: bool = False
    chatbot_enabled: bool = False

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

    row_color_rookie: Optional[str] = "#fff3c4"
    row_color_grade3: Optional[str] = "#e8dcff"
    row_color_rookie_grade3: Optional[str] = "#b8d8f7"

    dark_mode: bool = False

class GlobalSettingsCreate(GlobalSettingsBase):
    pass

class GlobalSettingsUpdate(BaseModel):
    app_name: Optional[str] = None
    card_makes: Optional[List[str]] = None
    card_grades: Optional[List[str]] = None
    enable_smart_fill: Optional[bool] = None
    chatbot_enabled: Optional[bool] = None

    rookie_factor: Optional[float] = None
    auto_factor: Optional[float] = None
    mtgrade_factor: Optional[float] = None
    exgrade_factor: Optional[float] = None
    vggrade_factor: Optional[float] = None
    gdgrade_factor: Optional[float] = None
    frgrade_factor: Optional[float] = None
    prgrade_factor: Optional[float] = None

    vintage_era_year: Optional[int] = None
    modern_era_year: Optional[int] = None
    vintage_era_factor: Optional[float] = None
    modern_era_factor: Optional[float] = None

    row_color_rookie: Optional[str] = None
    row_color_grade3: Optional[str] = None
    row_color_rookie_grade3: Optional[str] = None

    dark_mode: Optional[bool] = None

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

class DictionaryEntryBase(BaseModel):
    first_name: str
    last_name: str
    rookie_year: int
    brand: str
    year: int
    card_number: str

class DictionaryEntryCreate(DictionaryEntryBase):
    pass

class DictionaryEntryRead(DictionaryEntryBase):
    id: int
    in_collection: bool = False

    class Config:
        from_attributes = True