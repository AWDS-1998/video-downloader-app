/**
 * GradientBackground Component
 * Theme-aware gradient background
 */

import React from 'react';
import { StyleSheet, ViewStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const GradientBackground: React.FC<Props> = ({ children, style }) => {
  const { colors, isDark } = useTheme();

  if (isDark) {
    return (
      <LinearGradient
        colors={[colors.background, colors.backgroundSecondary, colors.backgroundTertiary]}
        style={[styles.container, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
