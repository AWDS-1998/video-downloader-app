/**
 * SubtitlePicker Component
 * اختيار لغة الترجمة
 * المرجع: choose_subtitles() L390-428
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';

interface Props {
  languages: string[];
  selected: string | null;
  onSelect: (lang: string | null) => void;
}

export const SubtitlePicker: React.FC<Props> = ({ languages, selected, onSelect }) => {
  if (!languages || languages.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>💬 لغة الترجمة</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={[styles.chip, selected === null && styles.chipActive]}
          onPress={() => onSelect(null)}
        >
          <Text style={[styles.chipText, selected === null && styles.chipTextActive]}>بدون</Text>
        </TouchableOpacity>
        
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang}
            style={[styles.chip, selected === lang && styles.chipActive]}
            onPress={() => onSelect(lang)}
          >
            <Text style={[styles.chipText, selected === lang && styles.chipTextActive]}>
              {lang.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
  },
  scrollContent: {
    gap: Spacing.sm,
    paddingRight: Spacing.base,
  },
  chip: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.textTertiary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  chipTextActive: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
});
