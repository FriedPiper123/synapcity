#!/usr/bin/env python3
"""
Script to create test posts with geohash data for demonstrating geohash-based queries.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.firebase import db
from app.utils.geohash_utils import encode_geohash
from firebase_admin import firestore
from datetime import datetime, timezone
import uuid

def create_test_posts():
    """
    Create test posts with geohash data around Bangalore coordinates.
    """
    print("Creating test posts with geohash data...")
    
    # Bangalore coordinates
    bangalore_lat = 12.9716
    bangalore_lon = 77.5946
    
    # Test posts with different locations around Bangalore
    test_posts = [
        {
            "content": "Large pothole on MG Road that needs immediate attention",
            "type": "issue",
            "category": "infrastructure",
            "location": {"latitude": bangalore_lat + 0.001, "longitude": bangalore_lon + 0.001},
            "neighborhood": "MG Road Area",
            "authorId": "test_user_1",
            "upvotes": 15,
            "downvotes": 2,
            "commentCount": 5
        },
        {
            "content": "Community cleanup event this weekend at Cubbon Park",
            "type": "event",
            "category": "community",
            "location": {"latitude": bangalore_lat - 0.002, "longitude": bangalore_lon - 0.001},
            "neighborhood": "Cubbon Park Area",
            "authorId": "test_user_2",
            "upvotes": 25,
            "downvotes": 1,
            "commentCount": 8
        },
        {
            "content": "Street light fixed on Brigade Road",
            "type": "resolved",
            "category": "infrastructure",
            "location": {"latitude": bangalore_lat + 0.003, "longitude": bangalore_lon - 0.002},
            "neighborhood": "Brigade Road Area",
            "authorId": "test_user_3",
            "upvotes": 30,
            "downvotes": 0,
            "commentCount": 3
        },
        {
            "content": "Water leak reported near Commercial Street",
            "type": "issue",
            "category": "water_shortage",
            "location": {"latitude": bangalore_lat - 0.001, "longitude": bangalore_lon + 0.003},
            "neighborhood": "Commercial Street Area",
            "authorId": "test_user_4",
            "upvotes": 12,
            "downvotes": 3,
            "commentCount": 7
        },
        {
            "content": "Power outage in Koramangala area",
            "type": "issue",
            "category": "power_outage",
            "location": {"latitude": bangalore_lat + 0.004, "longitude": bangalore_lon + 0.004},
            "neighborhood": "Koramangala Area",
            "authorId": "test_user_5",
            "upvotes": 18,
            "downvotes": 1,
            "commentCount": 10
        },
        {
            "content": "New bike lanes proposed for Indiranagar",
            "type": "suggestion",
            "category": "transportation",
            "location": {"latitude": bangalore_lat - 0.003, "longitude": bangalore_lon + 0.002},
            "neighborhood": "Indiranagar Area",
            "authorId": "test_user_6",
            "upvotes": 35,
            "downvotes": 5,
            "commentCount": 15
        }
    ]
    
    created_count = 0
    
    for i, post_data in enumerate(test_posts):
        try:
            # Generate unique post ID
            post_id = str(uuid.uuid4())
            
            # Generate geohash for the location
            geohash = encode_geohash(
                post_data["location"]["latitude"], 
                post_data["location"]["longitude"], 
                precision=6
            )
            
            # Convert location to GeoPoint
            location_geopoint = firestore.GeoPoint(
                post_data["location"]["latitude"],
                post_data["location"]["longitude"]
            )
            
            # Create the post document
            post_doc = {
                "postId": post_id,
                "content": post_data["content"],
                "type": post_data["type"],
                "category": post_data["category"],
                "location": location_geopoint,
                "neighborhood": post_data["neighborhood"],
                "authorId": post_data["authorId"],
                "upvotes": post_data["upvotes"],
                "downvotes": post_data["downvotes"],
                "upvotedBy": [],
                "downvotedBy": [],
                "commentCount": post_data["commentCount"],
                "createdAt": datetime.now(timezone.utc),
                "status": "active",
                "location_name": None,
                "mentioned_location_name": None,
                "geohash": geohash,
                "mediaUrl": None,
                "parentId": None
            }
            
            # Add to database
            db.collection('posts').document(post_id).set(post_doc)
            
            print(f"Created test post {i+1}: {post_data['content'][:50]}... (geohash: {geohash})")
            created_count += 1
            
        except Exception as e:
            print(f"Error creating test post {i+1}: {str(e)}")
    
    print(f"\nCreated {created_count} test posts successfully!")
    return created_count

def verify_test_posts():
    """
    Verify that test posts were created and can be queried.
    """
    print("\nVerifying test posts...")
    
    try:
        # Query all posts
        posts = db.collection('posts').stream()
        post_count = 0
        geohash_count = 0
        
        for doc in posts:
            post_data = doc.to_dict()
            post_count += 1
            
            if 'geohash' in post_data and post_data['geohash']:
                geohash_count += 1
                print(f"Post {doc.id}: geohash = {post_data['geohash']}")
        
        print(f"\nTotal posts: {post_count}")
        print(f"Posts with geohash: {geohash_count}")
        
        return post_count, geohash_count
        
    except Exception as e:
        print(f"Error verifying posts: {str(e)}")
        return 0, 0

if __name__ == "__main__":
    print("Test Posts Creation Script")
    print("=" * 50)
    
    # Create test posts
    created_count = create_test_posts()
    
    print("\n" + "=" * 50)
    
    # Verify test posts
    total_posts, geohash_posts = verify_test_posts()
    
    print("\n" + "=" * 50)
    print("Script completed!")
    print(f"- Created: {created_count} test posts")
    print(f"- Total posts in DB: {total_posts}")
    print(f"- Posts with geohash: {geohash_posts}")
    
    if geohash_posts > 0:
        print("\nYou can now test the geohash-based queries:")
        print("curl -X GET 'http://localhost:8000/api/v1/posts/nearby?latitude=12.9716&longitude=77.5946&radius_km=5.0'") 