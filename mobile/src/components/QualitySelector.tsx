/**
 * QualitySelector Component
 * اختيار جودة الفيديو بالبطاقات
 * المرجع: choose_format_and_quality() L341-351
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { VIDEO_QUALITIES } from '../types';

interface Props {
  selected: string;
  onSelect: (value: string) => void;
  availableHeights?: number[];
}

export const QualitySelector: React.FC<Props> = ({ selected, onSelect, availableHeights }) => {
  const qualities = availableHeights && availableHeights.length > 0
    ? [
        { label: 'Best', value: 'best', icon: 'sparkles' as const },
        ...availableHeights
          .sort((a, b) => b - a)
          .slice(0, 5)
          .map(h => {
            const icon = h >= 1080 ? 'desktop' : h >= 720 ? 'tablet-landscape' : 'phone-portrait';
            return { label: `${h}p`, value: String(h), icon };
          }),
      ]
    : VIDEO_QUALITIES;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>🎚️ جودة الفيديو</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {qualities.map((q) => {
          const isSelected = selected === q.value;
          return (
            <TouchableOpacity
              key={q.value}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(q.value); }}
              activeOpacity={0.7}
            >
              <Ionicons name={q.icon as any} size={22} color={isSelected ? Colors.textPrimary : Colors.textTertiary} />
              <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>{q.label}</Text>
              {isSelected && <View style={styles.checkDot}><Ionicons name="checkmark" size={10} color={Colors.textPrimary} /></View>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.base },
  label: { color: Colors.textSecondary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, marginBottom: Spacing.sm },
  scrollContent: { gap: Spacing.sm, paddingRight: Spacing.base },
  card: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.border, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, minWidth: 80, gap: Spacing.xs },
  cardSelected: { backgroundColor: Colors.primary, borderColor: Colors.primaryLight },
  cardLabel: { color: Colors.textTertiary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold },
  cardLabelSelected: { color: Colors.textPrimary },
  checkDot: { position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.success, justifyContent: 'center', alignItems: 'center' },
});
