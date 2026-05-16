/**
 * DownloadCard Component
 * بطاقة التحميل في قائمة التحميلات/السجل
 * المرجع: mode_logs_manager() L1051-1137
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { DownloadItem } from '../types';
import { PlatformBadge } from './PlatformBadge';
import { ProgressBar } from './ProgressBar';

interface Props {
  item: DownloadItem;
  onPress?: () => void;
  onCancel?: () => void;
}

export const DownloadCard: React.FC<Props> = ({ item, onPress, onCancel }) => {
  const getStatusIcon = (): { name: any; color: string } => {
    switch (item.status) {
      case 'completed': return { name: 'checkmark-circle', color: Colors.success };
      case 'downloading': return { name: 'cloud-download', color: Colors.primary };
      case 'error': return { name: 'alert-circle', color: Colors.error };
      case 'cancelled': return { name: 'close-circle', color: Colors.warning };
      default: return { name: 'time', color: Colors.textTertiary };
    }
  };

  const statusIcon = getStatusIcon();

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7} disabled={!onPress}>
      <View style={styles.header}>
        <View style={styles.statusIcon}>
          <Ionicons name={statusIcon.name} size={20} color={statusIcon.color} />
        </View>
        <View style={styles.info}>
          <Text style={styles.filename} numberOfLines={1}>{item.filename || 'جاري التحميل...'}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{item.type === 'audio' ? 'MP3' : 'MP4'}</Text>
            <Text style={styles.metaText}>• {item.quality}</Text>
            {item.startedAt && (
              <Text style={styles.metaText}>• {new Date(item.startedAt).toLocaleTimeString('ar')}</Text>
            )}
          </View>
        </View>
        {item.status === 'downloading' && onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
            <Ionicons name="close" size={18} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {item.status === 'downloading' && (
        <ProgressBar progress={item.progress} />
      )}

      {item.platform && (
        <View style={styles.platformRow}>
          <PlatformBadge platformId={item.platform.id} size="sm" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder, padding: Spacing.base, marginBottom: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  statusIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.backgroundTertiary, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  filename: { color: Colors.textPrimary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold },
  metaRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 2 },
  metaText: { color: Colors.textTertiary, fontSize: Typography.sizes.xs },
  cancelBtn: { padding: Spacing.sm },
  platformRow: { marginTop: Spacing.sm },
});
