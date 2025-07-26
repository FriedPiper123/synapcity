import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ExternalLink, MapPin, Clock, Users, MessageCircle, Heart, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiFetch } from '../lib/api';

interface ActivityDetail {
  id: string;
  type: 'issue' | 'event' | 'resolved' | 'post';
  title: string;
  content: string;
  severity: 'high' | 'medium' | 'low';
  category: string;
  counts: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  external_references?: Array<{
    title: string;
    link: string;
    thumbnail?: string;
  }>;
  related_posts?: RelatedPost[];
}

interface RelatedPost {
  postId: string;
  content: string;
  type: string;
  createdAt: string;
  upvotes: number;
  commentCount: number;
  author?: {
    username: string;
    profileImageUrl?: string;
  };
  neighborhood?: string;
}

export default function ActivityDetail() {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to get activity data from location state first (if navigated from dashboard)
    if (location.state?.activity) {
      setActivity(location.state.activity);
      setLoading(false);
    } else if (activityId) {
      // If no state data, fetch from API
      fetchActivityDetails();
    } else {
      setError('No activity data available');
      setLoading(false);
    }
  }, [activityId, location.state]);

  const fetchActivityDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // For now, we'll use the activity data from the dashboard
      // In a real implementation, you'd fetch from a specific activity endpoint
      const response = await apiFetch(`http://0.0.0.0:8000/api/v1/dashboard/recent-activities`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch activity details');
      }
      
      const data = await response.json();
      // Since backend doesn't provide IDs, we'll find by index or title
      const foundActivity = data.activities?.find((a: any, index: number) => {
        const activityIndex = activityId?.replace('activity-', '');
        return index.toString() === activityIndex || a.title === activityId;
      });
      
      if (foundActivity) {
        setActivity(foundActivity);
      } else {
        throw new Error('Activity not found');
      }

    } catch (err) {
      console.error('Error fetching activity details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'issue': return '🚨';
      case 'resolved': return '✅';
      case 'event': return '📅';
      default: return '📝';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'issue': return 'text-red-500';
      case 'resolved': return 'text-green-500';
      case 'event': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getActivityBgColor = (type: string) => {
    switch (type) {
      case 'issue': return 'bg-red-50';
      case 'resolved': return 'bg-green-50';
      case 'event': return 'bg-blue-50';
      default: return 'bg-gray-50';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-200 text-red-700 bg-red-50';
      case 'medium': return 'border-yellow-200 text-yellow-700 bg-yellow-50';
      case 'low': return 'border-green-200 text-green-700 bg-green-50';
      default: return 'border-gray-200 text-gray-700 bg-gray-50';
    }
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

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hour${Math.floor(diffInMinutes / 60) > 1 ? 's' : ''} ago`;
      return `${Math.floor(diffInMinutes / 1440)} day${Math.floor(diffInMinutes / 1440) > 1 ? 's' : ''} ago`;
    } catch {
      return 'Unknown time';
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading activity details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <div className="text-red-500 mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Unable to load activity
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {error || 'Activity not found'}
            </p>
            <Button onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Activity Details</h1>
            <p className="text-gray-600">Community insights and related posts</p>
          </div>
        </div>

        {/* Activity Details Card */}
        <Card className="shadow-sm border border-gray-100">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-full ${getActivityBgColor(activity.type)}`}>
                  <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-800">
                    {activity.title}
                  </CardTitle>
                  <p className="text-gray-600 mt-1">
                    {activity.category} • {activity.counts || 0} related posts
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <Badge variant="outline" className={`text-xs ${getSeverityColor(activity.severity)}`}>
                  {activity.severity}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {activity.type}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed text-base">
              {activity.content}
            </p>
            
            {activity.location && (
              <div className="flex items-center space-x-2 mt-4 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>
                  {activity.location.latitude?.toFixed(4)}, {activity.location.longitude?.toFixed(4)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* External References */}
        {activity.external_references && activity.external_references.length > 0 && (
          <Card className="shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800">
                External References
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activity.external_references.map((ref, index) => (
                <a
                  key={index}
                  href={ref.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  {ref.thumbnail ? (
                    <img src={ref.thumbnail} alt="" className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-blue-600 font-medium truncate">
                      {ref.title}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {ref.link}
                    </p>
                  </div>
                </a>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Related Posts */}
        {activity.related_posts && activity.related_posts.length > 0 && (
          <Card className="shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800">
                Related Posts
              </CardTitle>
              <p className="text-sm text-gray-600">
                Community posts related to this activity
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {activity.related_posts.map((post) => (
                <div
                  key={post.postId}
                  className={`bg-white rounded-lg border border-gray-200 ${getPostColor(post.type)} hover:shadow-md transition-shadow cursor-pointer`}
                  onClick={() => navigate(`/post/${post.postId}`)}
                >
                  <div className="p-4">
                    {/* Post Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={post.author?.profileImageUrl} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-green-500 text-white text-xs font-bold">
                            {post.author?.username?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-gray-800 text-sm">
                            {post.author?.username || 'Anonymous'}
                          </h4>
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(post.createdAt)}</span>
                            {post.neighborhood && (
                              <>
                                <span>•</span>
                                <MapPin className="w-3 h-3" />
                                <span>{post.neighborhood}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-xs ${getPostBadge(post.type)}`}>
                        {post.type}
                      </Badge>
                    </div>

                    {/* Post Content */}
                    <p className="text-gray-800 mb-3 leading-relaxed text-sm line-clamp-3">
                      {post.content}
                    </p>

                    {/* Post Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center space-x-4">
                        <button className="flex items-center space-x-2 px-2 py-1 rounded-lg text-gray-600 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Heart className="w-4 h-4" />
                          <span className="font-medium text-sm">{post.upvotes || 0}</span>
                        </button>
                        <button className="flex items-center space-x-2 px-2 py-1 rounded-lg text-gray-600 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                          <MessageCircle className="w-4 h-4" />
                          <span className="font-medium text-sm">{post.commentCount || 0}</span>
                        </button>
                        <button className="flex items-center space-x-2 px-2 py-1 rounded-lg text-gray-600 hover:text-green-500 hover:bg-green-50 transition-colors">
                          <Share2 className="w-4 h-4" />
                          <span className="font-medium text-sm">Share</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Empty State for Related Posts */}
        {(!activity.related_posts || activity.related_posts.length === 0) && (
          <Card className="shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800">
                Related Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">📭</div>
                <p className="text-gray-600">No related posts found</p>
                <p className="text-gray-500 text-sm">Posts related to this activity will appear here</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 