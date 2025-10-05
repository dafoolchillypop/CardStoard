from pydantic import BaseModel

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
