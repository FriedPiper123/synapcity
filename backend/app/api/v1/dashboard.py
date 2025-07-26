from fastapi import APIRouter, HTTPException, status, Query, Depends
from typing import List, Dict, Optional
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import math

from ...core.firebase import db
from ...models.user import User
from ..deps import get_current_active_user
from ...utils.geohash_utils import get_geohash_cells_for_radius, calculate_distance
import requests
import os
from ...core.config import settings
from ...agents.user_posts_feeds.post_feed_utils.post_feed_utils import get_all_posts_summary
from ...agents.user_posts_feeds.gemini_model import GeminiAgent


router = APIRouter()

def get_dashboard_stats(latitude: float, longitude: float, radius_km: float = 5.0) -> Dict:
    """
    Get dashboard statistics for the given area.
    """
    try:
        # Get geohash cells for the area
        geohash_cells = get_geohash_cells_for_radius(latitude, longitude, radius_km)
        
        # Collect posts from all relevant geohash cells
        all_posts = []
        for geohash_cell in geohash_cells:
            posts_query = db.collection('posts').where('geohash', '==', geohash_cell)
            
            for doc in posts_query.stream():
                post_data = doc.to_dict()
                post_data['postId'] = doc.id
                
                # Check if post is within the exact radius
                if 'location' in post_data and hasattr(post_data['location'], 'latitude'):
                    post_lat = post_data['location'].latitude
                    post_lon = post_data['location'].longitude
                    
                    distance = calculate_distance(latitude, longitude, post_lat, post_lon)
                    if distance <= radius_km:
                        all_posts.append({
                            **post_data,
                            'distance': distance
                        })
        
        return calculate_stats(all_posts)
        
    except Exception as e:
        print(f"Error getting dashboard stats: {str(e)}")
        # return get_fallback_stats()
        return {}

def calculate_stats(posts: List[Dict]) -> Dict:
    """
    Calculate dashboard statistics from posts data.
    """
    if not posts:
        return get_fallback_stats()
    
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Count by type
    type_counts = defaultdict(int)
    status_counts = defaultdict(int)
    today_resolved = 0
    total_upvotes = 0
    total_downvotes = 0
    
    # Get unique users
    unique_users = set()
    
    for post in posts:
        post_type = post.get('type', 'other')
        post_status = post.get('status', 'active')
        author_id = post.get('authorId')
        created_at = post.get('createdAt')
        
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        
        type_counts[post_type] += 1
        status_counts[post_status] += 1
        
        if author_id:
            unique_users.add(author_id)
        
        # Count resolved posts from today
        if post_status == 'resolved' and created_at >= today:
            today_resolved += 1
        
        # Count votes
        total_upvotes += post.get('upvotes', 0)
        total_downvotes += post.get('downvotes', 0)
    
    # Calculate active issues (issues with active status)
    active_issues = sum(1 for post in posts 
                       if post.get('type') == 'issue' and post.get('status') == 'active')
    
    # Calculate engagement percentage (based on votes and comments)
    total_votes = total_upvotes + total_downvotes
    total_comments = sum(post.get('commentCount', 0) for post in posts)
    engagement_score = 0
    
    if len(posts) > 0:
        engagement_score = min(100, ((total_votes + total_comments) / len(posts)) * 10)
    
    return {
        "activeIssues": active_issues,
        "resolvedToday": today_resolved,
        "communityPosts": len(posts),
        "activeCitizens": len(unique_users),
        "engagementPercentage": round(engagement_score, 1),
        "totalPosts": len(posts),
        "postTypes": dict(type_counts),
        "statusCounts": dict(status_counts)
    }

def get_fallback_stats() -> Dict:
    """
    Return fallback statistics when no data is available.
    """
    return {
        "activeIssues": 0,
        "resolvedToday": 0,
        "communityPosts": 0,
        "activeCitizens": 0,
        "engagementPercentage": 0.0,
        "totalPosts": 0,
        "postTypes": {},
        "statusCounts": {}
    }

def get_recent_activities(latitude: float, longitude: float, radius_km: float = 5.0, limit: int = 10) -> List[Dict]:
    """
    Get recent activities from posts in the given area.
    """
    try:
        # Get geohash cells for the area
        geohash_cells = get_geohash_cells_for_radius(latitude, longitude, radius_km)
        
        # Collect recent posts from all relevant geohash cells
        all_posts = []
        for geohash_cell in geohash_cells:
            posts_query = db.collection('posts').where('geohash', '==', geohash_cell)
            
            for doc in posts_query.stream():
                post_data = doc.to_dict()
                post_data['postId'] = doc.id
                
                # Check if post is within the exact radius
                if 'location' in post_data and hasattr(post_data['location'], 'latitude'):
                    post_lat = post_data['location'].latitude
                    post_lon = post_data['location'].longitude
                    
                    distance = calculate_distance(latitude, longitude, post_lat, post_lon)
                    if distance <= radius_km:
                        all_posts.append({
                            **post_data,
                            'distance': distance
                        })
        
        return format_recent_activities(all_posts, limit)
        
    except Exception as e:
        print(f"Error getting recent activities: {str(e)}")
        raise e
        return get_fallback_activities()

def format_recent_activities(posts: List[Dict], limit: int) -> List[Dict]:
    """
    Format posts into recent activities for the dashboard.
    """
    # if not posts:
        # return get_fallback_activities()
    
    # Sort by creation date (newest first)
    posts.sort(key=lambda x: x.get('createdAt', datetime.min), reverse=True)
    
    activities = []
    
    feed_insights = get_all_posts_summary(gemini_model=GeminiAgent, all_posts=posts)

    for feed in (feed_insights or {}).values():
        related_feeds = feed.get('related_feeds', [])
        # Fetch posts whose id comes in related_feeds
        related_posts = []
        if related_feeds:
            for post_id in related_feeds:
                try:
                    post_doc = db.collection('posts').document(post_id).get()
                    if post_doc.exists:
                        post_data = post_doc.to_dict()
                        post_data['postId'] = post_doc.id
                        related_posts.append(post_data)
                except Exception as e:
                    pass
        data = {
            'type': feed.get('type', 'unknown'),
            "title": feed.get('title', ''),
            'category': feed.get('category', 'general'),
            'content': feed.get('summary', ''),
            'severity': feed.get('severity', 'medium'),
            'counts': feed.get('posts_counts', 0),
            'location': feed.get('location', None),
            "related_posts" : related_posts,
            "external_references" : feed.get('external_references', []),
        }
        activities.append(data)
    return activities

def get_fallback_activities() -> List[Dict]:
    """
    Return fallback activities when no data is available.
    """
    return [
        {
            "id": "fallback-1",
            "type": "issue",
            "title": "No recent activities available",
            "time": "Just now",
            "severity": "medium",
            "content": "Start posting to see activities here",
            "authorId": None,
            "upvotes": 0,
            "downvotes": 0,
            "commentCount": 0
        }
    ]

@router.get("/stats")
async def get_dashboard_stats_endpoint(
    latitude: float = Query(..., description="Latitude of the user's location"),
    longitude: float = Query(..., description="Longitude of the user's location"),
    radius_km: float = Query(5.0, description="Radius in kilometers to analyze", ge=0.1, le=50.0),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get dashboard statistics for the user's area.
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
        
        stats = get_dashboard_stats(latitude, longitude, radius_km)
        return stats
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching dashboard stats: {str(e)}"
        )

@router.get("/recent-activities")
async def get_recent_activities_endpoint(
    latitude: float = Query(..., description="Latitude of the user's location"),
    longitude: float = Query(..., description="Longitude of the user's location"),
    radius_km: float = Query(5.0, description="Radius in kilometers to analyze", ge=0.1, le=50.0),
    limit: int = Query(10, description="Maximum number of activities to return", ge=1, le=50),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get recent activities from the user's area.
    """
    # return {
    #     "activities" : [
            
    #     ] 
    # }
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
        
        activities = get_recent_activities(latitude, longitude, radius_km, limit)
        # from pprint import pprint
        # import json
        return {"activities": activities}

        return {"activities": [
            {"content":"Join us for a community cleanup event in [area name] on [date]. We'll provide all supplies. Let's make our neighborhood beautiful together!","type":"event","category":"community","location":{"latitude":12.9093255,"longitude":77.6529664},"neighborhood":"200, Sector 2, HSR Layout, Bengaluru, Karnataka 560102, India","mediaUrl":null,"parentId":null,"geohash":"tdr1rn","postId":"7e4b1d24-7e6f-43ab-8a8a-df956e3269f7","authorId":"RF1zvAxMPTYX2nKdXjSJAR6b8Md2","author":{"userId":"RF1zvAxMPTYX2nKdXjSJAR6b8Md2","username":"Ayush Bisht","profileImageUrl":"https://lh3.googleusercontent.com/a/ACg8ocJ_cYHVsP2ENU4ZYb4TuvBlSPiOa63JoSG_0KQpN6aF8MYnaA=s96-c"},"upvotes":0,"downvotes":0,"upvotedBy":[],"downvotedBy":[],"commentCount":1,"createdAt":"2025-07-25T08:42:36.836572Z","status":"active"},
            {"content":"Traffic congestion in hsr sector 1.","type":"issue","category":"transportation","location":{"latitude":12.9093255,"longitude":77.6529664},"neighborhood":"200, Sector 2, HSR Layout, Bengaluru, Karnataka 560102, India","mediaUrl":null,"parentId":null,"geohash":"tdr1rn","postId":"9bed07d8-70ea-4038-a439-8f24b21fe0df","authorId":"RF1zvAxMPTYX2nKdXjSJAR6b8Md2","author":{"userId":"RF1zvAxMPTYX2nKdXjSJAR6b8Md2","username":"Ayush Bisht","profileImageUrl":"https://lh3.googleusercontent.com/a/ACg8ocJ_cYHVsP2ENU4ZYb4TuvBlSPiOa63JoSG_0KQpN6aF8MYnaA=s96-c"},"upvotes":0,"downvotes":0,"upvotedBy":[],"downvotedBy":[],"commentCount":0,"createdAt":"2025-07-25T08:33:19.361901Z","status":"active"},
            {"content":"Join us for a community cleanup event in [area name] on [date]. We'll provide all supplies. Let's make our neighborhood beautiful together!","type":"event","category":"community","location":{"latitude":12.9093255,"longitude":77.6529664},"neighborhood":"200, Sector 2, HSR Layout, Bengaluru, Karnataka 560102, India","mediaUrl":null,"parentId":null,"geohash":"tdr1rn","postId":"7e4b1d24-7e6f-43ab-8a8a-df956e3269f7","authorId":"RF1zvAxMPTYX2nKdXjSJAR6b8Md2","author":{"userId":"RF1zvAxMPTYX2nKdXjSJAR6b8Md2","username":"Ayush Bisht","profileImageUrl":"https://lh3.googleusercontent.com/a/ACg8ocJ_cYHVsP2ENU4ZYb4TuvBlSPiOa63JoSG_0KQpN6aF8MYnaA=s96-c"},"upvotes":0,"downvotes":0,"upvotedBy":[],"downvotedBy":[],"commentCount":1,"createdAt":"2025-07-25T08:42:36.836572Z","status":"active"},
            {"content":"Traffic congestion in hsr sector 1.","type":"issue","category":"transportation","location":{"latitude":12.9093255,"longitude":77.6529664},"neighborhood":"200, Sector 2, HSR Layout, Bengaluru, Karnataka 560102, India","mediaUrl":null,"parentId":null,"geohash":"tdr1rn","postId":"9bed07d8-70ea-4038-a439-8f24b21fe0df","authorId":"RF1zvAxMPTYX2nKdXjSJAR6b8Md2","author":{"userId":"RF1zvAxMPTYX2nKdXjSJAR6b8Md2","username":"Ayush Bisht","profileImageUrl":"https://lh3.googleusercontent.com/a/ACg8ocJ_cYHVsP2ENU4ZYb4TuvBlSPiOa63JoSG_0KQpN6aF8MYnaA=s96-c"},"upvotes":0,"downvotes":0,"upvotedBy":[],"downvotedBy":[],"commentCount":0,"createdAt":"2025-07-25T08:33:19.361901Z","status":"active"}
        ]}
        
    except Exception as e:
        raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching recent activities: {str(e)}"
        ) 