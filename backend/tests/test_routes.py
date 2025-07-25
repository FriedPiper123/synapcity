import pytest
from fastapi.testclient import TestClient
from app.main import app
from unittest.mock import patch
import json

DUMMY_ROUTE_API_RESPONSE = [
    {
        "route_id": 0,
        "insights": [
            {
                "group_id": "group_0",
                "overall_status": "blocked",
                "recommendation": "avoid",
                "confidence_score": 0.95,
                "summary": "Route blocked due to a major accident and multiple road closures.",
                "traffic_analysis": {
                    "speed_reduction_percent": 43,
                    "delay_minutes": 1,
                    "congestion_level": "moderate",
                    "flow_confidence": 0.84
                },
                "active_incidents": [
                    {
                        "type": "closure",
                        "severity": "critical",
                        "description": "Road closure on 9th Main Road.",
                        "estimated_delay": 0,
                        "source": "tomtom_incidents",
                        "reliability": 0.95
                    },
                    {
                        "type": "accident",
                        "severity": "high",
                        "description": "3-car collision near Silk Board junction. Traffic blocked.",
                        "estimated_delay": 45,
                        "source": "synapcity_user_reports",
                        "reliability": 0.9
                    },
                    {
                        "type": "construction",
                        "severity": "high",
                        "description": "Ongoing Metro Construction on Outer Ring Road.",
                        "estimated_delay": 45,
                        "source": "web_search",
                        "reliability": 1
                    }
                ],
                "weather_impact": {
                    "impact_level": "low",
                    "conditions": "scattered clouds",
                    "visibility_km": 8,
                    "affecting_traffic": False
                },
                "key_factors": [
                    "Verified report: Traffic BLOCKED due to major accident.",
                    "Official report: Multiple road closures in the area.",
                    "Ongoing metro construction causing severe delays."
                ],
                "alternative_suggestion": "Use Sarjapur Road as an alternative to the Outer Ring Road.",
                "estimated_total_delay": 60,
                "last_updated": "2025-07-22T06:30:00Z"
            }
        ],
        "last_updated": "2025-07-23T07:57:40.402000"
    }
]

def test_best_route_success():
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value.__aenter__.return_value.status_code = 200
        mock_post.return_value.__aenter__.return_value.json.return_value = DUMMY_ROUTE_API_RESPONSE
        
        client = TestClient(app)
        response = client.post("/api/v1/routes/best-route", json={
            "origin": "sunlife hospital, hsr layout, banglore",
            "destination": "Kempegowada Internation Airport, Terminal 1, Bangalore",
            "departure_time": 1753317000000
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "routes" in data
        assert isinstance(data["routes"], list)
        assert len(data["routes"]) > 0
        assert "groups" in data["routes"][0]
        assert len(data["routes"][0]["groups"]) > 0
        
        # Check that the first group has the expected fields
        first_group = data["routes"][0]["groups"][0]
        assert "accident" in first_group
        assert "construction" in first_group
        assert "closure" in first_group
        assert "weather" in first_group
        assert "traffic" in first_group
        assert "summary" in first_group
        
        # Check that at least one cause is present
        assert len(first_group["accident"]) > 0 or len(first_group["construction"]) > 0

def test_best_route_invalid_body():
    client = TestClient(app)
    response = client.post("/api/v1/routes/best-route", json={
        "origin": "only one field"
    })
    assert response.status_code == 422
