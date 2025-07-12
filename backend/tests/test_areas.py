import pytest
from unittest.mock import AsyncMock
from fastapi import status
from datetime import datetime, timezone

@pytest.mark.asyncio
async def test_get_area_data_success(client, mock_firebase_service):
    # Setup
    area_data = {
        "name": "Test Area",
        "crimeTrend": {
            "current_level": "low",
            "trend_direction": "decreasing",
            "incidents_this_month": 5
        },
        "powerOutageFrequency": 2,
        "waterShortageTrend": {
            "current_status": "normal",
            "frequency": "rare",
            "last_reported": datetime.now(timezone.utc).isoformat()
        },
        "overallSentiment": 0.8,
        "lastUpdatedAt": datetime.now(timezone.utc).isoformat()
    }
    
    mock_firebase_service.get_area_data = AsyncMock(return_value=area_data)
    
    # Test
    response = client.get("/api/v1/areas/Test%20Area")
    
    # Assert
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["name"] == "Test Area"
    assert response.json()["crimeTrend"]["current_level"] == "low"
    assert response.json()["powerOutageFrequency"] == 2

@pytest.mark.asyncio
async def test_get_area_data_not_found(client, mock_firebase_service):
    # Setup
    mock_firebase_service.get_area_data = AsyncMock(return_value=None)
    
    # Test
    response = client.get("/api/v1/areas/NonExistentArea")
    
    # Assert
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "not found" in response.json()["detail"].lower()
