import { useEffect, useState, useRef } from 'react';
import { GoogleMap, Marker, Circle, useJsApiLoader, Polyline, InfoWindow } from '@react-google-maps/api';
import { apiFetch } from '../lib/api';
import { useLocation } from '../contexts/LocationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Train,
  Timer,
  MapPinIcon,
  Milestone,
  ExternalLink,
  Star,
  Target,
  PlayCircle
} from 'lucide-react';

// Types for Google Maps API Response
type GoogleMapsRoute = {
  bounds: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  copyrights: string;
  legs: Array<{
    distance: { text: string; value: number };
    duration: { text: string; value: number };
    duration_in_traffic?: { text: string; value: number };
    end_address: string;
    end_location: { lat: number; lng: number };
    start_address: string;
    start_location: { lat: number; lng: number };
    steps: Array<{
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      end_location: { lat: number; lng: number };
      start_location: { lat: number; lng: number };
      html_instructions: string;
      polyline: { points: string };
      travel_mode: string;
      maneuver?: string;
    }>;
  }>;
  overview_polyline: { points: string };
  summary: string;
  warnings: string[];
  waypoint_order: number[];
};

type RouteInsight = {
  route_id: number;
  insights: Array<{
    group_id: string;
    overall_status: string;
    recommendation: string;
    confidence_score: number;
    summary: string;
    traffic_analysis: {
      speed_reduction_percent: number;
      delay_minutes: number;
      congestion_level: string;
      flow_confidence: number;
    };
    active_incidents: Array<{
      type: string;
      severity: string;
      description: string;
      estimated_delay: number;
      source: string;
      reliability: number;
    }>;
    weather_impact: {
      impact_level: string;
      conditions: string;
      visibility_km: number | null;
      affecting_traffic: boolean;
    };
    key_factors: string[];
    alternative_suggestion: string | null;
    estimated_total_delay: number;
    last_updated: string;
  }>;
  last_updated: string;
};

type RouteResponse = {
  geocoded_waypoints: Array<{
    geocoder_status: string;
    place_id: string;
    types: string[];
  }>;
  routes: GoogleMapsRoute[];
  status: string;
  insights: RouteInsight[];
};

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
  author: {
    username: string;
    profileImageUrl?: string;
  };
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
  
  // New state for start/end markers and route labels
  const [startLocation, setStartLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [endLocation, setEndLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [showRouteLabels, setShowRouteLabels] = useState<{[key: number]: boolean}>({});
  
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

  // Helper function to get insights for a specific route
  const getRouteInsights = (routeIndex: number): RouteInsight | undefined => {
    if (!routeResults?.insights) return undefined;
    return routeResults.insights.find(insight => insight.route_id === routeIndex);
  };

  // Google Maps Polyline Decoder
  const decodePolyline = (encoded: string): Array<{ lat: number; lng: number }> => {
    const points: Array<{ lat: number; lng: number }> = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({
        lat: lat / 1e5,
        lng: lng / 1e5
      });
    }

    return points;
  };

  // Extract polyline data from Google Maps route
  const getRoutePolyline = (route: GoogleMapsRoute): Array<{ lat: number; lng: number }> => {
    if (route.overview_polyline && route.overview_polyline.points) {
      return decodePolyline(route.overview_polyline.points);
    }
    
    // Fallback to leg-by-leg polylines
    const points: Array<{ lat: number; lng: number }> = [];
    route.legs.forEach(leg => {
      leg.steps.forEach(step => {
        if (step.polyline && step.polyline.points) {
          points.push(...decodePolyline(step.polyline.points));
        }
      });
    });
    
    return points;
  };

  // Get route summary from Google Maps data
  const getRouteSummary = (route: GoogleMapsRoute, insights?: RouteInsight) => {
    const leg = route.legs[0]; // For single-leg routes
    const distance = leg.distance.text;
    const duration = leg.duration.text;
    const durationInTraffic = leg.duration_in_traffic?.text || duration;
    
    // Calculate delay
    const baseDuration = leg.duration.value / 60; // minutes
    const trafficDuration = leg.duration_in_traffic?.value ? leg.duration_in_traffic.value / 60 : baseDuration;
    const delay = Math.max(0, Math.round(trafficDuration - baseDuration));
    
    // Get traffic status from insights
    let trafficStatus = 'clear';
    let recommendation = 'proceed';
    let confidence = 0.8;
    
    if (insights) {
      const groupStatuses = insights.insights.map(group => group.overall_status);
      if (groupStatuses.includes('blocked')) {
        trafficStatus = 'blocked';
        recommendation = 'avoid';
      } else if (groupStatuses.includes('heavy')) {
        trafficStatus = 'heavy';
        recommendation = 'caution';
      } else if (groupStatuses.includes('moderate')) {
        trafficStatus = 'moderate';
        recommendation = 'caution';
      }
      
      // Average confidence
      const confidenceScores = insights.insights.map(group => group.confidence_score);
      confidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
    }
    
    return {
      distance,
      duration,
      durationInTraffic,
      delay,
      trafficStatus,
      recommendation,
      confidence,
      summary: route.summary,
      startAddress: leg.start_address,
      endAddress: leg.end_address
    };
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
        const data: RouteResponse = await response.json();
        console.log('Route Results received:', data);
        console.log('Routes count:', data.routes?.length);
        console.log('Insights count:', data.insights?.length);
        setRouteResults(data);
        
        // Auto-select the first route (index 0) by default
        if (data.routes && data.routes.length > 0) {
          setSelectedRouteIndex(0);
          setSelectedRoute(data.routes[0]);
          
          // Set start and end locations for markers
          const firstRoute = data.routes[0];
          if (firstRoute.legs && firstRoute.legs.length > 0) {
            const leg = firstRoute.legs[0];
            setStartLocation({
              lat: leg.start_location.lat,
              lng: leg.start_location.lng,
              address: leg.start_address
            });
            setEndLocation({
              lat: leg.end_location.lat,
              lng: leg.end_location.lng,
              address: leg.end_address
            });
          }
          
          // Center map on route bounds
          if (data.routes[0].bounds) {
            const bounds = data.routes[0].bounds;
            const center = {
              lat: (bounds.northeast.lat + bounds.southwest.lat) / 2,
              lng: (bounds.northeast.lng + bounds.southwest.lng) / 2
            };
            setMapCenter(center);
            setMapZoom(12);
          }
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

  // Function to open route in Google Maps
  const openInGoogleMaps = (route: GoogleMapsRoute, routeIndex: number) => {
    if (!route || !route.legs || route.legs.length === 0) return;
    
    const leg = route.legs[0];
    const origin = encodeURIComponent(leg.start_address);
    const destination = encodeURIComponent(leg.end_address);
    
    // Create Google Maps URL with directions
    const googleMapsUrl = `https://www.google.com/maps/dir/${origin}/${destination}`;
    
    // Open in new tab
    window.open(googleMapsUrl, '_blank');
  };

  // Function to get route label
  const getRouteLabel = (routeIndex: number, isRecommended: boolean, isSelected: boolean) => {
    return `R${routeIndex}`;
  };

  // Function to get full route name for tabs
  const getFullRouteLabel = (routeIndex: number, isRecommended: boolean) => {
    if (isRecommended) return "Best Route";
    if (routeIndex === 1) return "Alternative";
    if (routeIndex === 2) return "Scenic Route";
    return `Route ${routeIndex + 1}`;
  };

  // Function to get route badge color
  const getRouteBadgeColor = (routeIndex: number, isRecommended: boolean) => {
    if (isRecommended) return "bg-green-600 text-white";
    if (routeIndex === 1) return "bg-blue-600 text-white";
    if (routeIndex === 2) return "bg-purple-600 text-white";
    return "bg-gray-600 text-white";
  };

  // Function to get route colors for polylines and labels
  const getRouteColors = (routeIndex: number, isSelected: boolean, isRecommended: boolean) => {
    if (isSelected) return { stroke: '#2563eb', fill: '#2563eb' }; // Blue for selected
    if (isRecommended) return { stroke: '#10b981', fill: '#10b981' }; // Green for recommended
    if (routeIndex === 1) return { stroke: '#8b5cf6', fill: '#8b5cf6' }; // Purple for alternative
    if (routeIndex === 2) return { stroke: '#f59e0b', fill: '#f59e0b' }; // Orange for scenic
    return { stroke: '#6b7280', fill: '#6b7280' }; // Gray for others
  };

  // Function to get meaningful segment name
  const getSegmentName = (groupId: string, index: number) => {
    if (groupId.includes('group_')) {
      const segmentNames = [
        'Starting Area',
        'Mid Route',
        'Destination Area',
        'Highway Section',
        'City Center',
        'Residential Area'
      ];
      return segmentNames[index] || `Segment ${index + 1}`;
    }
    return groupId.replace('group_', '').replace('_', ' ');
  };

  // Function to clear route results and reset map
  const clearRouteResults = () => {
    setRouteResults(null);
    setSelectedRouteIndex(null);
    setSelectedRoute(null);
    setStartLocation(null);
    setEndLocation(null);
    setRouteError(null);
    setShowRouteLabels({});
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
        author: post.author || { username: 'Anonymous', profileImageUrl: null },
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

                    {/* Start Location Marker */}
                    {startLocation && (
                      <Marker
                        position={{ lat: startLocation.lat, lng: startLocation.lng }}
                        title={`Start: ${startLocation.address}`}
                        icon={{
                          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="16" cy="16" r="14" fill="#22c55e" stroke="white" stroke-width="3"/>
                              <path d="M12 16L14.5 18.5L20 13" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                              <text x="16" y="8" fill="white" text-anchor="middle" font-size="8" font-weight="bold">START</text>
                            </svg>
                          `),
                          scaledSize: new google.maps.Size(32, 32),
                          anchor: new google.maps.Point(16, 32),
                        }}
                      />
                    )}

                    {/* End Location Marker */}
                    {endLocation && (
                      <Marker
                        position={{ lat: endLocation.lat, lng: endLocation.lng }}
                        title={`Destination: ${endLocation.address}`}
                        icon={{
                          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="16" cy="16" r="14" fill="#ef4444" stroke="white" stroke-width="3"/>
                              <path d="M16 10V22M10 16H22" stroke="white" stroke-width="3" stroke-linecap="round"/>
                              <text x="16" y="8" fill="white" text-anchor="middle" font-size="7" font-weight="bold">END</text>
                            </svg>
                          `),
                          scaledSize: new google.maps.Size(32, 32),
                          anchor: new google.maps.Point(16, 32),
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
                        path={getRoutePolyline(routeResults.routes[selectedRouteIndex])}
                        options={{ 
                          strokeColor: '#2563eb', 
                          strokeWeight: 5, 
                          strokeOpacity: 0.8,
                          geodesic: true
                        }}
                      />
                    )}
                    
                    {/* Draw all route polylines with different colors */}
                    {routeResults && routeResults.routes && routeResults.routes.map((route: GoogleMapsRoute, idx: number) => {
                      const isSelected = selectedRouteIndex === idx;
                      const isRecommended = idx === 0; // First route is recommended by default
                      const colors = getRouteColors(idx, isSelected, isRecommended);
                      
                      const polylineData = getRoutePolyline(route);
                      if (!polylineData || polylineData.length === 0) return null;
                      
                      return (
                        <Polyline
                          key={`google-route-${idx}`}
                          path={polylineData}
                          options={{ 
                            strokeColor: colors.stroke,
                            strokeWeight: isSelected ? 5 : 3,
                            strokeOpacity: isSelected ? 0.9 : 0.7,
                            geodesic: true
                          }}
                        />
                      );
                    })}

                    {/* Route Labels/Info Windows */}
                    {routeResults && routeResults.routes && routeResults.routes.map((route: GoogleMapsRoute, idx: number) => {
                      const isSelected = selectedRouteIndex === idx;
                      const isRecommended = idx === 0;
                      const colors = getRouteColors(idx, isSelected, isRecommended);
                      const polylineData = getRoutePolyline(route);
                      
                      if (!polylineData || polylineData.length === 0) return null;
                      
                      // Get midpoint of route for label placement
                      const midIndex = Math.floor(polylineData.length / 2);
                      const labelPosition = polylineData[midIndex];
                      
                      if (!labelPosition) return null;
                      
                      return (
                        <Marker
                          key={`route-label-${idx}`}
                          position={labelPosition}
                          icon={{
                            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                              <svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="2" y="2" width="36" height="20" rx="10" fill="${colors.fill}" stroke="white" stroke-width="2"/>
                                <text x="20" y="15" fill="white" text-anchor="middle" font-size="11" font-weight="bold">${getRouteLabel(idx, isRecommended, isSelected)}</text>
                              </svg>
                            `),
                            scaledSize: new google.maps.Size(40, 24),
                            anchor: new google.maps.Point(20, 12),
                          }}
                          onClick={() => {
                            setSelectedRouteIndex(idx);
                            setSelectedRoute(route);
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
                  <div className="space-y-2">
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
                    
                    {routeResults && (
                      <Button 
                        variant="outline"
                        className="w-full" 
                        onClick={clearRouteResults}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear Routes
                      </Button>
                    )}
                  </div>
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

          {/* Route Results Display */}
          {routeResults && (
            <div className="space-y-4">
              {/* Route Options Tabs */}
              {routeResults.routes && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-800">Route Options</h4>
                    <Badge variant="outline" className="text-xs">
                      {routeResults.routes.length} route{routeResults.routes.length !== 1 ? 's' : ''} found
                    </Badge>
                  </div>
                  
                  <Tabs 
                    value={selectedRouteIndex?.toString() || "0"} 
                    onValueChange={(value) => {
                      const idx = parseInt(value);
                      setSelectedRouteIndex(idx);
                      setSelectedRoute(routeResults.routes[idx]);
                      
                      // Center map on route bounds
                      const route = routeResults.routes[idx];
                      if (route.bounds) {
                        const bounds = route.bounds;
                        const center = {
                          lat: (bounds.northeast.lat + bounds.southwest.lat) / 2,
                          lng: (bounds.northeast.lng + bounds.southwest.lng) / 2
                        };
                        setMapCenter(center);
                        setMapZoom(12);
                      }
                    }}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                      {routeResults.routes.slice(0, 3).map((route: GoogleMapsRoute, idx: number) => {
                        const isRecommended = idx === 0;
                        const routeInsights = getRouteInsights(idx);
                        const routeSummary = getRouteSummary(route, routeInsights);
                        
                        return (
                          <TabsTrigger 
                            key={idx} 
                            value={idx.toString()}
                            className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm"
                          >
                            <div className="flex items-center gap-2">
                              {isRecommended && <Star className="w-3 h-3 text-yellow-500" />}
                              <span className="font-medium">
                                {getFullRouteLabel(idx, isRecommended)}
                              </span>
                              {isRecommended && (
                                <Badge className="bg-green-600 text-white text-xs ml-1">Best</Badge>
                              )}
                            </div>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

                    {routeResults.routes.slice(0, 3).map((route: GoogleMapsRoute, idx: number) => {
                      const isRecommended = idx === 0;
                      const routeInsights = getRouteInsights(idx);
                      const routeSummary = getRouteSummary(route, routeInsights);
                      const statusConfig = routeStatusColors[routeSummary.trafficStatus as keyof typeof routeStatusColors] || routeStatusColors.clear;
                      
                      return (
                        <TabsContent key={idx} value={idx.toString()} className="mt-0">
                          <Card className="border-0 shadow-sm">
                            <CardContent className="p-6">
                              {/* Simplified Route Header */}
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-lg font-semibold text-gray-900">{routeSummary.summary}</h3>
                                  <div className="flex items-center gap-1">
                                    {getRouteStatusIcon(routeSummary.trafficStatus)}
                                    <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ 
                                      backgroundColor: statusConfig.bg, 
                                      color: statusConfig.text 
                                    }}>
                                      {routeSummary.trafficStatus}
                                    </span>
                                  </div>
                                </div>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openInGoogleMaps(route, idx);
                                  }}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  Open in Maps
                                </Button>
                              </div>

                              {/* Essential Route Information */}
                              <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Distance</div>
                                  <div className="text-lg font-semibold text-gray-900">{routeSummary.distance}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Duration</div>
                                  <div className="text-lg font-semibold text-gray-900">{routeSummary.durationInTraffic}</div>
                                  {routeSummary.delay > 0 && (
                                    <div className="text-xs text-orange-600">+{routeSummary.delay} min delay</div>
                                  )}
                                </div>
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Confidence</div>
                                  <div className={`text-lg font-semibold ${getConfidenceColor(routeSummary.confidence)}`}>
                                    {(routeSummary.confidence * 100).toFixed(0)}%
                                  </div>
                                </div>
                              </div>

                              {/* Traffic Issues Summary */}
                              {routeInsights && routeInsights.insights.length > 0 && (
                                <div className="mb-4">
                                  {(() => {
                                    const allIncidents = routeInsights.insights.flatMap(insight => insight.active_incidents || []);
                                    const criticalIssues = allIncidents.filter(incident => incident.severity === 'critical' || incident.severity === 'high');
                                    
                                    if (criticalIssues.length > 0) {
                                      return (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                          <div className="flex items-center gap-2 mb-2">
                                            <AlertTriangle className="w-4 h-4 text-red-500" />
                                            <span className="text-sm font-medium text-red-700">Critical Issues</span>
                                          </div>
                                          <div className="text-sm text-red-600">
                                            {criticalIssues[0].description}
                                            {criticalIssues.length > 1 && (
                                              <span className="text-xs text-red-500 ml-2">
                                                +{criticalIssues.length - 1} more
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    } else if (allIncidents.length > 0) {
                                      return (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                          <div className="flex items-center gap-2 mb-2">
                                            <Info className="w-4 h-4 text-yellow-500" />
                                            <span className="text-sm font-medium text-yellow-700">Minor Issues</span>
                                          </div>
                                          <div className="text-sm text-yellow-600">
                                            {allIncidents[0].description}
                                            {allIncidents.length > 1 && (
                                              <span className="text-xs text-yellow-500 ml-2">
                                                +{allIncidents.length - 1} more
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                          <div className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                            <span className="text-sm font-medium text-green-700">No Issues Reported</span>
                                          </div>
                                        </div>
                                      );
                                    }
                                  })()}
                                </div>
                              )}

                              {/* Collapsible Additional Details */}
                              <Collapsible>
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" className="w-full justify-between p-0 h-auto text-sm text-gray-600 hover:text-gray-900">
                                    <span>View Details</span>
                                    <ChevronDown className="w-4 h-4" />
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="space-y-3 mt-3">
                                  {/* Route Addresses */}
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="text-gray-500">From:</span>
                                      <div className="text-gray-700">{routeSummary.startAddress}</div>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">To:</span>
                                      <div className="text-gray-700">{routeSummary.endAddress}</div>
                                    </div>
                                  </div>

                                                                     {/* Detailed Traffic Analysis */}
                                   {routeInsights && routeInsights.insights.length > 0 && (
                                     <div className="space-y-2">
                                       <h6 className="text-sm font-medium text-gray-700">Traffic Analysis</h6>
                                       {routeInsights.insights.map((insight: any, insightIdx: number) => (
                                         <div key={insightIdx} className="bg-gray-50 p-3 rounded-lg">
                                           <div className="flex items-center gap-2 mb-2">
                                             {getRouteStatusIcon(insight.overall_status)}
                                             <span className="text-sm font-medium text-gray-700">
                                               {getSegmentName(insight.group_id, insightIdx)}
                                             </span>
                                           </div>
                                           <div className="text-sm text-gray-600 mb-2">{insight.summary}</div>
                                           
                                           {insight.active_incidents && insight.active_incidents.length > 0 && (
                                             <div className="space-y-1">
                                               {insight.active_incidents.map((incident: any, incidentIdx: number) => (
                                                 <div key={incidentIdx} className="text-xs text-red-600 flex items-start gap-1">
                                                   <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                   <span>{incident.description}</span>
                                                 </div>
                                               ))}
                                             </div>
                                           )}
                                         </div>
                                       ))}
                                     </div>
                                   )}
                                </CollapsibleContent>
                              </Collapsible>
                            </CardContent>
                          </Card>
                        </TabsContent>
                      );
                    })}
                  </Tabs>
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