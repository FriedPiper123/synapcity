from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import math
from firebase_admin import firestore

from ...agents.user_posts_feeds.gemini_model import GeminiAgent
from ...core.firebase import db
from ...core.cache import cached_posts_endpoint, posts_cache_stats, clear_posts_cache
from ...models.post import Post, PostCreate, PostUpdate, PostType, PostCategory
from ...models.user import User
from ..deps import get_current_active_user
from ...utils.geohash_utils import (
    encode_geohash, 
    get_geohash_cells_for_radius, 
    is_within_radius,
    calculate_distance
)

from fastapi_utilities import ttl_lru_cache

router = APIRouter()

def get_author_details(user_id):
    user_ref = db.collection('users').document(user_id)
    user_doc = user_ref.get()
    if user_doc.exists:
        user_data = user_doc.to_dict()
        return {
            'userId': user_id,
            'username': user_data.get('username', 'Unknown'),
            'profileImageUrl': user_data.get('profileImageUrl'),
        }
    return {'userId': user_id, 'username': 'Unknown', 'profileImageUrl': None}

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
        
        # Generate geohash for the post location
        post_geohash = encode_geohash(post.location.latitude, post.location.longitude, precision=6)
        
        # Create post data without the location field first
        post_dict = post.model_dump(exclude={'location'})
        
        post_data = {
            **post_dict,
            "postId": post_id,
            # "authorId": current_user.userId if current_user else "anonymous",
            "authorId": current_user.userId,
            "upvotes": 0,
            "downvotes": 0,
            "upvotedBy": [],
            "downvotedBy": [],
            "commentCount": 0,
            "createdAt": datetime.now(timezone.utc),
            "status": "active",
            "location": location_geopoint,  # Add the GeoPoint directly
            "location_name": post_dict.get('neighborhood'),
            "mentioned_location_name": post_dict.get('neighborhood'),
            "geohash": post_geohash,  # Add geohash for efficient queries
        }
        gemini_output = GeminiAgent(task = "post_analysis", google_search = True, user_post_message = post_data["content"])
        
        if gemini_output['sentiment'].lower() == "vulgar":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Posting vulgar content is against our policy.",
                    "code": "VULGAR_CONTENT_DETECTED",
                    "user_action": "SHOW_VULGARITY_WARNING_POPUP",
                    "description": "Vulgarity is not allowed. Strict action will be taken if this happens again."
                }
            )

        if gemini_output.get('location') and  'available' not in gemini_output.get('location'):
            post_data['mentioned_location_name'] = gemini_output.get('location')
        
        print(gemini_output)

        db.collection('posts').document(post_id).set(post_data)
        
        # For returning, convert back to our model format
        post_data['location'] = {
            'latitude': post.location.latitude,
            'longitude': post.location.longitude
        }
        # Add author details
        post_data['author'] = get_author_details(current_user.userId)
        
        return Post(**post_data)
    except Exception as e:
        raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@ttl_lru_cache(ttl=5, max_size=528)
@router.get("/nearby", response_model=List[Post])
async def get_posts_by_location(
    latitude: float = Query(..., description="Latitude of the user's location"),
    longitude: float = Query(..., description="Longitude of the user's location"),
    radius_km: float = Query(5.0, description="Radius in kilometers to search for posts", ge=0.1, le=50.0),
    limit: int = Query(20, ge=1, le=100),
    post_type: Optional[PostType] = None,
    category: Optional[PostCategory] = None
):
    """
    Get posts within a specified radius of the given location using geohash-based queries.
    This approach is much more efficient than querying all posts and calculating distances.
    """
    try:
        # Validate coordinates
        if not (-90 <= latitude <= 90):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Latitude must be between -90 and 90"
            )
        
        if not (-180 <= longitude <= 180):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Longitude must be between -180 and 180"
            )
        
        # Get geohash cells to query based on radius
        geohash_cells = get_geohash_cells_for_radius(latitude, longitude, radius_km)
        
        # Query posts using geohash cells for efficient filtering
        posts = []
        
        # For now, query all posts and filter by geohash to avoid complex indexes
        # In production, you would create proper Firebase indexes
        all_posts_query = db.collection('posts')
        
        # Apply filters if provided
        if post_type:
            all_posts_query = all_posts_query.where('type', '==', post_type.value)
        if category:
            all_posts_query = all_posts_query.where('category', '==', category.value)
            
        # Order by creation date
        all_posts_query = all_posts_query.order_by('createdAt', direction=firestore.Query.DESCENDING)
        
        # Get all posts and filter by geohash
        for doc in all_posts_query.stream():
            post_data = doc.to_dict()
            post_data['postId'] = doc.id
            
            # Check if post has geohash and location data
            if 'geohash' in post_data and post_data['geohash'] in geohash_cells:
                if 'location' in post_data and hasattr(post_data['location'], 'latitude'):
                    post_lat = post_data['location'].latitude
                    post_lon = post_data['location'].longitude
                    
                    # Double-check distance using exact calculation
                    if is_within_radius(latitude, longitude, post_lat, post_lon, radius_km):
                        # Convert GeoPoint to dict for response
                        post_data['location'] = {
                            'latitude': post_data['location'].latitude,
                            'longitude': post_data['location'].longitude
                        }
                        # Add author details
                        post_data['author'] = get_author_details(post_data.get('authorId'))
                        
                        posts.append(Post(**post_data))
                        
                        # Limit the number of posts returned
                        if len(posts) >= limit:
                            break
        
        # Sort by distance and creation date for better relevance
        posts.sort(key=lambda p: (
            calculate_distance(latitude, longitude, p.location.latitude, p.location.longitude),
            -p.createdAt.timestamp()
        ))

        for post in posts:
            print(post.model_dump_json())

        return posts[:limit]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching location-based posts: {str(e)}"
        )

@ttl_lru_cache(ttl=5, max_size=528)
@router.get("/post/{post_id}", response_model=Post)
async def get_post_by_id(post_id: str):
    try:
        post_ref = db.collection('posts').document(post_id)
        post = post_ref.get()
        
        if not post.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        post_data = post.to_dict()
        post_data['postId'] = post_id
        
        # Convert GeoPoint to dict
        if 'location' in post_data and hasattr(post_data['location'], 'latitude'):
            post_data['location'] = {
                'latitude': post_data['location'].latitude,
                'longitude': post_data['location'].longitude
            }
        # Add author details
        post_data['author'] = get_author_details(post_data.get('authorId'))
        
        return Post(**post_data)
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

@router.get("/cache/stats")
@ttl_lru_cache(ttl=5, max_size=528)
async def get_posts_cache_stats():
    """Get posts cache statistics"""
    return posts_cache_stats()

@router.post("/cache/clear")
@ttl_lru_cache(ttl=5, max_size=528)
async def clear_posts_cache_endpoint():
    """Clear posts cache"""
    clear_posts_cache()
    return {"message": "Posts cache cleared successfully"} 