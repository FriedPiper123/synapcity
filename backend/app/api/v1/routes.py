import uuid
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Any, Dict
import httpx
import asyncio
from datetime import datetime
import logging
from enum import Enum

# Add import for SynapCitySmartTrafficIntelligence
from app.agents.route_intelligence.smart_route import SynapCitySmartTrafficIntelligence

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Configuration
EXTERNAL_ROUTE_API_URL = "https://donothackmyapi.duckdns.org/webhook-test/7c01cf26-2b97-4599-b233-26584f8b26bf"
REQUEST_TIMEOUT = 30
MAX_RETRIES = 2

class IncidentType(str, Enum):
    ACCIDENT = "accident"
    CONSTRUCTION = "construction" 
    CLOSURE = "closure"
    PATTERN = "pattern"
    CROWDING = "crowding"

class RouteStatus(str, Enum):
    BLOCKED = "blocked"
    HEAVY = "heavy"
    MODERATE = "moderate"
    CLEAR = "clear"

class Recommendation(str, Enum):
    AVOID = "avoid"
    CAUTION = "caution"
    PROCEED = "proceed"

class RouteRequest(BaseModel):
    origin: str = Field(..., min_length=3, max_length=200, description="Starting location")
    destination: str = Field(..., min_length=3, max_length=200, description="Destination location")
    departure_time: Optional[int] = Field(None, alias="departure time", description="Departure time in milliseconds")

    @validator('departure_time')
    def validate_departure_time(cls, v):
        if v is not None and v < 0:
            raise ValueError('Departure time must be positive')
        return v

# New API Response Models
class JourneyInfo(BaseModel):
    origin: str
    destination: str
    departure_time: int
    search_radius_km: int = 5

class RouteSummary(BaseModel):
    distance: str
    base_duration: str
    current_duration: str
    traffic_impact: str
    confidence_score: float

class RouteRecommendation(BaseModel):
    status: str  # "recommended", "caution", "avoid"
    reason: str
    user_action: str

class RouteSegment(BaseModel):
    segment_id: str
    roads: List[str]
    distance: str
    duration: str
    traffic_status: str
    incidents: List[Dict[str, Any]]

class RouteInsights(BaseModel):
    primary_concern: Dict[str, Any]
    positive_factors: List[str]
    alerts: List[Dict[str, Any]]
    weather: Dict[str, Any]

class RouteData(BaseModel):
    route_id: int
    priority: int
    route_name: str
    summary: RouteSummary
    recommendation: RouteRecommendation
    route_segments: List[RouteSegment]
    insights: RouteInsights
    polyline: Optional[List[Dict[str, float]]] = None

class JourneySummary(BaseModel):
    total_routes_found: int
    recommended_route_id: int
    overall_traffic_status: str
    estimated_journey_time_range: str
    best_departure_window: str

class AreaSentiment(BaseModel):
    name: str
    overall_mood: float
    traffic_satisfaction: float
    trending_issues: List[str]

class ContextualInsights(BaseModel):
    area_sentiment: Dict[str, Any]
    predictive_alerts: List[Dict[str, Any]]

class AlternativeRoutes(BaseModel):
    avoid_traffic: Optional[Dict[str, Any]] = None
    shortest_distance: Optional[Dict[str, Any]] = None

class APIMetadata(BaseModel):
    data_sources: List[str]
    last_updated: str
    cache_expires: str
    api_version: str = "v1.2"

class EnhancedRoutesResponse(BaseModel):
    status: str = "success"
    timestamp: str
    request_id: str
    journey: JourneyInfo
    summary: JourneySummary
    routes: List[RouteData]
    alternatives: AlternativeRoutes
    contextual_insights: ContextualInsights
    metadata: APIMetadata

def format_duration(minutes: int) -> str:
    """Convert minutes to human readable duration"""
    if minutes < 60:
        return f"{minutes} mins"
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours}h {mins}m" if mins > 0 else f"{hours}h"

def calculate_route_priority(route_data: Dict, is_recommended: bool) -> int:
    """Calculate route priority based on multiple factors"""
    base_priority = 1 if is_recommended else 2
    
    # Consider traffic status
    traffic_priority = {
        "clear": 0,
        "moderate": 1,
        "heavy": 2,
        "blocked": 3
    }
    
    # Consider confidence score
    confidence_priority = int((1 - route_data.get('confidence_score', 0.5)) * 2)
    
    return base_priority + traffic_priority.get(route_data.get('overall_status', 'moderate'), 1) + confidence_priority

def extract_route_name(origin: str, destination: str, route_id: int) -> str:
    """Generate a descriptive route name"""
    route_names = [
        "Bellary Road Route",
        "NH 44 Route", 
        "Airport Express Route",
        "City Center Route",
        "Outer Ring Road Route"
    ]
    return route_names[route_id % len(route_names)]

def create_journey_summary(routes: List[RouteData], best_route_id: int) -> JourneySummary:
    """Create journey summary from route data"""
    if not routes:
        return JourneySummary(
            total_routes_found=0,
            recommended_route_id=0,
            overall_traffic_status="unknown",
            estimated_journey_time_range="Unknown",
            best_departure_window="Unknown"
        )
    
    # Calculate time range from route summaries
    durations = []
    for route in routes:
        # Extract duration from current_duration string (e.g., "58 mins" -> 58)
        duration_str = route.summary.current_duration
        if 'mins' in duration_str:
            try:
                duration = int(duration_str.split()[0])
                durations.append(duration)
            except (ValueError, IndexError):
                durations.append(0)
        else:
            durations.append(0)
    
    min_duration = min(durations) if durations else 0
    max_duration = max(durations) if durations else 0
    
    time_range = f"{min_duration}-{max_duration} mins" if min_duration != max_duration else f"{min_duration} mins"
    
    # Determine overall traffic status
    statuses = [route.recommendation.status for route in routes]
    if 'avoid' in statuses:
        overall_status = 'heavy'
    elif 'caution' in statuses:
        overall_status = 'moderate'
    else:
        overall_status = 'clear'
    
    return JourneySummary(
        total_routes_found=len(routes),
        recommended_route_id=best_route_id,
        overall_traffic_status=overall_status,
        estimated_journey_time_range=time_range,
        best_departure_window="now - next 15 mins"
    )

def create_contextual_insights() -> ContextualInsights:
    """Create contextual insights for the journey"""
    return ContextualInsights(
        area_sentiment={
            "origin_area": {
                "name": "HSR Layout",
                "overall_mood": 7.2,
                "traffic_satisfaction": 6.5,
                "trending_issues": ["power outages", "water supply"]
            },
            "route_corridor": {
                "avg_satisfaction": 6.8,
                "major_concerns": ["traffic congestion", "road quality"]
            }
        },
        predictive_alerts=[
            {
                "type": "congestion_forecast",
                "message": "Traffic likely to worsen in next 30 mins on NH 44",
                "confidence": 0.85,
                "suggested_action": "Leave now or wait until after 8 PM"
            }
        ]
    )

def create_alternatives(routes: List[RouteData], best_route_id: int) -> AlternativeRoutes:
    """Create alternative route suggestions"""
    if len(routes) < 2:
        return AlternativeRoutes()
    
    # Find alternative routes
    other_routes = [r for r in routes if r.route_id != best_route_id]
    
    alternatives = AlternativeRoutes()
    
    if other_routes:
        # Find route with least traffic (based on recommendation status)
        traffic_route = min(other_routes, key=lambda r: 0 if r.recommendation.status == 'proceed' else 1)
        alternatives.avoid_traffic = {
            "route_id": traffic_route.route_id,
            "reason": "Bypass heavy traffic areas",
            "trade_off": f"May have less traffic but longer distance"
        }
        
        # Find shortest distance route (based on number of segments)
        distance_route = min(other_routes, key=lambda r: len(r.route_segments))
        alternatives.shortest_distance = {
            "route_id": distance_route.route_id,
            "reason": "Shortest physical distance",
            "trade_off": "May have more city traffic"
        }
    
    return alternatives

@router.post("/best-route")
async def get_best_route(data: RouteRequest):
    """Get the best route with comprehensive analysis using new API structure."""
    request_id = f"req_{uuid.uuid4().hex[:8]}"

    # Prepare arguments
    origin = data.origin.strip()
    destination = data.destination.strip()
    departure_time = data.departure_time or int(datetime.now().timestamp() * 1000)

    try:
        # Use the intelligence engine as an async context manager
        async with SynapCitySmartTrafficIntelligence() as synap_city:
            # Fetch route insights from local intelligence engine
            routes_with_insights = await synap_city.get_per_route_insights(origin, destination, departure_time)
            from pprint import pprint

            # pprint(routes_with_insights)

            return routes_with_insights

            # print(100*"%")
            # Extract insights and metadata
            insights = routes_with_insights.get('insights', [])
            analysis_metadata = routes_with_insights.get('analysis_metadata', {})
            
            # Process routes into new format
            enhanced_routes = []
            best_route_id = None
            total_delay = 0
            
            for route in insights:
                route_id = route.get('route_id')
                groups = route.get('insights', [])
                
                # Calculate route metrics
                total_estimated_delay = sum(group.get('total_delay', 0) for group in groups)
                confidence_scores = [group.get('confidence_score', 0.0) for group in groups]
                avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0
                
                # Determine overall status
                statuses = [group.get('overall_status', 'clear') for group in groups]
                if 'blocked' in statuses:
                    overall_status = 'blocked'
                elif 'heavy' in statuses:
                    overall_status = 'heavy'
                elif 'moderate' in statuses:
                    overall_status = 'moderate'
                else:
                    overall_status = 'clear'
                
                # Create route segments
                route_segments = []
                for i, group in enumerate(groups):
                    segment = RouteSegment(
                        segment_id=f"seg_{i}",
                        roads=[f"Road {i+1}"],  # Placeholder - would need actual road data
                        distance=f"{len(groups) * 2.5} km",  # Placeholder
                        duration=f"{group.get('total_delay', 0)} mins",
                        traffic_status=group.get('overall_status', 'clear'),
                        incidents=[
                            {
                                "type": incident.get('type', 'unknown'),
                                "severity": incident.get('severity', 'medium'),
                                "description": incident.get('description', ''),
                                "impact": f"+{incident.get('estimated_delay', 0)} mins delay",
                                "location": "Unknown"
                            }
                            for incident in group.get('active_incidents', [])
                        ]
                    )
                    route_segments.append(segment)
                
                # Create route insights
                primary_concern = {
                    "type": "heavy_traffic" if overall_status in ['heavy', 'blocked'] else "normal_traffic",
                    "severity": overall_status,
                    "affected_area": "Route corridor",
                    "cause": "Multiple factors",
                    "estimated_delay": total_estimated_delay,
                    "confidence": avg_confidence
                }
                
                positive_factors = []
                if overall_status == 'clear':
                    positive_factors.append("Clear traffic conditions")
                if avg_confidence > 0.8:
                    positive_factors.append("High confidence data")
                
                alerts = []
                for group in groups:
                    for incident in group.get('active_incidents', []):
                        alerts.append({
                            "type": incident.get('type', 'unknown'),
                            "severity": incident.get('severity', 'medium'),
                            "message": incident.get('description', ''),
                            "alternative": group.get('alternative', '')
                        })
                
                weather = {
                    "impact_level": "low",
                    "conditions": "clear",
                    "visibility_km": 10.0,
                    "affecting_traffic": False
                }
                
                route_insights = RouteInsights(
                    primary_concern=primary_concern,
                    positive_factors=positive_factors,
                    alerts=alerts,
                    weather=weather
                )
                
                # Create route data
                route_data = RouteData(
                    route_id=route_id,
                    priority=calculate_route_priority({
                        'overall_status': overall_status,
                        'confidence_score': avg_confidence
                    }, False),  # Will be updated after determining best route
                    route_name=extract_route_name(origin, destination, route_id),
                    summary=RouteSummary(
                        distance=f"{len(groups) * 15} km",  # Placeholder
                        base_duration=format_duration(total_estimated_delay),
                        current_duration=format_duration(total_estimated_delay),
                        traffic_impact=f"+{total_estimated_delay} mins delay" if total_estimated_delay > 0 else "No delay",
                        confidence_score=avg_confidence
                    ),
                    recommendation=RouteRecommendation(
                        status="proceed" if overall_status != 'blocked' else "avoid",
                        reason="Route analysis completed",
                        user_action="proceed_with_caution" if overall_status == 'moderate' else "proceed"
                    ),
                    route_segments=route_segments,
                    insights=route_insights
                )
                
                enhanced_routes.append(route_data)
                total_delay += total_estimated_delay
            
            # Determine best route
            if enhanced_routes:
                best_route = min(enhanced_routes, key=lambda r: (
                    r.recommendation.status == "avoid",
                    r.summary.current_duration,
                    -r.summary.confidence_score
                ))
                best_route_id = best_route.route_id
                best_route.priority = 1
                best_route.recommendation.status = "recommended"
            
            # Create journey summary
            journey_summary = create_journey_summary(enhanced_routes, best_route_id or 0)
            
            # Create alternatives
            alternatives = create_alternatives(enhanced_routes, best_route_id or 0)
            
            # Create contextual insights
            contextual_insights = create_contextual_insights()
            
            # Create metadata
            metadata = APIMetadata(
                data_sources=analysis_metadata.get('data_sources_used', ['google_maps', 'tomtom_incidents', 'user_reports', 'weather_api']),
                last_updated=datetime.now().isoformat() + "Z",
                cache_expires=(datetime.now().replace(second=0, microsecond=0)).isoformat() + "Z",
                api_version="v1.2"
            )
            
            # Calculate response time
            end_time = datetime.now()
            
            return EnhancedRoutesResponse(
                status="success",
                timestamp=datetime.now().isoformat() + "Z",
                request_id=request_id,
                journey=JourneyInfo(
                    origin=origin,
                    destination=destination,
                    departure_time=departure_time,
                    search_radius_km=5
                ),
                summary=journey_summary,
                routes=enhanced_routes,
                alternatives=alternatives,
                contextual_insights=contextual_insights,
                metadata=metadata
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_best_route: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error while processing route data"
        )


def get_fallback_predictions(query: str) -> List[Dict]:
    """Fallback function to provide local search results when AI model is not available."""
    query_lower = query.lower()
    
    # Local Bangalore locations database for fallback
    bangalore_locations = {
        # Areas
        'koramangala': {'name': 'Koramangala', 'type': 'area', 'lat': 12.9352, 'lng': 77.6245},
        'indiranagar': {'name': 'Indiranagar', 'type': 'area', 'lat': 12.9789, 'lng': 77.6408},
        'whitefield': {'name': 'Whitefield', 'type': 'area', 'lat': 12.9716, 'lng': 77.5946},
        'electronic': {'name': 'Electronic City', 'type': 'area', 'lat': 12.8458, 'lng': 77.6658},
        'hsr': {'name': 'HSR Layout', 'type': 'area', 'lat': 12.9141, 'lng': 77.6387},
        'btm': {'name': 'BTM Layout', 'type': 'area', 'lat': 12.9141, 'lng': 77.6387},
        'jayanagar': {'name': 'Jayanagar', 'type': 'area', 'lat': 12.9245, 'lng': 77.5877},
        'malleshwaram': {'name': 'Malleshwaram', 'type': 'area', 'lat': 13.0067, 'lng': 77.5617},
        'banashankari': {'name': 'Banashankari', 'type': 'area', 'lat': 12.9245, 'lng': 77.5877},
        'jp nagar': {'name': 'JP Nagar', 'type': 'area', 'lat': 12.9141, 'lng': 77.6387},
        'rajajinagar': {'name': 'Rajajinagar', 'type': 'area', 'lat': 13.0067, 'lng': 77.5617},
        'hebbal': {'name': 'Hebbal', 'type': 'area', 'lat': 13.0507, 'lng': 77.5877},
        'bellandur': {'name': 'Bellandur', 'type': 'area', 'lat': 12.9716, 'lng': 77.5946},
        'marathahalli': {'name': 'Marathahalli', 'type': 'area', 'lat': 12.9716, 'lng': 77.5946},
        
        # Landmarks
        'cubbon': {'name': 'Cubbon Park', 'type': 'landmark', 'lat': 12.9716, 'lng': 77.5946},
        'lalbagh': {'name': 'Lalbagh Botanical Garden', 'type': 'landmark', 'lat': 12.9507, 'lng': 77.5848},
        'palace': {'name': 'Bangalore Palace', 'type': 'landmark', 'lat': 12.9981, 'lng': 77.5925},
        'vidhana soudha': {'name': 'Vidhana Soudha', 'type': 'landmark', 'lat': 12.9791, 'lng': 77.5913},
        'iskcon': {'name': 'ISKCON Temple', 'type': 'landmark', 'lat': 12.9716, 'lng': 77.5946},
        
        # Transport
        'airport': {'name': 'Kempegowda International Airport', 'type': 'transport', 'lat': 13.1986, 'lng': 77.7066},
        'majestic': {'name': 'Majestic Bus Station', 'type': 'transport', 'lat': 12.9774, 'lng': 77.5716},
        
        # Shopping
        'phoenix': {'name': 'Phoenix MarketCity', 'type': 'shopping', 'lat': 12.9716, 'lng': 77.5946},
        'forum': {'name': 'Forum Mall', 'type': 'shopping', 'lat': 12.9352, 'lng': 77.6245},
        'ub city': {'name': 'UB City Mall', 'type': 'shopping', 'lat': 12.9716, 'lng': 77.5946},
        'garuda': {'name': 'Garuda Mall', 'type': 'shopping', 'lat': 12.9716, 'lng': 77.5946},
        
        # Tech Parks
        'manyata': {'name': 'Manyata Tech Park', 'type': 'business', 'lat': 12.9716, 'lng': 77.5946},
        'embassy tech': {'name': 'Embassy Tech Village', 'type': 'business', 'lat': 12.9716, 'lng': 77.5946},
        'electronic city': {'name': 'Electronic City', 'type': 'business', 'lat': 12.8458, 'lng': 77.6658},
        
        # Common categories
        'restaurant': {'name': 'Popular Restaurants in Bangalore', 'type': 'food', 'lat': 12.9716, 'lng': 77.5946},
        'cafe': {'name': 'Popular Cafes in Bangalore', 'type': 'food', 'lat': 12.9716, 'lng': 77.5946},
        'hospital': {'name': 'Major Hospitals in Bangalore', 'type': 'healthcare', 'lat': 12.9716, 'lng': 77.5946},
        'clinic': {'name': 'Medical Clinics in Bangalore', 'type': 'healthcare', 'lat': 12.9716, 'lng': 77.5946},
        'school': {'name': 'Schools in Bangalore', 'type': 'education', 'lat': 12.9716, 'lng': 77.5946},
        'college': {'name': 'Colleges in Bangalore', 'type': 'education', 'lat': 12.9716, 'lng': 77.5946},
        'university': {'name': 'Universities in Bangalore', 'type': 'education', 'lat': 12.9716, 'lng': 77.5946},
        'hotel': {'name': 'Hotels in Bangalore', 'type': 'accommodation', 'lat': 12.9716, 'lng': 77.5946},
        'bank': {'name': 'Banks in Bangalore', 'type': 'business', 'lat': 12.9716, 'lng': 77.5946},
        'atm': {'name': 'ATMs in Bangalore', 'type': 'business', 'lat': 12.9716, 'lng': 77.5946},
        'gas station': {'name': 'Petrol Pumps in Bangalore', 'type': 'transport', 'lat': 12.9716, 'lng': 77.5946},
        'petrol pump': {'name': 'Petrol Pumps in Bangalore', 'type': 'transport', 'lat': 12.9716, 'lng': 77.5946},
    }
    
    results = []
    
    # Search for exact matches first
    for key, location in bangalore_locations.items():
        if query_lower in key or key in query_lower:
            results.append({
                'place_id': f"fallback_{location['name'].lower().replace(' ', '_')}",
                'description': location['name'],
                'structured_formatting': {
                    'main_text': location['name'],
                    'secondary_text': f"{location['type']} • Fallback"
                },
                'types': [location['type']],
                'metadata': {
                    'confidence': 0.8,
                    'popular': True,
                    'coordinates': {
                        'latitude': location['lat'],
                        'longitude': location['lng']
                    }
                }
            })
    
    # Return top 5 results
    return results[:5]


@router.get("/test-gemini")
async def test_gemini():
    """Test endpoint to check if Gemini model is working."""
    try:
        from app.agents.user_posts_feeds.gemini_model import GeminiModel
        from app.agents.user_posts_feeds.constants import GEMINI_API_KEY
        
        if not GEMINI_API_KEY:
            return {"error": "GEMINI_API_KEY not configured"}
        
        gemini_model = GeminiModel(api_key=GEMINI_API_KEY)
        
        # Simple test
        response = gemini_model(
            task="location_prediction",
            user_input="test",
            max_results=1,
            city="Bangalore"
        )
        
        return {"success": True, "response": response}
        
    except Exception as e:
        logger.error(f"Gemini test failed: {e}")
        return {"error": str(e)}

@router.get("/autocomplete")
async def get_location_autocomplete(
    query: str = Query(..., min_length=2, description="Location search query")
):
    """Get location suggestions for autocomplete using AI-based prediction."""
    try:
        # Import the AI model and prompt creator
        from app.agents.user_posts_feeds.gemini_model import GeminiModel
        from app.agents.user_posts_feeds.constants import GEMINI_API_KEY
        from app.agents.user_posts_feeds.post_feed_utils.prompt_creator import get_quick_matches
        
        # First, check for quick matches
        quick_match = get_quick_matches(query.lower(), "Bangalore")
        logger.info(f"Quick match for '{query}': {quick_match}")
        
        if quick_match and "HIGH CONFIDENCE:" in quick_match:
            # Extract the location name from quick match
            location_name = quick_match.replace("HIGH CONFIDENCE: '", "").replace("'", "")
            logger.info(f"Using quick match: {location_name}")
            
            # Return quick match result
            quick_result = {
                "place_id": f"quick_{location_name.lower().replace(' ', '_')}",
                "description": location_name,
                "structured_formatting": {
                    "main_text": location_name,
                    "secondary_text": "Quick Match"
                },
                "types": ["geocode"],
                "metadata": {
                    "confidence": 0.95,
                    "popular": True,
                    "coordinates": {
                        "latitude": 12.9716,  # Default Bangalore coordinates
                        "longitude": 77.5946
                    }
                }
            }
            
            return {"predictions": [quick_result]}
        
        # If no quick match, proceed with AI model
        logger.info(f"No quick match found for '{query}', using AI model")
        
        if not GEMINI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Gemini API key not configured"
            )
        
        # Initialize the AI model
        gemini_model = GeminiModel(api_key=GEMINI_API_KEY)
        
        # Define generic terms to filter out
        GENERIC_TERMS = [
            'near me', 'my area', 'close', 'something', 'around me', 'nearby', 
            'current location', 'my place', 'here', 'this area', 'my location',
            'where i am', 'my vicinity', 'my neighborhood', 'my city'
        ]
        
        def is_real_location(prediction):
            """Filter out generic queries and ensure only real locations are returned."""
            name = prediction.get('name', '').lower()
            display = prediction.get('display', '').lower()
            
            # Check for generic terms
            for term in GENERIC_TERMS:
                if term in name or term in display:
                    return False
            
            # Ensure it has valid coordinates
            lat = prediction.get('lat')
            lng = prediction.get('lng')
            if not lat or not lng:
                return False
            
            # Ensure it has a valid type
            location_type = prediction.get('type', '').lower()
            valid_types = ['area', 'landmark', 'business', 'transport', 'shopping', 'food']
            if location_type not in valid_types:
                return False
            
            return True
        
        # Use AI-based location prediction with optimized prompt
        try:
            logger.info(f"Calling AI model for query: {query}")
            ai_response = gemini_model(
                task="location_prediction",
                user_input=query,
                max_results=5,
                city="Bangalore"
            )
            
            logger.info(f"AI response received: {ai_response}")
            
            # Extract predictions from AI response
            predictions = ai_response.get('predictions', [])
            logger.info(f"Extracted {len(predictions)} predictions from AI response")
            
            # Filter out generic queries and ensure only real locations
            filtered_predictions = []
            for pred in predictions:
                logger.info(f"Processing prediction: {pred}")
                if is_real_location(pred):
                    # Transform to match frontend expectations
                    filtered_predictions.append({
                        'place_id': f"ai_{pred.get('name', '').replace(' ', '_').lower()}",
                        'description': pred.get('name', ''),
                        'structured_formatting': {
                            'main_text': pred.get('display', pred.get('name', '')),
                            'secondary_text': f"{pred.get('type', 'location')} • {pred.get('confidence', 0.5):.1f}"
                        },
                        'types': [pred.get('type', 'geocode')],
                        'metadata': {
                            'confidence': pred.get('confidence', 0.5),
                            'popular': pred.get('popular', False),
                            'coordinates': {
                                'latitude': pred.get('lat'),
                                'longitude': pred.get('lng')
                            }
                        }
                    })
            
            # Sort by confidence and popularity
            filtered_predictions.sort(key=lambda x: (
                x['metadata']['confidence'], 
                x['metadata']['popular']
            ), reverse=True)
            
            # Limit to top 5 results for faster response
            filtered_predictions = filtered_predictions[:5]
            
            logger.info(f"Returning {len(filtered_predictions)} AI predictions")
            return {"predictions": filtered_predictions}
            
        except Exception as ai_error:
            logger.error(f"AI-based location prediction failed: {ai_error}")
            logger.error(f"Error type: {type(ai_error)}")
            logger.error(f"Error details: {str(ai_error)}")
            
            # Check if it's a quota error
            if "429" in str(ai_error) or "RESOURCE_EXHAUSTED" in str(ai_error):
                logger.warning("Gemini API quota exceeded, falling back to local search")
                # Fallback to local search based on the query
                fallback_results = get_fallback_predictions(query)
                logger.info(f"Fallback returned {len(fallback_results)} results")
                return {"predictions": fallback_results}
            
            # For any other error, also try fallback
            logger.warning("AI model failed, trying fallback search")
            fallback_results = get_fallback_predictions(query)
            logger.info(f"Fallback returned {len(fallback_results)} results")
            return {"predictions": fallback_results}
            
    except Exception as e:
        logger.error(f"Unexpected error in location autocomplete: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error while fetching location suggestions"
        )