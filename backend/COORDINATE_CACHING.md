# Coordinate-Based Caching System

## Overview

The SynapCityApp backend now includes a coordinate-based caching system for the area analysis webhook API. This system prevents redundant webhook calls by caching responses based on geographical coordinates and analysis parameters.

## How It Works

### 1. Cache Key Generation
- Coordinates are rounded to 4 decimal places (~11m precision)
- A unique cache key is generated using: `lat_lng_analysisType_timeRange`
- MD5 hash is appended for uniqueness: `37.7749_-122.4194_md5hash`

### 2. Cache Storage
- Cached responses are stored as JSON files in `backend/cache/area_analysis/`
- Each cache file contains:
  - `cached_at`: Timestamp when cached
  - `cache_key`: Unique identifier
  - `response`: The actual API response data

### 3. Cache Validation
- Cache entries are valid for 24 hours
- Expired cache files are automatically removed when accessed

## API Endpoints

### POST `/api/v1/insights/analyze-area`
Enhanced with caching functionality:
1. Generates cache key from request parameters
2. Checks for existing valid cache
3. Returns cached response if available
4. Otherwise calls webhook API and saves response to cache

**Request Body:**
```json
{
  "coordinates": {
    "lat": 37.7749,
    "lng": -122.4194
  },
  "analysisType": "comprehensive",
  "timeRange": "week"
}
```

### GET `/api/v1/insights/cache-status`
Returns information about the current cache:
```json
{
  "cache_enabled": true,
  "cache_directory": "/path/to/cache",
  "total_cached_responses": 5,
  "total_cache_size_bytes": 1024,
  "cache_files": [
    {
      "filename": "37.7749_-122.4194_hash.json",
      "cache_key": "37.7749_-122.4194_comprehensive_week",
      "cached_at": "2024-01-15T10:30:00Z",
      "file_size_bytes": 512,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### DELETE `/api/v1/insights/clear-cache`
Clears cache files:

**Clear all cache:**
```bash
DELETE /api/v1/insights/clear-cache
```

**Clear specific coordinates:**
```bash
DELETE /api/v1/insights/clear-cache?coordinates=37.7749,-122.4194
```

## Benefits

### 1. Performance
- Cached responses return in milliseconds vs. seconds for webhook calls
- Reduces load on external webhook API
- Improves user experience with faster response times

### 2. Reliability
- Continues to work even if webhook API is temporarily unavailable
- Prevents duplicate requests for the same area
- Reduces API rate limiting issues

### 3. Cost Efficiency
- Reduces number of external API calls
- Saves bandwidth and processing resources
- Minimizes webhook service costs

## Cache Management

### Automatic Cleanup
- Expired cache files (>24 hours) are automatically removed
- Invalid or corrupted cache files are ignored

### Manual Management
- Use cache status endpoint to monitor cache usage
- Clear specific coordinate caches when data needs refreshing
- Clear all cache during maintenance or updates

## Implementation Details

### Cache Key Algorithm
```python
def generate_cache_key(coordinates, analysis_type, time_range):
    lat = round(coordinates['lat'], 4)
    lng = round(coordinates['lng'], 4)
    cache_string = f"{lat}_{lng}_{analysis_type}_{time_range}"
    cache_hash = hashlib.md5(cache_string.encode()).hexdigest()
    return f"{lat}_{lng}_{cache_hash}"
```

### File Structure
```
backend/cache/area_analysis/
├── 37.7749_-122.4194_abc123.json
├── 40.7128_-74.0060_def456.json
└── 51.5074_-0.1278_ghi789.json
```

### Cache File Format
```json
{
  "cached_at": "2024-01-15T10:30:00.000Z",
  "cache_key": "37.7749_-122.4194_comprehensive_week",
  "response": {
    // Original webhook response data
  }
}
```

## Testing

Run the test script to verify caching functionality:
```bash
cd backend
python test_area_cache.py
```

The test will:
1. Check initial cache status
2. Clear cache for clean state
3. Make first API call (calls webhook)
4. Verify cache file creation
5. Make second API call (returns cached data)
6. Test coordinate-specific cache clearing
7. Verify cache cleanup

## Configuration

### Cache TTL (Time To Live)
Currently set to 24 hours. Can be modified in the `load_cached_response` function:
```python
if datetime.now(timezone.utc) - cached_time < timedelta(hours=24):
```

### Cache Directory
Default: `backend/cache/area_analysis/`
Can be changed in the `get_cache_file_path` function.

### Coordinate Precision
Currently rounded to 4 decimal places (~11m precision).
Can be adjusted in the `generate_cache_key` function.

## Monitoring

### Logs
Cache operations are logged with relevant information:
- `"Returning cached response for coordinates: {lat}, {lng}"`
- `"Saved new response to cache for coordinates: {lat}, {lng}"`

### Metrics
Monitor through the cache status endpoint:
- Total cached responses
- Cache directory size
- Individual cache file information

## Security Considerations

### File System Access
- Cache directory is created with appropriate permissions
- File paths are validated to prevent directory traversal
- Error handling prevents sensitive information exposure

### Data Privacy
- Cache files contain the same data as webhook responses
- No additional sensitive information is stored
- Cache files are local to the server

## Troubleshooting

### Common Issues

1. **Cache directory not writable**
   - Check file system permissions
   - Ensure the backend process has write access

2. **Cache not working**
   - Verify coordinates are identical (rounded to 4 decimal places)
   - Check if cache files exist in the directory
   - Ensure cache hasn't expired (>24 hours)

3. **Large cache size**
   - Use clear-cache endpoint to remove old files
   - Consider implementing automatic cleanup based on cache size

### Debugging
1. Check cache status endpoint for current state
2. Review server logs for cache operation messages
3. Manually inspect cache files in the file system
4. Use the test script to verify functionality 