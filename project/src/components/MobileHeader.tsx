
import { Menu, Plus, User } from 'lucide-react';

interface MobileHeaderProps {
  onMenuToggle: () => void;
  onQuickPost: () => void;
  onProfileToggle: () => void;
}

export const MobileHeader = ({ onMenuToggle, onQuickPost, onProfileToggle }: MobileHeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-lg font-bold text-gray-800">SynapCity</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onProfileToggle}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <User className="w-6 h-6 text-gray-700" />
          </button>
          <button
            onClick={onQuickPost}
            className="p-2 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-full shadow-lg hover:from-blue-600 hover:to-green-600 transition-all duration-200"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  );
};
