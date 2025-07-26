import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Share2, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '../lib/api';

// Mock helpers for avatars, badges, levels, impact, and post type
const getAvatar = (user: any) => user === 'anonymous' ? '👤' : '🧑';
const getBadges = (userId: string) => ['🏆', '⭐'];
const getLevel = (userId: string) => 'Level 5';
const getLocation = () => 'Downtown District';

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [parentPost, setParentPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  const fetchPostAndComments = async () => {
    if (postId) {
      setLoading(true);
      try {
        // First, try to fetch the post directly using the new API
        const postRes = await apiFetch(`http://0.0.0.0:8000/api/v1/posts/post/${postId}`);
        
        if (postRes.ok) {
          const postData = await postRes.json();
          setPost(postData);
          
          // Check if this post has a parentId (meaning it's a comment)
          if (postData.parentId) {
            // This is a comment, fetch the parent post
            const parentRes = await apiFetch(`http://0.0.0.0:8000/api/v1/posts/post/${postData.parentId}`);
            if (parentRes.ok) {
              const parentData = await parentRes.json();
              setParentPost(parentData);
            }
          } else {
            // This is a regular post, fetch its comments
            setParentPost(null);
          }
          
          const commentsRes = await apiFetch(`http://0.0.0.0:8000/api/v1/posts/${postId}/comments?limit=100`);
          const commentsData = await commentsRes.json();
          setComments(commentsData || []);
          setCommentCount(commentsData?.length || 0);
          setLikeCount(postData.upvotes || 0);
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
  }, [postId]);

  const handleCommentSubmit = async () => {
    if (!commentText.trim() || !postId) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`http://0.0.0.0:8000/api/v1/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        if (errorData['detail'] && errorData['detail']['code'] === 'VULGAR_CONTENT_DETECTED') {
          alert('Vulgar content detected. Please revise your comment.');
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
      const res = await apiFetch(`http://0.0.0.0:8000/api/v1/posts/${postId}/upvote`, {
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
      const res = await apiFetch(`http://0.0.0.0:8000/api/v1/posts/${id}/upvote`, {
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
    navigate(`/post/${commentId}`);
  };

  if (!postId) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Post</h1>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Post or comment not found.</h1>
        <Button onClick={() => navigate('/')}>Go to Feed</Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <div className="mb-4">
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      {/* Main Post */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <Avatar className="w-12 h-12">
              <AvatarImage src={post.author?.profileImageUrl} />
              <AvatarFallback>{getAvatar(post.authorId)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="font-bold text-lg">
                  {post.author?.username || 'Anonymous'}
                </h2>
                {getBadges(post.authorId).map((badge, i) => (
                  <span key={i} className="text-sm">{badge}</span>
                ))}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                <Badge variant="secondary">{getLevel(post.authorId)}</Badge>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(post.createdAt).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {getLocation()}
                </span>
              </div>
            </div>
          </div>
          
          <p className="text-gray-800 mb-4 leading-relaxed">{post.content}</p>
          
          {/* Parent Post (if viewing a comment) */}
          {parentPost && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-start gap-3 mb-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={parentPost.author?.profileImageUrl} />
                  <AvatarFallback>{getAvatar(parentPost.authorId)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {parentPost.author?.username || 'Anonymous'}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {getLevel(parentPost.authorId)}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    {new Date(parentPost.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <p className="text-gray-700 text-sm line-clamp-3">
                {parentPost.content}
              </p>
              <div className="mt-2 text-blue-600 text-sm font-medium">
                Thread from this post
              </div>
            </div>
          )}
        </CardContent>
        
        {/* Stats Row */}
        <div className="flex items-center justify-around py-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`flex items-center gap-2 ${liked ? 'text-red-500' : ''}`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
            <span>{likeCount}</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            <span>{commentCount}</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            <span>{shareCount}</span>
          </Button>
        </div>
      </Card>

      {/* Comment Input */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Textarea
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 min-h-[80px]"
              disabled={submitting}
            />
            <Button 
              onClick={handleCommentSubmit}
              disabled={!commentText.trim() || submitting}
              className="self-end"
            >
              {submitting ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
        {comments.map((comment) => (
          <Card key={comment.postId} className="ml-4">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={comment.author?.profileImageUrl} />
                  <AvatarFallback>{getAvatar(comment.authorId)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">
                      {comment.author?.username || 'Anonymous'}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {getLevel(comment.authorId)}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {new Date(comment.createdAt).toLocaleString()}
                  </div>
                  <p className="text-gray-800">{comment.content}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCommentLike(comment.postId)}
                  className={`flex items-center gap-1 ${likedComments[comment.postId] ? 'text-red-500' : ''}`}
                >
                  <Heart className={`w-3 h-3 ${likedComments[comment.postId] ? 'fill-current' : ''}`} />
                  <span>{comment.upvotes || 0}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCommentPress(comment.postId)}
                  className="flex items-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>Reply</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      </div>
    </div>
  );
} 