/**
 * Platform Detector Service
 * المرجع: detect_platform() في youtube_downloader.sh سطر L123-165
 * يكشف المنصة من الرابط ويعيد معلومات المنصة
 */

const PLATFORMS = {
  youtube: {
    name: 'YouTube',
    icon: 'youtube',
    color: '#FF0000',
    patterns: [/youtube\.com/, /youtu\.be/, /youtube-nocookie\.com/],
    supportsSubs: true,
    supportsPlaylist: true,
    requiresCookies: false,
  },
  vimeo: {
    name: 'Vimeo',
    icon: 'vimeo',
    color: '#1AB7EA',
    patterns: [/vimeo\.com/],
    supportsSubs: true,
    supportsPlaylist: true,
    requiresCookies: false,
  },
  tiktok: {
    name: 'TikTok',
    icon: 'tiktok',
    color: '#00F2EA',
    patterns: [/tiktok\.com/],
    supportsSubs: false,
    supportsPlaylist: false,
    requiresCookies: false,
  },
  twitter: {
    name: 'Twitter / X',
    icon: 'twitter',
    color: '#1DA1F2',
    patterns: [/twitter\.com/, /x\.com/],
    supportsSubs: false,
    supportsPlaylist: false,
    requiresCookies: true,
  },
  instagram: {
    name: 'Instagram',
    icon: 'instagram',
    color: '#E4405F',
    patterns: [/instagram\.com/],
    supportsSubs: false,
    supportsPlaylist: false,
    requiresCookies: true,
  },
  facebook: {
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    patterns: [/facebook\.com/, /fb\.watch/],
    supportsSubs: false,
    supportsPlaylist: false,
    requiresCookies: true,
  },
  dailymotion: {
    name: 'Dailymotion',
    icon: 'dailymotion',
    color: '#0D47A1',
    patterns: [/dailymotion\.com/, /dai\.ly/],
    supportsSubs: true,
    supportsPlaylist: true,
    requiresCookies: false,
  },
  twitch: {
    name: 'Twitch',
    icon: 'twitch',
    color: '#9146FF',
    patterns: [/twitch\.tv/],
    supportsSubs: false,
    supportsPlaylist: false,
    requiresCookies: false,
  },
  reddit: {
    name: 'Reddit',
    icon: 'reddit',
    color: '#FF4500',
    patterns: [/reddit\.com/],
    supportsSubs: false,
    supportsPlaylist: false,
    requiresCookies: false,
  },
  soundcloud: {
    name: 'SoundCloud',
    icon: 'soundcloud',
    color: '#FF5500',
    patterns: [/soundcloud\.com/],
    supportsSubs: false,
    supportsPlaylist: true,
    requiresCookies: false,
  },
  bilibili: {
    name: 'Bilibili',
    icon: 'bilibili',
    color: '#00A1D6',
    patterns: [/bilibili\.com/],
    supportsSubs: true,
    supportsPlaylist: true,
    requiresCookies: false,
  },
};

/**
 * كشف المنصة من الرابط
 * @param {string} url - الرابط
 * @returns {object} معلومات المنصة
 */
function detectPlatform(url) {
  for (const [key, platform] of Object.entries(PLATFORMS)) {
    for (const pattern of platform.patterns) {
      if (pattern.test(url)) {
        return { id: key, ...platform };
      }
    }
  }

  return {
    id: 'unknown',
    name: 'Unknown',
    icon: 'globe',
    color: '#6B7280',
    supportsSubs: false,
    supportsPlaylist: false,
    requiresCookies: false,
  };
}

/**
 * التحقق من صحة الرابط
 * المرجع: validate_url() سطر L281-289
 */
function validateUrl(url) {
  return /^https?:\/\/.+/.test(url);
}

/**
 * هل الرابط قائمة تشغيل؟
 * المرجع: is_playlist_url() سطر L291-298
 */
function isPlaylistUrl(url) {
  return /list=|\/playlist|\/sets\//.test(url);
}

function getAllPlatforms() {
  return Object.entries(PLATFORMS).map(([id, p]) => ({
    id,
    name: p.name,
    icon: p.icon,
    color: p.color,
    supportsSubs: p.supportsSubs,
    supportsPlaylist: p.supportsPlaylist,
    requiresCookies: p.requiresCookies,
  }));
}

module.exports = { detectPlatform, validateUrl, isPlaylistUrl, getAllPlatforms };
