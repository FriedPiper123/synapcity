"""
Web Search Module for Traffic Analysis
Handles all web searching, URL verification, and content scraping
"""

import aiohttp
import asyncio
from bs4 import BeautifulSoup
from urllib.parse import quote_plus, urlparse
from typing import Dict, List, Any
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class WebSearcher:
    def __init__(self, search_api_key: str = None, search_engine_id: str = None):
        """
        Initialize the web searcher
        
        Args:
            search_api_key: Google Custom Search API key
            search_engine_id: Google Custom Search Engine ID
        """
        self.search_api_key = search_api_key
        self.search_engine_id = search_engine_id
        
        # Headers for web scraping
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        }

    def generate_traffic_search_queries(self, location: str, current_time: str, departure_time: str) -> List[str]:
        """Generate comprehensive search queries for any Indian city without hardcoded limitations"""
        current_dt = datetime.fromisoformat(current_time.replace('Z', '+00:00'))
        departure_dt = datetime.fromisoformat(departure_time.replace('Z', '+00:00'))
        
        # Check if departure is within 2 hours
        time_diff = (departure_dt - current_dt).total_seconds() / 3600
        
        # Extract city and state info
        city_info = self.extract_location_info(location)
        city = city_info['city']
        state = city_info['state']
        
        if time_diff <= 2:
            # Current/immediate searches - optimized for best results
            search_queries = [
                # High-impact current searches
                f"{location} traffic accident today live",
                f"{location} road closure emergency today",
                f"{city} traffic police alerts today",
                f"{location} traffic jam updates now",
                f"{city} road conditions news today",
                
                # Official sources
                f"traffic police {city} {state} alerts",
                f"{city} municipal corporation road closure",
                
                # Social media (most effective)
                f"twitter {city} traffic police official",
                f"reddit {city} traffic jam discussion"
            ]
        else:
            # Future/planned searches - optimized
            departure_date = departure_dt.strftime('%Y-%m-%d')
            
            search_queries = [
                # Planned events and closures
                f"{location} planned road closure {departure_date}",
                f"{city} events {departure_date} traffic impact", 
                f"{city} construction schedule {departure_date}",
                f"{city} municipal traffic advisory {departure_date}",
                
                # Major events
                f"{city} marathon festival event {departure_date}",
                f"{location} upcoming road work schedule",
                
                # Official announcements
                f"{city} police traffic plan {departure_date}",
                f"{state} transport department notifications"
            ]
        
        # Add generic high-value searches
        search_queries.extend([
            f"{location} traffic update",
            f"{city} road conditions",
            f"{location} transportation news",
            f"{city} traffic management"
        ])
        
        return search_queries

    def extract_location_info(self, address: str) -> Dict[str, str]:
        """Extract comprehensive location information from address"""
        address_lower = address.lower()
        
        # Major Indian cities with their states
        city_state_mapping = {
            'bangalore': {'city': 'Bangalore', 'state': 'Karnataka', 'alt_names': ['bengaluru']},
            'bengaluru': {'city': 'Bengaluru', 'state': 'Karnataka', 'alt_names': ['bangalore']},
            'mumbai': {'city': 'Mumbai', 'state': 'Maharashtra', 'alt_names': ['bombay']},
            'delhi': {'city': 'Delhi', 'state': 'Delhi', 'alt_names': ['new delhi']},
            'chennai': {'city': 'Chennai', 'state': 'Tamil Nadu', 'alt_names': ['madras']},
            'hyderabad': {'city': 'Hyderabad', 'state': 'Telangana', 'alt_names': []},
            'pune': {'city': 'Pune', 'state': 'Maharashtra', 'alt_names': []},
            'kolkata': {'city': 'Kolkata', 'state': 'West Bengal', 'alt_names': ['calcutta']},
            'ahmedabad': {'city': 'Ahmedabad', 'state': 'Gujarat', 'alt_names': []},
            'jaipur': {'city': 'Jaipur', 'state': 'Rajasthan', 'alt_names': []},
            'surat': {'city': 'Surat', 'state': 'Gujarat', 'alt_names': []},
            'lucknow': {'city': 'Lucknow', 'state': 'Uttar Pradesh', 'alt_names': []},
            'kanpur': {'city': 'Kanpur', 'state': 'Uttar Pradesh', 'alt_names': []},
            'nagpur': {'city': 'Nagpur', 'state': 'Maharashtra', 'alt_names': []},
            'indore': {'city': 'Indore', 'state': 'Madhya Pradesh', 'alt_names': []},
            'bhopal': {'city': 'Bhopal', 'state': 'Madhya Pradesh', 'alt_names': []},
            'visakhapatnam': {'city': 'Visakhapatnam', 'state': 'Andhra Pradesh', 'alt_names': ['vizag']},
            'patna': {'city': 'Patna', 'state': 'Bihar', 'alt_names': []},
            'vadodara': {'city': 'Vadodara', 'state': 'Gujarat', 'alt_names': ['baroda']},
            'ghaziabad': {'city': 'Ghaziabad', 'state': 'Uttar Pradesh', 'alt_names': []},
            'ludhiana': {'city': 'Ludhiana', 'state': 'Punjab', 'alt_names': []},
            'agra': {'city': 'Agra', 'state': 'Uttar Pradesh', 'alt_names': []},
            'nashik': {'city': 'Nashik', 'state': 'Maharashtra', 'alt_names': []},
            'faridabad': {'city': 'Faridabad', 'state': 'Haryana', 'alt_names': []},
            'meerut': {'city': 'Meerut', 'state': 'Uttar Pradesh', 'alt_names': []},
            'rajkot': {'city': 'Rajkot', 'state': 'Gujarat', 'alt_names': []},
            'kalyan': {'city': 'Kalyan', 'state': 'Maharashtra', 'alt_names': []},
            'vasai': {'city': 'Vasai', 'state': 'Maharashtra', 'alt_names': []},
            'varanasi': {'city': 'Varanasi', 'state': 'Uttar Pradesh', 'alt_names': ['benares']},
            'srinagar': {'city': 'Srinagar', 'state': 'Jammu and Kashmir', 'alt_names': []},
            'aurangabad': {'city': 'Aurangabad', 'state': 'Maharashtra', 'alt_names': []},
            'dhanbad': {'city': 'Dhanbad', 'state': 'Jharkhand', 'alt_names': []},
            'amritsar': {'city': 'Amritsar', 'state': 'Punjab', 'alt_names': []},
            'navi mumbai': {'city': 'Navi Mumbai', 'state': 'Maharashtra', 'alt_names': []},
            'allahabad': {'city': 'Allahabad', 'state': 'Uttar Pradesh', 'alt_names': ['prayagraj']},
            'ranchi': {'city': 'Ranchi', 'state': 'Jharkhand', 'alt_names': []},
            'howrah': {'city': 'Howrah', 'state': 'West Bengal', 'alt_names': []},
            'coimbatore': {'city': 'Coimbatore', 'state': 'Tamil Nadu', 'alt_names': []},
            'jabalpur': {'city': 'Jabalpur', 'state': 'Madhya Pradesh', 'alt_names': []},
            'gwalior': {'city': 'Gwalior', 'state': 'Madhya Pradesh', 'alt_names': []},
            'vijayawada': {'city': 'Vijayawada', 'state': 'Andhra Pradesh', 'alt_names': []},
            'jodhpur': {'city': 'Jodhpur', 'state': 'Rajasthan', 'alt_names': []},
            'madurai': {'city': 'Madurai', 'state': 'Tamil Nadu', 'alt_names': []},
            'raipur': {'city': 'Raipur', 'state': 'Chhattisgarh', 'alt_names': []},
            'kota': {'city': 'Kota', 'state': 'Rajasthan', 'alt_names': []},
            'chandigarh': {'city': 'Chandigarh', 'state': 'Chandigarh', 'alt_names': []},
            'gurgaon': {'city': 'Gurgaon', 'state': 'Haryana', 'alt_names': ['gurugram']},
            'gurugram': {'city': 'Gurugram', 'state': 'Haryana', 'alt_names': ['gurgaon']},
            'noida': {'city': 'Noida', 'state': 'Uttar Pradesh', 'alt_names': []},
            'thiruvananthapuram': {'city': 'Thiruvananthapuram', 'state': 'Kerala', 'alt_names': ['trivandrum']},
            'kochi': {'city': 'Kochi', 'state': 'Kerala', 'alt_names': ['cochin']},
            'mysore': {'city': 'Mysore', 'state': 'Karnataka', 'alt_names': ['mysuru']},
            'mysuru': {'city': 'Mysuru', 'state': 'Karnataka', 'alt_names': ['mysore']},
        }
        
        # Find matching city
        for city_key, city_data in city_state_mapping.items():
            if city_key in address_lower:
                return city_data
            # Check alternative names
            for alt_name in city_data['alt_names']:
                if alt_name in address_lower:
                    return city_data
        
        # Fallback: extract from address parts
        parts = [part.strip() for part in address.split(',')]
        if len(parts) >= 2:
            return {
                'city': parts[-2].strip(),
                'state': parts[-1].strip(),
                'alt_names': []
            }
        else:
            return {
                'city': parts[0] if parts else address,
                'state': 'India',
                'alt_names': []
            }

    def extract_city_name(self, address: str) -> str:
        """Extract city name from address for backward compatibility"""
        location_info = self.extract_location_info(address)
        return location_info['city']

    async def search_web_async(self, query: str, max_results: int = 5) -> List[Dict]:
        """Perform async web search using Google Custom Search API"""
        results = []
        
        # Use Google Custom Search API only
        if self.search_api_key and self.search_engine_id:
            try:
                google_results = await self._google_custom_search(query, max_results)
                results.extend(google_results)
                logger.info(f"Google Search returned {len(google_results)} results for: {query}")
            except Exception as e:
                logger.error(f"Google Custom Search failed for query '{query}': {e}")
                # Return empty results if Google Search fails
                return []
        else:
            logger.error("Google Search API credentials not provided. Cannot perform search.")
            return []
        
        return results[:max_results]

    async def _google_custom_search(self, query: str, max_results: int) -> List[Dict]:
        """Use Google Custom Search API"""
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            'key': self.search_api_key,
            'cx': self.search_engine_id,
            'q': query,
            'num': min(max_results, 5),  # Google API max is 10
            'dateRestrict': 'd7',  # Results from last 7 days for traffic relevancy
            'sort': 'date'  # Sort by most recent first
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status != 200:
                    logger.error(f"Google Search API error: {response.status}")
                    return []
                
                data = await response.json()
                
                if 'error' in data:
                    logger.error(f"Google Search API error: {data['error']}")
                    return []
        
        results = []
        for item in data.get('items', []):
            results.append({
                'title': item.get('title', ''),
                'url': item.get('link', ''),
                'snippet': item.get('snippet', ''),
                'source': 'google',
                'published_date': item.get('pagemap', {}).get('metatags', [{}])[0].get('article:published_time', ''),
                'domain': self.extract_domain(item.get('link', ''))
            })
        
        return results

    async def verify_url(self, url: str) -> bool:
        """Verify that a URL is accessible with faster timeout"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.head(url, headers=self.headers, timeout=3) as response:  # Reduced timeout
                    return 200 <= response.status < 400  # Accept redirects too
        except:
            return False

    async def scrape_content(self, url: str) -> str:
        """Scrape content from a URL with proper encoding handling"""
        try:
            # Skip problematic domains that are known to cause issues
            problematic_domains = [
                'x.com', 'twitter.com', 'facebook.com', 'instagram.com',
                'youtube.com', 'linkedin.com'
            ]
            
            domain = self.extract_domain(url)
            if any(prob_domain in domain for prob_domain in problematic_domains):
                logger.info(f"Skipping problematic domain: {domain}")
                return ""
            
            # Set up session with proper headers and encoding
            timeout = aiohttp.ClientTimeout(total=10)
            connector = aiohttp.TCPConnector(limit=10)
            
            async with aiohttp.ClientSession(
                timeout=timeout, 
                connector=connector,
                headers=self.headers
            ) as session:
                async with session.get(url) as response:
                    if response.status != 200:
                        logger.warning(f"HTTP {response.status} for {url}")
                        return ""
                    
                    # Get content with proper encoding handling
                    try:
                        # Try to get encoding from response headers
                        content_type = response.headers.get('content-type', '')
                        if 'charset=' in content_type:
                            encoding = content_type.split('charset=')[1].split(';')[0].strip()
                        else:
                            encoding = 'utf-8'  # Default to UTF-8
                        
                        # Read content as bytes first
                        content_bytes = await response.read()
                        
                        # Try multiple encoding strategies
                        html = None
                        encodings_to_try = [encoding, 'utf-8', 'latin1', 'iso-8859-1', 'cp1252']
                        
                        for enc in encodings_to_try:
                            try:
                                html = content_bytes.decode(enc, errors='ignore')
                                break
                            except (UnicodeDecodeError, LookupError):
                                continue
                        
                        if not html:
                            logger.warning(f"Could not decode content from {url}")
                            return ""
                        
                    except Exception as e:
                        logger.warning(f"Encoding error for {url}: {e}")
                        # Fallback: read as text with error handling
                        html = await response.text(errors='ignore')
                    
                    # Parse with BeautifulSoup
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Remove unwanted elements
                    for element in soup(["script", "style", "nav", "header", "footer", "aside", "form"]):
                        element.decompose()
                    
                    # Extract main content areas first
                    main_content = ""
                    content_selectors = [
                        'main', 'article', '.content', '.post', '.news', 
                        '.article-content', '.story-content', '#content'
                    ]
                    
                    for selector in content_selectors:
                        elements = soup.select(selector)
                        if elements:
                            main_content = ' '.join([elem.get_text() for elem in elements])
                            break
                    
                    # If no main content found, get all text
                    if not main_content:
                        main_content = soup.get_text()
                    
                    # Clean up the text
                    lines = (line.strip() for line in main_content.splitlines())
                    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                    text = ' '.join(chunk for chunk in chunks if chunk and len(chunk) > 3)
                    
                    # Handle Unicode characters properly
                    try:
                        # Normalize Unicode characters
                        import unicodedata
                        text = unicodedata.normalize('NFKD', text)
                        
                        # Replace common problematic characters
                        replacements = {
                            '\u20b9': 'Rs.',  # Indian Rupee symbol
                            '\u2018': "'",    # Left single quotation mark
                            '\u2019': "'",    # Right single quotation mark
                            '\u201c': '"',    # Left double quotation mark
                            '\u201d': '"',    # Right double quotation mark
                            '\u2013': '-',    # En dash
                            '\u2014': '-',    # Em dash
                            '\u2026': '...',  # Horizontal ellipsis
                        }
                        
                        for old_char, new_char in replacements.items():
                            text = text.replace(old_char, new_char)
                        
                        # Remove or replace remaining non-ASCII characters
                        text = text.encode('ascii', errors='ignore').decode('ascii')
                        
                    except Exception as e:
                        logger.warning(f"Unicode normalization failed for {url}: {e}")
                        # Fallback: remove all non-ASCII characters
                        text = ''.join(char for char in text if ord(char) < 128)
                    
                    # Limit content length and return
                    return text[:3000] if text else ""
                    
        except asyncio.TimeoutError:
            logger.warning(f"Timeout scraping {url}")
            return ""
        except aiohttp.ClientError as e:
            logger.warning(f"Client error scraping {url}: {e}")
            return ""
        except Exception as e:
            logger.warning(f"Failed to scrape {url}: {e}")
            return ""

    def extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        try:
            return urlparse(url).netloc.lower()
        except:
            return ""

    async def search_and_verify_sources(self, search_queries: List[str]) -> List[Dict]:
        """Perform searches and verify sources (snippets only - no scraping)"""
        logger.info(f"Starting search with {len(search_queries)} queries")
        
        # Perform searches
        all_results = []
        verified_results = []
        
        for search_query in search_queries[:15]:  # Process 15 queries
            logger.info(f"Searching: {search_query}")
            results = await self.search_web_async(search_query, max_results=8)
            all_results.extend(results)
            await asyncio.sleep(0.3)  # Rate limiting
        
        logger.info(f"Found {len(all_results)} total search results")
        
        # Process results - verify URLs but use snippets instead of scraping
        for result in all_results[:25]:  # Process top 25 results
            # Verify URL is accessible (quick HEAD request)
            if await self.verify_url(result['url']):
                # Use snippet as content instead of scraping
                result['content'] = result['snippet']  # Use snippet as main content
                result['verified'] = True
                result['content_source'] = 'snippet'  # Mark as snippet-based
                verified_results.append(result)
                logger.debug(f"Verified URL: {result['url']}")
            else:
                result['verified'] = False
                logger.debug(f"Failed to verify URL: {result['url']}")
        
        logger.info(f"Verified {len(verified_results)} sources using snippets")
        return verified_results

    def find_closest_verified_url(self, target_url: str, verified_results: List[Dict]) -> str:
        """Find the closest matching verified URL"""
        target_domain = self.extract_domain(target_url)
        
        for result in verified_results:
            if result.get('verified') and self.extract_domain(result['url']) == target_domain:
                return result['url']
        
        return ""