/**
 * FormatToggle Component
 * المرجع: choose_format_and_quality() L309-322
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';

interface Props {
  value: 'video' | 'audio';
  onChange: (value: 'video' | 'audio') => void;
}

export const FormatToggle: React.FC<Props> = ({ value, onChange }) => {
  const handlePress = (type: 'video' | 'audio') => {
    if (type !== value) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onChange(type);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>📌 نوع التحميل</Text>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.option, value === 'video' && styles.optionActive]}
          onPress={() => handlePress('video')}
          activeOpacity={0.8}
        >
          <Ionicons name="videocam" size={20} color={value === 'video' ? Colors.textPrimary : Colors.textTertiary} />
          <Text style={[styles.optionText, value === 'video' && styles.optionTextActive]}>🎬 فيديو</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, value === 'audio' && styles.optionActive]}
          onPress={() => handlePress('audio')}
          activeOpacity={0.8}
        >
          <Ionicons name="musical-notes" size={20} color={value === 'audio' ? Colors.textPrimary : Colors.textTertiary} />
          <Text style={[styles.optionText, value === 'audio' && styles.optionTextActive]}>🎵 صوت MP3</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.base },
  label: { color: Colors.textSecondary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, marginBottom: Spacing.sm },
  toggleContainer: { flexDirection: 'row', backgroundColor: Colors.backgroundTertiary, borderRadius: BorderRadius.lg, padding: 2, gap: 2 },
  option: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, gap: Spacing.sm, borderRadius: BorderRadius.lg - 2 },
  optionActive: { backgroundColor: Colors.primary },
  optionText: { color: Colors.textTertiary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium },
  optionTextActive: { color: Colors.textPrimary, fontWeight: Typography.weights.bold },
});
