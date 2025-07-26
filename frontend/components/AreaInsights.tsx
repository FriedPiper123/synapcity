import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Text, useTheme, ActivityIndicator, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiFetch } from '../app/api';

interface AreaInsightsProps {
  latitude: number;
  longitude: number;
  refreshKey?: number;
}

interface AreaTrend {
  daily: number[];
  weekly: number[];
  monthly: number[];
}

interface AreaInsights {
  name: string;
  crimeTrend: AreaTrend;
  powerOutageFrequency: number;
  waterShortageTrend: AreaTrend;
  overallSentiment: number;
  lastUpdatedAt: string;
}

export const AreaInsights: React.FC<AreaInsightsProps> = ({ latitude, longitude, refreshKey }) => {
  const [insights, setInsights] = React.useState<AreaInsights | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const theme = useTheme();

  React.useEffect(() => {
    fetchAreaInsights();
  }, [latitude, longitude, refreshKey]);

  const fetchAreaInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
      });
      
      // Create the API call promise
      const apiPromise = apiFetch(
        `http://0.0.0.0:8000/api/v1/insights/area-insights?latitude=${latitude}&longitude=${longitude}`
      );
      
      // Race between timeout and API call
      const response = await Promise.race([apiPromise]) as Response;
      
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
      
      setInsights(data);
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

  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 0.5) return '#22c55e'; // Positive - green
    if (sentiment >= 0) return '#f59e0b'; // Neutral - yellow
    return '#ef4444'; // Negative - red
  };

  const getSentimentText = (sentiment: number) => {
    if (sentiment >= 0.5) return 'Positive';
    if (sentiment >= 0) return 'Neutral';
    return 'Negative';
  };

  const getPowerOutageColor = (frequency: number) => {
    if (frequency <= 0.3) return '#22c55e'; // Low - green
    if (frequency <= 0.6) return '#f59e0b'; // Medium - yellow
    return '#ef4444'; // High - red
  };

  const getPowerOutageText = (frequency: number) => {
    if (frequency <= 0.3) return 'Low';
    if (frequency <= 0.6) return 'Medium';
    return 'High';
  };

  const renderTrendBar = (trendData: number[], title: string) => {
    if (!trendData || !Array.isArray(trendData) || trendData.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
            No trend data available
          </Text>
        </View>
      );
    }

    const average = trendData.reduce((a, b) => a + b, 0) / trendData.length;
    
    return (
      <View style={styles.trendContainer}>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginBottom: 8 }}>
          {title}: {average.toFixed(2)}
        </Text>
        <View style={styles.trendBar}>
          {trendData.map((value, index) => (
            <View
              key={index}
              style={[
                styles.trendBarItem,
                { 
                  backgroundColor: value > 0.5 ? '#ef4444' : value > 0.2 ? '#f59e0b' : '#22c55e',
                  height: Math.max(value * 40 + 10, 4)
                }
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={{ marginTop: 8, color: theme.colors.onSurface, fontSize: 12 }}>
          Loading insights...
        </Text>
      </View>
    );
  }

  if (error && !insights) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={24} color={theme.colors.error} />
        <Text style={{ color: theme.colors.error, marginTop: 8, fontSize: 12, textAlign: 'center' }}>
          {error}
        </Text>
        <Button 
          mode="text" 
          onPress={handleRetry}
          style={{ marginTop: 8 }}
          icon="refresh"
          compact
        >
          Retry
        </Button>
      </View>
    );
  }

  if (!insights) {
    return (
      <View style={styles.noDataContainer}>
        <MaterialCommunityIcons name="information" size={24} color={theme.colors.onSurfaceVariant} />
        <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, fontSize: 12, textAlign: 'center' }}>
          No insights available
        </Text>
      </View>
    );
  }

  // Ensure crimeTrend and waterShortageTrend exist with proper structure
  const crimeTrend = insights.crimeTrend?.daily || [0, 0, 0, 0, 0, 0, 0];
  const waterShortageTrend = insights.waterShortageTrend?.daily || [0, 0, 0, 0, 0, 0, 0];

  return (
    <View style={styles.container}>
      {/* Area Header */}
      <View style={[styles.headerCard, { backgroundColor: theme.colors.primary }]}>
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16, marginBottom: 4 }} numberOfLines={1}>
          📍 {insights.name}
        </Text>
        <Text style={{ color: '#dbeafe', fontSize: 12 }} numberOfLines={1}>
          Updated: {new Date(insights.lastUpdatedAt).toLocaleDateString()}
        </Text>
      </View>

      {/* Overall Sentiment */}
      <View style={[styles.insightCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.insightHeader}>
          <MaterialCommunityIcons 
            name="emoticon" 
            size={20} 
            color={getSentimentColor(insights.overallSentiment)} 
          />
          <Text style={{ color: theme.colors.onSurface, fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>
            Overall Sentiment
          </Text>
        </View>
        <View style={styles.insightValue}>
          <Text style={{ 
            color: getSentimentColor(insights.overallSentiment), 
            fontWeight: 'bold',
            fontSize: 16
          }} numberOfLines={1}>
            {getSentimentText(insights.overallSentiment)}
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }} numberOfLines={1}>
            Score: {insights.overallSentiment.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Power Outage Frequency */}
      <View style={[styles.insightCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.insightHeader}>
          <MaterialCommunityIcons 
            name="lightning-bolt" 
            size={20} 
            color={getPowerOutageColor(insights.powerOutageFrequency)} 
          />
          <Text style={{ color: theme.colors.onSurface, fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>
            Power Outage Frequency
          </Text>
        </View>
        <View style={styles.insightValue}>
          <Text style={{ 
            color: getPowerOutageColor(insights.powerOutageFrequency), 
            fontWeight: 'bold',
            fontSize: 16
          }} numberOfLines={1}>
            {getPowerOutageText(insights.powerOutageFrequency)}
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }} numberOfLines={1}>
            {(insights.powerOutageFrequency * 100).toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* Crime Trend */}
      <View style={[styles.insightCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.insightHeader}>
          <MaterialCommunityIcons name="shield-alert" size={20} color="#ef4444" />
          <Text style={{ color: theme.colors.onSurface, fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>
            Crime Trend
          </Text>
        </View>
        {renderTrendBar(crimeTrend, "Last 7 days")}
      </View>

      {/* Water Shortage Trend */}
      <View style={[styles.insightCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.insightHeader}>
          <MaterialCommunityIcons name="water" size={20} color="#3b82f6" />
          <Text style={{ color: theme.colors.onSurface, fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>
            Water Shortage Trend
          </Text>
        </View>
        {renderTrendBar(waterShortageTrend, "Last 7 days")}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 16,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 16,
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 16,
  },
  headerCard: {
    marginBottom: 12,
    borderRadius: 8,
    padding: 12,
    elevation: 1,
  },
  insightCard: {
    marginBottom: 8,
    borderRadius: 8,
    padding: 12,
    elevation: 1,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightValue: {
    alignItems: 'center',
  },
  trendContainer: {
    marginTop: 4,
  },
  trendBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 30,
    paddingHorizontal: 4,
  },
  trendBarItem: {
    flex: 1,
    marginHorizontal: 1,
    borderRadius: 1,
    minHeight: 2,
  },
}); 