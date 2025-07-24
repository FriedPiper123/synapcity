import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Alert, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, Card, SegmentedButtons, TextInput, useTheme, Chip, List, Divider, ActivityIndicator } from 'react-native-paper';
import * as Location from 'expo-location';
import { apiFetch } from '../api';
import VulgarContentWarning from '../../components/VulgarContentWarning';
import { useLocation } from '../../contexts/LocationContext';

// Issue presets for different categories
const ISSUE_PRESETS = {
  infrastructure: [
    {
      title: "Pothole Report",
      content: "There's a large pothole on [street name] that needs immediate attention. It's causing traffic issues and could damage vehicles.",
      category: "infrastructure"
    },
    {
      title: "Street Light Outage",
      content: "Street lights have been out for the past few days in [area name]. This is causing safety concerns for pedestrians and drivers.",
      category: "infrastructure"
    },
    {
      title: "Road Damage",
      content: "The road surface on [street name] is severely damaged and needs repair. It's affecting traffic flow and vehicle safety.",
      category: "infrastructure"
    }
  ],
  safety: [
    {
      title: "Traffic Signal Issue",
      content: "The traffic signal at [intersection] is not working properly. This is causing traffic congestion and safety hazards.",
      category: "safety"
    },
    {
      title: "Broken Sidewalk",
      content: "The sidewalk on [street name] is broken and poses a tripping hazard for pedestrians, especially elderly and disabled individuals.",
      category: "safety"
    },
    {
      title: "Missing Manhole Cover",
      content: "A manhole cover is missing on [street name]. This is a serious safety hazard that needs immediate attention.",
      category: "safety"
    }
  ],
  water_shortage: [
    {
      title: "Water Leak",
      content: "There's a water leak on [street name] that's been running for [duration]. This is wasting water and could cause road damage.",
      category: "water_shortage"
    },
    {
      title: "Low Water Pressure",
      content: "Water pressure in [area name] has been very low for the past few days. This is affecting daily activities.",
      category: "water_shortage"
    },
    {
      title: "Water Quality Issue",
      content: "The water quality in [area name] seems to have deteriorated. Residents are concerned about health implications.",
      category: "water_shortage"
    }
  ],
  power_outage: [
    {
      title: "Power Outage",
      content: "There's been a power outage in [area name] for the past [duration]. This is affecting daily activities and businesses.",
      category: "power_outage"
    },
    {
      title: "Faulty Street Light",
      content: "A street light on [street name] is flickering and needs repair. This affects nighttime visibility and safety.",
      category: "power_outage"
    },
    {
      title: "Electrical Hazard",
      content: "There's an exposed electrical wire on [street name] that poses a safety hazard. Immediate attention required.",
      category: "power_outage"
    }
  ],
  waste_management: [
    {
      title: "Garbage Not Collected",
      content: "Garbage collection was missed in [area name] today. The bins are overflowing and causing hygiene issues.",
      category: "waste_management"
    },
    {
      title: "Illegal Dumping",
      content: "Someone has been illegally dumping waste on [street name]. This is creating an environmental hazard.",
      category: "waste_management"
    },
    {
      title: "Recycling Bin Damaged",
      content: "The recycling bin on [street name] is damaged and needs replacement. This affects waste segregation efforts.",
      category: "waste_management"
    }
  ],
  transportation: [
    {
      title: "Bus Stop Issue",
      content: "The bus stop at [location] is in poor condition and needs maintenance. It's affecting public transportation users.",
      category: "transportation"
    },
    {
      title: "Traffic Congestion",
      content: "There's severe traffic congestion on [street name] during peak hours. This needs traffic management solutions.",
      category: "transportation"
    },
    {
      title: "Parking Problem",
      content: "There's a parking issue in [area name] that's causing inconvenience to residents and visitors.",
      category: "transportation"
    }
  ]
};

// Suggestion presets
const SUGGESTION_PRESETS = [
  {
    title: "Bike Lane Proposal",
    content: "I suggest adding bike lanes on [street name] to promote cycling and reduce traffic congestion. This would improve air quality and public health.",
    category: "transportation"
  },
  {
    title: "Community Garden",
    content: "I propose creating a community garden in [area name]. This would provide fresh produce, improve air quality, and bring neighbors together.",
    category: "community"
  },
  {
    title: "Solar Street Lights",
    content: "I suggest installing solar-powered street lights in [area name] to reduce energy costs and promote sustainability.",
    category: "infrastructure"
  },
  {
    title: "Recycling Program",
    content: "I propose implementing a comprehensive recycling program in [area name] to reduce waste and promote environmental consciousness.",
    category: "waste_management"
  },
  {
    title: "Public WiFi",
    content: "I suggest installing public WiFi hotspots in [area name] to improve digital connectivity for residents and visitors.",
    category: "infrastructure"
  },
  {
    title: "Neighborhood Watch",
    content: "I propose starting a neighborhood watch program in [area name] to improve community safety and foster stronger relationships.",
    category: "safety"
  }
];

// Event presets
const EVENT_PRESETS = [
  {
    title: "Community Cleanup",
    content: "Join us for a community cleanup event in [area name] on [date]. We'll provide all supplies. Let's make our neighborhood beautiful together!",
    category: "community"
  },
  {
    title: "Neighborhood Meeting",
    content: "Monthly neighborhood meeting scheduled for [date] at [location]. We'll discuss local issues and upcoming projects. All residents welcome!",
    category: "community"
  },
  {
    title: "Street Festival",
    content: "Annual street festival in [area name] on [date]. Food, music, and activities for all ages. Come celebrate our community!",
    category: "community"
  },
  {
    title: "Health Camp",
    content: "Free health checkup camp in [area name] on [date]. Basic screenings and consultations available. Sponsored by local healthcare providers.",
    category: "community"
  },
  {
    title: "Art Workshop",
    content: "Community art workshop in [area name] on [date]. All skill levels welcome. Materials provided. Let's create something beautiful together!",
    category: "community"
  },
  {
    title: "Emergency Preparedness",
    content: "Emergency preparedness workshop in [area name] on [date]. Learn first aid, disaster response, and safety protocols. Free training provided.",
    category: "safety"
  }
];

// Category options
const CATEGORIES = [
  { value: 'infrastructure', label: 'Infrastructure', icon: 'road' },
  { value: 'safety', label: 'Safety', icon: 'shield-check' },
  { value: 'water_shortage', label: 'Water', icon: 'water' },
  { value: 'power_outage', label: 'Power', icon: 'lightning-bolt' },
  { value: 'waste_management', label: 'Waste', icon: 'delete' },
  { value: 'transportation', label: 'Transport', icon: 'bus' },
  { value: 'other', label: 'Other', icon: 'dots-horizontal' }
];

export default function CreatePost() {
  const [content, setContent] = useState('');
  const [type, setType] = useState('issue');
  const [category, setCategory] = useState('infrastructure');
  const [showVulgarWarning, setShowVulgarWarning] = useState(false);
  const [vulgarWarningData, setVulgarWarningData] = useState<any>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [loading, setLoading] = useState(false); // <-- loading state for post creation
  const theme = useTheme();
  const { selectedLocation } = useLocation();

  const handleCreatePost = async () => {
    // Use selected location or fallback to current location
    let latitude, longitude;
    
    if (selectedLocation) {
      latitude = selectedLocation.latitude;
      longitude = selectedLocation.longitude;
    } else {
      // Fallback to current location if no selected location
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to create a post.');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      latitude = location.coords.latitude;
      longitude = location.coords.longitude;
    }

    try {
      setLoading(true); // <-- set loading
      const res = await apiFetch('http://192.168.1.5:8000/api/v1/posts/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          type: type.toLowerCase(), // Backend expects lowercase enum
          category: category,
          location: { latitude, longitude },
          neighborhood: selectedLocation?.locationName || 'Current Location', // Using location-based neighborhood
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (errorData['detail']['code'] === 'VULGAR_CONTENT_DETECTED') {
          setVulgarWarningData(errorData['detail']);
          setShowVulgarWarning(true);
          setLoading(false); // <-- stop loading
          return;
        }
        throw new Error('Failed to create post');
      }
      setLoading(false); // <-- stop loading
      router.back();
    } catch (err) {
      setLoading(false); // <-- stop loading
      console.log(err);
      Alert.alert('Error', 'Could not create post.', [
        { text: 'OK', onPress: () => console.log('OK Pressed') },
      ]);
    }
  };

  const handlePresetSelect = (preset: any) => {
    setContent(preset.content);
    setCategory(preset.category);
    setShowPresets(false);
  };

  const getCurrentPresets = () => {
    if (type === 'issue') {
      return ISSUE_PRESETS[category as keyof typeof ISSUE_PRESETS] || [];
    }
    if (type === 'suggestion') {
      return SUGGESTION_PRESETS;
    }
    if (type === 'event') {
      return EVENT_PRESETS;
    }
    return [];
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background, flex: 1 }]}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-start' }}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={[styles.card, { backgroundColor: theme.colors.surface, flex: 1, minHeight: 400 }]}> 
          <Card.Title 
            title="Create New Post" 
            titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
          />
          <Card.Content>
            {/* Location Display */}
            {selectedLocation && (
              <View style={[styles.locationContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                <Text style={{ color: theme.colors.onPrimaryContainer, fontSize: 12, marginBottom: 4 }}>
                  Posting from: {selectedLocation.locationName || `${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`}
                </Text>
              </View>
            )}

            {/* Post Type Selection */}
            <SegmentedButtons
              value={type}
              onValueChange={setType}
              buttons={[
                { value: 'issue', label: 'Issue', icon: 'alert-circle-outline' },
                { value: 'suggestion', label: 'Suggestion', icon: 'lightbulb-outline' },
                { value: 'event', label: 'Event', icon: 'calendar-outline' },
              ]}
              style={{ marginBottom: 16 }}
            />

            {/* Category Selection */}
            {type === 'issue' && (
              <View style={styles.categoryContainer}>
                <TextInput
                  mode="outlined"
                  label="Category"
                  value={CATEGORIES.find(c => c.value === category)?.label || 'Select Category'}
                  onPressIn={() => setShowPresets(!showPresets)}
                  right={<TextInput.Icon icon="chevron-down" />}
                  style={{ marginBottom: 8 }}
                />
                
                {/* Category Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
                  {CATEGORIES.map((cat) => (
                    <Chip
                      key={cat.value}
                      selected={category === cat.value}
                      onPress={() => setCategory(cat.value)}
                      style={{ marginRight: 8 }}
                      icon={cat.icon}
                    >
                      {cat.label}
                    </Chip>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Post Presets */}
            {getCurrentPresets().length > 0 && (
              <View style={styles.presetsContainer}>
                <Button
                  mode="outlined"
                  onPress={() => setShowPresets(!showPresets)}
                  icon={showPresets ? 'chevron-up' : 'chevron-down'}
                  style={{ marginBottom: 8 }}
                >
                  {showPresets ? 'Hide' : 'Show'} {type === 'issue' ? 'Issue Templates' : type === 'suggestion' ? 'Suggestion Templates' : 'Event Templates'}
                </Button>
                
                {showPresets && (
                  <Card style={[styles.presetsCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Card.Content>
                      {getCurrentPresets().map((preset, index) => (
                        <View key={index}>
                          <List.Item
                            title={preset.title}
                            description={preset.content.substring(0, 80) + '...'}
                            left={(props) => <List.Icon {...props} icon="file-document-outline" />}
                            onPress={() => handlePresetSelect(preset)}
                            style={styles.presetItem}
                          />
                          {index < getCurrentPresets().length - 1 && <Divider />}
                        </View>
                      ))}
                    </Card.Content>
                  </Card>
                )}
              </View>
            )}

            {/* Content Input */}
            <TextInput
              mode="outlined"
              label="What's happening in your neighborhood?"
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={6}
              style={{ marginBottom: 8, paddingBottom: 32 }}
              placeholder="Share your thoughts, report an issue, or announce an event..."
            />

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <Button 
                mode="outlined" 
                onPress={() => router.back()}
                style={{ marginRight: 8 }}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={handleCreatePost}
                disabled={!content.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.onPrimary} size={20} />
                ) : (
                  'Create Post'
                )}
              </Button>
            </View>
          </Card.Content>
        </Card>
        
        {/* Vulgar Content Warning Modal */}
        <VulgarContentWarning
          visible={showVulgarWarning}
          onDismiss={() => setShowVulgarWarning(false)}
          title={vulgarWarningData?.message || "⚠️ Content Warning"}
          message={vulgarWarningData?.message || "Posting vulgar content is against our policy."}
          description={vulgarWarningData?.description || "Vulgarity is not allowed. Strict action will be taken if this happens again."}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingBottom: 100, // Add bottom padding
  },
  card: {
    borderRadius: 12,
    elevation: 3,
  },
  locationContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  chipContainer: {
    marginBottom: 8,
  },
  presetsContainer: {
    marginBottom: 16,
  },
  presetsCard: {
    marginTop: 8,
    borderRadius: 8,
  },
  presetItem: {
    paddingVertical: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
}); 