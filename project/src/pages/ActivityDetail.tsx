import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ExternalLink, MapPin, Clock, Users, MessageCircle, Heart, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '../lib/api';
import { useLocation as useLocationContext } from '../contexts/LocationContext';
import { useActivities } from '../contexts/ActivitiesContext';
import { useLocationName } from '../hooks/useLocationName';

interface ActivityDetail {
  id: string;
  type: 'issue' | 'event' | 'resolved' | 'post';
  title: string;
  content: string;
  enhanced_summary?: string;
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
  const { selectedLocation } = useLocationContext();
  const { getLocationName } = useLocationName();
  const { getActivityById } = useActivities();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enhancingActivity, setEnhancingActivity] = useState(false);

  useEffect(() => {
    // Try to get activity data from location state first (if navigated from dashboard)
    if (location.state?.activity) {
      setActivity(location.state.activity);
      setLoading(false);
      // Still fetch enhanced data in background
      fetchEnhancedActivityData(location.state.activity);
    } else if (activityId) {
      // Try to get activity from context first
      const contextActivity = getActivityById(activityId);
      if (contextActivity) {
        setActivity(contextActivity);
        setLoading(false);
        // Fetch enhanced data in background
        fetchEnhancedActivityData(contextActivity);
      } else {
        // If not found in context, fetch from API
        fetchActivityDetails();
      }
    } else {
      setError('No activity data available');
      setLoading(false);
    }
  }, [activityId, location.state, getActivityById]);

  const fetchEnhancedActivityData = async (baseActivity: ActivityDetail) => {
    if (!activityId) return;
    
    try {
      setEnhancingActivity(true);
      
      // Prepare the request payload with activity data from recent activities
      const requestPayload = {
        type: baseActivity.type,
        category: baseActivity.category,
        neighborhood: baseActivity.location ? `${baseActivity.location.latitude},${baseActivity.location.longitude}` : "",
        summary: baseActivity.content
      };

      const response = await apiFetch(
        `http://0.0.0.0:8000/api/v1/dashboard/activity/enhance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload)
        }
      );
      
      if (response.ok) {
        const enhancedData = await response.json();
        setActivity({
          ...baseActivity,
          ...enhancedData
        });
      }
    } catch (err) {
      console.error('Error fetching enhanced activity data:', err);
      // Don't show error to user as we have base activity data
    } finally {
      setEnhancingActivity(false);
    }
  };

  const fetchActivityDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!selectedLocation) {
        throw new Error('Location not available');
      }

      // Try to get activity from context first
      const contextActivity = getActivityById(activityId || '');
      if (contextActivity) {
        setActivity(contextActivity);
        setLoading(false);
        await fetchEnhancedActivityData(contextActivity);
        return;
      }

      // If not found in context, fetch from API
      const activitiesResponse = await apiFetch(
        `http://0.0.0.0:8000/api/v1/dashboard/recent-activities?latitude=${selectedLocation.latitude}&longitude=${selectedLocation.longitude}&radius_km=5.0`
      );
      
      if (!activitiesResponse.ok) {
        throw new Error('Failed to fetch recent activities');
      }
      
      const activitiesData = await activitiesResponse.json();
      const activities = activitiesData.activities || [];
      
      // Find the specific activity by ID or title
      let targetActivity = null;
      for (let i = 0; i < activities.length; i++) {
        const activity = activities[i];
        if (activity.title === activityId || 
            `activity-${i}` === activityId ||
            i.toString() === activityId?.replace('activity-', '')) {
          targetActivity = activity;
          break;
        }
      }
      
      if (!targetActivity) {
        throw new Error('Activity not found');
      }

      setActivity(targetActivity);
      
      // Now enhance the activity with external links
      await fetchEnhancedActivityData(targetActivity);

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

  // External References Loading Skeleton
  const ExternalReferencesLoadingSkeleton = () => (
    <Card className="shadow-sm border border-gray-100">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800">
          External References
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-3 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-64 p-3 rounded-lg border border-gray-200 animate-pulse">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-8 h-8 rounded flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // Loading Skeleton Component
  const LoadingSkeleton = () => (
    <div className="p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-20" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        {/* Activity Details Card Skeleton */}
        <Card className="shadow-sm border border-gray-100">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div>
                  <Skeleton className="h-6 w-64 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex items-center space-x-2 mt-4">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardContent>
        </Card>

        {/* External References Skeleton */}
        <Card className="shadow-sm border border-gray-100">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="flex space-x-3 overflow-x-auto pb-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-shrink-0 w-64 p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="w-8 h-8 rounded flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Related Posts Skeleton */}
        <Card className="shadow-sm border border-gray-100">
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex items-center space-x-4 pt-3 border-t border-gray-100">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (loading) {
    return <LoadingSkeleton />;
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
            <div className="relative">
              <p className="text-gray-700 leading-relaxed text-base">
                {activity.enhanced_summary || activity.content}
              </p>
              {enhancingActivity && !activity.enhanced_summary && (
                <div className="absolute top-0 right-0 flex items-center text-xs text-blue-600">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                  Enhancing...
                </div>
              )}
            </div>
            
            {activity.location && (
              <div className="flex items-center space-x-2 mt-4 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>
                  {getLocationName(activity.location.latitude, activity.location.longitude)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* External References */}
        {enhancingActivity ? (
          <ExternalReferencesLoadingSkeleton />
        ) : activity.external_references && activity.external_references.length > 0 ? (
          <Card className="shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800">
                External References
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-3 overflow-x-auto pb-2">
                {activity.external_references.map((ref, index) => (
                  <a
                    key={index}
                    href={ref.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 w-64 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {ref.thumbnail ? (
                        <img 
                          src={ref.thumbnail} 
                          alt="" 
                          className="w-8 h-8 rounded object-cover flex-shrink-0"
                          onError={(e) => {
                            // Fallback to link icon if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const fallbackIcon = document.createElement('div');
                              fallbackIcon.className = 'w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0';
                              fallbackIcon.innerHTML = '<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>';
                              parent.appendChild(fallbackIcon);
                            }
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                          <ExternalLink className="w-4 h-4 text-blue-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-blue-600 font-medium text-sm truncate">
                          {ref.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {ref.link}
                        </p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

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