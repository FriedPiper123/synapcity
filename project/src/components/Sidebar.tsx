
import { Home, Map, MessageSquare, Calendar, Settings, Users, TrendingUp, X, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  { id: 'community', label: 'Community', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar = ({ activeTab, setActiveTab, mobile = false }: SidebarProps) => {
  const navigate = useNavigate();
  return (
    <aside className={`${mobile ? 'w-full' : 'fixed left-0 top-0 h-full w-16 lg:w-64'} bg-white shadow-lg border-r border-gray-200 z-40`}>
      <div className="p-4">
        {mobile && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="text-xl font-bold text-gray-800">SynapCity</span>
            </div>
          </div>
        )}

        {!mobile && (
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
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
                    onClick={() => navigate('/map')}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-all duration-200"
                  >
                    <Map className="w-5 h-5" />
                    <span className={`${mobile ? 'block' : 'hidden lg:block'} font-medium`}>City Map</span>
                  </button>
          <button
            onClick={() => navigate('/insights')}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-all duration-200"
          >
            <TrendingUp className="w-5 h-5" />
            <span className={`${mobile ? 'block' : 'hidden lg:block'} font-medium`}>Insights</span>
          </button>
          <button
            onClick={() => navigate('/create')}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-all duration-200"
          >
            <PlusCircle className="w-5 h-5" />
            <span className={`${mobile ? 'block' : 'hidden lg:block'} font-medium`}>Create Post</span>
          </button>
        </nav>
      </div>

      {/* City Status - Only show on desktop */}
      {!mobile && (
        <div className="hidden lg:block absolute bottom-4 left-4 right-4">
          <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">City Health</span>
              <span className="text-sm font-bold text-green-600">85%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full w-4/5"></div>
            </div>
            <p className="text-xs text-gray-600 mt-2">Keep up the great work!</p>
          </div>
        </div>
      )}
    </aside>
  );
};
