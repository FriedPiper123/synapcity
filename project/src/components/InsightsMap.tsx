import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, Circle } from '@react-google-maps/api';
import { MapPin, AlertTriangle, CheckCircle, Calendar, Filter, Navigation, Clock, Route, X, Search, RefreshCw, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Chip } from '@/components/ui/chip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { apiFetch } from '../lib/api';
import { useLocation } from '../contexts/LocationContext';
import { AreaInsights } from './AreaInsights';
import { useMediaQuery } from '@/hooks/use-media-query';

interface MapDataItem {
  id: string;
  type: 'issue' | 'event' | 'resolved';
  title: string;
  severity: 'high' | 'medium' | 'low';
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
}

interface Destination {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

const destinations: Destination[] = [
  { id: 'dest1', name: 'City Mall', latitude: 12.9716, longitude: 77.5946 },
  { id: 'dest2', name: 'Hospital', latitude: 12.9789, longitude: 77.5917 },
  { id: 'dest3', name: 'Airport', latitude: 12.9756, longitude: 77.5986 },
  { id: 'dest4', name: 'University', latitude: 12.9766, longitude: 77.5996 },
  { id: 'dest5', name: 'Train Station', latitude: 12.9706, longitude: 77.5936 },
];

const severityColors = {
  high: { bg: '#fee2e2', text: '#b91c1c' },
  medium: { bg: '#fef9c3', text: '#b45309' },
  low: { bg: '#dcfce7', text: '#15803d' },
};

export const InsightsMap: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'issue' | 'event' | 'resolved'>('all');
  const [selectedMarker, setSelectedMarker] = useState<MapDataItem | null>(null);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [mapData, setMapData] = useState<MapDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [routeExpanded, setRouteExpanded] = useState(false);
  const [routeStart, setRouteStart] = useState('');
  const [routeEnd, setRouteEnd] = useState('');
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [showLocationPresets, setShowLocationPresets] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 12.9716, lng: 77.5946 });
  const [mapZoom, setMapZoom] = useState(13);
  const [showSummary, setShowSummary] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { selectedLocation, pinCurrentLocation, setSelectedLocation } = useLocation();

  // Update map center when selected location changes
  useEffect(() => {
    if (selectedLocation) {
      setMapCenter({ lat: selectedLocation.latitude, lng: selectedLocation.longitude });
    }
  }, [selectedLocation]);

  // Fetch map data
  useEffect(() => {
    fetchMapData();
  }, [selectedLocation]);

  const fetchMapData = async () => {
    if (!selectedLocation) return;

    try {
      setLoading(true);
      const response = await apiFetch(
        `/api/v1/posts/nearby?latitude=${selectedLocation.latitude}&longitude=${selectedLocation.longitude}&radius_km=5.0`
      );
      
      if (response.ok) {
        const data = await response.json();
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
          author: post.author || { username: 'Anonymous', profileImageUrl: null },
          createdAt: post.createdAt || new Date().toISOString(),
          upvotes: post.upvotes || 0,
          downvotes: post.downvotes || 0,
          commentCount: post.commentCount || 0,
          status: post.status || 'active',
          category: post.category || 'general'
        }));
        setMapData(transformedData);
      } else {
        console.error('Failed to fetch map data');
        setMapData([]);
      }
    } catch (error) {
      console.error('Error fetching map data:', error);
      setMapData([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = mapData.filter(item => 
    selectedFilter === 'all' || item.type === selectedFilter
  );

  const summaryStats = {
    total: filteredData.length,
    issues: filteredData.filter(item => item.type === 'issue').length,
    events: filteredData.filter(item => item.type === 'event').length,
    resolved: filteredData.filter(item => item.type === 'resolved').length,
    highPriority: filteredData.filter(item => item.type === 'issue' && item.severity === 'high').length,
    avgRadius: filteredData.length > 0 ? Math.round(filteredData.reduce((sum, item) => sum + item.radius, 0) / filteredData.length) : 0,
    coverageArea: filteredData.length > 0 ? Math.round(filteredData.reduce((sum, item) => sum + (Math.PI * item.radius * item.radius), 0) / 1000000) : 0,
  };

  const getMarkerColor = (type: string, severity: 'high' | 'medium' | 'low') => {
    if (type === 'issue') {
      return severityColors[severity]?.text || '#b91c1c';
    }
    switch (type) {
      case 'event': return '#3b82f6';
      case 'resolved': return '#22c55e';
      default: return '#64748b';
    }
  };

  const getCircleColor = (type: string, severity: 'high' | 'medium' | 'low') => {
    if (type === 'issue') {
      return severityColors[severity]?.text || '#b91c1c';
    }
    switch (type) {
      case 'event': return '#3b82f6';
      case 'resolved': return '#22c55e';
      default: return '#64748b';
    }
  };

  const getCircleFillColor = (type: string, severity: 'high' | 'medium' | 'low') => {
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

  const handleMarkerClick = (marker: MapDataItem) => {
    setSelectedMarker(marker);
    setShowInsightsModal(true);
  };

  const handleMapClick = () => {
    setSelectedMarker(null);
  };

  const handleLocationPresetSelect = (preset: any) => {
    setSelectedLocation({ 
      latitude: preset.latitude, 
      longitude: preset.longitude,
      locationName: preset.name 
    });
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

  return (
    <div className="relative h-full bg-background">
      {/* Map */}
      <LoadScript googleMapsApiKey="AIzaSyB5oiBTSReaSQd7FLMxdyjjhynGIq5rjyE">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={mapCenter}
          zoom={mapZoom}
          onClick={handleMapClick}
          options={{
            styles: [
              {
                featureType: 'all',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#6b7280' }]
              },
              {
                featureType: 'all',
                elementType: 'labels.text.stroke',
                stylers: [{ color: '#1f2937' }]
              },
              {
                featureType: 'administrative',
                elementType: 'geometry.fill',
                stylers: [{ color: '#374151' }]
              },
              {
                featureType: 'landscape',
                elementType: 'geometry',
                stylers: [{ color: '#1f2937' }]
              },
              {
                featureType: 'poi',
                elementType: 'geometry',
                stylers: [{ color: '#374151' }]
              },
              {
                featureType: 'road',
                elementType: 'geometry',
                stylers: [{ color: '#4b5563' }]
              },
              {
                featureType: 'transit',
                elementType: 'geometry',
                stylers: [{ color: '#374151' }]
              },
              {
                featureType: 'water',
                elementType: 'geometry',
                stylers: [{ color: '#1e40af' }]
              }
            ]
          }}
        >
          {/* User's selected location marker */}
          {selectedLocation && (
            <Marker
              position={{ lat: selectedLocation.latitude, lng: selectedLocation.longitude }}
              icon={{
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#3b82f6"/>
                  </svg>
                `),
                scaledSize: new google.maps.Size(24, 24),
              }}
              title="Your Location"
            />
          )}

          {/* Render markers */}
          {filteredData?.map((item) => (
            <React.Fragment key={item.id}>
              <Marker
                position={{ lat: item.latitude, lng: item.longitude }}
                onClick={() => handleMarkerClick(item)}
                icon={{
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="16" cy="16" r="16" fill="white" stroke="${getMarkerColor(item.type, item.severity)}" stroke-width="2"/>
                      <path d="M16 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-2.21 0-4 1.79-4 4h8c0-2.21-1.79-4-4-4z" fill="${getMarkerColor(item.type, item.severity)}"/>
                    </svg>
                  `),
                  scaledSize: new google.maps.Size(32, 32),
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
            </React.Fragment>
          ))}
        </GoogleMap>
      </LoadScript>

      {/* Location/Route Input Bar */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <Card className="shadow-lg bg-background/95 backdrop-blur">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search location..."
                value={getLocationName()}
                onChange={(e) => setRouteStart(e.target.value)}
                className="flex-1 bg-background"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLocationPresets(!showLocationPresets)}
              >
                <MapPin className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await pinCurrentLocation();
                  } catch (e) {
                    console.error('Error getting location:', e);
                  }
                }}
              >
                <Crosshair className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location Presets */}
      {showLocationPresets && (
        <div className="absolute top-20 left-4 right-4 z-20">
          <Card className="shadow-lg bg-background/95 backdrop-blur">
            <CardContent className="p-3">
              <div className="space-y-2">
                {destinations.map((dest) => (
                  <Button
                    key={dest.id}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleLocationPresetSelect(dest)}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    {dest.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Chips */}
      <div className="absolute bottom-24 left-4 right-4 z-10">
        <Card className="shadow-lg bg-background/95 backdrop-blur">
          <CardContent className="p-3">
            <div className="flex gap-2 overflow-x-auto">
              <Chip
                selected={selectedFilter === 'all'}
                onClick={() => setSelectedFilter('all')}
              >
                All ({mapData.length})
              </Chip>
              <Chip
                selected={selectedFilter === 'issue'}
                onClick={() => setSelectedFilter('issue')}
              >
                Issues ({mapData.filter(item => item.type === 'issue').length})
              </Chip>
              <Chip
                selected={selectedFilter === 'event'}
                onClick={() => setSelectedFilter('event')}
              >
                Events ({mapData.filter(item => item.type === 'event').length})
              </Chip>
              <Chip
                selected={selectedFilter === 'resolved'}
                onClick={() => setSelectedFilter('resolved')}
              >
                Resolved ({mapData.filter(item => item.type === 'resolved').length})
              </Chip>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drawer */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 transition-transform duration-300 ${
        drawerOpen ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <Card className="rounded-t-xl shadow-xl max-h-96 bg-background">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-foreground">
                {showSummary ? 'Area Summary' : 'Map Data'}
              </CardTitle>
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
            </div>
          </CardHeader>
          
          <CardContent>
            <ScrollArea className="h-64">
              {showSummary ? (
                <div className="space-y-4">
                  {/* Current Location Info */}
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <h3 className="font-bold text-primary mb-2">
                      📍 Current Area: {getLocationName()}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Click on map to change location
                    </p>
                  </div>

                  {/* Area Insights */}
                  {selectedLocation && (
                    <div className="mb-4">
                      <AreaInsights 
                        latitude={selectedLocation.latitude} 
                        longitude={selectedLocation.longitude} 
                      />
                    </div>
                  )}

                  {/* Area Insights Summary */}
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <h3 className="font-bold text-primary mb-2">
                      📊 Area Insights
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {getAreaInsight()}
                    </p>
                  </div>

                  {/* Statistics Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card border rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-foreground">{summaryStats.total}</div>
                      <div className="text-sm text-muted-foreground">Total Items</div>
                    </div>
                    <div className="bg-card border rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-500">{summaryStats.issues}</div>
                      <div className="text-sm text-muted-foreground">Issues</div>
                    </div>
                    <div className="bg-card border rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-500">{summaryStats.events}</div>
                      <div className="text-sm text-muted-foreground">Events</div>
                    </div>
                    <div className="bg-card border rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-500">{summaryStats.resolved}</div>
                      <div className="text-sm text-muted-foreground">Resolved</div>
                    </div>
                  </div>

                  {/* Coverage Information */}
                  <div className="bg-card border rounded-lg p-4">
                    <h3 className="font-bold text-foreground mb-3">
                      📍 Coverage Information
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Average Coverage Radius</span>
                        <span className="font-bold text-foreground">{summaryStats.avgRadius}m</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Coverage Area</span>
                        <span className="font-bold text-foreground">~{summaryStats.coverageArea} km²</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">High Priority Issues</span>
                        <span className="font-bold text-red-500">{summaryStats.highPriority}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading map data...</p>
                    </div>
                  ) : filteredData.length === 0 ? (
                    <div className="text-center py-8">
                      <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No data available</p>
                      <p className="text-muted-foreground text-sm">Start posting to see data on the map</p>
                    </div>
                  ) : (
                    filteredData.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedMarker?.id === item.id ? 'bg-primary/10 border-primary/20' : 'bg-card hover:bg-accent'
                        }`}
                        onClick={() => handleMarkerClick(item)}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              item.type === 'issue' ? severityColors[item.severity]?.bg : 
                              item.type === 'event' ? 'bg-blue-100' : 'bg-green-100'
                            }`}
                          >
                            {item.type === 'issue' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                            {item.type === 'event' && <Calendar className="w-4 h-4 text-blue-600" />}
                            {item.type === 'resolved' && <CheckCircle className="w-4 h-4 text-green-600" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground mb-1">{item.title}</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              By {item.author?.username || 'Anonymous'} • {item.location} • {formatDate(item.createdAt)}
                            </p>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {item.content}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {item.type}
                              </Badge>
                              {item.type === 'issue' && (
                                <Badge variant="outline" className="text-xs" style={{ color: severityColors[item.severity]?.text }}>
                                  {item.severity}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground mb-1">
                              {getRadiusDisplayText(item.radius)}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>👍 {item.upvotes}</span>
                              <span>💬 {item.commentCount}</span>
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

      {/* Drawer Toggle Button */}
      <Button
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30"
        onClick={() => setDrawerOpen(!drawerOpen)}
        variant="default"
        size="sm"
      >
        {drawerOpen ? 'Hide Details' : 'Show Details'}
      </Button>

      {/* Insights Modal */}
      <Dialog open={showInsightsModal} onOpenChange={setShowInsightsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Area Insights</DialogTitle>
          </DialogHeader>
          
          {selectedMarker && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <h3 className="font-bold text-foreground mb-2">{selectedMarker.title}</h3>
                <p className="text-muted-foreground text-sm mb-2">{selectedMarker.location}</p>
                <p className="text-foreground">{selectedMarker.content}</p>
              </div>
              
              <AreaInsights 
                latitude={selectedMarker.latitude} 
                longitude={selectedMarker.longitude} 
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}; 