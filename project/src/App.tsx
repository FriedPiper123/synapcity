import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LocationProvider } from "./contexts/LocationContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ActivitiesProvider } from "./contexts/ActivitiesContext";
import { PersistentLayout } from "./components/PersistentLayout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MapPage from './pages/Map';
import InsightsPage from './pages/Insights';
import CreatePostPage from './pages/CreatePost';
import PostDetail from './pages/PostDetail';
import FeedPage from './pages/Feed';
import ProfilePage from './pages/Profile';
import SummaryPage from './pages/Summary';
import ActivityDetail from './pages/ActivityDetail';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <LocationProvider>
            <ActivitiesProvider>
              <PersistentLayout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/create" element={<CreatePostPage />} />
                <Route path="/feed" element={<FeedPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/summary" element={<SummaryPage />} />
                <Route path="/post/:postId" element={<PostDetail />} />
                <Route path="/activity/:activityId" element={<ActivityDetail />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PersistentLayout>
            </ActivitiesProvider>
          </LocationProvider>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
