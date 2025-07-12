from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    profileImageUrl: Optional[str] = None
    subscribedAreas: List[str] = Field(default_factory=list)

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    profileImageUrl: Optional[str] = None
    subscribedAreas: Optional[List[str]] = None

class User(UserBase):
    userId: str
    createdAt: datetime
    
    class Config:
        from_attributes = True
