
import { useState } from 'react';
import { User, Settings, Bell, Shield, HelpCircle, LogOut, Edit, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '../hooks/useAuth';

interface ProfileProps {
  onClose: () => void;
}

export const Profile = ({ onClose }: ProfileProps) => {
  const { user, isAnonymous, loading, signInWithGoogle, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    location: 'Downtown, City Center',
    bio: 'Active community member who loves helping neighbors stay informed about local events and issues.'
  });
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushNotifications: true,
    weeklyDigest: false,
    emergencyAlerts: true
  });

  const handleSave = () => {
    setIsEditing(false);
    // Here you would typically save to a backend
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'help', label: 'Help', icon: HelpCircle }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={user?.photoURL || '/placeholder.svg'} />
                  <AvatarFallback className="text-xl font-semibold bg-gradient-to-br from-blue-500 to-green-500 text-white">
                    {user?.displayName ? user.displayName.split(' ').map(n => n[0]).join('') : 'A'}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute -bottom-2 -right-2 p-2 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-800">{user?.displayName || 'Anonymous User'}</h2>
                <p className="text-gray-600">{user?.email || 'Not signed in'}</p>
              </div>
            </div>

            {/* Profile Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Personal Information</h3>
                <Button
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  variant="outline"
                  size="sm"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {isEditing ? 'Save' : 'Edit'}
                </Button>
              </div>

              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={userInfo.name}
                    onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userInfo.email}
                    onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={userInfo.phone}
                    onChange={(e) => setUserInfo({ ...userInfo, phone: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={userInfo.location}
                    onChange={(e) => setUserInfo({ ...userInfo, location: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    value={userInfo.bio}
                    onChange={(e) => setUserInfo({ ...userInfo, bio: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1 w-full p-2 border border-gray-300 rounded-md resize-none h-20 disabled:bg-gray-50"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">Notification Preferences</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Alerts</Label>
                  <p className="text-sm text-gray-600">Receive important updates via email</p>
                </div>
                <Switch
                  checked={notifications.emailAlerts}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, emailAlerts: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-gray-600">Get real-time alerts on your device</p>
                </div>
                <Switch
                  checked={notifications.pushNotifications}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, pushNotifications: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Weekly Digest</Label>
                  <p className="text-sm text-gray-600">Summary of community activity</p>
                </div>
                <Switch
                  checked={notifications.weeklyDigest}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyDigest: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Emergency Alerts</Label>
                  <p className="text-sm text-gray-600">Critical safety notifications</p>
                </div>
                <Switch
                  checked={notifications.emergencyAlerts}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, emergencyAlerts: checked })}
                />
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">App Settings</h3>
            
            <div className="space-y-4">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="w-4 h-4 mr-2" />
                Language & Region
              </Button>
              
              <Button variant="outline" className="w-full justify-start">
                <Bell className="w-4 h-4 mr-2" />
                Sound Settings
              </Button>
              
              <Button variant="outline" className="w-full justify-start">
                <Shield className="w-4 h-4 mr-2" />
                Data & Storage
              </Button>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">Privacy & Security</h3>
            
            <div className="space-y-4">
              <Button variant="outline" className="w-full justify-start">
                <Shield className="w-4 h-4 mr-2" />
                Privacy Policy
              </Button>
              
              <Button variant="outline" className="w-full justify-start">
                <Settings className="w-4 h-4 mr-2" />
                Account Security
              </Button>
              
              <Button variant="outline" className="w-full justify-start">
                <User className="w-4 h-4 mr-2" />
                Data Export
              </Button>
            </div>
          </div>
        );

      case 'help':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">Help & Support</h3>
            
            <div className="space-y-4">
              <Button variant="outline" className="w-full justify-start">
                <HelpCircle className="w-4 h-4 mr-2" />
                FAQ
              </Button>
              
              <Button variant="outline" className="w-full justify-start">
                <Settings className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
              
              <Button variant="outline" className="w-full justify-start">
                <User className="w-4 h-4 mr-2" />
                Community Guidelines
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="relative max-w-lg mx-auto bg-white rounded-xl shadow-lg p-6">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={onClose} aria-label="Close profile">
          <X className="w-5 h-5" />
        </button>
        {/* Profile Header */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Avatar className="w-24 h-24">
              <AvatarImage src={user?.photoURL || '/placeholder.svg'} />
              <AvatarFallback className="text-xl font-semibold bg-gradient-to-br from-blue-500 to-green-500 text-white">
                {user?.displayName ? user.displayName.split(' ').map(n => n[0]).join('') : 'A'}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800">{user?.displayName || 'Anonymous User'}</h2>
            <p className="text-gray-600">{user?.email || 'Not signed in'}</p>
          </div>
        </div>
        {/* Auth Actions */}
        <div className="flex flex-col items-center mt-6">
          {loading ? (
            <span className="text-gray-500">Loading...</span>
          ) : isAnonymous ? (
            <Button
              onClick={signInWithGoogle}
              className="bg-white border border-gray-300 text-blue-600 font-semibold flex items-center gap-2 px-4 py-2 rounded hover:bg-blue-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Sign in with Google
            </Button>
          ) : (
            <Button
              onClick={signOut}
              className="bg-red-50 border border-red-200 text-red-600 font-semibold flex items-center gap-2 px-4 py-2 rounded hover:bg-red-100 mt-2"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </Button>
          )}
        </div>
        {/* ...rest of the profile UI (tabs, info, etc.) ... */}
      </div>
    </div>
  );
};
