/**
 * Design System - Colors
 * مستوحاة من Snaptube مع Dark theme احترافي
 * المرجع: ألوان السكربت L14-21
 */

export const Colors = {
  // Primary - أزرق بنفسجي مشرق (مستوحى من Snaptube)
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#5A4BD1',
  primaryGlow: 'rgba(108, 92, 231, 0.3)',

  // Accent - برتقالي/ذهبي دافئ
  accent: '#FDCB6E',
  accentLight: '#FFEAA7',
  accentDark: '#F0B429',

  // Success - أخضر
  success: '#00B894',
  successLight: '#55EFC4',
  successDark: '#00A381',

  // Warning - برتقالي
  warning: '#F39C12',
  warningLight: '#FFD166',
  warningDark: '#E67E22',

  // Error - أحمر
  error: '#E17055',
  errorLight: '#FAB1A0',
  errorDark: '#D63031',

  // Info - أزرق فاتح
  info: '#74B9FF',
  infoLight: '#A8D8FF',
  infoDark: '#0984E3',

  // Dark Theme Background
  background: '#0D0D1A',
  backgroundSecondary: '#161629',
  backgroundTertiary: '#1E1E3A',
  surface: '#232340',
  surfaceLight: '#2D2D50',
  surfaceElevated: '#353560',

  // Card backgrounds with glassmorphism
  cardBackground: 'rgba(35, 35, 64, 0.8)',
  cardBorder: 'rgba(108, 92, 231, 0.2)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#B8B8D4',
  textTertiary: '#6C6C8A',
  textDisabled: '#4A4A6A',

  // Borders
  border: '#2A2A4A',
  borderLight: '#3A3A5A',
  borderFocus: '#6C5CE7',

  // Platform Colors - المرجع: detect_platform() L128-161
  platforms: {
    youtube: '#FF0000',
    vimeo: '#1AB7EA',
    tiktok: '#00F2EA',
    twitter: '#1DA1F2',
    instagram: '#E4405F',
    facebook: '#1877F2',
    dailymotion: '#0D47A1',
    twitch: '#9146FF',
    reddit: '#FF4500',
    soundcloud: '#FF5500',
    bilibili: '#00A1D6',
    unknown: '#6B7280',
  } as Record<string, string>,

  // Gradient presets
  gradients: {
    primary: ['#6C5CE7', '#A29BFE'],
    accent: ['#F39C12', '#FDCB6E'],
    success: ['#00B894', '#55EFC4'],
    error: ['#E17055', '#FAB1A0'],
    dark: ['#0D0D1A', '#161629'],
    card: ['rgba(35, 35, 64, 0.9)', 'rgba(30, 30, 58, 0.6)'],
    header: ['#0D0D1A', '#161629', '#1E1E3A'],
    downloadButton: ['#6C5CE7', '#A29BFE', '#6C5CE7'],
    youtube: ['#FF0000', '#CC0000'],
    audioMode: ['#E17055', '#FDCB6E'],
    videoMode: ['#6C5CE7', '#74B9FF'],
  },

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Shimmer/Skeleton
  shimmerBase: '#232340',
  shimmerHighlight: '#2D2D50',
} as const;
