#!/usr/bin/env python3
"""
Test script for the new analyze-area endpoint
"""
import requests
import json

def test_analyze_area_endpoint():
    """Test the new analyze-area endpoint"""
    base_url = "http://0.0.0.0:8000"
    
    # Test payload based on the example provided
    test_payload = {
        "coordinates": {
            "type": "point",
            "lat": 12.9716,
            "lng": 77.6412
        },
        "analysisType": "full",
        "timeRange": "24hours"
    }
    
    print("Testing analyze-area endpoint...")
    print(f"Payload: {json.dumps(test_payload, indent=2)}")
    
    try:
        # Test the new analyze-area endpoint
        response = requests.post(
            f"{base_url}/api/v1/insights/analyze-area",
            json=test_payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer test-token"  # You'll need a real token
            },
            timeout=60  # 60 second timeout for external API call
        )
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Analyze-area endpoint works!")
            print(f"Response keys: {list(result.keys())}")
            
            # Print a sample of the response
            if isinstance(result, dict):
                print("Sample response data:")
                for key, value in list(result.items())[:3]:  # Show first 3 keys
                    if isinstance(value, dict):
                        print(f"  {key}: {dict(list(value.items())[:2])}...")  # Show first 2 items
                    elif isinstance(value, list):
                        print(f"  {key}: [{len(value)} items]")
                    else:
                        print(f"  {key}: {value}")
            
            return True
        else:
            print(f"❌ Analyze-area endpoint failed: {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out (external API may be slow)")
        return False
    except requests.exceptions.ConnectionError:
        print("❌ Connection error - make sure the backend server is running")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return False

if __name__ == "__main__":
    test_analyze_area_endpoint() 