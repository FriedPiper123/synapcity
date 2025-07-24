from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    userId: str
    createdAt: datetime
    profileImageUrl: Optional[str] = None
    subscribedAreas: List[str] = []

class User(UserInDB):
    class Config:
        from_attributes = True 