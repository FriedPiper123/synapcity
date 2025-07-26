# Activity Details Feature

## Overview

This feature enhances the ActivityDetail page by integrating the `get_summary_links` function from the agents module to provide external references and enhanced summaries for activities. It uses the existing `/recent-activities` endpoint and enhances specific activities with external links.

## Components

### Backend Changes

1. **New API Endpoint**: `/api/v1/dashboard/activity/enhance` (POST)
   - Location: `backend/app/api/v1/dashboard.py`
   - Purpose: Enhances activity data with external links using `get_summary_links`
   - Request Body:
     ```json
     {
       "type": "issue",
       "category": "infrastructure", 
       "neighborhood": "HSR", 
       "summary": "A large pothole on 15 A main is causing traffic issues..."
     }
     ```

2. **Enhanced Data Processing**:
   - Uses `get_summary_links` from `post_feed_utils` to fetch external references
   - Takes activity data from recent activities response
   - Returns enhanced activity data with external links and improved summaries

### Frontend Changes

1. **ActivityDetail Component**: `project/src/pages/ActivityDetail.tsx`
   - Fetches activity data from existing `/recent-activities` endpoint
   - Enhances specific activity using new `/activity/enhance` endpoint
   - Added loading skeleton with detailed UI components
   - Displays external references and enhanced summaries

2. **Loading States**:
   - Comprehensive skeleton loading component
   - Shows loading state while fetching enhanced data
   - Graceful fallback to original data if enhancement fails

## API Request/Response Format

### Request to `/activity/enhance`
```json
{
  "type": "issue",
  "category": "infrastructure", 
  "neighborhood": "HSR", 
  "summary": "A large pothole on 15 A main is causing traffic issues and potential vehicle damage, requiring immediate attention."
}
```

### Response
```json
{
  "type": "issue",
  "category": "infrastructure",
  "neighborhood": "HSR",
  "summary": "Original summary...",
  "enhanced_summary": "Enhanced content with external references...",
  "external_references": [
    {
      "title": "External Reference Title",
      "link": "https://example.com",
      "thumbnail": "https://example.com/image.jpg"
    }
  ]
}
```

## Usage Flow

1. **Get Recent Activities**: Use existing `/recent-activities` endpoint
2. **Select Activity**: User clicks on specific activity from dashboard
3. **Enhance Activity**: Call `/activity/enhance` with activity data
4. **Display Enhanced Data**: Show external references and enhanced summary

## Implementation Details

### Frontend Flow
```typescript
// 1. Get activity from recent activities
const activitiesResponse = await apiFetch('/recent-activities?latitude=...&longitude=...');
const activities = activitiesResponse.activities;

// 2. Find specific activity
const targetActivity = activities.find(activity => activity.title === activityId);

// 3. Enhance with external links
const enhancePayload = {
  type: targetActivity.type,
  category: targetActivity.category,
  neighborhood: targetActivity.location,
  summary: targetActivity.content
};

const enhancedResponse = await apiFetch('/activity/enhance', {
  method: 'POST',
  body: JSON.stringify(enhancePayload)
});
```

### Backend Processing
```python
# Extract feed data from request
feed_data = {
    "type": request.get("type", ""),
    "category": request.get("category", ""),
    "neighborhood": request.get("neighborhood", ""),
    "summary": request.get("summary", "")
}

# Get external links using get_summary_links
enhanced_data = get_summary_links(
    gemini_model=GeminiAgent,
    feed_data=feed_data,
    topk_links=5,
    hours_back=24
)
```

## Error Handling

- Graceful fallback to original data if enhancement fails
- Loading skeleton during data fetching
- Error states for network issues
- Validation of required fields (summary)

## Dependencies

- `get_summary_links` from `post_feed_utils`
- `GeminiAgent` for AI-powered content enhancement
- Existing `/recent-activities` endpoint
- Skeleton component for loading states

## Testing

Use the test script: `backend/test_activity_endpoint.py`

```bash
cd backend
python test_activity_endpoint.py
```

The test script includes:
- Testing with example payload
- Testing with real activity data from recent activities

## Benefits

1. **Reuses Existing Data**: Leverages existing `/recent-activities` endpoint
2. **Focused Enhancement**: Only enhances specific activities when needed
3. **Efficient**: No need to re-fetch all activities
4. **Flexible**: Can enhance any activity data with proper payload
5. **Scalable**: Easy to add more enhancement features

## Future Enhancements

- Caching of enhanced data
- Batch enhancement for multiple activities
- User preferences for external link sources
- Analytics for external reference usage
- Real-time updates of external references 