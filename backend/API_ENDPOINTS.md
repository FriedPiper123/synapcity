# SynapCity API Endpoints

## Area Insights API

### Get Area Insights
**Endpoint:** `GET /api/v1/insights/area-insights`

**Description:** Fetch area insights based on location coordinates. No authentication required.

**Query Parameters:**
- `latitude` (float, required): Latitude of the area (-90 to 90)
- `longitude` (float, required): Longitude of the area (-180 to 180)

**Response:**
```json
{
  "name": "Downtown District",
  "crimeTrend": {
    "daily": [0.2, 0.3, 0.1, 0.4, 0.2, 0.3, 0.1],
    "weekly": [0.25, 0.3, 0.2, 0.35],
    "monthly": [0.2, 0.25, 0.3, 0.2, 0.25, 0.3, 0.2, 0.25, 0.3, 0.2, 0.25, 0.3]
  },
  "powerOutageFrequency": 0.45,
  "waterShortageTrend": {
    "daily": [0.1, 0.2, 0.1, 0.3, 0.2, 0.1, 0.2],
    "weekly": [0.15, 0.2, 0.15, 0.25],
    "monthly": [0.1, 0.15, 0.2, 0.15, 0.2, 0.15, 0.1, 0.15, 0.2, 0.15, 0.2, 0.15]
  },
  "overallSentiment": 0.65,
  "lastUpdatedAt": "2024-01-15T10:30:00Z"
}
```

**Example Request:**
```
GET /api/v1/insights/area-insights?latitude=12.9716&longitude=77.5946
```

## Location-Based Posts API

### Get Posts by Location
**Endpoint:** `GET /api/v1/location/location-posts`

**Description:** Fetch posts within a specified radius of the given location. No authentication required.

**Query Parameters:**
- `latitude` (float, required): Latitude of the user's location (-90 to 90)
- `longitude` (float, required): Longitude of the user's location (-180 to 180)
- `radius_km` (float, optional): Radius in kilometers to search for posts (0.1 to 50.0, default: 5.0)

**Response:**
```json
[
  {
    "postId": "dummy_post_0_12971_77594",
    "title": "Pothole on Main Street",
    "content": "There's a large pothole on Main Street that needs immediate attention.",
    "type": "issue",
    "category": "infrastructure",
    "severity": "high",
    "authorId": "user_42",
    "authorName": "User 42",
    "upvotes": 15,
    "downvotes": 2,
    "commentCount": 8,
    "createdAt": "2024-01-15T10:30:00Z",
    "status": "active",
    "location": {
      "latitude": 12.9716,
      "longitude": 77.5946
    },
    "location_name": "Area 3",
    "neighborhood": "Neighborhood 2"
  }
]
```

**Example Request:**
```
GET /api/v1/location/location-posts?latitude=12.9716&longitude=77.5946&radius_km=5.0
```

## Features

### Area Insights
- **Crime Trends**: Daily, weekly, and monthly crime trend data
- **Power Outage Frequency**: Percentage of power outages in the area
- **Water Shortage Trends**: Daily, weekly, and monthly water shortage data
- **Overall Sentiment**: Community sentiment score (-1.0 to 1.0)
- **Area Name**: Generated based on coordinates for consistency

### Location-Based Posts
- **Radius Search**: Find posts within specified radius (default 5km)
- **Distance Calculation**: Uses Haversine formula for accurate distance calculation
- **Post Types**: Support for issues, events, resolved items, and suggestions
- **Severity Levels**: High, medium, low priority for issues
- **Author Information**: Dummy user data for demonstration
- **Voting System**: Upvotes and downvotes tracking
- **Comments**: Comment count for each post

## Implementation Notes

### Backend
- Uses dummy data generation based on coordinates for consistent results
- No authentication required for these endpoints
- Input validation for coordinate ranges
- Error handling for invalid requests

### Frontend
- Location permission handling
- Real-time location fetching
- Modal display for area insights
- Pull-to-refresh for location posts
- Distance calculation and display
- Error handling and loading states

### Data Consistency
- Same coordinates will always return the same dummy data
- Area names are generated based on coordinate hashing
- Post generation uses seeded random for consistency

## Usage Examples

### Frontend Integration

```typescript
// Fetch area insights
const response = await apiFetch(
  `http://192.168.1.5:8000/api/v1/insights/area-insights?latitude=${latitude}&longitude=${longitude}`
);

// Fetch location-based posts
const response = await apiFetch(
  `http://192.168.1.5:8000/api/v1/location/location-posts?latitude=${latitude}&longitude=${longitude}&radius_km=5.0`
);
```

### React Native Components

```typescript
// Area Insights Component
<AreaInsights latitude={latitude} longitude={longitude} />

// Location Posts Component
<LocationPosts latitude={latitude} longitude={longitude} radiusKm={5.0} />
``` 