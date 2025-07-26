import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as React from 'react';
import { useContext, useState, useEffect } from 'react';
import { Animated, Dimensions, PanResponder, ScrollView as RNScrollView, StyleSheet, View, Modal, Alert, LayoutAnimation, UIManager, Pressable, findNodeHandle, RefreshControl } from 'react-native';
import { Platform, View as RNView, Text as RNText } from 'react-native';

let MapViewRN, Marker, Circle, PROVIDER_GOOGLE;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapViewRN = maps.default;
  Marker = maps.Marker;
  Circle = maps.Circle;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
}

import { Chip, Text, TextInput, useTheme, Button, Card, ActivityIndicator, FAB, Portal } from 'react-native-paper';
import { UserThemeContext } from '../app/_layout';
import { AreaInsights } from './AreaInsights';
import { apiFetch } from '../app/api';
import { useLocation } from '../contexts/LocationContext';
import { DatePickerModal, TimePickerModal } from 'react-native-paper-dates';

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
  { name: 'Current Location', latitude: 12.9716, longitude: 77.5946 },
  { name: 'Downtown', latitude: 12.9716, longitude: 77.5946 },
  { name: 'City Center', latitude: 12.9789, longitude: 77.5917 },
  { name: 'Tech Park', latitude: 12.9716, longitude: 77.5946 },
  { name: 'Shopping District', latitude: 12.9756, longitude: 77.5986 },
  { name: 'Residential Area', latitude: 12.9766, longitude: 77.5996 },
  { name: 'University Area', latitude: 12.9706, longitude: 77.5936 },
  { name: 'Hospital District', latitude: 12.9736, longitude: 77.5966 },
];

type Destination = { id: string; name: string };
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

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const InsightsMapView = () => {
  if (Platform.OS === 'web') {
    return (
      <RNView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <RNText>Map is not supported on web. Please use the mobile app.</RNText>
      </RNView>
    );
  }

  const [selectedFilter, setSelectedFilter] = useState<'all' | 'issue' | 'event' | 'resolved'>('all');
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [customDestination, setCustomDestination] = useState('');
  const [selectedMarker, setSelectedMarker] = useState<MapDataItem | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [showLocationPresets, setShowLocationPresets] = useState(false);
  const [mapData, setMapData] = useState<MapDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 12.9716,
    longitude: 77.5946,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const theme = useTheme();
  const userTheme = useContext(UserThemeContext);
  const isDarkMode = userTheme === 'dark';
  const { selectedLocation, pinCurrentLocation, setSelectedLocation } = useLocation();

  // Update map region when selected location changes
  useEffect(() => {
    if (selectedLocation) {
      setMapRegion({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  }, [selectedLocation]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setRefreshKey(k => k + 1);
    setTimeout(() => setRefreshing(false), 1000); // simulate refresh, or tie to fetchMapData
  }, []);

  // Fetch real map data
  useEffect(() => {
    fetchMapData();
  }, [selectedLocation, refreshKey]);

  const fetchMapData = async () => {
    if (!selectedLocation) return;

    try {
      setLoading(true);
      const response = await apiFetch(
        `http://0.0.0.0:8000/api/v1/posts/nearby?latitude=${selectedLocation.latitude}&longitude=${selectedLocation.longitude}&radius_km=5.0`
      );
      
      if (response.ok) {
        const data = await response.json();
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

  // Calculate summary statistics from real data
  const summaryStats = {
    total: filteredData.length,
    issues: filteredData.filter(item => item.type === 'issue').length,
    events: filteredData.filter(item => item.type === 'event').length,
    resolved: filteredData.filter(item => item.type === 'resolved').length,
    highPriority: filteredData.filter(item => item.type === 'issue' && item.severity === 'high').length,
    avgRadius: filteredData.length > 0 ? Math.round(filteredData.reduce((sum, item) => sum + item.radius, 0) / filteredData.length) : 0,
    coverageArea: filteredData.length > 0 ? Math.round(filteredData.reduce((sum, item) => sum + (Math.PI * item.radius * item.radius), 0) / 1000000) : 0, // in km²
  };

  // Drawer animation setup
  const screenHeight = Dimensions.get('window').height;
  const drawerHeight = Math.min(screenHeight, screenHeight*0.98);
  const drawerMin = 220;
  const drawerMax = drawerHeight;
  const [drawerPos, setDrawerPos] = useState(screenHeight - drawerMin);
  const drawerY = React.useRef(new Animated.Value(screenHeight - drawerMin)).current;
  const [isClosing, setIsClosing] = useState(false);

  // Keep drawerY in sync with drawerPos
  React.useEffect(() => {
    drawerY.setValue(drawerPos);
  }, [drawerPos, drawerY]);

  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>{
          const isHandleArea = gestureState.y0 < 60;
          const isDraggingDown = gestureState.dy > 10;
          return isHandleArea || isDraggingDown;
      },
      onPanResponderGrant: () => {
        setIsClosing(false);
      },
      onPanResponderMove: (_, gestureState) => {
        let newY = screenHeight - drawerMin + gestureState.dy;
        if (newY < screenHeight - drawerMax) newY = screenHeight - drawerMax;
        if (newY > screenHeight - drawerMin) newY = screenHeight - drawerMin;
        drawerY.setValue(newY);
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldClose = gestureState.dy > 50 || gestureState.vy > 0.5;
        const targetY = shouldClose ? screenHeight - drawerMin : screenHeight - drawerMax;
        
        setDrawerPos(targetY);
        setIsClosing(shouldClose);
        
        Animated.spring(drawerY, {
          toValue: targetY,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

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

  const handleMapPress = (event: any) => {
    // const { latitude, longitude } = event.nativeEvent.coordinate;
    // setPinnedLocation({ latitude, longitude });
    // setShowInsightsModal(true);
  };

  const handleMapLongPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const timer = setTimeout(async () => {
      setSelectedLocation({ latitude, longitude });
      setDrawerPos(screenHeight - drawerMax);
      Animated.spring(drawerY, {
        toValue: screenHeight - drawerMax,
        useNativeDriver: false,
      }).start();
      Alert.alert('Location Pinned', 'Location has been set as your selected area. Check the drawer for area insights.');
    }, 2000);
    setLongPressTimer(timer as unknown as NodeJS.Timeout);
  };

  const handleMapPressStart = (event: any) => {
    // Clear any existing timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
  };

  const handleMapPressEnd = () => {
    // Clear timer if press is released before 3 seconds
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleMarkerPress = (marker: MapDataItem) => {
    setSelectedMarker(marker);
    setPinnedLocation({ latitude: marker.latitude, longitude: marker.longitude });
    setShowInsightsModal(true);
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

  // Route planning state
  const [routeExpanded, setRouteExpanded] = useState(false);
  const [routeStart, setRouteStart] = useState('');
  const [routeEnd, setRouteEnd] = useState('');
  const [routePreset, setRoutePreset] = useState<Destination | null>(null);
  const [leaveDate, setLeaveDate] = useState<Date | null>(new Date());
  const [leaveTime, setLeaveTime] = useState<{ hours: number; minutes: number } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Ref for the route card
  const routeCardRef = React.useRef<View>(null);

  // Helper to check if touch is outside the card
  const handleOverlayPress = (event: any) => {
    if (!routeCardRef.current) return;
    const handle = findNodeHandle(routeCardRef.current);
    if (!handle) return;
    UIManager.measure(handle, (x, y, width, height, pageX, pageY) => {
      const { locationX, locationY } = event.nativeEvent;
      // If touch is outside the card bounds, close
      if (
        locationX < pageX ||
        locationX > pageX + width ||
        locationY < pageY ||
        locationY > pageY + height
      ) {
        setRouteExpanded(false);
      }
    });
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Map as background */}
      <MapViewRN
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        region={mapRegion}
        onPress={handleMapPress}
        onLongPress={handleMapLongPress}
        // onPressStart={handleMapPressStart}
        // onPressEnd={handleMapPressEnd}
      >
        {/* User's selected location marker */}
        {selectedLocation && (
          <Marker
            coordinate={{
              latitude: selectedLocation.latitude,
              longitude: selectedLocation.longitude,
            }}
            pinColor={theme.colors.primary}
            title="Your Location"
            description={getLocationName()}
          />
        )}
        {/* Render real markers */}
        {filteredData?.map((item) => (
          <React.Fragment key={item.id}>
            <Marker
              coordinate={{
                latitude: item.latitude,
                longitude: item.longitude,
              }}
              onPress={() => handleMarkerPress(item)}
            >
              <View style={{
                backgroundColor: 'white',
                borderRadius: 20,
                padding: 8,
                borderWidth: 2,
                borderColor: getMarkerColor(item.type, item.severity),
              }}>
                <MaterialCommunityIcons
                  name={getMarkerIcon(item.type)}
                  size={20}
                  color={getMarkerColor(item.type, item.severity)}
                />
              </View>
            </Marker>
            <Circle
              center={{
                latitude: item.latitude,
                longitude: item.longitude,
              }}
              radius={item.radius}
              strokeColor={getCircleColor(item.type, item.severity)}
              strokeWidth={2}
              fillColor={getCircleFillColor(item.type, item.severity)}
            />
          </React.Fragment>
        ))}
      </MapViewRN>

      {/* Location/Route Input Bar - always visible */}
      <Animated.View
        ref={routeCardRef}
        style={[styles.routeInputCard, routeExpanded && styles.routeInputCardExpanded, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow, zIndex: 200 }]}
        pointerEvents="auto"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            mode="outlined"
            placeholder={routeExpanded ? 'Start location...' : 'Search location...'}
            value={routeExpanded ? routeStart : getLocationName()}
            onChangeText={routeExpanded ? setRouteStart : setCustomDestination}
            style={[styles.locationInput, { flex: 1, backgroundColor: theme.colors.surface, color: theme.colors.onSurface }]}
            left={<TextInput.Icon icon="map-marker" color={theme.colors.onSurfaceVariant} />}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            theme={{ colors: { text: theme.colors.onSurface, placeholder: theme.colors.onSurfaceVariant, background: theme.colors.surface, primary: theme.colors.primary, outline: theme.colors.outline } }}
            editable={routeExpanded || !routeExpanded}
            autoFocus={routeExpanded}
          />
        </View>
        {/* Expanded route options */}
        {routeExpanded && (
          <View style={{ marginTop: 12 }}>
            <TextInput
              label="End Location"
              value={routeEnd}
              onChangeText={setRouteEnd}
              mode="outlined"
              style={{ marginBottom: 8, backgroundColor: theme.colors.surface, color: theme.colors.onSurface }}
              left={<TextInput.Icon icon="map-marker-check" color={theme.colors.onSurfaceVariant} />}
              placeholderTextColor={theme.colors.onSurfaceVariant}
              theme={{ colors: { text: theme.colors.onSurface, placeholder: theme.colors.onSurfaceVariant, background: theme.colors.surface, primary: theme.colors.primary, outline: theme.colors.outline } }}
            />
            <Text style={{ marginBottom: 8, fontWeight: 'bold', color: theme.colors.onSurface }}>Preset Destinations</Text>
            <RNScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 8 }}>
              {destinations?.map(dest => (
                <Chip
                  key={dest.id}
                  selected={routePreset?.id === dest.id}
                  onPress={() => setRoutePreset(dest)}
                  icon="map-marker"
                  style={{ marginRight: 0, backgroundColor: theme.colors.surface }}
                  selectedColor={theme.colors.primary}
                  textStyle={{ color: theme.colors.onSurface }}
                >
                  {dest.name}
                </Chip>
              ))}
            </RNScrollView>
            <Button
              mode="outlined"
              icon="calendar"
              onPress={() => setShowDatePicker(true)}
              style={{ marginBottom: 8, borderColor: theme.colors.outline }}
              textColor={theme.colors.onSurface}
            >
              {leaveDate ? leaveDate.toLocaleDateString() : 'Pick Date'}
            </Button>
            <Button
              mode="outlined"
              icon="clock"
              onPress={() => setShowTimePicker(true)}
              style={{ marginBottom: 8, borderColor: theme.colors.outline }}
              textColor={theme.colors.onSurface}
            >
              {leaveTime ? `${leaveTime.hours}:${leaveTime.minutes.toString().padStart(2, '0')}` : 'Pick Time'}
            </Button>
            <Button
              mode="contained"
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setRouteExpanded(false);
              }}
              style={{ marginTop: 8, backgroundColor: theme.colors.primary }}
              labelStyle={{ color: theme.colors.onPrimary }}
            >
              Plan Route
            </Button>
          </View>
        )}
        <DatePickerModal
          locale="en"
          mode="single"
          visible={showDatePicker}
          onDismiss={() => setShowDatePicker(false)}
          date={leaveDate || new Date()}
          onConfirm={(params: any) => {
            if (params?.date) setLeaveDate(params.date);
            setShowDatePicker(false);
          }}
        />
        <TimePickerModal
          visible={showTimePicker}
          onDismiss={() => setShowTimePicker(false)}
          hours={leaveTime?.hours || new Date().getHours()}
          minutes={leaveTime?.minutes || new Date().getMinutes()}
          onConfirm={({ hours, minutes }: { hours: number; minutes: number }) => {
            setLeaveTime({ hours, minutes });
            setShowTimePicker(false);
          }}
        />
      </Animated.View>

      {/* Overlay to close input card when clicking outside the card */}
      {routeExpanded && (
        <Pressable
          style={[styles.overlay, { zIndex: 100 }]}
          pointerEvents="auto"
          onPress={handleOverlayPress}
        />
      )}

      {/* Route and Current Location FABs at bottom right above filters, stacked vertically */}
      {!routeExpanded && (
        <View style={styles.fabColumnRight}>
          <FAB
            icon={({ color, size }) => <MaterialCommunityIcons name="directions" color={theme.colors.onPrimary} size={36} />} // Large icon, static
            style={[styles.routeFabBottom, { backgroundColor: theme.colors.primary, marginBottom: 20 }]}
            color={theme.colors.onPrimary}
            onPress={() => {
              setRouteExpanded(true);
            }}
            size="large"
            theme={{ colors: { primary: theme.colors.primary } }}
          />
          <FAB
            icon={({ color, size }) => <MaterialCommunityIcons name="crosshairs-gps" color={theme.colors.onPrimary} size={32} />} // Large icon, static
            style={[styles.routeFabBottom, { backgroundColor: theme.colors.primary }]}
            color={theme.colors.onPrimary}
            onPress={async () => {
              try {
                await pinCurrentLocation();
              } catch (e) {
                // Optionally show error
              }
            }}
            size="large"
            theme={{ colors: { primary: theme.colors.primary } }}
          />
        </View>
      )}

      {/* Area Insight Filter Chips - now at the bottom */}
      <View style={[styles.filterChipsRow, { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 8, bottom: 24, shadowColor: theme.colors.shadow, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 }]}> 
        <RNScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip 
            selected={selectedFilter === 'all'} 
            onPress={() => setSelectedFilter('all')} 
            style={{ marginRight: 0, marginBottom: 0, backgroundColor: theme.colors.surface }}
            selectedColor={theme.colors.primary}
            textStyle={{ color: theme.colors.onSurface }}
          >
            All ({mapData.length})
          </Chip>
          <Chip 
            selected={selectedFilter === 'issue'} 
            onPress={() => setSelectedFilter('issue')} 
            style={{ marginRight: 0, marginBottom: 0, backgroundColor: theme.colors.surface }} 
            icon="alert-circle-outline"
            selectedColor={theme.colors.primary}
            textStyle={{ color: theme.colors.onSurface }}
          >
            Issues ({mapData.filter(item => item.type === 'issue').length})
          </Chip>
          <Chip 
            selected={selectedFilter === 'event'} 
            onPress={() => setSelectedFilter('event')} 
            style={{ marginRight: 0, marginBottom: 0, backgroundColor: theme.colors.surface }} 
            icon="calendar"
            selectedColor={theme.colors.primary}
            textStyle={{ color: theme.colors.onSurface }}
          >
            Events ({mapData.filter(item => item.type === 'event').length})
          </Chip>
          <Chip 
            selected={selectedFilter === 'resolved'} 
            onPress={() => setSelectedFilter('resolved')} 
            style={{ marginRight: 0, marginBottom: 0, backgroundColor: theme.colors.surface }} 
            icon="check-circle-outline"
            selectedColor={theme.colors.primary}
            textStyle={{ color: theme.colors.onSurface }}
          >
            Resolved ({mapData.filter(item => item.type === 'resolved').length})
          </Chip>
        </RNScrollView>
      </View>

      {/* Remove FABs and route modal */}

      {/* Insights Modal */}
      <Modal
        visible={showInsightsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInsightsModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
              Area Insights
            </Text>
            <Button
              mode="text"
              onPress={() => setShowInsightsModal(false)}
              icon="close"
            >
              Close
            </Button>
          </View>
          
          {pinnedLocation && (
            <AreaInsights
              latitude={pinnedLocation.latitude}
              longitude={pinnedLocation.longitude}
            />
          )}
        </View>
      </Modal>

      {/* Drawer */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: drawerMax,
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
          zIndex: 1000, // Increased z-index to appear above location input
          transform: [{ translateY: drawerY }],
        }}
      >
        {/* Handle */}
        <View 
          {...panResponder.panHandlers}
          style={{ 
            alignItems: 'center', 
            paddingTop: 12, 
            paddingBottom: 8, 
            height: 40, 
            justifyContent: 'center' 
          }}
        >
          <View style={{ 
            width: 40, 
            height: 4, 
            borderRadius: 2, 
            backgroundColor: theme.colors.outline, 
          }} />
        </View>

        {/* Summary Toggle Button */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          paddingHorizontal: 16, 
          paddingBottom: 8,
          opacity: drawerPos < screenHeight - drawerMin ? 1 : 0.3 
        }}>
          <Text style={{ 
            fontWeight: 'bold', 
            fontSize: 18, 
            color: theme.colors.onSurface 
          }}>
            {showSummary ? 'Area Summary' : 'Map Data'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip
              selected={!showSummary}
              onPress={() => setShowSummary(false)}
              style={{ marginRight: 0 }}
              selectedColor={theme.colors.primary}
              textStyle={{ color: theme.colors.onSurface }}
            >
              Data
            </Chip>
            <Chip
              selected={showSummary}
              onPress={() => setShowSummary(true)}
              style={{ marginRight: 0 }}
              selectedColor={theme.colors.primary}
              textStyle={{ color: theme.colors.onSurface }}
            >
              Summary
            </Chip>
          </View>
        </View>

        {/* Drawer content */}
        <View style={{ 
          paddingHorizontal: 16, 
          flex: 1, 
          opacity: drawerPos < screenHeight - drawerMin ? 1 : 0.3 
        }}>
          <RNScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {showSummary ? (
              /* Summary View with Area Insights */
              <>
                {/* Current Location Info */}
                <View style={[styles.locationInfoCard, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text style={{ 
                    fontWeight: 'bold', 
                    fontSize: 16, 
                    color: theme.colors.onPrimaryContainer,
                    marginBottom: 8 
                  }}>
                    📍 Current Area: {getLocationName()}
                  </Text>
                  <Text style={{ 
                    color: theme.colors.onPrimaryContainer,
                    fontSize: 12 
                  }}>
                    Long press on map to change location
                  </Text>
                </View>

                {/* Area Insights Component */}
                {selectedLocation && (
                  <View style={styles.insightsContainer}>
                    <AreaInsights latitude={selectedLocation.latitude} longitude={selectedLocation.longitude} refreshKey={refreshKey} />
                  </View>
                )}

                {/* Area Insights */}
                <View style={[styles.summaryCard, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text style={{ 
                    fontWeight: 'bold', 
                    fontSize: 16, 
                    color: theme.colors.onPrimaryContainer,
                    marginBottom: 8 
                  }}>
                    📊 Area Insights
                  </Text>
                  <Text style={{ 
                    color: theme.colors.onPrimaryContainer,
                    fontSize: 14,
                    lineHeight: 20 
                  }}>
                    {getAreaInsight()}
                  </Text>
                </View>

                {/* Statistics Grid */}
                <View style={styles.statsGrid}>
                  <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
                    <MaterialCommunityIcons name="map-marker-multiple" size={24} color={theme.colors.primary} />
                    <Text style={{ fontWeight: 'bold', fontSize: 18, color: theme.colors.onSurface }}>
                      {summaryStats.total}
                    </Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                      Total Items
                    </Text>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
                    <MaterialCommunityIcons name="alert-circle" size={24} color="#ef4444" />
                    <Text style={{ fontWeight: 'bold', fontSize: 18, color: theme.colors.onSurface }}>
                      {summaryStats.issues}
                    </Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                      Issues
                    </Text>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
                    <MaterialCommunityIcons name="calendar" size={24} color="#3b82f6" />
                    <Text style={{ fontWeight: 'bold', fontSize: 18, color: theme.colors.onSurface }}>
                      {summaryStats.events}
                    </Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                      Events
                    </Text>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
                    <MaterialCommunityIcons name="check-circle" size={24} color="#22c55e" />
                    <Text style={{ fontWeight: 'bold', fontSize: 18, color: theme.colors.onSurface }}>
                      {summaryStats.resolved}
                    </Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                      Resolved
                    </Text>
                  </View>
                </View>

                {/* Coverage Information */}
                <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
                  <Text style={{ 
                    fontWeight: 'bold', 
                    fontSize: 16, 
                    color: theme.colors.onSurface,
                    marginBottom: 12 
                  }}>
                    📍 Coverage Information
                  </Text>
                  <View style={styles.coverageRow}>
                    <MaterialCommunityIcons name="radius" size={20} color={theme.colors.primary} />
                    <Text style={{ color: theme.colors.onSurface, flex: 1 }}>
                      Average Coverage Radius
                    </Text>
                    <Text style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                      {summaryStats.avgRadius}m
                    </Text>
                  </View>
                  <View style={styles.coverageRow}>
                    <MaterialCommunityIcons name="map" size={20} color={theme.colors.primary} />
                    <Text style={{ color: theme.colors.onSurface, flex: 1 }}>
                      Total Coverage Area
                    </Text>
                    <Text style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                      ~{summaryStats.coverageArea} km²
                    </Text>
                  </View>
                  <View style={styles.coverageRow}>
                    <MaterialCommunityIcons name="alert" size={20} color="#ef4444" />
                    <Text style={{ color: theme.colors.onSurface, flex: 1 }}>
                      High Priority Issues
                    </Text>
                    <Text style={{ fontWeight: 'bold', color: '#ef4444' }}>
                      {summaryStats.highPriority}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              /* Data View */
              <>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={{ marginTop: 16, color: theme.colors.onSurface }}>
                      Loading map data...
                    </Text>
                  </View>
                ) : filteredData.length === 0 ? (
                  <View style={styles.noDataContainer}>
                    <MaterialCommunityIcons name="map-marker-off" size={48} color={theme.colors.onSurfaceVariant} />
                    <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 16, textAlign: 'center', fontSize: 16 }}>
                      No data available
                    </Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', fontSize: 12 }}>
                      Start posting to see data on the map
                    </Text>
                  </View>
                ) : (
                  filteredData?.map((item, idx) => (
                    <View key={item.id} style={[styles.dataRow, { 
                      backgroundColor: selectedMarker?.id === item.id ? theme.colors.primaryContainer : 'transparent',
                      borderRadius: 8,
                      padding: 8,
                      marginBottom: 8,
                    }]}>
                      <View style={{
                        backgroundColor: item.type === 'issue' ? severityColors[item.severity]?.bg : 
                          item.type === 'event' ? '#dbeafe' : '#dcfce7',
                        borderRadius: 12,
                        padding: 8,
                        marginRight: 12,
                      }}>
                        <MaterialCommunityIcons
                          name={getMarkerIcon(item.type)}
                          size={20}
                          color={getMarkerColor(item.type, item.severity)}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ 
                          fontWeight: 'bold', 
                          color: theme.colors.onSurface,
                          marginBottom: 2 
                        }} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={{ 
                          color: theme.colors.onSurfaceVariant, 
                          fontSize: 12,
                          marginBottom: 4 
                        }}>
                          {item.location} • {formatDate(item.createdAt)}
                        </Text>
                        <Text style={{ 
                          color: theme.colors.onSurfaceVariant, 
                          fontSize: 11,
                          marginBottom: 4,
                          lineHeight: 14
                        }} numberOfLines={2}>
                          {item.content}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Chip
                            mode="outlined"
                            textStyle={{ fontSize: 10 }}
                            style={{ marginRight: 8 }}
                          >
                            {item.type}
                          </Chip>
                          {item.type === 'issue' && (
                            <Chip
                              mode="outlined"
                              textStyle={{ fontSize: 10, color: severityColors[item.severity]?.text }}
                              style={{ borderColor: severityColors[item.severity]?.text }}
                            >
                              {item.severity}
                            </Chip>
                          )}
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ 
                          color: theme.colors.onSurfaceVariant, 
                          fontSize: 12,
                          marginBottom: 4 
                        }}>
                          {getRadiusDisplayText(item.radius)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <MaterialCommunityIcons name="thumb-up" size={12} color={theme.colors.onSurfaceVariant} />
                          <Text style={{ fontSize: 10, color: theme.colors.onSurfaceVariant, marginLeft: 2 }}>
                            {item.upvotes}
                          </Text>
                          <MaterialCommunityIcons name="comment" size={12} color={theme.colors.onSurfaceVariant} style={{ marginLeft: 8 }} />
                          <Text style={{ fontSize: 10, color: theme.colors.onSurfaceVariant, marginLeft: 2 }}>
                            {item.commentCount}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}
          </RNScrollView>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  locationBar: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  locationInput: {
    borderRadius: 8,
    elevation: 4,
  },
  presetsContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    borderRadius: 8,
    padding: 8,
    elevation: 4,
    maxHeight: 200,
    zIndex: 1000,
  },
  presetItem: {
    padding: 12,
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  map: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  locationInfoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  insightsContainer: {
    marginBottom: 16,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  statCard: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    width: '45%',
    marginVertical: 8,
  },
  coverageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 32,
  },
  floatingButtons: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'column',
    gap: 12,
    zIndex: 100,
  },
  floatingButton: {
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    minWidth: 50,
    height: 50,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    // bottom is set dynamically for stacking
    zIndex: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  routeCardModal: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '20%',
    zIndex: 30,
    borderRadius: 20,
    elevation: 10,
    backgroundColor: 'white',
    padding: 0,
  },
  routeInputCard: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    zIndex: 100,
    borderRadius: 16,
    backgroundColor: 'white',
    elevation: 6,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  routeInputCardExpanded: {
    minHeight: 260,
    elevation: 10,
    shadowOpacity: 0.2,
  },
  directionsButton: {
    marginLeft: 8,
    borderRadius: 24,
    minWidth: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  filterChipsRow: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 105,
    backgroundColor: 'rgba(0,0,0,0.01)', // almost transparent, just to catch touches
  },
  routeFabButton: {
    borderRadius: 24,
    minWidth: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  routeFabBottom: {
    elevation: 8,
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  locationFab: {
    bottom: 164, // stack above the route FAB
  },
  fabRowCentered: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 88, // above the filter chips
    zIndex: 120,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabColumnRight: {
    position: 'absolute',
    right: 24,
    bottom: 88, // above the filter chips
    zIndex: 120,
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
}); 