import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Map, MessageSquare, Plus, User, TrendingUp, Settings, Users, Calendar } from 'lucide-react';
import { MobileHeader } from './MobileHeader';
import { Sidebar } from './Sidebar';
import { useInsights } from '../contexts/InsightsContext';

interface PersistentLayoutProps {
  children: ReactNode;
}

const navItems = [
  { id: 'home', label: 'Home', icon: Home, path: '/' },
  { id: 'map', label: 'Map', icon: Map, path: '/map' },
  { id: 'create', label: 'Create', icon: Plus, path: '/create', isSpecial: true },
  { id: 'feed', label: 'Feed', icon: MessageSquare, path: '/feed' },
  { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
];

const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/' },
  { id: 'map', label: 'City Map', icon: Map, path: '/map' },
  { id: 'feed', label: 'Community Feed', icon: MessageSquare, path: '/feed' },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp, path: '/insights' },
  // { id: 'community', label: 'Community', icon: Users, path: '/community' },
];

export const PersistentLayout = ({ children }: PersistentLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState('dashboard');
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

  const getActiveTab = () => {
    const currentPath = location.pathname;
    const activeItem = navItems.find(item => item.path === currentPath);
    return activeItem?.id || 'home';
  };

  const getActiveSidebarTab = () => {
    const currentPath = location.pathname;
    const activeItem = sidebarItems.find(item => item.path === currentPath);
    return activeItem?.id || 'dashboard';
  };

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const handleSidebarClick = (path: string) => {
    navigate(path);
    setMobileSidebarOpen(false); // Close mobile sidebar when navigating
  };

  const handleMenuToggle = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  const handleQuickPost = () => {
    navigate('/create');
  };

  const handleProfileToggle = () => {
    navigate('/profile');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Desktop Layout with Persistent Sidebar */}
      <div className="hidden lg:flex">
        {/* Persistent Sidebar */}
        <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg border-r border-gray-200 z-40">
          <div className="p-4">
            {/* Logo */}
            <div className="flex items-center space-x-3 mb-8">
              <img src="/icon.png" alt="SynapCity Logo" className="w-10 h-10 rounded-lg" />
              <span className="text-xl font-bold text-gray-800">SynapCity</span>
            </div>

            {/* Sidebar Navigation */}
            <nav className="space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = getActiveSidebarTab() === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSidebarClick(item.path)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white shadow-lg'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Area Health - Only show on desktop */}
          <div className="absolute bottom-4 left-4 right-4">
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
        </aside>

        {/* Main Content with Sidebar Offset */}
        <main className="flex-1 ml-64">
          {children}
        </main>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        {/* Mobile Header */}
        <MobileHeader
          onMenuToggle={handleMenuToggle}
          onQuickPost={handleQuickPost}
          onProfileToggle={handleProfileToggle}
        />

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <div className={`fixed top-0 left-0 h-full w-80 bg-white shadow-lg border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <Sidebar 
            activeTab={getActiveSidebarTab()} 
            setActiveTab={(tab) => {
              setActiveSidebarTab(tab);
              const item = sidebarItems.find(item => item.id === tab);
              if (item) {
                handleSidebarClick(item.path);
              }
            }}
            mobile={true}
          />
        </div>

        {/* Main Content */}
        <main className="pt-16 pb-20">
          {children}
        </main>

        {/* Persistent Bottom Navigation - Only on Mobile */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-40 shadow-lg">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = getActiveTab() === item.id;
              
              if (item.isSpecial) {
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.path)}
                    className="flex flex-col items-center justify-center p-2 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-full shadow-lg transform hover:scale-105 transition-all duration-200 -mt-6"
                  >
                    <Icon className="w-6 h-6" />
                  </button>
                );
              }
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.path)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}; 