#!/usr/bin/env python3
"""
Test script for area analysis caching functionality.
"""

import requests
import json
import time

# Test coordinates
test_coordinates = {
    "lat": 37.7749,
    "lng": -122.4194
}

test_payload = {
    "coordinates": test_coordinates,
    "analysisType": "comprehensive",
    "timeRange": "week"
}

base_url = "http://localhost:8000/api/v1/insights"

def test_cache_functionality():
    """Test the caching functionality"""
    print("Testing Area Analysis Caching Functionality")
    print("=" * 50)
    
    # Test 1: Check cache status (should be empty initially)
    print("\n1. Checking initial cache status...")
    try:
        response = requests.get(f"{base_url}/cache-status")
        if response.status_code == 200:
            cache_status = response.json()
            print(f"   Cache enabled: {cache_status['cache_enabled']}")
            print(f"   Total cached responses: {cache_status['total_cached_responses']}")
        else:
            print(f"   Error getting cache status: {response.status_code}")
    except Exception as e:
        print(f"   Error: {str(e)}")
    
    # Test 2: Clear cache to ensure clean state
    print("\n2. Clearing cache for clean state...")
    try:
        response = requests.delete(f"{base_url}/clear-cache")
        if response.status_code == 200:
            result = response.json()
            print(f"   {result['message']}")
            print(f"   Cleared files: {result['cleared_files']}")
        else:
            print(f"   Error clearing cache: {response.status_code}")
    except Exception as e:
        print(f"   Error: {str(e)}")
    
    # Test 3: Make first API call (should call webhook and cache response)
    print("\n3. Making first API call (should call webhook)...")
    try:
        start_time = time.time()
        response = requests.post(f"{base_url}/analyze-area", json=test_payload)
        first_call_time = time.time() - start_time
        
        if response.status_code == 200:
            print(f"   ✓ First call successful (took {first_call_time:.2f}s)")
            print("   ✓ Response should be saved to cache")
        else:
            print(f"   ✗ First call failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
    
    # Test 4: Check cache status (should have 1 cached response)
    print("\n4. Checking cache status after first call...")
    try:
        response = requests.get(f"{base_url}/cache-status")
        if response.status_code == 200:
            cache_status = response.json()
            print(f"   Cache enabled: {cache_status['cache_enabled']}")
            print(f"   Total cached responses: {cache_status['total_cached_responses']}")
            if cache_status['total_cached_responses'] > 0:
                print("   ✓ Cache file created successfully")
                for cache_file in cache_status['cache_files']:
                    print(f"   - File: {cache_file['filename']}")
                    print(f"   - Cached at: {cache_file['cached_at']}")
            else:
                print("   ✗ No cache file found")
        else:
            print(f"   Error getting cache status: {response.status_code}")
    except Exception as e:
        print(f"   Error: {str(e)}")
    
    # Test 5: Make second API call with same parameters (should return cached response)
    print("\n5. Making second API call (should return cached response)...")
    try:
        start_time = time.time()
        response = requests.post(f"{base_url}/analyze-area", json=test_payload)
        second_call_time = time.time() - start_time
        
        if response.status_code == 200:
            print(f"   ✓ Second call successful (took {second_call_time:.2f}s)")
            if second_call_time < first_call_time * 0.5:  # Should be significantly faster
                print("   ✓ Response likely from cache (much faster)")
            else:
                print("   ? Response time not significantly faster (might not be cached)")
        else:
            print(f"   ✗ Second call failed: {response.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
    
    # Test 6: Test clearing cache for specific coordinates
    print("\n6. Testing coordinate-specific cache clearing...")
    try:
        coords_string = f"{test_coordinates['lat']},{test_coordinates['lng']}"
        response = requests.delete(f"{base_url}/clear-cache?coordinates={coords_string}")
        if response.status_code == 200:
            result = response.json()
            print(f"   {result['message']}")
            print(f"   Cleared files: {result['cleared_files']}")
        else:
            print(f"   Error clearing cache: {response.status_code}")
    except Exception as e:
        print(f"   Error: {str(e)}")
    
    # Test 7: Verify cache was cleared
    print("\n7. Verifying cache was cleared...")
    try:
        response = requests.get(f"{base_url}/cache-status")
        if response.status_code == 200:
            cache_status = response.json()
            print(f"   Total cached responses: {cache_status['total_cached_responses']}")
            if cache_status['total_cached_responses'] == 0:
                print("   ✓ Cache cleared successfully")
            else:
                print("   ✗ Cache still contains files")
        else:
            print(f"   Error getting cache status: {response.status_code}")
    except Exception as e:
        print(f"   Error: {str(e)}")
    
    print("\n" + "=" * 50)
    print("Cache functionality test completed!")
    print("\nNote: Make sure your backend server is running on localhost:8000")
    print("and the webhook URL is accessible for complete testing.")

if __name__ == "__main__":
    test_cache_functionality() 