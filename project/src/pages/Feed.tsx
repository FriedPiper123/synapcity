import { SocialFeed } from '@/components/SocialFeed';

const FeedPage = () => {
  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Community Feed</h1>
        <SocialFeed latitude={28.6139} longitude={77.2090} radiusKm={5.0} />
      </div>
    </div>
  );
};

export default FeedPage; 