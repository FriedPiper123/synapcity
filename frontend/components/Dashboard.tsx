import { router } from 'expo-router';
import * as React from 'react';
import { ScrollView, StyleSheet, View, Alert, RefreshControl } from 'react-native';
import { Avatar, Card, FAB, List, Text, useTheme, ActivityIndicator, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import { AreaInsights } from './AreaInsights';
import { apiFetch } from '../app/api';
import { useLocation } from '../contexts/LocationContext';
import { useRouter } from 'expo-router';
import { Skeleton } from 'moti/skeleton';

interface DashboardStats {
  activeIssues: number;
  resolvedToday: number;
  communityPosts: number;
  activeCitizens: number;
  engagementPercentage: number;
  totalPosts: number;
  postTypes: Record<string, number>;
  statusCounts: Record<string, number>;
}

interface RecentActivity {
  id: string;
  type: 'issue' | 'event' | 'resolved' | 'post';
  title: string;
  time: string;
  severity: 'high' | 'medium' | 'low';
  content: string;
  authorId: string | null;
  upvotes: number;
  downvotes: number;
  commentCount: number;
}

// Function to extract username from JWT token
const extractUsernameFromToken = (token: string): string => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.name || 'User';
  } catch (error) {
    return 'User';
  }
};

export const Dashboard = () => {
  const [username, setUsername] = React.useState('User');
  const [showAreaInsights, setShowAreaInsights] = React.useState(false);
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = React.useState<RecentActivity[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const theme = useTheme();
  const { selectedLocation, currentLocation } = useLocation();
  const [refreshing, setRefreshing] = React.useState(false);
  const [areaInsightsRefreshKey, setAreaInsightsRefreshKey] = React.useState(0);
  const router = useRouter();

  React.useEffect(() => {
    // Extract username from token
    const token = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImE4ZGY2MmQzYTBhNDRlM2RmY2RjYWZjNmRhMTM4Mzc3NDU5ZjliMDEiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiQXl1c2ggQmlzaHQiLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jSl9jWUhWc1AyRU5VNFpZYjRUdXZCbFNQaU9hNjNKb1NHXzBLUXBONmFGOE1ZbmFBPXM5Ni1jIiwiaXNzIjoiaHR0cHM6Ly9zZWN1cmV0b2tlbi5nb29nbGUuY29tL2ZyaWVkcGlwZXI0MDQiLCJhdWQiOiJmcmllZHBpcGVyNDA0IiwiYXV0aF90aW1lIjoxNzUzMDQ2MjA4LCJ1c2VyX2lkIjoiQ2VqbkhTcFRWaE9KbTQ0UDZtYkpES00wWUc2MyIsInN1YiI6IkNlam5IU3BUVmhPSm00NFA2bWJKREtNMFlHNjMiLCJpYXQiOjE3NTMwNTE1MzcsImV4cCI6MTc1MzA1NTEzNywiZW1haWwiOiJheXVzaGJpc2h0MjExMjIwMDFAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTE4MDcxNTA5MDk3NTk3NTYyMjQiXSwiZW1haWwiOlsiYXl1c2hiaXNodDIxMTIyMDAxQGdtYWlsLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6Imdvb2dsZS5jb20ifX0.lD7F_mGmbwZ8KdwUOozuw30IWX9NSsISTosP0SCKEccW7EoRh4sjX99YW15gDYHhYUgp8t8trRjR2R6xD2YL88IUyjaPYWZbytPfJMwOHVWjkH9Q0oEmqLHh4Otu7hunTv1Vnmxyrq6tM1_w8UaLdG-RD0YgrCN8kMa8IRsdEU9fAvRUkuTnYQs7d6p-fKDtnOySksRYMiUi6EuuDn7xsAZmVwlqJ7q16W6wkS_IFwNWpLAoa93fWC9slYxNhC6bHy-v24E1thTpE1IZ2wBTsRZHIXPJDt6QpHFbQuypJ73W_9V2Ej61orL--xWJyuJYV3bGuf-_ywgLB7bh5m0Mcw";
    const extractedUsername = extractUsernameFromToken(token);
    setUsername(extractedUsername);
  }, []);

  React.useEffect(() => {
    if (selectedLocation) {
      fetchDashboardData();
    }
  }, [selectedLocation]);

  const fetchDashboardData = async () => {
    if (!selectedLocation) return;

    try {
      setLoading(true);
      setError(null);

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 65000); // 65 second timeout
      });

      // Fetch stats and activities in parallel
      const statsPromise = apiFetch(
        `http://192.168.1.5:8000/api/v1/dashboard/stats?latitude=${selectedLocation.latitude}&longitude=${selectedLocation.longitude}&radius_km=5.0`
      );
      
      const activitiesPromise = apiFetch(
        `http://192.168.1.5:8000/api/v1/dashboard/recent-activities?latitude=${selectedLocation.latitude}&longitude=${selectedLocation.longitude}&radius_km=5.0&limit=10`
      );

      // Race between timeout and API calls
      const [statsResponse, activitiesResponse] = await Promise.race([
        Promise.all([statsPromise, activitiesPromise]),
        // timeoutPromise
      ]) as [Response, Response];

      // Handle stats response
      if (!statsResponse.ok) {
        const errorText = await statsResponse.text();
        throw new Error(`Stats API error (${statsResponse.status}): ${errorText}`);
      }
      const statsData = await statsResponse.json();
      
      // Validate stats data
      if (!statsData || typeof statsData !== 'object') {
        throw new Error('Invalid stats data format received from server');
      }
      
      // Ensure required fields exist
      const requiredFields = ['activeIssues', 'resolvedToday', 'communityPosts', 'activeCitizens', 'engagementPercentage'];
      for (const field of requiredFields) {
        if (typeof statsData[field] !== 'number') {
          throw new Error(`Missing or invalid field: ${field}`);
        }
      }
      
      setStats(statsData);

      // Handle activities response
      if (!activitiesResponse.ok) {
        const errorText = await activitiesResponse.text();
        throw new Error(`Activities API error (${activitiesResponse.status}): ${errorText}`);
      }
      const activitiesData = await activitiesResponse.json();
      
      // Validate activities data
      if (!activitiesData || !Array.isArray(activitiesData.activities)) {
        throw new Error('Invalid activities data format received from server');
      }
      
      setRecentActivities(activitiesData.activities || []);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // Set fallback data for network errors
      if (errorMessage.includes('Network') || errorMessage.includes('fetch') || errorMessage.includes('timeout') || errorMessage.includes('API error')) {
        setStats({
          activeIssues: 0,
          resolvedToday: 0,
          communityPosts: 0,
          activeCitizens: 0,
          engagementPercentage: 0.0,
          totalPosts: 0,
          postTypes: {},
          statusCounts: {}
        });
        setRecentActivities([{
          id: "fallback-1",
          type: "issue",
          title: "No recent activities available",
          time: "Just now",
          severity: "medium",
          content: "Start posting to see activities here",
          authorId: null,
          upvotes: 0,
          downvotes: 0,
          commentCount: 0
        }]);
        setError(null); // Clear error when showing fallback data
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchDashboardData();
  };

  const toggleAreaInsights = () => {
    setShowAreaInsights(!showAreaInsights);
  };

  const getStatsDisplay = () => {
    if (!stats) return [];
    
    return [
      { 
        label: 'Active Issues', 
        value: stats.activeIssues.toString(), 
        icon: 'alert-circle-outline', 
        color: '#ef4444', 
        bgColor: '#fee2e2' 
      },
      { 
        label: 'Resolved Today', 
        value: stats.resolvedToday.toString(), 
        icon: 'check-circle-outline', 
        color: '#22c55e', 
        bgColor: '#dcfce7' 
      },
      { 
        label: 'Community Posts', 
        value: stats.communityPosts.toString(), 
        icon: 'message-text-outline', 
        color: '#3b82f6', 
        bgColor: '#dbeafe' 
      },
      { 
        label: 'Active Citizens', 
        value: stats.activeCitizens.toString(), 
        icon: 'account-group-outline', 
        color: '#a78bfa', 
        bgColor: '#ede9fe' 
      },
    ];
  };

  const getLocationName = () => {
    if (selectedLocation?.locationName) {
      return selectedLocation.locationName;
    }
    if (selectedLocation) {
      return `${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`;
    }
    return 'Current Location';
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setAreaInsightsRefreshKey(k => k + 1); // force AreaInsights to refresh
    fetchDashboardData().finally(() => setRefreshing(false));
  }, [fetchDashboardData]);

  const handleActivityPress = (activity) => {
    router.push({ pathname: '/recent-activity-detail', params: { activity: JSON.stringify(activity) } });
  };


  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Skeleton for Stats */}
        <Skeleton.Group show={true}>
          <Card style={[styles.welcomeCard, { backgroundColor: theme.colors.primary }]}> 
            <Card.Content style={styles.welcomeContent}>
              <Skeleton width={180} height={28} radius={8} colorMode={theme.dark ? 'dark' : 'light'} />
              <View style={{ marginTop: 12 }}>
                <Skeleton width={220} height={18} radius={8} colorMode={theme.dark ? 'dark' : 'light'} />
              </View>
              <View style={styles.welcomeStats}>
                <View style={{ marginTop: 16 }}>
                  <Skeleton width={120} height={18} radius={8} colorMode={theme.dark ? 'dark' : 'light'} />
                </View>
                <View style={{ marginTop: 16 }}>
                  <Skeleton width={120} height={18} radius={8} colorMode={theme.dark ? 'dark' : 'light'} />
                </View>
              </View>
            </Card.Content>
          </Card>
          <View style={styles.statsRow}>
            <Skeleton width={160} height={80} radius={12} colorMode={theme.dark ? 'dark' : 'light'} />
            <Skeleton width={160} height={80} radius={12} colorMode={theme.dark ? 'dark' : 'light'} />
          </View>
          <View style={styles.statsRow}>
            <Skeleton width={160} height={80} radius={12} colorMode={theme.dark ? 'dark' : 'light'} />
            <Skeleton width={160} height={80} radius={12} colorMode={theme.dark ? 'dark' : 'light'} />
          </View>
        </Skeleton.Group>
        {/* Skeleton for Activities */}
        <Skeleton.Group show={true}>
          <Card style={[styles.activityCard, { backgroundColor: theme.colors.surface }]}> 
            <Card.Title 
              title={<Skeleton width={120} height={20} radius={8} colorMode={theme.dark ? 'dark' : 'light'} />}
              subtitle={<Skeleton width={180} height={16} radius={8} colorMode={theme.dark ? 'dark' : 'light'} />}
            />
            <Card.Content>
              {[...Array(4)].map((_, i) => (
                <View key={i} style={{ marginBottom: 16 }}>
                  <Skeleton width={320} height={32} radius={12} colorMode={theme.dark ? 'dark' : 'light'} />
                </View>
              ))}
            </Card.Content>
          </Card>
        </Skeleton.Group>
      </ScrollView>
    );
  }

  if (error && !stats) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
        <Card style={[styles.errorCard, { backgroundColor: theme.colors.errorContainer }]}>
          <Card.Content style={styles.errorContent}>
            <MaterialCommunityIcons name="alert-circle" size={48} color={theme.colors.error} />
            <Text variant="titleMedium" style={{ color: theme.colors.onErrorContainer, marginTop: 16, textAlign: 'center' }}>
              Unable to load dashboard
            </Text>
            <Text style={{ color: theme.colors.onErrorContainer, marginTop: 8, textAlign: 'center', fontSize: 12 }}>
              {error}
            </Text>
            <Button 
              mode="contained" 
              onPress={handleRetry}
              style={{ marginTop: 16 }}
              icon="refresh"
            >
              Retry ({retryCount})
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  const statsDisplay = getStatsDisplay();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Card style={[styles.welcomeCard, { backgroundColor: theme.colors.primary }]}>
          <Card.Content style={styles.welcomeContent}>
            <View style={styles.welcomeHeader}>
              <Text variant="headlineMedium" style={{ color: 'white', fontWeight: 'bold', marginBottom: 4 }}>
                Welcome back, {username}!
              </Text>
              <Text style={{ color: '#dbeafe', marginBottom: 12, fontSize: 16 }}>
                Your city is thriving with community engagement
              </Text>
            </View>
            <View style={styles.welcomeStats}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="map-marker" size={20} color="white" />
                <Text style={{ color: 'white', marginLeft: 6, fontWeight: '500' }}>{getLocationName()}</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="trending-up" size={20} color="white" />
                <Text style={{ color: 'white', marginLeft: 6, fontWeight: '500' }}>
                  +{stats?.engagementPercentage || 0}% engagement
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
        
        {/* Area Insights Quick Summary */}
        {selectedLocation && (
          <Card style={[styles.areaInsightsCard, { backgroundColor: theme.colors.surface }]}> 
            <Card.Content>
              <View style={styles.areaInsightsHeader}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
                  Quick Summary
                </Text>
                <MaterialCommunityIcons 
                  name={showAreaInsights ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color={theme.colors.onSurface}
                  onPress={toggleAreaInsights}
                />
              </View>
              {showAreaInsights ? (
                <AreaInsights latitude={selectedLocation.latitude} longitude={selectedLocation.longitude} refreshKey={areaInsightsRefreshKey} />
              ) : (
                <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                  Tap to view detailed area insights
                </Text>
              )}
            </Card.Content>
          </Card>
        )}
        
        <View style={styles.statsRow}>
          {statsDisplay.slice(0, 2).map((stat, index) => (
            <Card key={index} style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <Card.Content style={styles.statContent}>
                <Avatar.Icon size={40} icon={stat.icon} style={{ backgroundColor: stat.bgColor }} color={stat.color} />
                <View style={styles.statText}>
                  <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
                    {stat.value}
                  </Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }} numberOfLines={2}>
                    {stat.label}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>
        <View style={styles.statsRow}>
          {statsDisplay.slice(2, 4).map((stat, index) => (
            <Card key={index + 2} style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <Card.Content style={styles.statContent}>
                <Avatar.Icon size={40} icon={stat.icon} style={{ backgroundColor: stat.bgColor }} color={stat.color} />
                <View style={styles.statText}>
                  <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
                    {stat.value}
                  </Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }} numberOfLines={2}>
                    {stat.label}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>
        
        <Card style={[styles.activityCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Title 
            title="Quick Feed" 
            titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
            subtitle="Latest community updates"
            subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
          />
          <Card.Content>
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <List.Item
                  key={activity.id || `activity-${index}`}
                  title={activity.title}
                  description={activity.content}
                  titleStyle={{ color: theme.colors.onSurface, fontWeight: '500' }}
                  descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                  left={props => (
                    <Avatar.Icon
                      {...props}
                      size={36}
                      icon={
                        activity.type === 'issue' ? 'alert-circle-outline' :
                        activity.type === 'resolved' ? 'check-circle-outline' :
                        activity.type === 'event' ? 'calendar-outline' :
                        'message-text-outline'
                      }
                      style={{ backgroundColor:
                        activity.type === 'issue' ? '#fee2e2' :
                        activity.type === 'resolved' ? '#dcfce7' : 
                        activity.type === 'event' ? '#fef3c7' : '#dbeafe'
                      }}
                      color={
                        activity.type === 'issue' ? '#ef4444' :
                        activity.type === 'resolved' ? '#22c55e' : 
                        activity.type === 'event' ? '#f59e0b' : '#3b82f6'
                      }
                    />
                  )}
                  right={props => (
                    <View style={{ alignSelf: 'center', paddingHorizontal: 8 }}>
                      <Text style={{
                        backgroundColor:
                          activity.severity === 'high' ? '#fee2e2' :
                          activity.severity === 'medium' ? '#fef9c3' : '#dcfce7',
                        color:
                          activity.severity === 'high' ? '#b91c1c' :
                          activity.severity === 'medium' ? '#b45309' : '#15803d',
                        borderRadius: 12,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        fontSize: 12,
                        fontWeight: 'bold',
                      }}>{activity.severity}</Text>
                    </View>
                  )}
                  onPress={() => handleActivityPress(activity)}
                />
              ))
            ) : (
              <View style={styles.noActivitiesContainer}>
                <MaterialCommunityIcons name="information" size={48} color={theme.colors.onSurfaceVariant} />
                <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 16, textAlign: 'center' }}>
                  No recent activities
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, textAlign: 'center' }}>
                  Start posting to see activities here
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
      
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/(tabs)/create')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingBottom: 100, // Add bottom padding
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100, // Add bottom padding
  },
  errorContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    paddingBottom: 100, // Add bottom padding
  },
  errorCard: {
    borderRadius: 12,
  },
  errorContent: {
    alignItems: 'center',
    padding: 32,
  },
  welcomeCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
  },
  welcomeContent: {
    paddingVertical: 8,
  },
  welcomeHeader: {
    marginBottom: 16,
  },
  welcomeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  areaInsightsCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  areaInsightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    elevation: 3,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  statText: {
    alignItems: 'flex-end',
    flex: 1,
    marginLeft: 8,
  },
  activityCard: {
    borderRadius: 12,
    elevation: 3,
  },
  noActivitiesContainer: {
    alignItems: 'center',
    padding: 32,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
}); 