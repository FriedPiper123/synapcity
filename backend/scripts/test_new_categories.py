#!/usr/bin/env python3
"""
Test script to verify new post categories work correctly.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.post import PostType, PostCategory

def test_categories():
    """Test that all new categories are valid"""
    print("Testing new post categories...")
    
    # Test PostType enum
    print("\nPostType values:")
    for post_type in PostType:
        print(f"  - {post_type.value}")
    
    # Test PostCategory enum
    print("\nPostCategory values:")
    for category in PostCategory:
        print(f"  - {category.value}")
    
    # Test specific values that match frontend
    test_types = ["issue", "suggestion", "event", "resolved"]
    test_categories = ["infrastructure", "safety", "water_shortage", "power_outage", "waste_management", "transportation", "community", "other"]
    
    print("\nTesting frontend compatibility:")
    for test_type in test_types:
        try:
            PostType(test_type)
            print(f"  ✅ PostType '{test_type}' is valid")
        except ValueError:
            print(f"  ❌ PostType '{test_type}' is NOT valid")
    
    for test_category in test_categories:
        try:
            PostCategory(test_category)
            print(f"  ✅ PostCategory '{test_category}' is valid")
        except ValueError:
            print(f"  ❌ PostCategory '{test_category}' is NOT valid")
    
    print("\n✅ All tests completed!")

if __name__ == "__main__":
    test_categories() 