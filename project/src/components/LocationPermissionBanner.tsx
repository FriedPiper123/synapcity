import React from 'react';
import { useLocation } from '../contexts/LocationContext';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { MapPin, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

export const LocationPermissionBanner: React.FC = () => {
  const { 
    currentLocation, 
    isLoading, 
    error, 
    requestLocationPermission,
    isWatching 
  } = useLocation();

  // Don't show banner if we have a location and no error
  if (currentLocation && !error && !isLoading) {
    return null;
  }

  const getStatusIcon = () => {
    if (isLoading) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    if (error) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (currentLocation) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <MapPin className="h-4 w-4" />;
  };

  const getStatusMessage = () => {
    if (isLoading && isWatching) {
      return "Getting your location for better experience...";
    }
    if (isLoading) {
      return "Requesting location permission...";
    }
    if (error) {
      return error;
    }
    if (!currentLocation) {
      return "Location access needed for better local content";
    }
    return "Location detected";
  };

  const getAlertVariant = () => {
    if (error && error.includes('denied')) {
      return 'destructive';
    }
    return 'default';
  };

  return (
    <Alert className={`mb-4 ${getAlertVariant() === 'destructive' ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <AlertDescription className="flex-1">
          {getStatusMessage()}
          {currentLocation && (
            <span className="ml-2 text-xs text-gray-600">
              (Accuracy: {currentLocation.accuracy ? `${Math.round(currentLocation.accuracy)}m` : 'Unknown'})
            </span>
          )}
        </AlertDescription>
        {(error || !currentLocation) && (
          <Button 
            onClick={requestLocationPermission}
            disabled={isLoading}
            size="sm"
            variant="outline"
            className="ml-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Getting...
              </>
            ) : (
              <>
                <MapPin className="h-3 w-3 mr-1" />
                Allow Location
              </>
            )}
          </Button>
        )}
      </div>
    </Alert>
  );
}; 