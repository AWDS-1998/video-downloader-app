/**
 * ShareDownloadSheet - Bottom Sheet مثل Snaptube
 * يظهر عند مشاركة رابط فيديو للتطبيق
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Image, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import api from '../services/api';
import { VideoInfo } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  url: string | null;
  visible: boolean;
  onClose: () => void;
}

interface FormatOption {
  label: string;
  quality: string;
  size: string;
  icon: string;
  type: 'audio' | 'video';
}

export const ShareDownloadSheet: React.FC<Props> = ({ url, visible, onClose }) => {
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (url && visible) {
      fetchInfo(url);
    }
  }, [url, visible]);

  const fetchInfo = async (videoUrl: string) => {
    setLoading(true);
    setInfo(null);
    setSelected(null);
    try {
      const data = await api.getVideoInfo(videoUrl);
      setInfo(data);
      setSelected('classic_mp3'); // Default selection
    } catch (err) {
      console.error('Share fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFormats = (): FormatOption[] => {
    if (!info) return [];
    const formats: FormatOption[] = [];

    // Music options
    formats.push(
      { label: 'Fast', quality: '128', size: '', icon: 'musical-notes', type: 'audio' },
      { label: 'Classic MP3', quality: '192', size: '', icon: 'musical-notes', type: 'audio' },
    );

    // Video options from available heights
    const heights = info.formats
      ?.filter(f => !f.isAudioOnly && f.height > 0)
      ?.map(f => f.height)
      ?.filter((v, i, a) => a.indexOf(v) === i)
      ?.sort((a, b) => a - b) || [];

    if (heights.length === 0) {
      formats.push(
        { label: 'Fast (360p)', quality: '360', size: '', icon: 'play-circle', type: 'video' },
        { label: 'High quality (720p)', quality: '720', size: '', icon: 'play-circle', type: 'video' },
      );
    } else {
      heights.slice(0, 4).forEach(h => {
        const tag = h >= 1080 ? 'HD' : h >= 720 ? 'High quality' : h >= 480 ? 'Medium' : 'Fast';
        formats.push({
          label: `${tag} (${h}p)`,
          quality: String(h),
          size: '',
          icon: 'play-circle',
          type: 'video',
        });
      });
    }

    return formats;
  };

  const handleDownload = async () => {
    if (!info || !selected || !url) return;
    setDownloading(true);
    try {
      const fmt = getFormats().find(f => f.quality === selected);
      await api.startDownload({
        url,
        type: fmt?.type || 'video',
        quality: fmt?.type === 'video' ? fmt.quality : undefined,
        audioQuality: fmt?.type === 'audio' ? fmt.quality : undefined,
      } as any);
      onClose();
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const formats = getFormats();
  const musicFormats = formats.filter(f => f.type === 'audio');
  const videoFormats = formats.filter(f => f.type === 'video');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <Text style={styles.title}>Download video as</Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>جاري جلب المعلومات...</Text>
            </View>
          ) : info ? (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
              {/* Thumbnail */}
              {info.thumbnail && (
                <Image source={{ uri: info.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
              )}
              <Text style={styles.videoTitle} numberOfLines={2}>{info.title}</Text>

              {/* Music Section */}
              <Text style={styles.sectionLabel}>Music</Text>
              {musicFormats.map(fmt => (
                <TouchableOpacity
                  key={fmt.quality}
                  style={[styles.formatRow, selected === fmt.quality && styles.formatRowSelected]}
                  onPress={() => setSelected(fmt.quality)}
                >
                  <Ionicons name={fmt.icon as any} size={24} color={Colors.textTertiary} />
                  <View style={styles.formatInfo}>
                    <Text style={styles.formatLabel}>{fmt.label}</Text>
                  </View>
                  <View style={[styles.radio, selected === fmt.quality && styles.radioSelected]}>
                    {selected === fmt.quality && <Ionicons name="checkmark" size={14} color="#000" />}
                  </View>
                </TouchableOpacity>
              ))}

              {/* Video Section */}
              <Text style={styles.sectionLabel}>Video</Text>
              {videoFormats.map(fmt => (
                <TouchableOpacity
                  key={fmt.quality}
                  style={[styles.formatRow, selected === fmt.quality && styles.formatRowSelected]}
                  onPress={() => setSelected(fmt.quality)}
                >
                  <Ionicons name={fmt.icon as any} size={24} color={Colors.textTertiary} />
                  <View style={styles.formatInfo}>
                    <Text style={styles.formatLabel}>{fmt.label}</Text>
                  </View>
                  <View style={[styles.radio, selected === fmt.quality && styles.radioSelected]}>
                    {selected === fmt.quality && <Ionicons name="checkmark" size={14} color="#000" />}
                  </View>
                </TouchableOpacity>
              ))}

              {/* Download Button */}
              <TouchableOpacity
                style={[styles.downloadBtn, downloading && styles.downloadBtnDisabled]}
                onPress={handleDownload}
                disabled={!selected || downloading}
              >
                {downloading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.downloadBtnText}>⬇️ Download</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <View style={styles.loadingBox}>
              <Ionicons name="alert-circle" size={40} color={Colors.error} />
              <Text style={styles.loadingText}>فشل جلب المعلومات</Text>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.75,
    paddingBottom: 30,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#D0D0D0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  scrollView: {
    paddingHorizontal: 20,
  },
  thumbnail: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 12,
  },
  videoTitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
    marginTop: 8,
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  formatRowSelected: {},
  formatInfo: {
    flex: 1,
  },
  formatLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    backgroundColor: '#FFC107',
    borderColor: '#FFC107',
  },
  downloadBtn: {
    backgroundColor: '#FFC107',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  downloadBtnDisabled: {
    opacity: 0.6,
  },
  downloadBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 50,
    gap: 12,
  },
  loadingText: {
    color: '#999',
    fontSize: 14,
  },
});
