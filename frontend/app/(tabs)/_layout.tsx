import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useTheme, FAB } from 'react-native-paper';
import { View } from 'react-native';
import { useEffect, useState } from 'react';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'expo-router';

export default function TabLayout() {
  const paperTheme = useTheme();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !user.isAnonymous) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        router.replace('/profile');
      }
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  if (checkingAuth) return null;
  if (!isAuthenticated) return null;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: paperTheme.colors.primary,
          tabBarInactiveTintColor: paperTheme.colors.onSurfaceVariant || '#ccc',
          headerShown: false,
          tabBarStyle: { backgroundColor: paperTheme.colors.elevation?.level2 || paperTheme.colors.background },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="view-dashboard" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: 'Map',
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="map" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            title: 'Create',
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="plus" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="rss" size={24} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
} 