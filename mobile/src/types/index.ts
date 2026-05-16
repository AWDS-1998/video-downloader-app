/**
 * TypeScript types for the app
 * مطابقة لهيكل البيانات من السكربت و Backend
 */

// المنصة - المرجع: detect_platform() L123-165
export interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
  supportsSubs: boolean;
  supportsPlaylist: boolean;
  requiresCookies: boolean;
}

// معلومات الفيديو - المرجع: mode_single_video() L750-764
export interface VideoInfo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  durationString: string;
  uploader: string;
  uploadDate: string;
  viewCount: number;
  likeCount: number;
  extractor: string;
  url: string;
  filesize: number;
  formats: VideoFormat[];
  subtitles: string[];
  automaticCaptions: string[];
  platform: Platform;
}

// دقة الفيديو - المرجع: choose_format_and_quality() L341-351
export interface VideoFormat {
  formatId: string;
  ext: string;
  resolution: string;
  height: number;
  fps: number;
  filesize: number;
  vcodec: string;
  acodec: string;
  isAudioOnly: boolean;
  isVideoOnly: boolean;
  note: string;
}

// جودة الصوت - المرجع: L357-383
export interface AudioQuality {
  label: string;
  value: string;
  description: string;
  icon: string;
}

export const AUDIO_QUALITIES: AudioQuality[] = [
  { label: '128 kbps', value: '128', description: 'حجم صغير، جودة عادية', icon: 'podcast' },
  { label: '192 kbps', value: '192', description: 'متوازنة - الأكثر استخداماً', icon: 'musical-notes' },
  { label: '256 kbps', value: '256', description: 'جودة عالية', icon: 'headset' },
  { label: '320 kbps', value: '320', description: 'أعلى جودة', icon: 'musical-note' },
  { label: 'Best', value: '0', description: 'أفضل جودة متاحة', icon: 'star' },
];

// جودات الفيديو الافتراضية - المرجع: L341-351
export const VIDEO_QUALITIES = [
  { label: 'Best', value: 'best', icon: 'sparkles' },
  { label: '4K', value: '2160', icon: 'tv' },
  { label: '1080p', value: '1080', icon: 'desktop' },
  { label: '720p', value: '720', icon: 'tablet-landscape' },
  { label: '480p', value: '480', icon: 'phone-portrait' },
  { label: '360p', value: '360', icon: 'phone-portrait' },
];

// معلومات قائمة التشغيل - المرجع: mode_playlist() L833-849
export interface PlaylistInfo {
  title: string;
  count: number;
  uploader: string;
  entries: PlaylistEntry[];
  platform: Platform;
}

export interface PlaylistEntry {
  index: number;
  id: string;
  title: string;
  duration: number;
  url: string;
}

// خيارات التحميل - المرجع: build_ytdlp_command() L464-524
export interface DownloadOptions {
  url: string;
  type: 'video' | 'audio';
  quality: string;
  audioQuality: string;
  subtitleLang: string | null;
  cookies: string | null;
  isPlaylist: boolean;
  playlistItems: string | null;
}

// حالة التحميل
export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'error' | 'cancelled';

export interface DownloadProgress {
  id: string;
  status: DownloadStatus;
  progress: number;
  speed: string;
  eta: string;
  filename: string;
  totalSize: string;
  error?: string;
  files?: DownloadFile[];
}

export interface DownloadFile {
  name: string;
  path: string;
  size: number;
  ext: string;
}

export interface DownloadItem {
  id: string;
  url: string;
  type: 'video' | 'audio';
  quality: string;
  status: DownloadStatus;
  progress: number;
  filename: string;
  startedAt: string;
  completedAt?: string;
  files: DownloadFile[];
  platform?: Platform;
  videoInfo?: VideoInfo;
}

// السجلات - المرجع: mode_logs_manager() L1051-1137
export interface LogEntry {
  name: string;
  size: number;
  created: string;
  modified: string;
}

// إعدادات التطبيق - المرجع: ask_cookies_option() L242-276
export interface AppSettings {
  defaultQuality: string;
  defaultAudioQuality: string;
  cookiesBrowser: string | null;
  theme: 'dark' | 'light';
  language: 'ar' | 'en';
  serverUrl: string;
}

// الكوكيز - المرجع: ask_cookies_option() L242-276
export const COOKIE_OPTIONS = [
  { label: 'بدون كوكيز', value: null, icon: 'close-circle' },
  { label: 'Chrome', value: 'chrome', icon: 'logo-chrome' },
  { label: 'Firefox', value: 'firefox', icon: 'logo-firefox' },
  { label: 'Safari', value: 'safari', icon: 'compass' },
  { label: 'Edge', value: 'edge', icon: 'logo-edge' },
  { label: 'Brave', value: 'brave', icon: 'shield-checkmark' },
];
