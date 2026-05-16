/**
 * SettingsScreen - Redesigned Settings
 * Removed: Server URL, Cookies, About
 * Added: Permissions, Theme (Light/Dark/System), Language, Updates
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, BorderRadius, Typography } from '../theme';
import { GradientBackground } from '../components';
import { VIDEO_QUALITIES, AUDIO_QUALITIES } from '../types';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';
import { useI18n, Language } from '../i18n';
import {
  checkPermissions, openAppSettings, PermissionStatus,
} from '../services/permissions';
import Constants from 'expo-constants';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

export const SettingsScreen: React.FC = () => {
  const { colors, mode: themeMode, setMode: setThemeMode } = useTheme();
  const { t, language, setLanguage } = useI18n();
  const [defaultVideoQuality, setDefaultVideoQuality] = useState('best');
  const [defaultAudioQuality, setDefaultAudioQuality] = useState('192');
  const [permissions, setPermissions] = useState<PermissionStatus>({ storage: false, notifications: false });
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  // Check permissions on focus
  useEffect(() => {
    checkPermissions().then(setPermissions);
  }, []);

  // Re-check permissions when screen comes back from settings
  const refreshPermissions = useCallback(async () => {
    const perms = await checkPermissions();
    setPermissions(perms);
  }, []);

  const handleCheckUpdates = useCallback(() => {
    setCheckingUpdate(true);
    setTimeout(() => {
      setCheckingUpdate(false);
      Alert.alert(t('settings.updates'), t('common.comingSoon'));
    }, 1500);
  }, [t]);

  const handlePermissionTap = useCallback((granted: boolean) => {
    if (!granted) {
      openAppSettings();
      // Re-check after user returns from settings
      setTimeout(refreshPermissions, 3000);
    }
  }, [refreshPermissions]);

  const s = getStyles(colors);

  const renderSettingRow = (icon: string, title: string, subtitle: string, right: React.ReactNode) => (
    <View style={s.settingRow}>
      <View style={s.settingIcon}>
        <Ionicons name={icon as any} size={20} color={colors.primary} />
      </View>
      <View style={s.settingInfo}>
        <Text style={s.settingTitle}>{title}</Text>
        <Text style={s.settingSubtitle}>{subtitle}</Text>
      </View>
      {right}
    </View>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionContent}>{children}</View>
    </View>
  );

  const renderChipRow = (
    options: { label: string; value: string }[],
    selected: string,
    onSelect: (v: string) => void,
  ) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
      {options.map(q => (
        <TouchableOpacity
          key={q.value}
          style={[s.chip, selected === q.value && s.chipActive]}
          onPress={() => onSelect(q.value)}
        >
          <Text style={[s.chipText, selected === q.value && s.chipTextActive]}>{q.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const themeOptions: { label: string; value: ThemeMode; icon: string }[] = [
    { label: t('settings.themeSystem'), value: 'system', icon: 'phone-portrait' },
    { label: t('settings.themeDark'), value: 'dark', icon: 'moon' },
    { label: t('settings.themeLight'), value: 'light', icon: 'sunny' },
  ];

  const languageOptions: { label: string; value: Language; flag: string }[] = [
    { label: 'English', value: 'en', flag: '🇺🇸' },
    { label: 'العربية', value: 'ar', flag: '🇸🇦' },
  ];

  return (
    <GradientBackground>
      <SafeAreaView style={s.safeArea} edges={['top']}>
        <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={s.headerTitle}>{t('settings.title')}</Text>

          {/* Permissions */}
          {renderSection(t('settings.permissions'), <>
            <TouchableOpacity onPress={() => handlePermissionTap(permissions.storage)}>
              {renderSettingRow(
                permissions.storage ? 'checkmark-circle' : 'alert-circle',
                t('settings.permStorage'),
                permissions.storage ? t('settings.permGranted') : t('settings.permDenied'),
                <View style={[s.permBadge, permissions.storage ? s.permGranted : s.permDenied]}>
                  <Text style={s.permBadgeText}>
                    {permissions.storage ? '✓' : '!'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={s.divider} />
            <TouchableOpacity onPress={() => handlePermissionTap(permissions.notifications)}>
              {renderSettingRow(
                permissions.notifications ? 'checkmark-circle' : 'alert-circle',
                t('settings.permNotifications'),
                permissions.notifications ? t('settings.permGranted') : t('settings.permDenied'),
                <View style={[s.permBadge, permissions.notifications ? s.permGranted : s.permDenied]}>
                  <Text style={s.permBadgeText}>
                    {permissions.notifications ? '✓' : '!'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            {(!permissions.storage || !permissions.notifications) && (
              <Text style={s.permHint}>
                {t('settings.permStorageDesc')}
              </Text>
            )}
          </>)}

          {/* Default Quality */}
          {renderSection(t('settings.defaultQuality'), <>
            <Text style={s.optionLabel}>{t('settings.videoLabel')}</Text>
            {renderChipRow(VIDEO_QUALITIES, defaultVideoQuality, setDefaultVideoQuality)}
            <Text style={[s.optionLabel, { marginTop: Spacing.md }]}>{t('settings.audioLabel')}</Text>
            {renderChipRow(AUDIO_QUALITIES, defaultAudioQuality, setDefaultAudioQuality)}
          </>)}

          {/* Appearance - Theme */}
          {renderSection(t('settings.appearance'), <>
            <Text style={s.optionLabel}>{t('settings.theme')}</Text>
            <View style={s.themeRow}>
              {themeOptions.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.themeOption, themeMode === opt.value && s.themeOptionActive]}
                  onPress={() => setThemeMode(opt.value)}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={22}
                    color={themeMode === opt.value ? colors.primary : colors.textTertiary}
                  />
                  <Text style={[s.themeLabel, themeMode === opt.value && s.themeLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>)}

          {/* Language */}
          {renderSection(t('settings.language'), <>
            <View style={s.langRow}>
              {languageOptions.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.langOption, language === opt.value && s.langOptionActive]}
                  onPress={() => setLanguage(opt.value)}
                >
                  <Text style={s.langFlag}>{opt.flag}</Text>
                  <Text style={[s.langLabel, language === opt.value && s.langLabelActive]}>
                    {opt.label}
                  </Text>
                  {language === opt.value && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>)}

          {/* Updates */}
          {renderSection(t('settings.updates'), <>
            {renderSettingRow('information-circle', t('settings.currentVersion'), `v${APP_VERSION}`, null)}
            <View style={s.divider} />
            <TouchableOpacity style={s.updateBtn} onPress={handleCheckUpdates} disabled={checkingUpdate}>
              {checkingUpdate ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
              )}
              <Text style={s.updateBtnText}>{t('settings.checkUpdates')}</Text>
            </TouchableOpacity>
          </>)}

        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
};

function getStyles(colors: any) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
    headerTitle: { color: colors.textPrimary, fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.extrabold, marginBottom: Spacing.xl },
    section: { marginBottom: Spacing.xl },
    sectionTitle: { color: colors.textSecondary, fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, marginBottom: Spacing.md },
    sectionContent: { backgroundColor: colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: colors.cardBorder, padding: Spacing.base },
    settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md },
    settingIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryGlow, justifyContent: 'center', alignItems: 'center' },
    settingInfo: { flex: 1 },
    settingTitle: { color: colors.textPrimary, fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium },
    settingSubtitle: { color: colors.textTertiary, fontSize: Typography.sizes.sm, marginTop: 2 },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: Spacing.sm },
    optionLabel: { color: colors.textSecondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, marginBottom: Spacing.sm },
    chipScroll: { flexDirection: 'row' },
    chip: { backgroundColor: colors.backgroundTertiary, borderRadius: BorderRadius.full, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.base, marginRight: Spacing.sm, borderWidth: 1, borderColor: colors.border },
    chipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
    chipText: { color: colors.textTertiary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
    chipTextActive: { color: colors.primary },
    // Theme options
    themeRow: { flexDirection: 'row', gap: Spacing.md },
    themeOption: {
      flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      paddingVertical: Spacing.md, borderRadius: BorderRadius.lg,
      backgroundColor: colors.backgroundTertiary, borderWidth: 1.5, borderColor: colors.border,
    },
    themeOptionActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
    themeLabel: { color: colors.textTertiary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
    themeLabelActive: { color: colors.primary, fontWeight: Typography.weights.bold },
    // Language options
    langRow: { gap: Spacing.sm },
    langOption: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
      paddingVertical: Spacing.md, paddingHorizontal: Spacing.base,
      borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: colors.border,
      marginBottom: Spacing.sm,
    },
    langOptionActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
    langFlag: { fontSize: 24 },
    langLabel: { flex: 1, color: colors.textSecondary, fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium },
    langLabelActive: { color: colors.primary, fontWeight: Typography.weights.bold },
    // Permissions
    permBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    permGranted: { backgroundColor: '#00B89420' },
    permDenied: { backgroundColor: '#E1705520' },
    permBadgeText: { fontSize: 14, fontWeight: '700' as any },
    permHint: { color: colors.textTertiary, fontSize: Typography.sizes.xs, marginTop: Spacing.md, fontStyle: 'italic' },
    // Update button
    updateBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      paddingVertical: Spacing.md, marginTop: Spacing.sm,
      borderRadius: BorderRadius.lg, backgroundColor: colors.primary + '15',
    },
    updateBtnText: { color: colors.primary, fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold },
  });
}
