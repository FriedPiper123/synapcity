import geohash2
import math
from typing import List, Tuple

def encode_geohash(latitude: float, longitude: float, precision: int = 6) -> str:
    """
    Encode latitude and longitude to geohash with specified precision.
    
    Args:
        latitude: Latitude coordinate
        longitude: Longitude coordinate
        precision: Geohash precision (1-12, default 6)
    
    Returns:
        Geohash string
    """
    return geohash2.encode(latitude, longitude, precision)

def decode_geohash(geohash: str) -> Tuple[float, float]:
    """
    Decode geohash to latitude and longitude.
    
    Args:
        geohash: Geohash string
    
    Returns:
        Tuple of (latitude, longitude)
    """
    return geohash2.decode(geohash)

def get_geohash_neighbors(geohash: str) -> List[str]:
    """
    Get all 8 neighboring geohashes plus the center one.
    Manually implemented since geohash2 doesn't have neighbors function.
    
    Args:
        geohash: Center geohash string
    
    Returns:
        List of geohash strings including center and neighbors
    """
    # Base32 characters used in geohash
    base32 = "0123456789bcdefghjkmnpqrstuvwxyz"
    
    # Neighbor directions: [north, south, east, west, northeast, northwest, southeast, southwest]
    neighbors = {
        'n': ['p0r21436x8zb9dcf5h7kjnmqesgutwvy', 'bc01fg45238967deuvhjyznpkmstqrwx'],
        's': ['14365h7k9dcfesgujnmqp0r2twvyx8zb', '238967debc01fg45kmstqrwxuvhjyznp'],
        'e': ['bc01fg45238967deuvhjyznpkmstqrwx', 'p0r21436x8zb9dcf5h7kjnmqesgutwvy'],
        'w': ['238967debc01fg45kmstqrwxuvhjyznp', '14365h7k9dcfesgujnmqp0r2twvyx8zb']
    }
    
    borders = {
        'n': ['prxz', 'bcfguvyz'],
        's': ['028b', '0145hjnp'],
        'e': ['bcfguvyz', 'prxz'],
        'w': ['0145hjnp', '028b']
    }
    
    def adjacent(geohash: str, direction: str) -> str:
        """Get adjacent geohash in the specified direction."""
        if len(geohash) == 0:
            return ""
        
        last_char = geohash[-1]
        base = geohash[:-1]
        
        if len(base) == 0:
            return ""
        
        # Check if we need to change the parent
        if last_char in borders[direction][0]:
            base = adjacent(base, direction)
            if base == "":
                return ""
        
        # Find the next character in the direction
        char_index = base32.index(last_char)
        neighbor_chars = neighbors[direction][char_index % 2]
        return base + neighbor_chars[char_index // 2]
    
    # Get all 8 neighbors plus center
    center = geohash
    north = adjacent(center, 'n')
    south = adjacent(center, 's')
    east = adjacent(center, 'e')
    west = adjacent(center, 'w')
    northeast = adjacent(north, 'e') if north else ""
    northwest = adjacent(north, 'w') if north else ""
    southeast = adjacent(south, 'e') if south else ""
    southwest = adjacent(south, 'w') if south else ""
    
    # Return all valid neighbors plus center
    neighbors_list = [center]
    for neighbor in [north, south, east, west, northeast, northwest, southeast, southwest]:
        if neighbor:
            neighbors_list.append(neighbor)
    
    return neighbors_list

def get_geohash_bbox(geohash: str) -> Tuple[float, float, float, float]:
    """
    Get the bounding box of a geohash.
    
    Args:
        geohash: Geohash string
    
    Returns:
        Tuple of (min_lat, min_lon, max_lat, max_lon)
    """
    lat, lon = decode_geohash(geohash)
    
    # Calculate the size of the geohash cell
    precision = len(geohash)
    lat_size = 90.0 / (3 ** (precision // 2))
    lon_size = 180.0 / (3 ** (precision // 2))
    
    return (lat - lat_size/2, lon - lon_size/2, lat + lat_size/2, lon + lon_size/2)

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the distance between two points using the Haversine formula.
    Returns distance in kilometers.
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of earth in kilometers
    r = 6371
    
    return c * r

def get_geohash_precision_for_radius(radius_km: float) -> int:
    """
    Determine the appropriate geohash precision for a given radius.
    This helps optimize queries by using the right precision level.
    
    Args:
        radius_km: Search radius in kilometers
    
    Returns:
        Geohash precision level (1-12)
    """
    # Approximate geohash precision levels and their typical cell sizes
    precision_sizes = {
        1: 5000,   # ~5000km
        2: 1250,   # ~1250km
        3: 156,    # ~156km
        4: 19.5,   # ~19.5km
        5: 4.89,   # ~4.89km
        6: 1.22,   # ~1.22km
        7: 0.153,  # ~153m
        8: 0.0191, # ~19.1m
        9: 0.00477,# ~4.77m
        10: 0.000596, # ~0.596m
        11: 0.0000746, # ~0.0746m
        12: 0.00000932 # ~0.00932m
    }
    
    # For our use case, we want to match the precision of stored posts (6 characters)
    # and then expand to include neighboring cells
    return 6  # Default to 6-character precision to match stored posts

def get_geohash_cells_for_radius(latitude: float, longitude: float, radius_km: float) -> List[str]:
    """
    Get all geohash cells that need to be queried for a given location and radius.
    
    Args:
        latitude: Center latitude
        longitude: Center longitude
        radius_km: Search radius in kilometers
    
    Returns:
        List of geohash strings to query
    """
    precision = get_geohash_precision_for_radius(radius_km)
    center_geohash = encode_geohash(latitude, longitude, precision)
    
    # Get neighbors and center
    geohash_cells = get_geohash_neighbors(center_geohash)
    
    # For larger radii, we might need to expand to include more cells
    if radius_km > 5:  # For larger searches, include more neighboring cells
        expanded_cells = []
        for cell in geohash_cells:
            expanded_cells.extend(get_geohash_neighbors(cell))
        geohash_cells = list(set(expanded_cells))  # Remove duplicates
    
    return geohash_cells

def is_within_radius(lat1: float, lon1: float, lat2: float, lon2: float, radius_km: float) -> bool:
    """
    Check if two points are within the specified radius.
    
    Args:
        lat1, lon1: First point coordinates
        lat2, lon2: Second point coordinates
        radius_km: Radius in kilometers
    
    Returns:
        True if points are within radius, False otherwise
    """
    distance = calculate_distance(lat1, lon1, lat2, lon2)
    return distance <= radius_km 

def get_geohash_4th_level_neighbors(geohash: str) -> List[str]:
    """
    Get 4th level neighbors in all 4 directions from a center geohash.
    This creates a diamond-like pattern extending 4 cells in each direction.
    
    Args:
        geohash: Center geohash string
    
    Returns:
        List of geohash strings including all 4th level neighbors
    """
    base32 = "0123456789bcdefghjkmnpqrstuvwxyz"
    
    neighbors = {
        'n': ['p0r21436x8zb9dcf5h7kjnmqesgutwvy', 'bc01fg45238967deuvhjyznpkmstqrwx'],
        's': ['14365h7k9dcfesgujnmqp0r2twvyx8zb', '238967debc01fg45kmstqrwxuvhjyznp'],
        'e': ['bc01fg45238967deuvhjyznpkmstqrwx', 'p0r21436x8zb9dcf5h7kjnmqesgutwvy'],
        'w': ['238967debc01fg45kmstqrwxuvhjyznp', '14365h7k9dcfesgujnmqp0r2twvyx8zb']
    }
    
    borders = {
        'n': ['prxz', 'bcfguvyz'],
        's': ['028b', '0145hjnp'],
        'e': ['bcfguvyz', 'prxz'],
        'w': ['0145hjnp', '028b']
    }
    
    def adjacent(gh: str, direction: str) -> str:
        """Get adjacent geohash in the specified direction."""
        if len(gh) == 0:
            return ""
        
        last_char = gh[-1]
        base = gh[:-1]
        
        if len(base) == 0:
            return ""
        
        if last_char in borders[direction][0]:
            base = adjacent(base, direction)
            if base == "":
                return ""
        
        char_index = base32.index(last_char)
        neighbor_chars = neighbors[direction][char_index % 2]
        return base + neighbor_chars[char_index // 2]
    
    affected_cells = set([geohash])
    
    # Get 4 levels of neighbors in each direction
    for level in range(1, 5):
        # North direction
        current = geohash
        for _ in range(level):
            current = adjacent(current, 'n')
            if current:
                affected_cells.add(current)
        
        # South direction
        current = geohash
        for _ in range(level):
            current = adjacent(current, 's')
            if current:
                affected_cells.add(current)
        
        # East direction
        current = geohash
        for _ in range(level):
            current = adjacent(current, 'e')
            if current:
                affected_cells.add(current)
        
        # West direction
        current = geohash
        for _ in range(level):
            current = adjacent(current, 'w')
            if current:
                affected_cells.add(current)
    
    return list(affected_cells)

def get_geohash_polygon_coords(geohash_list: List[str]) -> List[Tuple[float, float]]:
    """
    Create polygon coordinates that cover all the given geohash cells.
    Returns the convex hull of all geohash bounding boxes.
    
    Args:
        geohash_list: List of geohash strings
    
    Returns:
        List of (latitude, longitude) tuples forming a polygon
    """
    if not geohash_list:
        return []
    
    all_points = []
    
    # Get all corner points of all geohash cells
    for gh in geohash_list:
        min_lat, min_lon, max_lat, max_lon = get_geohash_bbox(gh)
        # Add all 4 corners of the bounding box
        all_points.extend([
            (min_lat, min_lon),
            (min_lat, max_lon),
            (max_lat, min_lon),
            (max_lat, max_lon)
        ])
    
    if len(all_points) < 3:
        return all_points
    
    # Simple convex hull algorithm (Graham scan)
    def cross_product(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    
    # Remove duplicates
    points = list(set(all_points))
    
    if len(points) < 3:
        return points
    
    # Sort points lexicographically
    points.sort()
    
    # Build lower hull
    lower = []
    for p in points:
        while len(lower) >= 2 and cross_product(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    
    # Build upper hull
    upper = []
    for p in reversed(points):
        while len(upper) >= 2 and cross_product(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    
    # Remove last point of each half because it's repeated
    return lower[:-1] + upper[:-1]

def create_issue_area_polygon(latitude: float, longitude: float, precision: int = 6) -> List[Tuple[float, float]]:
    """
    Create a polygon for an issue post that covers the affected area.
    Uses 4th level neighbors in all 4 directions.
    
    Args:
        latitude: Issue location latitude
        longitude: Issue location longitude
        precision: Geohash precision (default 6)
    
    Returns:
        List of (latitude, longitude) tuples forming a polygon
    """
    center_geohash = encode_geohash(latitude, longitude, precision)
    affected_geohashes = get_geohash_4th_level_neighbors(center_geohash)
    return get_geohash_polygon_coords(affected_geohashes) 

def create_unified_issue_polygon(coordinates: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
    """
    Create a unified polygon that directly connects issue coordinates.
    Creates a closed shape by connecting the actual issue points.
    
    Args:
        coordinates: List of (latitude, longitude) tuples
    
    Returns:
        List of (latitude, longitude) tuples forming a closed polygon
    """
    if not coordinates or len(coordinates) == 0:
        return []
    
    if len(coordinates) == 1:
        # Single point - create a small circle around it
        lat, lon = coordinates[0]
        buffer = 0.001  # approximately 100 meters
        return [
            (lat - buffer, lon - buffer),
            (lat - buffer, lon + buffer),
            (lat + buffer, lon + buffer),
            (lat + buffer, lon - buffer)
        ]
    
    if len(coordinates) == 2:
        # Two points - create a simple buffer around the line
        lat1, lon1 = coordinates[0]
        lat2, lon2 = coordinates[1]
        
        buffer = 0.0015  # approximately 150 meters
        
        # Create a rectangle connecting both points
        min_lat = min(lat1, lat2) - buffer
        max_lat = max(lat1, lat2) + buffer
        min_lon = min(lon1, lon2) - buffer
        max_lon = max(lon1, lon2) + buffer
        
        return [
            (min_lat, min_lon),
            (min_lat, max_lon),
            (max_lat, max_lon),
            (max_lat, min_lon)
        ]
    
    # Multiple points - directly connect them using convex hull
    points = [(lat, lon) for lat, lon in coordinates]
    
    # Remove duplicates
    unique_points = []
    seen = set()
    for point in points:
        # Round to avoid floating point precision issues
        rounded = (round(point[0], 6), round(point[1], 6))
        if rounded not in seen:
            seen.add(rounded)
            unique_points.append(point)
    
    points = unique_points
    
    if len(points) < 3:
        # Fallback for insufficient points
        lats = [p[0] for p in points]
        lons = [p[1] for p in points]
        
        buffer = 0.002
        min_lat, max_lat = min(lats) - buffer, max(lats) + buffer
        min_lon, max_lon = min(lons) - buffer, max(lons) + buffer
        
        return [
            (min_lat, min_lon),
            (min_lat, max_lon),
            (max_lat, max_lon),
            (max_lat, min_lon)
        ]
    
    # Convex hull algorithm to create closed shape
    def cross_product(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    
    # Sort points lexicographically
    points.sort()
    
    # Build lower hull
    lower = []
    for p in points:
        while len(lower) >= 2 and cross_product(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    
    # Build upper hull
    upper = []
    for p in reversed(points):
        while len(upper) >= 2 and cross_product(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    
    # Combine hulls (remove last point as it's repeated)
    hull = lower[:-1] + upper[:-1]
    
    # Ensure we have at least 3 points for a valid polygon
    if len(hull) < 3:
        # If convex hull fails, create a simple bounding polygon
        lats = [p[0] for p in coordinates]
        lons = [p[1] for p in coordinates]
        
        buffer = 0.001
        min_lat, max_lat = min(lats) - buffer, max(lats) + buffer
        min_lon, max_lon = min(lons) - buffer, max(lons) + buffer
        
        return [
            (min_lat, min_lon),
            (min_lat, max_lon),
            (max_lat, max_lon),
            (max_lat, min_lon)
        ]
    
    return hull 