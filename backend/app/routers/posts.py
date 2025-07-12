from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
from .. import models, dependencies
from ..database import firebase_service
from ..exceptions import PostNotFound

router = APIRouter(
    prefix="/posts",
    tags=["posts"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=models.Post, status_code=status.HTTP_201_CREATED)
async def create_post(
    post: models.PostCreate,
    current_user = Depends(dependencies.get_current_user)
):
    """Create a new post"""
    try:
        # Prepare post data
        post_data = post.dict()
        post_data.update({
            "authorId": current_user.userId,
            "createdAt": datetime.utcnow(),
            "upvotes": 0,
            "downvotes": 0,
            "commentCount": 0,
            "status": "active"
        })
        
        # Save to Firestore
        created_post = await firebase_service.create_post(post_data)
        return created_post
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/neighborhood/{neighborhood}", response_model=List[models.Post])
async def get_feed_for_neighborhood(
    neighborhood: str,
    limit: int = Query(default=50, ge=1, le=100)
):
    """Get posts for a specific neighborhood"""
    try:
        posts = await firebase_service.get_posts_by_neighborhood(neighborhood, limit)
        return posts
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/{post_id}/upvote", status_code=status.HTTP_204_NO_CONTENT)
async def upvote_post(
    post_id: str,
    current_user = Depends(dependencies.get_current_user)
):
    """Upvote a post"""
    try:
        success = await firebase_service.update_post_votes(post_id, current_user.userId, "upvote")
        if not success:
            raise PostNotFound(post_id)
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/{post_id}/downvote", status_code=status.HTTP_204_NO_CONTENT)
async def downvote_post(
    post_id: str,
    current_user = Depends(dependencies.get_current_user)
):
    """Downvote a post"""
    try:
        success = await firebase_service.update_post_votes(post_id, current_user.userId, "downvote")
        if not success:
            raise PostNotFound(post_id)
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/{post_id}/comments", response_model=models.Comment, status_code=status.HTTP_201_CREATED)
async def create_comment(
    post_id: str,
    comment: models.CommentCreate,
    current_user = Depends(dependencies.get_current_user)
):
    """Create a comment on a post"""
    try:
        # Prepare comment data
        comment_data = comment.dict()
        comment_data.update({
            "authorId": current_user.userId,
            "createdAt": datetime.utcnow()
        })
        
        # Save to Firestore
        created_comment = await firebase_service.create_comment(post_id, comment_data)
        return created_comment
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{post_id}/comments", response_model=List[models.Comment])
async def get_comments_for_post(post_id: str):
    """Get comments for a specific post"""
    try:
        comments = await firebase_service.get_comments_for_post(post_id)
        return comments
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
