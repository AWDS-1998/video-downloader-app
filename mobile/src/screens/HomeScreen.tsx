/**
 * HomeScreen - الشاشة الرئيسية
 * تحميل مباشر مع إيقاف/استئناف/إلغاء وعرض السرعة
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
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
import { DownloadManager } from '../services/downloadManager';

export const HomeScreen: React.FC = () => {
  const [url, setUrl] = useState('');
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);
  const [downloadType, setDownloadType] = useState<'video' | 'audio'>('video');
  const [videoQuality, setVideoQuality] = useState('best');
  const [audioQuality, setAudioQuality] = useState('192');
  const [subtitleLang, setSubtitleLang] = useState<string | null>(null);

  const { info, loading: loadingInfo, error: errorInfo, fetchInfo, clearInfo } = useVideoInfo();
  const { 
    currentTask, 
    isDownloading, 
    error: downloadError,
    startDownload, 
    pauseDownload, 
    resumeDownload, 
    cancelDownload, 
    clearDownload 
  } = useDownload();

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
        title: info.title,
        quality: downloadType === 'video' ? videoQuality : audioQuality,
        type: downloadType,
        thumbnail: info.thumbnail,
      });
    } catch (err: any) {
      Alert.alert('❌ فشل التحميل', err.message);
    }
  }, [info, downloadType, videoQuality, audioQuality, startDownload]);

  const handleClear = useCallback(() => {
    setUrl('');
    clearInfo();
    clearDownload();
    setSubtitleLang(null);
  }, [clearInfo, clearDownload]);

  const availableHeights = info?.formats
    ?.filter(f => !f.isAudioOnly && f.height > 0)
    ?.map(f => f.height)
    ?.filter((v, i, a) => a.indexOf(v) === i)
    ?.sort((a, b) => b - a) || [];

  const isActive = currentTask && 
    ['extracting', 'downloading', 'paused', 'merging'].includes(currentTask.status);

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

          {info && !isActive && !currentTask?.status?.includes('completed') && (
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

          {/* قسم التقدم المتقدم */}
          {currentTask && (
            <View style={styles.progressSection}>
              {/* عنوان الحالة */}
              <Text style={styles.sectionTitle}>
                {currentTask.status === 'extracting' ? '🔗 جاري استخراج الرابط...' :
                 currentTask.status === 'downloading' ? '📥 جاري التحميل...' :
                 currentTask.status === 'paused' ? '⏸️ متوقف مؤقتاً' :
                 currentTask.status === 'merging' ? '🔄 جاري الدمج...' :
                 currentTask.status === 'completed' ? '✅ اكتمل التحميل!' :
                 currentTask.status === 'error' ? '❌ فشل التحميل' :
                 currentTask.status === 'cancelled' ? '🚫 تم الإلغاء' :
                 '⏳ جاري التحضير...'}
              </Text>

              {/* شريط التقدم */}
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBg}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { width: `${currentTask.progress}%` },
                      currentTask.status === 'paused' && styles.progressBarPaused,
                      currentTask.status === 'error' && styles.progressBarError,
                    ]} 
                  />
                </View>
                <Text style={styles.progressPercent}>{currentTask.progress}%</Text>
              </View>

              {/* معلومات التحميل */}
              <View style={styles.downloadStats}>
                {currentTask.speedText ? (
                  <View style={styles.statItem}>
                    <Ionicons name="speedometer-outline" size={14} color={Colors.accent} />
                    <Text style={styles.statText}>{currentTask.speedText}</Text>
                  </View>
                ) : null}

                {currentTask.eta ? (
                  <View style={styles.statItem}>
                    <Ionicons name="time-outline" size={14} color={Colors.accent} />
                    <Text style={styles.statText}>{currentTask.eta}</Text>
                  </View>
                ) : null}

                {currentTask.filesize > 0 ? (
                  <View style={styles.statItem}>
                    <Ionicons name="document-outline" size={14} color={Colors.accent} />
                    <Text style={styles.statText}>
                      {DownloadManager.formatSize(currentTask.downloadedBytes)} / {DownloadManager.formatSize(currentTask.filesize)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* أزرار التحكم */}
              <View style={styles.controlButtons}>
                {currentTask.status === 'downloading' && (
                  <>
                    <TouchableOpacity
                      style={[styles.controlBtn, styles.pauseBtn]}
                      onPress={pauseDownload}
                    >
                      <Ionicons name="pause" size={20} color="#fff" />
                      <Text style={styles.controlBtnText}>إيقاف مؤقت</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.controlBtn, styles.cancelBtn]}
                      onPress={() => {
                        Alert.alert('إلغاء التحميل', 'هل أنت متأكد من إلغاء التحميل؟', [
                          { text: 'لا', style: 'cancel' },
                          { text: 'نعم، إلغاء', style: 'destructive', onPress: cancelDownload },
                        ]);
                      }}
                    >
                      <Ionicons name="close" size={20} color="#fff" />
                      <Text style={styles.controlBtnText}>إلغاء</Text>
                    </TouchableOpacity>
                  </>
                )}

                {currentTask.status === 'paused' && (
                  <>
                    <TouchableOpacity
                      style={[styles.controlBtn, styles.resumeBtn]}
                      onPress={resumeDownload}
                    >
                      <Ionicons name="play" size={20} color="#fff" />
                      <Text style={styles.controlBtnText}>استئناف</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.controlBtn, styles.cancelBtn]}
                      onPress={cancelDownload}
                    >
                      <Ionicons name="close" size={20} color="#fff" />
                      <Text style={styles.controlBtnText}>إلغاء</Text>
                    </TouchableOpacity>
                  </>
                )}

                {(currentTask.status === 'completed' || 
                  currentTask.status === 'error' || 
                  currentTask.status === 'cancelled') && (
                  <TouchableOpacity
                    style={[styles.controlBtn, styles.newBtn]}
                    onPress={handleClear}
                  >
                    <Ionicons name="refresh" size={20} color="#fff" />
                    <Text style={styles.controlBtnText}>تحميل جديد</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* رسالة الخطأ */}
              {currentTask.status === 'error' && currentTask.error && (
                <View style={styles.errorMsg}>
                  <Ionicons name="warning" size={16} color={Colors.error} />
                  <Text style={styles.errorMsgText}>{currentTask.error}</Text>
                </View>
              )}
            </View>
          )}

          {!info && !loadingInfo && !errorInfo && !currentTask && (
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

  // قسم التقدم
  progressSection: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.base,
    marginTop: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.md,
  },

  // شريط التقدم
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  progressBarBg: {
    flex: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 6,
  },
  progressBarPaused: {
    backgroundColor: '#f59e0b',
  },
  progressBarError: {
    backgroundColor: Colors.error,
  },
  progressPercent: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    minWidth: 40,
    textAlign: 'right',
  },

  // إحصائيات التحميل
  downloadStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
  },

  // أزرار التحكم
  controlButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  controlBtnText: {
    color: '#fff',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  pauseBtn: {
    backgroundColor: '#f59e0b',
  },
  resumeBtn: {
    backgroundColor: Colors.accent,
  },
  cancelBtn: {
    backgroundColor: Colors.error + 'CC',
  },
  newBtn: {
    backgroundColor: Colors.accent,
  },

  // رسالة خطأ
  errorMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.error + '15',
    borderRadius: 8,
  },
  errorMsgText: {
    color: Colors.errorLight,
    fontSize: Typography.sizes.xs,
    flex: 1,
  },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  platformsPreview: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  emptyText: { color: Colors.textSecondary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.medium, marginBottom: Spacing.xs },
  emptySubtext: { color: Colors.textTertiary, fontSize: Typography.sizes.sm },
});
