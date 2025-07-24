from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

class PostType(str, Enum):
    ISSUE = "issue"
    SUGGESTION = "suggestion"
    EVENT = "event"
    RESOLVED = "resolved"

class PostCategory(str, Enum):
    INFRASTRUCTURE = "infrastructure"
    SAFETY = "safety"
    WATER_SHORTAGE = "water_shortage"
    POWER_OUTAGE = "power_outage"
    WASTE_MANAGEMENT = "waste_management"
    TRANSPORTATION = "transportation"
    COMMUNITY = "community"
    OTHER = "other"

class PostStatus(str, Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"
    PENDING = "pending"

class GeoPoint(BaseModel):
    latitude: float
    longitude: float

class PostBase(BaseModel):
    content: str
    type: str
    category: str
    location: GeoPoint
    neighborhood: str
    mediaUrl: Optional[str] = None
    parentId: Optional[str] = None
    geohash: Optional[str] = None  # Added geohash field for efficient location queries

    
class PostCreate(PostBase):
    def __init__(self, **data):
        from pprint import pprint
        pprint(data)
        try:
            super().__init__(**data)
        except Exception as e:
            print("Failed to create PostCreate:", e)
            raise

class PostUpdate(BaseModel):
    content: Optional[str] = None
    status: Optional[PostStatus] = None

class Post(PostBase):
    postId: str
    authorId: Optional[str] = None
    author: Optional[dict] = None  # New: author details (username, profileImageUrl)
    upvotes: int = 0
    downvotes: int = 0
    upvotedBy: List[str] = []
    downvotedBy: List[str] = []
    commentCount: int = 0
    createdAt: datetime
    status: PostStatus = PostStatus.ACTIVE
    
    class Config:
        from_attributes = True 