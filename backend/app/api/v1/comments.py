from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from datetime import datetime
import uuid
from firebase_admin import firestore
from ...core.firebase import db
from ...models.comment import Comment, CommentCreate
from ...models.user import User
from ..deps import get_current_active_user

router = APIRouter()

@router.post("/{post_id}/comments", response_model=Comment)
async def create_comment(
    post_id: str,
    comment: CommentCreate,
    current_user: User = Depends(get_current_active_user)
):
    try:
        # Check if post exists
        post_ref = db.collection('posts').document(post_id)
        post = post_ref.get()
        
        if not post.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        comment_id = str(uuid.uuid4())
        comment_data = {
            **comment.dict(),
            "commentId": comment_id,
            "authorId": current_user.userId,
            "createdAt": datetime.utcnow()
        }
        
        # Add comment to subcollection
        post_ref.collection('comments').document(comment_id).set(comment_data)
        
        # Increment comment count
        post_ref.update({'commentCount': firestore.Increment(1)})
        
        return Comment(**comment_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{post_id}/comments", response_model=List[Comment])
async def get_comments(
    post_id: str,
    limit: int = Query(50, ge=1, le=100)
):
    try:
        # Check if post exists
        post_ref = db.collection('posts').document(post_id)
        post = post_ref.get()
        
        if not post.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        # Get comments
        comments_query = post_ref.collection('comments').order_by('createdAt').limit(limit)
        
        comments = []
        for doc in comments_query.stream():
            comment_data = doc.to_dict()
            comment_data['commentId'] = doc.id
            comments.append(Comment(**comment_data))
            
        return comments
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) 