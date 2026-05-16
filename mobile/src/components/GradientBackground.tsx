/**
 * GradientBackground Component
 * خلفية gradient للشاشات
 */

import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  colors?: readonly [string, string, ...string[]];
}

export const GradientBackground: React.FC<Props> = ({
  children,
  style,
  colors = Colors.gradients.header as unknown as readonly [string, string, ...string[]],
}) => (
  <LinearGradient colors={colors} style={[styles.container, style]}>
    {children}
  </LinearGradient>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
