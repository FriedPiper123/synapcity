import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiFetch } from '../lib/api';
import { useLocation } from './LocationContext';

interface InsightsData {
  area?: any;
  analysis?: any;
  historicalData?: any;
}

interface InsightsContextType {
  data: InsightsData | null;
  loading: boolean;
  error: string | null;
  analyzeArea: (timeRange: string) => Promise<void>;
  clearData: () => void;
  isAutoFetching: boolean;
  lastUpdated: Date | null;
}

const InsightsContext = createContext<InsightsContextType | undefined>(undefined);

export const InsightsProvider = ({ children }: { children: ReactNode }) => {
  const { selectedLocation } = useLocation();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoFetching, setIsAutoFetching] = useState(false);
  const [currentTimeRange, setCurrentTimeRange] = useState('24hours');
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAreaData = async (timeRange: string, isBackground: boolean = false) => {
    if (!selectedLocation) {
      if (!isBackground) {
        setError('No location selected. Please pin a location first.');
      }
      return false;
    }

    if (!isBackground) {
      setLoading(true);
      setError(null);
    }
    
    try {
      const payload = {
        coordinates: {
          type: "point",
          lat: selectedLocation.latitude,
          lng: selectedLocation.longitude
        },
        analysisType: "full",
        timeRange: timeRange
      };

      const response = await apiFetch('http://0.0.0.0:8000/api/v1/insights/analyze-area', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch area analysis: ${errorText}`);
      }
      
      const json = await response.json();
      setData(json);
      setCurrentTimeRange(timeRange);
      setLastUpdated(new Date());
      
      if (!isBackground) {
        setError(null);
      }
      
      return true;
      
    } catch (err: any) {
      if (!isBackground) {
        setError(err.message || 'Unknown error');
      } else {
        console.warn('Background fetch failed:', err.message);
      }
      return false;
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  const analyzeArea = async (timeRange: string) => {
    const success = await fetchAreaData(timeRange, false);
    if (success) {
      startAutoFetch();
    }
  };

  const startAutoFetch = () => {
    // Clear existing interval
    if (intervalId) {
      clearInterval(intervalId);
    }

    // Start new interval for background fetching every 12 seconds
    const newIntervalId = setInterval(async () => {
      if (selectedLocation && currentTimeRange) {
        setIsAutoFetching(true);
        await fetchAreaData(currentTimeRange, true);
        setIsAutoFetching(false);
      }
    }, 12000); // 12 seconds

    setIntervalId(newIntervalId);
  };

  const stopAutoFetch = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setIsAutoFetching(false);
  };

  const clearData = () => {
    setData(null);
    setError(null);
    setCurrentTimeRange('24hours');
    setLastUpdated(null);
    stopAutoFetch();
  };

  // Auto-fetch data when location is available (background fetch on website visit)
  useEffect(() => {
    if (selectedLocation && !data) {
      // Initial background fetch when visiting the website
      const performInitialFetch = async () => {
        console.log('Performing initial background fetch...');
        const success = await fetchAreaData(currentTimeRange, true);
        if (success) {
          startAutoFetch();
        }
      };
      
      performInitialFetch();
    }
  }, [selectedLocation]);

  // Clear data and stop auto-fetch when location changes
  useEffect(() => {
    return () => {
      stopAutoFetch();
    };
  }, [selectedLocation]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      stopAutoFetch();
    };
  }, []);

  const value: InsightsContextType = {
    data,
    loading,
    error,
    analyzeArea,
    clearData,
    isAutoFetching,
    lastUpdated
  };

  return (
    <InsightsContext.Provider value={value}>
      {children}
    </InsightsContext.Provider>
  );
};

export const useInsights = () => {
  const context = useContext(InsightsContext);
  if (context === undefined) {
    throw new Error('useInsights must be used within an InsightsProvider');
  }
  return context;
}; 