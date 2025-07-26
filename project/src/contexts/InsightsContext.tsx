import { createContext, useContext, useState, ReactNode } from 'react';
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
}

const InsightsContext = createContext<InsightsContextType | undefined>(undefined);

export const InsightsProvider = ({ children }: { children: ReactNode }) => {
  const { selectedLocation } = useLocation();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeArea = async (timeRange: string) => {
    if (!selectedLocation) {
      setError('No location selected. Please pin a location first.');
      return;
    }

    setLoading(true);
    setError(null);
    
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
      
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const clearData = () => {
    setData(null);
    setError(null);
  };

  const value: InsightsContextType = {
    data,
    loading,
    error,
    analyzeArea,
    clearData
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