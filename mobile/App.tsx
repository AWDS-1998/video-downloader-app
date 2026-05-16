/**
 * Main App with Navigation + Share Intent + Theme + i18n + Permissions
 */

import React, { useState, useEffect } from 'react';
import { Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen, HistoryScreen, SettingsScreen, PlaylistScreen, PlatformsScreen } from './src/screens';
import { ShareDownloadSheet } from './src/components/ShareDownloadSheet';
import { isValidUrl } from './src/utils/platform';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { I18nProvider, useI18n } from './src/i18n';
import { requestAllPermissions, hasRequestedPermissions } from './src/services/permissions';

const Tab = createBottomTabNavigator();

function AppContent() {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);

  // Request permissions on first launch
  useEffect(() => {
    (async () => {
      const alreadyRequested = await hasRequestedPermissions();
      if (!alreadyRequested) {
        await requestAllPermissions();
      }
    })();
  }, []);

  // Handle share intent
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      const url = event.url;
      if (url && isValidUrl(url)) {
        setSharedUrl(url);
        setShowShareSheet(true);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url && isValidUrl(url)) {
        setSharedUrl(url);
        setShowShareSheet(true);
      }
    });

    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer
        theme={{
          dark: isDark,
          colors: {
            primary: colors.primary,
            background: colors.background,
            card: colors.backgroundSecondary,
            text: colors.textPrimary,
            border: colors.border,
            notification: colors.accent,
          },
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' },
            medium: { fontFamily: 'System', fontWeight: '500' },
            bold: { fontFamily: 'System', fontWeight: '700' },
            heavy: { fontFamily: 'System', fontWeight: '800' },
          },
        }}
      >
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textTertiary,
            tabBarStyle: {
              backgroundColor: colors.backgroundSecondary,
              borderTopColor: colors.border,
              borderTopWidth: 0.5,
              height: 60,
              paddingBottom: 8,
              paddingTop: 4,
            },
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: keyof typeof Ionicons.glyphMap = 'home';
              if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
              else if (route.name === 'Playlist') iconName = focused ? 'list' : 'list-outline';
              else if (route.name === 'History') iconName = focused ? 'download' : 'download-outline';
              else if (route.name === 'Platforms') iconName = focused ? 'apps' : 'apps-outline';
              else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
              return <Ionicons name={iconName} size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('tabs.home') }} />
          <Tab.Screen name="Playlist" component={PlaylistScreen} options={{ tabBarLabel: t('tabs.playlist') }} />
          <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: t('tabs.history') }} />
          <Tab.Screen name="Platforms" component={PlatformsScreen} options={{ tabBarLabel: t('tabs.platforms') }} />
          <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: t('tabs.settings') }} />
        </Tab.Navigator>
      </NavigationContainer>

      <ShareDownloadSheet
        url={sharedUrl}
        visible={showShareSheet}
        onClose={() => { setShowShareSheet(false); setSharedUrl(null); }}
      />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nProvider>
          <AppContent />
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
