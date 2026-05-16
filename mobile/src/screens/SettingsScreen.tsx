/**
 * SettingsScreen - الإعدادات
 * المرجع: ask_cookies_option() L242-276, choose_save_path() L433-459
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { GradientBackground } from '../components';
import { COOKIE_OPTIONS, VIDEO_QUALITIES, AUDIO_QUALITIES } from '../types';

export const SettingsScreen: React.FC = () => {
  const [serverUrl, setServerUrl] = useState('http://192.168.1.100:3000');
  const [defaultVideoQuality, setDefaultVideoQuality] = useState('best');
  const [defaultAudioQuality, setDefaultAudioQuality] = useState('192');
  const [cookiesBrowser, setCookiesBrowser] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);

  const renderSettingRow = (icon: string, title: string, subtitle: string, right: React.ReactNode) => (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon as any} size={20} color={Colors.primary} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      {right}
    </View>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.headerTitle}>⚙️ الإعدادات</Text>

          {/* Server Connection */}
          {renderSection('🖥️ السيرفر', <>
            {renderSettingRow('server', 'عنوان السيرفر', serverUrl,
              <TouchableOpacity onPress={() => Alert.prompt('عنوان السيرفر', 'أدخل عنوان IP:Port', (text) => { if (text) setServerUrl(text); }, 'plain-text', serverUrl)} style={styles.editBtn}>
                <Ionicons name="pencil" size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </>)}

          {/* Default Quality - المرجع: choose_format_and_quality() L341-351 */}
          {renderSection('🎚️ الجودة الافتراضية', <>
            <Text style={styles.optionLabel}>فيديو</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {VIDEO_QUALITIES.map(q => (
                <TouchableOpacity
                  key={q.value}
                  style={[styles.chip, defaultVideoQuality === q.value && styles.chipActive]}
                  onPress={() => setDefaultVideoQuality(q.value)}
                >
                  <Text style={[styles.chipText, defaultVideoQuality === q.value && styles.chipTextActive]}>{q.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.optionLabel, { marginTop: Spacing.md }]}>صوت MP3</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {AUDIO_QUALITIES.map(q => (
                <TouchableOpacity
                  key={q.value}
                  style={[styles.chip, defaultAudioQuality === q.value && styles.chipActive]}
                  onPress={() => setDefaultAudioQuality(q.value)}
                >
                  <Text style={[styles.chipText, defaultAudioQuality === q.value && styles.chipTextActive]}>{q.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>)}

          {/* Cookies - المرجع: ask_cookies_option() L242-276 */}
          {renderSection('🍪 الكوكيز', <>
            <Text style={styles.cookieNote}>مفيد لتجاوز قيود المنصات (YouTube, Instagram, Twitter, Facebook)</Text>
            {COOKIE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.label}
                style={[styles.cookieOption, cookiesBrowser === opt.value && styles.cookieOptionActive]}
                onPress={() => setCookiesBrowser(opt.value)}
              >
                <Ionicons name={opt.icon as any} size={20} color={cookiesBrowser === opt.value ? Colors.primary : Colors.textTertiary} />
                <Text style={[styles.cookieText, cookiesBrowser === opt.value && styles.cookieTextActive]}>{opt.label}</Text>
                {cookiesBrowser === opt.value && <Ionicons name="checkmark-circle" size={18} color={Colors.success} style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            ))}
          </>)}

          {/* Appearance */}
          {renderSection('🎨 المظهر', <>
            {renderSettingRow('moon', 'الوضع الليلي', 'Dark mode مفعّل',
              <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor={Colors.textPrimary} />
            )}
          </>)}

          {/* About */}
          {renderSection('ℹ️ حول التطبيق', <>
            {renderSettingRow('information-circle', 'الإصدار', 'v1.0.0', null)}
            {renderSettingRow('logo-github', 'yt-dlp', 'المحرك الأساسي للتحميل',
              <TouchableOpacity onPress={() => Linking.openURL('https://github.com/yt-dlp/yt-dlp')}>
                <Ionicons name="open-outline" size={18} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </>)}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  headerTitle: { color: Colors.textPrimary, fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.extrabold, marginBottom: Spacing.xl },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { color: Colors.textSecondary, fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, marginBottom: Spacing.md },
  sectionContent: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.cardBorder, padding: Spacing.base },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md },
  settingIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primaryGlow, justifyContent: 'center', alignItems: 'center' },
  settingInfo: { flex: 1 },
  settingTitle: { color: Colors.textPrimary, fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium },
  settingSubtitle: { color: Colors.textTertiary, fontSize: Typography.sizes.sm, marginTop: 2 },
  editBtn: { padding: Spacing.sm },
  optionLabel: { color: Colors.textSecondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, marginBottom: Spacing.sm },
  chipScroll: { flexDirection: 'row' },
  chip: { backgroundColor: Colors.backgroundTertiary, borderRadius: BorderRadius.full, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.base, marginRight: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  chipText: { color: Colors.textTertiary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
  chipTextActive: { color: Colors.primary },
  cookieNote: { color: Colors.textTertiary, fontSize: Typography.sizes.sm, marginBottom: Spacing.md },
  cookieOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  cookieOptionActive: { borderBottomColor: Colors.primary + '30' },
  cookieText: { color: Colors.textSecondary, fontSize: Typography.sizes.base },
  cookieTextActive: { color: Colors.primary, fontWeight: Typography.weights.semibold },
});
