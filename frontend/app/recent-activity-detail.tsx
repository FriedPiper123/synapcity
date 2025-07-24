import React from 'react';
import { View, ScrollView, StyleSheet, FlatList, Pressable } from 'react-native';
import { Card, Text, Chip, Avatar, IconButton, useTheme, Button } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PostCard } from '../components/PostCard';

export default function RecentActivityDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { activity } = useLocalSearchParams();
  let activityObj: any = {};
  try {
    activityObj = activity ? JSON.parse(activity as string) : {};
  } catch {
    activityObj = {};
  }

  const externalLinks = Array.isArray(activityObj.external_references) ? activityObj.external_references : [];
  const relatedPosts = Array.isArray(activityObj.related_posts) ? activityObj.related_posts : [];

  // Helper for external reference card
  const renderExternalReference = (item: any, idx: number) => (
    <Card key={idx} style={[styles.externalRefCard, { backgroundColor: theme.colors.surface, width: '100%' }]}
      onPress={() => item.link && router.push(item.link)}>
      <Card.Content style={{ flexDirection: 'row', alignItems: 'space-around', justifyContent: 'space-between', width: '100%' }}>
        {item.thumbnail ? (
          <Avatar.Image size={36} source={{ uri: item.thumbnail }} style={{ backgroundColor: theme.colors.primaryContainer, marginRight: 12 }} />
        ) : (
          <Avatar.Icon size={36} icon="link" style={{ backgroundColor: theme.colors.primaryContainer, marginRight: 12 }} color={theme.colors.primary} />
        )}
        <View style={{ flex: 1, minWidth: 0, maxWidth: '80%', alignItems: 'center', width: '100%' }}>
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            style={{
              color: theme.colors.primary,
              fontWeight: 'normal',
              fontSize: 15,
              textDecorationLine: 'underline',
            }}
          >
            {item.title}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  // Helper for related post card (matches SocialFeed design)
  const renderRelatedPost = (post: any) => {
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
    const badge = getPostBadge(post.type);
    return (
      <Pressable key={post.postId} onPress={() => router.push({ pathname: '/post', params: { postId: post.postId } })}>
        <Card
          style={[
            styles.relatedPostCard,
            {
              borderLeftColor: getPostColor(post.type),
              backgroundColor: theme.colors.surface
            }
          ]}
        >
          <Card.Content>
            <View style={styles.postHeader}>
                {post.author && post.author.profileImageUrl ? (
                  <Avatar.Image size={40} source={{ uri: post.author.profileImageUrl }} style={{ backgroundColor: theme.colors.primary }} />
                ) : (
                  <Avatar.Icon size={40} icon={'account-tie'} style={{ backgroundColor: theme.colors.primary }} />
                )}
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                    {post.author && post.author.username ? post.author.username : 'Anonymous'}
                  </Text>
                </View>
              <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}> 
                <Text style={{ color: badge.color, fontWeight: 'bold', fontSize: 12 }}>{post.type}</Text>
              </View>
            </View>
            <Text style={[styles.contentText, { color: theme.colors.onSurface }]}>{post.content}</Text>
            <View style={styles.actionsRow}>
              <MaterialCommunityIcons name="thumb-up" size={18} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.actionCount, { color: theme.colors.onSurfaceVariant }]}> {post.upvotes} </Text>
              <MaterialCommunityIcons name="comment-outline" size={18} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.actionCount, { color: theme.colors.onSurfaceVariant }]}>{post.commentCount}</Text>
            </View>
          </Card.Content>
        </Card>
      </Pressable>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <IconButton
        icon="arrow-left"
        size={28}
        style={styles.backButton}
        onPress={() => router.back()}
        accessibilityLabel="Back"
        iconColor={theme.colors.onSurface}
      />
      {/* Activity Title and Details */}
      <Card style={[styles.roundedCard, { backgroundColor: theme.colors.surface }]}> 
        <Card.Content>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>{activityObj.title}</Text>
          <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>{activityObj.content}</Text>
          <View style={styles.detailsRow}>
            <Chip icon="information" style={[styles.detailChip, { backgroundColor: theme.colors.surfaceVariant }]} textStyle={{ color: theme.colors.onSurfaceVariant }}>{activityObj.type}</Chip>
            <Chip icon="alert" style={[styles.detailChip, { backgroundColor: theme.colors.surfaceVariant }]} textStyle={{ color: theme.colors.onSurfaceVariant }}>{activityObj.severity}</Chip>
            <Chip icon="comment" style={[styles.detailChip, { backgroundColor: theme.colors.surfaceVariant }]} textStyle={{ color: theme.colors.onSurfaceVariant }}>{activityObj.counts || 0} posts</Chip>
            {activityObj.location && (
              <Chip icon="map-marker" style={[styles.detailChip, { backgroundColor: theme.colors.surfaceVariant }]} textStyle={{ color: theme.colors.onSurfaceVariant }}>{activityObj.location}</Chip>
            )}
          </View>
        </Card.Content>
      </Card>
      {/* External References */}
      {externalLinks.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>External References</Text>
          {externalLinks.map(renderExternalReference)}
        </View>
      )}
      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Related Posts</Text>
          {relatedPosts.map((post: any) => (
            <PostCard key={post.postId} post={post} onPress={() => router.push({ pathname: '/post', params: { postId: post.postId } })} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  roundedCard: {
    borderRadius: 18,
    marginBottom: 16,
    elevation: 3,
    overflow: 'hidden',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    marginBottom: 12,
    fontSize: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  detailChip: {
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginVertical: 8,
    marginLeft: 4,
  },
  externalRefCard: {
    borderRadius: 14,
    marginBottom: 10,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 0,
  },
  relatedPostCard: {
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
}); 