import React from 'react';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View, RefreshControl, Modal, TextInput, Alert, Pressable } from 'react-native';
import { Avatar, Button, Card, FAB, IconButton, Text, useTheme, Portal, Dialog } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import { apiFetch } from '../app/api';
import VulgarContentWarning from './VulgarContentWarning';
import { useLocation } from '../contexts/LocationContext';
import { PostCard } from './PostCard';

interface SocialFeedProps {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

export const SocialFeed: React.FC<SocialFeedProps> = ({ 
  latitude, 
  longitude, 
  radiusKm = 5.0 
}) => {
  const [posts, setPosts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [likedPosts, setLikedPosts] = React.useState<string[]>([]);
  const [commentDialogVisible, setCommentDialogVisible] = React.useState(false);
  const [commentText, setCommentText] = React.useState('');
  const [commentingPostId, setCommentingPostId] = React.useState<string | null>(null);
  const [commentsMap, setCommentsMap] = React.useState<Record<string, any[]>>({});
  const [showVulgarWarning, setShowVulgarWarning] = React.useState(false);
  const [vulgarWarningData, setVulgarWarningData] = React.useState<any>(null);
  const theme = useTheme();
  const { selectedLocation } = useLocation();

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to view nearby posts.');
        return null;
      }

      let location = await Location.getCurrentPositionAsync({});
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Could not get your current location.');
      return null;
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let res;
      
      // Use selected location, then props, then current location
      let currentLocation = selectedLocation;
      if (!currentLocation && (latitude && longitude)) {
        currentLocation = { latitude, longitude };
      }
      if (!currentLocation) {
        currentLocation = await getCurrentLocation();
      }

      if (currentLocation) {
        // Use location-based posts API
        res = await apiFetch(`http://192.168.1.5:8000/api/v1/posts/nearby?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}&radius_km=${radiusKm}`);
      } else {
        // Fallback to neighborhood posts if location is not available
        res = await apiFetch('http://192.168.1.5:8000/api/v1/posts/Downtown');
      }
      
      const data = await res.json();
      setPosts(data);
      
      // Fetch top/latest comment for each post
      const commentsObj: Record<string, any[]> = {};
      await Promise.all(
        data.map(async (post: any) => {
          const res = await apiFetch(`http://192.168.1.5:8000/api/v1/posts/${post.postId}/comments?limit=10`);
          if (res.ok) {
            const comments = await res.json();
            commentsObj[post.postId] = comments;
          } else {
            commentsObj[post.postId] = [];
          }
        })
      );
      setCommentsMap(commentsObj);
    } catch (err) {
      setPosts([]);
      setCommentsMap({});
    }
    setLoading(false);
  };

  React.useEffect(() => {
    fetchPosts();
  }, [selectedLocation]); // Re-fetch when selected location changes

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const getPostColor = (type: string) => {
    switch (type) {
      case 'issue': return '#ef4444';
      case 'resolved': return '#22c55e';
      case 'event': return '#3b82f6';
      case 'suggestion': return '#a78bfa';
      default: return '#64748b';
    }
  };

  const getPostBadge = (type: string) => {
    switch (type) {
      case 'issue': return { backgroundColor: '#fee2e2', color: '#b91c1c' };
      case 'resolved': return { backgroundColor: '#dcfce7', color: '#15803d' };
      case 'event': return { backgroundColor: '#dbeafe', color: '#1e40af' };
      case 'suggestion': return { backgroundColor: '#ede9fe', color: '#6d28d9' };
      default: return { backgroundColor: '#f3f4f6', color: '#374151' };
    }
  };

  const toggleLike = async (postId: string) => {
    try {
      setLikedPosts(prev =>
        prev.includes(postId)
          ? prev.filter(id => id !== postId)
          : [...prev, postId]
      );
      const res = await apiFetch(`http://192.168.1.5:8000/api/v1/posts/${postId}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to upvote');
      await fetchPosts(); // Refresh to update upvote count
    } catch (err) {
      Alert.alert('Error', 'Could not upvote post.');
    }
  };

  const openCommentDialog = (postId: string) => {
    setCommentingPostId(postId);
    setCommentText('');
    setCommentDialogVisible(true);
  };

  const handleCommentSubmit = async () => {
    if (!commentingPostId || !commentText.trim()) return;
    try {
      const res = await apiFetch(`http://192.168.1.5:8000/api/v1/posts/${commentingPostId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        if (errorData['detail']['code'] === 'VULGAR_CONTENT_DETECTED') {
          setVulgarWarningData(errorData['detail']);
          setShowVulgarWarning(true);
          setCommentText('');
          return;
        }
        throw new Error('Failed to comment');
      }
      
      setCommentDialogVisible(false);
      setCommentText('');
      setCommentingPostId(null);
      await fetchPosts(); // Refresh to show new comment count
    } catch (err) {
      Alert.alert('Error', 'Could not add comment.');
    }
  };

  // Helper to get most liked or latest comment
  const getTopComment = (comments: any[]) => {
    if (!comments || comments.length === 0) return null;
    // Try to get most liked, fallback to latest
    const sorted = [...comments].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    return sorted[0];
  };

  const handlePostPress = (postId: string) => {
    router.push({ pathname: '/post', params: { postId } });
  };

  const handleCommentPress = (commentId: string) => {
    // Treat comments as posts - navigate directly to the comment
    router.push({ 
      pathname: '/post', 
      params: { 
        postId: commentId
      } 
    });
  };

  const openCommentOnCommentDialog = (commentId: string) => {
    setCommentingPostId(commentId);
    setCommentText('');
    setCommentDialogVisible(true);
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

  return (
    <View style={{ flex: 1, height: '100%'}}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Card style={[styles.headerCard, { backgroundColor: theme.colors.surface }]}> 
          <Card.Content>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 4, color: theme.colors.onSurface }}>
              Posts Near You
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
              Stay updated with what's happening in your area
            </Text>
            {/* {selectedLocation && (
              <View style={[styles.locationContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                <Text style={{ color: theme.colors.onPrimaryContainer, fontSize: 12 }}>
                  📍 Showing posts from: {getLocationName()}
                </Text>
              </View>
            )} */}
          </Card.Content>
        </Card>
        {loading ? (
          <Text style={{ textAlign: 'center', marginTop: 32 }}>Loading...</Text>
        ) : posts.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 32 }}>No posts found.</Text>
        ) : posts.map((post) => (
          <PostCard
            key={post.postId}
            post={post}
            onPress={() => handlePostPress(post.postId)}
          />
        ))}
        {/* <View style={{ alignItems: 'center', marginVertical: 16 }}>
          <Button mode="outlined" style={{ borderColor: theme.colors.primary }}>
            Load More Posts
          </Button>
        </View> */}
      </ScrollView>
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/(tabs)/create')}
      />
      <Portal>
        <Dialog visible={commentDialogVisible} onDismiss={() => setCommentDialogVisible(false)}>
          <Dialog.Title>Add a Comment</Dialog.Title>
          <Dialog.Content>
            <TextInput
              placeholder="Comment"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              numberOfLines={3}
              style={{ marginBottom: 8 }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCommentDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleCommentSubmit}>Post</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Vulgar Content Warning Modal */}
      <VulgarContentWarning
        visible={showVulgarWarning}
        onDismiss={() => setShowVulgarWarning(false)}
        title={vulgarWarningData?.message || "⚠️ Content Warning"}
        message={vulgarWarningData?.message || "Posting vulgar content is against our policy."}
        description={vulgarWarningData?.description || "Vulgarity is not allowed. Strict action will be taken if this happens again."}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 1000,
    padding: 16,
    paddingBottom: 10 // Add bottom padding
  },
  headerCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  locationContainer: {
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  postCard: {
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  contentText: {
    marginBottom: 8,
    marginTop: 4,
    fontSize: 15,
    lineHeight: 22,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  actionCount: {
    marginRight: 8,
    fontWeight: 'bold',
  },
  metaText: {
    fontSize: 12,
    marginLeft: 4,
    marginRight: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
}); 