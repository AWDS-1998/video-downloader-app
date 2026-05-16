/**
 * HomeScreen - Snaptube-Style Download Screen
 * - Search bar animates to top on focus
 * - Auto-detect clipboard URL and show as card
 * - Platform grid for quick access
 * - Auto-detect single video vs playlist
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity,
  TextInput, Animated, Dimensions, Image, ActivityIndicator, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Spacing, BorderRadius, Typography } from '../theme';
import {
  GradientBackground, VideoInfoCard, FormatToggle,
  QualitySelector, AudioQualitySelector, DownloadButton,
  FadeInView,
} from '../components';
import { detectPlatformFromUrl, isValidUrl, isPlaylistUrl, PLATFORM_MAP } from '../utils/platform';
import { useVideoInfo } from '../hooks/useVideoInfo';
import { useDownload } from '../hooks/useDownload';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../i18n';

const { width: SCREEN_W } = Dimensions.get('window');

// Platforms grid
const PLATFORMS = [
  { id: 'youtube', icon: 'logo-youtube', color: '#FF0000', name: 'YouTube' },
  { id: 'facebook', icon: 'logo-facebook', color: '#1877F2', name: 'Facebook' },
  { id: 'instagram', icon: 'logo-instagram', color: '#E4405F', name: 'Instagram' },
  { id: 'tiktok', icon: 'logo-tiktok', color: '#00F2EA', name: 'TikTok' },
  { id: 'twitter', icon: 'logo-twitter', color: '#1DA1F2', name: 'Twitter' },
];

export const HomeScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const [url, setUrl] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);
  const [downloadType, setDownloadType] = useState<'video' | 'audio'>('video');
  const [videoQuality, setVideoQuality] = useState('best');
  const [audioQuality, setAudioQuality] = useState('192');
  const inputRef = useRef<TextInput>(null);
  const headerAnim = useRef(new Animated.Value(1)).current;

  const { info, loading: loadingInfo, error: errorInfo, fetchInfo, clearInfo } = useVideoInfo();
  const {
    currentTask, isDownloading, startDownload, cancelDownload, clearDownload,
  } = useDownload();

  // Check clipboard on mount and app focus
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const text = await Clipboard.getStringAsync();
        if (text && isValidUrl(text.trim()) && text.trim() !== url) {
          setClipboardUrl(text.trim());
        }
      } catch (e) { /* ignore */ }
    };
    checkClipboard();
    const interval = setInterval(checkClipboard, 3000);
    return () => clearInterval(interval);
  }, [url]);

  // Animate header when search is focused
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: searchFocused || info || loadingInfo ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [searchFocused, info, loadingInfo]);

  const handleSearchFocus = () => {
    setSearchFocused(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSearchBlur = () => {
    if (!url && !info) setSearchFocused(false);
  };

  const handlePasteAndFetch = useCallback(async (pastedUrl: string) => {
    const trimmed = pastedUrl.trim();
    setUrl(trimmed);
    setClipboardUrl(null);
    setSearchFocused(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isValidUrl(trimmed)) {
      // Auto-detect playlist vs single
      if (isPlaylistUrl(trimmed)) {
        Alert.alert(
          'Playlist Detected',
          'This looks like a playlist. Download as single video?',
          [
            { text: 'Single Video', onPress: () => fetchInfo(trimmed.replace(/[&?]list=[^&]+/g, '')) },
            { text: 'Full Playlist', style: 'cancel' },
          ]
        );
      } else {
        fetchInfo(trimmed);
      }
    }
  }, [fetchInfo]);

  const handleSubmit = useCallback(() => {
    Keyboard.dismiss();
    if (!isValidUrl(url)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (isPlaylistUrl(url)) {
      Alert.alert(
        'Playlist Detected',
        'This looks like a playlist. Download as single video?',
        [
          { text: 'Single Video', onPress: () => fetchInfo(url.replace(/[&?]list=[^&]+/g, '')) },
          { text: 'Full Playlist', style: 'cancel' },
        ]
      );
    } else {
      fetchInfo(url);
    }
  }, [url, fetchInfo]);

  const handleDownload = useCallback(async () => {
    if (!info) return;
    try {
      await startDownload({
        url: info.url,
        title: info.title,
        quality: downloadType === 'video' ? videoQuality : audioQuality,
        type: downloadType,
        thumbnail: info.thumbnail,
      });
    } catch (err: any) {
      Alert.alert('❌', err.message);
    }
  }, [info, downloadType, videoQuality, audioQuality, startDownload]);

  const handleClear = useCallback(() => {
    setUrl('');
    clearInfo();
    clearDownload();
    setSearchFocused(false);
  }, [clearInfo, clearDownload]);

  const isActive = currentTask &&
    ['extracting', 'downloading', 'saving'].includes(currentTask.status);

  const detectedPlatform = url ? detectPlatformFromUrl(url) : null;
  const s = getStyles(colors);

  // Header height animation
  const headerHeight = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 160],
  });
  const headerOpacity = headerAnim;

  return (
    <GradientBackground>
      <SafeAreaView style={s.safe} edges={['top']}>
        {/* Animated logo header - hides when search focused */}
        <Animated.View style={[s.logoHeader, { height: headerHeight, opacity: headerOpacity }]}>
          <Text style={s.logoEmoji}>🎬</Text>
          <Text style={s.logoTitle}>{t('home.title')}</Text>
          <Text style={s.logoSubtitle}>{t('home.subtitle')}</Text>
        </Animated.View>

        {/* Search bar - always visible, Snaptube style */}
        <View style={s.searchContainer}>
          {searchFocused && (
            <TouchableOpacity onPress={handleClear} style={s.backBtn}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <View style={[s.searchBar, searchFocused && s.searchBarFocused]}>
            <Ionicons
              name={loadingInfo ? 'hourglass' : 'download-outline'}
              size={20}
              color={colors.textTertiary}
            />
            <TextInput
              ref={inputRef}
              style={s.searchInput}
              placeholder={t('home.pasteUrl')}
              placeholderTextColor={colors.textTertiary}
              value={url}
              onChangeText={setUrl}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              onSubmitEditing={handleSubmit}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="search"
            />
            {url ? (
              <TouchableOpacity onPress={() => setUrl('')}>
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={s.searchBtn}
              onPress={url ? handleSubmit : async () => {
                const text = await Clipboard.getStringAsync();
                if (text) handlePasteAndFetch(text);
              }}
            >
              {loadingInfo ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Ionicons name={url ? 'search' : 'clipboard'} size={18} color="#000" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Clipboard URL card - Snaptube style */}
          {clipboardUrl && !info && !loadingInfo && (
            <FadeInView delay={100}>
              <TouchableOpacity style={s.clipCard} onPress={() => handlePasteAndFetch(clipboardUrl)}>
                <View style={s.clipIcon}>
                  <Ionicons name="link" size={20} color={colors.primary} />
                </View>
                <View style={s.clipInfo}>
                  <Text style={s.clipLabel}>Link you copied</Text>
                  <Text style={s.clipUrl} numberOfLines={1}>{clipboardUrl}</Text>
                </View>
                <TouchableOpacity
                  style={s.clipDownloadBtn}
                  onPress={() => handlePasteAndFetch(clipboardUrl)}
                >
                  <Text style={s.clipDownloadText}>Download</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </FadeInView>
          )}

          {/* Error */}
          {errorInfo && (
            <View style={s.errorCard}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={s.errorText}>{errorInfo}</Text>
            </View>
          )}

          {/* Video Info + Download Options */}
          {info && (
            <FadeInView delay={0}>
              <VideoInfoCard info={info} />
              <View style={s.optionsSection}>
                <FormatToggle value={downloadType} onChange={setDownloadType} />
                {downloadType === 'video' && (
                  <QualitySelector
                    selected={videoQuality}
                    onSelect={setVideoQuality}
                    availableHeights={info?.formats
                      ?.filter(f => !f.isAudioOnly && f.height > 0)
                      ?.map(f => f.height)
                      ?.filter((v, i, a) => a.indexOf(v) === i)
                      ?.sort((a, b) => b - a) || []}
                  />
                )}
                {downloadType === 'audio' && (
                  <AudioQualitySelector selected={audioQuality} onSelect={setAudioQuality} />
                )}
                <DownloadButton onPress={handleDownload} isLoading={isDownloading} type={downloadType} />
              </View>
            </FadeInView>
          )}

          {/* Download progress */}
          {currentTask && (
            <FadeInView delay={0}>
              <View style={s.progressCard}>
                <Text style={s.progressTitle}>
                  {currentTask.status === 'extracting' ? t('download.extracting') :
                   currentTask.status === 'downloading' ? t('download.downloading') :
                   currentTask.status === 'saving' ? t('download.saving') :
                   currentTask.status === 'completed' ? t('download.completed') :
                   currentTask.status === 'error' ? t('download.error') :
                   t('download.preparing')}
                </Text>

                <View style={s.progressBarWrap}>
                  <View style={s.progressBarBg}>
                    <View style={[s.progressBarFill, {
                      width: `${Math.min(currentTask.progress, 100)}%`,
                      backgroundColor: currentTask.status === 'error' ? colors.error : '#FDCB6E',
                    }]} />
                  </View>
                  <Text style={s.progressPct}>{currentTask.progress}%</Text>
                </View>

                {currentTask.speedText || currentTask.eta ? (
                  <View style={s.statsRow}>
                    {currentTask.speedText ? (
                      <Text style={s.statText}>⚡ {currentTask.speedText}</Text>
                    ) : null}
                    {currentTask.eta ? (
                      <Text style={s.statText}>⏱ {currentTask.eta}</Text>
                    ) : null}
                  </View>
                ) : null}

                {isActive && (
                  <TouchableOpacity style={s.cancelBtn} onPress={() => {
                    Alert.alert(t('download.cancelConfirm'), t('download.cancelMessage'), [
                      { text: t('common.no'), style: 'cancel' },
                      { text: t('common.yes'), style: 'destructive', onPress: cancelDownload },
                    ]);
                  }}>
                    <Ionicons name="close" size={18} color="#fff" />
                    <Text style={s.cancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                )}

                {(currentTask.status === 'completed' || currentTask.status === 'error') && (
                  <TouchableOpacity style={s.newBtn} onPress={handleClear}>
                    <Ionicons name="refresh" size={18} color="#000" />
                    <Text style={s.newBtnText}>{t('home.downloadNew')}</Text>
                  </TouchableOpacity>
                )}

                {currentTask.status === 'error' && currentTask.error && (
                  <Text style={s.errorSmall}>{currentTask.error}</Text>
                )}
              </View>
            </FadeInView>
          )}

          {/* Platform grid - shown when empty */}
          {!info && !loadingInfo && !currentTask && (
            <FadeInView delay={200}>
              <Text style={s.sectionLabel}>View sites</Text>
              <View style={s.platformGrid}>
                {PLATFORMS.map(p => (
                  <TouchableOpacity key={p.id} style={s.platformItem} activeOpacity={0.7}>
                    <View style={[s.platformCircle, { backgroundColor: p.color }]}>
                      <Ionicons name={p.icon as any} size={26} color="#fff" />
                    </View>
                    <Text style={s.platformName}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={s.platformItem} activeOpacity={0.7}>
                  <View style={[s.platformCircle, { backgroundColor: '#FDCB6E' }]}>
                    <Ionicons name="ellipsis-horizontal" size={26} color="#000" />
                  </View>
                  <Text style={s.platformName}>+1800</Text>
                </TouchableOpacity>
              </View>
            </FadeInView>
          )}

          {/* Loading skeleton */}
          {loadingInfo && (
            <View style={s.loadingCard}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={s.loadingText}>{t('common.loading')}</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
};

function getStyles(c: any) {
  return StyleSheet.create({
    safe: { flex: 1 },
    // Logo header
    logoHeader: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    logoEmoji: { fontSize: 36, marginBottom: 4 },
    logoTitle: { color: '#FDCB6E', fontSize: 28, fontWeight: '800' },
    logoSubtitle: { color: c.textSecondary, fontSize: 14, marginTop: 4 },
    // Search bar
    searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, marginBottom: Spacing.md },
    backBtn: { marginRight: Spacing.sm, padding: 4 },
    searchBar: {
      flex: 1, flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.surface, borderRadius: 28,
      paddingLeft: Spacing.base, paddingRight: 4,
      height: 52, borderWidth: 1, borderColor: c.border,
      gap: Spacing.sm,
    },
    searchBarFocused: { borderColor: c.primary },
    searchInput: { flex: 1, color: c.textPrimary, fontSize: 15, paddingVertical: 0 },
    searchBtn: {
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: '#FDCB6E', justifyContent: 'center', alignItems: 'center',
    },
    // Clipboard card
    clipCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.surface, borderRadius: 16,
      padding: Spacing.md, marginBottom: Spacing.md,
      borderWidth: 1, borderColor: c.cardBorder,
      gap: Spacing.md,
    },
    clipIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: c.primaryGlow, justifyContent: 'center', alignItems: 'center' },
    clipInfo: { flex: 1 },
    clipLabel: { color: c.textPrimary, fontSize: 14, fontWeight: '600' },
    clipUrl: { color: c.textTertiary, fontSize: 12, marginTop: 2 },
    clipDownloadBtn: {
      backgroundColor: '#FDCB6E', borderRadius: 20,
      paddingHorizontal: 16, paddingVertical: 8,
    },
    clipDownloadText: { color: '#000', fontSize: 13, fontWeight: '700' },
    // Scroll
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: Spacing.base, paddingBottom: 100 },
    // Error
    errorCard: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: c.error + '15', borderRadius: 12,
      padding: Spacing.md, marginBottom: Spacing.md,
      borderWidth: 1, borderColor: c.error + '30',
    },
    errorText: { color: c.error, fontSize: 13, flex: 1 },
    // Options
    optionsSection: { marginTop: Spacing.md },
    // Progress
    progressCard: {
      backgroundColor: c.surface, borderRadius: 20,
      padding: Spacing.base, marginTop: Spacing.md,
      borderWidth: 1, borderColor: c.cardBorder,
    },
    progressTitle: { color: c.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: Spacing.md },
    progressBarWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    progressBarBg: { flex: 1, height: 10, backgroundColor: c.backgroundTertiary, borderRadius: 5, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 5 },
    progressPct: { color: c.textPrimary, fontSize: 13, fontWeight: '700', minWidth: 40, textAlign: 'right' },
    statsRow: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm },
    statText: { color: c.textTertiary, fontSize: 12 },
    cancelBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, backgroundColor: c.error + 'CC', borderRadius: 12,
      paddingVertical: 12, marginTop: Spacing.md,
    },
    cancelText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    newBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, backgroundColor: '#FDCB6E', borderRadius: 12,
      paddingVertical: 12, marginTop: Spacing.md,
    },
    newBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
    errorSmall: { color: c.error, fontSize: 12, marginTop: Spacing.sm },
    // Section
    sectionLabel: { color: c.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: Spacing.md, marginTop: Spacing.lg },
    // Platform grid
    platformGrid: {
      flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start',
      gap: Spacing.lg,
    },
    platformItem: { alignItems: 'center', width: (SCREEN_W - 32 - 80) / 5 },
    platformCircle: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    platformName: { color: c.textSecondary, fontSize: 11, fontWeight: '500', textAlign: 'center' },
    // Loading
    loadingCard: {
      alignItems: 'center', paddingVertical: 60,
    },
    loadingText: { color: c.textTertiary, fontSize: 14, marginTop: Spacing.md },
  });
}
