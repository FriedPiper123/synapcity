#!/usr/bin/env python3
"""
Migration script to add geohash fields to existing posts in Firebase.
This script will update all existing posts to include a geohash field for efficient location-based queries.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.firebase import db
from app.utils.geohash_utils import encode_geohash
from firebase_admin import firestore

def add_geohash_to_existing_posts():
    """
    Add geohash field to all existing posts in the database.
    """
    print("Starting geohash migration for existing posts...")
    
    try:
        # Get all posts from the database
        posts_ref = db.collection('posts')
        posts = posts_ref.stream()
        
        updated_count = 0
        skipped_count = 0
        error_count = 0
        
        for post_doc in posts:
            try:
                post_data = post_doc.to_dict()
                
                # Skip if post already has geohash
                if 'geohash' in post_data and post_data['geohash']:
                    print(f"Post {post_doc.id} already has geohash: {post_data['geohash']}")
                    skipped_count += 1
                    continue
                
                # Check if post has location data
                if 'location' not in post_data or not hasattr(post_data['location'], 'latitude'):
                    print(f"Post {post_doc.id} has no location data, skipping...")
                    skipped_count += 1
                    continue
                
                # Generate geohash for the post location
                latitude = post_data['location'].latitude
                longitude = post_data['location'].longitude
                geohash = encode_geohash(latitude, longitude, precision=6)
                
                # Update the post with geohash
                posts_ref.document(post_doc.id).update({
                    'geohash': geohash
                })
                
                print(f"Updated post {post_doc.id} with geohash: {geohash}")
                updated_count += 1
                
            except Exception as e:
                print(f"Error updating post {post_doc.id}: {str(e)}")
                error_count += 1
        
        print(f"\nMigration completed:")
        print(f"- Updated: {updated_count} posts")
        print(f"- Skipped: {skipped_count} posts")
        print(f"- Errors: {error_count} posts")
        
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        raise

def create_geohash_index():
    """
    Create a composite index for geohash-based queries.
    Note: This is a placeholder as Firebase indexes are typically created through the console.
    """
    print("Note: For optimal performance, create a composite index in Firebase Console:")
    print("- Collection: posts")
    print("- Fields: geohash (Ascending), createdAt (Descending)")
    print("- Also add: geohash (Ascending), type (Ascending), createdAt (Descending)")
    print("- And: geohash (Ascending), category (Ascending), createdAt (Descending)")

if __name__ == "__main__":
    print("Geohash Migration Script")
    print("=" * 50)
    
    # Add geohash to existing posts
    add_geohash_to_existing_posts()
    
    print("\n" + "=" * 50)
    
    # Provide index creation guidance
    create_geohash_index() 