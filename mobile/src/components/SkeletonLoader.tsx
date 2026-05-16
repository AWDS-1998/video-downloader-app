/**
 * SkeletonLoader Component
 * عرض حالة التحميل بشكل احترافي
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../theme';

interface Props {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<Props> = ({ width = '100%', height = 20, borderRadius = BorderRadius.sm, style }) => {
  const opacity = new Animated.Value(0.3);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style
      ]}
    />
  );
};

export const VideoInfoSkeleton = () => (
  <View style={styles.skeletonCard}>
    <SkeletonLoader height={200} borderRadius={BorderRadius.xl} />
    <View style={styles.skeletonInfo}>
      <SkeletonLoader width="80%" height={24} style={{ marginBottom: Spacing.sm }} />
      <View style={styles.skeletonMeta}>
        <SkeletonLoader width="40%" height={16} />
        <SkeletonLoader width="20%" height={16} />
      </View>
      <View style={styles.skeletonStats}>
        <SkeletonLoader width="25%" height={14} />
        <SkeletonLoader width="25%" height={14} />
        <SkeletonLoader width="25%" height={14} />
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.surfaceElevated,
  },
  skeletonCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  skeletonInfo: {
    padding: Spacing.base,
  },
  skeletonMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  skeletonStats: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
});

export const PlaylistSkeleton = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonInfo}>
      <SkeletonLoader width="60%" height={24} style={{ marginBottom: Spacing.sm }} />
      <SkeletonLoader width="40%" height={16} style={{ marginBottom: Spacing.lg }} />
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
          <SkeletonLoader width={20} height={20} borderRadius={6} />
          <SkeletonLoader width="70%" height={16} />
        </View>
      ))}
    </View>
  </View>
);
