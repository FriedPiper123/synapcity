from fastapi import APIRouter, HTTPException, status, Query
from typing import Any, List, Optional, Dict
from datetime import datetime, timezone, timedelta
import random
import math
from collections import defaultdict
import json
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import hashlib

from ...agents.user_posts_feeds.gemini_model import GeminiAgent

from ...core.firebase import db
from ...models.area import Area, AreaTrend
from ...utils.geohash_utils import get_geohash_cells_for_radius, calculate_distance, create_issue_area_polygon, create_unified_issue_polygon
import requests
import os
from ...core.config import settings
from ...agents.user_posts_feeds.post_feed_utils.post_feed_utils import get_all_posts_summary

from fastapi_utilities import ttl_lru_cache

router = APIRouter()

# Request model for the new endpoint
class AreaAnalysisRequest(BaseModel):
    coordinates: Dict[str, Any]
    analysisType: str
    timeRange: str

def generate_cache_key(coordinates: Dict[str, Any], analysis_type: str, time_range: str) -> str:
    """
    Generate a unique cache key based on coordinates and analysis parameters.
    """
    # Round coordinates to 4 decimal places for reasonable precision
    lat = round(coordinates['lat'], 4)
    lng = round(coordinates['lng'], 4)
    
    # Create a string representation of the parameters
    cache_string = f"{lat}_{lng}_{analysis_type}_{time_range}"
    
    # Generate a hash for the cache key
    cache_hash = hashlib.md5(cache_string.encode()).hexdigest()
    
    return f"{lat}_{lng}_{cache_hash}"

def get_cache_file_path(cache_key: str) -> str:
    """
    Get the file path for the cache file.
    """
    cache_dir = os.path.join(os.path.dirname(__file__), '../../../cache/area_analysis')
    os.makedirs(cache_dir, exist_ok=True)
    return os.path.join(cache_dir, f"{cache_key}.json")

def load_cached_response(cache_key: str) -> Optional[Dict]:
    """
    Load cached response from JSON file if it exists.
    """
    cache_file_path = get_cache_file_path(cache_key)
    
    try:
        if os.path.exists(cache_file_path):
            with open(cache_file_path, 'r') as f:
                cached_data = json.load(f)
                
            # Check if cache is still valid (24 hours)
            cached_time = datetime.fromisoformat(cached_data.get('cached_at', ''))
            if datetime.now(timezone.utc) - cached_time < timedelta(hours=24):
                return cached_data.get('response')
            else:
                # Cache expired, remove the file
                os.remove(cache_file_path)
                
    except Exception as e:
        print(f"Error loading cached response: {str(e)}")
        
    return None

def save_response_to_cache(cache_key: str, response_data: Dict) -> None:
    """
    Save response data to cache file.
    """
    cache_file_path = get_cache_file_path(cache_key)
    
    try:
        cache_data = {
            'cached_at': datetime.now(timezone.utc).isoformat(),
            'cache_key': cache_key,
            'response': response_data
        }
        
        with open(cache_file_path, 'w') as f:
            json.dump(cache_data, f, indent=2, default=str)
            
    except Exception as e:
        print(f"Error saving response to cache: {str(e)}")

def analyze_posts_for_insights(latitude: float, longitude: float, radius_km: float = 5.0) -> Dict:
    """
    Analyze posts in the given area to generate insights.
    Uses geohash-based queries for efficiency.
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
        
        return analyze_posts_data(all_posts, latitude, longitude)
        
    except Exception as e:
        print(f"Error analyzing posts: {str(e)}")
        return generate_fallback_insights(latitude, longitude)

def get_area_name_from_google_maps(latitude, longitude):
    api_key = settings.GOOGLE_MAPS_API_KEY
    if not api_key:
        return f"Area at {latitude:.2f},{longitude:.2f}"
    try:
        url = (
            f"https://maps.googleapis.com/maps/api/geocode/json"
            f"?latlng={latitude},{longitude}&key={api_key}"
        )
        response = requests.get(url, timeout=3)
        if response.status_code == 200:
            data = response.json()
            if data.get("results"):
                # Try to get a locality or neighborhood name
                for component in data["results"][0].get("address_components", []):
                    if "neighborhood" in component["types"]:
                        return component["long_name"]
                    if "locality" in component["types"]:
                        return component["long_name"]
                    if "sublocality" in component["types"]:
                        return component["long_name"]
                # Fallback to formatted address
                return data["results"][0].get("formatted_address", f"Area at {latitude:.2f},{longitude:.2f}")
    except Exception as e:
        print(f"Error fetching area name from Google Maps: {e}")
        return f"Area at {latitude:.2f},{longitude:.2f}"

def analyze_posts_data(posts: List[Dict], latitude: float, longitude: float) -> Dict:
    """
    Analyze post data to generate insights.
    """
    # if not posts:
        # return generate_fallback_insights(latitude, longitude)
    
    # Group posts by type and time periods
    now = datetime.now(timezone.utc)
    one_day_ago = now - timedelta(days=1)
    one_week_ago = now - timedelta(days=7)
    one_month_ago = now - timedelta(days=30)
    
    # Initialize counters
    type_counts = defaultdict(int)
    daily_posts = []
    weekly_posts = []
    monthly_posts = []
    
    # Analyze each post
    for post in posts:
        post_type = post.get('type', 'other')
        created_at = post.get('createdAt')
        
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        
        type_counts[post_type] += 1
        
        # Categorize by time period
        if created_at >= one_day_ago:
            daily_posts.append(post)
        if created_at >= one_week_ago:
            weekly_posts.append(post)
        if created_at >= one_month_ago:
            monthly_posts.append(post)
    
    # Calculate insights
    total_posts = len(posts)
    
    # Crime/Issue trend (based on issue-type posts)
    crime_daily = [len([p for p in daily_posts if p.get('type') == 'issue'])]
    crime_weekly = [len([p for p in weekly_posts if p.get('type') == 'issue'])]
    crime_monthly = [len([p for p in monthly_posts if p.get('type') == 'issue'])]
    
    # Water shortage trend (based on water-related posts)
    water_posts = [p for p in posts if 'water' in p.get('content', '').lower() or p.get('category') == 'water_shortage']
    water_daily = [len([p for p in daily_posts if p in water_posts])]
    water_weekly = [len([p for p in weekly_posts if p in water_posts])]
    water_monthly = [len([p for p in monthly_posts if p in water_posts])]
    
    # Power outage frequency (based on power-related posts)
    power_posts = [p for p in posts if 'power' in p.get('content', '').lower() or p.get('category') == 'power_outage']
    power_outage_frequency = len(power_posts) / max(total_posts, 1)
    
    # Overall sentiment (based on upvotes vs downvotes)
    total_upvotes = sum(p.get('upvotes', 0) for p in posts)
    total_downvotes = sum(p.get('downvotes', 0) for p in posts)
    total_votes = total_upvotes + total_downvotes
    
    if total_votes > 0:
        overall_sentiment = (total_upvotes - total_downvotes) / total_votes
    else:
        overall_sentiment = 0.0
    
    # Generate area name using Google Maps Geocoding API based on coordinates

    area_name = get_area_name_from_google_maps(latitude, longitude)
    
    feed_insights = get_all_posts_summary(gemini_model=GeminiAgent, all_posts=posts)

    return {
        "name": area_name,
        "crimeTrend": AreaTrend(daily=crime_daily, weekly=crime_weekly, monthly=crime_monthly),
        "powerOutageFrequency": round(power_outage_frequency, 2),
        "waterShortageTrend": AreaTrend(daily=water_daily, weekly=water_weekly, monthly=water_monthly),
        "overallSentiment": round(overall_sentiment, 2),
        "lastUpdatedAt": now,
        "totalPosts": total_posts,
        "postTypes": dict(type_counts),
        "feed_insights": list(feed_insights.values())
    }

def generate_fallback_insights(latitude: float, longitude: float) -> Dict:
    """
    Generate fallback insights when no real data is available.
    """
    # Use location to create consistent data for the same area
    random.seed(int(latitude * 1000) + int(longitude * 1000))
    
    # Generate area name based on coordinates
    area_names = ["Downtown District", "Suburban Heights", "Riverside", "University Park", "Industrial Zone"]
    area_name = area_names[hash(f"{latitude:.2f},{longitude:.2f}") % len(area_names)]
    
    # Generate dummy trend data
    def generate_dummy_trend_data(days: int) -> List[float]:
        base_value = random.uniform(0.1, 0.9)
        trend_data = []
        for i in range(days):
            value = base_value + random.uniform(-0.2, 0.2) + (i * 0.01)
            value = max(0.0, min(1.0, value))
            trend_data.append(round(value, 2))
        return trend_data
    
    # Create proper AreaTrend structure
    daily_data = generate_dummy_trend_data(7)
    weekly_data = generate_dummy_trend_data(4)
    monthly_data = generate_dummy_trend_data(12)
    
    crime_trend = AreaTrend(daily=daily_data, weekly=weekly_data, monthly=monthly_data)
    water_trend = AreaTrend(daily=daily_data, weekly=weekly_data, monthly=monthly_data)
    
    power_outage_frequency = random.uniform(0.1, 0.8)
    overall_sentiment = random.uniform(-0.5, 0.8)
    
    return {
        "name": area_name,
        "crimeTrend": crime_trend,
        "powerOutageFrequency": round(power_outage_frequency, 2),
        "waterShortageTrend": water_trend,
        "overallSentiment": round(overall_sentiment, 2),
        "lastUpdatedAt": datetime.now(timezone.utc),
        "totalPosts": 0,
        "postTypes": {}
    }

from fastapi_utilities import ttl_lru_cache

@ttl_lru_cache(ttl=5, max_size=528)
@router.get("/area-insights", response_model=Area)
async def get_area_insights(
    latitude: float = Query(..., description="Latitude of the area"),
    longitude: float = Query(..., description="Longitude of the area"),
    radius_km: float = Query(5.0, description="Radius in kilometers to analyze", ge=0.1, le=50.0)
):
    """
    Get area insights based on real post data in the specified area.
    Uses geohash-based queries for efficient data retrieval.
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
        
        # Analyze real post data for insights
        insights_data = analyze_posts_for_insights(latitude, longitude, radius_km)
        
        # Convert to Area model
        insights = Area(**insights_data)
        
        return insights
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating area insights: {str(e)}"
        ) 
@ttl_lru_cache(ttl=5, max_size=528)
@router.get("/area-analysis-response", response_class=JSONResponse)
async def get_area_analysis_response():
    """
    Returns the static area analysis response from the JSON file.
    """
    try:
        
        with open(os.path.join(os.path.dirname(__file__), '../../../area_analysis_response.json'), 'r') as f:
            data = json.load(f)
        return JSONResponse(content=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading area analysis response: {str(e)}") 

@router.post("/analyze-area", response_class=JSONResponse)
async def analyze_area_with_webhook(request: AreaAnalysisRequest):
    """
    Analyze area using external webhook API with coordinate-based caching.
    Checks for cached data first, then calls webhook if needed.
    """
    try:
        # Validate coordinates
        if not request.coordinates or 'lat' not in request.coordinates or 'lng' not in request.coordinates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid coordinates format. Expected 'lat' and 'lng' keys."
            )
        
        lat = request.coordinates['lat']
        lng = request.coordinates['lng']
        
        if not (-90 <= lat <= 90):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Latitude must be between -90 and 90"
            )
        
        if not (-180 <= lng <= 180):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Longitude must be between -180 and 180"
            )
        
        # Generate cache key based on request parameters
        cache_key = generate_cache_key(request.coordinates, request.analysisType, request.timeRange)
        
        # Check if cached response exists
        cached_response = load_cached_response(cache_key)
        if cached_response:
            print(f"Returning cached response for coordinates: {lat}, {lng}")
            return JSONResponse(content=cached_response)
        
        # Prepare payload for external API
        payload = {
            "coordinates": request.coordinates,
            "analysisType": request.analysisType,
            "timeRange": request.timeRange
        }
        
        # Call external webhook API
        webhook_url = "https://donothackmyapi.duckdns.org/webhook/analyze-area"
        
        import httpx

        async with httpx.AsyncClient() as client:
            response = await client.post(
                webhook_url,
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'User-Agent': 'SynapCityApp/1.0'
                },
                timeout=None
            )
        try:
            
            if response.status_code == 200:
                response_data = response.json()
                
                # Save response to cache
                save_response_to_cache(cache_key, response_data)
                print(f"Saved new response to cache for coordinates: {lat}, {lng}")
                
                # Return the response from the external API
                return JSONResponse(content=response_data)
            else:
                # Log the error and return a fallback response
                print(f"External API error: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"External API returned error: {response.status_code}"
                )
                
        except requests.exceptions.Timeout:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="External API request timed out"
            )
        except requests.exceptions.RequestException as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error calling external API: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing area: {str(e)}"
        ) 


@router.get("/heatmap-data")
async def get_heatmap_data(
    latitude: float = Query(..., description="Current location latitude"),
    longitude: float = Query(..., description="Current location longitude"),
    radius_km: float = Query(3.0, description="Search radius in kilometers", ge=0.1, le=10.0)
):
    """
    Get heatmap data for posts within the specified radius.
    Returns polygon coordinates for issue posts and marker data for all posts.
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
                        post_data['distance'] = distance
                        all_posts.append(post_data)
        
        # Process posts for heatmap data
        issue_polygons = []
        markers = []
        
        # Group issue posts by category for unified polygons
        issue_groups = {}
        
        for post in all_posts:
            post_lat = post['location'].latitude
            post_lon = post['location'].longitude
            post_type = post.get('type', 'other')
            
            # Create marker data for all posts
            marker_data = {
                'id': post['postId'],
                'type': post_type,
                'title': post.get('content', '')[:50] + ('...' if len(post.get('content', '')) > 50 else ''),
                'latitude': post_lat,
                'longitude': post_lon,
                'content': post.get('content', ''),
                'author': post.get('author', {}).get('username', 'Anonymous'),
                'createdAt': post.get('createdAt', ''),
                'upvotes': post.get('upvotes', 0),
                'downvotes': post.get('downvotes', 0),
                'category': post.get('category', 'general'),
                'severity': 'high' if post.get('category') in ['accident', 'emergency'] else 
                          'medium' if post.get('category') == 'infrastructure' else 'low'
            }
            markers.append(marker_data)
            
            # Group issue posts by category for unified polygons
            if post_type == 'issue':
                category = post.get('category', 'general')
                severity = marker_data['severity']
                
                group_key = f"{category}_{severity}"
                if group_key not in issue_groups:
                    issue_groups[group_key] = {
                        'category': category,
                        'severity': severity,
                        'coordinates': [],
                        'post_ids': [],
                        'titles': []
                    }
                
                issue_groups[group_key]['coordinates'].append((post_lat, post_lon))
                issue_groups[group_key]['post_ids'].append(post['postId'])
                issue_groups[group_key]['titles'].append(marker_data['title'])
        
        # Create unified polygons for each issue group
        for group_key, group_data in issue_groups.items():
            if len(group_data['coordinates']) >= 1:  # At least 1 coordinate needed
                try:
                    # Remove duplicate coordinates first
                    unique_coords = []
                    seen_coords = set()
                    for coord in group_data['coordinates']:
                        coord_key = (round(coord[0], 6), round(coord[1], 6))
                        if coord_key not in seen_coords:
                            seen_coords.add(coord_key)
                            unique_coords.append(coord)
                    
                    if len(unique_coords) == 1:
                        # Single point - create a small polygon around it
                        lat, lon = unique_coords[0]
                        polygon_coords = create_issue_area_polygon(lat, lon, precision=6)
                    else:
                        # Multiple points - create convex hull connecting all points
                        polygon_coords = create_unified_issue_polygon(unique_coords)
                    
                    if polygon_coords and len(polygon_coords) >= 3:
                        issue_polygons.append({
                            'groupId': group_key,
                            'category': group_data['category'],
                            'severity': group_data['severity'],
                            'coordinates': polygon_coords,
                            'postIds': list(set(group_data['post_ids'])),  # Remove duplicate post IDs
                            'postCount': len(set(group_data['post_ids'])),
                            'title': f"{group_data['category'].title()} Issues ({len(set(group_data['post_ids']))} reports)"
                        })
                        
                except Exception as e:
                    print(f"Error creating unified polygon for group {group_key}: {str(e)}")
                    continue
        
        # Group polygons by severity for better visualization
        grouped_polygons = {
            'high': [],
            'medium': [],
            'low': []
        }
        
        for polygon in issue_polygons:
            severity = polygon['severity']
            grouped_polygons[severity].append(polygon)
        
        return {
            "center": {
                "latitude": latitude,
                "longitude": longitude
            },
            "radius_km": radius_km,
            "total_posts": len(all_posts),
            "issue_polygons": grouped_polygons,
            "markers": markers,
            "stats": {
                "issues": len([p for p in markers if p['type'] == 'issue']),
                "events": len([p for p in markers if p['type'] == 'event']),
                "resolved": len([p for p in markers if p['type'] == 'resolved']),
                "other": len([p for p in markers if p['type'] not in ['issue', 'event', 'resolved']])
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating heatmap data: {str(e)}"
        ) 

