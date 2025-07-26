import React from 'react';
import { useLocation } from '../contexts/LocationContext';

export const useLocationName = () => {
  const { getLocationDisplayName, selectedLocation, currentLocation, isLoading } = useLocation();

  const getLocationName = (latitude?: number, longitude?: number): string => {
    if (latitude && longitude) {
      // For specific coordinates, we'll use the context's function
      return getLocationDisplayName({
        latitude,
        longitude,
        locationName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      });
    }
    
    // For current/selected location
    return getLocationDisplayName();
  };

  const getCurrentLocationName = (): string => {
    const name = getLocationDisplayName(currentLocation || undefined);
    console.log('useLocationName - getCurrentLocationName:', name);
    return name;
  };

  const getSelectedLocationName = (): string => {
    const name = getLocationDisplayName(selectedLocation || undefined);
    console.log('useLocationName - getSelectedLocationName:', name);
    return name;
  };

  console.log('useLocationName - selectedLocation:', selectedLocation);
  console.log('useLocationName - currentLocation:', currentLocation);

  // Use useMemo to ensure reactive updates
  const currentLocationName = React.useMemo(() => getCurrentLocationName(), [currentLocation]);
  const selectedLocationName = React.useMemo(() => getSelectedLocationName(), [selectedLocation]);

  return {
    getLocationName,
    getCurrentLocationName,
    getSelectedLocationName,
    currentLocationName,
    selectedLocationName,
    isLoading,
    hasLocation: !!(selectedLocation || currentLocation)
  };
}; 