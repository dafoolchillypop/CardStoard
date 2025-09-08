from pydantic import BaseModel


# 🔹 Base schema (shared properties)
class CardBase(BaseModel):
    player_name: str
    team: str | None = None
    year: int | None = None
    brand: str | None = None
    rookie: bool | None = False


# 🔹 Schema for creating a new card
class CardCreate(CardBase):
    pass


# 🔹 Schema for reading a card (includes id)
class Card(CardBase):
    id: int

    class Config:
        from_attributes = True  # replaces orm_mode in Pydantic v2
