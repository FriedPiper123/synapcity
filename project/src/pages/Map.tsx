import { useEffect, useState, useRef } from 'react';
import { GoogleMap, Marker, Circle, useJsApiLoader } from '@react-google-maps/api';
import { apiFetch } from '../lib/api';
import { useLocation } from '../contexts/LocationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { DateTimePicker } from '@/components/DateTimePicker';
import { 
  MapPin, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Route, 
  Crosshair, 
  AlertCircle, 
  CheckCircle, 
  Calendar as CalendarIcon,
  TrendingUp,
  Users,
  Activity,
  BarChart3,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Loader2
} from 'lucide-react';

// Types
type Severity = 'high' | 'medium' | 'low';
type MapDataItem = {
  id: string;
  type: 'issue' | 'event' | 'resolved';
  title: string;
  severity: Severity;
  location: string;
  latitude: number;
  longitude: number;
  radius: number;
  content: string;
  authorId: string;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  status: string;
  category: string;
};

type Destination = { id: string; name: string };

// Route types
type RouteStep = {
  step: string;
  distance: string;
  duration: string;
  instruction: string;
};

type RouteData = {
  total_distance: string;
  total_duration: string;
  steps: RouteStep[];
  mode: string;
};

// Location presets
const LOCATION_PRESETS = [
  { name: 'Current Location', latitude: 12.9716, longitude: 77.5946 },
  { name: 'Koramangala', latitude: 12.9349, longitude: 77.6055 },
  { name: 'Indiranagar', latitude: 12.9789, longitude: 77.6416 },
  { name: 'Whitefield', latitude: 12.9699, longitude: 77.7499 },
  { name: 'Electronic City', latitude: 12.8458, longitude: 77.6658 },
  { name: 'HSR Layout', latitude: 12.9141, longitude: 77.6422 },
  { name: 'JP Nagar', latitude: 12.9069, longitude: 77.5858 },
  { name: 'Banashankari', latitude: 12.9245, longitude: 77.5575 },
  { name: 'Jayanagar', latitude: 12.9245, longitude: 77.5575 },
  { name: 'Malleswaram', latitude: 13.0067, longitude: 77.5707 },
  { name: 'Rajajinagar', latitude: 12.9914, longitude: 77.5511 },
  { name: 'Yeshwanthpur', latitude: 13.0222, longitude: 77.5568 },
  { name: 'Hebbal', latitude: 13.0507, longitude: 77.5908 },
  { name: 'Bellandur', latitude: 12.9349, longitude: 77.6954 },
  { name: 'Bannerghatta', latitude: 12.8000, longitude: 77.5767 },
  { name: 'MG Road', latitude: 12.9754, longitude: 77.6161 },
  { name: 'Commercial Street', latitude: 12.9754, longitude: 77.6161 },
  { name: 'Cubbon Park', latitude: 12.9762, longitude: 77.6033 },
  { name: 'Lalbagh', latitude: 12.9507, longitude: 77.5848 },
  { name: 'Bangalore Palace', latitude: 12.9980, longitude: 77.5925 },
  { name: 'Vidhana Soudha', latitude: 12.9791, longitude: 77.5913 },
  { name: 'Kempegowda International Airport', latitude: 13.1986, longitude: 77.7066 },
  { name: 'Bangalore City Railway Station', latitude: 12.9770, longitude: 77.5683 },
  { name: 'Phoenix MarketCity', latitude: 12.9349, longitude: 77.6055 },
  { name: 'Forum Koramangala', latitude: 12.9349, longitude: 77.6055 },
  { name: 'Manyata Tech Park', latitude: 13.0507, longitude: 77.5908 },
  { name: 'Embassy Tech Village', latitude: 12.9349, longitude: 77.6954 },
];

const destinations: Destination[] = [
  { id: 'dest1', name: 'City Mall' },
  { id: 'dest2', name: 'Hospital' },
  { id: 'dest3', name: 'Airport' },
  { id: 'dest4', name: 'University' },
  { id: 'dest5', name: 'Train Station' },
];

// Severity color mapping
const severityColors: Record<string, { bg: string; text: string }> = {
  high: { bg: '#fee2e2', text: '#b91c1c' },
  medium: { bg: '#fef9c3', text: '#b45309' },
  low: { bg: '#dcfce7', text: '#15803d' },
};

const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '70vh',
};

const center = {
  lat: 12.9716,
  lng: 77.5946,
};

export default function MapPage() {
  const [posts, setPosts] = useState<MapDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'issue' | 'event' | 'resolved'>('all');
  const [showSummary, setShowSummary] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MapDataItem | null>(null);
  const [showRoutePlanning, setShowRoutePlanning] = useState(false);
  
  // Enhanced route planning state
  const [routeStart, setRouteStart] = useState('');
  const [routeEnd, setRouteEnd] = useState('');
  const [routeDateTime, setRouteDateTime] = useState<Date | undefined>(undefined);
  const [routeMode, setRouteMode] = useState<'driving' | 'walking' | 'bicycling' | 'transit'>('driving');
  
  // Route API state
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [startCoordinates, setStartCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [endCoordinates, setEndCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  
  const [showLocationPresets, setShowLocationPresets] = useState(false);
  const [mapCenter, setMapCenter] = useState(center);
  const [mapZoom, setMapZoom] = useState(12);
  const { selectedLocation, getCurrentLocation } = useLocation();

  console.log('somethign ', import.meta.env)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: 'AIzaSyDTea-zPVH7xGr-FvmGZrm7WrqJdfCU9zo',
    libraries: ['places'],
  });

  useEffect(() => {
    fetchPosts();
  }, [selectedLocation]);

  // Set up map options for better live map experience
  const mapOptions = {
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: true,
    gestureHandling: 'cooperative',
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      },
      {
        featureType: 'transit',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ]
  };

  const onMapLoad = (map: google.maps.Map) => {
    // Enable map interactions
    map.setOptions({
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: true,
      fullscreenControl: true,
    });
  };

  const onMapClick = (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      console.log('Map clicked at:', lat, lng);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let res;
      
      if (selectedLocation) {
        res = await apiFetch(`http://0.0.0.0:8000/api/v1/posts/nearby?latitude=${selectedLocation.latitude}&longitude=${selectedLocation.longitude}&radius_km=5.0`);
      } else {
        res = await apiFetch('http://0.0.0.0:8000/api/v1/posts/?limit=100');
      }
      
      const data = await res.json();
      // Transform the data to match our MapDataItem interface
      const transformedData: MapDataItem[] = data?.map((post: any, index: number) => ({
        id: post.postId || `post-${index}`,
        type: post.type || 'issue',
        title: post.content?.substring(0, 50) + (post.content?.length > 50 ? '...' : '') || 'Untitled',
        severity: post.category === 'accident' || post.category === 'emergency' ? 'high' : 
                 post.category === 'infrastructure' ? 'medium' : 'low',
        location: post.location_name || post.neighborhood || 'Unknown Location',
        latitude: post.location?.latitude || 12.9716 + (Math.random() - 0.5) * 0.02,
        longitude: post.location?.longitude || 77.5946 + (Math.random() - 0.5) * 0.02,
        radius: Math.floor(Math.random() * (2000 - 500 + 1)) + 500,
        content: post.content || '',
        authorId: post.authorId || 'anonymous',
        createdAt: post.createdAt || new Date().toISOString(),
        upvotes: post.upvotes || 0,
        downvotes: post.downvotes || 0,
        commentCount: post.commentCount || 0,
        status: post.status || 'active',
        category: post.category || 'general'
      }));
      setPosts(transformedData);
    } catch (err) {
      setPosts([]);
    }
    setLoading(false);
  };

  // Enhanced route planning function
  const planRoute = async () => {
    if (!startCoordinates || !endCoordinates) {
      setRouteError('Please select both start and end locations');
      return;
    }

    setRouteLoading(true);
    setRouteError(null);

    try {
      const response = await apiFetch('http://0.0.0.0:8000/api/v1/location/route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin: {
            latitude: startCoordinates.lat,
            longitude: startCoordinates.lng
          },
          destination: {
            latitude: endCoordinates.lat,
            longitude: endCoordinates.lng
          },
          mode: routeMode
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch route');
      }

      const data = await response.json();
      setRouteData(data);
    } catch (error) {
      console.error('Error planning route:', error);
      setRouteError('Failed to plan route. Please try again.');
    } finally {
      setRouteLoading(false);
    }
  };

  const handleStartLocationSelect = (location: { lat: number; lng: number; name: string }) => {
    setStartCoordinates({ lat: location.lat, lng: location.lng });
  };

  const handleEndLocationSelect = (location: { lat: number; lng: number; name: string }) => {
    setEndCoordinates({ lat: location.lat, lng: location.lng });
  };

  const clearRoute = () => {
    setRouteStart('');
    setRouteEnd('');
    setRouteDateTime(undefined);
    setRouteData(null);
    setRouteError(null);
    setStartCoordinates(null);
    setEndCoordinates(null);
  };

  const filteredData = posts.filter(item => 
    selectedFilter === 'all' || item.type === selectedFilter
  );

  // Calculate summary statistics
  const summaryStats = {
    total: filteredData.length,
    issues: filteredData.filter(item => item.type === 'issue').length,
    events: filteredData.filter(item => item.type === 'event').length,
    resolved: filteredData.filter(item => item.type === 'resolved').length,
    highPriority: filteredData.filter(item => item.type === 'issue' && item.severity === 'high').length,
    avgRadius: filteredData.length > 0 ? Math.round(filteredData.reduce((sum, item) => sum + item.radius, 0) / filteredData.length) : 0,
    coverageArea: filteredData.length > 0 ? Math.round(filteredData.reduce((sum, item) => sum + (Math.PI * item.radius * item.radius), 0) / 1000000) : 0,
  };

  const getMarkerIcon = (type: string) => {
    switch (type) {
      case 'issue': return 'alert-circle';
      case 'event': return 'calendar';
      case 'resolved': return 'check-circle';
      default: return 'map-marker';
    }
  };

  const getMarkerColor = (type: string, severity: Severity) => {
    if (type === 'issue') {
      return severityColors[severity]?.text || '#b91c1c';
    }
    switch (type) {
      case 'event': return '#3b82f6';
      case 'resolved': return '#22c55e';
      default: return '#64748b';
    }
  };

  const getCircleColor = (type: string, severity: Severity) => {
    if (type === 'issue') {
      return severityColors[severity]?.text || '#b91c1c';
    }
    switch (type) {
      case 'event': return '#3b82f6';
      case 'resolved': return '#22c55e';
      default: return '#64748b';
    }
  };

  const getCircleFillColor = (type: string, severity: Severity) => {
    if (type === 'issue') {
      return severityColors[severity]?.bg || '#fee2e2';
    }
    switch (type) {
      case 'event': return '#dbeafe';
      case 'resolved': return '#dcfce7';
      default: return '#f1f5f9';
    }
  };

  const getRadiusDisplayText = (radius: number) => {
    if (radius < 1000) return `${radius}m`;
    return `${(radius / 1000).toFixed(1)}km`;
  };

  const getAreaInsight = () => {
    const highPriorityIssues = posts.filter(item => item.type === 'issue' && item.severity === 'high');
    if (highPriorityIssues.length > 0) {
      return `⚠️ ${highPriorityIssues.length} high-priority issues need attention`;
    }
    return '✅ Area looks good! No urgent issues reported.';
  };

  const handleMarkerClick = (marker: MapDataItem) => {
    setSelectedMarker(marker);
  };

  const handleLocationPresetSelect = (preset: any) => {
    setMapCenter({ lat: preset.latitude, lng: preset.longitude });
    setMapZoom(14);
  };

  const getLocationName = () => {
    if (selectedLocation) {
      return selectedLocation.locationName || 'Selected Location';
    }
    return 'Bangalore, India';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCurrentLocation = async () => {
    try {
      await getCurrentLocation();
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Map Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Map View</h1>
              <p className="text-gray-600">{getLocationName()}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCurrentLocation}
                className="flex items-center gap-2"
              >
                <Crosshair className="w-4 h-4" />
                Current Location
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRoutePlanning(!showRoutePlanning)}
                className="flex items-center gap-2"
              >
                <Route className="w-4 h-4" />
                {showRoutePlanning ? 'Hide' : 'Show'} Route Planning
              </Button>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={mapCenter}
            zoom={mapZoom}
            options={mapOptions}
            onLoad={onMapLoad}
            onClick={onMapClick}
          >
            {/* Location Presets */}
            {showLocationPresets && LOCATION_PRESETS.map((preset, index) => (
              <Marker
                key={index}
                position={{ lat: preset.latitude, lng: preset.longitude }}
                title={preset.name}
                onClick={() => handleLocationPresetSelect(preset)}
              />
            ))}

            {/* Route Markers */}
            {startCoordinates && (
              <Marker
                position={startCoordinates}
                title="Start Location"
                icon={{
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="8" fill="#22c55e" stroke="white" stroke-width="2"/>
                      <circle cx="12" cy="12" r="3" fill="white"/>
                    </svg>
                  `),
                  scaledSize: new google.maps.Size(24, 24),
                }}
              />
            )}

            {endCoordinates && (
              <Marker
                position={endCoordinates}
                title="End Location"
                icon={{
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="8" fill="#ef4444" stroke="white" stroke-width="2"/>
                      <circle cx="12" cy="12" r="3" fill="white"/>
                    </svg>
                  `),
                  scaledSize: new google.maps.Size(24, 24),
                }}
              />
            )}

            {/* Post Markers */}
            {filteredData.map((item) => (
              <div key={item.id}>
                <Marker
                  position={{ lat: item.latitude, lng: item.longitude }}
                  title={item.title}
                  onClick={() => handleMarkerClick(item)}
                  icon={{
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="8" fill="${getMarkerColor(item.type, item.severity)}" stroke="white" stroke-width="2"/>
                        <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${getMarkerIcon(item.type).charAt(0).toUpperCase()}</text>
                      </svg>
                    `),
                    scaledSize: new google.maps.Size(24, 24),
                  }}
                />
                <Circle
                  center={{ lat: item.latitude, lng: item.longitude }}
                  radius={item.radius}
                  options={{
                    fillColor: getCircleFillColor(item.type, item.severity),
                    fillOpacity: 0.3,
                    strokeColor: getCircleColor(item.type, item.severity),
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                  }}
                />
              </div>
            ))}
          </GoogleMap>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Route Planning */}
          {showRoutePlanning && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="w-5 h-5" />
                  Route Planning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <LocationAutocomplete
                  label="Start Location"
                  placeholder="Enter start location"
                  value={routeStart}
                  onChange={setRouteStart}
                  onLocationSelect={handleStartLocationSelect}
                />
                
                <LocationAutocomplete
                  label="Destination"
                  placeholder="Enter destination"
                  value={routeEnd}
                  onChange={setRouteEnd}
                  onLocationSelect={handleEndLocationSelect}
                />

                <DateTimePicker
                  label="Departure Time"
                  placeholder="When do you want to leave?"
                  date={routeDateTime}
                  onDateChange={setRouteDateTime}
                />

                <div>
                  <Label>Travel Mode</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {(['driving', 'walking', 'bicycling', 'transit'] as const).map((mode) => (
                      <Button
                        key={mode}
                        variant={routeMode === mode ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRouteMode(mode)}
                        className="capitalize"
                      >
                        {mode}
                      </Button>
                    ))}
                  </div>
                </div>

                {routeError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600 text-sm">{routeError}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    onClick={planRoute}
                    disabled={routeLoading || !startCoordinates || !endCoordinates}
                  >
                    {routeLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Planning...
                      </>
                    ) : (
                      <>
                        <Route className="w-4 h-4 mr-2" />
                        Plan Route
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={clearRoute}
                    disabled={routeLoading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Route Results */}
                {routeData && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <h4 className="font-medium text-blue-900 mb-2">Route Found</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p><strong>Distance:</strong> {routeData.total_distance}</p>
                      <p><strong>Duration:</strong> {routeData.total_duration}</p>
                      <p><strong>Mode:</strong> {routeData.mode}</p>
                    </div>
                    {routeData.steps && routeData.steps.length > 0 && (
                      <div className="mt-3">
                        <h5 className="font-medium text-blue-900 mb-2">Directions:</h5>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {routeData.steps.slice(0, 5).map((step, index) => (
                            <div key={index} className="text-xs text-blue-700">
                              {index + 1}. {step.instruction}
                            </div>
                          ))}
                          {routeData.steps.length > 5 && (
                            <div className="text-xs text-blue-600 italic">
                              ... and {routeData.steps.length - 5} more steps
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={selectedFilter === 'all' ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => setSelectedFilter('all')}
                >
                  All ({posts.length})
                </Badge>
                <Badge
                  variant={selectedFilter === 'issue' ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => setSelectedFilter('issue')}
                >
                  Issues ({posts.filter(item => item.type === 'issue').length})
                </Badge>
                <Badge
                  variant={selectedFilter === 'event' ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => setSelectedFilter('event')}
                >
                  Events ({posts.filter(item => item.type === 'event').length})
                </Badge>
                <Badge
                  variant={selectedFilter === 'resolved' ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => setSelectedFilter('resolved')}
                >
                  Resolved ({posts.filter(item => item.type === 'resolved').length})
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Summary Toggle */}
          <Card>
            <CardHeader>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Area Summary
                    </CardTitle>
                    {showSummary ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{summaryStats.total}</div>
                        <div className="text-sm text-gray-600">Total Posts</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{summaryStats.highPriority}</div>
                        <div className="text-sm text-gray-600">High Priority</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{summaryStats.resolved}</div>
                        <div className="text-sm text-gray-600">Resolved</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{summaryStats.coverageArea}</div>
                        <div className="text-sm text-gray-600">Coverage (km²)</div>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-700">{getAreaInsight()}</p>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </CardHeader>
          </Card>

          {/* Selected Marker Details */}
          {selectedMarker && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {selectedMarker.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor: severityColors[selectedMarker.severity]?.bg,
                        color: severityColors[selectedMarker.severity]?.text,
                      }}
                    >
                      {selectedMarker.type}
                    </Badge>
                    <Badge variant="outline">{selectedMarker.category}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{selectedMarker.content}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>📍 {selectedMarker.location}</span>
                    <span>📅 {formatDate(selectedMarker.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>👍 {selectedMarker.upvotes}</span>
                    <span>👎 {selectedMarker.downvotes}</span>
                    <span>💬 {selectedMarker.commentCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 