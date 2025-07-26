import uuid
from datetime import datetime, timedelta
import random

# Generate posts for the last 7 days
def generate_traffic_posts():
    base_time = datetime.now()
    posts = []
    
    # Sample Bangalore coordinates and neighborhoods
    bangalore_locations = [
        {"lat": 12.9716, "lng": 77.5946, "area": "MG Road"},
        {"lat": 12.9352, "lng": 77.6245, "area": "Koramangala"},
        {"lat": 12.9698, "lng": 77.7500, "area": "Whitefield"},
        {"lat": 12.9349, "lng": 77.6102, "area": "BTM Layout"},
        {"lat": 12.9720, "lng": 77.6372, "area": "Indiranagar"},
        {"lat": 12.9279, "lng": 77.6271, "area": "HSR Layout"},
        {"lat": 13.0358, "lng": 77.5970, "area": "Hebbal"},
        {"lat": 12.9141, "lng": 77.6210, "area": "Jayanagar"},
        {"lat": 12.9667, "lng": 77.5667, "area": "Malleshwaram"},
        {"lat": 12.9344, "lng": 77.6150, "area": "Bommanahalli"},
        {"lat": 13.0067, "lng": 77.5646, "area": "Rajajinagar"},
        {"lat": 12.9698, "lng": 77.5986, "area": "Commercial Street"},
        {"lat": 12.9716, "lng": 77.7946, "area": "Electronic City"},
        {"lat": 12.9500, "lng": 77.6500, "area": "Bellandur"},
        {"lat": 13.0500, "lng": 77.6000, "area": "Yelahanka"}
    ]
    
    # Traffic incident templates
    incidents = [
        {
            "content": "Major traffic jam on {area} main road due to accident involving two cars. Traffic backed up for 2km. Avoid if possible!",
            "category": "traffic",
            "type": "incident"
        },
        {
            "content": "Road construction on {area} causing severe delays. Only one lane open. Expected completion next week.",
            "category": "infrastructure", 
            "type": "issue"
        },
        {
            "content": "Water logging near {area} metro station after heavy rains. Traffic moving very slowly, consider alternate routes.",
            "category": "infrastructure",
            "type": "incident"
        },
        {
            "content": "Traffic signal not working at {area} junction. Police directing traffic but expect 15-20 min delays.",
            "category": "infrastructure",
            "type": "issue"
        },
        {
            "content": "Bus breakdown on {area} main road blocking right lane. BMTC working to clear, traffic diverted.",
            "category": "traffic",
            "type": "incident"
        },
        {
            "content": "Festival procession on {area} road from 6-9 PM today. Roads will be closed to traffic during this time.",
            "category": "event",
            "type": "announcement"
        },
        {
            "content": "Large pothole developed on {area} flyover after yesterday's rain. Vehicles forced to slow down significantly.",
            "category": "infrastructure",
            "type": "issue"
        },
        {
            "content": "Multi-vehicle accident on {area} caused by oil spill. Emergency services on site, traffic being diverted.",
            "category": "traffic",
            "type": "incident"
        },
        {
            "content": "Metro construction work on {area} road causing major bottleneck during peak hours. Plan extra time.",
            "category": "infrastructure",
            "type": "issue"
        },
        {
            "content": "Protest march planned on {area} tomorrow from 10 AM to 2 PM. Roads will be partially blocked.",
            "category": "event",
            "type": "announcement"
        },
        {
            "content": "Tree fell across {area} main road blocking both lanes. BBMP clearing but expect delays for next 2 hours.",
            "category": "infrastructure",
            "type": "incident"
        },
        {
            "content": "VIP movement expected on {area} route today evening. Temporary road closures from 5-7 PM.",
            "category": "event",
            "type": "announcement"
        },
        {
            "content": "Heavy traffic on {area} due to weekend market. Parking spilling onto roads causing congestion.",
            "category": "traffic",
            "type": "incident"
        },
        {
            "content": "Street light not working on {area} main road creating safety issues during night travel. Please drive carefully.",
            "category": "safety",
            "type": "issue"
        },
        {
            "content": "Auto rickshaw strike in {area} area causing increased demand for buses and cabs. Expect surge pricing.",
            "category": "traffic",
            "type": "announcement"
        }
    ]
    
    # Generate geohash (simplified - real implementation would use proper geohash library)
    def simple_geohash(lat, lng):
        return f"tdr{abs(hash(f'{lat}{lng}'))%10000:04d}"
    
    # Generate posts
    for i in range(15):
        # Random time in last 7 days
        days_ago = random.randint(0, 6)
        hours_ago = random.randint(0, 23)
        minutes_ago = random.randint(0, 59)
        
        post_time = base_time - timedelta(days=days_ago, hours=hours_ago, minutes=minutes_ago)
        
        # Random location
        location = random.choice(bangalore_locations)
        incident = incidents[i]
        
        # Generate author ID (sample format)
        author_id = f"user_{random.randint(1000, 9999)}_{chr(65 + random.randint(0, 25))}"
        
        post = {
            "content": incident["content"].format(area=location["area"]),
            "type": incident["type"],
            "category": incident["category"],
            "location": {
                "latitude": location["lat"] + random.uniform(-0.01, 0.01),  # Add slight variation
                "longitude": location["lng"] + random.uniform(-0.01, 0.01)
            },
            "neighborhood": location["area"],
            "mediaUrl": None,
            "parentId": None,
            "geohash": simple_geohash(location["lat"], location["lng"]),
            "postId": str(uuid.uuid4()),
            "authorId": author_id,
            "upvotes": random.randint(0, 50),
            "downvotes": random.randint(0, 5),
            "upvotedBy": [],
            "downvotedBy": [],
            "commentCount": random.randint(0, 15),
            "createdAt": post_time.isoformat() + "Z",
            "status": "active"
        }
        
        posts.append(post)
    
    return posts

# Generate the posts
traffic_incident_posts = generate_traffic_posts()

# Display the posts in the required format
all_post = traffic_incident_posts

# Print sample output
for i, post in enumerate(all_post, 1):
    print(f"Post {i}:")
    print(f"Content: {post['content']}")
    print(f"Location: {post['neighborhood']}")
    print(f"Time: {post['createdAt']}")
    print(f"Category: {post['category']}")
    print("---")