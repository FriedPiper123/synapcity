import math


def calculate_min_distance_to_route(report_location, center_lat, center_lng):
    """Calculate minimum distance from report to any segment in the route"""
    min_distance = float('inf')
    # Distance to segment midpoint
    distance_to_midpoint = calculate_haversine_distance(
        report_location['lat'], report_location['lng'],
        center_lat, center_lng
    )
    
    min_distance = min(min_distance, distance_to_midpoint)    
    return round(min_distance)  # Return distance in meters

def calculate_haversine_distance(lat1, lng1, lat2, lng2):
    """Haversine distance formula"""
    R = 6371000  # Earth's radius in meters
    d_lat = (lat2 - lat1) * math.pi / 180
    d_lng = (lng2 - lng1) * math.pi / 180
    a = (math.sin(d_lat/2) * math.sin(d_lat/2) +
        math.cos(lat1 * math.pi / 180) * math.cos(lat2 * math.pi / 180) *
        math.sin(d_lng/2) * math.sin(d_lng/2))
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
