import googlemaps

class GoogleMapsManager:
  def __init__(self, api_key):
    self.gmaps = googlemaps.Client(key=api_key)

  def get_state_from_coordinates(self, lat, lon):
      result = self.gmaps.reverse_geocode((lat, lon))
      country = None
      state = None
      district = None
      for component in result[0]["address_components"]:
          if "administrative_area_level_1" in component["types"]:
              state =  component['long_name']  # e.g., "Karnataka"
          if "administrative_area_level_2" in component["types"] or "administrative_area_level_3" in component["types"]:
              district = component['long_name']  # e.g., "Bengaluru"
          if "country" in component["types"]:
              country = component['long_name']

      return country, state, district

  def get_route(self, origin_lat, origin_lng, dest_lat, dest_lng, mode="driving"):
      origin = (origin_lat, origin_lng)
      destination = (dest_lat, dest_lng)
      directions_result = self.gmaps.directions(origin, destination, mode=mode)
      return directions_result