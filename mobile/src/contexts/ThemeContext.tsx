/**
 * ThemeContext - Light/Dark/System theme support
 * Default: System
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'dark' | 'light';
export type ResolvedTheme = 'dark' | 'light';

// Dark colors (existing)
const DarkColors = {
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#5A4BD1',
  primaryGlow: 'rgba(108, 92, 231, 0.3)',
  accent: '#FDCB6E',
  accentLight: '#FFEAA7',
  success: '#00B894',
  successLight: '#55EFC4',
  warning: '#F39C12',
  error: '#E17055',
  errorLight: '#FAB1A0',
  errorDark: '#D63031',
  info: '#74B9FF',
  background: '#0D0D1A',
  backgroundSecondary: '#161629',
  backgroundTertiary: '#1E1E3A',
  surface: '#232340',
  surfaceLight: '#2D2D50',
  surfaceElevated: '#353560',
  cardBackground: 'rgba(35, 35, 64, 0.8)',
  cardBorder: 'rgba(108, 92, 231, 0.2)',
  textPrimary: '#FFFFFF',
  textSecondary: '#B8B8D4',
  textTertiary: '#6C6C8A',
  textDisabled: '#4A4A6A',
  border: '#2A2A4A',
  borderLight: '#3A3A5A',
  borderFocus: '#6C5CE7',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shimmerBase: '#232340',
  shimmerHighlight: '#2D2D50',
  statusBar: 'light' as const,
};

// Light colors
const LightColors = {
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#5A4BD1',
  primaryGlow: 'rgba(108, 92, 231, 0.15)',
  accent: '#F0B429',
  accentLight: '#FFEAA7',
  success: '#00B894',
  successLight: '#55EFC4',
  warning: '#F39C12',
  error: '#E17055',
  errorLight: '#FAB1A0',
  errorDark: '#D63031',
  info: '#0984E3',
  background: '#F5F6FA',
  backgroundSecondary: '#FFFFFF',
  backgroundTertiary: '#E8EAF0',
  surface: '#FFFFFF',
  surfaceLight: '#F0F1F5',
  surfaceElevated: '#FFFFFF',
  cardBackground: 'rgba(255, 255, 255, 0.95)',
  cardBorder: 'rgba(108, 92, 231, 0.15)',
  textPrimary: '#1A1A2E',
  textSecondary: '#4A4A6A',
  textTertiary: '#8A8AAA',
  textDisabled: '#C0C0D0',
  border: '#E0E0EC',
  borderLight: '#EBEBF0',
  borderFocus: '#6C5CE7',
  overlay: 'rgba(0, 0, 0, 0.3)',
  shimmerBase: '#E8EAF0',
  shimmerHighlight: '#F5F6FA',
  statusBar: 'dark' as const,
};

export type ThemeColors = typeof DarkColors;

const THEME_KEY = '@app_theme';

interface ThemeContextType {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => Promise<void>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  resolved: 'dark',
  colors: DarkColors,
  setMode: async () => {},
  isDark: true,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'system' || saved === 'dark' || saved === 'light') {
        setModeState(saved);
      }
    });
  }, []);

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    await AsyncStorage.setItem(THEME_KEY, newMode);
  }, []);

  const resolved: ResolvedTheme = mode === 'system'
    ? (systemScheme === 'light' ? 'light' : 'dark')
    : mode;

  const colors = resolved === 'light' ? LightColors : DarkColors;
  const isDark = resolved === 'dark';

  return (
    <ThemeContext.Provider value={{ mode, resolved, colors, setMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeContext;
