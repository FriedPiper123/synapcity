import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LocationData {
  latitude: number;
  longitude: number;
  locationName?: string;
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
    // Fetch location name if not present
    let locationName = location.locationName;
    if (!locationName) {
      locationName = await fetchLocationName(location.latitude, location.longitude);
    }
    setSelectedLocationState({ ...location, locationName });
  };

  const clearSelectedLocation = () => {
    setSelectedLocationState(currentLocation);
  };

  // Helper to fetch location name from Google Maps Geocoding API
  const fetchLocationName = async (latitude: number, longitude: number) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          return data.results[0].formatted_address;
        }
      }
    } catch (e) {
      // Ignore errors, fallback to coordinates
    }
    return undefined;
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
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}; 