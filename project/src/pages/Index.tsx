
import { useState } from 'react';
import { Dashboard } from '@/components/Dashboard';
import { SocialFeed } from '@/components/SocialFeed';
import { DailySummary } from '@/components/DailySummary';
import { Profile } from '@/components/Profile';
import { User } from 'lucide-react';

const Index = () => {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Desktop Layout */}
      <div className="hidden lg:block">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">SynapCity</h1>
              <p className="text-sm text-gray-600">Your local community hub</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowProfile(true)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <User className="w-5 h-5" />
              </button>
              <button
                onClick={() => window.location.href = '/create'}
                className="bg-gradient-to-r from-blue-500 to-green-500 text-white px-6 py-2 rounded-full font-medium hover:from-blue-600 hover:to-green-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                + Create Post
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="p-6">
          <Dashboard />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <main className="p-4">
          <Dashboard />
        </main>
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <Profile onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
};

export default Index;
