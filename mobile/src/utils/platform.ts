/**
 * Platform utilities
 * المرجع: detect_platform() L123-165
 * أيقونات ومعلومات المنصات للاستخدام في الواجهة
 */

import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export interface PlatformUI {
  name: string;
  icon: IoniconsName;
  color: string;
  emoji: string;
}

// خريطة المنصات مع الأيقونات - المرجع: L128-161
export const PLATFORM_MAP: Record<string, PlatformUI> = {
  youtube: {
    name: 'YouTube',
    icon: 'logo-youtube',
    color: Colors.platforms.youtube,
    emoji: '📺',
  },
  vimeo: {
    name: 'Vimeo',
    icon: 'videocam',
    color: Colors.platforms.vimeo,
    emoji: '🎞️',
  },
  tiktok: {
    name: 'TikTok',
    icon: 'logo-tiktok',
    color: Colors.platforms.tiktok,
    emoji: '🎵',
  },
  twitter: {
    name: 'Twitter / X',
    icon: 'logo-twitter',
    color: Colors.platforms.twitter,
    emoji: '🐦',
  },
  instagram: {
    name: 'Instagram',
    icon: 'logo-instagram',
    color: Colors.platforms.instagram,
    emoji: '📸',
  },
  facebook: {
    name: 'Facebook',
    icon: 'logo-facebook',
    color: Colors.platforms.facebook,
    emoji: '👥',
  },
  dailymotion: {
    name: 'Dailymotion',
    icon: 'play-circle',
    color: Colors.platforms.dailymotion,
    emoji: '🎥',
  },
  twitch: {
    name: 'Twitch',
    icon: 'logo-twitch',
    color: Colors.platforms.twitch,
    emoji: '🟣',
  },
  reddit: {
    name: 'Reddit',
    icon: 'logo-reddit',
    color: Colors.platforms.reddit,
    emoji: '🔶',
  },
  soundcloud: {
    name: 'SoundCloud',
    icon: 'musical-notes',
    color: Colors.platforms.soundcloud,
    emoji: '🔊',
  },
  bilibili: {
    name: 'Bilibili',
    icon: 'tv',
    color: Colors.platforms.bilibili,
    emoji: '📡',
  },
  unknown: {
    name: 'Unknown',
    icon: 'globe',
    color: Colors.platforms.unknown,
    emoji: '🌐',
  },
};

export function getPlatformUI(platformId: string): PlatformUI {
  return PLATFORM_MAP[platformId] || PLATFORM_MAP.unknown;
}

/**
 * كشف المنصة من الرابط (frontend-side)
 * المرجع: detect_platform() L123-165, validate_url() L281-289
 */
export function detectPlatformFromUrl(url: string): string {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/vimeo\.com/i.test(url)) return 'vimeo';
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
  if (/instagram\.com/i.test(url)) return 'instagram';
  if (/facebook\.com|fb\.watch/i.test(url)) return 'facebook';
  if (/dailymotion\.com|dai\.ly/i.test(url)) return 'dailymotion';
  if (/twitch\.tv/i.test(url)) return 'twitch';
  if (/reddit\.com/i.test(url)) return 'reddit';
  if (/soundcloud\.com/i.test(url)) return 'soundcloud';
  if (/bilibili\.com/i.test(url)) return 'bilibili';
  return 'unknown';
}

export function isValidUrl(url: string): boolean {
  return /^https?:\/\/.+/.test(url);
}

export function isPlaylistUrl(url: string): boolean {
  return /list=|\/playlist|\/sets\//.test(url);
}

/**
 * تنسيق المدة
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * تنسيق حجم الملف
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * تنسيق العدد
 */
export function formatNumber(num: number): string {
  if (!num) return '0';
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}
