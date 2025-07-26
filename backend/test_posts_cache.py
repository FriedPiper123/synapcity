#!/usr/bin/env python3
"""
Test script to verify posts caching functionality works correctly.
"""

import sys
import os
import asyncio
import time
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.cache import cached_posts_endpoint, posts_cache_stats, clear_posts_cache

# Test function with caching
@cached_posts_endpoint(max_age_seconds=60, max_memory_mb=5)
async def test_posts_function(latitude: float, longitude: float, radius_km: float = 5.0):
    """Test function that simulates a posts API endpoint"""
    print(f"Executing posts function with params: lat={latitude}, lng={longitude}, radius={radius_km}")
    # Simulate some processing time
    await asyncio.sleep(0.1)
    return {
        "posts": [
            {"id": "1", "content": f"Post near {latitude}, {longitude}"},
            {"id": "2", "content": f"Another post in radius {radius_km}km"}
        ],
        "count": 2,
        "timestamp": time.time()
    }

async def test_posts_caching():
    """Test the posts caching functionality"""
    print("Testing posts caching system...")
    
    # Clear cache first
    clear_posts_cache()
    print("Posts cache cleared")
    
    # First call - should execute function
    print("\n1. First call (cache miss):")
    result1 = await test_posts_function(12.9716, 77.5946, 5.0)
    print(f"Result: {len(result1['posts'])} posts found")
    
    # Second call with same params - should use cache
    print("\n2. Second call (cache hit):")
    result2 = await test_posts_function(12.9716, 77.5946, 5.0)
    print(f"Result: {len(result2['posts'])} posts found")
    
    # Third call with different params - should execute function
    print("\n3. Third call with different params (cache miss):")
    result3 = await test_posts_function(12.9716, 77.5946, 10.0)
    print(f"Result: {len(result3['posts'])} posts found")
    
    # Fourth call with original params - should use cache
    print("\n4. Fourth call with original params (cache hit):")
    result4 = await test_posts_function(12.9716, 77.5946, 5.0)
    print(f"Result: {len(result4['posts'])} posts found")
    
    # Check cache stats
    print("\n5. Posts cache statistics:")
    stats = posts_cache_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
    # Test memory limit
    print("\n6. Testing memory limit:")
    large_result = await test_posts_function(0.0, 0.0, 100.0)
    print(f"Large result size: {len(str(large_result))} characters")
    
    # Final stats
    print("\n7. Final posts cache statistics:")
    final_stats = posts_cache_stats()
    for key, value in final_stats.items():
        print(f"  {key}: {value}")
    
    print("\n✅ Posts caching test completed!")

if __name__ == "__main__":
    asyncio.run(test_posts_caching()) 