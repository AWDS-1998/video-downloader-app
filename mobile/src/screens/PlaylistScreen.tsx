/**
 * PlaylistScreen - تحميل قوائم التشغيل
 * المرجع: mode_playlist() L796-908
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { GradientBackground, URLInput, PlatformBadge, DownloadButton, ProgressBar, PlaylistSkeleton, EmptyState } from '../components';
import { PlaylistInfo, DownloadProgress } from '../types';
import api from '../services/api';
import wsService from '../services/websocket';
import { isValidUrl, isPlaylistUrl } from '../utils/platform';

export const PlaylistScreen: React.FC = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [playlist, setPlaylist] = useState<PlaylistInfo | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);

  useEffect(() => {
    const unsub = wsService.on('progress', (data: DownloadProgress) => {
      setDownloadProgress(data);
      if (data.status === 'completed' || data.status === 'error') {
        setIsDownloading(false);
      }
    });
    return () => unsub();
  }, []);

  const fetchPlaylist = useCallback(async (playlistUrl: string) => {
    if (!isValidUrl(playlistUrl)) return;
    
    setIsLoading(true);
    setPlaylist(null);
    setSelectedItems([]);

    try {
      const data = await api.getPlaylistInfo(playlistUrl);
      setPlaylist(data);
      // Select all by default
      setSelectedItems(data.entries.map((_: any, i: number) => i + 1));
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'فشل جلب قائمة التشغيل');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleItem = (index: number) => {
    setSelectedItems(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleDownload = useCallback(async () => {
    if (!playlist || selectedItems.length === 0) return;

    setIsDownloading(true);
    setDownloadProgress(null);

    try {
      await api.startDownload({
        url: url,
        isPlaylist: true,
        playlistItems: selectedItems.join(','),
        type: 'video',
        quality: 'best',
      } as any);
    } catch (err: any) {
      setIsDownloading(false);
      Alert.alert('خطأ', err.message);
    }
  }, [playlist, selectedItems, url]);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.headerTitle}>📜 قوائم التشغيل</Text>

          <URLInput
            value={url}
            onChangeText={setUrl}
            onSubmit={fetchPlaylist}
            isLoading={isLoading}
          />

          {isLoading && <PlaylistSkeleton />}

          {!isLoading && !playlist && (
            <EmptyState
              icon="playlist-add"
              title="لا توجد قائمة مختارة"
              subtitle="أدخل رابط قائمة تشغيل من YouTube أو غيرها"
            />
          )}

          {playlist && (
            <View style={styles.playlistCard}>
              <View style={styles.playlistHeader}>
                <View style={styles.playlistMeta}>
                  <Text style={styles.playlistTitle} numberOfLines={2}>{playlist.title}</Text>
                  <Text style={styles.playlistUploader}>{playlist.uploader}</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{playlist.count} فيديو</Text>
                  </View>
                </View>
                {playlist.platform && <PlatformBadge platformId={playlist.platform.id} size="sm" />}
              </View>

              <View style={styles.selectionHeader}>
                <Text style={styles.selectionTitle}>حدد الفيديوهات ({selectedItems.length})</Text>
                <TouchableOpacity 
                  onPress={() => setSelectedItems(selectedItems.length === playlist.entries.length ? [] : playlist.entries.map((_, i) => i + 1))}
                >
                  <Text style={styles.selectAllText}>
                    {selectedItems.length === playlist.entries.length ? 'إلغاء الكل' : 'تحديد الكل'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.itemsList}>
                {playlist.entries.map((item) => {
                  const isSelected = selectedItems.includes(item.index);
                  return (
                    <TouchableOpacity 
                      key={item.id} 
                      style={[styles.itemRow, isSelected && styles.itemRowSelected]}
                      onPress={() => toggleItem(item.index)}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color={Colors.textPrimary} />}
                      </View>
                      <Text style={[styles.itemTitle, isSelected && styles.itemTitleActive]} numberOfLines={1}>
                        {item.index}. {item.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {!isDownloading && !downloadProgress && (
                <DownloadButton 
                  onPress={handleDownload} 
                  disabled={selectedItems.length === 0}
                  label={`تحميل ${selectedItems.length} فيديو`}
                />
              )}
            </View>
          )}

          {(isDownloading || downloadProgress) && (
            <View style={styles.progressSection}>
              <Text style={styles.sectionTitle}>
                {downloadProgress?.status === 'completed' ? '✅ اكتمل تحميل القائمة!' : '⏳ جاري التحميل...'}
              </Text>
              <ProgressBar
                progress={downloadProgress?.progress || 0}
                speed={downloadProgress?.speed}
                eta={downloadProgress?.eta}
                filename={downloadProgress?.filename}
                status={downloadProgress?.status}
              />
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
  headerTitle: { color: Colors.textPrimary, fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.extrabold, marginBottom: Spacing.xl },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.info + '15', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.info + '30' },
  infoText: { color: Colors.infoLight, fontSize: Typography.sizes.sm, flex: 1 },
  playlistCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, borderWidth: 1, borderColor: Colors.cardBorder },
  playlistHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  playlistMeta: { flex: 1, marginRight: Spacing.md },
  playlistTitle: { color: Colors.textPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  playlistUploader: { color: Colors.textTertiary, fontSize: Typography.sizes.sm, marginTop: 4 },
  countBadge: { alignSelf: 'flex-start', backgroundColor: Colors.backgroundTertiary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 8 },
  countText: { color: Colors.textSecondary, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold },
  selectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.lg, marginBottom: Spacing.md },
  selectionTitle: { color: Colors.textSecondary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
  selectAllText: { color: Colors.primary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
  itemsList: { marginBottom: Spacing.xl },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md },
  itemRowSelected: { borderBottomColor: Colors.primary + '30' },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: Colors.textDisabled, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  itemTitle: { color: Colors.textTertiary, fontSize: Typography.sizes.sm, flex: 1 },
  itemTitleActive: { color: Colors.textPrimary, fontWeight: Typography.weights.medium },
  progressSection: { backgroundColor: Colors.surface, borderRadius: 20, padding: Spacing.base, marginTop: Spacing.base, borderWidth: 1, borderColor: Colors.cardBorder },
  sectionTitle: { color: Colors.textPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, marginBottom: Spacing.md },
});
