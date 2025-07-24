import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, useTheme, Card, ActivityIndicator } from 'react-native-paper';
import * as Location from 'expo-location';
import { SocialFeed } from '../../components/SocialFeed';
import { useLocation } from '../../contexts/LocationContext';

export default function FeedScreen() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const theme = useTheme();
  const { selectedLocation, getCurrentLocation } = useLocation();

  React.useEffect(() => {
    initializeLocation();
  }, []);

  const initializeLocation = async () => {
    try {
      setLoading(true);
      setError(null);

      // If no selected location, get current location
      if (!selectedLocation) {
        await getCurrentLocation();
      }
    } catch (err) {
      console.error('Error initializing location:', err);
      setError('Failed to get your location');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Card style={[styles.loadingCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.loadingContent}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 16, color: theme.colors.onSurface }}>
              Getting your location...
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Card style={[styles.errorCard, { backgroundColor: theme.colors.errorContainer }]}>
          <Card.Content>
            <Text style={{ color: theme.colors.onErrorContainer, textAlign: 'center' }}>
              {error}
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  if (!selectedLocation) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Card style={[styles.errorCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
              Unable to get your location. Please check your location settings.
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, height: '100%' }]}>
      <SocialFeed 
        latitude={selectedLocation.latitude} 
        longitude={selectedLocation.longitude} 
        radiusKm={5.0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 0, // Add bottom padding
  },
  loadingCard: {
    margin: 16,
    borderRadius: 12,
  },
  loadingContent: {
    alignItems: 'center',
    padding: 32,
  },
  errorCard: {
    margin: 16,
    borderRadius: 12,
  },
}); 