/**
 * PlayScreen - Snaptube-style Play Tab
 * Shows: Downloading (active/failed with retry) → Downloaded (completed)
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, RefreshControl, Image, Share, SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Spacing, BorderRadius, Typography } from '../theme';
import { GradientBackground, FadeInView } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../i18n';
import downloadManager, { DownloadTask, DownloadManager } from '../services/downloadManager';

export const PlayScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshTasks = useCallback(() => {
    setTasks(downloadManager.getAllTasks());
  }, []);

  useEffect(() => {
    refreshTasks();
    const unsub = downloadManager.onProgress(() => refreshTasks());
    const interval = setInterval(refreshTasks, 2000);
    return () => { unsub(); clearInterval(interval); };
  }, [refreshTasks]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    refreshTasks();
    setIsRefreshing(false);
  }, [refreshTasks]);

  const handleRetry = useCallback(async (task: DownloadTask) => {
    try {
      const { startDownload } = require('../hooks/useDownload');
      // Re-trigger download with same params
      downloadManager.removeTask(task.id);
      // We'll need to re-extract. For now just remove and let user re-download
      Alert.alert('Retry', 'Please paste the link again on the Download tab to retry.');
    } catch (e) {
      // fallback
    }
    refreshTasks();
  }, [refreshTasks]);

  const handleOpen = useCallback(async (task: DownloadTask) => {
    if (!task.localPath) {
      Alert.alert(t('common.error'), t('history.fileNotFound'));
      return;
    }
    try {
      const info = await FileSystem.getInfoAsync(task.localPath);
      if (!info.exists) {
        Alert.alert(t('common.error'), t('history.fileNotFound'));
        return;
      }
      await Sharing.shareAsync(task.localPath);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    }
  }, [t]);

  const handleShare = useCallback(async (task: DownloadTask) => {
    if (task.localPath) {
      try { await Sharing.shareAsync(task.localPath); } catch (e) { /* ignore */ }
    } else {
      Share.share({ message: task.url, title: task.title });
    }
  }, []);

  const handleClearAll = useCallback(() => {
    Alert.alert(t('history.clearConfirmTitle'), t('history.clearConfirmMessage'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('history.deleteConfirm'),
        style: 'destructive',
        onPress: () => { downloadManager.clearAllTasks(); refreshTasks(); },
      },
    ]);
  }, [t, refreshTasks]);

  // Split tasks
  const downloading = tasks.filter(task =>
    ['extracting', 'downloading', 'saving', 'error', 'cancelled'].includes(task.status)
  );
  const downloaded = tasks.filter(task => task.status === 'completed');

  const s = getStyles(colors);

  const renderDownloadingItem = (task: DownloadTask, index: number) => {
    const isActive = ['extracting', 'downloading', 'saving'].includes(task.status);
    const isFailed = task.status === 'error' || task.status === 'cancelled';

    return (
      <FadeInView delay={index * 40}>
        <View style={s.dlCard}>
          {/* Thumbnail */}
          <View style={s.dlThumb}>
            {task.thumbnail ? (
              <Image source={{ uri: task.thumbnail }} style={s.dlThumbImg} />
            ) : (
              <View style={[s.dlThumbImg, s.dlThumbPlaceholder]}>
                <Ionicons name={task.type === 'audio' ? 'musical-note' : 'videocam'} size={24} color={colors.textTertiary} />
              </View>
            )}
          </View>

          {/* Info */}
          <View style={s.dlInfo}>
            <Text style={s.dlTitle} numberOfLines={2}>{task.title || task.filename || 'Download'}</Text>

            {isActive && (
              <View style={s.dlProgressRow}>
                <Text style={s.dlStatus}>
                  {task.status === 'extracting' ? 'Extracting...' :
                   task.status === 'saving' ? 'Saving...' :
                   task.speedText || 'Downloading...'}
                </Text>
                <Text style={s.dlPct}>{task.progress}%</Text>
              </View>
            )}

            {isActive && (
              <View style={s.dlProgressBar}>
                <View style={[s.dlProgressFill, { width: `${Math.max(task.progress, 2)}%` }]} />
              </View>
            )}

            {isFailed && (
              <Text style={s.dlFailed}>
                {task.status === 'error' ? '❌ Failed' : '🚫 Cancelled'}
              </Text>
            )}
          </View>

          {/* Action */}
          <View style={s.dlAction}>
            {isActive && (
              <TouchableOpacity onPress={() => downloadManager.cancelDownload(task.id)} style={s.dlActionBtn}>
                <Ionicons name="pause" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            )}
            {isFailed && (
              <TouchableOpacity onPress={() => handleRetry(task)} style={s.dlRetryBtn}>
                <Ionicons name="refresh" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </FadeInView>
    );
  };

  const renderDownloadedItem = (task: DownloadTask, index: number) => {
    const fileSize = DownloadManager.formatSize(task.filesize || task.downloadedBytes);
    return (
      <FadeInView delay={index * 40}>
        <TouchableOpacity style={s.completedCard} onPress={() => handleOpen(task)} activeOpacity={0.7}>
          {/* Thumbnail */}
          <View style={s.completedThumb}>
            {task.thumbnail ? (
              <Image source={{ uri: task.thumbnail }} style={s.completedThumbImg} />
            ) : (
              <View style={[s.completedThumbImg, s.dlThumbPlaceholder]}>
                <Ionicons name={task.type === 'audio' ? 'musical-note' : 'videocam'} size={28} color={colors.textTertiary} />
              </View>
            )}
            {/* Duration overlay */}
            <View style={s.durationBadge}>
              <Ionicons name={task.type === 'audio' ? 'musical-note' : 'play'} size={10} color="#fff" />
            </View>
          </View>

          {/* Info */}
          <View style={s.completedInfo}>
            <Text style={s.completedTitle} numberOfLines={2}>{task.title || task.filename}</Text>
            <View style={s.completedMeta}>
              <Ionicons name={task.type === 'audio' ? 'musical-note' : 'videocam'} size={12} color={colors.textTertiary} />
              {fileSize ? <Text style={s.completedSize}>{fileSize}</Text> : null}
            </View>
          </View>

          {/* More */}
          <TouchableOpacity
            style={s.moreBtn}
            onPress={() => {
              Alert.alert(task.title || 'File', '', [
                { text: t('history.openFile'), onPress: () => handleOpen(task) },
                { text: t('history.share'), onPress: () => handleShare(task) },
                { text: t('common.delete'), style: 'destructive', onPress: () => { downloadManager.removeTask(task.id); refreshTasks(); } },
                { text: t('common.cancel'), style: 'cancel' },
              ]);
            }}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </TouchableOpacity>
      </FadeInView>
    );
  };

  return (
    <GradientBackground>
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollViewContent
          colors={colors}
          t={t}
          s={s}
          downloading={downloading}
          downloaded={downloaded}
          renderDownloadingItem={renderDownloadingItem}
          renderDownloadedItem={renderDownloadedItem}
          handleClearAll={handleClearAll}
          isRefreshing={isRefreshing}
          handleRefresh={handleRefresh}
        />
      </SafeAreaView>
    </GradientBackground>
  );
};

// Separate scrollable content to avoid hooks issues
function ScrollViewContent({ colors, t, s, downloading, downloaded, renderDownloadingItem, renderDownloadedItem, handleClearAll, isRefreshing, handleRefresh }: any) {
  return (
    <FlatList
      data={[]}
      renderItem={null}
      ListHeaderComponent={
        <View style={s.container}>
          {/* Downloading Section */}
          {downloading.length > 0 && (
            <View style={s.sectionWrap}>
              <Text style={s.sectionTitle}>Downloading ({downloading.length})</Text>
              {downloading.map((task: DownloadTask, i: number) => (
                <View key={task.id}>{renderDownloadingItem(task, i)}</View>
              ))}
            </View>
          )}

          {/* Downloaded Section */}
          <View style={s.sectionWrap}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Downloaded</Text>
              <View style={s.sectionActions}>
                {downloaded.length > 0 && (
                  <TouchableOpacity onPress={handleClearAll} style={s.sectionActionBtn}>
                    <Ionicons name="trash-outline" size={20} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {downloaded.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="play-circle-outline" size={60} color={colors.textTertiary} />
                <Text style={s.emptyTitle}>{t('history.empty')}</Text>
                <Text style={s.emptySubtitle}>{t('history.emptySubtitle')}</Text>
              </View>
            ) : (
              downloaded.map((task: DownloadTask, i: number) => (
                <View key={task.id}>{renderDownloadedItem(task, i)}</View>
              ))
            )}
          </View>
        </View>
      }
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
    />
  );
}

function getStyles(c: any) {
  return StyleSheet.create({
    safe: { flex: 1 },
    container: { padding: Spacing.base, paddingBottom: 100 },
    // Section
    sectionWrap: { marginBottom: Spacing.xl },
    sectionTitle: { color: c.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: Spacing.md },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    sectionActions: { flexDirection: 'row', gap: Spacing.sm },
    sectionActionBtn: { padding: 6 },
    // Downloading card
    dlCard: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: Spacing.md, gap: Spacing.md,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    dlThumb: { width: 80, height: 50, borderRadius: 8, overflow: 'hidden' },
    dlThumbImg: { width: '100%', height: '100%', borderRadius: 8 },
    dlThumbPlaceholder: { backgroundColor: c.backgroundTertiary, justifyContent: 'center', alignItems: 'center' },
    dlInfo: { flex: 1 },
    dlTitle: { color: c.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 4 },
    dlProgressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    dlStatus: { color: c.textTertiary, fontSize: 12 },
    dlPct: { color: c.primary, fontSize: 12, fontWeight: '700' },
    dlProgressBar: { height: 3, backgroundColor: c.backgroundTertiary, borderRadius: 2, overflow: 'hidden' },
    dlProgressFill: { height: '100%', backgroundColor: c.primary, borderRadius: 2 },
    dlFailed: { color: c.error, fontSize: 12, fontWeight: '600' },
    dlAction: {},
    dlActionBtn: { padding: 8 },
    dlRetryBtn: { padding: 8, backgroundColor: c.primaryGlow, borderRadius: 20 },
    // Completed card
    completedCard: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: Spacing.md, gap: Spacing.md,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    completedThumb: { width: 72, height: 72, borderRadius: 10, overflow: 'hidden', position: 'relative' },
    completedThumbImg: { width: '100%', height: '100%', borderRadius: 10 },
    durationBadge: {
      position: 'absolute', bottom: 4, right: 4,
      backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 4,
      paddingHorizontal: 4, paddingVertical: 2,
    },
    completedInfo: { flex: 1 },
    completedTitle: { color: c.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 6 },
    completedMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    completedSize: { color: c.textTertiary, fontSize: 12 },
    moreBtn: { padding: 8 },
    // Empty
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyTitle: { color: c.textSecondary, fontSize: 18, fontWeight: '600', marginTop: Spacing.md },
    emptySubtitle: { color: c.textTertiary, fontSize: 14, marginTop: 4 },
  });
}
