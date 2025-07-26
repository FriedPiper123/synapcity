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
    return getLocationDisplayName(currentLocation || undefined);
  };

  const getSelectedLocationName = (): string => {
    return getLocationDisplayName(selectedLocation || undefined);
  };

  return {
    getLocationName,
    getCurrentLocationName,
    getSelectedLocationName,
    currentLocationName: getCurrentLocationName(),
    selectedLocationName: getSelectedLocationName(),
    isLoading,
    hasLocation: !!(selectedLocation || currentLocation)
  };
}; 