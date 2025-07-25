from fastapi import APIRouter, HTTPException, status, Query, Body
from typing import List, Optional
from datetime import datetime, timezone
import math
import random
from firebase_admin import firestore

from ...core.firebase import db
from ...models.post import Post, GeoPoint
from pydantic import BaseModel
from ...agents.user_posts_feeds.gemini_model import GeminiAgent

router = APIRouter()

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the distance between two points using the Haversine formula.
    Returns distance in kilometers.
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of earth in kilometers
    r = 6371
    
    return c * r

def generate_dummy_posts(latitude: float, longitude: float, radius_km: float = 5.0) -> List[dict]:
    """Generate dummy posts within the specified radius"""
    posts = []
    
    # Use location to create consistent data for the same area
    random.seed(int(latitude * 1000) + int(longitude * 1000))
    
    # Generate 10-20 dummy posts
    num_posts = random.randint(10, 20)
    
    post_types = ["issue", "event", "resolved", "suggestion"]
    post_categories = ["infrastructure", "safety", "environment", "community", "transportation"]
    severities = ["low", "medium", "high"]
    
    dummy_titles = [
        "Pothole on Main Street",
        "Street light outage",
        "Community cleanup event",
        "Water leak reported",
        "Traffic signal malfunction",
        "Park maintenance needed",
        "Neighborhood watch meeting",
        "Road construction update",
        "Garbage collection issue",
        "Public WiFi installation",
        "Bike lane proposal",
        "Emergency response drill",
        "Local business opening",
        "School zone safety",
        "Public transportation update"
    ]
    
    dummy_contents = [
        "There's a large pothole on Main Street that needs immediate attention.",
        "Street lights have been out for the past 3 days in the residential area.",
        "Join us for a community cleanup event this weekend!",
        "Water leak detected near the park entrance.",
        "Traffic signal at the intersection is not working properly.",
        "The local park needs maintenance and repairs.",
        "Monthly neighborhood watch meeting scheduled.",
        "Road construction will begin next week.",
        "Garbage collection was missed in our area.",
        "New public WiFi hotspots being installed.",
        "Proposal for new bike lanes in the area.",
        "Emergency response drill scheduled for next month.",
        "New local business opening soon!",
        "School zone safety measures being implemented.",
        "Public transportation routes updated."
    ]
    
    for i in range(num_posts):
        # Generate random location within radius
        angle = random.uniform(0, 2 * math.pi)
        distance = random.uniform(0, radius_km)
        
        # Convert to lat/lon offset
        lat_offset = distance * math.cos(angle) / 111.32  # Approximate km to degrees
        lon_offset = distance * math.sin(angle) / (111.32 * math.cos(math.radians(latitude)))
        
        post_lat = latitude + lat_offset
        post_lon = longitude + lon_offset
        
        post_type = random.choice(post_types)
        post_category = random.choice(post_categories)
        severity = random.choice(severities) if post_type == "issue" else "low"
        
        # Create post data
        post_data = {
            "postId": f"dummy_post_{i}_{int(latitude * 1000)}_{int(longitude * 1000)}",
            "title": random.choice(dummy_titles),
            "content": random.choice(dummy_contents),
            "type": post_type,
            "category": post_category,
            "severity": severity,
            "authorId": f"user_{random.randint(1, 100)}",
            "authorName": f"User {random.randint(1, 100)}",
            "upvotes": random.randint(0, 50),
            "downvotes": random.randint(0, 10),
            "upvotedBy": [],
            "downvotedBy": [],
            "commentCount": random.randint(0, 15),
            "createdAt": datetime.now(timezone.utc),
            "status": "active",
            "location": {
                "latitude": post_lat,
                "longitude": post_lon
            },
            "location_name": f"Area {random.randint(1, 10)}",
            "mentioned_location_name": None,
            "neighborhood": f"Neighborhood {random.randint(1, 5)}"
        }
        
        posts.append(post_data)
    
    return posts

class RouteRequest(BaseModel):
    origin: GeoPoint
    destination: GeoPoint
    mode: str = "driving"

@router.get("/location-posts", response_model=List[Post])
async def get_posts_by_location(
    latitude: float = Query(..., description="Latitude of the user's location"),
    longitude: float = Query(..., description="Longitude of the user's location"),
    radius_km: float = Query(5.0, description="Radius in kilometers to search for posts", ge=0.1, le=50.0)
):
    """
    Get posts within a specified radius of the given location.
    No authentication required.
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
        
        # For now, return dummy data
        # In the future, this would query the actual database
        posts_data = generate_dummy_posts(latitude, longitude, radius_km)
        
        # Convert to Post models
        posts = []
        for post_data in posts_data:
            try:
                post = Post(**post_data)
                posts.append(post)
            except Exception as e:
                print(f"Error creating post model: {e}")
                continue
        
        return posts
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching location-based posts: {str(e)}"
        ) 

@router.post("/route")
async def get_route_between_locations(
    route_req: RouteRequest = Body(..., description="Route request with origin, destination, and mode")
):
    """
    Get the route (directions) between two locations using the AI agent (Gemini).
    """
    try:
        ai_output = GeminiAgent(
            task="route",
            origin={"latitude": route_req.origin.latitude, "longitude": route_req.origin.longitude},
            destination={"latitude": route_req.destination.latitude, "longitude": route_req.destination.longitude},
            mode=route_req.mode
        )
        return ai_output
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching route via AI agent: {str(e)}") 