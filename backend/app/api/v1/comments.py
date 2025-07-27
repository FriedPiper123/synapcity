from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from firebase_admin import firestore
from ...core.firebase import db
from ...models.comment import Comment, CommentCreate
from ...models.user import User
from ...models.post import Post, PostCreate, PostType, PostCategory
from ..deps import get_current_active_user
from ...agents.user_posts_feeds.gemini_model import GeminiAgent

router = APIRouter()

@router.post("/{post_id}/comments", response_model=Post)
async def create_comment(
    post_id: str,
    comment: CommentCreate,
    current_user: User = Depends(get_current_active_user)
):
    print(current_user)
    try:
        # Check if post exists
        post_ref = db.collection('posts').document(post_id)
        post = post_ref.get()
        if not post.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        # Create a new post as a comment
        comment_post_id = str(uuid.uuid4())
        post_data = {
            "content": comment.content,  # Assuming CommentCreate has 'content'
            "type": post.get('type'),  # Or another suitable type for comments
            "category": post.get('category') or 'OTHER',  # Or another suitable category for comments
            "location": post.get('location'),  # Inherit location from parent post
            "neighborhood": post.get('neighborhood'),
            "mediaUrl": None,
            "parentId": post_id,
            "postId": comment_post_id,
            "authorId": current_user.userId,
            "upvotes": 0,
            "downvotes": 0,
            "upvotedBy": [],
            "downvotedBy": [],
            "commentCount": 0,
            "createdAt": datetime.now(timezone.utc),
            "status": "active"
        }
        
        # Check for vulgar content in comments
        # gemini_output = GeminiAgent(task = "post_analysis", google_search = True, user_post_message = comment.content)
        
        # if gemini_output['sentiment'] == "vulgar":
        #     raise HTTPException(
        #         status_code=status.HTTP_400_BAD_REQUEST,
        #         detail={
        #             "message": "Posting vulgar content is against our policy.",
        #             "code": "VULGAR_CONTENT_DETECTED",
        #             "user_action": "SHOW_VULGARITY_WARNING_POPUP",
        #             "description": "Vulgarity is not allowed. Strict action will be taken if this happens again."
        #         }
        #     )
        
        db.collection('posts').document(comment_post_id).set(post_data)
        # Increment comment count on parent post
        post_ref.update({'commentCount': firestore.Increment(1)})
        # Prepare location for response
        if post_data['location'] and hasattr(post_data['location'], 'latitude'):
            post_data['location'] = {
                'latitude': post_data['location'].latitude,
                'longitude': post_data['location'].longitude
            }
        return Post(**post_data)
    except Exception as e:
        raise e

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{post_id}/comments", response_model=List[Post])
async def get_comments(
    post_id: str,
    limit: int = Query(50, ge=1, le=100)
):
    try:
        # Query posts where parentId == post_id
        query = db.collection('posts').where('parentId', '==', post_id).order_by('createdAt').limit(limit)
        comments = []
        for doc in query.stream():
            comment_data = doc.to_dict()
            comment_data['postId'] = doc.id
            # Convert GeoPoint to dict if needed
            if 'location' in comment_data and hasattr(comment_data['location'], 'latitude'):
                comment_data['location'] = {
                    'latitude': comment_data['location'].latitude,
                    'longitude': comment_data['location'].longitude
                }
            comments.append(Post(**comment_data))
        return comments
    except Exception as e:
        raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) 