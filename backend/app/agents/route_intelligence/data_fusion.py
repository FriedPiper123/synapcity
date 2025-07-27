
import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

from google import genai

class DataFusion:
    def __init__(self, gemini_api_key: str):
        """
        Initialize the data fusion engine
        """
        self.gemini_api_key = gemini_api_key
        self.client = genai.Client(api_key=self.gemini_api_key)

    def create_user_prompt(self, combined_insights: Dict) -> str:
        """
        Create the user prompt for data fusion
        """
        # Placeholder: Format the data for user prompt
        return f"""Analyze the following multi-source traffic data and generate traffic insights for route planning:

## INPUT DATA
```json
{combined_insights}
```

## ANALYSIS INSTRUCTIONS

For each segment group in the data:

1. **Traffic Flow Analysis:**
   - Calculate speed reduction percentage from TomTom flow data
   - Determine congestion level based on current vs free flow speeds
   - Assess travel time delays

2. **Incident Assessment:**
   - Prioritize TomTom incidents by iconCategory and magnitude
   - Evaluate web search incidents by severity and reliability
   - Include verified user reports with high upvote ratios

3. **Weather Impact:**
   - Check if weather conditions affect traffic (rain, low visibility, strong winds)
   - Correlate weather with current traffic conditions

4. **Data Fusion:**
   - Combine all sources with appropriate reliability weighting
   - Resolve conflicts between different data sources
   - Generate overall status and recommendation

## VALIDATION CHECKLIST

Before providing your response, ensure:
- ✓ All numerical calculations are accurate
- ✓ Status and recommendations follow the defined logic rules
- ✓ Key factors are concise and actionable (max 60 chars each)
- ✓ Confidence scores reflect data quality and consistency
- ✓ JSON structure matches the required format exactly
- ✓ All timestamps are in ISO format
- ✓ Only include incidents within 6 hours (unless ongoing)

Provide only the JSON response without additional explanation."""

    def create_system_prompt(self) -> str:
        """
        Create the system prompt for data fusion
        """
        # Placeholder: System instructions for fusion
        return """You are a Data Fusion Agent specialized in analyzing multi-source traffic data to generate actionable insights for navigation. You process weather data, TomTom traffic flow, TomTom incidents, web search intelligence, and user reports to provide comprehensive traffic insights for route segment groups.

## CORE CAPABILITIES

### Traffic Flow Assessment
- Analyze currentSpeed vs freeFlowSpeed to determine congestion level
- Calculate delay percentage: ((currentTravelTime - freeFlowTravelTime) / freeFlowTravelTime * 100)
- Use TomTom confidence score to weight reliability

### Incident Impact Evaluation
- TomTom Incidents: Priority by iconCategory (8=road closure, 6=traffic jam) and magnitudeOfDelay
- Web Search: Cross-reference severity levels and traffic_status  
- User Reports: Weight by verification status, upvotes, and recency

### Weather Impact Correlation
- Visibility <5000m = poor visibility impact
- Wind >10 m/s = strong wind impact
- Weather conditions: Rain/storm = high impact, clouds = low impact

### Data Reliability Scoring
- TomTom Flow: Use confidence score directly
- TomTom Incidents: High reliability (0.9+)
- Web Search: Use source reliability from web agent
- User Reports: Based on verification + upvote ratio

## FUSION LOGIC RULES

### Status Determination Priority:
1. BLOCKED: Road closure (TomTom iconCategory 8) OR critical user reports
2. HEAVY: Speed reduction >50% OR high severity incidents OR major construction
3. MODERATE: Speed reduction 20-50% OR medium severity incidents
4. LIGHT: Speed reduction <20% AND no significant incidents

### Recommendation Logic:
- AVOID: Blocked status OR delay >60 minutes OR critical incidents
- CAUTION: Heavy status OR delay 30-60 minutes OR multiple incidents  
- PROCEED: Moderate status OR delay 10-30 minutes
- OPTIMAL: Light status OR delay <10 minutes

### Key Factors Selection:
- Include top 3 most impactful factors
- Prioritize verified user reports and official incidents
- Include weather if significant impact
- Mention construction if ongoing
- Keep each factor under 60 characters

## DATA VALIDATION RULES

1. Timestamp Relevance: Ignore incidents older than 6 hours unless ongoing
2. Geographic Relevance: Only include incidents within 2km of segment group center  
3. Source Consistency: Flag conflicting reports between sources
4. Reliability Weighting: Weight final scores by source reliability

## OUTPUT REQUIREMENTS

Generate a JSON response with insights for each segment group. Include:
- Overall status (heavy/moderate/light/blocked)
- Clear recommendation (avoid/caution/proceed/optimal)
- Confidence score (0-1)
- One-sentence summary (max 100 chars)
- Traffic analysis with speed reduction and delays
- Active incidents with type, severity, description
- Weather impact assessment
- Top 3 key factors affecting traffic
- Alternative suggestions when applicable
- Estimated total delay in minutes

## REQUIRED OUTPUT FORMAT

Generate a JSON response following this exact structure:

{
  "insights": [
    {
      "group_id": "group_0",
      "overall_status": "heavy",
      "recommendation": "caution", 
      "confidence_score": 0.85,
      "summary": "Heavy traffic due to metro construction and morning peak hour",
      "traffic_analysis": {
        "speed_reduction_percent": 43,
        "delay_minutes": 12,
        "congestion_level": "heavy",
        "flow_confidence": 0.84
      },
      "active_incidents": [
        {
          "type": "construction",
          "severity": "high", 
          "description": "Metro construction on Outer Ring Road causing lane closures",
          "estimated_delay": 25,
          "source": "web",
          "reliability": 0.92
        }
      ],
      "weather_impact": {
        "impact_level": "low",
        "conditions": "scattered clouds",
        "visibility_km": 8,
        "affecting_traffic": false
      },
      "key_factors": [
        "Metro construction causing major delays",
        "Morning peak hour congestion", 
        "Verified accident report nearby"
      ],
      "alternative_suggestion": "Consider Sarjapur Road as alternative route",
      "estimated_total_delay": 37,
      "last_updated": "2025-07-22T12:00:00Z"
    }
  ],
  "analysis_metadata": {
    "fusion_timestamp": "2025-07-22T12:05:00Z",
    "data_sources_used": ["tomtom_flow", "tomtom_incidents", "web_search", "user_reports", "weather"],
    "overall_reliability": 0.87,
    "total_groups_analyzed": 1
  }
}


## GEMINI PRO OPTIMIZATION

Focus on:
- Precise numerical analysis for speed and delay calculations
- Clear categorical decisions for status and recommendations
- Structured reasoning for incident prioritization
- Confidence scoring based on data quality
- Concise, mobile-friendly summaries

Prioritize real-time data (TomTom flow, recent user reports) over historical patterns. Ensure all outputs are actionable for immediate navigation decisions."""

    def fuse_data(self, sources: List[Dict]) -> Dict[str, Any]:
        """
        Fuse multiple data sources into a unified output using Gemini model
        """
        logger.info("Fusing data from multiple sources using Gemini model.")
        user_prompt = self.create_user_prompt(sources)
        system_prompt = self.create_system_prompt()
        full_prompt = f"{system_prompt}\n\n{user_prompt}"
        try:
            response = self.client.models.generate_content(
                model='gemini-2.5-flash-lite',
                contents=full_prompt
            )
            return {"fused_result": response.text}
        except Exception as e:
            logger.error(f"Gemini fusion failed: {e}")
            return {"error": f"Fusion failed: {str(e)}"}