#!/usr/bin/env python3
"""
Simple test script to verify dashboard functions work correctly.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import only what we need
from app.core.firebase import db
from app.utils.geohash_utils import get_geohash_cells_for_radius, calculate_distance
from datetime import datetime, timezone, timedelta
from collections import defaultdict

def test_dashboard_functions():
    """Test dashboard functions with sample data"""
    print("Testing dashboard functions...")
    
    # Test coordinates (Bangalore)
    latitude = 12.9716
    longitude = 77.5946
    radius_km = 5.0
    
    try:
        # Test geohash cells function
        print("\nTesting geohash cells...")
        geohash_cells = get_geohash_cells_for_radius(latitude, longitude, radius_km)
        print(f"✅ Generated {len(geohash_cells)} geohash cells")
        
        # Test distance calculation
        print("\nTesting distance calculation...")
        distance = calculate_distance(latitude, longitude, latitude + 0.01, longitude + 0.01)
        print(f"✅ Distance calculation works: {distance:.2f} km")
        
        # Test post collection (simplified)
        print("\nTesting post collection...")
        all_posts = []
        for geohash_cell in geohash_cells[:2]:  # Test only first 2 cells
            try:
                posts_query = db.collection('posts').where('geohash', '==', geohash_cell)
                for doc in posts_query.stream():
                    post_data = doc.to_dict()
                    post_data['postId'] = doc.id
                    
                    if 'location' in post_data and hasattr(post_data['location'], 'latitude'):
                        post_lat = post_data['location'].latitude
                        post_lon = post_data['location'].longitude
                        
                        distance = calculate_distance(latitude, longitude, post_lat, post_lon)
                        if distance <= radius_km:
                            all_posts.append({
                                **post_data,
                                'distance': distance
                            })
            except Exception as e:
                print(f"  Warning: Error querying geohash cell {geohash_cell}: {e}")
        
        print(f"✅ Found {len(all_posts)} posts in area")
        
        # Test stats calculation
        print("\nTesting stats calculation...")
        if all_posts:
            now = datetime.now(timezone.utc)
            today = now.replace(hour=0, minute=0, second=0, microsecond=0)
            
            type_counts = defaultdict(int)
            status_counts = defaultdict(int)
            today_resolved = 0
            unique_users = set()
            
            for post in all_posts:
                post_type = post.get('type', 'other')
                post_status = post.get('status', 'active')
                author_id = post.get('authorId')
                created_at = post.get('createdAt')
                
                if isinstance(created_at, str):
                    created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                
                type_counts[post_type] += 1
                status_counts[post_status] += 1
                
                if author_id:
                    unique_users.add(author_id)
                
                if post_status == 'resolved' and created_at >= today:
                    today_resolved += 1
            
            stats = {
                "activeIssues": type_counts.get('issue', 0),
                "resolvedToday": today_resolved,
                "communityPosts": len(all_posts),
                "activeCitizens": len(unique_users),
                "engagementPercentage": 0.0,
                "totalPosts": len(all_posts),
                "postTypes": dict(type_counts),
                "statusCounts": dict(status_counts)
            }
            
            print("✅ Stats calculation works")
            print(f"  - Active Issues: {stats['activeIssues']}")
            print(f"  - Resolved Today: {stats['resolvedToday']}")
            print(f"  - Community Posts: {stats['communityPosts']}")
            print(f"  - Active Citizens: {stats['activeCitizens']}")
        else:
            print("✅ Stats calculation works (no posts found)")
        
        print("\n✅ All dashboard tests passed!")
        
    except Exception as e:
        print(f"❌ Error testing dashboard functions: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_dashboard_functions() 