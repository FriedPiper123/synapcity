import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Activity, Shield, Zap, Droplets } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiFetch } from '../lib/api';

interface AreaInsightsProps {
  latitude: number;
  longitude: number;
  refreshKey?: number;
}

interface AreaTrend {
  period: string;
  value: number;
  change: number;
}

interface AreaInsights {
  overallSentiment: 'positive' | 'negative' | 'neutral';
  powerOutageFrequency: 'low' | 'medium' | 'high';
  crimeTrend: AreaTrend[];
  waterShortageTrend: AreaTrend[];
  lastUpdated: string;
}

export const AreaInsights: React.FC<AreaInsightsProps> = ({ 
  latitude, 
  longitude, 
  refreshKey = 0 
}) => {
  const [insights, setInsights] = useState<AreaInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    fetchAreaInsights();
  }, [latitude, longitude, refreshKey]);

  const fetchAreaInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
      });
      
      // Create the API call promise
      const apiPromise = apiFetch(
        `/api/v1/insights/area-insights?latitude=${latitude}&longitude=${longitude}`
      );
      
      // Race between timeout and API call
      const response = await Promise.race([apiPromise, timeoutPromise]) as Response;
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      // Validate the data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format received from server');
      }
      
      // Check if required fields exist and have the correct structure
      if (!data.crimeTrend || !Array.isArray(data.crimeTrend.daily)) {
        throw new Error('Missing or invalid crime trend data');
      }
      
      if (!data.waterShortageTrend || !Array.isArray(data.waterShortageTrend.daily)) {
        throw new Error('Missing or invalid water shortage trend data');
      }
      
      if (typeof data.powerOutageFrequency !== 'number') {
        throw new Error('Missing or invalid power outage frequency data');
      }
      
      if (typeof data.overallSentiment !== 'number') {
        throw new Error('Missing or invalid sentiment data');
      }
      
      // Ensure arrays have minimum length
      if (data.crimeTrend.daily.length === 0) {
        data.crimeTrend.daily = [0, 0, 0, 0, 0, 0, 0];
      }
      
      if (data.waterShortageTrend.daily.length === 0) {
        data.waterShortageTrend.daily = [0, 0, 0, 0, 0, 0, 0];
      }
      
      // Transform data to match our interface
      const transformedData: AreaInsights = {
        overallSentiment: data.overallSentiment >= 0.5 ? 'positive' : data.overallSentiment >= 0 ? 'neutral' : 'negative',
        powerOutageFrequency: data.powerOutageFrequency <= 0.3 ? 'low' : data.powerOutageFrequency <= 0.6 ? 'medium' : 'high',
        crimeTrend: data.crimeTrend.daily.map((value: number, index: number) => ({
          period: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index] || `Day ${index + 1}`,
          value: value,
          change: 0 // We don't have change data in the API response
        })),
        waterShortageTrend: data.waterShortageTrend.daily.map((value: number, index: number) => ({
          period: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index] || `Day ${index + 1}`,
          value: value,
          change: 0 // We don't have change data in the API response
        })),
        lastUpdated: data.lastUpdatedAt || new Date().toISOString()
      };
      
      setInsights(transformedData);
    } catch (err) {
      console.error('Error fetching area insights:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // Don't show dummy data - just set insights to null
      setInsights(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchAreaInsights();
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-500';
      case 'negative': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getSentimentText = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'Positive';
      case 'negative': return 'Negative';
      default: return 'Neutral';
    }
  };

  const getPowerOutageColor = (frequency: string) => {
    switch (frequency) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };

  const getPowerOutageText = (frequency: string) => {
    switch (frequency) {
      case 'high': return 'High';
      case 'medium': return 'Medium';
      default: return 'Low';
    }
  };

  const renderTrendBar = (trend: AreaTrend[], title: string, color: string) => {
    const maxValue = Math.max(...trend.map(t => t.value));
    
    return (
      <div className="space-y-3">
        <h4 className="font-semibold text-foreground">{title}</h4>
        <div className="flex items-end gap-1 h-20">
          {trend.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div 
                className={`w-full rounded-t ${color} transition-all duration-300`}
                style={{ 
                  height: `${(item.value / maxValue) * 100}%`,
                  minHeight: '8px'
                }}
              />
              <span className="text-xs text-muted-foreground mt-1">{item.period}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
        <span className="text-sm text-gray-600">Loading insights...</span>
      </div>
    );
  }

  if (error && !insights) {
    return (
      <div className="flex flex-col items-center py-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-600 font-medium">Error Loading Insights</span>
        </div>
        <p className="text-xs text-gray-600 mb-3 text-center">{error}</p>
        <Button onClick={handleRetry} size="sm" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="flex flex-col items-center py-4">
        <Activity className="w-6 h-6 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 text-center">No insights available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Sentiment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Overall Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`${getSentimentColor(insights.overallSentiment)} border-current`}
              >
                {getSentimentText(insights.overallSentiment)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Community mood analysis
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Power Outage Frequency */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Power Outage Frequency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`${getPowerOutageColor(insights.powerOutageFrequency)} border-current`}
              >
                {getPowerOutageText(insights.powerOutageFrequency)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Based on recent reports
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Crime Trend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Crime Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderTrendBar(insights.crimeTrend, 'Monthly Crime Reports', 'bg-red-500')}
        </CardContent>
      </Card>

      {/* Water Shortage Trend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Droplets className="w-5 h-5" />
            Water Shortage Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderTrendBar(insights.waterShortageTrend, 'Monthly Water Issues', 'bg-blue-500')}
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-xs text-muted-foreground text-center">
        Last updated: {new Date(insights.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}; 