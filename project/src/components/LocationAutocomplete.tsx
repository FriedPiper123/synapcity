import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Search, X, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocationSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  ai_metadata?: {
    type: string;
    category: string;
    confidence: number;
    popularity: string;
  };
}

interface LocationAutocompleteProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onLocationSelect?: (location: { lat: number; lng: number; name: string }) => void;
  className?: string;
  showCurrentLocation?: boolean;
}

export function LocationAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  onLocationSelect,
  className,
  showCurrentLocation = true
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (value.length > 2) {
        searchLocations(value);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value]);

  const searchLocations = async (query: string) => {
    console.log('🔍 Starting search for:', query);
    setIsLoading(true);
    setShowSuggestions(true); // Always show suggestions container when searching
    
    try {
      // First, try AI-powered location prediction
      console.log('📡 Calling AI prediction API for:', query);
      const aiPredictionResponse = await fetch('http://localhost:8000/api/v1/location/predict-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_input: query,
          context: 'route_planning',
          location_type: 'general',
          city: 'Bangalore'
        }),
      });

      console.log('📡 AI API response status:', aiPredictionResponse.status);
      console.log('📡 AI API response headers:', Object.fromEntries(aiPredictionResponse.headers.entries()));

      let aiPredictions = [];
      if (aiPredictionResponse.ok) {
        const aiData = await aiPredictionResponse.json();
        console.log('✅ AI API response data:', aiData);
        if (aiData.predictions && aiData.predictions.length > 0) {
          // Convert AI predictions to LocationSuggestion format
          aiPredictions = aiData.predictions.map((pred: any) => ({
            place_id: `ai_${pred.name.replace(/\s+/g, '_').toLowerCase()}`,
            description: pred.name,
            structured_formatting: {
              main_text: pred.short_name || pred.name,
              secondary_text: pred.description || 'Bangalore, India'
            },
            geometry: pred.coordinates ? {
              location: {
                lat: pred.coordinates.latitude,
                lng: pred.coordinates.longitude
              }
            } : undefined,
            ai_metadata: {
              type: pred.type,
              category: pred.category,
              confidence: pred.confidence,
              popularity: pred.popularity
            }
          }));
          console.log('🔄 Converted AI predictions:', aiPredictions);
        } else {
          console.log('⚠️ No AI predictions found in response');
        }
      } else {
        const errorText = await aiPredictionResponse.text();
        console.error('❌ AI API error:', aiPredictionResponse.status, aiPredictionResponse.statusText, errorText);
      }

      // Then, try Google Places Autocomplete API
      console.log('📡 Calling Google Places API for:', query);
      const googleResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=AIzaSyDTea-zPVH7xGr-FvmGZrm7WrqJdfCU9zo&types=geocode|establishment&components=country:in&language=en&sessiontoken=${Date.now()}`
      );
      const googleData = await googleResponse.json();
      console.log('📡 Google API response:', googleData);
      
      let googleSuggestions = [];
      if (googleData.predictions && googleData.predictions.length > 0) {
        googleSuggestions = googleData.predictions;
        console.log('🔄 Google suggestions:', googleSuggestions);
      }

      // Combine AI predictions with Google suggestions
      const combinedSuggestions = [...aiPredictions, ...googleSuggestions];
      console.log('🎯 Combined suggestions total:', combinedSuggestions.length);
      console.log('🎯 Combined suggestions:', combinedSuggestions);
      
      if (combinedSuggestions.length > 0) {
        console.log('✅ Setting suggestions and showing dropdown');
        setSuggestions(combinedSuggestions);
        setShowSuggestions(true);
        setSelectedIndex(-1);
      } else {
        console.log('⚠️ No combined suggestions, using fallback');
        // Enhanced fallback suggestions with real Bangalore locations
        const fallbackSuggestions = getFallbackSuggestions(query);
        console.log('🔄 Fallback suggestions:', fallbackSuggestions);
        setSuggestions(fallbackSuggestions);
        setShowSuggestions(true);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('💥 Error fetching location suggestions:', error);
      // Enhanced fallback suggestions
      const fallbackSuggestions = getFallbackSuggestions(query);
      console.log('🔄 Using fallback due to error:', fallbackSuggestions);
      setSuggestions(fallbackSuggestions);
      setShowSuggestions(true);
    }
    console.log('🏁 Search completed, setting loading to false');
    setIsLoading(false);
  };

  // Add a test function for debugging
  const testApiCall = async () => {
    console.log('🧪 Testing API call manually...');
    await searchLocations('koramangala');
  };

  const getFallbackSuggestions = (query: string): LocationSuggestion[] => {
    const bangaloreLocations = [
      // Popular Areas
      { name: 'Koramangala', lat: 12.9349, lng: 77.6055 },
      { name: 'Indiranagar', lat: 12.9789, lng: 77.6416 },
      { name: 'Whitefield', lat: 12.9699, lng: 77.7499 },
      { name: 'Electronic City', lat: 12.8458, lng: 77.6658 },
      { name: 'Marathahalli', lat: 12.9581, lng: 77.7014 },
      { name: 'HSR Layout', lat: 12.9141, lng: 77.6422 },
      { name: 'JP Nagar', lat: 12.9069, lng: 77.5858 },
      { name: 'Banashankari', lat: 12.9245, lng: 77.5575 },
      { name: 'Jayanagar', lat: 12.9245, lng: 77.5575 },
      { name: 'Basavanagudi', lat: 12.9416, lng: 77.5676 },
      { name: 'Malleswaram', lat: 13.0067, lng: 77.5707 },
      { name: 'Rajajinagar', lat: 12.9914, lng: 77.5511 },
      { name: 'Vijayanagar', lat: 12.9716, lng: 77.5946 },
      { name: 'Yeshwanthpur', lat: 13.0222, lng: 77.5568 },
      { name: 'Hebbal', lat: 13.0507, lng: 77.5908 },
      { name: 'Yelahanka', lat: 13.1007, lng: 77.5963 },
      { name: 'Bellandur', lat: 12.9349, lng: 77.6954 },
      { name: 'Sarjapur', lat: 12.8458, lng: 77.6658 },
      { name: 'Bannerghatta', lat: 12.8000, lng: 77.5767 },
      { name: 'Domlur', lat: 12.9667, lng: 77.6333 },
      { name: 'Frazer Town', lat: 12.9833, lng: 77.6167 },
      { name: 'Richmond Town', lat: 12.9833, lng: 77.6167 },
      { name: 'Cox Town', lat: 12.9833, lng: 77.6167 },
      { name: 'Ulsoor', lat: 12.9833, lng: 77.6167 },
      { name: 'Lavelle Road', lat: 12.9667, lng: 77.6167 },
      { name: 'MG Road', lat: 12.9754, lng: 77.6161 },
      { name: 'Brigade Road', lat: 12.9754, lng: 77.6161 },
      { name: 'Commercial Street', lat: 12.9754, lng: 77.6161 },
      { name: 'Chickpet', lat: 12.9754, lng: 77.6161 },
      { name: 'Majestic', lat: 12.9754, lng: 77.6161 },
      { name: 'City Market', lat: 12.9754, lng: 77.6161 },
      
      // Transportation
      { name: 'Kempegowda International Airport', lat: 13.1986, lng: 77.7066 },
      { name: 'Bangalore City Railway Station', lat: 12.9770, lng: 77.5683 },
      { name: 'Yeshwanthpur Railway Station', lat: 13.0222, lng: 77.5568 },
      { name: 'Krishnarajapuram Railway Station', lat: 12.9951, lng: 77.6990 },
      { name: 'Bangalore Metro', lat: 12.9716, lng: 77.5946 },
      { name: 'Majestic Metro Station', lat: 12.9754, lng: 77.6161 },
      { name: 'Indiranagar Metro Station', lat: 12.9789, lng: 77.6416 },
      { name: 'Koramangala Metro Station', lat: 12.9349, lng: 77.6055 },
      { name: 'HSR Layout Metro Station', lat: 12.9141, lng: 77.6422 },
      { name: 'Electronic City Metro Station', lat: 12.8458, lng: 77.6658 },
      { name: 'Whitefield Metro Station', lat: 12.9699, lng: 77.7499 },
      
      // Landmarks & Tourist Attractions
      { name: 'Cubbon Park', lat: 12.9762, lng: 77.6033 },
      { name: 'Lalbagh Botanical Garden', lat: 12.9507, lng: 77.5848 },
      { name: 'Bangalore Palace', lat: 12.9980, lng: 77.5925 },
      { name: 'Vidhana Soudha', lat: 12.9791, lng: 77.5913 },
      { name: 'High Court', lat: 12.9791, lng: 77.5913 },
      { name: 'Tipu Sultan Palace', lat: 12.9754, lng: 77.6161 },
      { name: 'ISKCON Temple', lat: 12.9349, lng: 77.6055 },
      { name: 'Bull Temple', lat: 12.9416, lng: 77.5676 },
      { name: 'Gavi Gangadhareshwara Temple', lat: 12.9416, lng: 77.5676 },
      { name: 'St. Mary Basilica', lat: 12.9754, lng: 77.6161 },
      { name: 'St. Mark Cathedral', lat: 12.9754, lng: 77.6161 },
      { name: 'Bangalore Fort', lat: 12.9754, lng: 77.6161 },
      { name: 'Freedom Park', lat: 12.9754, lng: 77.6161 },
      { name: 'Jawaharlal Nehru Planetarium', lat: 12.9762, lng: 77.6033 },
      { name: 'Government Museum', lat: 12.9762, lng: 77.6033 },
      { name: 'Venkatappa Art Gallery', lat: 12.9762, lng: 77.6033 },
      
      // Shopping & Entertainment
      { name: 'Phoenix MarketCity', lat: 12.9349, lng: 77.6055 },
      { name: 'Forum Koramangala', lat: 12.9349, lng: 77.6055 },
      { name: 'Garuda Mall', lat: 12.9754, lng: 77.6161 },
      { name: 'Orion Mall', lat: 12.9349, lng: 77.6055 },
      { name: 'Mantri Square', lat: 12.9914, lng: 77.5511 },
      { name: 'VR Mall', lat: 12.9349, lng: 77.6055 },
      { name: 'UB City', lat: 12.9754, lng: 77.6161 },
      { name: 'Commercial Street', lat: 12.9754, lng: 77.6161 },
      { name: 'Chickpet Market', lat: 12.9754, lng: 77.6161 },
      { name: 'Russell Market', lat: 12.9754, lng: 77.6161 },
      { name: 'KR Market', lat: 12.9754, lng: 77.6161 },
      { name: 'Malleswaram Market', lat: 13.0067, lng: 77.5707 },
      { name: 'Jayanagar 4th Block Market', lat: 12.9245, lng: 77.5575 },
      
      // IT Parks & Business Districts
      { name: 'Manyata Tech Park', lat: 13.0507, lng: 77.5908 },
      { name: 'Embassy Tech Village', lat: 12.9349, lng: 77.6954 },
      { name: 'Prestige Tech Park', lat: 12.9349, lng: 77.6055 },
      { name: 'Bagmane Tech Park', lat: 12.9349, lng: 77.6055 },
      { name: 'RMZ Ecoworld', lat: 12.9349, lng: 77.6055 },
      { name: 'Prestige Shantiniketan', lat: 12.9349, lng: 77.6055 },
      { name: 'Embassy Golf Links', lat: 12.9349, lng: 77.6055 },
      { name: 'Cessna Business Park', lat: 12.9349, lng: 77.6055 },
      { name: 'Salarpuria Sattva Knowledge Park', lat: 12.9349, lng: 77.6055 },
      { name: 'Divyasree Technopolis', lat: 12.9349, lng: 77.6055 },
      
      // Educational Institutions
      { name: 'Indian Institute of Science', lat: 13.0203, lng: 77.5589 },
      { name: 'Bangalore University', lat: 12.9716, lng: 77.5946 },
      { name: 'Christ University', lat: 12.9349, lng: 77.6055 },
      { name: 'St. Joseph College', lat: 12.9754, lng: 77.6161 },
      { name: 'Mount Carmel College', lat: 12.9754, lng: 77.6161 },
      { name: 'St. Xavier College', lat: 12.9754, lng: 77.6161 },
      { name: 'St. John Medical College', lat: 12.9349, lng: 77.6055 },
      { name: 'MS Ramaiah Medical College', lat: 13.0067, lng: 77.5707 },
      { name: 'Kempegowda Institute of Medical Sciences', lat: 12.9716, lng: 77.5946 },
      
      // Hospitals & Healthcare
      { name: 'Apollo Hospital', lat: 12.9349, lng: 77.6055 },
      { name: 'Manipal Hospital', lat: 12.9349, lng: 77.6055 },
      { name: 'Fortis Hospital', lat: 12.9349, lng: 77.6055 },
      { name: 'Narayana Health', lat: 12.9349, lng: 77.6055 },
      { name: 'Sakra World Hospital', lat: 12.9349, lng: 77.6055 },
      { name: 'Columbia Asia Hospital', lat: 12.9349, lng: 77.6055 },
      { name: 'Sparsh Hospital', lat: 12.9349, lng: 77.6055 },
      { name: 'Bangalore Medical College', lat: 12.9716, lng: 77.5946 },
      { name: 'Victoria Hospital', lat: 12.9716, lng: 77.5946 },
      { name: 'Bowring Hospital', lat: 12.9716, lng: 77.5946 },
      
      // Restaurants & Food
      { name: 'UB City Food Court', lat: 12.9754, lng: 77.6161 },
      { name: 'Food Street', lat: 12.9754, lng: 77.6161 },
      { name: 'Koramangala Food Street', lat: 12.9349, lng: 77.6055 },
      { name: 'Indiranagar 100 Feet Road', lat: 12.9789, lng: 77.6416 },
      { name: 'Commercial Street Food', lat: 12.9754, lng: 77.6161 },
      { name: 'Malleswaram 8th Cross', lat: 13.0067, lng: 77.5707 },
      { name: 'Jayanagar 4th Block Food', lat: 12.9245, lng: 77.5575 },
      { name: 'Banashankari Food Street', lat: 12.9245, lng: 77.5575 },
      { name: 'HSR Layout Food Street', lat: 12.9141, lng: 77.6422 },
      { name: 'Electronic City Food Court', lat: 12.8458, lng: 77.6658 },
      
      // Parks & Recreation
      { name: 'Cubbon Park', lat: 12.9762, lng: 77.6033 },
      { name: 'Lalbagh Botanical Garden', lat: 12.9507, lng: 77.5848 },
      { name: 'Bannerghatta National Park', lat: 12.8000, lng: 77.5767 },
      { name: 'Freedom Park', lat: 12.9754, lng: 77.6161 },
      { name: 'Bugle Rock Park', lat: 12.9416, lng: 77.5676 },
      { name: 'Jayanagar Park', lat: 12.9245, lng: 77.5575 },
      { name: 'Indiranagar Park', lat: 12.9789, lng: 77.6416 },
      { name: 'Koramangala Park', lat: 12.9349, lng: 77.6055 },
      { name: 'HSR Layout Park', lat: 12.9141, lng: 77.6422 },
      { name: 'Whitefield Park', lat: 12.9699, lng: 77.7499 },
    ];

    const filteredLocations = bangaloreLocations.filter(location =>
      location.name.toLowerCase().includes(query.toLowerCase())
    );

    return filteredLocations.map((location, index) => ({
      place_id: `fallback_${index}`,
      description: `${location.name}, Bangalore, India`,
      structured_formatting: {
        main_text: location.name,
        secondary_text: 'Bangalore, India'
      },
      geometry: {
        location: {
          lat: location.lat,
          lng: location.lng
        }
      }
    }));
  };

  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    onChange(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);

    // AI-powered suggestion
    if (onLocationSelect && suggestion.ai_metadata && suggestion.geometry && suggestion.geometry.location) {
      onLocationSelect({
        lat: suggestion.geometry.location.lat,
        lng: suggestion.geometry.location.lng,
        name: suggestion.description
      });
      return;
    }
    // Google Places suggestion (fallback: no geometry)
    if (onLocationSelect && suggestion.geometry && suggestion.geometry.location) {
      onLocationSelect({
        lat: suggestion.geometry.location.lat,
        lng: suggestion.geometry.location.lng,
        name: suggestion.description
      });
      return;
    }
    // If no geometry, just pass the name
    if (onLocationSelect) {
      onLocationSelect({
        lat: 0,
        lng: 0,
        name: suggestion.description
      });
    }
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Enhanced reverse geocoding with better error handling
          fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=AIzaSyB_mxnT3LUUsmuUA29I0fFyWk8u0kh-7a8&language=en`
          )
            .then(res => res.json())
            .then(data => {
              if (data.results && data.results[0]) {
                const locationName = data.results[0].formatted_address;
                onChange(locationName);
                if (onLocationSelect) {
                  onLocationSelect({
                    lat: latitude,
                    lng: longitude,
                    name: locationName
                  });
                }
              } else {
                // Fallback to coordinates if geocoding fails
                const fallbackName = `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
                onChange(fallbackName);
                if (onLocationSelect) {
                  onLocationSelect({
                    lat: latitude,
                    lng: longitude,
                    name: fallbackName
                  });
                }
              }
            })
            .catch((error) => {
              console.error('Error reverse geocoding:', error);
              // Fallback to coordinates
              const fallbackName = `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
              onChange(fallbackName);
              if (onLocationSelect) {
                onLocationSelect({
                  lat: latitude,
                  lng: longitude,
                  name: fallbackName
                });
              }
            });
        },
        (error) => {
          console.error('Error getting current location:', error);
          // Show user-friendly error message
          const errorMessages = {
            1: 'Location access denied. Please enable location permissions.',
            2: 'Location unavailable. Please try again.',
            3: 'Location request timed out. Please try again.'
          };
          const message = errorMessages[error.code as keyof typeof errorMessages] || 'Unable to get current location.';
          alert(message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 300); // Increased from 200ms to 300ms
  };

  return (
    <div className={cn("relative", className)}>
      <Label htmlFor={`location-${label}`}>{label}</Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id={`location-${label}`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className="pr-20"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {showCurrentLocation && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCurrentLocation}
              className="h-6 w-6 p-0"
              title="Use current location"
            >
              <Crosshair className="h-4 w-4" />
            </Button>
          )}
          {/* Debug test button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={testApiCall}
            className="h-6 w-6 p-0 text-xs"
            title="Test API call"
          >
            🧪
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange('')}
              className="h-6 w-6 p-0"
              title="Clear"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-hidden"
        >
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="p-3 text-center text-gray-500">
                <Search className="h-4 w-4 animate-spin mx-auto mb-2" />
                Searching...
              </div>
            ) : (
              <div className="py-1">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.place_id}
                    type="button"
                    className={cn(
                      "w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
                      selectedIndex === index && "bg-gray-100"
                    )}
                    onClick={() => handleSuggestionClick(suggestion)}
                    onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {suggestion.structured_formatting.main_text}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {suggestion.structured_formatting.secondary_text}
                        </div>
                        {/* AI-powered metadata display */}
                        {(suggestion as any).ai_metadata && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                              {(suggestion as any).ai_metadata.category}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                              {(suggestion as any).ai_metadata.popularity}
                            </span>
                            <span className="text-xs text-gray-400">
                              {Math.round((suggestion as any).ai_metadata.confidence * 100)}% match
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
      {/* Debug panel for suggestions */}
      <div style={{ fontSize: '10px', marginTop: 8, background: '#f9f9f9', color: '#333', padding: 4, borderRadius: 4, maxHeight: 120, overflow: 'auto' }}>
        <strong>Suggestions Debug:</strong>
        <pre>{JSON.stringify(suggestions, null, 2)}</pre>
      </div>
    </div>
  );
} 