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

class RouteInsight(BaseModel):
    route_id: int
    insights: Any
    last_updated: Optional[str]

class RouteGroupSummary(BaseModel):
    group_id: str
    overall_status: str
    recommendation: str
    total_delay: int = Field(ge=0)
    key_factors: List[str] = []
    alternative: str = ""
    summary: str
    confidence_score: float = Field(ge=0.0, le=1.0, default=0.0)
    
    # Explicit delay causes
    accident: List[dict] = []
    construction: List[dict] = []
    closure: List[dict] = []
    weather: dict = {}
    crowding: List[dict] = []
    pattern: List[dict] = []
    traffic: dict = {}
    last_updated: Optional[str] = None

class RouteSummary(BaseModel):
    route_id: int
    total_estimated_delay: int = Field(ge=0)
    groups: List[RouteGroupSummary]
    overall_status: str
    recommendation: str
    summary: str
    confidence_score: float = Field(ge=0.0, le=1.0, default=0.0)

class RoutesSummaryResponse(BaseModel):
    overall_summary: str
    routes: List[RouteSummary]
    total_routes: int
    best_route_id: Optional[int] = None
    response_time_ms: int

def categorize_incidents(incidents: List[Dict]) -> Dict[str, List]:
    """Categorize incidents by type with error handling."""
    categorized = {
        "accident": [],
        "construction": [],
        "closure": [],
        "weather": {},
        "crowding": [],
        "pattern": [],
        "traffic": {}
    }
    
    for incident in incidents:
        try:
            incident_type = incident.get("type", "")
            if incident_type == "accident":
                categorized["accident"].append(incident)
            elif incident_type == "construction":
                categorized["construction"].append(incident)
            elif incident_type == "closure":
                categorized["closure"].append(incident)
            elif incident_type == "pattern":
                categorized["pattern"].append(incident)
            elif incident_type == "crowding":
                categorized["crowding"].append(incident)
        except Exception as e:
            logger.warning(f"Failed to categorize incident: {incident}. Error: {e}")
            continue
    
    return categorized

def determine_best_route(routes: List[RouteSummary]) -> Optional[int]:
    """Determine the best route based on delay and status."""
    if not routes:
        return None
    
    best_route = min(routes, key=lambda r: (
        r.overall_status == "blocked",  # Avoid blocked routes
        r.total_estimated_delay,  # Prefer shorter delays
        -r.confidence_score  # Prefer higher confidence
    ))
    
    return best_route.route_id

def generate_route_summary(route_id: int, total_delay: int, status: str, recommendation: str) -> str:
    """Generate a human-readable route summary."""
    if total_delay == 0:
        delay_text = "no expected delays"
    elif total_delay <= 15:
        delay_text = f"minor delays (~{total_delay} min)"
    elif total_delay <= 45:
        delay_text = f"moderate delays (~{total_delay} min)"
    else:
        delay_text = f"significant delays (~{total_delay} min)"
    
    severity_map = {
        "blocked": "severely impacted",
        "heavy": "heavily congested", 
        "moderate": "moderately congested",
        "clear": "clear"
    }
    
    severity = severity_map.get(status, "unknown condition")
    
    return f"Route {route_id} is {severity} with {delay_text}. Recommendation: {recommendation.capitalize()}."

@router.post("/best-route", response_model=RoutesSummaryResponse)
async def get_best_route(data: RouteRequest):
    """Get the best route with comprehensive analysis."""
    start_time = datetime.now()

    # Prepare arguments
    origin = data.origin.strip()
    destination = data.destination.strip()
    departure_time = data.departure_time or int(datetime.now().timestamp() * 1000)

    try:
        # Use the intelligence engine as an async context manager
        async with SynapCitySmartTrafficIntelligence() as synap_city:
            # Fetch route insights from local intelligence engine
            routes_with_insights = await synap_city.get_per_route_insights(origin, destination, departure_time)

            # The structure of routes_with_insights may need to be adapted to fit RoutesSummaryResponse
            # We'll extract and map the fields accordingly
            route_summaries = []
            best_route_id = None
            total_routes = 0
            overall_statuses = []

            # routes_with_insights['insights'] is a list of dicts with route_id, insights, last_updated
            insights = routes_with_insights.get('insights', [])
            for route in insights:
                route_id = route.get('route_id')
                groups = []
                total_estimated_delay = 0
                route_confidence_scores = []
                overall_status = "clear"
                recommendation = "proceed"
                summary = ""
                # Each group in route['insights']
                for group in route.get('insights', []):
                    # Map group fields to RouteGroupSummary
                    group_summary = RouteGroupSummary(
                        group_id=group.get('group_id', ''),
                        overall_status=group.get('overall_status', 'clear'),
                        recommendation=group.get('recommendation', 'proceed'),
                        total_delay=group.get('total_delay', 0),
                        key_factors=group.get('key_factors', []),
                        alternative=group.get('alternative', ''),
                        summary=group.get('summary', ''),
                        confidence_score=group.get('confidence_score', 0.0),
                        accident=group.get('accident', []),
                        construction=group.get('construction', []),
                        closure=group.get('closure', []),
                        weather=group.get('weather', {}),
                        crowding=group.get('crowding', []),
                        pattern=group.get('pattern', []),
                        traffic=group.get('traffic', {}),
                        last_updated=group.get('last_updated')
                    )
                    groups.append(group_summary)
                    total_estimated_delay += group.get('total_delay', 0)
                    route_confidence_scores.append(group.get('confidence_score', 0.0))
                    overall_statuses.append(group.get('overall_status', 'clear'))
                    # Use the first recommendation/summary for the route
                    if not summary:
                        summary = group.get('summary', '')
                    if not recommendation or recommendation == "proceed":
                        recommendation = group.get('recommendation', 'proceed')
                    if group.get('overall_status') == "blocked":
                        overall_status = "blocked"
                # Compute confidence score as average
                confidence_score = sum(route_confidence_scores) / len(route_confidence_scores) if route_confidence_scores else 0.0
                route_summary = RouteSummary(
                    route_id=route_id,
                    total_estimated_delay=total_estimated_delay,
                    groups=groups,
                    overall_status=overall_status,
                    recommendation=recommendation,
                    summary=summary,
                    confidence_score=confidence_score
                )
                route_summaries.append(route_summary)
            total_routes = len(route_summaries)
            # Determine best route
            best_route_id = determine_best_route(route_summaries)
            # Generate overall summary
            blocked_routes = sum(1 for r in route_summaries if r.overall_status == "blocked")
            if blocked_routes == total_routes:
                status_desc = "All routes are currently blocked or heavily impacted"
            elif blocked_routes > 0:
                status_desc = f"{blocked_routes} of {total_routes} routes are blocked or heavily impacted"
            else:
                status_desc = "Routes are generally clear with minor delays"
            overall_summary = f"Found {total_routes} route option{'s' if total_routes != 1 else ''} from {origin} to {destination}. {status_desc}."
            # Calculate response time
            end_time = datetime.now()
            response_time_ms = int((end_time - start_time).total_seconds() * 1000)
            return RoutesSummaryResponse(
                overall_summary=overall_summary,
                routes=route_summaries,
                total_routes=total_routes,
                best_route_id=best_route_id,
                response_time_ms=response_time_ms
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