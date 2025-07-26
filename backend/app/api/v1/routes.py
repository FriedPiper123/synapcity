from fastapi import APIRouter, HTTPException, status
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