
import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, MapPin, Clock, Send, AlertCircle, Lightbulb, Calendar, FileText } from 'lucide-react';
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

  // New post creation state
  const [newPostText, setNewPostText] = useState('');
  const [selectedPostType, setSelectedPostType] = useState('issue');
  const [selectedCategory, setSelectedCategory] = useState('community');
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Post type and category options (matching CreatePost structure)
  const postTypes = [
    { id: 'issue', label: 'Issue', icon: AlertCircle, color: 'bg-red-100 text-red-800' },
    { id: 'suggestion', label: 'Suggestion', icon: Lightbulb, color: 'bg-purple-100 text-purple-800' },
    { id: 'event', label: 'Event', icon: Calendar, color: 'bg-blue-100 text-blue-800' }
  ];

  const categories = [
    { id: 'infrastructure', label: 'Infrastructure', color: 'bg-orange-50 text-orange-700' },
    { id: 'safety', label: 'Safety', color: 'bg-red-50 text-red-700' },
    { id: 'water_shortage', label: 'Water', color: 'bg-blue-50 text-blue-700' },
    { id: 'power_outage', label: 'Power', color: 'bg-yellow-50 text-yellow-700' },
    { id: 'waste_management', label: 'Waste', color: 'bg-green-50 text-green-700' },
    { id: 'transportation', label: 'Transport', color: 'bg-purple-50 text-purple-700' },
    { id: 'community', label: 'Community', color: 'bg-indigo-50 text-indigo-700' },
    { id: 'other', label: 'Other', color: 'bg-gray-50 text-gray-700' }
  ];

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
        currentLocation = { latitude, longitude, locationName: 'Current Location' };
      }
      if (!currentLocation) {
        const location = await getCurrentLocation();
        currentLocation = location ? { latitude: location.latitude, longitude: location.longitude, locationName: 'Current Location' } : null;
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

  const handleCreatePost = async () => {
    if (!newPostText.trim()) return;
    
    setPostLoading(true);
    setPostError(null);
    
    try {
      let currentLocation = selectedLocation;
      if (!currentLocation && (latitude && longitude)) {
        currentLocation = { latitude, longitude, locationName: 'Current Location' };
      }
      if (!currentLocation) {
        const location = await getCurrentLocation();
        currentLocation = location ? { latitude: location.latitude, longitude: location.longitude, locationName: 'Current Location' } : null;
      }

      if (!currentLocation) {
        setPostError('Unable to get your location. Please enable location access.');
        setPostLoading(false);
        return;
      }

      const postData = {
        content: newPostText,
        type: selectedPostType,
        category: selectedCategory,
        location: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        },
        neighborhood: currentLocation.locationName || 'Current Location',
        mediaUrl: null,
        parentId: null,
        geohash: null
      };

      const res = await apiFetch('http://0.0.0.0:8000/api/v1/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (errorData['detail'] && errorData['detail']['code'] === 'VULGAR_CONTENT_DETECTED') {
          setPostError(errorData['detail']['message'] || 'Vulgar content detected.');
          setPostLoading(false);
          return;
        }
        throw new Error('Failed to create post');
      }

      setNewPostText('');
      setSelectedPostType('issue');
      setSelectedCategory('community');
      fetchPosts(); // Refresh the feed
    } catch (err: any) {
      setPostError(err.message || 'Failed to create post');
    }
    
    setPostLoading(false);
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
    return (
      <div className="relative h-full flex flex-col">
        {/* Feed Header */}
        <div className="bg-white rounded-lg lg:rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100 mb-4">
          <h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-2">Community Feed</h3>
          <p className="text-sm lg:text-base text-gray-600">Stay updated with what's happening in your neighborhood</p>
        </div>

        {/* Loading State */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-8 text-gray-500">Loading feed...</div>
        </div>

        {/* Chat-Style Post Creation Section - Always visible */}
        <div className="bg-white border-t border-gray-200 p-4 lg:p-6">
          <div className="max-w-4xl mx-auto">
            {/* Post Type and Category Chips */}
            <div className="mb-3">
              {/* Post Type Row */}
              <div className="flex overflow-x-auto space-x-2 pb-2 mb-2">
                <span className="text-xs font-medium text-gray-600 whitespace-nowrap mr-2">Type:</span>
                {postTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedPostType(type.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center space-x-1 ${
                        selectedPostType === type.id
                          ? `${type.color} ring-2 ring-offset-2 ring-blue-500`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{type.label}</span>
                    </button>
                  );
                })}
              </div>
              
              {/* Category Row */}
              <div className="flex overflow-x-auto space-x-2 pb-2">
                <span className="text-xs font-medium text-gray-600 whitespace-nowrap mr-2">Category:</span>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === category.id
                        ? `${category.color} ring-2 ring-offset-2 ring-blue-500`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Input Box */}
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <textarea
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  placeholder="What's happening in your neighborhood?"
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                  rows={2}
                  disabled={postLoading}
                />
                {postError && <div className="text-red-500 text-xs mt-1">{postError}</div>}
              </div>
              <button
                onClick={handleCreatePost}
                disabled={!newPostText.trim() || postLoading}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white p-3 rounded-lg transition-colors flex items-center justify-center"
              >
                <Send className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      {/* Feed Header */}
      <div className="bg-white rounded-lg lg:rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100 mb-4">
        <h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-2">Community Feed</h3>
        <p className="text-sm lg:text-base text-gray-600">Stay updated with what's happening in your neighborhood</p>
      </div>

      {/* Scrollable Posts Section */}
      <div className="flex-1 overflow-y-auto space-y-3 lg:space-y-4 pb-4">
        {posts.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium mb-2">No posts yet</p>
              <p className="text-sm">Be the first to share something in your neighborhood!</p>
            </div>
          </div>
        ) : (
          posts.map((post) => (
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
          ))
        )}
      </div>

      {/* Chat-Style Post Creation Section - Always visible */}
      <div className="bg-white border-t border-gray-200 p-4 lg:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Post Type and Category Chips */}
          <div className="mb-3">
            {/* Post Type Row */}
            <div className="flex overflow-x-auto space-x-2 pb-2 mb-2">
              <span className="text-xs font-medium text-gray-600 whitespace-nowrap mr-2">Type:</span>
              {postTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedPostType(type.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center space-x-1 ${
                      selectedPostType === type.id
                        ? `${type.color} ring-2 ring-offset-2 ring-blue-500`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
            
            {/* Category Row */}
            <div className="flex overflow-x-auto space-x-2 pb-2">
              <span className="text-xs font-medium text-gray-600 whitespace-nowrap mr-2">Category:</span>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category.id
                      ? `${category.color} ring-2 ring-offset-2 ring-blue-500`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input Box */}
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder="What's happening in your neighborhood?"
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                rows={2}
                disabled={postLoading}
              />
              {postError && <div className="text-red-500 text-xs mt-1">{postError}</div>}
            </div>
            <button
              onClick={handleCreatePost}
              disabled={!newPostText.trim() || postLoading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white p-3 rounded-lg transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
