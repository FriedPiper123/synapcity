from pydantic import BaseModel
from datetime import datetime

class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    pass

class Comment(CommentBase):
    commentId: str
    authorId: str
    createdAt: datetime
    
    class Config:
        from_attributes = True 