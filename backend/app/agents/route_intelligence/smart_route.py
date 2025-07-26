import asyncio
import json
import logging
import math
import os
import re
import requests
import time
from .config_keys import config
from typing import List, Optional, Dict
from datetime import datetime

from .generate_posts import generate_traffic_posts
from .traffic_analyzer import TrafficAnalyzer, SearchQuery
from .route_utils import calculate_min_distance_to_route
from .data_fusion import DataFusion
# Setup logger
logger = logging.getLogger("SynapCityLogger")
logger.setLevel(logging.DEBUG)  # Log everything (DEBUG, INFO, WARNING, ERROR, CRITICAL)
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

class SynapCitySmartTrafficIntelligence:
    def __init__(self):
        self.config = config

    def extract_traffic_affecting_weather(self, weather_data: Dict) -> Dict:
        """
        Extract essential weather information that affects traffic flow.
        
        Args:
            weather_data: OpenWeather API response dictionary
            
        Returns:
            Dictionary with traffic-relevant weather information
        """

        data_point = weather_data.get('data')[0]
        # Convert timestamp to readable format
        timestamp = data_point.get('dt')
        readable_time = datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S') if timestamp else None
        
        # Extract weather conditions
        weather_conditions = data_point.get('weather', [])
        main_weather = weather_conditions[0].get('main', '') if weather_conditions else ''
        description = weather_conditions[0].get('description', '') if weather_conditions else ''
        weather_id = weather_conditions[0].get('id', 0) if weather_conditions else 0
        
        def assess_traffic_impact(weather_main: str, weather_id: int, wind_speed: float, visibility: int) -> str:
            """
            Assess the traffic impact level based on weather conditions.
            
            Returns: 'SEVERE', 'HIGH', 'MODERATE', 'LOW', or 'MINIMAL'
            """
            
            # Weather ID ranges for different conditions
            # 200-232: Thunderstorm, 300-321: Drizzle, 500-531: Rain
            # 600-622: Snow, 701-781: Atmosphere (fog, mist, etc.), 800: Clear, 801-804: Clouds
            
            if weather_id in range(200, 233):  # Thunderstorms
                return 'SEVERE'
            elif weather_id in range(600, 623):  # Snow
                return 'SEVERE' if weather_id in [611, 612, 613, 615, 616, 620, 621, 622] else 'HIGH'
            elif weather_id in range(500, 532):  # Rain
                if weather_id in [502, 503, 504, 511, 522, 531]:  # Heavy rain, freezing rain
                    return 'HIGH'
                elif weather_id in [501, 521]:  # Moderate rain
                    return 'MODERATE'
                else:  # Light rain
                    return 'LOW'
            elif weather_id in [701, 711, 721, 731, 741, 751, 761, 762, 771, 781]:  # Fog, mist, dust, etc.
                if visibility < 1000:  # Less than 1km visibility
                    return 'HIGH'
                elif visibility < 5000:  # Less than 5km visibility
                    return 'MODERATE'
                else:
                    return 'LOW'
            elif wind_speed > 15:  # High winds (>54 km/h)
                return 'HIGH'
            elif wind_speed > 10:  # Moderate winds (>36 km/h)
                return 'MODERATE'
            elif weather_main in ['Clouds'] and visibility < 5000:
                return 'LOW'
            else:
                return 'MINIMAL'
        # Determine traffic impact level
        impact_level = assess_traffic_impact(main_weather, weather_id, 
                                        data_point.get('wind_speed', 0),
                                        data_point.get('visibility', 10000))
        
        traffic_data = {
            'timestamp': timestamp,
            'readable_time': readable_time,
            'weather_condition': main_weather,
            'description': description,
            'traffic_impact_level': impact_level,
            'visibility_km': data_point.get('visibility', 10000) / 1000,  # Convert to km
            'wind_speed_ms': data_point.get('wind_speed', 0),
            'wind_gust_ms': data_point.get('wind_gust'),
            'temperature_c': data_point.get('temp'),
            'humidity_percent': data_point.get('humidity'),
            'cloud_coverage_percent': data_point.get('clouds')
        }
        
        # Add precipitation info if available
        if 'rain' in data_point:
            traffic_data['rain_1h_mm'] = data_point['rain'].get('1h', 0)
        if 'snow' in data_point:
            traffic_data['snow_1h_mm'] = data_point['snow'].get('1h', 0)

        return {
            'traffic_weather_data': traffic_data
        }


    def get_traffic_alerts(self, traffic_data: Dict):
        """
        Generate traffic alerts based on weather conditions.
        """
        
        data = traffic_data['traffic_weather_data']
        impact = data['traffic_impact_level']
        condition = data['weather_condition']
        time = data['readable_time']
        alert = "No significant traffic impacts expected"
        if impact == 'SEVERE':
            alert = f"SEVERE TRAFFIC IMPACT at {time}: {condition} - Avoid travel if possible"
        elif impact == 'HIGH':
            alert = f"HIGH TRAFFIC IMPACT at {time}: {condition} - Expect significant delays"
        elif impact == 'MODERATE':
            alert = f"MODERATE TRAFFIC IMPACT at {time}: {condition} - Allow extra travel time"
        elif impact == 'LOW':
            alert = f"LOW TRAFFIC IMPACT at {time}: {condition} - Minor delays possible"

        return alert

   

    def get_multiple_routes(self, origin: str, destination: str, departure_time: int) -> Dict:
        """Get multiple route options from Google Maps API"""
        if not self.config.google_maps_api_key:
            # Return sample data if no API key
            return self.get_sample_routes_data()
        
        url = "https://maps.googleapis.com/maps/api/directions/json"
        params = {
            'origin': origin,
            'destination': destination,
            'departure_time': departure_time,
            'alternatives': 'true',
            'key': self.config.google_maps_api_key
        }
    
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()

    def create_route_segments(self, routes: list, departure_time: int) -> Dict:
        """Create route segments from a Google Maps route"""

        all_segments = []
        for routeIndex, route in enumerate(routes):
            for stepIndex, step in enumerate(route['legs'][0]['steps']):

                segment = {
                "original_route_id": routeIndex,
                "original_segment_id": stepIndex,
                "segment_key": f"{routeIndex}_{stepIndex}",
                "start_location": step["start_location"],
                "end_location": step["end_location"],
                "midpoint": {
                    "lat": (step["start_location"]["lat"] + step["end_location"]["lat"]) / 2,
                    "lng": (step["start_location"]["lng"] + step["end_location"]["lng"]) / 2
                },
                "distance": step["distance"]["value"],
                "duration": step["duration"]["value"],
                "instructions": step["html_instructions"]
                }
                all_segments.append(segment)
                for seg in all_segments[:-1]:
                    if seg["midpoint"]['lat'] == segment["midpoint"]['lat'] and seg["midpoint"]["lng"] == segment["midpoint"]["lng"]:
                        all_segments.pop()


        return { 
        "unique_segments": all_segments,
        "departure_time": departure_time,
        "total_segments": len(all_segments),
        "original_routes": routes,
        }

    def nearby_segments_combiner(self, input_data: Dict) -> Dict:
        unique_segments = input_data['unique_segments']
        departure_time = input_data['departure_time']
        groups = []
        processed = set()

        def calculate_distance(lat1, lng1, lat2, lng2):
            """Calculate distance between two points using Haversine formula"""
            R = 6371000  # Earth radius in meters
            d_lat = (lat2 - lat1) * math.pi / 180
            d_lng = (lng2 - lng1) * math.pi / 180
            
            a = (math.sin(d_lat/2) * math.sin(d_lat/2) +
                math.cos(lat1 * math.pi / 180) * math.cos(lat2 * math.pi / 180) *
                math.sin(d_lng/2) * math.sin(d_lng/2))
            
            return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
        for index, segment in enumerate(unique_segments):
            if index in processed:
                continue
                
            group = {
                'group_id': f'group_{len(groups)}',
                'segments': [segment],
                'center_lat': segment['midpoint']['lat'],
                'center_lng': segment['midpoint']['lng']
            }
            processed.add(index)
            
            for other_index, other_segment in enumerate(unique_segments):
                if other_index in processed:
                    continue
                    
                distance = calculate_distance(
                    segment['midpoint']['lat'], 
                    segment['midpoint']['lng'],
                    other_segment['midpoint']['lat'], 
                    other_segment['midpoint']['lng']
                )
                
                if distance <= 10000:
                    group['segments'].append(other_segment)
                    processed.add(other_index)
            
            # Calculate combined bounding box
            lats = [s['midpoint']['lat'] for s in group['segments']]
            lngs = [s['midpoint']['lng'] for s in group['segments']]
            buffer = 0.01
            
            group['bbox'] = {
                'sw_lat': min(lats) - buffer,
                'sw_lng': min(lngs) - buffer,
                'ne_lat': max(lats) + buffer,
                'ne_lng': max(lngs) + buffer
            }
            
            group['bbox_string'] = f"{group['bbox']['sw_lng']},{group['bbox']['sw_lat']},{group['bbox']['ne_lng']},{group['bbox']['ne_lat']}"
            
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
    
    def get_group_bbox(self, combined_segments: Dict):
        """Extract bounding box information from combined segments"""
        segment_groups = combined_segments['segment_groups']
        result = []
        for group in segment_groups:
            result.append({
                'group_id': group['group_id'],
                'bbox_string': group['bbox_string'],
                'center_lat': group['center_lat'],
                'center_lng': group['center_lng'],
                'bbox': group['bbox']
            })
        return result

    def get_address(self, lat: float, lng: float) -> str:
        """Get address from Google Maps Geocoding API"""
        if not self.config.google_maps_api_key:
            return "Address not available (API key missing)"
        
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            'latlng': f"{lat},{lng}",
            'key': self.config.google_maps_api_key
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        results = response.json().get('results', [])
        if results:
            return results[0].get('formatted_address', 'Address not found')
        return 'Address not found'

    def get_tomtom_incidents(self, group_bbox_string: str, departure_time: int) -> Dict:
        """Get traffic incidents from TomTom API"""
        if not self.config.tomtom_api_key:
            return {"error": "TomTom API key is not configured."}

        url = f"https://api.tomtom.com/traffic/services/5/incidentDetails"
        params = {
            'key': self.config.tomtom_api_key,
            "bbox": group_bbox_string,
            "fields": "{incidents{type,properties{iconCategory,magnitudeOfDelay,events{description,code},startTime,endTime,from,to,length,delay,numberOfReports,lastReportTime}}}",
        }
        response = requests.get(url, params=params)
        if response.status_code != 200:
            logger.error(f"Error fetching incidents: {response.text}")
            return {"error": "Failed to fetch incidents."}
        incidents_with_impact = []
        for incident in response.json().get('incidents', []):
            
            end_time = datetime.strptime(incident['properties']['endTime'], "%Y-%m-%dT%H:%M:%SZ").timestamp() if incident['properties']['endTime'] else None
        # if end_time is null or greater than the departure_time we show those incidents
            if end_time is None or end_time > departure_time:
                # group_incidents_with_impact['incidents'].append(incident)
                incidents_with_impact.append(incident)

        return incidents_with_impact

    def get_weather_data(self, lat: float, lng: float, dt: int) -> Dict:
        """Get weather data from OpenWeather"""
        url = "https://api.openweathermap.org/data/3.0/onecall/timemachine"
        params = {
            'lat': lat,
            'lon': lng,
            'appid': self.config.openweather_api_key,
            'units': 'metric',
            'dt': dt
        }
        
        try:
            response = requests.get(url, params=params)

            response.raise_for_status()
            # Extract traffic-relevant data
            result = self.extract_traffic_affecting_weather(response.json())
            result["alert"] = self.get_traffic_alerts(result)
            return result
        except Exception as e:
            logger.error(f"Error fetching weather data: {e}")
            return {}


    def get_tomtom_flow_data(self, lat: float, lng: float) -> Dict:
        """Get real-time traffic flow data from TomTom"""
        url = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
        params = {
            'point': f"{lat},{lng}",
            'key': self.config.tomtom_api_key
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()

            flow_segment = response.json()['flowSegmentData']
            return {
                "currentToFreeFlowSpeedRatio": round(flow_segment['currentSpeed']/flow_segment['freeFlowSpeed'], 3),
                "delayInTravelTimeInMins": round((flow_segment['currentTravelTime'] - flow_segment['freeFlowTravelTime'])/60, 3),
                "confidence": flow_segment['confidence'],
                "roadClosure": flow_segment['roadClosure']
            }
            
        except Exception as e:
            logger.error(f"Error fetching TomTom flow data: {e}")
            return {}
        
    def get_user_reports(self, group: Dict, user_reports: List, departure_time: int) -> Dict:
        """Get user-generated traffic reports from Google Cloud Realtime Database"""

        finalReports = []
        addedReports =  []

        type_score = {
            'accident': 10,      # Highest impact
            'construction': 8,   # High impact
            'weather': 7,        # High impact  
            'traffic_jam': 6,    # Medium impact
            'event': 5,          # Medium impact
            'resolved': 2        # Low impact
            }
            

        for post in user_reports:
            score = 0
            max_score = 100
            reportId = post['postId']

            report_age = departure_time - datetime.strptime(post['createdAt'], "%Y-%m-%dT%H:%M:%S.%fZ").timestamp()
            age_in_hours = report_age / 36000000
            time_score = max(0, 20 - (age_in_hours * 5))
            score += time_score
            
            report_type = post['category']

            if report_type == "resolved":
                continue
            
            if (age_in_hours < 4 and report_type in ["accident", "weather"]) or (age_in_hours < 24 and report_type == "construction") or (age_in_hours < 2 and report_type == "traffic_jam") or (age_in_hours < 5 and report_type == "event"):   
            
                # Distance Factor ( 40 points max)
                min_distance = calculate_min_distance_to_route(post['location'], group['center_lat'], group['center_lng'])
                lat = post['location']['latitude']
                lng = post['location']['longitude']
                distance_score = max(0, 40 - (min_distance/25))
                score += min(40, distance_score)
                
                # # Severity Factor (20 points max)
                # severity_score = (post['severity']/10) * 25
                # score += severity_score

                # Upvote/Downvote Factor (20 points max)
                upvotes = post.get('upvotes', 0)
                downvotes = post.get('downvotes', 0)
                vote_score = max(0, 20 + (upvotes - downvotes))
                score += min(20, vote_score)
            
                score += type_score[report_type] or 0            
                score = min(max_score, round(score))

                if lat >= group['bbox']['sw_lat'] and lat <= group['bbox']['ne_lat'] and lng >= group['bbox']['sw_lng'] and lng <= group['bbox']['ne_lng']:
                    report = {**post, "group_id":group['group_id']}
                    finalReports.append(report)
                    addedReports.append(reportId)


        return finalReports 

    async def get_web_search_intelligence(self, group: Dict, departure_time: str) -> Dict:

        analyzer = TrafficAnalyzer(
        gemini_api_key=config.gemini_api_key,  # Optional
        search_api_key=config.google_search_api_key,  # Optional
        search_engine_id=config.search_engine_id  # Optional
    )
        address = self.get_address(group['center_lat'], group['center_lng'])
        query = SearchQuery(address=address,
        current_time=datetime.now().isoformat(),
        departure_time=departure_time)

        result = await analyzer.search_and_analyze(query)
        return result

    def collect_intelligence(self, combined_segments: Dict) -> Dict:
        fused_intelligence = {}
        departure_time = combined_segments['departure_time']

        readable_time = datetime.fromtimestamp(departure_time//1000).strftime('%Y-%m-%d %H:%M:%S') if departure_time else None
        current_time = time.time()  # Current time in milliseconds
        get_flow_data = (departure_time//1000) - current_time < 7200  # Check if within last hour
        traffic_incident_posts = generate_traffic_posts()
        for group in combined_segments['segment_groups']:
            group_tasks= {}
            # TomTom Flow Data
            if get_flow_data:
                group_tasks['traffic_flow'] = self.get_tomtom_flow_data(group['center_lat'], group['center_lng'])

            # TomTom Incidents
            group_tasks['traffic_incidents'] = self.get_tomtom_incidents(group['bbox_string'], departure_time)

            # Weather Data
            group_tasks['weather_data'] = self.get_weather_data(group['center_lat'], group['center_lng'], departure_time // 1000)

            # User Reports
            group_tasks['user_reports'] = self.get_user_reports(group, traffic_incident_posts, departure_time)

            # Web Search Intelligence
            group_tasks['web_intelligence'] = asyncio.run(self.get_web_search_intelligence(group, readable_time))

            fused_intelligence[group['group_id']] = {
                'bbox': group['bbox'],
                'bbox_string': group['bbox_string'],
                'center_lat': group['center_lat'],
                'center_lng': group['center_lng'],
                'segments': group['segments'],
                'departure_time': departure_time,
                'intelligence_data': group_tasks
            }
        return fused_intelligence
    
    def data_fusion(self, intelligence_data: Dict, routes: Dict, segment_groups, segments ) -> Dict:

        fuser = DataFusion(gemini_api_key=self.config.gemini_api_key)
        insights_data = fuser.fuse_data(intelligence_data)["fused_result"] # dict
        routes_count = len(routes['routes'])
        json_match = re.search(r'\{.*\}', insights_data, re.DOTALL)

        json_str = json_match.group()
        logger.info("Found JSON in Gemini response")
        insights_data= json.loads(json_str)

        insights = insights_data['insights']  

        # Create group_id to insight mapping
        group_insights = {}
        for insight in insights:
            group_insights[insight['group_id']] = insight

        # Create segment_key to group_id mapping from segment_groups
        segment_to_group = {}
        for group in segment_groups:

            group_id = group['group_id']
            for segment in group.get('segments', []):
                segment_key = segment.get('segment_key')
                if segment_key:
                    segment_to_group[segment_key] = group_id

        # Get all unique route IDs
        route_ids = list(set(seg['original_route_id'] for seg in segments))

        # Initialize route insights
        route_insights = {}

        for route_id in route_ids:
            # Get all segments for this route
            route_segments = [seg for seg in segments if seg['original_route_id'] == route_id]
            route_segments.sort(key=lambda x: x['original_segment_id'])
            
            # Collect insights for segments in this route
            route_group_insights = []
            affected_groups = []

            for segment in route_segments:
                segment_key = segment['segment_key']
                group_id = segment_to_group.get(segment_key)
                
                
                if group_id in group_insights and group_id not in affected_groups:
                    
                    insight = group_insights[group_id]
                    affected_groups.append(group_id)
                    
                    route_group_insights.append(insight)
        # Build route insight summary
        route_insights[f"route_{route_id}"] = {
            'route_id': route_id,
            'insights': route_group_insights,
            'last_updated': datetime.now().isoformat()
        }

        # Create indexed insights array
        insights_array = []
        new_routes = {**routes, 'insights': []}

        for route_index in range(routes_count):
            route_key = f"route_{route_index}"
            
            if route_key in route_insights:
                insight = route_insights[route_key]
                new_routes['insights'].append(insight)


        # routes["insights"] = insights_array
        return new_routes
        
            



    def get_per_route_insights(self, origin: str, destination: str, departure_time: int) -> Dict:
        """Get insights for each route"""
        routes = self.get_multiple_routes(
            origin=origin,
            destination=destination,
            departure_time=departure_time
        )
        
        route_segments = self.create_route_segments(routes['routes'], departure_time)
        
        combined_segments = self.nearby_segments_combiner(route_segments)
    
        
        intelligence_data = self.collect_intelligence(combined_segments)

        routes_with_insights = self.data_fusion(intelligence_data, routes, combined_segments['segment_groups'], route_segments['unique_segments'])

        return routes_with_insights

if __name__ == "__main__":
    # Example usage
    synap_city = SynapCitySmartTrafficIntelligence()
    origin = "Sunlife hospital, HSR Layout, Bangalore, India"
    destination = "Kempegowda International Airport, Bangalore, India"
    departure_time = int(datetime.now().timestamp() * 1000)  # Current time in milliseconds since epoch
    import time
    start = time.time()
    # Fetch routes
    routes = synap_city.get_per_route_insights(origin, destination, departure_time)
    print(f"Time taken: {time.time() - start} seconds")
    print(json.dumps(routes, indent=2))
