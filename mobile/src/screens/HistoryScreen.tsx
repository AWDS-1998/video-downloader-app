/**
 * HistoryScreen - Download History (Local + Active)
 * Shows locally saved downloads with play/share buttons
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, RefreshControl, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Spacing, BorderRadius, Typography } from '../theme';
import { GradientBackground, EmptyState, FadeInView } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../i18n';
import downloadManager, { DownloadTask, DownloadManager } from '../services/downloadManager';

export const HistoryScreen: React.FC = () => {
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
    const interval = setInterval(refreshTasks, 3000);
    return () => { unsub(); clearInterval(interval); };
  }, [refreshTasks]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    refreshTasks();
    setIsRefreshing(false);
  }, [refreshTasks]);

  const handleCancel = useCallback(async (taskId: string) => {
    await downloadManager.cancelDownload(taskId);
    refreshTasks();
  }, [refreshTasks]);

  const handlePlay = useCallback(async (task: DownloadTask) => {
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
    if (!task.localPath) return;
    try {
      await Sharing.shareAsync(task.localPath);
    } catch (e) {
      // Try native share with URL
      Share.share({ message: task.url, title: task.title });
    }
  }, []);

  const handleRemove = useCallback((taskId: string) => {
    downloadManager.removeTask(taskId);
    refreshTasks();
  }, [refreshTasks]);

  const handleClearAll = useCallback(() => {
    Alert.alert(t('history.clearConfirmTitle'), t('history.clearConfirmMessage'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('history.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          downloadManager.clearAllTasks();
          refreshTasks();
        },
      },
    ]);
  }, [t, refreshTasks]);

  const activeTasks = tasks.filter(t => ['extracting', 'downloading', 'saving'].includes(t.status));
  const completedTasks = tasks.filter(t => !['extracting', 'downloading', 'saving'].includes(t.status));

  const s = getStyles(colors);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return { icon: 'checkmark-circle', color: colors.success };
      case 'error': return { icon: 'alert-circle', color: colors.error };
      case 'cancelled': return { icon: 'close-circle', color: colors.textTertiary };
      case 'downloading': return { icon: 'cloud-download', color: colors.primary };
      case 'extracting': return { icon: 'link', color: colors.warning };
      case 'saving': return { icon: 'save', color: colors.info };
      default: return { icon: 'time', color: colors.textTertiary };
    }
  };

  const renderTask = ({ item, index }: { item: DownloadTask; index: number }) => {
    const statusInfo = getStatusIcon(item.status);
    const isActive = ['extracting', 'downloading', 'saving'].includes(item.status);
    const isCompleted = item.status === 'completed';
    const fileSize = DownloadManager.formatSize(item.filesize || item.downloadedBytes);

    return (
      <FadeInView delay={index * 40}>
        <View style={s.card}>
          {/* Header */}
          <View style={s.cardHeader}>
            <Ionicons name={statusInfo.icon as any} size={20} color={statusInfo.color} />
            <Text style={s.cardTitle} numberOfLines={2}>{item.title || item.filename || 'Download'}</Text>
            {!isActive && (
              <TouchableOpacity onPress={() => handleRemove(item.id)} style={s.removeBtn}>
                <Ionicons name="close" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Progress bar for active downloads */}
          {isActive && (
            <View style={s.progressSection}>
              <View style={s.progressBarBg}>
                <View style={[s.progressBarFill, { width: `${Math.max(item.progress, 2)}%` }]} />
              </View>
              <View style={s.progressInfo}>
                <Text style={s.progressText}>{item.progress}%</Text>
                {item.speedText ? <Text style={s.speedText}>{item.speedText}</Text> : null}
                {item.eta ? <Text style={s.etaText}>{item.eta}</Text> : null}
              </View>
            </View>
          )}

          {/* Info row */}
          <View style={s.cardInfo}>
            <Text style={s.cardMeta}>
              {item.type === 'audio' ? '🎵' : '🎬'} {item.quality || ''} {fileSize ? `• ${fileSize}` : ''}
            </Text>
            <Text style={s.cardDate}>
              {new Date(item.startedAt).toLocaleDateString()}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={s.cardActions}>
            {isActive && (
              <TouchableOpacity style={s.actionBtn} onPress={() => handleCancel(item.id)}>
                <Ionicons name="stop-circle-outline" size={18} color={colors.error} />
                <Text style={[s.actionText, { color: colors.error }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            )}
            {isCompleted && item.localPath && (
              <>
                <TouchableOpacity style={[s.actionBtn, s.actionBtnPrimary]} onPress={() => handlePlay(item)}>
                  <Ionicons name="play-circle" size={18} color="#FFF" />
                  <Text style={[s.actionText, { color: '#FFF' }]}>{t('history.openFile')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={() => handleShare(item)}>
                  <Ionicons name="share-outline" size={18} color={colors.primary} />
                  <Text style={[s.actionText, { color: colors.primary }]}>{t('history.share')}</Text>
                </TouchableOpacity>
              </>
            )}
            {isCompleted && !item.localPath && (
              <Text style={s.noFileText}>{t('history.fileNotFound')}</Text>
            )}
          </View>
        </View>
      </FadeInView>
    );
  };

  return (
    <GradientBackground>
      <SafeAreaView style={s.safeArea} edges={['top']}>
        <View style={s.header}>
          <Text style={s.headerTitle}>📥 {t('history.title')}</Text>
          {tasks.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={s.clearBtn}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={[...activeTasks, ...completedTasks]}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          contentContainerStyle={s.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="cloud-download-outline"
              title={t('history.empty')}
              subtitle={t('history.emptySubtitle')}
            />
          }
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            activeTasks.length > 0 ? (
              <View style={s.sectionHeader}>
                <View style={s.activeDot} />
                <Text style={s.sectionTitle}>{t('history.active')} ({activeTasks.length})</Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </GradientBackground>
  );
};

function getStyles(colors: any) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
    headerTitle: { color: colors.textPrimary, fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.extrabold },
    clearBtn: { padding: Spacing.sm, backgroundColor: colors.error + '15', borderRadius: BorderRadius.md },
    listContent: { padding: Spacing.base, paddingBottom: Spacing['4xl'], flexGrow: 1 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
    activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
    sectionTitle: { color: colors.textSecondary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold },
    // Card
    card: {
      backgroundColor: colors.surface, borderRadius: BorderRadius.xl,
      borderWidth: 1, borderColor: colors.cardBorder,
      padding: Spacing.base, marginBottom: Spacing.md,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    cardTitle: { flex: 1, color: colors.textPrimary, fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold },
    removeBtn: { padding: 4 },
    // Progress
    progressSection: { marginTop: Spacing.md },
    progressBarBg: { height: 6, borderRadius: 3, backgroundColor: colors.backgroundTertiary, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
    progressInfo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
    progressText: { color: colors.primary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
    speedText: { color: colors.textTertiary, fontSize: Typography.sizes.xs },
    etaText: { color: colors.textTertiary, fontSize: Typography.sizes.xs },
    // Info
    cardInfo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md },
    cardMeta: { color: colors.textTertiary, fontSize: Typography.sizes.sm },
    cardDate: { color: colors.textTertiary, fontSize: Typography.sizes.xs },
    // Actions
    cardActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
    actionBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.border,
    },
    actionBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
    actionText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
    noFileText: { color: colors.textTertiary, fontSize: Typography.sizes.sm, fontStyle: 'italic' },
  });
}
