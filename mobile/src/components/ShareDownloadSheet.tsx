/**
 * ShareDownloadSheet - Snaptube-style Bottom Sheet
 * Shows when user shares a video URL to our app
 * Theme-aware and fully translated
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Image, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, BorderRadius, Typography } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../i18n';
import api from '../services/api';
import downloadManager from '../services/downloadManager';
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
  icon: keyof typeof Ionicons.glyphMap;
  type: 'audio' | 'video';
}

export const ShareDownloadSheet: React.FC<Props> = ({ url, visible, onClose }) => {
  const { colors } = useTheme();
  const { t } = useI18n();
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
      setSelected('192'); // Default: Classic MP3
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
      { label: t('share.fast'), quality: '128', size: '', icon: 'musical-notes', type: 'audio' },
      { label: t('share.classicMp3'), quality: '192', size: '', icon: 'musical-notes', type: 'audio' },
    );

    // Video options from available heights
    const heights = info.formats
      ?.filter(f => !f.isAudioOnly && f.height > 0)
      ?.map(f => f.height)
      ?.filter((v, i, a) => a.indexOf(v) === i)
      ?.sort((a, b) => a - b) || [];

    if (heights.length === 0) {
      formats.push(
        { label: `${t('share.fast')} (360p)`, quality: '360', size: '', icon: 'play-circle', type: 'video' },
        { label: `${t('share.highQuality')} (720p)`, quality: '720', size: '', icon: 'play-circle', type: 'video' },
      );
    } else {
      heights.slice(0, 4).forEach(h => {
        const tag = h >= 1080 ? t('share.hd') : h >= 720 ? t('share.highQuality') : h >= 480 ? t('share.medium') : t('share.fast');
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
      await downloadManager.startDownload({
        url,
        title: info.title,
        quality: fmt?.quality || 'best',
        type: fmt?.type || 'video',
        thumbnail: info.thumbnail,
      });
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
  const s = getStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={s.sheet} activeOpacity={1}>
          {/* Handle bar */}
          <View style={s.handleBar} />

          {/* Header */}
          <Text style={s.title}>{t('share.title')}</Text>

          {loading ? (
            <View style={s.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={s.loadingText}>{t('download.fetchingInfo')}</Text>
            </View>
          ) : info ? (
            <ScrollView showsVerticalScrollIndicator={false} style={s.scrollView}>
              {/* Thumbnail */}
              {info.thumbnail && (
                <Image source={{ uri: info.thumbnail }} style={s.thumbnail} resizeMode="cover" />
              )}
              <Text style={s.videoTitle} numberOfLines={2}>{info.title}</Text>

              {/* Music Section */}
              <Text style={s.sectionLabel}>{t('share.music')}</Text>
              {musicFormats.map(fmt => (
                <TouchableOpacity
                  key={fmt.quality}
                  style={[s.formatRow, selected === fmt.quality && s.formatRowSelected]}
                  onPress={() => setSelected(fmt.quality)}
                >
                  <Ionicons name={fmt.icon} size={24} color={colors.textTertiary} />
                  <View style={s.formatInfo}>
                    <Text style={s.formatLabel}>{fmt.label}</Text>
                  </View>
                  <View style={[s.radio, selected === fmt.quality && s.radioSelected]}>
                    {selected === fmt.quality && <Ionicons name="checkmark" size={14} color="#000" />}
                  </View>
                </TouchableOpacity>
              ))}

              {/* Video Section */}
              <Text style={s.sectionLabel}>{t('share.video')}</Text>
              {videoFormats.map(fmt => (
                <TouchableOpacity
                  key={fmt.quality}
                  style={[s.formatRow, selected === fmt.quality && s.formatRowSelected]}
                  onPress={() => setSelected(fmt.quality)}
                >
                  <Ionicons name={fmt.icon} size={24} color={colors.textTertiary} />
                  <View style={s.formatInfo}>
                    <Text style={s.formatLabel}>{fmt.label}</Text>
                  </View>
                  <View style={[s.radio, selected === fmt.quality && s.radioSelected]}>
                    {selected === fmt.quality && <Ionicons name="checkmark" size={14} color="#000" />}
                  </View>
                </TouchableOpacity>
              ))}

              {/* Download Button */}
              <TouchableOpacity
                style={[s.downloadBtn, downloading && s.downloadBtnDisabled]}
                onPress={handleDownload}
                disabled={!selected || downloading}
              >
                {downloading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={20} color="#000" />
                    <Text style={s.downloadBtnText}>{t('download.btnDownload')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <View style={s.loadingBox}>
              <Ionicons name="alert-circle" size={40} color={colors.error} />
              <Text style={s.loadingText}>{t('download.fetchFailed')}</Text>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

function getStyles(c: any) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: SCREEN_HEIGHT * 0.75,
      paddingBottom: 30,
    },
    handleBar: {
      width: 40, height: 4,
      backgroundColor: c.textTertiary,
      borderRadius: 2, alignSelf: 'center',
      marginTop: 12, marginBottom: 16,
    },
    title: {
      fontSize: 20, fontWeight: '700',
      color: c.textPrimary,
      paddingHorizontal: 20, marginBottom: 16,
    },
    scrollView: { paddingHorizontal: 20 },
    thumbnail: { width: '100%', height: 160, borderRadius: 12, marginBottom: 12 },
    videoTitle: { fontSize: 14, color: c.textSecondary, marginBottom: 20 },
    sectionLabel: { fontSize: 14, fontWeight: '600', color: c.textTertiary, marginBottom: 12, marginTop: 8 },
    formatRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 16 },
    formatRowSelected: {},
    formatInfo: { flex: 1 },
    formatLabel: { fontSize: 16, fontWeight: '500', color: c.textPrimary },
    radio: {
      width: 24, height: 24, borderRadius: 12,
      borderWidth: 2, borderColor: c.border,
      justifyContent: 'center', alignItems: 'center',
    },
    radioSelected: { backgroundColor: '#FDCB6E', borderColor: '#FDCB6E' },
    downloadBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, backgroundColor: '#FDCB6E', borderRadius: 30,
      paddingVertical: 16, marginTop: 24, marginBottom: 10,
    },
    downloadBtnDisabled: { opacity: 0.6 },
    downloadBtnText: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
    loadingBox: { alignItems: 'center', paddingVertical: 50, gap: 12 },
    loadingText: { color: c.textTertiary, fontSize: 14 },
  });
}
