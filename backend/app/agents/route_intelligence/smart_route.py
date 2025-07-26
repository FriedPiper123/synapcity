import asyncio
import json
import logging
import math
import os
import re
import aiohttp
import time
from .config_keys import config
from typing import List, Optional, Dict
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

from .generate_posts import generate_traffic_posts
from .traffic_analyzer import TrafficAnalyzer, SearchQuery
from .route_utils import calculate_min_distance_to_route
from .data_fusion import DataFusion

# Setup logger
logger = logging.getLogger("SynapCityLogger")
logger.setLevel(logging.INFO)  # Reduced from DEBUG to INFO
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

class SynapCitySmartTrafficIntelligence:
    def __init__(self):
        self.config = config
        # Create persistent HTTP session for better performance
        self.session = None
        self.executor = ThreadPoolExecutor(max_workers=10)

    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=10),
            connector=aiohttp.TCPConnector(limit=50, limit_per_host=20)
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
        self.executor.shutdown(wait=True)

    def extract_traffic_affecting_weather(self, weather_data: Dict) -> Dict:
        """Extract essential weather information that affects traffic flow."""
        data_point = weather_data.get('data')[0]
        timestamp = data_point.get('dt')
        readable_time = datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S') if timestamp else None
        
        weather_conditions = data_point.get('weather', [])
        main_weather = weather_conditions[0].get('main', '') if weather_conditions else ''
        description = weather_conditions[0].get('description', '') if weather_conditions else ''
        weather_id = weather_conditions[0].get('id', 0) if weather_conditions else 0
        
        def assess_traffic_impact(weather_main: str, weather_id: int, wind_speed: float, visibility: int) -> str:
            if weather_id in range(200, 233):  # Thunderstorms
                return 'SEVERE'
            elif weather_id in range(600, 623):  # Snow
                return 'SEVERE' if weather_id in [611, 612, 613, 615, 616, 620, 621, 622] else 'HIGH'
            elif weather_id in range(500, 532):  # Rain
                if weather_id in [502, 503, 504, 511, 522, 531]:
                    return 'HIGH'
                elif weather_id in [501, 521]:
                    return 'MODERATE'
                else:
                    return 'LOW'
            elif weather_id in [701, 711, 721, 731, 741, 751, 761, 762, 771, 781]:
                if visibility < 1000:
                    return 'HIGH'
                elif visibility < 5000:
                    return 'MODERATE'
                else:
                    return 'LOW'
            elif wind_speed > 15:
                return 'HIGH'
            elif wind_speed > 10:
                return 'MODERATE'
            elif main_weather in ['Clouds'] and visibility < 5000:
                return 'LOW'
            else:
                return 'MINIMAL'

        impact_level = assess_traffic_impact(main_weather, weather_id, 
                                        data_point.get('wind_speed', 0),
                                        data_point.get('visibility', 10000))
        
        traffic_data = {
            'timestamp': timestamp,
            'readable_time': readable_time,
            'weather_condition': main_weather,
            'description': description,
            'traffic_impact_level': impact_level,
            'visibility_km': data_point.get('visibility', 10000) / 1000,
            'wind_speed_ms': data_point.get('wind_speed', 0),
            'wind_gust_ms': data_point.get('wind_gust'),
            'temperature_c': data_point.get('temp'),
            'humidity_percent': data_point.get('humidity'),
            'cloud_coverage_percent': data_point.get('clouds')
        }
        
        if 'rain' in data_point:
            traffic_data['rain_1h_mm'] = data_point['rain'].get('1h', 0)
        if 'snow' in data_point:
            traffic_data['snow_1h_mm'] = data_point['snow'].get('1h', 0)

        return {'traffic_weather_data': traffic_data}

    def get_traffic_alerts(self, traffic_data: Dict):
        """Generate traffic alerts based on weather conditions."""
        data = traffic_data['traffic_weather_data']
        impact = data['traffic_impact_level']
        condition = data['weather_condition']
        time = data['readable_time']
        
        alert_map = {
            'SEVERE': f"SEVERE TRAFFIC IMPACT at {time}: {condition} - Avoid travel if possible",
            'HIGH': f"HIGH TRAFFIC IMPACT at {time}: {condition} - Expect significant delays",
            'MODERATE': f"MODERATE TRAFFIC IMPACT at {time}: {condition} - Allow extra travel time",
            'LOW': f"LOW TRAFFIC IMPACT at {time}: {condition} - Minor delays possible"
        }
        return alert_map.get(impact, "No significant traffic impacts expected")

    async def get_multiple_routes(self, origin: str, destination: str, departure_time: int) -> Dict:
        """Get multiple route options from Google Maps API - async version"""
        if not self.config.google_maps_api_key:
            return self.get_sample_routes_data()
        
        url = "https://maps.googleapis.com/maps/api/directions/json"
        params = {
            'origin': origin,
            'destination': destination,
            'departure_time': departure_time,
            'alternatives': 'true',
            'key': self.config.google_maps_api_key
        }
    
        async with self.session.get(url, params=params) as response:
            response.raise_for_status()
            return await response.json()

    def create_route_segments(self, routes: list, departure_time: int) -> Dict:
        """Optimized route segments creation"""
        all_segments = []
        seen_midpoints = set()  # Use set for O(1) lookup
        
        for routeIndex, route in enumerate(routes):
            for stepIndex, step in enumerate(route['legs'][0]['steps']):
                midpoint_lat = (step["start_location"]["lat"] + step["end_location"]["lat"]) / 2
                midpoint_lng = (step["start_location"]["lng"] + step["end_location"]["lng"]) / 2
                midpoint_key = (round(midpoint_lat, 6), round(midpoint_lng, 6))  # Round for duplicate detection
                
                if midpoint_key not in seen_midpoints:
                    segment = {
                        "original_route_id": routeIndex,
                        "original_segment_id": stepIndex,
                        "segment_key": f"{routeIndex}_{stepIndex}",
                        "start_location": step["start_location"],
                        "end_location": step["end_location"],
                        "midpoint": {"lat": midpoint_lat, "lng": midpoint_lng},
                        "distance": step["distance"]["value"],
                        "duration": step["duration"]["value"],
                        "instructions": step["html_instructions"]
                    }
                    all_segments.append(segment)
                    seen_midpoints.add(midpoint_key)

        return { 
            "unique_segments": all_segments,
            "departure_time": departure_time,
            "total_segments": len(all_segments),
            "original_routes": routes,
        }

    def nearby_segments_combiner(self, input_data: Dict) -> Dict:
        """Optimized grouping algorithm"""
        unique_segments = input_data['unique_segments']
        departure_time = input_data['departure_time']
        
        # Pre-calculate for performance
        R = 6371000  # Earth radius in meters
        threshold_distance = 10000  # 10km
        groups = []
        processed = [False] * len(unique_segments)  # Use list instead of set for indexing

        def calculate_distance_fast(lat1, lng1, lat2, lng2):
            """Optimized distance calculation"""
            d_lat = (lat2 - lat1) * math.pi / 180
            d_lng = (lng2 - lng1) * math.pi / 180
            
            a = (math.sin(d_lat/2) ** 2 +
                math.cos(lat1 * math.pi / 180) * math.cos(lat2 * math.pi / 180) *
                math.sin(d_lng/2) ** 2)
            
            return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
        for index, segment in enumerate(unique_segments):
            if processed[index]:
                continue
                
            group_segments = [segment]
            processed[index] = True
            
            # Only check unprocessed segments
            for other_index in range(index + 1, len(unique_segments)):
                if processed[other_index]:
                    continue
                    
                other_segment = unique_segments[other_index]
                distance = calculate_distance_fast(
                    segment['midpoint']['lat'], segment['midpoint']['lng'],
                    other_segment['midpoint']['lat'], other_segment['midpoint']['lng']
                )
                
                if distance <= threshold_distance:
                    group_segments.append(other_segment)
                    processed[other_index] = True
            
            # Calculate bounding box efficiently
            lats = [s['midpoint']['lat'] for s in group_segments]
            lngs = [s['midpoint']['lng'] for s in group_segments]
            buffer = 0.01
            
            bbox = {
                'sw_lat': min(lats) - buffer,
                'sw_lng': min(lngs) - buffer,
                'ne_lat': max(lats) + buffer,
                'ne_lng': max(lngs) + buffer
            }
            
            group = {
                'group_id': f'group_{len(groups)}',
                'segments': group_segments,
                'center_lat': sum(lats) / len(lats),  # Use average instead of first segment
                'center_lng': sum(lngs) / len(lngs),
                'bbox': bbox,
                'bbox_string': f"{bbox['sw_lng']},{bbox['sw_lat']},{bbox['ne_lng']},{bbox['ne_lat']}"
            }
            
            groups.append(group)
        
        return {
            'segment_groups': groups,
            'departure_time': departure_time,
            'grouping_stats': {
                'total_groups': len(groups),
                'average_segments_per_group': round(len(unique_segments) / len(groups)) if groups else 0,
                'api_calls_needed': len(groups)
            }
        }

    async def get_address(self, lat: float, lng: float) -> str:
        """Async version of address lookup"""
        if not self.config.google_maps_api_key:
            return "Address not available (API key missing)"
        
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            'latlng': f"{lat},{lng}",
            'key': self.config.google_maps_api_key
        }
        
        try:
            async with self.session.get(url, params=params) as response:
                response.raise_for_status()
                results = (await response.json()).get('results', [])
                if results:
                    return results[0].get('formatted_address', 'Address not found')
                return 'Address not found'
        except Exception as e:
            logger.error(f"Error getting address: {e}")
            return f"Location: {lat:.4f}, {lng:.4f}"

    async def get_tomtom_incidents(self, group_bbox_string: str, departure_time: int) -> List:
        """Async TomTom incidents"""
        if not self.config.tomtom_api_key:
            logger.warning("TomTom API key not configured")
            return []

        url = "https://api.tomtom.com/traffic/services/5/incidentDetails"
        params = {
            'key': self.config.tomtom_api_key,
            "bbox": group_bbox_string,
            "fields": "{incidents{type,properties{iconCategory,magnitudeOfDelay,events{description,code},startTime,endTime,from,to,length,delay,numberOfReports,lastReportTime}}}",
        }
        
        try:
            async with self.session.get(url, params=params) as response:
                if response.status != 200:
                    logger.error(f"TomTom API error: {response.status}")
                    return []
                
                data = await response.json()
                incidents_with_impact = []
                
                for incident in data.get('incidents', []):
                    end_time_str = incident.get('properties', {}).get('endTime')
                    if end_time_str:
                        end_time = datetime.strptime(end_time_str, "%Y-%m-%dT%H:%M:%SZ").timestamp()
                        if end_time > departure_time:
                            incidents_with_impact.append(incident)
                    else:
                        incidents_with_impact.append(incident)

                return incidents_with_impact
                
        except Exception as e:
            logger.error(f"Error fetching TomTom incidents: {e}")
            return []

    async def get_weather_data(self, lat: float, lng: float, dt: int) -> Dict:
        """Async weather data"""
        if not self.config.openweather_api_key:
            logger.warning("OpenWeather API key not configured")
            return {}
            
        url = "https://api.openweathermap.org/data/3.0/onecall/timemachine"
        params = {
            'lat': lat,
            'lon': lng,
            'appid': self.config.openweather_api_key,
            'units': 'metric',
            'dt': dt
        }
        
        try:
            async with self.session.get(url, params=params) as response:
                response.raise_for_status()
                data = await response.json()
                result = self.extract_traffic_affecting_weather(data)
                result["alert"] = self.get_traffic_alerts(result)
                return result
        except Exception as e:
            logger.error(f"Error fetching weather data: {e}")
            return {}

    async def get_tomtom_flow_data(self, lat: float, lng: float) -> Dict:
        """Async TomTom flow data"""
        if not self.config.tomtom_api_key:
            return {}
            
        url = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
        params = {
            'point': f"{lat},{lng}",
            'key': self.config.tomtom_api_key
        }
        
        try:
            async with self.session.get(url, params=params) as response:
                response.raise_for_status()
                flow_segment = (await response.json())['flowSegmentData']
                return {
                    "currentToFreeFlowSpeedRatio": round(flow_segment['currentSpeed']/flow_segment['freeFlowSpeed'], 3),
                    "delayInTravelTimeInMins": round((flow_segment['currentTravelTime'] - flow_segment['freeFlowTravelTime'])/60, 3),
                    "confidence": flow_segment['confidence'],
                    "roadClosure": flow_segment['roadClosure']
                }
        except Exception as e:
            logger.error(f"Error fetching TomTom flow data: {e}")
            return {}

    def get_user_reports(self, group: Dict, user_reports: List, departure_time: int) -> List:
        """Optimized user reports processing"""
        final_reports = []
        type_score = {
            'accident': 10, 'construction': 8, 'weather': 7,
            'traffic_jam': 6, 'event': 5, 'resolved': 2
        }
        
        # Pre-calculate group bounds for faster filtering
        bbox = group['bbox']
        
        for post in user_reports:
            report_type = post['category']
            if report_type == "resolved":
                continue
                
            # Quick bounding box check first
            lat, lng = post['location']['latitude'], post['location']['longitude']
            if not (bbox['sw_lat'] <= lat <= bbox['ne_lat'] and bbox['sw_lng'] <= lng <= bbox['ne_lng']):
                continue
            
            # Age calculation
            report_age = departure_time - datetime.strptime(post['createdAt'], "%Y-%m-%dT%H:%M:%S.%fZ").timestamp()
            age_in_hours = report_age / 3600  # Fixed division
            
            # Age filtering
            age_thresholds = {
                "accident": 4, "weather": 4, "construction": 24,
                "traffic_jam": 2, "event": 5
            }
            
            if age_in_hours > age_thresholds.get(report_type, 24):
                continue
            
            # Score calculation (simplified)
            score = max(0, 20 - (age_in_hours * 5))  # Time score
            min_distance = calculate_min_distance_to_route(post['location'], group['center_lat'], group['center_lng'])
            score += max(0, 40 - (min_distance/25))  # Distance score
            score += min(20, max(0, 20 + (post.get('upvotes', 0) - post.get('downvotes', 0))))  # Vote score
            score += type_score.get(report_type, 0)  # Type score
            
            if score > 30:  # Only include high-scoring reports
                final_reports.append({**post, "group_id": group['group_id'], "score": round(score)})

        return final_reports

    async def get_web_search_intelligence(self, group: Dict, departure_time: str) -> Dict:
        """Async web search intelligence"""
        try:
            analyzer = TrafficAnalyzer(
                gemini_api_key=self.config.gemini_api_key,
                search_api_key=self.config.google_search_api_key,
                search_engine_id=self.config.search_engine_id
            )
            
            address = await self.get_address(group['center_lat'], group['center_lng'])
            query = SearchQuery(
                address=address,
                current_time=datetime.now().isoformat(),
                departure_time=departure_time
            )

            result = await analyzer.search_and_analyze(query)
            return result
        except Exception as e:
            logger.error(f"Error in web search intelligence: {e}")
            return {"error": str(e), "incidents": []}

    async def collect_intelligence_group(self, group: Dict, departure_time: int, readable_time: str, 
                                       get_flow_data: bool, traffic_incident_posts: List) -> tuple:
        """Collect intelligence for a single group - fully async"""
        group_id = group['group_id']
        
        # Create all async tasks
        tasks = {}
        
        # TomTom Incidents
        tasks['traffic_incidents'] = self.get_tomtom_incidents(group['bbox_string'], departure_time)
        
        # Weather Data  
        tasks['weather_data'] = self.get_weather_data(group['center_lat'], group['center_lng'], departure_time // 1000)
        
        # Web Search Intelligence
        tasks['web_intelligence'] = self.get_web_search_intelligence(group, readable_time)
        
        # TomTom Flow Data (conditional)
        if get_flow_data:
            tasks['traffic_flow'] = self.get_tomtom_flow_data(group['center_lat'], group['center_lng'])
        
        # Execute all async tasks concurrently
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        
        # Map results back to task names
        task_results = {}
        for i, (task_name, _) in enumerate(tasks.items()):
            result = results[i]
            if isinstance(result, Exception):
                logger.error(f"Error in {task_name} for group {group_id}: {result}")
                task_results[task_name] = {} if task_name != 'traffic_incidents' else []
            else:
                task_results[task_name] = result
        
        # User Reports (synchronous, but fast)
        task_results['user_reports'] = self.get_user_reports(group, traffic_incident_posts, departure_time)
        
        return group_id, {
            'bbox': group['bbox'],
            'bbox_string': group['bbox_string'],
            'center_lat': group['center_lat'],
            'center_lng': group['center_lng'],
            'segments': group['segments'],
            'departure_time': departure_time,
            'intelligence_data': task_results
        }

    async def collect_intelligence(self, combined_segments: Dict) -> Dict:
        """Optimized intelligence collection with full concurrency"""
        departure_time = combined_segments['departure_time']
        readable_time = datetime.fromtimestamp(departure_time//1000).strftime('%Y-%m-%d %H:%M:%S')
        current_time = time.time()
        get_flow_data = (departure_time//1000) - current_time < 7200
        
        # Generate traffic posts once
        traffic_incident_posts = generate_traffic_posts()
        
        # Create tasks for all groups concurrently
        group_tasks = [
            self.collect_intelligence_group(
                group, departure_time, readable_time, 
                get_flow_data, traffic_incident_posts
            )
            for group in combined_segments['segment_groups']
        ]
        
        # Execute all group intelligence collection concurrently
        results = await asyncio.gather(*group_tasks)
        
        # Build final result
        fused_intelligence = {}
        for group_id, group_data in results:
            fused_intelligence[group_id] = group_data
            
        return fused_intelligence

    def data_fusion(self, intelligence_data: Dict, routes: Dict, segment_groups, segments) -> Dict:
        """Optimized data fusion"""
        try:
            fuser = DataFusion(gemini_api_key=self.config.gemini_api_key)
            insights_data = fuser.fuse_data(intelligence_data)["fused_result"]
            
            # Extract JSON more efficiently
            if isinstance(insights_data, str):
                json_match = re.search(r'\{.*\}', insights_data, re.DOTALL)
                if json_match:
                    insights_data = json.loads(json_match.group())
                else:
                    logger.error("No JSON found in fusion result")
                    return routes
            
            insights = insights_data.get('insights', [])
            
            # Create efficient mappings
            group_insights = {insight['group_id']: insight for insight in insights}
            segment_to_group = {}
            
            for group in segment_groups:
                group_id = group['group_id']
                for segment in group.get('segments', []):
                    segment_key = segment.get('segment_key')
                    if segment_key:
                        segment_to_group[segment_key] = group_id
            
            # Get unique route IDs
            route_ids = list(set(seg['original_route_id'] for seg in segments))
            
            # Build route insights efficiently
            route_insights = {}
            for route_id in route_ids:
                route_segments = [seg for seg in segments if seg['original_route_id'] == route_id]
                route_segments.sort(key=lambda x: x['original_segment_id'])
                
                seen_groups = set()
                route_group_insights = []
                
                for segment in route_segments:
                    group_id = segment_to_group.get(segment['segment_key'])
                    if group_id and group_id in group_insights and group_id not in seen_groups:
                        route_group_insights.append(group_insights[group_id])
                        seen_groups.add(group_id)
                
                route_insights[f"route_{route_id}"] = {
                    'route_id': route_id,
                    'insights': route_group_insights,
                    'last_updated': datetime.now().isoformat()
                }
            
            # Add insights to routes
            routes['insights'] = [route_insights.get(f"route_{i}", {}) for i in range(len(routes['routes']))]
            
            return routes
            
        except Exception as e:
            logger.error(f"Error in data fusion: {e}")
            return routes

    async def get_per_route_insights(self, origin: str, destination: str, departure_time: int) -> Dict:
        """Main optimized method with full async support"""
        try:
            # Step 1: Get routes (async)
            routes = await self.get_multiple_routes(origin, destination, departure_time)
            
            # Step 2: Create route segments (fast, synchronous)
            route_segments = self.create_route_segments(routes['routes'], departure_time)
            
            # Step 3: Combine nearby segments (fast, synchronous)
            combined_segments = self.nearby_segments_combiner(route_segments)
            
            # Step 4: Collect intelligence (fully async, concurrent)
            intelligence_data = await self.collect_intelligence(combined_segments)
            
            # Step 5: Data fusion (synchronous)
            routes_with_insights = self.data_fusion(
                intelligence_data, routes, 
                combined_segments['segment_groups'], 
                route_segments['unique_segments']
            )
            
            return routes_with_insights
            
        except Exception as e:
            logger.error(f"Error in get_per_route_insights: {e}")
            raise

# Usage example with async context manager
async def main():
    async with SynapCitySmartTrafficIntelligence() as synap_city:
        origin = "Sunlife hospital, HSR Layout, Bangalore, India"
        destination = "Kempegowda International Airport, Bangalore, India"
        departure_time = int(datetime.now().timestamp() * 1000)
        
        start = time.time()
        routes = await synap_city.get_per_route_insights(origin, destination, departure_time)
        print(f"Time taken: {time.time() - start} seconds")
        print(json.dumps(routes, indent=2))

if __name__ == "__main__":
    asyncio.run(main())