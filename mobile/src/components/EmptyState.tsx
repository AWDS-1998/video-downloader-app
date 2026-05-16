/**
 * EmptyState Component
 * عرض حالة "لا يوجد بيانات" بشكل جميل
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../theme';

interface Props {
  icon: string;
  title: string;
  subtitle: string;
}

export const EmptyState: React.FC<Props> = ({ icon, title, subtitle }) => (
  <View style={styles.container}>
    <Ionicons name={icon as any} size={64} color={Colors.textTertiary} />
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  title: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginTop: Spacing.lg,
  },
  subtitle: {
    color: Colors.textTertiary,
    fontSize: Typography.sizes.md,
    marginTop: Spacing.sm,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
