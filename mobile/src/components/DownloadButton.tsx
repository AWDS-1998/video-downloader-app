/**
 * DownloadButton Component
 * Animated download button with gradient
 */

import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { useI18n } from '../i18n';

interface Props {
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  type?: 'video' | 'audio';
  label?: string;
}

export const DownloadButton: React.FC<Props> = ({ onPress, isLoading, disabled, type = 'video', label }) => {
  const { t } = useI18n();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isLoading && !disabled) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isLoading, disabled]);

  const handlePressIn = () => { Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start(); };
  const handlePressOut = () => { Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start(); };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onPress();
  };

  const gradientColors = type === 'audio'
    ? (Colors.gradients.audioMode as unknown as readonly [string, string, ...string[]])
    : (Colors.gradients.primary as unknown as readonly [string, string, ...string[]]);

  const buttonLabel = label || (type === 'audio' ? t('home.downloadMp3') : t('home.startDownload'));

  return (
    <Animated.View style={{ transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }] }}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || isLoading}
        activeOpacity={0.9}
      >
        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.button, (disabled || isLoading) && styles.disabled]}>
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.textPrimary} />
          ) : (
            <Ionicons name={type === 'audio' ? 'musical-notes' : 'download'} size={22} color={Colors.textPrimary} />
          )}
          <Text style={styles.label}>{isLoading ? t('download.btnDownloading') : buttonLabel}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.base, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.lg, gap: Spacing.sm, minHeight: 56 },
  disabled: { opacity: 0.5 },
  label: { color: Colors.textPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
});
