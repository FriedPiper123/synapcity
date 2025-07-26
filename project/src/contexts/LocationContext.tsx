import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LocationData {
  latitude: number;
  longitude: number;
  locationName: string;
}

interface LocationContextType {
  currentLocation: LocationData | null;
  selectedLocation: LocationData | null;
  isLoading: boolean;
  error: string | null;
  setSelectedLocation: (location: LocationData) => void;
  getCurrentLocation: () => Promise<void>;
  pinCurrentLocation: () => Promise<void>;
  clearSelectedLocation: () => void;
  getLocationDisplayName: (location?: LocationData) => string;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [selectedLocation, setSelectedLocationState] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!navigator.geolocation) {
        setError('Geolocation is not supported by this browser');
        return;
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      // Fetch location name from Google Maps API
      const locationName = await fetchLocationName(position.coords.latitude, position.coords.longitude);

      const newLocation: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        locationName: locationName,
      };

      setCurrentLocation(newLocation);
      
      // If no location is selected, use current location as default
      if (!selectedLocation) {
        setSelectedLocationState(newLocation);
      }
    } catch (err) {
      console.error('Error getting current location:', err);
      setError('Failed to get current location');
    } finally {
      setIsLoading(false);
    }
  };

  const pinCurrentLocation = async () => {
    if (!currentLocation) {
      await getCurrentLocation();
    } else {
      setSelectedLocationState(currentLocation);
    }
  };

  const setSelectedLocation = async (location: LocationData) => {
    // Always fetch location name to ensure it's up to date
    const locationName = await fetchLocationName(location.latitude, location.longitude);
    setSelectedLocationState({ ...location, locationName });
  };

  const clearSelectedLocation = () => {
    setSelectedLocationState(currentLocation);
  };

  const getLocationDisplayName = (location?: LocationData): string => {
    const targetLocation = location || selectedLocation || currentLocation;
    if (!targetLocation) {
      return 'Current Location';
    }
    return targetLocation.locationName;
  };

  // Helper to fetch location name from Google Maps Geocoding API
  const fetchLocationName = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn('Google Maps API key not found, using coordinates as fallback');
        return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }

      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
      );
      
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          // Try to get a more specific location name
          const result = data.results[0];
          const addressComponents = result.address_components;
          
          // Look for locality (city) and administrative_area_level_1 (state/province)
          let city = '';
          let state = '';
          
          for (const component of addressComponents) {
            if (component.types.includes('locality')) {
              city = component.long_name;
            }
            if (component.types.includes('administrative_area_level_1')) {
              state = component.long_name;
            }
          }
          
          // Return city, state if available, otherwise use formatted address
          if (city && state) {
            return `${city}, ${state}`;
          } else if (city) {
            return city;
          } else {
            return result.formatted_address;
          }
        }
      }
    } catch (e) {
      console.error('Error fetching location name:', e);
    }
    
    // Fallback to coordinates if API fails
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  };

  // Get initial location on app start
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const value: LocationContextType = {
    currentLocation,
    selectedLocation,
    isLoading,
    error,
    setSelectedLocation,
    getCurrentLocation,
    pinCurrentLocation,
    clearSelectedLocation,
    getLocationDisplayName,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}; 