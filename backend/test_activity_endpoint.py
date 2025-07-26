#!/usr/bin/env python3
"""
Test script for the new activity enhance endpoint
"""
import requests
import json

def test_activity_enhance_endpoint():
    """Test the new activity enhance endpoint"""
    base_url = "http://0.0.0.0:8000"
    
    # Test payload based on the example provided
    test_payload = {
        "type": "issue",
        "category": "infrastructure", 
        "neighborhood": "HSR", 
        "summary": """
                    A large pothole on 15 A main is causing traffic issues and potential vehicle damage, requiring immediate attention.
                    """
    }
    
    print("Testing activity enhance endpoint...")
    try:
        # Test the new enhance endpoint
        response = requests.post(
            f"{base_url}/api/v1/dashboard/activity/enhance",
            json=test_payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer test-token"  # You'll need a real token
            }
        )
        
        if response.status_code == 200:
            enhanced_data = response.json()
            print("✅ Activity enhance endpoint works!")
            print(f"Original summary: {test_payload['summary'].strip()}")
            print(f"Enhanced summary: {enhanced_data.get('enhanced_summary', 'Not available')}")
            print(f"External references: {len(enhanced_data.get('external_references', []))}")
            
            # Print external references if available
            if enhanced_data.get('external_references'):
                print("\nExternal References:")
                for i, ref in enumerate(enhanced_data['external_references'], 1):
                    print(f"  {i}. {ref.get('title', 'No title')} - {ref.get('link', 'No link')}")
            
            return True
        else:
            print(f"❌ Activity enhance endpoint failed: {response.status_code}")
            print(response.text)
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure the backend is running.")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_with_real_activity_data():
    """Test with real activity data from recent activities endpoint"""
    base_url = "http://0.0.0.0:8000"
    
    # Test data
    test_params = {
        "latitude": 28.6139,  # Delhi coordinates
        "longitude": 77.2090,
        "radius_km": 5.0
    }
    
    print("\nTesting with real activity data from recent activities...")
    try:
        # First, get recent activities
        response = requests.get(
            f"{base_url}/api/v1/dashboard/recent-activities",
            params=test_params,
            headers={"Authorization": "Bearer test-token"}
        )
        
        if response.status_code == 200:
            activities = response.json()
            print(f"Found {len(activities.get('activities', []))} activities")
            
            if activities.get('activities'):
                # Test with the first activity
                first_activity = activities['activities'][0]
                
                # Prepare payload for enhance endpoint
                enhance_payload = {
                    "type": first_activity.get("type", ""),
                    "category": first_activity.get("category", ""),
                    "neighborhood": first_activity.get("location", ""),
                    "summary": first_activity.get("content", "")
                }
                
                print(f"Enhancing activity: {first_activity.get('title', 'Unknown')}")
                
                # Test the enhance endpoint
                enhance_response = requests.post(
                    f"{base_url}/api/v1/dashboard/activity/enhance",
                    json=enhance_payload,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": "Bearer test-token"
                    }
                )
                
                if enhance_response.status_code == 200:
                    enhanced_data = enhance_response.json()
                    print("✅ Real activity enhancement works!")
                    print(f"External references: {len(enhanced_data.get('external_references', []))}")
                    return True
                else:
                    print(f"❌ Real activity enhancement failed: {enhance_response.status_code}")
                    print(enhance_response.text)
                    return False
            else:
                print("No activities found to test with")
                return False
        else:
            print(f"❌ Recent activities endpoint failed: {response.status_code}")
            print(response.text)
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure the backend is running.")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    print("Testing new activity enhance endpoint...")
    
    # Test with example payload
    success1 = test_activity_enhance_endpoint()
    
    # Test with real activity data
    success2 = test_with_real_activity_data()
    
    if success1 and success2:
        print("\n🎉 All tests passed!")
    else:
        print("\n💥 Some tests failed!") 