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