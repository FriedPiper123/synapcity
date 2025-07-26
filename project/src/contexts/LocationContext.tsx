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
  refreshLocationName: () => Promise<void>;
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
          timeout: 30000, // Increased timeout for better accuracy
          maximumAge: 0, // Don't use cached position, always get fresh coordinates
        });
      });
      
      console.log('came here.')
      console.log('Got geolocation position:', position);

      // Fetch location name from Google Maps API
      const locationName = await fetchLocationName(position.coords.latitude, position.coords.longitude);
      console.log('Fetched location name for current location:', locationName);

      const newLocation: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        locationName: locationName,
      };

      console.log('Setting current location:', newLocation);
      setCurrentLocation(newLocation);
      
      // If no location is selected, use current location as default
      if (!selectedLocation) {
        console.log('Setting selected location to current location');
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
    console.log('Fetched location name for selected location:', locationName);
    setSelectedLocationState({ ...location, locationName });
  };

  const clearSelectedLocation = () => {
    setSelectedLocationState(currentLocation);
  };

  const getLocationDisplayName = (location?: LocationData): string => {
    const targetLocation = location || selectedLocation || currentLocation;
    console.log('getLocationDisplayName - targetLocation:', targetLocation);
    if (!targetLocation) {
      console.log('getLocationDisplayName - no location found, returning default');
      return 'Current Location';
    }
    console.log('getLocationDisplayName - returning locationName:', targetLocation.locationName);
    return targetLocation.locationName;
  };

  const refreshLocationName = async () => {
    if (selectedLocation) {
      console.log('Refreshing location name for selected location');
      const newLocationName = await fetchLocationName(selectedLocation.latitude, selectedLocation.longitude);
      setSelectedLocationState({
        ...selectedLocation,
        locationName: newLocationName
      });
    }
  };

  // Helper to fetch location name from Google Maps Geocoding API
  const fetchLocationName = async (latitude: number, longitude: number): Promise<string> => {
    try {
      // Use a hardcoded API key for now (you should move this to environment variables)
      const apiKey = 'AIzaSyDTea-zPVH7xGr-FvmGZrm7WrqJdfCU9zo';
      
      console.log('Fetching location name for coordinates:', latitude, longitude);
      
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
      );
      
      if (res.ok) {
        const data = await res.json();
        console.log('Google Maps API response:', data);
        
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          // Try to get a more specific location name
          const result = data.results[0];
          const addressComponents = result.address_components;
          
          // Look for locality (city) and administrative_area_level_1 (state/province)
          let city = '';
          let state = '';
          let country = '';
          
          for (const component of addressComponents) {
            if (component.types.includes('locality')) {
              city = component.long_name;
            }
            if (component.types.includes('administrative_area_level_1')) {
              state = component.long_name;
            }
            if (component.types.includes('country')) {
              country = component.long_name;
            }
          }
          
          // Return city, state if available, otherwise use formatted address
          if (city && state) {
            const locationName = `${city}, ${state}`;
            console.log('Resolved location name:', locationName);
            return locationName;
          } else if (city) {
            console.log('Resolved location name:', city);
            return city;
          } else {
            console.log('Using formatted address:', result.formatted_address);
            return result.formatted_address;
          }
        } else {
          console.warn('Google Maps API returned no results or error:', data.status);
        }
      } else {
        console.error('Google Maps API request failed:', res.status);
      }
    } catch (e) {
      console.error('Error fetching location name:', e);
    }
    
    // Fallback to coordinates if API fails
    const fallbackName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    console.log('Using fallback location name:', fallbackName);
    return fallbackName;
  };

  // Get initial location on app start
  useEffect(() => {
    console.log('running here.')
    getCurrentLocation();
  }, []);

  // Monitor state changes for debugging
  useEffect(() => {
    console.log('LocationContext - currentLocation changed:', currentLocation);
  }, [currentLocation]);

  useEffect(() => {
    console.log('LocationContext - selectedLocation changed:', selectedLocation);
  }, [selectedLocation]);

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
    refreshLocationName,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}; 