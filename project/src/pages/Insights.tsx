import { useEffect, useState } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Users, Activity, BarChart3, MapPin, Target, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  ChartLegend, 
  ChartLegendContent 
} from '@/components/ui/chart';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { apiFetch } from '../lib/api';
import { useLocation } from '../contexts/LocationContext';

export default function InsightsPage() {
  const { selectedLocation } = useLocation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIncidents, setExpandedIncidents] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState('24hours');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch('http://0.0.0.0:8000/api/v1/insights/area-analysis-response');
      if (!response.ok) throw new Error('Failed to fetch area analysis');
      const json = await response.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'moderate': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'good': return 'default';
      case 'moderate': return 'secondary';
      case 'poor': return 'destructive';
      default: return 'outline';
    }
  };

  const toggleIncidentAccordion = (category: string) => {
    const newExpanded = new Set(expandedIncidents);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedIncidents(newExpanded);
  };

  const prepareHistoricalChartData = () => {
    if (!data?.historicalData?.monthly_scores) return [];
    
    const categories = Object.keys(data.historicalData.monthly_scores);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return months.map((month, monthIndex) => {
      const dataPoint: any = { month };
      categories.forEach(category => {
        const categoryData = data.historicalData.monthly_scores[category];
        if (categoryData && categoryData[monthIndex] !== undefined) {
          dataPoint[category] = categoryData[monthIndex];
        }
      });
      return dataPoint;
    });
  };

  const chartColors = [
    'rgba(59, 130, 246, 0.8)',   // Blue
    'rgba(16, 185, 129, 0.8)',   // Green
    'rgba(245, 158, 11, 0.8)',   // Yellow
    'rgba(239, 68, 68, 0.8)',    // Red
    'rgba(139, 92, 246, 0.8)',   // Purple
    'rgba(236, 72, 153, 0.8)',   // Pink
  ];

  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Area Analysis</h2>
          <p className="text-gray-600">
            Comprehensive analysis and insights for the selected area
          </p>
        </div>

        {/* Time Range Input and Analyze Button */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="timeRange" className="text-sm font-medium">Time Range:</Label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24hours">24 Hours</SelectItem>
                <SelectItem value="7days">7 Days</SelectItem>
                <SelectItem value="30days">30 Days</SelectItem>
                <SelectItem value="90days">90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleAnalyze} 
            disabled={loading || !selectedLocation}
            size="sm"
          >
            {loading ? 'Analyzing...' : 'Analyze Area'}
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading area analysis...</p>
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
          <div className="space-y-6">
            {/* Area Overview */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Area Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {data.area?.area || 'Unknown Area'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {data.area?.city}, {data.area?.country}
                    </p>
                    <p className="text-sm text-gray-700 mb-4">
                      {data.area?.characteristics}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          Analysis Radius: {data.area?.analysisRadius}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          Data Confidence: {data.analysis?.dataConfidence}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="text-center">
                      <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getScoreBgColor(data.analysis?.overallScore)} mb-4`}>
                        <span className={`text-2xl font-bold ${getScoreColor(data.analysis?.overallScore)}`}>
                          {data.analysis?.overallScore}
                        </span>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900">Overall Score</h4>
                      <Badge variant={getStatusBadgeVariant(data.analysis?.overallStatus)} className="mt-2">
                        {data.analysis?.overallStatus}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Historical Data Chart */}
            {data?.historicalData?.monthly_scores && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    Historical Performance Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-80 overflow-hidden">
                    <ChartContainer
                      config={{
                        water: {
                          label: "Water",
                          color: chartColors[0],
                        },
                        electricity: {
                          label: "Electricity", 
                          color: chartColors[1],
                        },
                        traffic: {
                          label: "Traffic",
                          color: chartColors[2],
                        },
                        safety: {
                          label: "Safety",
                          color: chartColors[3],
                        },
                        pollution: {
                          label: "Pollution",
                          color: chartColors[4],
                        },
                        infrastructure: {
                          label: "Infrastructure",
                          color: chartColors[5],
                        },
                      }}
                    >
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart 
                          data={prepareHistoricalChartData()}
                          margin={{ top: 10, right: 20, left: 20, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 11 }}
                            axisLine={{ stroke: 'rgba(0,0,0,0.2)' }}
                            tickLine={{ stroke: 'rgba(0,0,0,0.2)' }}
                            height={60}
                          />
                          <YAxis 
                            domain={[0, 100]}
                            tick={{ fontSize: 11 }}
                            axisLine={{ stroke: 'rgba(0,0,0,0.2)' }}
                            tickLine={{ stroke: 'rgba(0,0,0,0.2)' }}
                            width={40}
                          />
                          <ChartTooltip 
                            content={<ChartTooltipContent />}
                            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                          />
                          <ChartLegend content={<ChartLegendContent />} />
                          {Object.keys(data.historicalData.monthly_scores).map((category, index) => (
                            <Bar 
                              key={category}
                              dataKey={category} 
                              fill={chartColors[index % chartColors.length]}
                              radius={[2, 2, 0, 0]}
                              opacity={0.8}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Category Details */}
            {data.analysis?.categoryScores && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(data.analysis.categoryScores).map(([category, categoryData]: [string, any]) => (
                  <Card key={category} className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-blue-600" />
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${getScoreColor(categoryData.score)}`}>
                            {categoryData.score}
                          </span>
                          <Badge variant={getStatusBadgeVariant(categoryData.status)}>
                            {categoryData.status}
                          </Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Trend:</span>
                            <Badge variant="outline" className="ml-2">
                              {categoryData.trend}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-gray-600">Frequency:</span>
                            <Badge variant="outline" className="ml-2">
                              {categoryData.frequency}
                            </Badge>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                          <p className="text-sm text-gray-600">{categoryData.summary}</p>
                        </div>

                        {categoryData.incidents && categoryData.incidents.length > 0 && (
                          <div>
                            <Collapsible 
                              open={expandedIncidents.has(category)}
                              onOpenChange={() => toggleIncidentAccordion(category)}
                            >
                              <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                  <h4 className="font-medium text-gray-900">
                                    Recent Incidents ({categoryData.incidentCount})
                                  </h4>
                                  {expandedIncidents.has(category) ? (
                                    <ChevronUp className="w-4 h-4 text-gray-500" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                  )}
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="space-y-2 mt-3">
                                  {categoryData.incidents.map((incident: any, idx: number) => (
                                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border-l-4 border-blue-200">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-sm">{incident.title}</span>
                                        <Badge variant={incident.resolved ? "default" : "secondary"}>
                                          {incident.resolved ? "Resolved" : "Active"}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-gray-600 mb-1">{incident.description}</p>
                                      <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>{incident.date}</span>
                                        <span>{incident.impact}</span>
                                      </div>
                                      {incident.reference_url && (
                                        <div className="mt-2">
                                          <a 
                                            href={incident.reference_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                                          >
                                            View Reference →
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Insights */}
            {data.analysis?.insights && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Key Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {data.analysis.insights.strengths && (
                      <div>
                        <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Strengths
                        </h4>
                        <ul className="space-y-2">
                          {data.analysis.insights.strengths.map((strength: string, idx: number) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {data.analysis.insights.challenges && (
                      <div>
                        <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Challenges
                        </h4>
                        <ul className="space-y-2">
                          {data.analysis.insights.challenges.map((challenge: string, idx: number) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                              {challenge}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {data.analysis.insights.recent_developments && (
                      <div>
                        <h4 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          Recent Developments
                        </h4>
                        <ul className="space-y-2">
                          {data.analysis.insights.recent_developments.map((development: string, idx: number) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                              {development}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Nearby Areas */}
            {data.area?.nearbyAreas && data.area.nearbyAreas.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Nearby Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {data.area.nearbyAreas.map((area: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-sm">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 