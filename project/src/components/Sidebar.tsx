
import { Home, Map, MessageSquare, Calendar, Settings, Users, TrendingUp, X, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInsights } from '../contexts/InsightsContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobile?: boolean;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'map', label: 'City Map', icon: Map },
  { id: 'feed', label: 'Community Feed', icon: MessageSquare },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
];

export const Sidebar = ({ activeTab, setActiveTab, mobile = false }: SidebarProps) => {
  const navigate = useNavigate();
  const { data, loading, isAutoFetching } = useInsights();

  // Helper functions for score colors (matching Insights page)
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

  const getProgressBarColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-green-600';
    if (score >= 60) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  // Get area health data
  const overallScore = data?.analysis?.overallScore;
  const isDataLoading = loading || isAutoFetching;
  return (
    <aside className={`${mobile ? 'w-full' : 'fixed left-0 top-0 h-full w-16 lg:w-64'} bg-white shadow-lg border-r border-gray-200 z-40`}>
      <div className="p-4">
        {mobile && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <img src="/icon.png" alt="SynapCity Logo" className="w-10 h-10 rounded-lg" />
              <span className="text-xl font-bold text-gray-800">SynapCity</span>
            </div>
          </div>
        )}

        {!mobile && (
          <div className="flex items-center space-x-3 mb-8">
            <img src="/icon.png" alt="SynapCity Logo" className="w-10 h-10 rounded-lg" />
            <span className="hidden lg:block text-xl font-bold text-gray-800">SynapCity</span>
          </div>
        )}

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className={`${mobile ? 'block' : 'hidden lg:block'} font-medium`}>{item.label}</span>
              </button>
            );
          })}
                            {/* Add City Map navigation */}
          <button
            onClick={() => navigate('/create')}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-all duration-200"
          >
            <PlusCircle className="w-5 h-5" />
            <span className={`${mobile ? 'block' : 'hidden lg:block'} font-medium`}>Create Post</span>
          </button>
        </nav>
      </div>

      {/* Area Health - Only show on desktop */}
      {!mobile && (
        <div className="hidden lg:block absolute bottom-4 left-4 right-4">
          <div className={`rounded-lg p-4 ${overallScore ? getScoreBgColor(overallScore) : 'bg-gray-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Area Health</span>
              {isDataLoading ? (
                <div className="flex items-center gap-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                  <span className="text-xs text-gray-600">Loading...</span>
                </div>
              ) : overallScore !== undefined ? (
                <span className={`text-sm font-bold ${getScoreColor(overallScore)}`}>
                  {overallScore}%
                </span>
              ) : (
                <span className="text-xs text-gray-500">No data</span>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  overallScore ? `bg-gradient-to-r ${getProgressBarColor(overallScore)}` : 'bg-gray-300'
                }`}
                style={{ width: overallScore ? `${overallScore}%` : '0%' }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {isDataLoading 
                ? "Analyzing current area health..." 
                : overallScore !== undefined
                  ? overallScore >= 80 
                    ? "Excellent area health!" 
                    : overallScore >= 60 
                      ? "Good area health!" 
                      : "Needs improvement"
                  : "Analyzing your location..."
              }
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};
