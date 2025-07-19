from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

class PostType(str, Enum):
    TRAFFIC = "traffic"
    CIVIC_ISSUE = "civic_issue"
    COMMUNITY = "community"
    EVENT = "event"

class PostCategory(str, Enum):
    ACCIDENT = "accident"
    CONGESTION = "congestion"
    ROAD_CLOSURE = "road_closure"
    POWER_OUTAGE = "power_outage"
    WATER_SHORTAGE = "water_shortage"
    WASTE_MANAGEMENT = "waste_management"
    SAFETY = "safety"
    OTHER = "other"

class PostStatus(str, Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"
    PENDING = "pending"

class GeoPoint(BaseModel):
    latitude: float
    longitude: float

class PostBase(BaseModel):
    text: str
    type: PostType
    category: PostCategory
    location: GeoPoint
    neighborhood: str
    mediaUrl: Optional[str] = None

class PostCreate(PostBase):
    pass

class PostUpdate(BaseModel):
    text: Optional[str] = None
    status: Optional[PostStatus] = None

class Post(PostBase):
    postId: str
    authorId: str
    upvotes: int = 0
    downvotes: int = 0
    upvotedBy: List[str] = []
    downvotedBy: List[str] = []
    commentCount: int = 0
    createdAt: datetime
    status: PostStatus = PostStatus.ACTIVE
    
    class Config:
        from_attributes = True 