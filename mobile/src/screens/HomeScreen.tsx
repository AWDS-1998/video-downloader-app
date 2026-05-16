/**
 * HomeScreen - الشاشة الرئيسية (Refactored)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../theme';
import {
  GradientBackground,
  URLInput,
  VideoInfoCard,
  FormatToggle,
  QualitySelector,
  AudioQualitySelector,
  DownloadButton,
  ProgressBar,
  PlatformBadge,
  SubtitlePicker,
  VideoInfoSkeleton,
  FadeInView,
} from '../components';
import { detectPlatformFromUrl, isValidUrl } from '../utils/platform';
import { useVideoInfo } from '../hooks/useVideoInfo';
import { useDownload } from '../hooks/useDownload';
import { useProgress } from '../hooks/useProgress';

export const HomeScreen: React.FC = () => {
  const [url, setUrl] = useState('');
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);
  const [downloadType, setDownloadType] = useState<'video' | 'audio'>('video');
  const [videoQuality, setVideoQuality] = useState('best');
  const [audioQuality, setAudioQuality] = useState('192');
  const [subtitleLang, setSubtitleLang] = useState<string | null>(null);

  const { info, loading: loadingInfo, error: errorInfo, fetchInfo, clearInfo } = useVideoInfo();
  const { isDownloading, startDownload, cancelDownload, currentDownloadId } = useDownload();
  const { progressData, clearProgress } = useProgress(currentDownloadId);

  // Auto-detect platform
  useEffect(() => {
    if (url && isValidUrl(url)) {
      setDetectedPlatform(detectPlatformFromUrl(url));
    } else {
      setDetectedPlatform(null);
    }
  }, [url]);

  const handleFetchInfo = useCallback(async (videoUrl: string) => {
    try {
      const data = await fetchInfo(videoUrl);
      if (data?.platform?.id === 'soundcloud') setDownloadType('audio');
    } catch (err: any) {
      Alert.alert('❌ خطأ', err.message || 'فشل جلب المعلومات');
    }
  }, [fetchInfo]);

  const handleDownload = useCallback(async () => {
    if (!info) return;
    try {
      await startDownload({
        url: info.url,
        type: downloadType,
        quality: downloadType === 'video' ? videoQuality : undefined,
        audioQuality: downloadType === 'audio' ? audioQuality : undefined,
        subtitleLang,
        cookies: null, // Can be added later from settings
        isPlaylist: false,
        playlistItems: null
      } as any);
    } catch (err: any) {
      Alert.alert('❌ فشل التحميل', err.message);
    }
  }, [info, downloadType, videoQuality, audioQuality, subtitleLang, startDownload]);

  const handleClear = useCallback(() => {
    setUrl('');
    clearInfo();
    clearProgress();
    setSubtitleLang(null);
  }, [clearInfo, clearProgress]);

  const availableHeights = info?.formats
    ?.filter(f => !f.isAudioOnly && f.height > 0)
    ?.map(f => f.height)
    ?.filter((v, i, a) => a.indexOf(v) === i)
    ?.sort((a, b) => b - a) || [];

  return (
    <GradientBackground>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>🎬</Text>
            <Text style={styles.headerTitle}>Video Downloader</Text>
            <Text style={styles.headerSubtitle}>حمّل من أي منصة</Text>
          </View>

          <URLInput
            value={url}
            onChangeText={setUrl}
            onSubmit={handleFetchInfo}
            isLoading={loadingInfo}
            detectedPlatform={detectedPlatform}
          />

          {loadingInfo && <VideoInfoSkeleton />}

          {errorInfo && !loadingInfo && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={20} color={Colors.error} />
              <Text style={styles.errorText}>{errorInfo}</Text>
            </View>
          )}

          {info && (
            <FadeInView>
              <VideoInfoCard info={info} />
            </FadeInView>
          )}

          {info && !isDownloading && !progressData && (
            <View style={styles.optionsSection}>
              <FormatToggle value={downloadType} onChange={setDownloadType} />

              {downloadType === 'video' ? (
                <>
                  <QualitySelector
                    selected={videoQuality}
                    onSelect={setVideoQuality}
                    availableHeights={availableHeights}
                  />
                  {info.subtitles && info.subtitles.length > 0 && (
                    <SubtitlePicker
                      languages={info.subtitles}
                      selected={subtitleLang}
                      onSelect={setSubtitleLang}
                    />
                  )}
                </>
              ) : (
                <AudioQualitySelector
                  selected={audioQuality}
                  onSelect={setAudioQuality}
                />
              )}

              <DownloadButton
                onPress={handleDownload}
                isLoading={isDownloading}
                type={downloadType}
              />
            </View>
          )}

          {(isDownloading || progressData) && (
            <View style={styles.progressSection}>
              <Text style={styles.sectionTitle}>
                {progressData?.status === 'completed' ? '✅ اكتمل التحميل!' :
                 progressData?.status === 'error' ? '❌ فشل التحميل' :
                 '⏳ جاري التحميل...'}
              </Text>
              <ProgressBar
                progress={progressData?.progress || 0}
                speed={progressData?.speed}
                eta={progressData?.eta}
                filename={progressData?.filename}
                status={progressData?.status}
              />
              {progressData?.status === 'completed' && (
                <DownloadButton
                  onPress={handleClear}
                  type={downloadType}
                  label="🔄 تحميل جديد"
                />
              )}
            </View>
          )}

          {!info && !loadingInfo && !errorInfo && (
            <View style={styles.emptyState}>
              <View style={styles.platformsPreview}>
                {['youtube', 'tiktok', 'instagram', 'twitter', 'facebook'].map(p => (
                  <PlatformBadge key={p} platformId={p} size="sm" showName={false} />
                ))}
              </View>
              <Text style={styles.emptyText}>الصق رابط من أي منصة للبدء</Text>
              <Text style={styles.emptySubtext}>YouTube • TikTok • Instagram • Twitter • +1800</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.base, paddingBottom: 100 },
  header: { alignItems: 'center', paddingVertical: Spacing.xl, marginBottom: Spacing.base },
  headerEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  headerTitle: { color: Colors.textPrimary, fontSize: Typography.sizes['3xl'], fontWeight: Typography.weights.extrabold },
  headerSubtitle: { color: Colors.textSecondary, fontSize: Typography.sizes.base, marginTop: Spacing.xs },
  errorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.error + '15', borderRadius: 12, padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.base, borderWidth: 1, borderColor: Colors.error + '30' },
  errorText: { color: Colors.errorLight, fontSize: Typography.sizes.sm, flex: 1 },
  optionsSection: { marginTop: Spacing.base },
  progressSection: { backgroundColor: Colors.surface, borderRadius: 20, padding: Spacing.base, marginTop: Spacing.base, borderWidth: 1, borderColor: Colors.cardBorder },
  sectionTitle: { color: Colors.textPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, marginBottom: Spacing.md },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  platformsPreview: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  emptyText: { color: Colors.textSecondary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.medium, marginBottom: Spacing.xs },
  emptySubtext: { color: Colors.textTertiary, fontSize: Typography.sizes.sm },
});
