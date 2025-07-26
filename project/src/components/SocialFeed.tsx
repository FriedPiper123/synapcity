
import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, MapPin, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useLocation } from '../contexts/LocationContext';

interface SocialFeedProps {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

export const SocialFeed = ({ 
  latitude, 
  longitude, 
  radiusKm = 5.0 
}: SocialFeedProps = {}) => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<{ [id: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<{ [postId: string]: any[] }>({});
  const [commentText, setCommentText] = useState<{ [postId: string]: string }>({});
  const [commentLoading, setCommentLoading] = useState<{ [postId: string]: boolean }>({});
  const [commentError, setCommentError] = useState<{ [postId: string]: string | null }>({});
  const { selectedLocation } = useLocation();

  useEffect(() => {
    fetchPosts();
  }, [selectedLocation]); // Re-fetch when selected location changes


  const getCurrentLocation = async () => {
    try {
      if (!navigator.geolocation) {
        return null;
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
    } catch (error) {
      console.error('Error getting location:', error);
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
        res = await apiFetch(`http://0.0.0.0:8000/api/v1/posts/nearby?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}&radius_km=${radiusKm}`);
      } else {
        // Fallback to neighborhood posts if location is not available
        res = await apiFetch('http://0.0.0.0:8000/api/v1/posts/Downtown');
      }
      
      const data = await res.json();
      setPosts(data || []);
    } catch (err) {
      setPosts([]);
    }
    setLoading(false);
  };

  const handleUpvote = async (postId: string) => {
    setLikedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
    try {
      await apiFetch(`http://0.0.0.0:8000/api/v1/posts/${postId}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      fetchPosts();
    } catch (err) {
      setLikedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
    }
  };

  const fetchComments = async (postId: string) => {
    setCommentLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await apiFetch(`http://0.0.0.0:8000/api/v1/posts/${postId}/comments?limit=20`);
      const data = await res.json();
      setComments((prev) => ({ ...prev, [postId]: data || [] }));
    } catch (err) {
      setComments((prev) => ({ ...prev, [postId]: [] }));
    }
    setCommentLoading((prev) => ({ ...prev, [postId]: false }));
  };

  const handleExpand = (postId: string) => {
    setExpandedPost(expandedPost === postId ? null : postId);
    if (expandedPost !== postId) {
      fetchComments(postId);
    }
  };

  const handleCommentSubmit = async (postId: string) => {
    if (!commentText[postId]?.trim()) return;
    setCommentLoading((prev) => ({ ...prev, [postId]: true }));
    setCommentError((prev) => ({ ...prev, [postId]: null }));
    try {
      const res = await apiFetch(`http://0.0.0.0:8000/api/v1/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText[postId] }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        if (errorData['detail'] && errorData['detail']['code'] === 'VULGAR_CONTENT_DETECTED') {
          setCommentError((prev) => ({ ...prev, [postId]: errorData['detail']['message'] || 'Vulgar content detected.' }));
          setCommentLoading((prev) => ({ ...prev, [postId]: false }));
          return;
        }
        throw new Error('Failed to comment');
      }
      setCommentText((prev) => ({ ...prev, [postId]: '' }));
      fetchComments(postId);
    } catch (err: any) {
      setCommentError((prev) => ({ ...prev, [postId]: err.message || 'Unknown error' }));
    }
    setCommentLoading((prev) => ({ ...prev, [postId]: false }));
  };

  const getPostColor = (type: string) => {
    switch (type) {
      case 'issue': return 'border-l-red-500';
      case 'resolved': return 'border-l-green-500';
      case 'event': return 'border-l-blue-500';
      case 'suggestion': return 'border-l-purple-500';
      default: return 'border-l-gray-500';
    }
  };

  const getPostBadge = (type: string) => {
    switch (type) {
      case 'issue': return 'bg-red-100 text-red-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'event': return 'bg-blue-100 text-blue-800';
      case 'suggestion': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading feed...</div>;
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Feed Header */}
      <div className="bg-white rounded-lg lg:rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100">
        <h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-2">Community Feed</h3>
        <p className="text-sm lg:text-base text-gray-600">Stay updated with what's happening in your neighborhood</p>
      </div>

      {/* Posts */}
      <div className="space-y-3 lg:space-y-4">
        {posts.map((post) => (
          <div key={post.postId} className={`bg-white rounded-lg lg:rounded-xl shadow-sm border border-gray-100 border-l-4 ${getPostColor(post.type)} hover:shadow-md transition-shadow`}>
            <div className="p-4 lg:p-6">
              {/* Post Header */}
              <div className="flex items-start justify-between mb-3 lg:mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold">
                    {post.avatar || '🧑'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm lg:text-base">{post.authorName || 'User'}</h4>
                    <div className="flex items-center space-x-2 text-xs lg:text-sm text-gray-600">
                      <Clock className="w-3 h-3 lg:w-4 lg:h-4" />
                      <span>{post.createdAt ? new Date(post.createdAt).toLocaleString() : ''}</span>
                      <span>•</span>
                      <MapPin className="w-3 h-3 lg:w-4 lg:h-4" />
                      <span>{post.neighborhood || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
                <span className={`px-2 lg:px-3 py-1 rounded-full text-xs font-medium ${getPostBadge(post.type)}`}>
                  {post.type}
                </span>
              </div>

              {/* Post Content */}
              <p className="text-gray-800 mb-3 lg:mb-4 leading-relaxed text-sm lg:text-base">{post.content}</p>

              {/* Post Actions */}
              <div className="flex items-center justify-between pt-3 lg:pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-4 lg:space-x-6">
                  <button 
                    onClick={() => handleUpvote(post.postId)}
                    className={`flex items-center space-x-2 px-2 lg:px-3 py-2 rounded-lg transition-colors ${
                      likedPosts[post.postId] 
                        ? 'text-red-500 bg-red-50' 
                        : 'text-gray-600 hover:text-red-500 hover:bg-red-50'
                    }`}
                  >
                    <Heart className={`w-4 h-4 lg:w-5 lg:h-5 ${likedPosts[post.postId] ? 'fill-current' : ''}`} />
                    <span className="font-medium text-sm lg:text-base">{post.upvotes || 0}</span>
                  </button>
                                        <button
                        onClick={() => navigate(`/post/${post.postId}`)}
                        className="flex items-center space-x-2 px-2 lg:px-3 py-2 rounded-lg text-gray-600 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4 lg:w-5 lg:h-5" />
                        <span className="font-medium text-sm lg:text-base">{post.commentCount || 0}</span>
                      </button>
                  <button className="flex items-center space-x-2 px-2 lg:px-3 py-2 rounded-lg text-gray-600 hover:text-green-500 hover:bg-green-50 transition-colors">
                    <Share2 className="w-4 h-4 lg:w-5 lg:h-5" />
                    <span className="font-medium text-sm lg:text-base">0</span>
                  </button>
                </div>
              </div>
              {/* Comments Section */}
              {expandedPost === post.postId && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="font-semibold mb-2 text-gray-700">Comments</h4>
                  {commentLoading[post.postId] ? (
                    <div className="text-gray-500">Loading comments...</div>
                  ) : (
                    <div className="space-y-2 mb-2">
                      {comments[post.postId]?.length ? comments[post.postId].map((comment, idx) => (
                        <div key={idx} className="bg-gray-50 rounded p-2 text-sm text-gray-800">
                          {comment.content}
                        </div>
                      )) : <div className="text-gray-400">No comments yet.</div>}
                    </div>
                  )}
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      handleCommentSubmit(post.postId);
                    }}
                    className="flex items-center space-x-2 mt-2"
                  >
                    <input
                      type="text"
                      className="flex-1 border rounded p-2 text-sm"
                      placeholder="Add a comment..."
                      value={commentText[post.postId] || ''}
                      onChange={e => setCommentText(prev => ({ ...prev, [post.postId]: e.target.value }))}
                      disabled={commentLoading[post.postId]}
                    />
                    <button
                      type="submit"
                      className="bg-blue-500 text-white px-4 py-2 rounded font-medium hover:bg-blue-600 transition-colors"
                      disabled={commentLoading[post.postId]}
                    >
                      Post
                    </button>
                  </form>
                  {commentError[post.postId] && <div className="text-red-500 text-sm mt-1">{commentError[post.postId]}</div>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      <div className="text-center">
        <button onClick={fetchPosts} className="bg-white border border-gray-300 text-gray-700 px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm lg:text-base">
          Reload Feed
        </button>
      </div>
    </div>
  );
};
