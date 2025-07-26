import { useEffect, useState } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Users, Activity, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '../lib/api';
import { useLocation } from '../contexts/LocationContext';

export default function InsightsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedLocation } = useLocation();

  useEffect(() => {
    fetchData();
  }, [selectedLocation]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (selectedLocation) {
        response = await apiFetch(`http://0.0.0.0:8000/api/v1/insights/area-insights?latitude=${selectedLocation.latitude}&longitude=${selectedLocation.longitude}`);
      } else {
        response = await apiFetch('http://0.0.0.0:8000/api/v1/insights/area-analysis-response');
      }
      if (!response.ok) throw new Error('Failed to fetch area analysis');
      const json = await response.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Area Insights</h2>
        <p className="text-gray-600">
          {selectedLocation ? 
            `Analysis for ${selectedLocation.locationName || 'your selected area'}` : 
            'General area analysis and trends'
          }
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading insights...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Crime Trends */}
          {data.crimeTrend && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Crime Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.crimeTrend.daily && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Daily Trends</h4>
                      <div className="space-y-2">
                        {data.crimeTrend.daily.map((trend: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-700">{trend.date || `Day ${idx + 1}`}</span>
                            <Badge variant={trend.count > 5 ? 'destructive' : trend.count > 2 ? 'secondary' : 'default'}>
                              {trend.count || 0} incidents
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Water Shortage Trends */}
          {data.waterShortageTrend && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Water Shortage Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.waterShortageTrend.daily && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Daily Reports</h4>
                      <div className="space-y-2">
                        {data.waterShortageTrend.daily.map((trend: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <span className="text-sm text-gray-700">{trend.date || `Day ${idx + 1}`}</span>
                            <Badge variant={trend.severity === 'high' ? 'destructive' : trend.severity === 'medium' ? 'secondary' : 'default'}>
                              {trend.severity || 'low'} severity
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Community Activity */}
          {data.communityActivity && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  Community Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(data.communityActivity) ? (
                    <div className="space-y-2">
                      {data.communityActivity.map((activity: any, idx: number) => (
                        <div key={idx} className="p-3 bg-green-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-1">{activity.title || `Activity ${idx + 1}`}</h4>
                          <p className="text-sm text-gray-600">{activity.description || activity}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">{JSON.stringify(data.communityActivity)}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Infrastructure Status */}
          {data.infrastructureStatus && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  Infrastructure Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(data.infrastructureStatus) ? (
                    <div className="space-y-2">
                      {data.infrastructureStatus.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                          <span className="text-sm text-gray-700">{item.name || `Item ${idx + 1}`}</span>
                          <Badge variant={item.status === 'good' ? 'default' : item.status === 'fair' ? 'secondary' : 'destructive'}>
                            {item.status || 'unknown'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">{JSON.stringify(data.infrastructureStatus)}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Other Insights */}
          {Object.entries(data).filter(([key]) => !['crimeTrend', 'waterShortageTrend', 'communityActivity', 'infrastructureStatus'].includes(key)).map(([category, insights]: any) => (
            <Card key={category} className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                  {category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(insights) ? (
                    <div className="space-y-2">
                      {insights.map((item: any, idx: number) => (
                        <div key={idx} className="p-3 bg-orange-50 rounded-lg">
                          <p className="text-sm text-gray-700">{typeof item === 'string' ? item : JSON.stringify(item)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 overflow-x-auto">
                      <pre>{JSON.stringify(insights, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
} 