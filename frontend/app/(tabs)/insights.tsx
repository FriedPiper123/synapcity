import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, useTheme, ActivityIndicator, Button, Divider, List } from 'react-native-paper';
import { useLocation } from '../../contexts/LocationContext';
import { apiFetch } from '../api';
import { router } from 'expo-router';

const API_URL = 'http://0.0.0.0:8000/api/v1/insights/area-analysis-response';

export default function InsightsScreen() {
  const theme = useTheme();
  const { selectedLocation } = useLocation();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any>(null);
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null);
  const [expandedSourceType, setExpandedSourceType] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchData();
  }, [selectedLocation]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch(API_URL);
      if (!response.ok) throw new Error('Failed to fetch area analysis');
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryAccordion = (cat: string) => {
    setExpandedCategory(expandedCategory === cat ? null : cat);
  };
  const handleSourceTypeAccordion = (type: string) => {
    setExpandedSourceType(expandedSourceType === type ? null : type);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }] }>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16, color: theme.colors.onSurface }}>Loading insights...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }] }>
        <Card style={{ backgroundColor: theme.colors.errorContainer }}>
          <Card.Content>
            <Text style={{ color: theme.colors.onErrorContainer }}>{error}</Text>
            <Button mode="contained" onPress={fetchData} style={{ marginTop: 12 }}>Retry</Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  if (!data) return null;
  const categoryScores = data.analysis?.categoryScores || {};
  const categories = Object.keys(categoryScores);
  const barData = categories?.map((cat) => ({
    value: categoryScores[cat].score,
    label: cat.charAt(0).toUpperCase() + cat.slice(1),
    frontColor: theme.colors.primary,
  }));
  
  const overallScore = data.analysis?.overallScore;
  const overallStatus = data.analysis?.overallStatus;
  const historical = data.historicalData?.monthly_scores || {};
  const waterTrend = historical.water || [];
  const dataSourcesByType = data.dataSourcesByType || {};
  const sourceTypes = Object.keys(dataSourcesByType);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 12 }}>
      {/* Area Overview */}
      <Card style={[styles.sectionCard, { backgroundColor: theme.colors.secondaryContainer }]}> 
        <Card.Title 
          title={data.area?.area || 'Area Insights'} 
          subtitle={data.area?.city} 
          titleStyle={{ color: theme.colors.onSecondaryContainer, fontWeight: 'bold' }}
          subtitleStyle={{ color: theme.colors.onSecondaryContainer }}
        />
        <Card.Content>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSecondaryContainer }}>{data.area?.characteristics}</Text>
          <Divider style={{ marginVertical: 12, backgroundColor: theme.colors.outlineVariant }} />
          <Text variant="titleMedium" style={{ color: theme.colors.onSecondaryContainer, marginBottom: 8 }}>Overall Score: <Text style={{ fontWeight: 'bold' }}>{overallScore}</Text></Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSecondaryContainer }}>Status: {overallStatus}</Text>
        </Card.Content>
      </Card>
     <Card>
      <Card.Content>
          {/* <BarChart
            data={barData}
            barWidth={32}
            height={180}
            yAxisThickness={0}
            xAxisThickness={0}
            noOfSections={5}
            maxValue={100}
            isAnimated
            hideRules
            labelTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
          /> */}
        </Card.Content>
      </Card>

      <Card style={{ marginBottom: 16, backgroundColor: theme.colors.surface }}>
        <Card.Title title="Water Score Trend (Monthly)" />
        <Card.Content>
          {/* <LineChart
            data={waterTrend.map((v, i) => ({ value: v, label: (i+1).toString() }))}
            height={160}
            width={320}
            color={theme.colors.primary}
            thickness={2}
            hideDataPoints={false}
            yAxisTextStyle={{ color: theme.colors.onSurfaceVariant }}
            xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant }}
            isAnimated
            noOfSections={5}
            maxValue={100}
          /> */}
        </Card.Content>
        </Card>
    
      <View style={styles.sectionSpacing} />
      <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceVariant }]}> 
        <Card.Title title="Category Scores" titleStyle={{ color: theme.colors.onSurfaceVariant, fontWeight: 'bold' }} />
        <Card.Content>
          {categories.map((cat) => {
            const catData = categoryScores[cat];
            return (
              <List.Accordion
                key={cat}
                title={cat.charAt(0).toUpperCase() + cat.slice(1)}
                description={`Incidents: ${catData.incidentCount}  |  Score: ${catData.score}  |  Status: ${catData.status}`}
                expanded={expandedCategory === cat}
                onPress={() => handleCategoryAccordion(cat)}
                titleStyle={{ color: theme.colors.primary, fontWeight: 'bold' }}
                style={{ backgroundColor: theme.colors.background, borderRadius: 8, marginBottom: 6 }}
              >
                <View style={{ padding: 8, backgroundColor: theme.colors.surface, borderRadius: 8 }}>
                  <Text style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginBottom: 4 }}>Summary</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>{catData.summary}</Text>
                  <Text style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginBottom: 4 }}>Trend</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>{catData.trend} ({catData.frequency})</Text>
                  <Text style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginBottom: 4 }}>Sentiment</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>{catData.sentiment}</Text>
                  <Text style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginBottom: 4 }}>Incidents</Text>
                  {catData.incidents && catData.incidents.length > 0 ? (
                    catData.incidents.map((incident: any, idx: number) => (
                      <Card key={idx} style={{ marginBottom: 8, backgroundColor: theme.colors.secondaryContainer, marginTop : 60 }}>
                        <Card.Content>
                          <Text style={{ color: theme.colors.onSecondaryContainer, fontWeight: 'bold' }}>{incident.title}</Text>
                          <Text style={{ color: theme.colors.onSecondaryContainer }}>{incident.description}</Text>
                          <Text style={{ color: theme.colors.onSecondaryContainer, fontSize: 12 }}>Date: {incident.date}</Text>
                          <Text style={{ color: theme.colors.onSecondaryContainer, fontSize: 12 }}>Impact: {incident.impact}</Text>
                          <Text style={{ color: theme.colors.onSecondaryContainer, fontSize: 12 }}>Source: {incident.source}</Text>
                          <Text style={{ color: theme.colors.onSecondaryContainer, fontSize: 12 }}>Resolved: {incident.resolved ? 'Yes' : 'No'}</Text>
                        </Card.Content>
                      </Card>
                    ))
                  ) : (
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>No incidents reported.</Text>
                  )}
                </View>
              </List.Accordion>
            );
          })}
        </Card.Content>
      </Card>

      {/* Key Insights */}
      <View style={styles.sectionSpacing} />
      <Card style={[styles.sectionCard, { backgroundColor: theme.colors.secondaryContainer }]}> 
        <Card.Title title="Key Insights" titleStyle={{ color: theme.colors.onSecondaryContainer, fontWeight: 'bold' }} />
        <Card.Content>
          <Text variant="titleSmall" style={{ marginBottom: 4, color: theme.colors.onSecondaryContainer }}>Strengths</Text>
          {data.analysis?.insights?.strengths?.map((s: string, i: number) => (
            <Text key={i} style={{ color: theme.colors.onSecondaryContainer, marginBottom: 2 }}>• {s}</Text>
          ))}
          <Divider style={{ marginVertical: 8, backgroundColor: theme.colors.outlineVariant }} />
          <Text variant="titleSmall" style={{ marginBottom: 4, color: theme.colors.onSecondaryContainer }}>Challenges</Text>
          {data.analysis?.insights?.challenges?.map((c: string, i: number) => (
            <Text key={i} style={{ color: theme.colors.onSecondaryContainer, marginBottom: 2 }}>• {c}</Text>
          ))}
          <Divider style={{ marginVertical: 8, backgroundColor: theme.colors.outlineVariant }} />
          <Text variant="titleSmall" style={{ marginBottom: 4, color: theme.colors.onSecondaryContainer }}>Recent Developments</Text>
          {data.analysis?.insights?.recent_developments?.map((d: string, i: number) => (
            <Text key={i} style={{ color: theme.colors.onSecondaryContainer, marginBottom: 2 }}>• {d}</Text>
          ))}
        </Card.Content>
      </Card>

      {/* Data Sources By Type Accordions */}
      <View style={styles.sectionSpacing} />
      <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceVariant }]}> 
        <Card.Title title="Data Sources" titleStyle={{ color: theme.colors.onSurfaceVariant, fontWeight: 'bold' }} />
        <Card.Content>
          {sourceTypes.map((type) => {
            const sources = dataSourcesByType[type];
            if (!sources || sources.length === 0) return null;
            return (
              <List.Accordion
                key={type}
                title={type.charAt(0).toUpperCase() + type.slice(1)}
                description={`Total: ${sources.length}`}
                expanded={expandedSourceType === type}
                onPress={() => handleSourceTypeAccordion(type)}
                titleStyle={{ color: theme.colors.primary, fontWeight: 'bold' }}
                style={{ backgroundColor: theme.colors.background, borderRadius: 8, marginBottom: 6 }}
              >
                <View style={{ padding: 8, backgroundColor: theme.colors.surface, borderRadius: 8, marginTop : 10 }}>
                  {/* Show first record always, rest only if expanded */}
                  {sources.map((src: any, idx: number) => (
                    (idx === 0 || expandedSourceType === type) && (
                      <Card key={idx} style={{ marginBottom: 8, backgroundColor: theme.colors.secondaryContainer }}>
                        <Card.Content>
                          <Text style={{ color: theme.colors.onSecondaryContainer, fontWeight: 'bold' }}>{src.name}</Text>
                          <Text style={{ color: theme.colors.onSecondaryContainer }}>{src.description}</Text>
                          <Text style={{ color: theme.colors.onSecondaryContainer, fontSize: 12 }}>{src.platform} | {src.type} | {src.coverage}</Text>
                          {src.url && (
                            <Text
                              style={{ color: theme.colors.primary, fontSize: 12, textDecorationLine: 'underline' }}
                              selectable
                              onPress={() => {
                                if (src.url) {
                                  router.push(src.url);
                                }
                              }}
                            >
                              {src.url}
                            </Text>
                          )}
                        </Card.Content>
                      </Card>
                    )
                  ))}
                </View>
              </List.Accordion>
            );
          })}
        </Card.Content>
      </Card>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sectionCard: {
    borderRadius: 16,
    marginBottom: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  sectionSpacing: {
    height: 16,
  },
}); 