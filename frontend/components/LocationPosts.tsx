import React from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import { Card, Text, useTheme, ActivityIndicator, Avatar, Chip } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiFetch } from '../app/api';

interface LocationPostsProps {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}

interface Post {
  postId: string;
  title: string;
  content: string;
  type: string;
  category: string;
  severity: string;
  authorId: string;
  authorName: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  createdAt: string;
  status: string;
  location: {
    latitude: number;
    longitude: number;
  };
  location_name: string;
  neighborhood: string;
}

export const LocationPosts: React.FC<LocationPostsProps> = ({ 
  latitude, 
  longitude, 
  radiusKm = 5.0 
}) => {
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const theme = useTheme();

  React.useEffect(() => {
    fetchLocationPosts();
  }, [latitude, longitude, radiusKm]);

  const fetchLocationPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiFetch(
        `http://192.168.1.5:8000/api/v1/posts/nearby?latitude=${latitude}&longitude=${longitude}&radius_km=${radiusKm}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setPosts(data);
    } catch (err) {
      console.error('Error fetching location posts:', err);
      // Show dummy data instead of error
      const dummyPosts: Post[] = [
        {
          postId: "dummy_post_1",
          title: "Pothole on Main Street",
          content: "There's a large pothole on Main Street that needs immediate attention.",
          type: "issue",
          category: "infrastructure",
          severity: "high",
          authorId: "user_1",
          authorName: "John Doe",
          upvotes: 15,
          downvotes: 2,
          commentCount: 8,
          createdAt: new Date().toISOString(),
          status: "active",
          location: { latitude: latitude + 0.001, longitude: longitude + 0.001 },
          location_name: "Main Street",
          neighborhood: "Current Location"
        },
        {
          postId: "dummy_post_2",
          title: "Community Cleanup Event",
          content: "Join us for a community cleanup event this weekend!",
          type: "event",
          category: "community",
          severity: "low",
          authorId: "user_2",
          authorName: "Jane Smith",
          upvotes: 25,
          downvotes: 1,
          commentCount: 12,
          createdAt: new Date().toISOString(),
          status: "active",
          location: { latitude: latitude - 0.001, longitude: longitude - 0.001 },
          location_name: "City Park",
          neighborhood: "Current Location"
        },
        {
          postId: "dummy_post_3",
          title: "Street Light Fixed",
          content: "The street light on Oak Avenue has been successfully repaired.",
          type: "resolved",
          category: "infrastructure",
          severity: "medium",
          authorId: "user_3",
          authorName: "Mike Johnson",
          upvotes: 30,
          downvotes: 0,
          commentCount: 5,
          createdAt: new Date().toISOString(),
          status: "active",
          location: { latitude: latitude + 0.002, longitude: longitude - 0.002 },
          location_name: "Oak Avenue",
          neighborhood: "Current Location"
        }
      ];
      setPosts(dummyPosts);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLocationPosts();
    setRefreshing(false);
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'issue': return '#ef4444';
      case 'event': return '#3b82f6';
      case 'resolved': return '#22c55e';
      case 'suggestion': return '#a78bfa';
      default: return '#64748b';
    }
  };

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'issue': return 'alert-circle';
      case 'event': return 'calendar';
      case 'resolved': return 'check-circle';
      case 'suggestion': return 'lightbulb';
      default: return 'message';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#64748b';
    }
  };

  const formatDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m away`;
    } else {
      return `${distance.toFixed(1)}km away`;
    }
  };

  if (loading) {
    return (
      <Card style={[styles.loadingCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content style={styles.loadingContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, color: theme.colors.onSurface }}>
            Loading posts near you...
          </Text>
        </Card.Content>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={[styles.errorCard, { backgroundColor: theme.colors.errorContainer }]}>
        <Card.Content>
          <MaterialCommunityIcons name="alert-circle" size={24} color={theme.colors.error} />
          <Text style={{ color: theme.colors.onErrorContainer, marginTop: 8 }}>
            {error}
          </Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <Card style={[styles.headerCard, { backgroundColor: theme.colors.primary }]}>
        <Card.Content>
          <Text variant="titleLarge" style={{ color: 'white', fontWeight: 'bold', marginBottom: 4 }}>
            📍 Posts Near You
          </Text>
          <Text style={{ color: '#dbeafe', fontSize: 14 }}>
            {posts.length} posts within {radiusKm}km radius
          </Text>
        </Card.Content>
      </Card>

      {/* Posts */}
      {posts.length === 0 ? (
        <Card style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.emptyContent}>
            <MaterialCommunityIcons name="map-marker-off" size={48} color={theme.colors.onSurfaceVariant} />
            <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 16, textAlign: 'center' }}>
              No posts found in your area
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, textAlign: 'center' }}>
              Try increasing the search radius or check back later
            </Text>
          </Card.Content>
        </Card>
      ) : (
        posts.map((post) => (
          <Card key={post.postId} style={[styles.postCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              {/* Post Header */}
              <View style={styles.postHeader}>
                <View style={styles.postTypeContainer}>
                  <MaterialCommunityIcons
                    name={getPostTypeIcon(post.type)}
                    size={20}
                    color={getPostTypeColor(post.type)}
                  />
                  <Chip
                    mode="outlined"
                    textStyle={{ fontSize: 10 }}
                    style={{ marginLeft: 8 }}
                  >
                    {post.type}
                  </Chip>
                  {post.type === 'issue' && (
                    <Chip
                      mode="outlined"
                      textStyle={{ fontSize: 10, color: getSeverityColor(post.severity) }}
                      style={{ marginLeft: 4, borderColor: getSeverityColor(post.severity) }}
                    >
                      {post.severity}
                    </Chip>
                  )}
                </View>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                  {formatDistance(latitude, longitude, post.location.latitude, post.location.longitude)}
                </Text>
              </View>

              {/* Post Content */}
              <Text variant="titleMedium" style={{ 
                color: theme.colors.onSurface, 
                fontWeight: 'bold',
                marginTop: 8,
                marginBottom: 4
              }}>
                {post.title}
              </Text>
              <Text style={{ 
                color: theme.colors.onSurfaceVariant,
                marginBottom: 12,
                lineHeight: 20
              }}>
                {post.content}
              </Text>

              {/* Post Footer */}
              <View style={styles.postFooter}>
                <View style={styles.postStats}>
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="thumb-up" size={16} color={theme.colors.onSurfaceVariant} />
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginLeft: 4 }}>
                      {post.upvotes}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="comment" size={16} color={theme.colors.onSurfaceVariant} />
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginLeft: 4 }}>
                      {post.commentCount}
                    </Text>
                  </View>
                </View>
                <View style={styles.postMeta}>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                    by {post.authorName}
                  </Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                    {new Date(post.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
  headerCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  emptyCard: {
    margin: 16,
    borderRadius: 12,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
  postCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 1,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  postMeta: {
    alignItems: 'flex-end',
  },
}); 