import math

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in kilometers.
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi/2)**2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c  # in kilometers


def insert_geo_location(gmaps_manager_obj, data):
    if isinstance(data, dict):
        lat = data.get('latitude')
        lon = data.get('longitude')
        if lat is not None and lon is not None:
            # Do reverse geocoding
            location_result = gmaps_manager_obj.get_state_from_coordinates(lat, lon)
            data['country'] = location_result[0]
            data['state'] = location_result[1]
            data['district'] = location_result[2]
        # Recurse into nested dicts
        for key, value in data.items():
            insert_geo_location(gmaps_manager_obj, value)