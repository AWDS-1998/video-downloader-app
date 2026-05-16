/**
 * YouTube InnerTube API - جلب بيانات الفيديو مباشرة
 * بدلاً من تشغيل عملية yt-dlp كاملة (5-30 ثانية)
 * هذا يعيد النتيجة خلال < 1 ثانية
 *
 * هذا هو نفس الأسلوب الذي يستخدمه Snaptube و TubeMate
 */

const https = require('https');
const http = require('http');
const { logInfo, logError } = require('./logger');

// InnerTube API Client configs
const CLIENTS = {
  WEB: {
    clientName: 'WEB',
    clientVersion: '2.20240530.02.00',
    apiKey: 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
  },
  ANDROID: {
    clientName: 'ANDROID',
    clientVersion: '19.09.37',
    apiKey: 'AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w',
    androidSdkVersion: 30,
    userAgent: 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
  },
  IOS: {
    clientName: 'IOS',
    clientVersion: '19.09.3',
    apiKey: 'AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc',
    deviceModel: 'iPhone14,3',
    userAgent: 'com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)',
  },
};

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
 * طلب HTTP/HTTPS بسيط بدون مكتبات خارجية
 */
function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(new Error('Request timeout')); });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

/**
 * جلب بيانات الفيديو عبر InnerTube Player API
 * هذا أسرع بـ 10-50 مرة من yt-dlp
 */
async function getVideoInfoFast(videoId) {
  const client = CLIENTS.ANDROID;

  const body = {
    videoId,
    context: {
      client: {
        clientName: client.clientName,
        clientVersion: client.clientVersion,
        androidSdkVersion: client.androidSdkVersion,
        hl: 'ar',
        gl: 'SA',
      },
    },
    contentCheckOk: true,
    racyCheckOk: true,
  };

  const url = `https://www.youtube.com/youtubei/v1/player?key=${client.apiKey}&prettyPrint=false`;

  logInfo(`[InnerTube] Fetching video info for: ${videoId}`);
  const startTime = Date.now();

  try {
    const data = await fetchJSON(url, {
      body,
      headers: {
        'User-Agent': client.userAgent,
        'X-YouTube-Client-Name': '3', // ANDROID
        'X-YouTube-Client-Version': client.clientVersion,
      },
    });

    const elapsed = Date.now() - startTime;
    logInfo(`[InnerTube] Got response in ${elapsed}ms`);

    if (data.playabilityStatus && data.playabilityStatus.status !== 'OK') {
      const reason = data.playabilityStatus.reason || data.playabilityStatus.status;
      throw new Error(`Video unavailable: ${reason}`);
    }

    const videoDetails = data.videoDetails || {};
    const streamingData = data.streamingData || {};

    // استخراج الصيغ المتاحة
    const formats = [];
    const allFormats = [
      ...(streamingData.formats || []),
      ...(streamingData.adaptiveFormats || []),
    ];

    for (const f of allFormats) {
      const isVideo = f.mimeType && f.mimeType.startsWith('video/');
      const isAudio = f.mimeType && f.mimeType.startsWith('audio/');

      formats.push({
        formatId: String(f.itag),
        ext: isVideo ? 'mp4' : (isAudio ? 'webm' : 'mp4'),
        resolution: f.qualityLabel || (isAudio ? 'audio only' : 'unknown'),
        height: f.height || 0,
        width: f.width || 0,
        fps: f.fps || 0,
        filesize: parseInt(f.contentLength || '0'),
        vcodec: isVideo ? (f.mimeType || '').split(';')[0] : 'none',
        acodec: isAudio ? (f.mimeType || '').split(';')[0] : (f.audioQuality ? 'yes' : 'none'),
        isAudioOnly: isAudio && !isVideo,
        isVideoOnly: isVideo && (!f.audioQuality),
        note: f.qualityLabel || f.quality || '',
        // رابط التحميل المباشر (هذا هو السر!)
        url: f.url || null,
        bitrate: f.bitrate || 0,
        audioQuality: f.audioQuality || null,
      });
    }

    const result = {
      id: videoDetails.videoId || videoId,
      title: videoDetails.title || 'Unknown',
      description: (videoDetails.shortDescription || '').substring(0, 500),
      thumbnail: videoDetails.thumbnail?.thumbnails?.pop()?.url || '',
      duration: parseInt(videoDetails.lengthSeconds || '0'),
      durationString: formatDuration(parseInt(videoDetails.lengthSeconds || '0')),
      uploader: videoDetails.author || 'Unknown',
      channelId: videoDetails.channelId || '',
      uploadDate: '',
      viewCount: parseInt(videoDetails.viewCount || '0'),
      likeCount: 0,
      extractor: 'youtube',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      filesize: 0,
      formats,
      subtitles: [],
      automaticCaptions: [],
      // البيانات الإضافية للتحميل المباشر
      streamingData: {
        expiresInSeconds: streamingData.expiresInSeconds || '21540',
        formats: (streamingData.formats || []).map(f => ({
          itag: f.itag,
          url: f.url,
          mimeType: f.mimeType,
          qualityLabel: f.qualityLabel,
          contentLength: f.contentLength,
        })),
        adaptiveFormats: (streamingData.adaptiveFormats || []).map(f => ({
          itag: f.itag,
          url: f.url,
          mimeType: f.mimeType,
          qualityLabel: f.qualityLabel || null,
          contentLength: f.contentLength,
          bitrate: f.bitrate,
          audioQuality: f.audioQuality || null,
        })),
      },
      _fetchedIn: `${elapsed}ms`,
      _source: 'innertube',
    };

    return result;
  } catch (error) {
    logError(`[InnerTube] Failed: ${error.message}`);
    throw error;
  }
}

/**
 * تحويل الثواني إلى صيغة HH:MM:SS
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
 * فحص هل الرابط يوتيوب
 */
function isYouTubeUrl(url) {
  return /youtube\.com|youtu\.be/i.test(url);
}

module.exports = {
  extractVideoId,
  getVideoInfoFast,
  isYouTubeUrl,
};
