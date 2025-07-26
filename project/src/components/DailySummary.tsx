
import { Calendar, TrendingUp, Users, MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react';

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
  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl lg:rounded-2xl p-4 lg:p-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
          <div>
            <h2 className="text-lg lg:text-2xl font-bold mb-2">Daily Summary</h2>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 lg:w-5 lg:h-5" />
              <span className="text-purple-100 text-sm lg:text-base">{summaryData.date}</span>
            </div>
          </div>
          <div className="text-center sm:text-right">
            <div className="text-2xl lg:text-3xl font-bold">{summaryData.totalPosts}</div>
            <div className="text-purple-100 text-sm lg:text-base">Total Posts</div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        <div className="bg-white rounded-lg lg:rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2 lg:mb-4">
            <div className="p-2 lg:p-3 bg-red-50 rounded-lg">
              <AlertCircle className="w-4 h-4 lg:w-6 lg:h-6 text-red-500" />
            </div>
            <span className="text-lg lg:text-2xl font-bold text-gray-800">{summaryData.newIssues}</span>
          </div>
          <p className="text-gray-600 font-medium text-sm lg:text-base">New Issues</p>
          <p className="text-xs lg:text-sm text-gray-500 mt-1">+2 from yesterday</p>
        </div>

        <div className="bg-white rounded-lg lg:rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2 lg:mb-4">
            <div className="p-2 lg:p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-4 h-4 lg:w-6 lg:h-6 text-green-500" />
            </div>
            <span className="text-lg lg:text-2xl font-bold text-gray-800">{summaryData.resolvedIssues}</span>
          </div>
          <p className="text-gray-600 font-medium text-sm lg:text-base">Resolved Issues</p>
          <p className="text-xs lg:text-sm text-gray-500 mt-1">+1 from yesterday</p>
        </div>

        <div className="bg-white rounded-lg lg:rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2 lg:mb-4">
            <div className="p-2 lg:p-3 bg-blue-50 rounded-lg">
              <Calendar className="w-4 h-4 lg:w-6 lg:h-6 text-blue-500" />
            </div>
            <span className="text-lg lg:text-2xl font-bold text-gray-800">{summaryData.upcomingEvents}</span>
          </div>
          <p className="text-gray-600 font-medium text-sm lg:text-base">Upcoming Events</p>
          <p className="text-xs lg:text-sm text-gray-500 mt-1">This week</p>
        </div>

        <div className="bg-white rounded-lg lg:rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2 lg:mb-4">
            <div className="p-2 lg:p-3 bg-purple-50 rounded-lg">
              <Users className="w-4 h-4 lg:w-6 lg:h-6 text-purple-500" />
            </div>
            <span className="text-lg lg:text-2xl font-bold text-gray-800">{summaryData.activeUsers}</span>
          </div>
          <p className="text-gray-600 font-medium text-sm lg:text-base">Active Users</p>
          <p className="text-xs lg:text-sm text-gray-500 mt-1">Today</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Top Issues */}
        <div className="bg-white rounded-lg lg:rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 lg:p-6 border-b border-gray-100">
            <h3 className="text-base lg:text-lg font-semibold text-gray-800">Top Issues</h3>
          </div>
          <div className="p-4 lg:p-6">
            <div className="space-y-3 lg:space-y-4">
              {topIssues.map((issue, index) => (
                <div key={index} className="flex items-center justify-between p-3 lg:p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 text-sm lg:text-base">{issue.title}</h4>
                    <p className="text-xs lg:text-sm text-gray-600">{issue.reports} reports</p>
                  </div>
                  <div className={`px-2 lg:px-3 py-1 rounded-full text-xs font-medium ${
                    issue.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    issue.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {issue.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-lg lg:rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 lg:p-6 border-b border-gray-100">
            <h3 className="text-base lg:text-lg font-semibold text-gray-800">Upcoming Events</h3>
          </div>
          <div className="p-4 lg:p-6">
            <div className="space-y-3 lg:space-y-4">
              {upcomingEvents.map((event, index) => (
                <div key={index} className="p-3 lg:p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2 text-sm lg:text-base">{event.title}</h4>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs lg:text-sm text-gray-600 space-y-1 sm:space-y-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 lg:w-4 lg:h-4" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 lg:w-4 lg:h-4" />
                        <span>{event.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3 lg:w-4 lg:h-4" />
                      <span>{event.participants} going</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-lg lg:rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 lg:p-6 border-b border-gray-100">
          <h3 className="text-base lg:text-lg font-semibold text-gray-800">Activity Timeline</h3>
        </div>
        <div className="p-4 lg:p-6">
          <div className="space-y-3 lg:space-y-4">
            <div className="flex items-start space-x-3 lg:space-x-4">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-800 text-sm lg:text-base">Street light fixed on Oak Avenue</p>
                <p className="text-xs lg:text-sm text-gray-600">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 lg:space-x-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-800 text-sm lg:text-base">Community cleanup event posted</p>
                <p className="text-xs lg:text-sm text-gray-600">4 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 lg:space-x-4">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-800 text-sm lg:text-base">New pothole reported on Main Street</p>
                <p className="text-xs lg:text-sm text-gray-600">6 hours ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
