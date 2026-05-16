/**
 * VideoInfoCard Component
 * بطاقة عرض معلومات الفيديو
 * المرجع: mode_single_video() L750-764
 */

import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { VideoInfo } from '../types';
import { formatDuration, formatNumber, formatFileSize } from '../utils/platform';
import { PlatformBadge } from './PlatformBadge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  info: VideoInfo;
}

export const VideoInfoCard: React.FC<Props> = ({ info }) => {
  return (
    <View style={styles.container}>
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        {info.thumbnail ? (
          <Image source={{ uri: info.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Ionicons name="videocam" size={40} color={Colors.textTertiary} />
          </View>
        )}

        {/* Duration overlay */}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(info.duration)}</Text>
        </View>

        {/* Gradient overlay at bottom */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.thumbnailOverlay}
        />
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {info.title}
        </Text>

        {/* Uploader & Platform */}
        <View style={styles.metaRow}>
          <View style={styles.uploaderRow}>
            <Ionicons name="person-circle" size={16} color={Colors.textSecondary} />
            <Text style={styles.uploaderText} numberOfLines={1}>
              {info.uploader}
            </Text>
          </View>
          {info.platform && <PlatformBadge platformId={info.platform.id} size="sm" />}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {info.viewCount > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="eye" size={14} color={Colors.textTertiary} />
              <Text style={styles.statText}>{formatNumber(info.viewCount)}</Text>
            </View>
          )}
          {info.likeCount > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="heart" size={14} color={Colors.error} />
              <Text style={styles.statText}>{formatNumber(info.likeCount)}</Text>
            </View>
          )}
          {info.filesize > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="document" size={14} color={Colors.textTertiary} />
              <Text style={styles.statText}>{formatFileSize(info.filesize)}</Text>
            </View>
          )}
          {info.subtitles.length > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="text" size={14} color={Colors.info} />
              <Text style={styles.statText}>CC</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.base,
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: (SCREEN_WIDTH - 32) * 0.5625, // 16:9 ratio
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  durationBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  durationText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  infoSection: {
    padding: Spacing.base,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.sizes.lg * Typography.lineHeights.normal,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  uploaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.xs,
  },
  uploaderText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: Colors.textTertiary,
    fontSize: Typography.sizes.sm,
  },
});
