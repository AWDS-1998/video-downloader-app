/**
 * FormatToggle Component
 * Toggle between video and audio download modes
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { useI18n } from '../i18n';

interface Props {
  value: 'video' | 'audio';
  onChange: (value: 'video' | 'audio') => void;
}

export const FormatToggle: React.FC<Props> = ({ value, onChange }) => {
  const { t } = useI18n();
  const handlePress = (type: 'video' | 'audio') => {
    if (type !== value) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onChange(type);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Ionicons name="options-outline" size={16} color={Colors.textSecondary} />
        <Text style={styles.label}>{t('home.formatLabel')}</Text>
      </View>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.option, value === 'video' && styles.optionActive]}
          onPress={() => handlePress('video')}
          activeOpacity={0.8}
        >
          <Ionicons name="videocam" size={20} color={value === 'video' ? Colors.textPrimary : Colors.textTertiary} />
          <Text style={[styles.optionText, value === 'video' && styles.optionTextActive]}>{t('home.video')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, value === 'audio' && styles.optionActive]}
          onPress={() => handlePress('audio')}
          activeOpacity={0.8}
        >
          <Ionicons name="musical-notes" size={20} color={value === 'audio' ? Colors.textPrimary : Colors.textTertiary} />
          <Text style={[styles.optionText, value === 'audio' && styles.optionTextActive]}>{t('home.audio')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.base },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  label: { color: Colors.textSecondary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold },
  toggleContainer: { flexDirection: 'row', backgroundColor: Colors.backgroundTertiary, borderRadius: BorderRadius.lg, padding: 2, gap: 2 },
  option: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, gap: Spacing.sm, borderRadius: BorderRadius.lg - 2 },
  optionActive: { backgroundColor: Colors.primary },
  optionText: { color: Colors.textTertiary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium },
  optionTextActive: { color: Colors.textPrimary, fontWeight: Typography.weights.bold },
});
