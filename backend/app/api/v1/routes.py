from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Any
import httpx
import os

router = APIRouter()

EXTERNAL_ROUTE_API_URL = "https://donothackmyapi.duckdns.org/webhook-test/7c01cf26-2b97-4599-b233-26584f8b26bf"

class RouteRequest(BaseModel):
    origin: str
    destination: str
    departure_time: Optional[int] = Field(None, alias="departure time")

class RouteInsight(BaseModel):
    route_id: int
    insights: Any
    last_updated: Optional[str]

class RouteGroupSummary(BaseModel):
    group_id: str
    overall_status: str
    recommendation: str
    total_delay: int
    key_factors: list
    alternative: str
    summary: str
    # Explicit delay causes
    accident: list = []
    construction: list = []
    closure: list = []
    weather: dict = {}
    crowding: list = []
    pattern: list = []
    traffic: dict = {}

class RouteSummary(BaseModel):
    route_id: int
    total_estimated_delay: int
    groups: list
    overall_status: str
    recommendation: str
    summary: str

class RoutesSummaryResponse(BaseModel):
    overall_summary: str
    routes: list

@router.post("/best-route", response_model=RoutesSummaryResponse)
async def get_best_route(data: RouteRequest):
    request_body = {
        "origin": data.origin,
        "destination": data.destination,
    }
    if data.departure_time:
        request_body["departure time"] = data.departure_time
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(EXTERNAL_ROUTE_API_URL, json=request_body, timeout=20)
            resp.raise_for_status()
            routes = resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"External route API error: {str(e)}")
    if not routes or not isinstance(routes, list):
        raise HTTPException(status_code=502, detail="Invalid response from external route API")

    # Compose overall summary
    overall_summary = "The data compares {} main route{} ({}). Both routes are heavily impacted by accidents, road closures, and extensive construction, with most segments being blocked and an 'avoid' recommendation.".format(
        len(routes),
        "s" if len(routes) > 1 else "",
        ", ".join([f"route_id: {r.get('route_id')}" for r in routes])
    )

    route_summaries = []
    for route in routes:
        route_id = route.get("route_id")
        insights = route.get("insights", [])
        groups = []
        total_estimated_delay = 0
        overall_status = None
        recommendation = None
        for group in insights:
            group_id = group.get("group_id")
            status = group.get("overall_status")
            rec = group.get("recommendation")
            delay = group.get("estimated_total_delay", 0)
            key_factors = group.get("key_factors", [])
            alt = group.get("alternative_suggestion", "")
            summary = group.get("summary", "")

            # Extract explicit causes
            accident = []
            construction = []
            closure = []
            weather = group.get("weather_impact", {})
            crowding = []
            pattern = []
            traffic = group.get("traffic_analysis", {})
            for incident in group.get("active_incidents", []):
                typ = incident.get("type", "")
                if typ == "accident":
                    accident.append(incident)
                elif typ == "construction":
                    construction.append(incident)
                elif typ == "closure":
                    closure.append(incident)
                elif typ == "pattern":
                    pattern.append(incident)
                elif typ == "crowding":
                    crowding.append(incident)
            groups.append({
                "group_id": group_id,
                "overall_status": status,
                "recommendation": rec,
                "total_delay": delay,
                "key_factors": key_factors,
                "alternative": alt,
                "summary": summary,
                "accident": accident,
                "construction": construction,
                "closure": closure,
                "weather": weather,
                "crowding": crowding,
                "pattern": pattern,
                "traffic": traffic
            })
            total_estimated_delay += delay if delay else 0
            # Use the first group's status/recommendation for route-level summary
            if overall_status is None:
                overall_status = status
            if recommendation is None:
                recommendation = rec
        route_summary = {
            "route_id": route_id,
            "total_estimated_delay": total_estimated_delay,
            "groups": groups,
            "overall_status": overall_status,
            "recommendation": recommendation,
            "summary": f"Route {route_id} is {'severely congested' if total_estimated_delay > 45 else 'moderately congested'} with a total estimated delay of ~{total_estimated_delay} minutes. Recommendation: {recommendation.capitalize() if recommendation else ''}."
        }
        route_summaries.append(route_summary)

    return {
        "overall_summary": overall_summary,
        "routes": route_summaries
    }
