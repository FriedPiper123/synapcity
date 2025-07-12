from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class PostType(str, Enum):
    ALERT = "alert"
    DISCUSSION = "discussion"
    QUESTION = "question"
    ANNOUNCEMENT = "announcement"

class PostCategory(str, Enum):
    SAFETY = "safety"
    INFRASTRUCTURE = "infrastructure"
    COMMUNITY = "community"
    ENVIRONMENT = "environment"
    TRANSPORTATION = "transportation"
    GENERAL = "general"

class PostStatus(str, Enum):
    ACTIVE = "active"
    HIDDEN = "hidden"
    DELETED = "deleted"

class CommentBase(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)

class CommentCreate(CommentBase):
    pass

class Comment(CommentBase):
    commentId: str
    authorId: str
    createdAt: datetime
    
    class Config:
        from_attributes = True

class PostBase(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)
    type: PostType
    category: PostCategory
    neighborhood: str = Field(..., min_length=1, max_length=100)
    mediaUrl: Optional[str] = None

class PostCreate(PostBase):
    pass

class PostUpdate(BaseModel):
    text: Optional[str] = Field(None, min_length=1, max_length=1000)
    type: Optional[PostType] = None
    category: Optional[PostCategory] = None
    mediaUrl: Optional[str] = None

class Post(PostBase):
    postId: str
    authorId: str
    upvotes: int = 0
    downvotes: int = 0
    upvotedBy: List[str] = Field(default_factory=list)
    downvotedBy: List[str] = Field(default_factory=list)
    commentCount: int = 0
    createdAt: datetime
    status: PostStatus = PostStatus.ACTIVE
    
    class Config:
        from_attributes = True
