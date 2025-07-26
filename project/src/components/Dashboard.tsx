
import { MapPin, Users, MessageSquare, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

const stats = [
  { label: 'Active Issues', value: '23', icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-50' },
  { label: 'Resolved Today', value: '8', icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-50' },
  { label: 'Community Posts', value: '156', icon: MessageSquare, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  { label: 'Active Citizens', value: '1.2k', icon: Users, color: 'text-purple-500', bgColor: 'bg-purple-50' },
];

const recentActivities = [
  { type: 'issue', title: 'Pothole reported on Main Street', time: '2 min ago', severity: 'high' },
  { type: 'event', title: 'Community cleanup scheduled', time: '15 min ago', severity: 'low' },
  { type: 'resolved', title: 'Street light fixed on Oak Avenue', time: '1 hour ago', severity: 'medium' },
  { type: 'issue', title: 'Water leak at City Park', time: '2 hours ago', severity: 'high' },
];

export const Dashboard = () => {
  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-xl lg:rounded-2xl p-4 lg:p-6 text-white">
        <h2 className="text-lg lg:text-2xl font-bold mb-2">Welcome back, Mayor!</h2>
        <p className="text-blue-100 text-sm lg:text-base mb-3 lg:mb-4">Your city is thriving with community engagement</p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="text-sm lg:text-base font-medium">Downtown District</span>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="text-sm lg:text-base font-medium">+12% engagement</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg lg:rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2 lg:mb-4">
                <div className={`p-2 lg:p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 lg:w-6 lg:h-6 ${stat.color}`} />
                </div>
                <span className="text-lg lg:text-2xl font-bold text-gray-800">{stat.value}</span>
              </div>
              <p className="text-gray-600 font-medium text-sm lg:text-base">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg lg:rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 lg:p-6 border-b border-gray-100">
          <h3 className="text-base lg:text-lg font-semibold text-gray-800">Recent Activities</h3>
        </div>
        <div className="p-4 lg:p-6">
          <div className="space-y-3 lg:space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 lg:space-x-4 p-3 lg:p-4 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`p-2 rounded-full ${
                  activity.type === 'issue' ? 'bg-red-100' :
                  activity.type === 'resolved' ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                  {activity.type === 'issue' ? (
                    <AlertCircle className="w-4 h-4 lg:w-5 lg:h-5 text-red-500" />
                  ) : activity.type === 'resolved' ? (
                    <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-500" />
                  ) : (
                    <MessageSquare className="w-4 h-4 lg:w-5 lg:h-5 text-blue-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800 text-sm lg:text-base">{activity.title}</p>
                  <p className="text-xs lg:text-sm text-gray-600">{activity.time}</p>
                </div>
                <div className={`px-2 lg:px-3 py-1 rounded-full text-xs font-medium ${
                  activity.severity === 'high' ? 'bg-red-100 text-red-800' :
                  activity.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {activity.severity}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
