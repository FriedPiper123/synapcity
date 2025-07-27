"""
Traffic Analyzer Module
Handles Gemini AI analysis and traffic data processing
"""

from google import genai
import json
import re
from datetime import datetime
from typing import Dict, List, Any
from dataclasses import dataclass
import logging

from .web_search import WebSearcher

logger = logging.getLogger(__name__)
file_handler = logging.FileHandler("traffic_analyzer.log")
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger.addHandler(file_handler)
logger.setLevel(logging.INFO)  # Or DEBUG for more details
@dataclass
class SearchQuery:
    address: str
    current_time: str
    departure_time: str

class TrafficAnalyzer:
    def __init__(self, gemini_api_key: str, search_api_key: str = None, search_engine_id: str = None):
        """
        Initialize the traffic analyzer
        
        Args:
            gemini_api_key: Google Gemini API key
            search_api_key: Google Custom Search API key (optional)
            search_engine_id: Google Custom Search Engine ID (optional)
        """
        self.gemini_api_key = gemini_api_key
        self.client = genai.Client(api_key=self.gemini_api_key)


        # Initialize web searcher
        self.web_searcher = WebSearcher(search_api_key, search_engine_id)

    def create_user_prompt(self, query: SearchQuery) -> str:
        """Create the user prompt for Gemini"""
        return f"""LOCATION: {query.address}
CURRENT TIME: {query.current_time}
DEPARTURE TIME: {query.departure_time}
Analyze current or future traffic congestion causes for the specified location depending on the departure time. If departure time is within 2 hours of current time then search for current causes otherwise future potential causes. Search for and identify:
IMMEDIATE VERIFIED INCIDENTS (Last 6 hours):
- Traffic accidents with or without police reports
- Emergency road closures 
- Vehicle breakdowns causing delays
- Weather-related road conditions
ACTIVE SCHEDULED DISRUPTIONS:
- Ongoing construction/road work with official notifications
- Planned road closures for maintenance
CURRENT EVENTS & ACTIVITIES:
- Live events at venues causing increased traffic
- Sports matches/concerts ending around this time
- Business conferences or major meetings
- Shopping center promotions or sales events
For each identified cause, provide:
- Incident Type: [ACCIDENT/CONSTRUCTION/TRAFFIC_JAM/EVENT/PATTERN]
- Verification Status: [CONFIRMED/REPORTED/ESTIMATED]
- Timestamp: [Exact time of incident/start]
- Source URL: [Direct link to verification]
- Impact Level: [HIGH/MODERATE/LOW]
- Expected Duration: [Estimated clearance time]
- Alternative Routes: [Specific detour suggestions if available]
If no current verified incidents are found, respond with: "No current verified incidents found for {query.address} at {query.current_time}. Please check local traffic apps or official traffic authority websites for real-time updates." """

    def create_system_prompt(self) -> str:
        """Create the system prompt for Gemini"""
        return """You are a real-time city information gatherer and traffic analysis assistant. Your task is to identify any reported social media posts, news articles, government press releases, government reports, local events or any other causes of traffic congestion for a **specific location** at a **given time** by searching for verified, recent and relevant information. Follow these critical guidelines:
ACCURACY REQUIREMENTS:
- For traffic accidents, road congestions, water logging, etc. (events that have occurred in the last 24 hours and might have impact on the traffic at the specified location during the specified time. 
- For departure time that is at least 2 hours ahead of the current time, find information related to upcoming events, preplanned traffic deviations, road closures, etc. from news articles, city blogs, social media posts from instagram, X, reddit (subreddit of the particular city), facebook), city or state government websites, press releases, etc.
- NEVER fabricate or assume information that you cannot verify. 
- **Always provide actual, working source URLs for verification**
- If you cannot find current, relevant information, explicitly state this limitation. It is okay if you don't find any relevant information, you can explicitly state that.
- Mark any speculative information as "ESTIMATED" or "TYPICAL PATTERN"
SEARCH METHODOLOGY:
- Search for real-time traffic updates first
- Look for official sources: traffic police, municipal websites, news outlets
- Cross-reference multiple sources when possible
- Prioritize primary sources over aggregators
RESPONSE FORMAT: You must respond with valid JSON in the following format:
{
  "address": "the actual search query",
  "timestamp": "2025-01-18T10:35:22Z",
  "incidents": [
    {
      "id": "web_inc_001",
      "type": "accident|construction|event|weather|transport|emergency",
      "title": "Brief incident title",
      "description": "Key details about the incident",
      "severity": "low|medium|high|critical",
      "location": {
        "address": "Primary location",
        "lat": 12.9172183,
        "lng": 77.640892,
        "roads": ["Road 1", "Road 2"]
      },
      "timing": {
        "start": "2025-01-18T09:15:00Z",
        "ongoing": true,
        "duration_hours": 2
      },
      "impact": {
        "traffic_status": "normal|disrupted|blocked",
        "delay_minutes": 30,
        "alternatives": ["Route A", "Route B"]
      },
      "source": {
        "url": "https://source.com",
        "type": "official|news|social",
        "reliability": 0.85
      }
    }
  ]
}
- Include exact timestamps for all incidents
- Provide direct links to source material
- Clearly distinguish between confirmed incidents and general patterns
- If no current incidents found, state this explicitly rather than providing outdated information"""

    async def analyze_with_verified_sources(self, query: SearchQuery, verified_results: List[Dict]) -> Dict[str, Any]:
        """Analyze using only verified sources with strict URL requirements"""
        
        # Prepare context with verified sources only
        context = "VERIFIED SEARCH RESULTS (URLs confirmed accessible):\n\n"
        url_mapping = {}  # Map content to actual URLs
        
        for i, result in enumerate(verified_results[:10], 1):
            context += f"Result {i}:\n"
            context += f"Title: {result['title']}\n"
            context += f"VERIFIED_URL: {result['url']}\n"
            context += f"Source: {result.get('source', 'web')}\n"
            context += f"Domain: {result.get('domain', '')}\n"
            context += f"Content: {result.get('full_content', result['snippet'])[:500]}...\n\n"
            url_mapping[f"VERIFIED_URL_{i}"] = result['url']
        
        # Enhanced system prompt for source accuracy
        system_prompt = f"""{self.create_system_prompt()}

CRITICAL SOURCE REQUIREMENTS:
- ONLY use URLs that appear in the VERIFIED SEARCH RESULTS above with "VERIFIED_URL:" prefix
- NEVER generate, assume, or modify URLs
- If you reference information from Result X, use the exact VERIFIED_URL from that result
- If you cannot find verified sources for an incident, mark source.url as "NO_VERIFIED_SOURCE"
- All incidents MUST have traceable sources from the verified results provided
- Set source.reliability based on source type: official=0.9, news=0.8, social=0.6

AVAILABLE VERIFIED URLS:
{chr(10).join([f"- {url}" for url in url_mapping.values()])}
"""
        
        user_prompt = self.create_user_prompt(query)
        full_prompt = f"{system_prompt}\n\n{context}\n\n{user_prompt}"
        
        try:
            logger.info("Sending prompt to Gemini...")
            response = self.client.models.generate_content(
                        model='gemini-2.5-flash-lite',
                        contents=full_prompt)
            
            # Check if response exists and has text
            if not response or not hasattr(response, 'text') or not response.text:
                logger.error("Gemini returned empty response")
                return {
                    "address": query.address,
                    "timestamp": datetime.now().isoformat() + "Z",
                    "incidents": [],
                    "error": "Gemini returned empty response"
                }
            
            response_text = response.text.strip()
            logger.info(f"Gemini response length: {len(response_text)}")
            logger.debug(f"Gemini response preview: {response_text[:200]}...")
            
            # Try to extract JSON from response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                logger.info("Found JSON in Gemini response")
                try:
                    result = json.loads(json_str)
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse extracted JSON: {e}")
                    logger.error(f"JSON string: {json_str[:500]}...")
                    # Return fallback response
                    return {
                        "address": query.address,
                        "timestamp": datetime.now().isoformat() + "Z",
                        "incidents": [],
                        "error": f"JSON parsing failed: {e}",
                        "raw_response": response_text[:1000]
                    }
            else:
                logger.warning("No JSON found in Gemini response, trying to parse entire response")
                try:
                    result = json.loads(response_text)
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse entire response as JSON: {e}")
                    logger.error(f"Response text: {response_text[:500]}...")
                    
                    # Create a structured response from unstructured text
                    return {
                        "address": query.address,
                        "timestamp": datetime.now().isoformat() + "Z",
                        "incidents": [],
                        "message": response_text if len(response_text) < 500 else response_text[:500] + "...",
                        "error": "Gemini did not return valid JSON",
                        "raw_response": response_text[:1000]
                    }
            
            # Double-check all URLs in the response
            for incident in result.get('incidents', []):
                source_url = incident.get('source', {}).get('url', '')
                if source_url and source_url not in url_mapping.values() and source_url != "NO_VERIFIED_SOURCE":
                    logger.warning(f"Gemini used unverified URL: {source_url}")
                    incident['source']['url'] = "GEMINI_HALLUCINATED_URL"
                    incident['source']['reliability'] = 0.1
            
            logger.info(f"Successfully parsed Gemini response with {len(result.get('incidents', []))} incidents")
            return result
                
        except Exception as e:
            logger.error(f"Gemini analysis failed: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return {
                "address": query.address,
                "timestamp": datetime.now().isoformat() + "Z",
                "incidents": [],
                "error": f"Analysis failed: {str(e)}"
            }

    async def validate_response_urls(self, analysis: Dict[str, Any], verified_results: List[Dict]) -> Dict[str, Any]:
        """Ensure all URLs in the response are from verified sources"""
        verified_urls = {result['url'] for result in verified_results if result.get('verified')}
        
        # Check each incident's source URL
        for incident in analysis.get('incidents', []):
            source_url = incident.get('source', {}).get('url', '')
            if source_url and source_url not in verified_urls:
                # Find the closest matching verified URL or mark as unverified
                closest_match = self.web_searcher.find_closest_verified_url(source_url, verified_results)
                if closest_match:
                    incident['source']['url'] = closest_match
                    incident['source']['reliability'] = max(0.7, incident['source'].get('reliability', 0.8))
                else:
                    # Remove incidents with unverifiable sources
                    incident['source']['url'] = "URL_NOT_VERIFIED"
                    incident['source']['reliability'] = 0.3
                    logger.warning(f"Could not verify source URL: {source_url}")
        
        return analysis

    async def search_and_analyze(self, query: SearchQuery) -> Dict[str, Any]:
        """Main method to search web and analyze traffic information with verified sources"""
        logger.info(f"Starting traffic analysis for {query.address}")
        
        # Generate targeted search queries
        search_queries = self.web_searcher.generate_traffic_search_queries(
            query.address, query.current_time, query.departure_time
        )
        
        # Perform searches and verify sources
        verified_results = await self.web_searcher.search_and_verify_sources(search_queries)
        
        if not verified_results:
            return {
                "address": query.address,
                "timestamp": datetime.now().isoformat() + "Z",
                "incidents": [],
                "error": "No verified sources found for traffic analysis"
            }


        # Analyze with Gemini using only verified sources
        analysis = await self.analyze_with_verified_sources(query, verified_results)
        
        # Post-process to ensure all URLs in response are verified
        analysis = await self.validate_response_urls(analysis, verified_results)
        
        logger.info("Analysis completed with verified sources")
        return analysis