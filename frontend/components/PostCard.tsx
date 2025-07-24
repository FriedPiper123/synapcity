import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Card, Text, Avatar, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface PostCardProps {
  post: any;
  onPress?: () => void;
  showActions?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onPress, showActions = true }) => {
  const theme = useTheme();
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
    <Pressable onPress={onPress}>
      <Card
        style={[
          styles.card,
          {
            borderLeftColor: getPostColor(post.type),
            backgroundColor: theme.colors.surface
          }
        ]}
      >
        <Card.Content>
          <View style={styles.header}>
            <Avatar.Icon size={40} icon={'account-tie'} style={{ backgroundColor: theme.colors.primary }} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                {post.authorId === 'anonymous' ? 'Anonymous' : post.authorId}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <MaterialCommunityIcons name="clock-outline" size={14} color={theme.colors.onSurfaceVariant} />
                <Text style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}>{new Date(post.createdAt).toLocaleString()}</Text>
                <Text style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}>•</Text>
                <MaterialCommunityIcons name="map-marker-outline" size={14} color={theme.colors.onSurfaceVariant} />
                <Text style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}>{post.neighborhood}</Text>
              </View>
            </View>
            <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}> 
              <Text style={{ color: badge.color, fontWeight: 'bold', fontSize: 12 }}>{post.type}</Text>
            </View>
          </View>
          <Text style={[styles.contentText, { color: theme.colors.onSurface }]}>{post.content}</Text>
          {showActions && (
            <View style={styles.actionsRow}>
              <MaterialCommunityIcons name="thumb-up" size={18} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.actionCount, { color: theme.colors.onSurfaceVariant }]}> {post.upvotes} </Text>
              <MaterialCommunityIcons name="comment-outline" size={18} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.actionCount, { color: theme.colors.onSurfaceVariant }]}>{post.commentCount}</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2,
  },
  header: {
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