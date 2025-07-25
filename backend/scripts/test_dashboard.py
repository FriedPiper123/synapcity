#!/usr/bin/env python3
"""
Test script to verify dashboard functionality works correctly.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.api.v1.dashboard import get_dashboard_stats, get_recent_activities

def test_dashboard_functions():
    """Test dashboard functions with sample data"""
    print("Testing dashboard functions...")
    
    # Test coordinates (Bangalore)
    latitude = 12.9716
    longitude = 77.5946
    radius_km = 5.0
    
    try:
        # Test stats function
        print("\nTesting get_dashboard_stats...")
        stats = get_dashboard_stats(latitude, longitude, radius_km)
        print("✅ Stats function works")
        print(f"  - Active Issues: {stats.get('activeIssues', 0)}")
        print(f"  - Resolved Today: {stats.get('resolvedToday', 0)}")
        print(f"  - Community Posts: {stats.get('communityPosts', 0)}")
        print(f"  - Active Citizens: {stats.get('activeCitizens', 0)}")
        print(f"  - Engagement: {stats.get('engagementPercentage', 0)}%")
        
        # Test activities function
        print("\nTesting get_recent_activities...")
        activities = get_recent_activities(latitude, longitude, radius_km, limit=5)
        print("✅ Activities function works")
        print(f"  - Found {len(activities)} activities")
        
        for i, activity in enumerate(activities[:3]):
            print(f"  Activity {i+1}: {activity.get('type', 'unknown')} - {activity.get('title', 'No title')}")
        
        print("\n✅ All dashboard tests passed!")
        
    except Exception as e:
        print(f"❌ Error testing dashboard functions: {str(e)}")
        import traceback
        traceback.print_exc()

def test_route_endpoint():
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    payload = {
        "origin": {"latitude": 12.9716, "longitude": 77.5946},
        "destination": {"latitude": 13.0827, "longitude": 80.2707},
        "mode": "driving"
    }
    response = client.post("/api/v1/location/route", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "route" in data or "directions" in data or "total_distance" in data  # Accepts both AI and fallback keys
    print("Route API response:", data)

if __name__ == "__main__":
    test_dashboard_functions() 