import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { Surface, Text, Button, Card, useTheme, TextInput, Avatar, Chip, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { apiFetch } from './api';
import VulgarContentWarning from '../components/VulgarContentWarning';

// Mock helpers for avatars, badges, levels, impact, and post type
const getAvatar = (user: any) => user === 'anonymous' ? '👤' : '🧑';
const getLevel = (user: any) => {
  if (user === 'City Works Dept') return 'Municipal';
  if (user === 'Community Center') return 'Event Organizer';
  return 'Citizen'; // Default to Citizen for all other users
};
const getBadges = (user: any) => user === 'City Works Dept' ? ['🚧'] : user === 'Community Center' ? ['🌿'] : [];
const getImpact = () => Math.floor(Math.random() * 50) + 50;
const getType = () => ['issue', 'resolved', 'event'][Math.floor(Math.random()*3)];
const getLocation = () => 'Downtown';
const getPostTypeColor = (type: any) => type === 'issue' ? '#f87171' : type === 'resolved' ? '#34d399' : '#60a5fa';

// This is the Post details screen
export default function PostScreen() {
  const { postId, parentPostId } = useLocalSearchParams();
  const theme = useTheme();
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [parentPost, setParentPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random()*20)+5);
  const [commentCount, setCommentCount] = useState(comments.length);
  const [shareCount, setShareCount] = useState(Math.floor(Math.random()*10)+1);
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [showVulgarWarning, setShowVulgarWarning] = useState(false);
  const [vulgarWarningData, setVulgarWarningData] = useState<any>(null);

  const fetchPostAndComments = async () => {
    if (postId) {
      setLoading(true);
      try {
        // First, try to fetch the post directly using the new API
        const postRes = await apiFetch(`http://192.168.1.5:8000/api/v1/posts/post/${postId}`);
        
        if (postRes.ok) {
          const postData = await postRes.json();
          setPost(postData);
          console.log('postData', postData);
          
          // Check if this post has a parentId (meaning it's a comment)
          if (postData.parentId) {
            // This is a comment, fetch the parent post
            const parentRes = await apiFetch(`http://192.168.1.5:8000/api/v1/posts/post/${postData.parentId}`);
            if (parentRes.ok) {
              const parentData = await parentRes.json();
              setParentPost(parentData);
            }
            
        
          } else {
            // This is a regular post, fetch its comments
            setParentPost(null);
          }
          
          const commentsRes = await apiFetch(`http://192.168.1.5:8000/api/v1/posts/${postId}/comments?limit=100`);
          const commentsData = await commentsRes.json();
          setComments(commentsData || []);
       
        } else {
          // Post not found
          setPost(null);
          setParentPost(null);
          setComments([]);
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        setPost(null);
        setParentPost(null);
        setComments([]);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostAndComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleCommentSubmit = async () => {
    if (!commentText.trim() || !postId) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`http://192.168.1.5:8000/api/v1/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText }),
      });
      
      console.log('res', res.json());
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
      
      setCommentText('');
      await fetchPostAndComments();
    } catch (err) {
      console.error('Error submitting comment:', err);
    }
    setSubmitting(false);
  };

  const handleLike = async () => {
    try {
      // Toggle the liked state immediately for UI responsiveness
      setLiked(l => !l);
      setLikeCount(c => liked ? c-1 : c+1);
      
      // Make API call to like/unlike the post
      const res = await apiFetch(`http://192.168.1.5:8000/api/v1/posts/${postId}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!res.ok) {
        // Revert the UI state if API call fails
        setLiked(l => !l);
        setLikeCount(c => liked ? c+1 : c-1);
        throw new Error('Failed to like post');
      }
      
      // Refresh the post to get updated like count
      await fetchPostAndComments();
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };
  const handleCommentLike = async (id: string) => {
    try {
      // Toggle the liked state immediately for UI responsiveness
      setLikedComments(prev => ({...prev, [id]: !prev[id]}));
      
      // Make API call to like/unlike the comment
      const res = await apiFetch(`http://192.168.1.5:8000/api/v1/posts/${id}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!res.ok) {
        // Revert the UI state if API call fails
        setLikedComments(prev => ({...prev, [id]: !prev[id]}));
        throw new Error('Failed to like comment');
      }
      
      // Refresh the comments to get updated like counts
      await fetchPostAndComments();
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };
  const handleToggleReplies = (id: string) => {
    setExpandedReplies(prev => ({...prev, [id]: !prev[id]}));
  };

  const handleCommentPress = (commentId: string) => {
    console.log('commentId', commentId);
    console.log('parentPostId', parentPostId);

    router.push({ 
      pathname: '/post', 
      params: { 
        postId: commentId,
        parentPostId: postId 
      } 
    });
  };

  if (!postId) {
    return (
      <Surface style={[styles.container, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>Post</Text>
        <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
      </Surface>
    );
  }

  if (loading) {
    return (
      <Surface style={[styles.container, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>Loading...</Text>
      </Surface>
    );
  }

  if (!post) {
    return (
      <Surface style={[styles.container, { backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center' }]} elevation={2}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface, marginBottom: 16 }]}>Post or comment not found.</Text>
        <Button mode="contained" onPress={() => router.push('/feed')}>Go to Feed</Button>
        <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
      </Surface>
    );
  }

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.surface }]} elevation={2}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <View style={styles.backButtonContainer}>
          <Button 
            icon="arrow-left" 
            mode="outlined" 
            onPress={() => router.back()} 
            style={styles.backButton}
            textColor={theme.colors.onSurface}
          >
            Back
          </Button>
        </View>

        {/* Main Post */}
        <Card style={[styles.postCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.postHeader}>
              <Avatar.Text size={48} label={getAvatar(post.authorId)} style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]} />
              <View style={styles.postInfo}>
                <View style={styles.authorRow}>
                  <Text style={[styles.authorName, { color: theme.colors.onSurface }]}>
                    {post.authorId === 'anonymous' ? 'Anonymous' : post.authorId}
                  </Text>
                  {getBadges(post.authorId).map((b, i) => (
                    <Text key={i} style={styles.badge}>{b}</Text>
                  ))}
                </View>
                <View style={styles.metaRow}>
                  <Chip 
                    style={[styles.levelChip, { backgroundColor: theme.colors.secondaryContainer }]}
                    textStyle={{ color: theme.colors.onSecondaryContainer }}
                  >
                    {getLevel(post.authorId)}
                  </Chip>
                  <Text style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}>{new Date(post.createdAt).toLocaleString()}</Text>
                  <Text style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}>• {getLocation()}</Text>
                </View>
              </View>
            </View>
            <Text style={[styles.postContent, { color: theme.colors.onSurface }]}>{post.content}</Text>
            
            {/* Parent Post (if viewing a comment) - Show within the same card */}
            {parentPost && (
              <View style={styles.parentPostInline}>
                {/* Thread line connecting to parent */}
                <View style={[styles.threadLineInline, { backgroundColor: theme.colors.outline }]} />
                
                <Pressable onPress={() => router.push({ pathname: '/post', params: { postId: parentPost.postId } })}>
                  <View style={[styles.parentPostInlineContent, { backgroundColor: theme.colors.surfaceVariant, borderLeftWidth: 3, borderLeftColor: theme.colors.primary }]}>
                    <View style={styles.parentPostHeader}>
                      <Avatar.Text size={36} label={getAvatar(parentPost.authorId)} style={[styles.parentAvatar, { backgroundColor: theme.colors.primaryContainer }]} />
                      <View style={styles.parentPostInfo}>
                        <View style={styles.parentAuthorRow}>
                          <Text style={[styles.parentAuthorName, { color: theme.colors.onSurface }]}>
                            {parentPost.authorId === 'anonymous' ? 'Anonymous' : parentPost.authorId}
                          </Text>
                          {getBadges(parentPost.authorId).map((b, i) => (
                            <Text key={i} style={styles.parentBadge}>{b}</Text>
                          ))}
                        </View>
                        <View style={styles.parentMetaRow}>
                          <Chip 
                            style={[styles.parentLevelChip, { backgroundColor: theme.colors.secondaryContainer }]}
                            textStyle={{ color: theme.colors.onSecondaryContainer }}
                          >
                            {getLevel(parentPost.authorId)}
                          </Chip>
                          <Text style={[styles.parentMetaText, { color: theme.colors.onSurfaceVariant }]}>{new Date(parentPost.createdAt).toLocaleString()}</Text>
                          <Text style={[styles.parentMetaText, { color: theme.colors.onSurfaceVariant }]}>• {getLocation()}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={[styles.parentPostContent, { color: theme.colors.onSurface }]} numberOfLines={3} ellipsizeMode="tail">
                      {parentPost.content}
                    </Text>
                    <View style={styles.parentPostActions}>
                      <Text style={[styles.threadLabel, { color: theme.colors.primary }]}>
                        Thread from this post
                      </Text>
                      <IconButton
                        icon="arrow-up"
                        iconColor={theme.colors.primary}
                        size={16}
                        onPress={() => router.push({ pathname: '/post', params: { postId: parentPost.postId } })}
                      />
                    </View>
                  </View>
                </Pressable>
              </View>
            )}
          </Card.Content>
          
          {/* Stats Row */}
          <View style={[styles.statsRow, { borderColor: theme.colors.outline }]}>
            <View style={styles.statItem}>
              <IconButton 
                icon={liked ? 'heart' : 'heart-outline'} 
                iconColor={liked ? '#ef4444' : theme.colors.onSurfaceVariant} 
                size={24} 
                onPress={handleLike} 
              />
              <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>{post.upvotes || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <IconButton icon="comment-outline" iconColor={theme.colors.primary} size={24} />
              <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>{post.commentCount || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <IconButton icon="share-outline" iconColor={theme.colors.tertiary} size={24} />
              <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>{shareCount}</Text>
            </View>
          </View>
        </Card>

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          <TextInput
            placeholder="Add a comment..."
            value={commentText}
            onChangeText={setCommentText}
            style={[styles.commentInput, { backgroundColor: theme.colors.surfaceVariant }]}
            multiline
            numberOfLines={3}
            textColor={theme.colors.onSurface}
            placeholderTextColor={theme.colors.onSurfaceVariant}
          />
          <Button 
            mode="contained" 
            onPress={handleCommentSubmit} 
            disabled={!commentText.trim() || submitting} 
            loading={submitting} 
            style={styles.commentButton}
          >
            Post
          </Button>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text variant="titleMedium" style={[styles.commentsTitle, { color: theme.colors.onSurface }]}>
            Comments ({comments.length})
          </Text>
          
          {comments.length === 0 ? (
            <Text style={[styles.noCommentsText, { color: theme.colors.onSurfaceVariant }]}>No comments yet.</Text>
          ) : (
            <View style={styles.commentsList}>
              {comments.map((comment, idx) => (
                <Pressable key={comment.postId || idx} onPress={() => handleCommentPress(comment.postId)}>
                  <Card style={[styles.commentCard, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                      <View style={styles.commentHeader}>
                        <Avatar.Text size={32} label={getAvatar(comment.authorId)} style={[styles.commentAvatar, { backgroundColor: theme.colors.primaryContainer }]} />
                        <View style={styles.commentInfo}>
                          <View style={styles.commentAuthorRow}>
                            <Text style={[styles.commentAuthorName, { color: theme.colors.onSurface }]}>
                              {comment.authorId === 'anonymous' ? 'Anonymous' : comment.authorId}
                            </Text>
                            {getBadges(comment.authorId).map((b, i) => (
                              <Text key={i} style={styles.commentBadge}>{b}</Text>
                            ))}
                            {comment.official && (
                              <Chip style={[styles.officialChip, { backgroundColor: theme.colors.primary }]}>OFFICIAL</Chip>
                            )}
                          </View>
                          <View style={styles.commentMetaRow}>
                            <Chip 
                              style={[styles.commentLevelChip, { backgroundColor: theme.colors.secondaryContainer }]}
                              textStyle={{ color: theme.colors.onSecondaryContainer }}
                            >
                              {getLevel(comment.authorId)}
                            </Chip>
                            <Text style={[styles.commentMetaText, { color: theme.colors.onSurfaceVariant }]}>
                              {new Date(comment.createdAt).toLocaleString()}
                            </Text>
                          </View>
                        </View>
                      </View>
                      
                      <Text style={[styles.commentContent, { color: theme.colors.onSurface }]} numberOfLines={4} ellipsizeMode="tail">
                        {comment.content}
                      </Text>
                      
                      <View style={styles.commentActions}>
                        <View style={styles.commentActionItem}>
                          <IconButton 
                            icon={likedComments[comment.postId] ? 'heart' : 'heart-outline'} 
                            iconColor={likedComments[comment.postId] ? '#ef4444' : theme.colors.onSurfaceVariant} 
                            size={18} 
                            onPress={() => handleCommentLike(comment.postId)} 
                          />
                          <Text style={[styles.commentActionText, { color: theme.colors.onSurfaceVariant }]}>{comment.upvotes || 0}</Text>
                        </View>
                        <IconButton
                          icon="comment-outline"
                          iconColor={theme.colors.primary}
                          size={18}
                          onPress={() => handleCommentPress(comment.postId)}
                          style={{ marginLeft: 8 }}
                          accessibilityLabel="Open this comment as a post"
                        />
                        {comment.commentCount > 0 && (
                          <Button 
                            compact 
                            onPress={() => handleToggleReplies(comment.postId)} 
                            style={styles.repliesButton}
                            textColor={theme.colors.primary}
                          >
                            {expandedReplies[comment.postId] ? 'Hide Replies' : `View Replies (${comment.commentCount})`}
                          </Button>
                        )}
                      </View>

                      {/* Nested Replies */}
                      {expandedReplies[comment.postId] && comment.commentCount > 0 && (
                        <View style={styles.repliesContainer}>
                          {comments.filter((reply: any) => reply.parentId === comment.postId).map((reply: any, ridx: number) => (
                            <Card key={reply.postId || ridx} style={[styles.replyCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                              <Card.Content>
                                <View style={styles.replyHeader}>
                                  <Avatar.Text size={24} label={getAvatar(reply.authorId)} style={[styles.replyAvatar, { backgroundColor: theme.colors.primaryContainer }]} />
                                  <View style={styles.replyInfo}>
                                    <View style={styles.replyAuthorRow}>
                                      <Text style={[styles.replyAuthorName, { color: theme.colors.onSurface }]}>
                                        {reply.authorId === 'anonymous' ? 'Anonymous' : reply.authorId}
                                      </Text>
                                      {getBadges(reply.authorId).map((b, i) => (
                                        <Text key={i} style={styles.replyBadge}>{b}</Text>
                                      ))}
                                      {reply.official && (
                                        <Chip style={[styles.replyOfficialChip, { backgroundColor: theme.colors.primary }]}>OFFICIAL</Chip>
                                      )}
                                    </View>
                                    <View style={styles.replyMetaRow}>
                                      <Chip 
                                        style={[styles.replyLevelChip, { backgroundColor: theme.colors.secondaryContainer }]}
                                        textStyle={{ color: theme.colors.onSecondaryContainer }}
                                      >
                                        {getLevel(reply.authorId)}
                                      </Chip>
                                      <Text style={[styles.replyMetaText, { color: theme.colors.onSurfaceVariant }]}>
                                        {new Date(reply.createdAt).toLocaleString()}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                                
                                <Text style={[styles.replyContent, { color: theme.colors.onSurface }]}>{reply.content}</Text>
                                
                                <View style={styles.replyActions}>
                                  <IconButton 
                                    icon={likedComments[reply.postId] ? 'heart' : 'heart-outline'} 
                                    iconColor={likedComments[reply.postId] ? '#ef4444' : theme.colors.onSurfaceVariant} 
                                    size={16} 
                                    onPress={() => handleCommentLike(reply.postId)} 
                                  />
                                  <Text style={[styles.replyActionText, { color: theme.colors.onSurfaceVariant }]}>{reply.upvotes || 0}</Text>
                                  <IconButton
                                    icon="comment-outline"
                                    iconColor={theme.colors.primary}
                                    size={16}
                                    onPress={() => handleCommentPress(reply.postId)}
                                    style={{ marginLeft: 8 }}
                                    accessibilityLabel="Open this reply as a post"
                                  />
                                </View>
                              </Card.Content>
                            </Card>
                          ))}
                        </View>
                      )}
                    </Card.Content>
                  </Card>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Vulgar Content Warning Modal */}
      <VulgarContentWarning
        visible={showVulgarWarning}
        onDismiss={() => setShowVulgarWarning(false)}
        title={vulgarWarningData?.message || "⚠️ Content Warning"}
        message={vulgarWarningData?.message || "Posting vulgar content is against our policy."}
        description={vulgarWarningData?.description || "Vulgarity is not allowed. Strict action will be taken if this happens again."}
      />
      
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  backButtonContainer: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  backButton: {
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  parentPostCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  parentPostHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  parentPostLabel: {
    fontWeight: '600',
  },
  postCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatar: {
    marginRight: 12,
  },
  postInfo: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  authorName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  badge: {
    marginLeft: 4,
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  levelChip: {
    marginRight: 8,
    height: 24,
  },
  metaText: {
    fontSize: 12,
    marginRight: 8,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    marginHorizontal: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    marginLeft: 4,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
    gap: 12,
  },
  commentInput: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    maxHeight: 100,
  },
  commentButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  commentsSection: {
    marginBottom: 16,
  },
  commentsTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  noCommentsText: {
    textAlign: 'center',
    paddingVertical: 20,
  },
  commentsList: {
    gap: 12,
  },
  commentCard: {
    borderRadius: 8,
    elevation: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  commentAvatar: {
    marginRight: 10,
  },
  commentInfo: {
    flex: 1,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  commentAuthorName: {
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 6,
  },
  commentBadge: {
    marginLeft: 2,
    fontSize: 12,
  },
  officialChip: {
    marginLeft: 4,
    height: 20,
  },
  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  commentLevelChip: {
    marginRight: 6,
    height: 20,
  },
  commentMetaText: {
    fontSize: 11,
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentActionText: {
    fontSize: 12,
    marginLeft: 2,
  },
  repliesButton: {
    marginLeft: 'auto',
  },
  repliesContainer: {
    marginTop: 8,
    marginLeft: 16,
    gap: 8,
  },
  replyCard: {
    borderRadius: 6,
    elevation: 1,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  replyAvatar: {
    marginRight: 8,
  },
  replyInfo: {
    flex: 1,
  },
  replyAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  replyAuthorName: {
    fontWeight: 'bold',
    fontSize: 12,
    marginRight: 4,
  },
  replyBadge: {
    marginLeft: 2,
    fontSize: 10,
  },
  replyOfficialChip: {
    marginLeft: 2,
    height: 16,
  },
  replyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  replyLevelChip: {
    marginRight: 4,
    height: 16,
  },
  replyMetaText: {
    fontSize: 10,
  },
  replyContent: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  replyActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyActionText: {
    fontSize: 10,
    marginLeft: 2,
  },
  title: {
    marginBottom: 16,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 32,
  },
  threadContainer: {
    marginTop: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  threadLine: {
    width: '100%',
    height: 1,
    marginBottom: 12,
  },
  parentPostActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  threadLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  parentPostInline: {
    marginTop: 16,
    marginBottom: 16,
    width: '100%',
  },
  threadLineInline: {
    width: '100%',
    height: 1,
    marginBottom: 12,
  },
  parentPostInlineContent: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 1,
  },
  parentAvatar: {
    marginRight: 10,
  },
  parentPostInfo: {
    flex: 1,
  },
  parentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  parentAuthorName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  parentBadge: {
    marginLeft: 4,
    fontSize: 14,
  },
  parentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  parentLevelChip: {
    marginRight: 8,
    height: 24,
  },
  parentMetaText: {
    fontSize: 12,
    marginRight: 8,
  },
  parentPostContent: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
}); 