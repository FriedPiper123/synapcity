# SynapCity Web App

A React web application migrated from React Native, featuring community engagement, post creation, and area insights.

## Features

### ✅ Migrated Features
- **Google Sign-In**: Firebase authentication with Google OAuth
- **Feed**: Real-time post feed with upvote and comment functionality
- **Post Creation**: Create posts with location, type, and category (includes vulgarity check)
- **Comments**: Add comments to posts with vulgarity detection
- **Upvotes**: Like/unlike posts with real-time updates
- **Map**: Google Maps integration showing posts as markers
- **Insights**: Area analysis and community insights
- **Navigation**: Sidebar navigation to all features

### 🔧 Technical Stack
- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui components
- **Authentication**: Firebase Auth with Google Sign-In
- **Maps**: Google Maps API
- **Testing**: Jest + React Testing Library + Cypress

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
The app will be available at `http://localhost:5173`

### Building for Production
```bash
npm run build
```

## Testing

### Unit Tests
```bash
npm test
npm run test:watch
npm run test:coverage
```

### E2E Tests
```bash
npm run cypress:open
npm run cypress:run
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── __tests__/      # Component tests
│   └── ui/             # shadcn/ui components
├── pages/              # Route-level pages
│   ├── __tests__/      # Page tests
│   ├── CreatePost.tsx  # Post creation form
│   ├── Map.tsx         # Google Maps page
│   └── Insights.tsx    # Area insights page
├── lib/                # Utilities and configurations
│   ├── api.ts          # API utility functions
│   └── firebase.ts     # Firebase configuration
├── hooks/              # Custom React hooks
│   └── useAuth.ts      # Authentication hook
└── setupTests.ts       # Jest test setup
```

## API Integration

The app integrates with the backend API at `http://0.0.0.0:8000`:

### **Posts & Comments**
- `GET /api/v1/posts/nearby?latitude=${lat}&longitude=${lng}&radius_km=${radius}` - Location-based posts
- `GET /api/v1/posts/post/${postId}` - Get specific post
- `POST /api/v1/posts/` - Create post with location
- `POST /api/v1/posts/${postId}/upvote` - Upvote post
- `GET /api/v1/posts/${postId}/comments?limit=100` - Get comments
- `POST /api/v1/posts/${postId}/comments` - Add comment with vulgarity check

### **Insights & Analytics**
- `GET /api/v1/insights/area-analysis-response` - Get area analysis
- `GET /api/v1/insights/area-insights?latitude=${lat}&longitude=${lng}` - Get location insights
- `GET /api/v1/dashboard/stats?latitude=${lat}&longitude=${lng}&radius_km=5.0` - Dashboard stats
- `GET /api/v1/dashboard/recent-activities?latitude=${lat}&longitude=${lng}&radius_km=5.0&limit=10` - Recent activities

## Authentication

Uses Firebase Authentication with Google Sign-In:
- Anonymous sign-in fallback
- Token refresh logic
- Persistent authentication state

## Features Matching React Native App

✅ **API Integration**: All API calls migrated with token management
✅ **Google Sign-In**: Web implementation with same user flow
✅ **Google Maps**: Posts displayed as markers with location filtering
✅ **Post Creation**: Enhanced form with location detection, presets, and elegant vulgarity warnings
✅ **Comments**: Expandable comments with vulgarity detection and threading
✅ **Upvotes**: Real-time like/unlike functionality for posts and comments
✅ **Navigation**: Sidebar navigation with "City Map" option and React Router
✅ **Location Services**: Browser geolocation with Google Maps integration
✅ **Post Details**: Full post detail pages with comment threading
✅ **Insights**: Elegant charts and analytics with location-based data
✅ **User Experience**: Matches React Native app closely with web optimizations

## Testing Coverage

- **Unit Tests**: Component and page functionality
- **Integration Tests**: API interactions and state management
- **E2E Tests**: Complete user flows (login, post, comment, upvote)

## Development Notes

- Backend API must be running at `http://0.0.0.0:8000`
- Google Maps API key configured in Map component
- Firebase project configured for web authentication
- All features match the original React Native app's user experience
