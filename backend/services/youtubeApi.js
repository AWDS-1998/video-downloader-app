/**
 * YouTube Data API v3 Service
 * جلب بيانات الفيديو بسرعة فائقة (< 0.5 ثانية)
 * يُستخدم بدلاً من yt-dlp لجلب المعلومات فقط
 */

const https = require('https');
const { logInfo, logError, logSuccess } = require('./logger');

// المفتاح يُحمّل من متغير البيئة
const API_KEY = process.env.YOUTUBE_API_KEY || '';

/**
 * استخراج Video ID من أي رابط يوتيوب
 */
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/**
 * فحص هل الرابط يوتيوب
 */
function isYouTubeUrl(url) {
  return /youtube\.com|youtu\.be/i.test(url);
}

/**
 * هل المفتاح مُعد؟
 */
function isConfigured() {
  return API_KEY && API_KEY.length > 10;
}

/**
 * طلب HTTPS GET بسيط
 */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * جلب بيانات فيديو واحد عبر YouTube Data API
 * تكلفة: 1 وحدة من الكوتا
 * سرعة: < 0.5 ثانية
 */
async function getVideoInfo(videoId) {
  if (!isConfigured()) {
    throw new Error('YouTube API Key not configured');
  }

  const startTime = Date.now();
  const url = `https://www.googleapis.com/youtube/v3/videos?` +
    `part=snippet,contentDetails,statistics` +
    `&id=${videoId}` +
    `&key=${API_KEY}`;

  logInfo(`[YouTube API] Fetching video: ${videoId}`);

  try {
    const data = await httpsGet(url);

    if (data.error) {
      throw new Error(data.error.message || 'YouTube API error');
    }

    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found');
    }

    const video = data.items[0];
    const snippet = video.snippet || {};
    const contentDetails = video.contentDetails || {};
    const statistics = video.statistics || {};

    // تحويل مدة ISO 8601 إلى ثواني
    const duration = parseDuration(contentDetails.duration || 'PT0S');

    // اختيار أفضل صورة مصغرة
    const thumbnails = snippet.thumbnails || {};
    const thumbnail = (thumbnails.maxres || thumbnails.high || thumbnails.medium || thumbnails.default || {}).url || '';

    const elapsed = Date.now() - startTime;

    const result = {
      id: videoId,
      title: snippet.title || 'Unknown',
      description: (snippet.description || '').substring(0, 500),
      thumbnail,
      duration,
      durationString: formatDuration(duration),
      uploader: snippet.channelTitle || 'Unknown',
      channelId: snippet.channelId || '',
      uploadDate: snippet.publishedAt || '',
      viewCount: parseInt(statistics.viewCount || '0'),
      likeCount: parseInt(statistics.likeCount || '0'),
      commentCount: parseInt(statistics.commentCount || '0'),
      extractor: 'youtube',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      filesize: 0,
      // الجودات الافتراضية (القائمة الفعلية تأتي من yt-dlp عند التحميل)
      formats: getDefaultFormats(),
      subtitles: [],
      automaticCaptions: [],
      _fetchedIn: `${elapsed}ms`,
      _source: 'youtube-api',
    };

    logSuccess(`[YouTube API] Got "${result.title}" in ${elapsed}ms`);
    return result;
  } catch (error) {
    logError(`[YouTube API] Failed: ${error.message}`);
    throw error;
  }
}

/**
 * تحويل مدة ISO 8601 (PT1H2M30S) إلى ثواني
 */
function parseDuration(iso) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || '0');
  const m = parseInt(match[2] || '0');
  const s = parseInt(match[3] || '0');
  return h * 3600 + m * 60 + s;
}

/**
 * تحويل ثواني إلى نص مقروء
 */
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * الجودات الافتراضية (تُعرض قبل استخراج الروابط)
 */
function getDefaultFormats() {
  return [
    { formatId: '2160', ext: 'mp4', resolution: '3840x2160', height: 2160, fps: 30, filesize: 0, vcodec: 'avc1', acodec: 'mp4a', isAudioOnly: false, isVideoOnly: false, note: '4K' },
    { formatId: '1080', ext: 'mp4', resolution: '1920x1080', height: 1080, fps: 30, filesize: 0, vcodec: 'avc1', acodec: 'mp4a', isAudioOnly: false, isVideoOnly: false, note: '1080p' },
    { formatId: '720', ext: 'mp4', resolution: '1280x720', height: 720, fps: 30, filesize: 0, vcodec: 'avc1', acodec: 'mp4a', isAudioOnly: false, isVideoOnly: false, note: '720p' },
    { formatId: '480', ext: 'mp4', resolution: '854x480', height: 480, fps: 30, filesize: 0, vcodec: 'avc1', acodec: 'mp4a', isAudioOnly: false, isVideoOnly: false, note: '480p' },
    { formatId: '360', ext: 'mp4', resolution: '640x360', height: 360, fps: 30, filesize: 0, vcodec: 'avc1', acodec: 'mp4a', isAudioOnly: false, isVideoOnly: false, note: '360p' },
    { formatId: 'audio', ext: 'mp3', resolution: 'audio only', height: 0, fps: 0, filesize: 0, vcodec: 'none', acodec: 'mp4a', isAudioOnly: true, isVideoOnly: false, note: 'MP3' },
  ];
}

module.exports = {
  extractVideoId,
  isYouTubeUrl,
  isConfigured,
  getVideoInfo,
};
