/**
 * Main App with Navigation + Share Intent Handler
 * المرجع: main_menu() L1169-1197
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
import { Colors } from './src/theme';
import { isValidUrl } from './src/utils/platform';

const Tab = createBottomTabNavigator();

export default function App() {
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);

  // Handle share intent - app launched with shared URL
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      const url = event.url;
      if (url && isValidUrl(url)) {
        setSharedUrl(url);
        setShowShareSheet(true);
      }
    };

    // Check initial URL (cold start from share)
    Linking.getInitialURL().then((url) => {
      if (url && isValidUrl(url)) {
        setSharedUrl(url);
        setShowShareSheet(true);
      }
    });

    // Listen for URLs while app is open (warm start)
    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: Colors.primary,
            background: Colors.background,
            card: Colors.backgroundSecondary,
            text: Colors.textPrimary,
            border: Colors.border,
            notification: Colors.accent,
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
            tabBarActiveTintColor: Colors.primary,
            tabBarInactiveTintColor: Colors.textTertiary,
            tabBarStyle: {
              backgroundColor: Colors.backgroundSecondary,
              borderTopColor: Colors.border,
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
          <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'الرئيسية' }} />
          <Tab.Screen name="Playlist" component={PlaylistScreen} options={{ tabBarLabel: 'قوائم' }} />
          <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: 'التحميلات' }} />
          <Tab.Screen name="Platforms" component={PlatformsScreen} options={{ tabBarLabel: 'المنصات' }} />
          <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'الإعدادات' }} />
        </Tab.Navigator>
      </NavigationContainer>

      {/* Share Intent Bottom Sheet */}
      <ShareDownloadSheet
        url={sharedUrl}
        visible={showShareSheet}
        onClose={() => { setShowShareSheet(false); setSharedUrl(null); }}
      />
    </SafeAreaProvider>
  );
}
