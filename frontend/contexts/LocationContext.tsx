import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

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

// Add your Google Maps Geocoding API key here
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [selectedLocation, setSelectedLocationState] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        Alert.alert('Permission Denied', 'Location permission is required for this app to work properly.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Fetch location name from Google Maps API
      const locationName = await fetchLocationName(location.coords.latitude, location.coords.longitude);

      const newLocation: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
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
      Alert.alert('Location Error', 'Could not get your current location. Some features may not work properly.');
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
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
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