/**
 * HistoryScreen - سجل التحميلات
 * المرجع: mode_logs_manager() L1051-1137
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { GradientBackground, DownloadCard, EmptyState, FadeInView } from '../components';
import { DownloadItem } from '../types';
import api from '../services/api';
import wsService from '../services/websocket';

export const HistoryScreen: React.FC = () => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDownloads = useCallback(async () => {
    try {
      const data = await api.getAllDownloads();
      setDownloads(data.downloads || []);
    } catch (err) {
      console.warn('Failed to fetch downloads:', err);
    }
  }, []);

  useEffect(() => {
    fetchDownloads();
    const interval = setInterval(fetchDownloads, 5000);
    const unsub = wsService.on('progress', () => fetchDownloads());
    return () => { clearInterval(interval); unsub(); };
  }, [fetchDownloads]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchDownloads();
    setIsRefreshing(false);
  }, [fetchDownloads]);

  const handleCancel = useCallback(async (id: string) => {
    try {
      await api.cancelDownload(id);
      fetchDownloads();
    } catch (err: any) {
      Alert.alert('خطأ', err.message);
    }
  }, [fetchDownloads]);

  // المرجع: mode_logs_manager() L1119-1133 - حذف السجلات
  const handleClearAll = useCallback(() => {
    Alert.alert('⚠️ حذف الكل', 'هل أنت متأكد من حذف جميع السجلات؟', [
      { text: 'لا', style: 'cancel' },
      {
        text: 'نعم، احذف',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteAllLogs();
            setDownloads([]);
          } catch (err: any) {
            Alert.alert('خطأ', err.message);
          }
        },
      },
    ]);
  }, []);

  const activeDownloads = downloads.filter(d => d.status === 'downloading');
  const completedDownloads = downloads.filter(d => d.status !== 'downloading');

  const renderEmpty = () => (
    <EmptyState 
      icon="cloud-download-outline" 
      title="لا توجد تحميلات" 
      subtitle="ابدأ بتحميل فيديو من الشاشة الرئيسية" 
    />
  );

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📥 التحميلات</Text>
          {downloads.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={[...activeDownloads, ...completedDownloads]}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <FadeInView delay={index * 50}>
              <DownloadCard
                item={item}
                onCancel={item.status === 'downloading' ? () => handleCancel(item.id) : undefined}
              />
            </FadeInView>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            activeDownloads.length > 0 ? (
              <View style={styles.sectionHeader}>
                <View style={styles.activeDot} />
                <Text style={styles.sectionTitle}>نشط ({activeDownloads.length})</Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
  headerTitle: { color: Colors.textPrimary, fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.extrabold },
  clearBtn: { padding: Spacing.sm, backgroundColor: Colors.error + '15', borderRadius: BorderRadius.md },
  listContent: { padding: Spacing.base, paddingBottom: Spacing['4xl'], flexGrow: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  sectionTitle: { color: Colors.textSecondary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: Spacing['5xl'] },
  emptyTitle: { color: Colors.textSecondary, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, marginTop: Spacing.lg },
  emptySubtitle: { color: Colors.textTertiary, fontSize: Typography.sizes.md, marginTop: Spacing.sm },
});
