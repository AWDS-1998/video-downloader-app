/**
 * AudioQualitySelector Component
 * اختيار جودة MP3
 * المرجع: choose_format_and_quality() L354-384
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { AUDIO_QUALITIES } from '../types';

interface Props {
  selected: string;
  onSelect: (value: string) => void;
}

export const AudioQualitySelector: React.FC<Props> = ({ selected, onSelect }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>🎚️ جودة الصوت (MP3)</Text>
      <View style={styles.grid}>
        {AUDIO_QUALITIES.map((q) => {
          const isSelected = selected === q.value;
          return (
            <TouchableOpacity
              key={q.value}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(q.value); }}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Ionicons name={q.icon as any} size={18} color={isSelected ? Colors.textPrimary : Colors.textTertiary} />
                <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>{q.label}</Text>
                {isSelected && <Ionicons name="checkmark-circle" size={16} color={Colors.success} style={styles.check} />}
              </View>
              <Text style={[styles.cardDesc, isSelected && styles.cardDescSelected]}>{q.description}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.base },
  label: { color: Colors.textSecondary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, marginBottom: Spacing.sm },
  grid: { gap: Spacing.sm },
  card: { flexDirection: 'column', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, padding: Spacing.md },
  cardSelected: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  cardLabel: { color: Colors.textSecondary, fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold },
  cardLabelSelected: { color: Colors.primary },
  cardDesc: { color: Colors.textTertiary, fontSize: Typography.sizes.sm },
  cardDescSelected: { color: Colors.textSecondary },
  check: { marginLeft: 'auto' },
});
