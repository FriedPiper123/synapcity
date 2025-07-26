
import { useEffect, useState, useCallback } from 'react';
import { MapPin, Users, MessageSquare, TrendingUp, AlertCircle, CheckCircle, RefreshCw, Calendar, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiFetch } from '../lib/api';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  activeIssues: number;
  resolvedToday: number;
  communityPosts: number;
  activeCitizens: number;
  engagementPercentage: number;
  totalPosts: number;
  postTypes: Record<string, number>;
  statusCounts: Record<string, number>;
}

interface RecentActivity {
  id: string;
  type: 'issue' | 'event' | 'resolved' | 'post';
  title: string;
  time: string;
  severity: 'high' | 'medium' | 'low';
  content: string;
  authorId: string | null;
  upvotes: number;
  downvotes: number;
  commentCount: number;
}

// Function to extract username from JWT token
const extractUsernameFromToken = (token: string): string => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.name || 'User';
  } catch (error) {
    return 'User';
  }
};

export const Dashboard = () => {
  const [username, setUsername] = useState('User');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { selectedLocation } = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Extract username from user data or token
  useEffect(() => {
    if (user?.displayName) {
      setUsername(user.displayName);
    } else if (user?.email) {
      setUsername(user.email.split('@')[0]);
    } else {
      // Fallback to token extraction if available
      const token = localStorage.getItem('auth_token');
      if (token) {
        const extractedUsername = extractUsernameFromToken(token);
        setUsername(extractedUsername);
      }
    }
  }, [user]);

  useEffect(() => {
    if (selectedLocation) {
      fetchDashboardData();
    }
  }, [selectedLocation]);

  const fetchDashboardData = async () => {
    if (!selectedLocation) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch stats and activities in parallel
      const statsPromise = apiFetch(
        `http://0.0.0.0:8000/api/v1/dashboard/stats?latitude=${selectedLocation.latitude}&longitude=${selectedLocation.longitude}&radius_km=5.0`
      );
      
      const activitiesPromise = apiFetch(
        `http://0.0.0.0:8000/api/v1/dashboard/recent-activities?latitude=${selectedLocation.latitude}&longitude=${selectedLocation.longitude}&radius_km=5.0&limit=10`
      );

      const [statsResponse, activitiesResponse] = await Promise.all([statsPromise, activitiesPromise]);

      // Handle stats response
      if (!statsResponse.ok) {
        const errorText = await statsResponse.text();
        throw new Error(`Stats API error (${statsResponse.status}): ${errorText}`);
      }
      const statsData = await statsResponse.json();
      
      // Validate stats data
      if (!statsData || typeof statsData !== 'object') {
        throw new Error('Invalid stats data format received from server');
      }
      
      // Ensure required fields exist
      const requiredFields = ['activeIssues', 'resolvedToday', 'communityPosts', 'activeCitizens', 'engagementPercentage'];
      for (const field of requiredFields) {
        if (typeof statsData[field] !== 'number') {
          throw new Error(`Missing or invalid field: ${field}`);
        }
      }
      
      setStats(statsData);

      // Handle activities response
      if (!activitiesResponse.ok) {
        const errorText = await activitiesResponse.text();
        throw new Error(`Activities API error (${activitiesResponse.status}): ${errorText}`);
      }
      const activitiesData = await activitiesResponse.json();
      
      // Validate activities data
      if (!activitiesData || !Array.isArray(activitiesData.activities)) {
        throw new Error('Invalid activities data format received from server');
      }
      
      setRecentActivities(activitiesData.activities || []);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // Set fallback data for network errors
      if (errorMessage.includes('Network') || errorMessage.includes('fetch') || errorMessage.includes('timeout') || errorMessage.includes('API error')) {
        setStats({
          activeIssues: 0,
          resolvedToday: 0,
          communityPosts: 0,
          activeCitizens: 0,
          engagementPercentage: 0.0,
          totalPosts: 0,
          postTypes: {},
          statusCounts: {}
        });
        setRecentActivities([{
          id: "fallback-1",
          type: "issue",
          title: "No recent activities available",
          time: "Just now",
          severity: "medium",
          content: "Start posting to see activities here",
          authorId: null,
          upvotes: 0,
          downvotes: 0,
          commentCount: 0
        }]);
        setError(null); // Clear error when showing fallback data
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchDashboardData();
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData().finally(() => setRefreshing(false));
  }, []);

  const getStatsDisplay = () => {
    if (!stats) return [];
    
    return [
      { 
        label: 'Active Issues', 
        value: stats.activeIssues.toString(), 
        icon: AlertCircle, 
        color: 'text-red-500', 
        bgColor: 'bg-red-50' 
      },
      { 
        label: 'Resolved Today', 
        value: stats.resolvedToday.toString(), 
        icon: CheckCircle, 
        color: 'text-green-500', 
        bgColor: 'bg-green-50' 
      },
      { 
        label: 'Community Posts', 
        value: stats.communityPosts.toString(), 
        icon: MessageSquare, 
        color: 'text-blue-500', 
        bgColor: 'bg-blue-50' 
      },
      { 
        label: 'Active Citizens', 
        value: stats.activeCitizens.toString(), 
        icon: Users, 
        color: 'text-purple-500', 
        bgColor: 'bg-purple-50' 
      },
    ];
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'issue': return AlertCircle;
      case 'resolved': return CheckCircle;
      case 'event': return Calendar;
      default: return Activity;
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

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 mb-4">
              <AlertCircle className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Unable to load dashboard
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {error}
            </p>
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry ({retryCount})
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statsDisplay = getStatsDisplay();

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-xl lg:rounded-2xl p-4 lg:p-6 text-white">
        <h2 className="text-lg lg:text-2xl font-bold mb-2">Welcome back, {username}!</h2>
        <p className="text-blue-100 text-sm lg:text-base mb-3 lg:mb-4">Your city is thriving with community engagement</p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="text-sm lg:text-base font-medium">{getLocationName()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="text-sm lg:text-base font-medium">
              +{stats?.engagementPercentage || 0}% engagement
            </span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading dashboard...</span>
        </div>
      )}

      {/* Stats Grid */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
          {statsDisplay.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg lg:rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2 lg:mb-4">
                  <div className={`p-2 lg:p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-4 h-4 lg:w-6 lg:h-6 ${stat.color}`} />
                  </div>
                  <span className="text-lg lg:text-2xl font-bold text-gray-800">{stat.value}</span>
                </div>
                <p className="text-gray-600 font-medium text-sm lg:text-base">{stat.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Activities */}
      <Card className="shadow-sm border border-gray-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base lg:text-lg font-semibold text-gray-800">Recent Activities</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Latest community updates</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-64">
            {!loading && recentActivities.length > 0 ? (
              <div className="space-y-3 lg:space-y-4">
                {recentActivities.map((activity, index) => {
                  const ActivityIcon = getActivityIcon(activity.type);
                  const activityId = activity.id || `activity-${index}`;
                  return (
                    <div 
                      key={activityId} 
                      className="flex items-start space-x-3 lg:space-x-4 p-3 lg:p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer" 
                      onClick={() => navigate(`/activity/${activityId}`, { state: { activity } })}
                    >
                      <div className={`p-2 rounded-full ${getActivityBgColor(activity.type)}`}>
                        <ActivityIcon className={`w-4 h-4 lg:w-5 lg:h-5 ${getActivityColor(activity.type)}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 text-sm lg:text-base">{activity.title}</p>
                        <p className="text-xs lg:text-sm text-gray-600 mb-1">{formatTime(activity.time)}</p>
                        <p className="text-xs text-gray-500 line-clamp-2">{activity.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">👍 {activity.upvotes}</span>
                          <span className="text-xs text-gray-500">💬 {activity.commentCount}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            activity.severity === 'high' ? 'border-red-200 text-red-700 bg-red-50' :
                            activity.severity === 'medium' ? 'border-yellow-200 text-yellow-700 bg-yellow-50' :
                            'border-green-200 text-green-700 bg-green-50'
                          }`}
                        >
                          {activity.severity}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {activity.type}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !loading ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">📭</div>
                <p className="text-gray-600">No recent activities</p>
                <p className="text-gray-500 text-sm">Start posting to see activities here</p>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading activities...</span>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

