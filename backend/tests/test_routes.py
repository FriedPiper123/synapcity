import pytest
import asyncio
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
import httpx
from app.main import app  # Adjust import path as needed

# Test data
MOCK_ROUTE_API_SUCCESS_RESPONSE = [
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
                        "reliability": 1.0
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
                "estimated_total_delay": 90,
                "last_updated": "2025-07-22T06:30:00Z"
            }
        ],
        "last_updated": "2025-07-23T07:57:40.402000"
    },
    {
        "route_id": 1,
        "insights": [
            {
                "group_id": "group_0",
                "overall_status": "moderate",
                "recommendation": "caution",
                "confidence_score": 0.85,
                "summary": "Route has moderate traffic with some construction delays.",
                "traffic_analysis": {
                    "speed_reduction_percent": 25,
                    "delay_minutes": 5,
                    "congestion_level": "moderate",
                    "flow_confidence": 0.90
                },
                "active_incidents": [
                    {
                        "type": "construction",
                        "severity": "medium",
                        "description": "Road work on main street.",
                        "estimated_delay": 15,
                        "source": "city_reports",
                        "reliability": 0.88
                    }
                ],
                "weather_impact": {
                    "impact_level": "low",
                    "conditions": "clear",
                    "visibility_km": 10,
                    "affecting_traffic": False
                },
                "key_factors": ["Minor construction delays"],
                "alternative_suggestion": "Consider parallel roads",
                "estimated_total_delay": 15,
                "last_updated": "2025-07-22T08:00:00Z"
            }
        ],
        "last_updated": "2025-07-23T07:57:40.408000"
    }
]

class TestRoutesAPI:
    """Test suite for the routes API endpoint."""
    
    def setup_method(self):
        """Setup test client."""
        self.client = TestClient(app)
        self.valid_request_data = {
            "origin": "HSR Layout, Bangalore",
            "destination": "Kempegowda International Airport, Bangalore",
            "departure_time": 1753317000000
        }

    @patch("httpx.AsyncClient.post")
    async def test_successful_route_request(self, mock_post):
        """Test successful route request with valid data."""
        # Setup mock
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = MOCK_ROUTE_API_SUCCESS_RESPONSE
        mock_response.raise_for_status = MagicMock()
        
        mock_post.return_value.__aenter__.return_value = mock_response
        
        # Make request
        response = self.client.post("/api/v1/routes/best-route", json=self.valid_request_data)
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "overall_summary" in data
        assert "routes" in data
        assert "total_routes" in data
        assert "best_route_id" in data
        assert "response_time_ms" in data
        
        # Check routes
        assert isinstance(data["routes"], list)
        assert len(data["routes"]) == 2
        assert data["total_routes"] == 2
        
        # Check route details
        route = data["routes"][0]
        assert "route_id" in route
        assert "total_estimated_delay" in route
        assert "groups" in route
        assert "overall_status" in route
        assert "recommendation" in route
        assert "summary" in route
        
        # Check group details
        group = route["groups"][0]
        assert "accidents" in group
        assert "construction" in group
        assert "closures" in group
        assert "weather" in group
        assert "traffic" in group
        
        # Check that incidents are properly categorized
        assert len(group["accidents"]) == 1
        assert len(group["construction"]) == 1
        assert len(group["closures"]) == 1
        
        # Check best route determination
        assert data["best_route_id"] == 1  # Route 1 should be better (less delay)

    def test_invalid_request_missing_destination(self):
        """Test request with missing destination."""
        invalid_data = {
            "origin": "HSR Layout, Bangalore"
            # Missing destination
        }
        
        response = self.client.post("/api/v1/routes/best-route", json=invalid_data)
        assert response.status_code == 422

    def test_invalid_request_empty_origin(self):
        """Test request with empty origin."""
        invalid_data = {
            "origin": "",
            "destination": "Airport"
        }
        
        response = self.client.post("/api/v1/routes/best-route", json=invalid_data)
        assert response.status_code == 422

    def test_invalid_departure_time(self):
        """Test request with invalid departure time."""
        invalid_data = {
            "origin": "HSR Layout",
            "destination": "Airport", 
            "departure_time": -1000
        }
        
        response = self.client.post("/api/v1/routes/best-route", json=invalid_data)
        assert response.status_code == 422

    @patch("httpx.AsyncClient.post")
    async def test_external_api_timeout(self, mock_post):
        """Test handling of external API timeout."""
        mock_post.side_effect = httpx.TimeoutException("Request timeout")
        
        response = self.client.post("/api/v1/routes/best-route", json=self.valid_request_data)
        
        assert response.status_code == 504
        assert "timeout" in response.json()["detail"].lower()

    @patch("httpx.AsyncClient.post")
    async def test_external_api_server_error(self, mock_post):
        """Test handling of external API server error."""
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Server Error", request=MagicMock(), response=mock_response
        )
        
        mock_post.return_value.__aenter__.return_value = mock_response
        
        response = self.client.post("/api/v1/routes/best-route", json=self.valid_request_data)
        
        assert response.status_code == 502

    @patch("httpx.AsyncClient.post")
    async def test_external_api_invalid_response(self, mock_post):
        """Test handling of invalid response from external API."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {}  # Invalid empty response
        mock_response.raise_for_status = MagicMock()
        
        mock_post.return_value.__aenter__.return_value = mock_response
        
        response = self.client.post("/api/v1/routes/best-route", json=self.valid_request_data)
        
        assert response.status_code == 502

    @patch("httpx.AsyncClient.post")
    async def test_malformed_incidents_handling(self, mock_post):
        """Test handling of malformed incident data."""
        malformed_response = [{
            "route_id": 0,
            "insights": [{
                "group_id": "group_0",
                "overall_status": "blocked",
                "recommendation": "avoid",
                "confidence_score": 0.95,
                "summary": "Test route",
                "active_incidents": [
                    {
                        "type": "invalid_type",  # Invalid incident type
                        "severity": "high",
                        "description": "Test incident",
                        "estimated_delay": 30,
                        "source": "test",
                        "reliability": 0.9
                    },
                    {
                        "type": "accident",
                        "severity": "medium",
                        "description": "Valid accident",
                        "estimated_delay": 15,
                        "source": "test",
                        "reliability": 0.8
                    }
                ],
                "estimated_total_delay": 45,
                "key_factors": ["Test factors"]
            }]
        }]
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = malformed_response
        mock_response.raise_for_status = MagicMock()
        
        mock_post.return_value.__aenter__.return_value = mock_response
        
        response = self.client.post("/api/v1/routes/best-route", json=self.valid_request_data)
        
        # Should still succeed but filter out invalid incidents
        assert response.status_code == 200
        data = response.json()
        
        # Check that valid incidents are processed
        group = data["routes"][0]["groups"][0]
        assert len(group["accidents"]) == 1  # Only valid accident should be included

    @patch("httpx.AsyncClient.post")
    async def test_missing_route_id(self, mock_post):
        """Test handling of routes without route_id."""
        response_without_id = [{
            "insights": [{
                "group_id": "group_0",
                "overall_status": "blocked",
                "recommendation": "avoid",
                "summary": "Test route",
                "estimated_total_delay": 30
            }]
            # Missing route_id
        }]
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = response_without_id
        mock_response.raise_for_status = MagicMock()
        
        mock_post.return_value.__aenter__.return_value = mock_response
        
        response = self.client.post("/api/v1/routes/best-route", json=self.valid_request_data)
        
        # Should return error since no valid routes found
        assert response.status_code == 502

    def test_departure_time_alias(self):
        """Test that departure time alias works correctly."""
        data_with_alias = {
            "origin": "HSR Layout",
            "destination": "Airport",
            "departure time": 1753317000000  # Using alias
        }
        
        # This should not cause validation error
        # The actual API call would be mocked in a real test
        # Here we're just testing that the model accepts the alias
        from app.routers.routes import RouteRequest
        
        request = RouteRequest(**data_with_alias)
        assert request.departure_time == 1753317000000

    @pytest.mark.asyncio
    async def test_retry_logic(self):
        """Test retry logic for failed requests."""
        from app.routers.routes import fetch_route_data_with_retry
        
        with patch("httpx.AsyncClient.post") as mock_post:
            # First call fails, second succeeds
            mock_post.side_effect = [
                httpx.TimeoutException("First timeout"),
                MagicMock()
            ]
            
            # Setup successful response for second call
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = MOCK_ROUTE_API_SUCCESS_RESPONSE
            mock_response.raise_for_status = MagicMock()
            mock_post.return_value.__aenter__.return_value = mock_response
            
            result = await fetch_route_data_with_retry({"origin": "A", "destination": "B"})
            
            assert result == MOCK_ROUTE_API_SUCCESS_RESPONSE
            assert mock_post.call_count == 2  # Should have retried once

if __name__ == "__main__":
    pytest.main([__file__])