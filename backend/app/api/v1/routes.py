from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Any, Dict
import httpx
import asyncio
from datetime import datetime
import logging
from enum import Enum

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

async def fetch_route_data_with_retry(request_body: dict) -> dict:
    """Fetch route data with retry logic and proper error handling."""
    last_exception = None
    
    for attempt in range(MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient() as client:
                logger.info(f"Fetching route data (attempt {attempt + 1})")
                
                response = await client.post(
                    EXTERNAL_ROUTE_API_URL, 
                    json=request_body, 
                    timeout=REQUEST_TIMEOUT
                )
                response.raise_for_status()
                
                data = response.json()
                
                # Validate response structure
                if not isinstance(data, list) or not data:
                    raise ValueError("Invalid response format: expected non-empty list")
                
                return data
                
        except httpx.TimeoutException as e:
            last_exception = e
            logger.warning(f"Request timeout on attempt {attempt + 1}")
            if attempt < MAX_RETRIES:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
                
        except httpx.HTTPStatusError as e:
            last_exception = e
            logger.error(f"HTTP error {e.response.status_code} on attempt {attempt + 1}")
            if e.response.status_code >= 500 and attempt < MAX_RETRIES:
                await asyncio.sleep(2 ** attempt)
            else:
                break  # Don't retry on client errors (4xx)
                
        except Exception as e:
            last_exception = e
            logger.error(f"Unexpected error on attempt {attempt + 1}: {e}")
            if attempt < MAX_RETRIES:
                await asyncio.sleep(2 ** attempt)
    
    # If we get here, all retries failed
    if isinstance(last_exception, httpx.TimeoutException):
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="External route API timeout after retries"
        )
    elif isinstance(last_exception, httpx.HTTPStatusError):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"External route API error: {last_exception.response.status_code}"
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"External route API error: {str(last_exception)}"
        )

@router.post("/best-route", response_model=RoutesSummaryResponse)
async def get_best_route(data: RouteRequest):
    """Get the best route with comprehensive analysis."""
    start_time = datetime.now()
    
    # Prepare request body
    request_body = {
        "origin": data.origin.strip(),
        "destination": data.destination.strip(),
    }
    
    if data.departure_time:
        request_body["departure time"] = data.departure_time
    
    try:
        # Fetch route data with retry logic
        routes_data = await fetch_route_data_with_retry(request_body)
        
        # Process routes
        route_summaries = []
        
        for route_data in routes_data:
            route_id = route_data.get("route_id")
            if route_id is None:
                logger.warning("Route missing route_id, skipping")
                continue
                
            insights = route_data.get("insights", [])
            groups = []
            total_estimated_delay = 0
            route_confidence_scores = []
            
            # Process each group within the route
            for group_data in insights:
                try:
                    # Extract basic group info
                    group_id = group_data.get("group_id", "")
                    overall_status = group_data.get("overall_status", "moderate")
                    recommendation = group_data.get("recommendation", "caution")
                    delay = group_data.get("estimated_total_delay", 0)
                    confidence_score = group_data.get("confidence_score", 0.0)
                    
                    # Categorize incidents
                    incidents = group_data.get("active_incidents", [])
                    categorized = categorize_incidents(incidents)
                    
                    # Extract traffic and weather data
                    traffic_data = group_data.get("traffic_analysis", {})
                    weather_data = group_data.get("weather_impact", {})
                    
                    # Create group summary
                    group_summary = RouteGroupSummary(
                        group_id=group_id,
                        overall_status=overall_status,
                        recommendation=recommendation,
                        total_delay=delay,
                        key_factors=group_data.get("key_factors", []),
                        alternative=group_data.get("alternative_suggestion", ""),
                        summary=group_data.get("summary", ""),
                        confidence_score=confidence_score,
                        accident=categorized["accident"],
                        construction=categorized["construction"],
                        closure=categorized["closure"],
                        weather=weather_data,
                        crowding=categorized["crowding"],
                        pattern=categorized["pattern"],
                        traffic=traffic_data,
                        last_updated=group_data.get("last_updated")
                    )
                    
                    groups.append(group_summary)
                    total_estimated_delay += delay
                    route_confidence_scores.append(confidence_score)
                    
                except Exception as e:
                    logger.error(f"Error processing group {group_data.get('group_id', 'unknown')}: {e}")
                    continue
            
            if not groups:
                logger.warning(f"No valid groups found for route {route_id}")
                continue
            
            # Determine route-level status and recommendation
            route_status = "clear"
            route_recommendation = "proceed"
            
            if any(g.overall_status == "blocked" for g in groups):
                route_status = "blocked"
                route_recommendation = "avoid"
            elif any(g.overall_status == "heavy" for g in groups):
                route_status = "heavy"
                route_recommendation = "caution"
            elif any(g.overall_status == "moderate" for g in groups):
                route_status = "moderate"
                route_recommendation = "caution"
            
            # Calculate average confidence
            avg_confidence = sum(route_confidence_scores) / len(route_confidence_scores) if route_confidence_scores else 0.0
            
            # Create route summary
            route_summary = RouteSummary(
                route_id=route_id,
                total_estimated_delay=total_estimated_delay,
                groups=groups,
                overall_status=route_status,
                recommendation=route_recommendation,
                summary=generate_route_summary(route_id, total_estimated_delay, route_status, route_recommendation),
                confidence_score=avg_confidence
            )
            
            route_summaries.append(route_summary)
        
        if not route_summaries:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No valid routes found in API response"
            )
        
        # Determine best route
        best_route_id = determine_best_route(route_summaries)
        
        # Generate overall summary
        total_routes = len(route_summaries)
        blocked_routes = sum(1 for r in route_summaries if r.overall_status == "blocked")
        
        if blocked_routes == total_routes:
            status_desc = "All routes are currently blocked or heavily impacted"
        elif blocked_routes > 0:
            status_desc = f"{blocked_routes} of {total_routes} routes are blocked or heavily impacted"
        else:
            status_desc = "Routes are generally clear with minor delays"
        
        overall_summary = f"Found {total_routes} route option{'s' if total_routes > 1 else ''} from {data.origin} to {data.destination}. {status_desc}."
        
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