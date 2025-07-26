
import { Home, Map, MessageSquare, Calendar, Plus } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onQuickPost: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'quickpost', label: 'Post', icon: Plus, isSpecial: true },
  { id: 'feed', label: 'Feed', icon: MessageSquare },
  { id: 'summary', label: 'Summary', icon: Calendar },
];

export const MobileBottomNav = ({ activeTab, setActiveTab, onQuickPost }: MobileBottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-40">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          if (item.isSpecial) {
            return (
              <button
                key={item.id}
                onClick={onQuickPost}
                className="flex flex-col items-center justify-center p-2 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-full shadow-lg transform hover:scale-105 transition-all duration-200 -mt-6"
              >
                <Icon className="w-6 h-6" />
              </button>
            );
          }
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
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
  );
};
