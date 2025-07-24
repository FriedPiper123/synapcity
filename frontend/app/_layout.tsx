import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { createContext, useEffect, useState } from 'react';
import { MD3DarkTheme, MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';
// import 'react-native-reanimated';
import AppHeader from '../components/AppHeader';
import { LocationProvider } from '../contexts/LocationContext';

export {
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export const UserThemeContext = createContext<'light' | 'dark'>('light');

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const [isDarkMode, setIsDarkMode] = useState(false); // default to light mode
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('darkMode').then((value) => {
      if (value !== null) {
        setIsDarkMode(value === 'true');
      }
      setIsReady(true);
    });
  }, []);

  const handleSetDarkMode = (value: boolean) => {
    setIsDarkMode(value);
    AsyncStorage.setItem('darkMode', value ? 'true' : 'false');
  };

  const paperTheme = isDarkMode ? MD3DarkTheme : MD3LightTheme;

  const navTheme = isDarkMode ? DarkTheme : DefaultTheme;

  const pathname = usePathname();
  const router = useRouter();

  // Dynamic header title/subtitle based on tab
  let title = 'SynapCity';
  let subtitle = 'Your local community hub';
  if (pathname.endsWith('/map')) {
    title = 'City Map';
    subtitle = 'Explore your city';
  } else if (pathname.endsWith('/feed')) {
    title = 'Community Feed';
    subtitle = 'Latest updates from your area';
  } else if (pathname.endsWith('/summary')) {
    title = 'Daily Summary';
    subtitle = 'Your city at a glance';
  }

  const handleProfile = () => {
    router.push('/profile');
  };
  const handleNotification = () => {
    alert('Notification action');
  };
  const handleSignOut = () => {
    // Add real sign out logic here if needed
  };

  if (!isReady) return null;

  return (
    <UserThemeContext.Provider value={isDarkMode ? 'dark' : 'light'}>
      <PaperProvider theme={paperTheme}>
        <ThemeProvider value={navTheme} >
          <LocationProvider>
            <AppHeader
              title={title}
              subtitle={subtitle}
              isDarkMode={isDarkMode}
              onToggleDarkMode={handleSetDarkMode}
              onProfile={handleProfile}
              onNotification={handleNotification}
              showDarkMode
              showProfile
              showNotification
            />
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="post" options={{ title: 'Post', headerShown: false }} />
              <Stack.Screen name="profile" options={{ title: 'Profile', headerShown: false }} />
              <Stack.Screen name="recent-activity-detail" options={{ title: 'Activity Detail', headerShown: false }} />
            </Stack>
          </LocationProvider>
        </ThemeProvider>
      </PaperProvider>
    </UserThemeContext.Provider>
  );
} 