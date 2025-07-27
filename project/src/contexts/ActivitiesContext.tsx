import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiFetch } from '../lib/api';
import { useLocation } from './LocationContext';

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

interface ActivitiesContextType {
  activities: ActivityDetail[];
  loading: boolean;
  error: string | null;
  fetchActivities: () => Promise<void>;
  getActivityById: (id: string) => ActivityDetail | null;
  refreshActivities: () => Promise<void>;
  clearActivities: () => void;
}

const ActivitiesContext = createContext<ActivitiesContextType | undefined>(undefined);

export const useActivities = () => {
  const context = useContext(ActivitiesContext);
  if (!context) {
    throw new Error('useActivities must be used within an ActivitiesProvider');
  }
  return context;
};

interface ActivitiesProviderProps {
  children: ReactNode;
}

export const ActivitiesProvider: React.FC<ActivitiesProviderProps> = ({ children }) => {
  const [activities, setActivities] = useState<ActivityDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedLocation } = useLocation();

  const fetchActivities = async () => {
    if (!selectedLocation) return;

    try {
      setLoading(true);
      setError(null);

      console.log('Fetching activities for location:', selectedLocation);

      const response = await apiFetch(
        `/api/v1/dashboard/recent-activities?latitude=${selectedLocation.latitude}&longitude=${selectedLocation.longitude}&radius_km=5.0&limit=10`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Activities API error (${response.status}): ${errorText}`);
      }

      const activitiesData = await response.json();
      
      // Validate activities data
      if (!activitiesData || !Array.isArray(activitiesData.activities)) {
        throw new Error('Invalid activities data format received from server');
      }

      // Add unique IDs to activities if they don't have them
      const activitiesWithIds = activitiesData.activities.map((activity: ActivityDetail, index: number) => ({
        ...activity,
        id: activity.id || `activity-${index}`
      }));
      
      console.log('Fetched activities:', activitiesWithIds);
      setActivities(activitiesWithIds);

    } catch (err) {
      console.error('Error fetching activities:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // Set fallback data for network errors
      if (errorMessage.includes('Network') || errorMessage.includes('fetch') || errorMessage.includes('timeout') || errorMessage.includes('API error')) {
        setActivities([{
          id: "fallback-1",
          type: "issue",
          title: "No recent activities available",
          content: "Start posting to see activities here",
          severity: "medium",
          category: "general",
          counts: 0
        }]);
        setError(null); // Clear error when showing fallback data
      }
    } finally {
      setLoading(false);
    }
  };

  const getActivityById = (id: string): ActivityDetail | null => {
    console.log('Looking for activity with ID:', id);
    console.log('Available activities:', activities);
    
    // Handle different ID formats
    const activity = activities.find(activity => {
      const matches = activity.id === id || 
             activity.title === id || 
             activity.id === `activity-${id}` ||
             activity.id === id.replace('activity-', '');
      
      if (matches) {
        console.log('Found activity:', activity);
      }
      
      return matches;
    });
    
    if (!activity) {
      console.log('Activity not found for ID:', id);
    }
    
    return activity || null;
  };

  const refreshActivities = async () => {
    await fetchActivities();
  };

  const clearActivities = () => {
    setActivities([]);
    setError(null);
  };

  // Fetch activities when location changes
  useEffect(() => {
    if (selectedLocation) {
      fetchActivities();
    }
  }, [selectedLocation]);

  const value: ActivitiesContextType = {
    activities,
    loading,
    error,
    fetchActivities,
    getActivityById,
    refreshActivities,
    clearActivities,
  };

  return (
    <ActivitiesContext.Provider value={value}>
      {children}
    </ActivitiesContext.Provider>
  );
}; 