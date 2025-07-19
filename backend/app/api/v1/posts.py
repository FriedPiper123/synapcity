from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
import uuid
from firebase_admin import firestore
from ...core.firebase import db
from ...models.post import Post, PostCreate, PostUpdate, PostType, PostCategory
from ...models.user import User
from ..deps import get_current_active_user

router = APIRouter()

@router.post("/", response_model=Post)
async def create_post(
    post: PostCreate,
    current_user: User = Depends(get_current_active_user)
):
    try:
        post_id = str(uuid.uuid4())
        
        # Convert the location to GeoPoint
        location_geopoint = firestore.GeoPoint(
            post.location.latitude, 
            post.location.longitude
        )
        
        # Create post data without the location field first
        post_dict = post.dict(exclude={'location'})
        
        post_data = {
            **post_dict,
            "postId": post_id,
            "authorId": current_user.userId,
            "upvotes": 0,
            "downvotes": 0,
            "upvotedBy": [],
            "downvotedBy": [],
            "commentCount": 0,
            "createdAt": datetime.utcnow(),
            "status": "active",
            "location": location_geopoint  # Add the GeoPoint directly
        }
        
        db.collection('posts').document(post_id).set(post_data)
        
        # For returning, convert back to our model format
        post_data['location'] = {
            'latitude': post.location.latitude,
            'longitude': post.location.longitude
        }
        
        return Post(**post_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{neighborhood}", response_model=List[Post])
async def get_posts_by_neighborhood(
    neighborhood: str,
    limit: int = Query(20, ge=1, le=100),
    post_type: Optional[PostType] = None,
    category: Optional[PostCategory] = None
):
    try:
        query = db.collection('posts').where('neighborhood', '==', neighborhood)
        
        if post_type:
            query = query.where('type', '==', post_type.value)
        if category:
            query = query.where('category', '==', category.value)
            
        query = query.order_by('createdAt', direction=firestore.Query.DESCENDING).limit(limit)
        
        posts = []
        for doc in query.stream():
            post_data = doc.to_dict()
            post_data['postId'] = doc.id
            
            # Convert GeoPoint to dict
            if 'location' in post_data and hasattr(post_data['location'], 'latitude'):
                post_data['location'] = {
                    'latitude': post_data['location'].latitude,
                    'longitude': post_data['location'].longitude
                }
            
            posts.append(Post(**post_data))
            
        return posts
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/{post_id}/upvote")
async def upvote_post(
    post_id: str,
    current_user: User = Depends(get_current_active_user)
):
    try:
        post_ref = db.collection('posts').document(post_id)
        post = post_ref.get()
        
        if not post.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        post_data = post.to_dict()
        
        # Check if user already voted
        if current_user.userId in post_data.get('upvotedBy', []):
            return {"message": "Already upvoted"}
        
        # Remove from downvotes if exists
        if current_user.userId in post_data.get('downvotedBy', []):
            post_ref.update({
                'downvotes': firestore.Increment(-1),
                'downvotedBy': firestore.ArrayRemove([current_user.userId])
            })
        
        # Add upvote
        post_ref.update({
            'upvotes': firestore.Increment(1),
            'upvotedBy': firestore.ArrayUnion([current_user.userId])
        })
        
        return {"message": "Post upvoted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/{post_id}/downvote")
async def downvote_post(
    post_id: str,
    current_user: User = Depends(get_current_active_user)
):
    try:
        post_ref = db.collection('posts').document(post_id)
        post = post_ref.get()
        
        if not post.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        post_data = post.to_dict()
        
        # Check if user already voted
        if current_user.userId in post_data.get('downvotedBy', []):
            return {"message": "Already downvoted"}
        
        # Remove from upvotes if exists
        if current_user.userId in post_data.get('upvotedBy', []):
            post_ref.update({
                'upvotes': firestore.Increment(-1),
                'upvotedBy': firestore.ArrayRemove([current_user.userId])
            })
        
        # Add downvote
        post_ref.update({
            'downvotes': firestore.Increment(1),
            'downvotedBy': firestore.ArrayUnion([current_user.userId])
        })
        
        return {"message": "Post downvoted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) 