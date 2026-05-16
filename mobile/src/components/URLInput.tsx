/**
 * URLInput Component
 * حقل إدخال الرابط مع زر لصق و auto-detect
 * المرجع: validate_url() L281-289, detect_platform() L123-165
 * مستوحى من Snaptube: حقل كبير واضح في الأعلى
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { isValidUrl, detectPlatformFromUrl } from '../utils/platform';
import { PlatformBadge } from './PlatformBadge';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (url: string) => void;
  isLoading?: boolean;
  detectedPlatform?: string | null;
}

export const URLInput: React.FC<Props> = ({
  value,
  onChangeText,
  onSubmit,
  isLoading = false,
  detectedPlatform = null,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim()) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const trimmed = text.trim();
        onChangeText(trimmed);

        // Auto-submit إذا كان URL صالح
        if (isValidUrl(trimmed)) {
          setTimeout(() => onSubmit(trimmed), 300);
        }
      }
    } catch (e) {
      console.warn('Paste error:', e);
    }
  }, [onChangeText, onSubmit]);

  const handleClear = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChangeText('');
  }, [onChangeText]);

  const handleSubmitEditing = useCallback(() => {
    if (isValidUrl(value)) {
      onSubmit(value);
    } else if (value.trim()) {
      // شيك الرابط
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [value, onSubmit, shakeAnim]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.primary],
  });

  const isValid = isValidUrl(value);
  const platform = value ? detectPlatformFromUrl(value) : null;

  return (
    <View style={styles.wrapper}>
      {/* Platform Badge */}
      {detectedPlatform && (
        <View style={styles.platformRow}>
          <PlatformBadge platformId={detectedPlatform} size="sm" />
        </View>
      )}

      <Animated.View
        style={[
          styles.container,
          { borderColor, transform: [{ translateX: shakeAnim }] },
        ]}
      >
        {/* Search/Link Icon */}
        <View style={styles.iconContainer}>
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons
              name={value ? (isValid ? 'link' : 'warning') : 'search'}
              size={20}
              color={value ? (isValid ? Colors.success : Colors.warning) : Colors.textTertiary}
            />
          )}
        </View>

        {/* Input */}
        <TextInput
          style={styles.input}
          placeholder="الصق رابط الفيديو هنا..."
          placeholderTextColor={Colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onSubmitEditing={handleSubmitEditing}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          selectTextOnFocus
          editable={!isLoading}
        />

        {/* Action Buttons */}
        <View style={styles.actions}>
          {value ? (
            <TouchableOpacity onPress={handleClear} style={styles.actionButton}>
              <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={handlePaste}
            style={[styles.pasteButton, isLoading && styles.disabled]}
            disabled={isLoading}
          >
            <Ionicons name="clipboard" size={16} color={Colors.primary} />
            <Text style={styles.pasteText}>لصق</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Submit button */}
      {value && isValid && !isLoading && (
        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => onSubmit(value)}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-forward" size={20} color={Colors.textPrimary} />
          <Text style={styles.submitText}>جلب المعلومات</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.base,
  },
  platformRow: {
    marginBottom: Spacing.sm,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    minHeight: 56,
  },
  iconContainer: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    textAlign: 'left',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionButton: {
    padding: Spacing.xs,
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryGlow,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  pasteText: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  disabled: {
    opacity: 0.5,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  submitText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
});
