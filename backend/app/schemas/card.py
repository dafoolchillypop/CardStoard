from pydantic import BaseModel

class CardBase(BaseModel):
    player: str
    year: int

class CardCreate(CardBase):
    pass

class Card(CardBase):
    id: int
    image_path: str | None

    class Config:
        orm_mode = True
