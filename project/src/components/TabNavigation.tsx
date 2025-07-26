import React from 'react';
import { Home, Map, TrendingUp, User, Plus } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onMenuToggle: () => void;
  onProfileToggle: () => void;
  onCreatePost: () => void;
}

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'insights', label: 'Insights', icon: TrendingUp },
];

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  onMenuToggle,
  onProfileToggle,
  onCreatePost,
}) => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border">
        <div className="flex items-center justify-around px-4 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
          <button
            onClick={onCreatePost}
            className="flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors text-primary hover:text-primary/80"
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs font-medium">Create</span>
          </button>
        </div>
      </div>
    );
  }

  // Desktop Top Navigation
  return (
    <div className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={onCreatePost}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2 inline" />
            Create Post
          </button>
        </div>
      </div>
    </div>
  );
}; 