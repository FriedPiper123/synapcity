import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, AlertCircle, Lightbulb, Calendar, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiFetch } from '../lib/api';
import { useLocation } from '../contexts/LocationContext';
import VulgarContentWarning from '../components/VulgarContentWarning';

// Issue presets for different categories
const ISSUE_PRESETS = {
  infrastructure: [
    {
      title: "Pothole Report",
      content: "There's a large pothole on [street name] that needs immediate attention. It's causing traffic issues and could damage vehicles.",
      category: "infrastructure"
    },
    {
      title: "Street Light Outage",
      content: "Street lights have been out for the past few days in [area name]. This is causing safety concerns for pedestrians and drivers.",
      category: "infrastructure"
    },
    {
      title: "Road Damage",
      content: "The road surface on [street name] is severely damaged and needs repair. It's affecting traffic flow and vehicle safety.",
      category: "infrastructure"
    }
  ],
  safety: [
    {
      title: "Traffic Signal Issue",
      content: "The traffic signal at [intersection] is not working properly. This is causing traffic congestion and safety hazards.",
      category: "safety"
    },
    {
      title: "Broken Sidewalk",
      content: "The sidewalk on [street name] is broken and poses a tripping hazard for pedestrians, especially elderly and disabled individuals.",
      category: "safety"
    },
    {
      title: "Missing Manhole Cover",
      content: "A manhole cover is missing on [street name]. This is a serious safety hazard that needs immediate attention.",
      category: "safety"
    }
  ],
  water_shortage: [
    {
      title: "Water Leak",
      content: "There's a water leak on [street name] that's been running for [duration]. This is wasting water and could cause road damage.",
      category: "water_shortage"
    },
    {
      title: "Low Water Pressure",
      content: "Water pressure in [area name] has been very low for the past few days. This is affecting daily activities.",
      category: "water_shortage"
    },
    {
      title: "Water Quality Issue",
      content: "The water quality in [area name] seems to have deteriorated. Residents are concerned about health implications.",
      category: "water_shortage"
    }
  ],
  power_outage: [
    {
      title: "Power Outage",
      content: "There's been a power outage in [area name] for the past [duration]. This is affecting daily activities and businesses.",
      category: "power_outage"
    },
    {
      title: "Faulty Street Light",
      content: "A street light on [street name] is flickering and needs repair. This affects nighttime visibility and safety.",
      category: "power_outage"
    },
    {
      title: "Electrical Hazard",
      content: "There's an exposed electrical wire on [street name] that poses a safety hazard. Immediate attention required.",
      category: "power_outage"
    }
  ],
  waste_management: [
    {
      title: "Garbage Not Collected",
      content: "Garbage collection was missed in [area name] today. The bins are overflowing and causing hygiene issues.",
      category: "waste_management"
    },
    {
      title: "Illegal Dumping",
      content: "Someone has been illegally dumping waste on [street name]. This is creating an environmental hazard.",
      category: "waste_management"
    },
    {
      title: "Recycling Bin Damaged",
      content: "The recycling bin on [street name] is damaged and needs replacement. This affects waste segregation efforts.",
      category: "waste_management"
    }
  ],
  transportation: [
    {
      title: "Bus Stop Issue",
      content: "The bus stop at [location] is in poor condition and needs maintenance. It's affecting public transportation users.",
      category: "transportation"
    },
    {
      title: "Traffic Congestion",
      content: "There's severe traffic congestion on [street name] during peak hours. This needs traffic management solutions.",
      category: "transportation"
    },
    {
      title: "Parking Problem",
      content: "There's a parking issue in [area name] that's causing inconvenience to residents and visitors.",
      category: "transportation"
    }
  ]
};

// Suggestion presets
const SUGGESTION_PRESETS = [
  {
    title: "Bike Lane Proposal",
    content: "I suggest adding bike lanes on [street name] to promote cycling and reduce traffic congestion. This would improve air quality and public health.",
    category: "transportation"
  },
  {
    title: "Community Garden",
    content: "I propose creating a community garden in [area name]. This would provide fresh produce, improve air quality, and bring neighbors together.",
    category: "community"
  },
  {
    title: "Solar Street Lights",
    content: "I suggest installing solar-powered street lights in [area name] to reduce energy costs and promote sustainability.",
    category: "infrastructure"
  },
  {
    title: "Recycling Program",
    content: "I propose implementing a comprehensive recycling program in [area name] to reduce waste and promote environmental consciousness.",
    category: "waste_management"
  },
  {
    title: "Public WiFi",
    content: "I suggest installing public WiFi hotspots in [area name] to improve digital connectivity for residents and visitors.",
    category: "infrastructure"
  },
  {
    title: "Neighborhood Watch",
    content: "I propose starting a neighborhood watch program in [area name] to improve community safety and foster stronger relationships.",
    category: "safety"
  }
];

// Event presets
const EVENT_PRESETS = [
  {
    title: "Community Cleanup",
    content: "Join us for a community cleanup event in [area name] on [date]. We'll provide all supplies. Let's make our neighborhood beautiful together!",
    category: "community"
  },
  {
    title: "Neighborhood Meeting",
    content: "Monthly neighborhood meeting scheduled for [date] at [location]. We'll discuss local issues and upcoming projects. All residents welcome!",
    category: "community"
  },
  {
    title: "Street Festival",
    content: "Annual street festival in [area name] on [date]. Food, music, and activities for all ages. Come celebrate our community!",
    category: "community"
  },
  {
    title: "Health Camp",
    content: "Free health checkup camp in [area name] on [date]. Basic screenings and consultations available. Sponsored by local healthcare providers.",
    category: "community"
  },
  {
    title: "Art Workshop",
    content: "Community art workshop in [area name] on [date]. All skill levels welcome. Materials provided. Let's create something beautiful together!",
    category: "community"
  },
  {
    title: "Emergency Preparedness",
    content: "Emergency preparedness workshop in [area name] on [date]. Learn first aid, disaster response, and safety protocols. Free training provided.",
    category: "safety"
  }
];

// Category options
const CATEGORIES = [
  { value: 'infrastructure', label: 'Infrastructure', icon: 'road' },
  { value: 'safety', label: 'Safety', icon: 'shield-check' },
  { value: 'water_shortage', label: 'Water', icon: 'water' },
  { value: 'power_outage', label: 'Power', icon: 'lightning-bolt' },
  { value: 'waste_management', label: 'Waste', icon: 'delete' },
  { value: 'transportation', label: 'Transport', icon: 'bus' },
  { value: 'other', label: 'Other', icon: 'dots-horizontal' }
];

export default function CreatePostPage() {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [type, setType] = useState('issue');
  const [category, setCategory] = useState('infrastructure');
  const [loading, setLoading] = useState(false);
  const [showVulgarWarning, setShowVulgarWarning] = useState(false);
  const [vulgarWarningData, setVulgarWarningData] = useState<any>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedLocation, getCurrentLocation } = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Use selected location or fallback to current location
    let finalLatitude, finalLongitude;
    
    if (selectedLocation) {
      finalLatitude = selectedLocation.latitude;
      finalLongitude = selectedLocation.longitude;
    } else {
      // Fallback to current location if no selected location
      try {
        if (!navigator.geolocation) {
          setError('Geolocation is not supported by this browser.');
          setLoading(false);
          return;
        }
        
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          });
        });
        
        finalLatitude = position.coords.latitude;
        finalLongitude = position.coords.longitude;
      } catch (error) {
        setError('Could not get your location. Please enable location access.');
        setLoading(false);
        return;
      }
    }

    try {
      const res = await apiFetch('/api/v1/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          type: type.toLowerCase(), // Backend expects lowercase enum
          category,
          location: { latitude: finalLatitude, longitude: finalLongitude },
          neighborhood: selectedLocation?.locationName || 'Current Location',
          mediaUrl: null,
          parentId: null,
          geohash: null
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        if (errorData['detail'] && errorData['detail']['code'] === 'VULGAR_CONTENT_DETECTED') {
          setVulgarWarningData(errorData['detail']);
          setShowVulgarWarning(true);
          setLoading(false);
          return;
        }
        throw new Error('Failed to create post');
      }
      
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    }
    setLoading(false);
  };

  const handlePresetSelect = (preset: any) => {
    setContent(preset.content);
    setCategory(preset.category);
    setShowPresets(false);
  };

  const getCurrentPresets = () => {
    if (type === 'issue') {
      return ISSUE_PRESETS[category as keyof typeof ISSUE_PRESETS] || [];
    }
    if (type === 'suggestion') {
      return SUGGESTION_PRESETS;
    }
    if (type === 'event') {
      return EVENT_PRESETS;
    }
    return [];
  };

  return (
    <div className="p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Create New Post
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Location Display */}
            {selectedLocation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-700">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Posting from: {selectedLocation.locationName || `${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`}
                  </span>
                </div>
              </div>
            )}

            {/* Post Type Selection */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Post Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={type === 'issue' ? 'default' : 'outline'}
                  onClick={() => setType('issue')}
                  className="flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4" />
                  Issue
                </Button>
                <Button
                  type="button"
                  variant={type === 'suggestion' ? 'default' : 'outline'}
                  onClick={() => setType('suggestion')}
                  className="flex items-center gap-2"
                >
                  <Lightbulb className="w-4 h-4" />
                  Suggestion
                </Button>
                <Button
                  type="button"
                  variant={type === 'event' ? 'default' : 'outline'}
                  onClick={() => setType('event')}
                  className="flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Event
                </Button>
              </div>
            </div>

            {/* Category Selection */}
            {type === 'issue' && (
              <div className="space-y-4">
                <Label className="text-base font-medium">Category</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <Badge
                      key={cat.value}
                      variant={category === cat.value ? 'default' : 'secondary'}
                      className="cursor-pointer hover:bg-blue-100"
                      onClick={() => setCategory(cat.value)}
                    >
                      {cat.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Post Presets */}
            {getCurrentPresets().length > 0 && (
              <div className="space-y-4">
                <Collapsible open={showPresets} onOpenChange={setShowPresets}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span>
                        {showPresets ? 'Hide' : 'Show'} {type === 'issue' ? 'Issue Templates' : type === 'suggestion' ? 'Suggestion Templates' : 'Event Templates'}
                      </span>
                      {showPresets ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <ScrollArea className="h-64 w-full rounded-md border p-4">
                      <div className="space-y-3">
                        {getCurrentPresets().map((preset, index) => (
                          <div
                            key={index}
                            className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => handlePresetSelect(preset)}
                          >
                            <h4 className="font-medium text-gray-900 mb-1">{preset.title}</h4>
                            <p className="text-sm text-gray-600 line-clamp-2">{preset.content}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Content Input */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-base font-medium">
                What's happening in your neighborhood?
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts, report an issue, or announce an event..."
                className="min-h-[120px] resize-none"
                required
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!content.trim() || loading}
                className="flex-1"
                onClick={handleSubmit}
              >
                {loading ? 'Creating...' : 'Create Post'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Vulgar Content Warning Modal */}
        <VulgarContentWarning
          visible={showVulgarWarning}
          onDismiss={() => setShowVulgarWarning(false)}
          title={vulgarWarningData?.message || "⚠️ Content Warning"}
          message={vulgarWarningData?.message || "Posting vulgar content is against our policy."}
          description={vulgarWarningData?.description || "Vulgarity is not allowed. Strict action will be taken if this happens again."}
        />
      </div>
    </div>
  );
} 