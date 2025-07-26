import { useEffect, useState, useRef } from 'react';
import { GoogleMap, Marker, Circle, useJsApiLoader, Polyline } from '@react-google-maps/api';
import { apiFetch } from '../lib/api';
import { useLocation } from '../contexts/LocationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  Loader2,
  Navigation,
  Clock as ClockIcon,
  AlertTriangle,
  Info,
  Zap,
  Shield,
  Car,
  Bus,
  Train
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

// Location presets
const LOCATION_PRESETS = [
  { name: 'Current Location', latitude: 28.6139, longitude: 77.2090 },
  { name: 'Downtown Delhi', latitude: 28.6139, longitude: 77.2090 },
  { name: 'Connaught Place', latitude: 28.6315, longitude: 77.2167 },
  { name: 'Khan Market', latitude: 28.6001, longitude: 77.2276 },
  { name: 'Lajpat Nagar', latitude: 28.5671, longitude: 77.2431 },
  { name: 'Hauz Khas', latitude: 28.5478, longitude: 77.2014 },
  { name: 'South Extension', latitude: 28.5671, longitude: 77.2431 },
  { name: 'Greater Kailash', latitude: 28.5478, longitude: 77.2014 },
];

// Severity color mapping
const severityColors: Record<string, { bg: string; text: string }> = {
  high: { bg: '#fee2e2', text: '#b91c1c' },
  medium: { bg: '#fef9c3', text: '#b45309' },
  low: { bg: '#dcfce7', text: '#15803d' },
};

// Route status colors
const routeStatusColors = {
  blocked: { bg: '#fee2e2', text: '#b91c1c', icon: AlertTriangle },
  heavy: { bg: '#fef3c7', text: '#d97706', icon: AlertCircle },
  moderate: { bg: '#fef9c3', text: '#b45309', icon: Info },
  clear: { bg: '#dcfce7', text: '#15803d', icon: CheckCircle },
};

const containerStyle = {
  width: '100%',
  height: '70vh',
};

const center = {
  lat: 28.6139,
  lng: 77.2090,
};

export default function MapPage() {
  const [posts, setPosts] = useState<MapDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'issue' | 'event' | 'resolved'>('all');
  const [showSummary, setShowSummary] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MapDataItem | null>(null);
  const [showRoutePlanning, setShowRoutePlanning] = useState(false);
  const [routeStart, setRouteStart] = useState('');
  const [routeEnd, setRouteEnd] = useState('');
  const [routeDateTime, setRouteDateTime] = useState<string>(() => {
    // Default to now, rounded to next 5 minutes
    const now = new Date();
    now.setSeconds(0, 0);
    now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5);
    return now.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm
  });
  const [dateTimeError, setDateTimeError] = useState<string | null>(null);
  const [showLocationPresets, setShowLocationPresets] = useState(false);
  const [mapCenter, setMapCenter] = useState(center);
  const [mapZoom, setMapZoom] = useState(12);
  
  // Enhanced UI state for autocomplete
  const [startAutocompleteQuery, setStartAutocompleteQuery] = useState('');
  const [endAutocompleteQuery, setEndAutocompleteQuery] = useState('');
  const [autocompleteResults, setAutocompleteResults] = useState<any[]>([]);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [activeInput, setActiveInput] = useState<'start' | 'end' | null>(null);
  
  // Route planning state
  const [routePlanning, setRoutePlanning] = useState(false);
  const [routeResults, setRouteResults] = useState<any>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  
  const { selectedLocation, getCurrentLocation } = useLocation();

  // Refs for input focus
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: 'AIzaSyDTea-zPVH7xGr-FvmGZrm7WrqJdfCU9zo',
  });

  // Debounced autocomplete search for start input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (startAutocompleteQuery.length >= 2 && activeInput === 'start') {
        fetchAutocompleteResults(startAutocompleteQuery);
      } else if (activeInput === 'start') {
        setAutocompleteResults([]);
        setShowAutocomplete(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [startAutocompleteQuery, activeInput]);

  // Debounced autocomplete search for end input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (endAutocompleteQuery.length >= 2 && activeInput === 'end') {
        fetchAutocompleteResults(endAutocompleteQuery);
      } else if (activeInput === 'end') {
        setAutocompleteResults([]);
        setShowAutocomplete(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [endAutocompleteQuery, activeInput]);

  // Clear route results when inputs change
  useEffect(() => {
    if (routeResults || routeError) {
      setRouteResults(null);
      setRouteError(null);
    }
  }, [routeStart, routeEnd]);

  const fetchAutocompleteResults = async (query: string) => {
    try {
      setAutocompleteLoading(true);
      
      const response = await fetch(`http://0.0.0.0:8000/api/v1/routes/autocomplete?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAutocompleteResults(data.predictions || []);
        setShowAutocomplete(true);
      } else {
        setAutocompleteResults([]);
      }
    } catch (error) {
      console.error('Error fetching autocomplete results:', error);
      setAutocompleteResults([]);
    } finally {
      setAutocompleteLoading(false);
    }
  };

  const handleLocationSelect = (prediction: any) => {
    const locationText = prediction.description;
    
    if (activeInput === 'start') {
      setRouteStart(locationText);
      setStartAutocompleteQuery(locationText);
    } else if (activeInput === 'end') {
      setRouteEnd(locationText);
      setEndAutocompleteQuery(locationText);
    }
    
    setShowAutocomplete(false);
    setAutocompleteResults([]);
    setActiveInput(null);
  };

  const handleInputFocus = (inputType: 'start' | 'end') => {
    setActiveInput(inputType);
    setShowAutocomplete(true);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setShowAutocomplete(false);
      setActiveInput(null);
    }, 200);
  };

  const handlePlanRoute = async () => {
    setDateTimeError(null);
    
    if (!routeStart || !routeEnd) {
      setRouteError('Please enter both start and end locations');
      return;
    }

    if (!routeDateTime) {
      setDateTimeError('Please select a date and time');
      return;
    }
    const selectedDate = new Date(routeDateTime);
    if (selectedDate.getTime() < Date.now() - 60000) {
      setDateTimeError('Please select a present or future date/time');
      return;
    }

    try {
      setRoutePlanning(true);
      setRouteError(null);
      
      let departureTime = selectedDate.getTime();

      const response = await fetch('http://0.0.0.0:8000/api/v1/routes/best-route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin: routeStart,
          destination: routeEnd,
          departure_time: departureTime
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRouteResults(data);
        // Auto-select the best route
        if (data.best_route_id !== null) {
          const bestRouteIndex = data.routes.findIndex((route: any) => route.route_id === data.best_route_id);
          setSelectedRouteIndex(bestRouteIndex >= 0 ? bestRouteIndex : 0);
        }
      } else {
        const errorData = await response.json();
        setRouteError(errorData.detail || 'Failed to plan route');
      }
    } catch (error) {
      console.error('Error planning route:', error);
      setRouteError('Failed to plan route. Please try again.');
    } finally {
      setRoutePlanning(false);
    }
  };

  const getRouteStatusIcon = (status: string) => {
    const statusConfig = routeStatusColors[status as keyof typeof routeStatusColors] || routeStatusColors.clear;
    const IconComponent = statusConfig.icon;
    return <IconComponent className="w-4 h-4" style={{ color: statusConfig.text }} />;
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'avoid': return 'text-red-600 bg-red-50 border-red-200';
      case 'caution': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'proceed': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDelay = (delay: number) => {
    if (delay === 0) return 'No delay';
    if (delay < 15) return `${delay} min delay`;
    if (delay < 45) return `${delay} min delay`;
    return `${delay} min delay`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Generate polyline data for routes
  const generateRoutePolyline = (route: any) => {
    if (route.polyline && route.polyline.length > 0) {
      return route.polyline;
    }
    
    // Generate realistic polyline data with multiple waypoints
    // This simulates actual route coordinates
    const baseRoute = [
      { lat: 12.9716, lng: 77.5946 }, // Bangalore center
      { lat: 12.9789, lng: 77.6408 }, // Indiranagar
      { lat: 13.0067, lng: 77.5617 }, // Malleshwaram
      { lat: 13.0507, lng: 77.5877 }, // Hebbal
      { lat: 13.1986, lng: 77.7066 }  // Airport
    ];
    
    // Add some variation based on route ID
    if (route.route_id === 1) {
      return [
        { lat: 12.9716, lng: 77.5946 }, // Bangalore center
        { lat: 12.9352, lng: 77.6245 }, // Koramangala
        { lat: 12.9141, lng: 77.6387 }, // HSR Layout
        { lat: 12.9716, lng: 77.5946 }, // Bellandur
        { lat: 13.1986, lng: 77.7066 }  // Airport
      ];
    } else if (route.route_id === 2) {
      return [
        { lat: 12.9716, lng: 77.5946 }, // Bangalore center
        { lat: 12.9245, lng: 77.5877 }, // Jayanagar
        { lat: 12.9141, lng: 77.6387 }, // JP Nagar
        { lat: 12.8458, lng: 77.6658 }, // Electronic City
        { lat: 13.1986, lng: 77.7066 }  // Airport
      ];
    }
    
    return baseRoute;
  };

  useEffect(() => {
    fetchPosts();
  }, [selectedLocation]);

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
      const transformedData: MapDataItem[] = data?.map((post: any, index: number) => ({
        id: post.postId || `post-${index}`,
        type: post.type || 'issue',
        title: post.content?.substring(0, 50) + (post.content?.length > 50 ? '...' : '') || 'Untitled',
        severity: post.category === 'accident' || post.category === 'emergency' ? 'high' : 
                 post.category === 'infrastructure' ? 'medium' : 'low',
        location: post.location_name || post.neighborhood || 'Unknown Location',
        latitude: post.location?.latitude || 28.6139 + (Math.random() - 0.5) * 0.02,
        longitude: post.location?.longitude || 77.2090 + (Math.random() - 0.5) * 0.02,
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
    switch (type) {
      case 'issue': return severityColors[severity]?.bg + '80' || '#fee2e280';
      case 'event': return '#dbeafe80';
      case 'resolved': return '#dcfce780';
      default: return '#f3f4f680';
    }
  };

  const getRadiusDisplayText = (radius: number) => {
    if (radius >= 1000) {
      return `${(radius / 1000).toFixed(1)}km coverage radius`;
    } else {
      return `${radius}m coverage radius`;
    }
  };

  const getAreaInsight = () => {
    if (summaryStats.total === 0) return "No data available for this area. Start posting to see insights here.";
    
    const insights = [];
    
    if (summaryStats.highPriority > 0) {
      insights.push(`${summaryStats.highPriority} high-priority issues need immediate attention.`);
    }
    
    if (summaryStats.events > 0) {
      insights.push(`${summaryStats.events} community events are scheduled.`);
    }
    
    if (summaryStats.resolved > 0) {
      insights.push(`${summaryStats.resolved} issues have been successfully resolved.`);
    }
    
    insights.push(`Average coverage radius: ${summaryStats.avgRadius}m`);
    insights.push(`Total coverage area: ~${summaryStats.coverageArea} km²`);
    
    return insights.join(' ');
  };

  const handleMarkerClick = (marker: MapDataItem) => {
    setSelectedMarker(marker);
  };

  const handleLocationPresetSelect = (preset: any) => {
    setMapCenter({ lat: preset.latitude, lng: preset.longitude });
    setMapZoom(14);
    setShowLocationPresets(false);
  };

  const getLocationName = () => {
    if (selectedLocation?.locationName) {
      return selectedLocation.locationName;
    }
    return selectedLocation ? `${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}` : 'Current Location';
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown date';
    }
  };

  const handleCurrentLocation = async () => {
    try {
      await getCurrentLocation();
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">City Map</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLocationPresets(!showLocationPresets)}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Location Presets
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCurrentLocation}
            >
              <Crosshair className="w-4 h-4 mr-2" />
              Current Location
            </Button>
          </div>
        </div>

        {/* Location Presets */}
        {showLocationPresets && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {LOCATION_PRESETS.map((preset, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleLocationPresetSelect(preset)}
                    className="text-left justify-start"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    {preset.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Map Container */}
        <div className="space-y-4">
          {/* Map */}
          <Card className="shadow-lg">
            <CardContent className="p-0">
              {loading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading map...</p>
                  </div>
                </div>
              )}
              
              {isLoaded && (
                <div className="relative">
                  <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={mapCenter}
                    zoom={mapZoom}
                    onCenterChanged={() => {}}
                    onZoomChanged={() => {}}
                  >
                    {/* User's selected location marker */}
                    {selectedLocation && (
                      <Marker
                        position={{ lat: selectedLocation.latitude, lng: selectedLocation.longitude }}
                        title="Your Location"
                        icon={{
                          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="8" fill="#3b82f6" stroke="white" stroke-width="2"/>
                              <circle cx="12" cy="12" r="3" fill="white"/>
                            </svg>
                          `),
                          scaledSize: new google.maps.Size(24, 24),
                        }}
                      />
                    )}

                    {/* Render markers */}
                    {filteredData.map((item) => (
                      <div key={item.id}>
                        <Marker
                          position={{ lat: item.latitude, lng: item.longitude }}
                          title={item.title}
                          onClick={() => handleMarkerClick(item)}
                          icon={{
                            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" fill="white" stroke="${getMarkerColor(item.type, item.severity)}" stroke-width="2"/>
                                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="${getMarkerColor(item.type, item.severity)}"/>
                              </svg>
                            `),
                            scaledSize: new google.maps.Size(24, 24),
                          }}
                        />
                        <Circle
                          center={{ lat: item.latitude, lng: item.longitude }}
                          radius={item.radius}
                          options={{
                            strokeColor: getCircleColor(item.type, item.severity),
                            strokeWeight: 2,
                            fillColor: getCircleFillColor(item.type, item.severity),
                            fillOpacity: 0.3,
                          }}
                        />
                      </div>
                    ))}
                    {/* Draw the selected route polyline if available */}
                    {selectedRouteIndex !== null && routeResults && routeResults.routes[selectedRouteIndex] && (
                      <Polyline
                        path={generateRoutePolyline(routeResults.routes[selectedRouteIndex])}
                        options={{ 
                          strokeColor: '#2563eb', 
                          strokeWeight: 5, 
                          strokeOpacity: 0.8,
                          geodesic: true
                        }}
                      />
                    )}
                    
                    {/* Draw all route polylines with different colors */}
                    {routeResults && routeResults.routes && routeResults.routes.map((route: any, idx: number) => {
                      const isSelected = selectedRouteIndex === idx;
                      const isRecommended = routeResults.summary?.recommended_route_id === route.route_id || 
                                           routeResults.best_route_id === route.route_id;
                      
                      const polylineData = generateRoutePolyline(route);
                      if (!polylineData || polylineData.length === 0) return null;
                      
                      return (
                        <Polyline
                          key={`route-${route.route_id}`}
                          path={polylineData}
                          options={{ 
                            strokeColor: isSelected ? '#2563eb' : (isRecommended ? '#10b981' : '#6b7280'),
                            strokeWeight: isSelected ? 5 : 3,
                            strokeOpacity: isSelected ? 0.8 : 0.6,
                            geodesic: true
                          }}
                        />
                      );
                    })}
                  </GoogleMap>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Route Planning Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="w-5 h-5" />
                Route Planning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Label htmlFor="start">Start Location</Label>
                  <div className="relative">
                    <Input
                      ref={startInputRef}
                      id="start"
                      placeholder="Enter start location"
                      value={routeStart}
                      onChange={(e) => {
                        setRouteStart(e.target.value);
                        setStartAutocompleteQuery(e.target.value);
                      }}
                      onFocus={() => handleInputFocus('start')}
                      onBlur={handleInputBlur}
                      className="pr-8"
                    />
                    {autocompleteLoading && activeInput === 'start' && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                    )}
                  </div>
                  
                  {/* Autocomplete Results for Start */}
                  {showAutocomplete && activeInput === 'start' && autocompleteResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                      {autocompleteResults.map((prediction, index) => (
                        <button
                          key={prediction.place_id}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-2"
                          onClick={() => handleLocationSelect(prediction)}
                        >
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{prediction.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <Label htmlFor="end">End Location</Label>
                  <div className="relative">
                    <Input
                      ref={endInputRef}
                      id="end"
                      placeholder="Enter destination"
                      value={routeEnd}
                      onChange={(e) => {
                        setRouteEnd(e.target.value);
                        setEndAutocompleteQuery(e.target.value);
                      }}
                      onFocus={() => handleInputFocus('end')}
                      onBlur={handleInputBlur}
                      className="pr-8"
                    />
                    {autocompleteLoading && activeInput === 'end' && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                    )}
                  </div>
                  
                  {/* Autocomplete Results for End */}
                  {showAutocomplete && activeInput === 'end' && autocompleteResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                      {autocompleteResults.map((prediction, index) => (
                        <button
                          key={prediction.place_id}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-2"
                          onClick={() => handleLocationSelect(prediction)}
                        >
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{prediction.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Enhanced Date/Time Picker */}
                <div>
                  <Label htmlFor="route-datetime">Date & Time</Label>
                  <Input
                    id="route-datetime"
                    type="datetime-local"
                    min={new Date().toISOString().slice(0, 16)}
                    value={routeDateTime}
                    onChange={e => {
                      setRouteDateTime(e.target.value);
                      setDateTimeError(null);
                    }}
                    className="w-full"
                  />
                  {dateTimeError && (
                    <div className="text-xs text-red-600 mt-1">{dateTimeError}</div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label className="text-sm font-medium mb-2">Actions</Label>
                  <Button 
                    className="w-full" 
                    onClick={handlePlanRoute}
                    disabled={routePlanning}
                  >
                    {routePlanning ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Planning Route...
                      </>
                    ) : (
                      <>
                        <Route className="w-4 h-4 mr-2" />
                        Plan Route
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Route Error Display */}
              {routeError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-700">{routeError}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enhanced Route Results Display */}
          {routeResults && (
            <div className="space-y-4">
              {/* Overall Summary */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-blue-700">Route Analysis Complete</span>
                </div>
                <p className="text-sm text-blue-600">{routeResults.summary?.overall_summary || routeResults.overall_summary}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-blue-600">
                  <span>📊 {routeResults.summary?.total_routes_found || routeResults.total_routes} routes analyzed</span>
                  <span>⚡ {routeResults.response_time_ms}ms</span>
                </div>
                
                {/* Enhanced Analysis Metadata */}
                {routeResults.metadata?.data_sources && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="text-xs text-blue-700 mb-1">
                      <span className="font-medium">Data Sources:</span> {routeResults.metadata.data_sources.join(', ')}
                    </div>
                    {routeResults.metadata.overall_reliability && (
                      <div className="text-xs text-blue-700">
                        <span className="font-medium">Reliability:</span> {(routeResults.metadata.overall_reliability * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Horizontal Route Cards */}
              {routeResults.routes && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800">Route Options</h4>
                  
                  {/* Horizontal Scrollable Route Cards */}
                  <div className="overflow-x-auto">
                    <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
                      {routeResults.routes.map((route: any, idx: number) => {
                        const isRecommended = routeResults.summary?.recommended_route_id === route.route_id || 
                                             routeResults.best_route_id === route.route_id;
                        const isSelected = selectedRouteIndex === idx;
                        const statusConfig = routeStatusColors[route.recommendation?.status || route.overall_status || 'clear'] || routeStatusColors.clear;
                        
                        return (
                          <div
                            key={route.route_id}
                            className={`border rounded-lg p-4 cursor-pointer transition-all min-w-[300px] max-w-[350px] ${
                              isRecommended ? 'border-green-600 bg-green-50' : 'border-gray-200'
                            } ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                            onClick={() => {
                              setSelectedRouteIndex(idx);
                              setSelectedRoute(route);
                            }}
                          >
                            {/* Route Header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">{route.route_name || `Route ${idx + 1}`}</span>
                                {isRecommended && (
                                  <Badge className="bg-green-600 text-white text-xs">Recommended</Badge>
                                )}
                                {isSelected && (
                                  <Badge className="bg-blue-600 text-white text-xs">Selected</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {getRouteStatusIcon(route.recommendation?.status || route.overall_status)}
                                <span className="text-sm font-medium" style={{ color: statusConfig.text }}>
                                  {(route.recommendation?.status || route.overall_status || 'clear').toUpperCase()}
                                </span>
                              </div>
                            </div>

                            {/* Route Details */}
                            <div className="space-y-2 mb-3">
                              <div className="flex items-center gap-2">
                                <ClockIcon className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">
                                  <span className="font-medium">Duration:</span> {route.summary?.current_duration || formatDelay(route.total_estimated_delay)}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">
                                  <span className="font-medium">Recommendation:</span> 
                                  <Badge className={`ml-1 text-xs ${getRecommendationColor(route.recommendation?.status || route.recommendation)}`}>
                                    {(route.recommendation?.status || route.recommendation || 'proceed').toUpperCase()}
                                  </Badge>
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">
                                  <span className="font-medium">Confidence:</span> 
                                  <span className={`ml-1 ${getConfidenceColor(route.summary?.confidence_score || route.confidence_score)}`}>
                                    {((route.summary?.confidence_score || route.confidence_score) * 100).toFixed(0)}%
                                  </span>
                                </span>
                              </div>
                            </div>

                            {/* Route Summary */}
                            <div className="text-sm text-gray-600 mb-3">
                              {route.summary?.traffic_impact || route.summary}
                            </div>

                            {/* Route Segments Preview */}
                            {route.route_segments && route.route_segments.length > 0 && (
                              <div className="space-y-2">
                                <h5 className="text-xs font-medium text-gray-700">Route Segments:</h5>
                                {route.route_segments.slice(0, 2).map((segment: any, segmentIdx: number) => (
                                  <div key={segmentIdx} className="text-xs bg-gray-50 p-2 rounded">
                                    <div className="flex items-center gap-1 mb-1">
                                      {getRouteStatusIcon(segment.traffic_status)}
                                      <span className="font-medium">{segment.segment_id}</span>
                                    </div>
                                    <div className="text-gray-600">
                                      {segment.duration} • {segment.distance}
                                    </div>
                                  </div>
                                ))}
                                {route.route_segments.length > 2 && (
                                  <div className="text-xs text-gray-500 text-center">
                                    +{route.route_segments.length - 2} more segments
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Legacy Route Groups */}
                            {route.groups && route.groups.length > 0 && (
                              <div className="space-y-2">
                                <h5 className="text-xs font-medium text-gray-700">Route Segments:</h5>
                                {route.groups.slice(0, 2).map((group: any, groupIdx: number) => (
                                  <div key={groupIdx} className="text-xs bg-gray-50 p-2 rounded">
                                    <div className="flex items-center gap-1 mb-1">
                                      {getRouteStatusIcon(group.overall_status)}
                                      <span className="font-medium">{group.group_id}</span>
                                    </div>
                                    <div className="text-gray-600">
                                      {group.summary}
                                    </div>
                                    
                                    {/* Enhanced Group Details */}
                                    {group.traffic_analysis && (
                                      <div className="mt-2 space-y-1">
                                        <div className="flex items-center gap-1">
                                          <TrendingUp className="w-3 h-3 text-blue-500" />
                                          <span className="text-blue-600">
                                            {group.traffic_analysis.speed_reduction_percent}% speed reduction
                                          </span>
                                        </div>
                                        {group.traffic_analysis.delay_minutes && (
                                          <div className="flex items-center gap-1">
                                            <ClockIcon className="w-3 h-3 text-orange-500" />
                                            <span className="text-orange-600">
                                              +{group.traffic_analysis.delay_minutes} min delay
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Active Incidents */}
                                    {group.active_incidents && group.active_incidents.length > 0 && (
                                      <div className="mt-2">
                                        <div className="font-medium text-red-600 mb-1">Active Issues:</div>
                                        {group.active_incidents.slice(0, 1).map((incident: any, incidentIdx: number) => (
                                          <div key={incidentIdx} className="text-red-600 text-xs mb-1">
                                            • {incident.description}
                                          </div>
                                        ))}
                                        {group.active_incidents.length > 1 && (
                                          <div className="text-xs text-gray-500">
                                            +{group.active_incidents.length - 1} more issues
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Weather Impact */}
                                    {group.weather_impact && group.weather_impact.affecting_traffic && (
                                      <div className="mt-2">
                                        <div className="flex items-center gap-1">
                                          <AlertTriangle className="w-3 h-3 text-yellow-500" />
                                          <span className="text-yellow-600 text-xs">
                                            Weather: {group.weather_impact.conditions} ({group.weather_impact.impact_level} impact)
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Key Factors */}
                                    {group.key_factors && group.key_factors.length > 0 && (
                                      <div className="mt-2">
                                        <div className="font-medium text-gray-700 mb-1">Key Factors:</div>
                                        {group.key_factors.slice(0, 1).map((factor: string, factorIdx: number) => (
                                          <div key={factorIdx} className="text-gray-600 text-xs mb-1">
                                            • {factor}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Alternative Suggestion */}
                                    {group.alternative && (
                                      <div className="mt-2">
                                        <div className="flex items-center gap-1">
                                          <Navigation className="w-3 h-3 text-green-500" />
                                          <span className="text-green-600 text-xs">
                                            Alternative: {group.alternative}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {route.groups.length > 2 && (
                                  <div className="text-xs text-gray-500 text-center">
                                    +{route.groups.length - 2} more segments
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="mt-4 flex gap-2">
                              <Button
                                size="sm"
                                variant={isSelected ? "default" : "outline"}
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRouteIndex(idx);
                                  setSelectedRoute(route);
                                }}
                              >
                                {isSelected ? (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Selected
                                  </>
                                ) : (
                                  <>
                                    <MapPin className="w-4 h-4 mr-1" />
                                    View on Map
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

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
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              View Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={!showSummary ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowSummary(false)}
              >
                Data
              </Button>
              <Button
                variant={showSummary ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowSummary(true)}
              >
                Summary
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 