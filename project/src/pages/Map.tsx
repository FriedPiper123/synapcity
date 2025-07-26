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
  // Remove old routeDate, routeTime, selectedDate, selectedTime, showDateTimePicker state and usage
  
  // Route planning state
  const [routePlanning, setRoutePlanning] = useState(false);
  const [routeResults, setRouteResults] = useState<any>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(null);
  
  const { selectedLocation, getCurrentLocation } = useLocation();

  // Refs for input focus
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  console.log('somethign ', import.meta.env)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: 'AIzaSyDTea-zPVH7xGr-FvmGZrm7WrqJdfCU9zo',
  });

  // Debounced autocomplete search for start input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.log('Start autocomplete effect:', { startAutocompleteQuery, activeInput });
      if (startAutocompleteQuery.length >= 2 && activeInput === 'start') {
        console.log('Fetching autocomplete for start:', startAutocompleteQuery);
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
      console.log('End autocomplete effect:', { endAutocompleteQuery, activeInput });
      if (endAutocompleteQuery.length >= 2 && activeInput === 'end') {
        console.log('Fetching autocomplete for end:', endAutocompleteQuery);
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
    console.log('fetchAutocompleteResults called with:', query);
    try {
      setAutocompleteLoading(true);
      
      // Use simple fetch for autocomplete (no auth required)
      const response = await fetch(`http://0.0.0.0:8000/api/v1/routes/autocomplete?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Autocomplete response:', response);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Autocomplete data:', data);
        setAutocompleteResults(data.predictions || []);
        setShowAutocomplete(true);
      } else {
        console.log('Autocomplete response not ok:', response.status);
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
    console.log('Location selected:', prediction);
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
    console.log('Input focus:', inputType);
    setActiveInput(inputType);
    setShowAutocomplete(true);
  };

  const handleInputBlur = () => {
    console.log('Input blur');
    setTimeout(() => {
      setShowAutocomplete(false);
      setActiveInput(null);
    }, 200);
  };

  const handlePlanRoute = async () => {
    setDateTimeError(null);
    console.log('Planning route:', { routeStart, routeEnd, routeDateTime });
    
    if (!routeStart || !routeEnd) {
      setRouteError('Please enter both start and end locations');
      return;
    }

    // Validate date/time is not in the past
    if (!routeDateTime) {
      setDateTimeError('Please select a date and time');
      return;
    }
    const selectedDate = new Date(routeDateTime);
    if (selectedDate.getTime() < Date.now() - 60000) { // allow 1 min clock skew
      setDateTimeError('Please select a present or future date/time');
      return;
    }

    try {
      setRoutePlanning(true);
      setRouteError(null);
      
      // Calculate departure time
      let departureTime = selectedDate.getTime();

      // Use simple fetch for route planning (no auth required)
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

      console.log('Route planning response:', response);

      if (response.ok) {
        const data = await response.json();
        console.log('Route planning data:', data);
        setRouteResults(data);
      } else {
        const errorData = await response.json();
        console.error('Route planning error:', errorData);
        setRouteError(errorData.detail || 'Failed to plan route');
      }
    } catch (error) {
      console.error('Error planning route:', error);
      setRouteError('Failed to plan route. Please try again.');
    } finally {
      setRoutePlanning(false);
    }
  };

  // Enhanced date/time picker handlers
  const handleDateConfirm = (date: Date) => {
    setRouteDateTime(date.toISOString().slice(0, 16));
  };

  const handleTimeConfirm = (time: { hours: number; minutes: number }) => {
    setRouteDateTime(`${time.hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}`);
  };

  const formatDateTime = () => {
    let result = '';
    if (routeDateTime) {
      result += new Date(routeDateTime).toLocaleDateString();
    }
    if (routeDateTime) {
      result += ` ${routeDateTime.slice(11, 16)}`;
    }
    return result || 'Select date & time';
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
      // Transform the data to match our MapDataItem interface
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Map */}
          <div className="lg:col-span-2">
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
                          path={routeResults.routes[selectedRouteIndex].polyline}
                          options={{ strokeColor: '#2563eb', strokeWeight: 5, strokeOpacity: 0.8 }}
                        />
                      )}
                    </GoogleMap>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Enhanced Route Planning */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="w-5 h-5" />
                  Route Planning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Label htmlFor="start">Start Location</Label>
                  <div className="relative">
                    <Input
                      ref={startInputRef}
                      id="start"
                      placeholder="Enter start location"
                      value={routeStart}
                      onChange={(e) => {
                        console.log('Start input onChange:', e.target.value);
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
                        console.log('End input onChange:', e.target.value);
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

                {/* Quick Destinations */}
                <div>
                  <Label className="text-sm font-medium mb-2">Quick Destinations</Label>
                  <div className="flex flex-wrap gap-2">
                    {destinations.map(dest => (
                      <Button
                        key={dest.id}
                        variant="outline"
                        size="sm"
                        onClick={() => setRouteEnd(dest.name)}
                        className="text-xs"
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        {dest.name}
                      </Button>
                    ))}
                  </div>
                </div>

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
                
                {/* Route Error Display */}
                {routeError && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-700">{routeError}</span>
                    </div>
                  </div>
                )}
                
                {/* Route Results Display */}
                {routeResults && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="font-medium text-green-700">Route Found!</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Summary:</span> {routeResults.overall_summary}
                      </div>
                      <div>
                        <span className="font-medium">Total Routes:</span> {routeResults.total_routes}
                      </div>
                      {routeResults.best_route_id && (
                        <div>
                          <span className="font-medium">Best Route ID:</span> {routeResults.best_route_id}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Response Time:</span> {routeResults.response_time_ms}ms
                      </div>
                    </div>
                  </div>
                )}
                {routeResults && routeResults.routes && (
                  <div className="mt-4 space-y-4">
                    <div className="mb-2 text-lg font-semibold">Route Options</div>
                    {routeResults.routes.map((route: any, idx: number) => {
                      const isBest = routeResults.best_route_id === route.route_id;
                      const isSelected = selectedRouteIndex === idx;
                      // Pros/cons extraction
                      const pros = [];
                      const cons = [];
                      route.groups.forEach((group: any) => {
                        if (group.overall_status === 'clear' || group.recommendation === 'proceed') {
                          pros.push(...(group.key_factors || []));
                        } else {
                          cons.push(...(group.key_factors || []));
                        }
                      });
                      return (
                        <div
                          key={route.route_id}
                          className={`border rounded-lg p-4 shadow-sm cursor-pointer transition-all ${isBest ? 'border-green-600 bg-green-50' : 'border-gray-200'} ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                          onClick={() => setSelectedRouteIndex(idx)}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-lg">Route {idx + 1}</span>
                            {isBest && <span className="ml-2 px-2 py-1 bg-green-600 text-white text-xs rounded">Best</span>}
                            {isSelected && <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">Selected</span>}
                          </div>
                          <div className="mb-1 text-sm">Estimated Delay: <span className="font-semibold">{route.total_estimated_delay} min</span></div>
                          <div className="mb-1 text-sm">Recommendation: <span className="font-semibold">{route.recommendation}</span></div>
                          <div className="mb-1 text-sm">Summary: {route.summary}</div>
                          <div className="flex gap-4 mt-2">
                            <div className="flex-1">
                              <div className="font-medium text-green-700">Pros</div>
                              <ul className="list-disc ml-5 text-green-800 text-xs">
                                {pros.length > 0 ? pros.map((p, i) => <li key={i}>{p}</li>) : <li>No major advantages</li>}
                              </ul>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-red-700">Cons</div>
                              <ul className="list-disc ml-5 text-red-800 text-xs">
                                {cons.length > 0 ? cons.map((c, i) => <li key={i}>{c}</li>) : <li>No major disadvantages</li>}
                              </ul>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

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

        {/* Bottom Drawer */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {showSummary ? (
                <>
                  <BarChart3 className="w-5 h-5" />
                  Area Summary
                </>
              ) : (
                <>
                  <Activity className="w-5 h-5" />
                  Map Data
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {showSummary ? (
                /* Summary View */
                <div className="space-y-4">
                  {/* Current Location Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-bold text-blue-800 mb-2">
                      📍 Current Area: {getLocationName()}
                    </h3>
                    <p className="text-blue-600 text-sm">
                      Click on map markers to view details
                    </p>
                  </div>

                  {/* Area Insights */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-bold text-green-800 mb-2">
                      📊 Area Insights
                    </h3>
                    <p className="text-green-700 text-sm leading-relaxed">
                      {getAreaInsight()}
                    </p>
                  </div>

                  {/* Statistics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white border rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{summaryStats.total}</div>
                      <div className="text-sm text-gray-600">Total Items</div>
                    </div>
                    <div className="bg-white border rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">{summaryStats.issues}</div>
                      <div className="text-sm text-gray-600">Issues</div>
                    </div>
                    <div className="bg-white border rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{summaryStats.events}</div>
                      <div className="text-sm text-gray-600">Events</div>
                    </div>
                    <div className="bg-white border rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{summaryStats.resolved}</div>
                      <div className="text-sm text-gray-600">Resolved</div>
                    </div>
                  </div>

                  {/* Coverage Information */}
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <h3 className="font-bold text-gray-800 mb-3">
                      📍 Coverage Information
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Average Coverage Radius</span>
                        <span className="font-semibold">{summaryStats.avgRadius}m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Coverage Area</span>
                        <span className="font-semibold">~{summaryStats.coverageArea} km²</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">High Priority Issues</span>
                        <span className="font-semibold text-red-600">{summaryStats.highPriority}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Data View */
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-500">Loading map data...</p>
                    </div>
                  ) : filteredData.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-4">📭</div>
                      <p className="text-gray-600">No data available</p>
                      <p className="text-gray-500 text-sm">Start posting to see data on the map</p>
                    </div>
                  ) : (
                    filteredData.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedMarker?.id === item.id
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => handleMarkerClick(item)}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              item.type === 'issue'
                                ? severityColors[item.severity]?.bg
                                : item.type === 'event'
                                ? 'bg-blue-100'
                                : 'bg-green-100'
                            }`}
                          >
                            {item.type === 'issue' && <AlertCircle className="w-5 h-5 text-red-600" />}
                            {item.type === 'event' && <CalendarIcon className="w-5 h-5 text-blue-600" />}
                            {item.type === 'resolved' && <CheckCircle className="w-5 h-5 text-green-600" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                            <p className="text-sm text-gray-600 mb-2">
                              {item.location} • {formatDate(item.createdAt)}
                            </p>
                            <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                              {item.content}
                            </p>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {item.type}
                              </Badge>
                              {item.type === 'issue' && (
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                  style={{ color: severityColors[item.severity]?.text }}
                                >
                                  {item.severity}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{getRadiusDisplayText(item.radius)}</span>
                              <div className="flex items-center gap-4">
                                <span>👍 {item.upvotes}</span>
                                <span>💬 {item.commentCount}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Date/Time Picker Modal */}
      {/* This section is no longer needed as date/time selection is handled directly */}
    </div>
  );
} 