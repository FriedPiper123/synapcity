import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Card, List, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const summaryData = {
  date: 'March 15, 2024',
  totalPosts: 42,
  newIssues: 8,
  resolvedIssues: 5,
  upcomingEvents: 3,
  activeUsers: 187,
  topLocation: 'Downtown District',
};

const topIssues = [
  { title: 'Potholes on Main Street', reports: 12, status: 'investigating' },
  { title: 'Street Light Outages', reports: 8, status: 'in-progress' },
  { title: 'Park Maintenance', reports: 6, status: 'resolved' },
];

const upcomingEvents = [
  { title: 'Community Cleanup', date: 'March 18, 2024', location: 'City Park', participants: 45 },
  { title: 'Town Hall Meeting', date: 'March 20, 2024', location: 'City Hall', participants: 120 },
  { title: 'Street Fair', date: 'March 22, 2024', location: 'Market District', participants: 300 },
];

export const DailySummary = () => {
  const theme = useTheme();

  const renderMetricsRow = (startIndex: number) => (
    <View style={styles.metricsRow}>
      {[
        { label: 'New Issues', value: summaryData.newIssues, icon: 'alert-circle-outline', color: '#ef4444', bgColor: '#fee2e2', change: '+2 from yesterday' },
        { label: 'Resolved Issues', value: summaryData.resolvedIssues, icon: 'check-circle-outline', color: '#22c55e', bgColor: '#dcfce7', change: '+1 from yesterday' },
        { label: 'Upcoming Events', value: summaryData.upcomingEvents, icon: 'calendar', color: '#3b82f6', bgColor: '#dbeafe', change: 'This week' },
        { label: 'Active Users', value: summaryData.activeUsers, icon: 'account-group-outline', color: '#a78bfa', bgColor: '#ede9fe', change: 'Today' },
      ].slice(startIndex, startIndex + 2).map((metric, index) => (
        <Card key={startIndex + index} style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.metricContent}>
            <Avatar.Icon size={32} icon={metric.icon} style={{ backgroundColor: metric.bgColor }} color={metric.color} />
            <View style={styles.metricText}>
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>{metric.value}</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }} numberOfLines={2}>{metric.label}</Text>
              <Text style={{ 
                color: metric.color, 
                fontSize: 10, 
                marginTop: 2 
              }}>{metric.change}</Text>
            </View>
          </Card.Content>
        </Card>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={[styles.headerCard, { backgroundColor: theme.colors.secondary }]}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View>
              <Text variant="titleLarge" style={{ color: 'white', fontWeight: 'bold' }}>Daily Summary</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <MaterialCommunityIcons name="calendar" size={18} color="#ede9fe" />
                <Text style={{ color: '#ede9fe', marginLeft: 6 }}>{summaryData.date}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text variant="displaySmall" style={{ color: 'white', fontWeight: 'bold' }}>{summaryData.totalPosts}</Text>
              <Text style={{ color: '#ede9fe' }}>Total Posts</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
      
      {renderMetricsRow(0)}
      {renderMetricsRow(2)}
      
      <Card style={[styles.splitCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Title 
          title="Top Issues" 
          titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }} 
        />
        <Card.Content>
          {topIssues.map((issue, index) => (
            <List.Item
              key={index}
              title={issue.title}
              description={`${issue.reports} reports`}
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              right={props => (
                <View style={{ alignSelf: 'center', paddingHorizontal: 8 }}>
                  <Text style={{
                    backgroundColor:
                      issue.status === 'resolved' ? '#dcfce7' :
                      issue.status === 'in-progress' ? '#fef9c3' : '#fee2e2',
                    color:
                      issue.status === 'resolved' ? '#15803d' :
                      issue.status === 'in-progress' ? '#b45309' : '#b91c1c',
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    fontSize: 12,
                    fontWeight: 'bold',
                  }}>{issue.status}</Text>
                </View>
              )}
            />
          ))}
        </Card.Content>
      </Card>
      
      <Card style={[styles.splitCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Title 
          title="Upcoming Events" 
          titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }} 
        />
        <Card.Content>
          {upcomingEvents.map((event, index) => (
            <List.Item
              key={index}
              title={event.title}
              description={`${event.date} • ${event.location}`}
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              left={props => (
                <Avatar.Icon {...props} size={28} icon="calendar" style={{ backgroundColor: '#dbeafe' }} color="#3b82f6" />
              )}
              right={props => (
                <View style={{ alignSelf: 'center', paddingHorizontal: 8 }}>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>{event.participants} going</Text>
                </View>
              )}
            />
          ))}
        </Card.Content>
      </Card>
      
      <Card style={[styles.timelineCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Title 
          title="Activity Timeline" 
          titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }} 
        />
        <Card.Content>
          <List.Item
            title="Street light fixed on Oak Avenue"
            description="2 hours ago"
            titleStyle={{ color: theme.colors.onSurface }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            left={props => <Avatar.Icon {...props} size={20} icon="check-circle-outline" style={{ backgroundColor: '#dcfce7' }} color="#22c55e" />}
          />
          <List.Item
            title="Community cleanup event posted"
            description="4 hours ago"
            titleStyle={{ color: theme.colors.onSurface }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            left={props => <Avatar.Icon {...props} size={20} icon="calendar" style={{ backgroundColor: '#dbeafe' }} color="#3b82f6" />}
          />
          <List.Item
            title="New pothole reported on Main Street"
            description="6 hours ago"
            titleStyle={{ color: theme.colors.onSurface }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            left={props => <Avatar.Icon {...props} size={20} icon="alert-circle-outline" style={{ backgroundColor: '#fee2e2' }} color="#ef4444" />}
          />
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    elevation: 2,
  },
  metricContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricText: {
    alignItems: 'flex-end',
    flex: 1,
    marginLeft: 8,
  },
  splitCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  timelineCard: {
    borderRadius: 12,
    elevation: 2,
  },
}); 