/**
 * PlatformBadge Component
 * شارة المنصة المكتشفة
 * المرجع: detect_platform() L128-161
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { getPlatformUI } from '../utils/platform';

interface Props {
  platformId: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export const PlatformBadge: React.FC<Props> = ({
  platformId,
  size = 'md',
  showName = true,
}) => {
  const platform = getPlatformUI(platformId);
  const iconSize = size === 'sm' ? 14 : size === 'md' ? 18 : 24;
  const fontSize = size === 'sm' ? 10 : size === 'md' ? 12 : 16;

  return (
    <View style={[styles.container, { borderColor: platform.color + '40' }]}>
      <View style={[styles.iconContainer, { backgroundColor: platform.color + '20' }]}>
        <Ionicons name={platform.icon} size={iconSize} color={platform.color} />
      </View>
      {showName && (
        <Text style={[styles.name, { color: platform.color, fontSize }]}>
          {platform.name}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  name: {
    fontWeight: Typography.weights.semibold,
  },
});
