import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as React from 'react';
import { useContext, useState } from 'react';
import { Animated, Dimensions, PanResponder, ScrollView as RNScrollView, StyleSheet, View } from 'react-native';
import MapViewRN, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Button, Card, Portal, FAB, Chip, Text, TextInput, useTheme } from 'react-native-paper';
import { DatePickerModal, TimePickerModal } from 'react-native-paper-dates';
import { UserThemeContext } from '../app/_layout';

type Severity = 'high' | 'medium' | 'low';
type MapDataItem = {
  id: number;
  type: 'issue' | 'event' | 'resolved';
  title: string;
  severity: Severity;
  location: string;
  latitude: number;
  longitude: number;
  radius: number;
};

const mapData: MapDataItem[] = [
  { id: 1, type: 'issue', title: 'Pothole on Main Street', severity: 'high', location: '5th Avenue', latitude: 12.9716 + (Math.random() - 0.5) * 0.02, longitude: 77.5946 + (Math.random() - 0.5) * 0.02, radius: Math.floor(Math.random() * (2000 - 500 + 1)) + 500 },
  { id: 2, type: 'event', title: 'Community Cleanup Event', severity: 'low', location: 'City Park', latitude: 12.9726 + (Math.random() - 0.5) * 0.02, longitude: 77.5956 + (Math.random() - 0.5) * 0.02, radius: Math.floor(Math.random() * (2000 - 500 + 1)) + 500 },
  { id: 3, type: 'resolved', title: 'Street Light Fixed', severity: 'medium', location: '2nd Street', latitude: 12.9706 + (Math.random() - 0.5) * 0.02, longitude: 77.5936 + (Math.random() - 0.5) * 0.02, radius: Math.floor(Math.random() * (2000 - 500 + 1)) + 500 },
  { id: 4, type: 'issue', title: 'Water Leak Report', severity: 'high', location: '15th Main Road', latitude: 12.9736 + (Math.random() - 0.5) * 0.02, longitude: 77.5966 + (Math.random() - 0.5) * 0.02, radius: Math.floor(Math.random() * (2000 - 500 + 1)) + 500 },
  { id: 5, type: 'event', title: 'Park Maintenance', severity: 'low', location: 'Green Plaza', latitude: 12.9696 + (Math.random() - 0.5) * 0.02, longitude: 77.5926 + (Math.random() - 0.5) * 0.02, radius: Math.floor(Math.random() * (2000 - 500 + 1)) + 500 },
  { id: 6, type: 'issue', title: 'Traffic Signal Issue', severity: 'medium', location: '8th Street', latitude: 12.9746 + (Math.random() - 0.5) * 0.02, longitude: 77.5976 + (Math.random() - 0.5) * 0.02, radius: Math.floor(Math.random() * (2000 - 500 + 1)) + 500 },
  { id: 7, type: 'resolved', title: 'Road Repair Complete', severity: 'low', location: 'Downtown Area', latitude: 12.9686 + (Math.random() - 0.5) * 0.02, longitude: 77.5916 + (Math.random() - 0.5) * 0.02, radius: Math.floor(Math.random() * (2000 - 500 + 1)) + 500 },
  { id: 8, type: 'issue', title: 'Broken Street Sign', severity: 'medium', location: 'Central District', latitude: 12.9756 + (Math.random() - 0.5) * 0.02, longitude: 77.5986 + (Math.random() - 0.5) * 0.02, radius: Math.floor(Math.random() * (2000 - 500 + 1)) + 500 },
  { id: 9, type: 'event', title: 'Neighborhood Watch Meeting', severity: 'low', location: 'Community Hall', latitude: 12.9676 + (Math.random() - 0.5) * 0.02, longitude: 77.5906 + (Math.random() - 0.5) * 0.02, radius: Math.floor(Math.random() * (2000 - 500 + 1)) + 500 },
  { id: 10, type: 'issue', title: 'Garbage Collection Delay', severity: 'high', location: 'Residential Area', latitude: 12.9766 + (Math.random() - 0.5) * 0.02, longitude: 77.5996 + (Math.random() - 0.5) * 0.02, radius: Math.floor(Math.random() * (2000 - 500 + 1)) + 500 },
  { id: 11, type: 'resolved', title: 'Sidewalk Repair Done', severity: 'low', location: 'Shopping District', latitude: 12.9666 + (Math.random() - 0.5) * 0.02, longitude: 77.5896 + (Math.random() - 0.5) * 0.02, radius: Math.floor(Math.random() * (2000 - 500 + 1)) + 500 },
  { id: 12, type: 'event', title: 'Local Market Day', severity: 'low', location: 'Market Square', latitude: 12.9776 + (Math.random() - 0.5) * 0.02, longitude: 77.6006 + (Math.random() - 0.5) * 0.02, radius: Math.floor(Math.random() * (2000 - 500 + 1)) + 500 },
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

export const MapView = () => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'issue' | 'event' | 'resolved'>('all');
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [customDestination, setCustomDestination] = useState('');
  const [selectedMarker, setSelectedMarker] = useState<MapDataItem | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const theme = useTheme();
  const userTheme = useContext(UserThemeContext);
  const isDarkMode = userTheme === 'dark';

  // Route planning state
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [routeStart, setRouteStart] = useState('');
  const [routeEnd, setRouteEnd] = useState('');
  const [routePreset, setRoutePreset] = useState<Destination | null>(null);
  const [leaveDate, setLeaveDate] = useState<Date | null>(new Date());
  const [leaveTime, setLeaveTime] = useState<{ hours: number; minutes: number } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const filteredData = mapData.filter(item => 
    selectedFilter === 'all' || item.type === selectedFilter
  );

  // Calculate summary statistics
  const summaryStats = {
    total: filteredData.length,
    issues: filteredData.filter(item => item.type === 'issue').length,
    events: filteredData.filter(item => item.type === 'event').length,
    resolved: filteredData.filter(item => item.type === 'resolved').length,
    highPriority: filteredData.filter(item => item.type === 'issue' && item.severity === 'high').length,
    avgRadius: Math.round(filteredData.reduce((sum, item) => sum + item.radius, 0) / filteredData.length),
    coverageArea: Math.round(filteredData.reduce((sum, item) => sum + (Math.PI * item.radius * item.radius), 0) / 1000000), // in km²
  };

  // Drawer animation setup
  const screenHeight = Dimensions.get('window').height;
  const drawerHeight = Math.min(screenHeight, screenHeight*0.98); // Increased height for summary
  const drawerMin = 220; // Increased to show handle and summary toggle
  const drawerMax = drawerHeight;
  const [drawerPos, setDrawerPos] = useState(screenHeight - drawerMin);
  const drawerY = React.useRef(new Animated.Value(screenHeight - drawerMin)).current;
  const [isClosing, setIsClosing] = useState(false);
  console.log('drawerY', drawerY);

  // Keep drawerY in sync with drawerPos
  React.useEffect(() => {
    drawerY.setValue(drawerPos);
  }, [drawerPos, drawerY]);

  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>{
          // Only respond to pan gestures on the handle area or when dragging down
          const isHandleArea = gestureState.y0 < 60; // Handle area is roughly 60px from top
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
        let finalY = screenHeight - drawerMin + gestureState.dy;
        if (finalY < screenHeight - drawerMax) finalY = screenHeight - drawerMax;
        if (finalY > screenHeight - drawerMin) finalY = screenHeight - drawerMin;
        // snap to closest
        const mid = screenHeight - (drawerMax + drawerMin) / 2;
        const toValue = finalY < mid ? screenHeight - drawerMax : screenHeight - drawerMin;
       
        // Add delay when closing
        if (toValue === screenHeight - drawerMin) {
          setIsClosing(true);
          setTimeout(() => {
            Animated.spring(drawerY, { toValue, useNativeDriver: false }).start();
            setDrawerPos(toValue);
            setIsClosing(false);
          }, 500); // 200ms delay
        } else {
          Animated.spring(drawerY, { toValue, useNativeDriver: false }).start();
          setDrawerPos(toValue);
        }
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
    switch (type) {
      case 'issue': return severityColors[severity]?.text || '#ef4444';
      case 'event': return '#3b82f6';
      case 'resolved': return '#22c55e';
      default: return '#64748b';
    }
  };

  const getCircleColor = (type: string, severity: Severity) => {
    switch (type) {
      case 'issue': return severityColors[severity]?.text || '#ef4444';
      case 'event': return '#3b82f6';
      case 'resolved': return '#22c55e';
      default: return '#64748b';
    }
  };

  const getCircleFillColor = (type: string, severity: Severity) => {
    switch (type) {
      case 'issue': return severityColors[severity]?.bg + '80' || '#fee2e280'; // Adding 80 for 50% transparency
      case 'event': return '#dbeafe80'; // Adding 80 for 50% transparency
      case 'resolved': return '#dcfce780'; // Adding 80 for 50% transparency
      default: return '#f3f4f680'; // Adding 80 for 50% transparency
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
    if (summaryStats.total === 0) return "No data available for this area.";
    
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
    <View style={[StyleSheet.absoluteFillObject, { flex: 1 }]}>
      {/* Overlay destination input and chips at the top */}
      <View style={{ position: 'absolute', top: 32, left: 16, right: 16, zIndex: 2 }}>
        <TextInput
          value={customDestination}
          onChangeText={setCustomDestination}
          mode="outlined"
          style={{ 
            marginBottom: 8, 
            backgroundColor: theme.colors.surface, 
            borderRadius: 8, 
            height: 40, 
            paddingVertical: 0 
          }}
          placeholder="Type a destination..."
          dense
          underlineColor="transparent"
          outlineColor={theme.colors.outline}
          activeOutlineColor={theme.colors.primary}
          textColor={theme.colors.onSurface}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          left={undefined}
          right={undefined}
          label={undefined as any}
        />
        <RNScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }} contentContainerStyle={{ gap: 8 }}>
          {destinations.map(dest => (
            <Chip
              key={dest.id}
              selected={selectedDestination?.id === dest.id}
              onPress={() => setSelectedDestination(dest)}
              style={{ marginRight: 0, marginBottom: 0 }}
              icon="map-marker"
              selectedColor={theme.colors.primary}
              textStyle={{ color: theme.colors.onSurface }}
            >
              {dest.name}
            </Chip>
          ))}
        </RNScrollView>
      </View>

      {/* Overlay filter chips */}
      <View style={{ position: 'absolute', bottom: 80, left: 16, right: 16, zIndex: 2 }}>
        <RNScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }} contentContainerStyle={{ gap: 8 }}>
          <Chip 
            selected={selectedFilter === 'all'} 
            onPress={() => setSelectedFilter('all')} 
            style={{ marginRight: 0, marginBottom: 0 }}
            selectedColor={theme.colors.primary}
            textStyle={{ color: theme.colors.onSurface }}
          >
            All ({filteredData.length})
          </Chip>
          <Chip 
            selected={selectedFilter === 'issue'} 
            onPress={() => setSelectedFilter('issue')} 
            style={{ marginRight: 0, marginBottom: 0 }} 
            icon="alert-circle-outline"
            selectedColor={theme.colors.primary}
            textStyle={{ color: theme.colors.onSurface }}
          >
            Issues ({filteredData.filter(item => item.type === 'issue').length})
          </Chip>
          <Chip 
            selected={selectedFilter === 'event'} 
            onPress={() => setSelectedFilter('event')} 
            style={{ marginRight: 0, marginBottom: 0 }} 
            icon="calendar"
            selectedColor={theme.colors.primary}
            textStyle={{ color: theme.colors.onSurface }}
          >
            Events ({filteredData.filter(item => item.type === 'event').length})
          </Chip>
          <Chip 
            selected={selectedFilter === 'resolved'} 
            onPress={() => setSelectedFilter('resolved')} 
            style={{ marginRight: 0, marginBottom: 0 }} 
            icon="check-circle-outline"
            selectedColor={theme.colors.primary}
            textStyle={{ color: theme.colors.onSurface }}
          >
            Resolved ({filteredData.filter(item => item.type === 'resolved').length})
          </Chip>
        </RNScrollView>
      </View>

      {/* Floating Action Buttons */}
      <FAB
        icon="routes"
        style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: 96 }]}
        onPress={() => setRouteModalVisible(true)}
        label="Routes"
        color={theme.colors.onPrimary}
      />
      <FAB
        icon="filter"
        style={[styles.fab, { backgroundColor: theme.colors.secondary, bottom: 32 }]}
        onPress={() => setShowSummary((prev) => !prev)}
        label={showSummary ? 'Data' : 'Summary'}
        color={theme.colors.onSecondary}
      />

      {/* Route Planning Modal */}
      <Portal>
        {routeModalVisible && (
          <Card style={styles.routeCardModal}>
            <Card.Title title="Plan Route" right={(props) => (
              <Button onPress={() => setRouteModalVisible(false)} icon="close" compact>
                Close
              </Button>
            )} />
            <Card.Content>
              <TextInput
                label="Start Location"
                value={routeStart}
                onChangeText={setRouteStart}
                mode="outlined"
                style={{ marginBottom: 8 }}
                left={<TextInput.Icon icon="map-marker" />}
              />
              <TextInput
                label="End Location"
                value={routeEnd}
                onChangeText={setRouteEnd}
                mode="outlined"
                style={{ marginBottom: 8 }}
                left={<TextInput.Icon icon="map-marker-check" />}
              />
              <Text style={{ marginBottom: 8, fontWeight: 'bold' }}>Preset Destinations</Text>
              <RNScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 8 }}>
                {destinations.map(dest => (
                  <Chip
                    key={dest.id}
                    selected={routePreset?.id === dest.id}
                    onPress={() => setRoutePreset(dest)}
                    icon="map-marker"
                    style={{ marginRight: 0 }}
                  >
                    {dest.name}
                  </Chip>
                ))}
              </RNScrollView>
              <Button
                mode="outlined"
                icon="calendar"
                onPress={() => setShowDatePicker(true)}
                style={{ marginBottom: 8 }}
              >
                {leaveDate ? leaveDate.toLocaleDateString() : 'Pick Date'}
              </Button>
              <Button
                mode="outlined"
                icon="clock"
                onPress={() => setShowTimePicker(true)}
                style={{ marginBottom: 8 }}
              >
                {leaveTime ? `${leaveTime.hours}:${leaveTime.minutes.toString().padStart(2, '0')}` : 'Pick Time'}
              </Button>
              <Button
                mode="contained"
                onPress={() => setRouteModalVisible(false)}
                style={{ marginTop: 8 }}
              >
                Plan Route
              </Button>
            </Card.Content>
          </Card>
        )}
        <DatePickerModal
          locale="en"
          mode="single"
          visible={showDatePicker}
          onDismiss={() => setShowDatePicker(false)}
          date={leaveDate || new Date()}
          onConfirm={({ date }: { date: Date }) => {
            setLeaveDate(date);
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
      </Portal>

      <MapViewRN
        provider={PROVIDER_GOOGLE}
        style={{ width: '100%', height: '100%' }}
        initialRegion={{
          latitude: 12.9716,
          longitude: 77.5946,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        customMapStyle={isDarkMode ? [
          {
            "elementType": "geometry",
            "stylers": [
              {
                "color": "#242f3e"
              }
            ]
          },
          {
            "elementType": "labels.text.fill",
            "stylers": [
              {
                "color": "#746855"
              }
            ]
          },
          {
            "elementType": "labels.text.stroke",
            "stylers": [
              {
                "color": "#242f3e"
              }
            ]
          },
          {
            "featureType": "administrative.locality",
            "elementType": "labels.text.fill",
            "stylers": [
              {
                "color": "#d59563"
              }
            ]
          },
          {
            "featureType": "poi",
            "elementType": "labels.text.fill",
            "stylers": [
              {
                "color": "#d59563"
              }
            ]
          },
          {
            "featureType": "poi.park",
            "elementType": "geometry",
            "stylers": [
              {
                "color": "#263c3f"
              }
            ]
          },
          {
            "featureType": "poi.park",
            "elementType": "labels.text.fill",
            "stylers": [
              {
                "color": "#6b9a76"
              }
            ]
          },
          {
            "featureType": "road",
            "elementType": "geometry",
            "stylers": [
              {
                "color": "#38414e"
              }
            ]
          },
          {
            "featureType": "road",
            "elementType": "geometry.stroke",
            "stylers": [
              {
                "color": "#212a37"
              }
            ]
          },
          {
            "featureType": "road",
            "elementType": "labels.text.fill",
            "stylers": [
              {
                "color": "#9ca5b3"
              }
            ]
          },
          {
            "featureType": "road.highway",
            "elementType": "geometry",
            "stylers": [
              {
                "color": "#746855"
              }
            ]
          },
          {
            "featureType": "road.highway",
            "elementType": "geometry.stroke",
            "stylers": [
              {
                "color": "#1f2835"
              }
            ]
          },
          {
            "featureType": "road.highway",
            "elementType": "labels.text.fill",
            "stylers": [
              {
                "color": "#f3d19c"
              }
            ]
          },
          {
            "featureType": "transit",
            "elementType": "geometry",
            "stylers": [
              {
                "color": "#2f3948"
              }
            ]
          },
          {
            "featureType": "transit.station",
            "elementType": "labels.text.fill",
            "stylers": [
              {
                "color": "#d59563"
              }
            ]
          },
          {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [
              {
                "color": "#17263c"
              }
            ]
          },
          {
            "featureType": "water",
            "elementType": "labels.text.fill",
            "stylers": [
              {
                "color": "#515c6d"
              }
            ]
          },
          {
            "featureType": "water",
            "elementType": "labels.text.stroke",
            "stylers": [
              {
                "color": "#17263c"
              }
            ]
          }
        ] : undefined}
      >
        {/* Circle overlays with random radius between 500m and 2km */}
        {filteredData.map((item) => (
          <Circle
            key={`circle-${item.id}`}
            center={{
              latitude: item.latitude,
              longitude: item.longitude,
            }}
            radius={item.radius}
            strokeColor={getCircleColor(item.type, item.severity)}
            strokeWidth={2}
            fillColor={getCircleFillColor(item.type, item.severity)}
            fillOpacity={0.3}
          />
        ))}

        {/* Markers */}
        {filteredData.map((item) => (
          <Marker
            key={item.id}
            coordinate={{ latitude: item.latitude, longitude: item.longitude }}
            title={item.title}
            description={item.location}
            onPress={() => setSelectedMarker(item)}
          >
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 20,
              padding: 8,
              borderWidth: 2,
              borderColor: getMarkerColor(item.type, item.severity),
              shadowColor: theme.colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 4,
            }}>
              <MaterialCommunityIcons
                name={getMarkerIcon(item.type)}
                size={20}
                color={getMarkerColor(item.type, item.severity)}
              />
            </View>
          </Marker>
        ))}
      </MapViewRN>

      {/* Bottom drawer for map data */}
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
          zIndex: 10,
          transform: [{ translateY: drawerY }],
        }}
      >
        {/* Handle - always visible */}
        <View 
        {...panResponder.panHandlers}
        
        style={{ 
          alignItems: 'center', 
          paddingTop: 12, 
          paddingBottom: 8, 
          height: 40, 
          justifyContent: 'center' 
        }}>
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
          {showSummary ? (
            /* Summary View */
            <RNScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
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
            </RNScrollView>
          ) : (
            /* Data View */
            <RNScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {filteredData.map((item, idx) => (
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
                      fontSize: 16,
                    }}>
                      {item.title}
                    </Text>
                    <Text style={{ 
                      color: theme.colors.onSurfaceVariant,
                      fontSize: 14,
                      marginTop: 2,
                    }}>
                      {item.location}
                    </Text>
                    <Text style={{ 
                      color: theme.colors.onSurfaceVariant,
                      fontSize: 12,
                      marginTop: 4,
                    }}>
                      {getRadiusDisplayText(item.radius)}
                    </Text>
                  </View>
                  {item.type === 'issue' ? (
                    <View style={{
                      backgroundColor: severityColors[item.severity]?.bg,
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}>
                      <Text style={{
                        color: severityColors[item.severity]?.text,
                        fontSize: 12,
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                      }}>
                        {item.severity}
                      </Text>
                    </View>
                  ) : (
                    <View style={{
                      backgroundColor: item.type === 'event' ? '#dbeafe' : '#dcfce7',
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}>
                      <Text style={{
                        color: item.type === 'event' ? '#1e40af' : '#15803d',
                        fontSize: 12,
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                      }}>
                        {item.type}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </RNScrollView>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    display: 'none', // not used
  },
  headerCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterRow: {
    display: 'none', // Remove old filter row
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  routeCard: {
    display: 'none', // Hide the old route card
  },
  destinationsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  modal: {
    backgroundColor: 'white',
    padding: 24,
    margin: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  mapCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 1,
  },
  dataCard: {
    borderRadius: 12,
    elevation: 1,
    marginBottom: 12,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
    width: '45%', // Adjust as needed for grid layout
    marginVertical: 8,
  },
  coverageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
}); 