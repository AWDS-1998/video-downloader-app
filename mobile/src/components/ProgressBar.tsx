/**
 * ProgressBar Component
 * شريط التقدم المتحرك مع نسبة وسرعة
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';

interface Props {
  progress: number;
  speed?: string;
  eta?: string;
  filename?: string;
  status?: string;
}

export const ProgressBar: React.FC<Props> = ({ progress, speed, eta, filename, status }) => {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, { toValue: progress, duration: 300, useNativeDriver: false }).start();
  }, [progress]);

  const width = widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });

  const getStatusColor = () => {
    if (status === 'completed') return Colors.success;
    if (status === 'error') return Colors.error;
    return Colors.primary;
  };

  return (
    <View style={styles.container}>
      {filename ? <Text style={styles.filename} numberOfLines={1}>📄 {filename}</Text> : null}
      <View style={styles.barBackground}>
        <Animated.View style={[styles.barFill, { width, backgroundColor: getStatusColor() }]} />
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.percentage}>{Math.round(progress)}%</Text>
        <View style={styles.rightInfo}>
          {speed ? <Text style={styles.infoText}>⚡ {speed}</Text> : null}
          {eta ? <Text style={styles.infoText}>⏱️ {eta}</Text> : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: Spacing.sm },
  filename: { color: Colors.textSecondary, fontSize: Typography.sizes.sm, marginBottom: Spacing.xs },
  barBackground: { height: 8, backgroundColor: Colors.backgroundTertiary, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  percentage: { color: Colors.textPrimary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
  rightInfo: { flexDirection: 'row', gap: Spacing.md },
  infoText: { color: Colors.textTertiary, fontSize: Typography.sizes.xs },
});
