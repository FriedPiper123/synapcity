#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.utils.geohash_utils import create_unified_issue_polygon

# Test with the exact coordinates from the user's data
test_coordinates = [
    (24.57894697608857, 73.61468577580082),
    (24.5798765, 73.6120385),
    (24.578701600633106, 73.6165434208005),
    # Include duplicates as they appear in the API response
    (24.57894697608857, 73.61468577580082),
    (24.5798765, 73.6120385),
    (24.578701600633106, 73.6165434208005)
]

print("Testing polygon creation with user's coordinates:")
print(f"Input coordinates: {test_coordinates}")

try:
    result = create_unified_issue_polygon(test_coordinates)
    print(f"Result: {result}")
    print(f"Number of polygon points: {len(result)}")
    
    if result and len(result) >= 3:
        print("✅ Polygon creation successful!")
        
        # Test with unique coordinates only
        unique_coords = list(set(test_coordinates))
        print(f"\nTesting with unique coordinates: {unique_coords}")
        unique_result = create_unified_issue_polygon(unique_coords)
        print(f"Unique result: {unique_result}")
        print(f"Number of unique polygon points: {len(unique_result)}")
        
    else:
        print("❌ Polygon creation failed - insufficient points")
        
except Exception as e:
    print(f"❌ Error during polygon creation: {e}")
    import traceback
    traceback.print_exc() 