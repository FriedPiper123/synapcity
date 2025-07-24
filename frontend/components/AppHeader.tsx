import * as React from 'react';
import { Appbar, Switch, useTheme } from 'react-native-paper';

export default function AppHeader({
  title,
  subtitle,
  isDarkMode,
  onToggleDarkMode,
  onProfile,
  onNotification,
  showDarkMode = true,
  showProfile = true,
  showNotification = true,
}: {
  title: string;
  subtitle?: string;
  isDarkMode: boolean;
  onToggleDarkMode: (val: boolean) => void;
  onProfile: () => void;
  onNotification: () => void;
  showDarkMode?: boolean;
  showProfile?: boolean;
  showNotification?: boolean;
}) {
  const theme = useTheme();
  return (
    <Appbar.Header elevated style={{ backgroundColor: theme.colors.elevation?.level2 || theme.colors.background }}>
      <Appbar.Content title={title} subtitle={subtitle} />
      {showDarkMode && (
        <Appbar.Action
          icon={isDarkMode ? 'weather-night' : 'white-balance-sunny'}
          onPress={() => onToggleDarkMode(!isDarkMode)}
          accessibilityLabel="Toggle dark mode"
        />
      )}
      {showNotification && (
        <Appbar.Action icon="bell" onPress={onNotification} accessibilityLabel="Notifications" />
      )}
      {showProfile && (
        <Appbar.Action icon="account-circle" onPress={onProfile} accessibilityLabel="Profile" />
      )}
    </Appbar.Header>
  );
} 