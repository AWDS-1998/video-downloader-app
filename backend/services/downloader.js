/**
 * Downloader Service - yt-dlp Wrapper
 * المرجع: build_ytdlp_command() L464-524, run_ytdlp_with_logging() L529-576
 * يقوم ببناء وتنفيذ أوامر yt-dlp
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { logInfo, logWarn, logError, logSuccess, createTaskLog, appendToTaskLog } = require('./logger');

const DOWNLOADS_DIR = path.join(__dirname, '..', 'downloads');
const COOKIES_FILE = path.join(__dirname, '..', 'cookies.txt');

if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

// تخزين التحميلات النشطة
const activeDownloads = new Map();

/**
 * فحص المتطلبات
 * المرجع: check_requirements() L170-204
 */
async function checkRequirements() {
  const results = { ytdlp: false, ffmpeg: false };

  try {
    const { execSync } = require('child_process');
    execSync('yt-dlp --version', { stdio: 'pipe' });
    results.ytdlp = true;
  } catch (e) { /* not installed */ }

  try {
    const { execSync } = require('child_process');
    execSync('ffmpeg -version', { stdio: 'pipe' });
    results.ffmpeg = true;
  } catch (e) { /* not installed */ }

  return results;
}

/**
 * جلب معلومات الفيديو
 * المرجع: yt-dlp --get-title L751-756
 */
function getVideoInfo(url, cookies = null) {
  return new Promise((resolve, reject) => {
    const args = [
      '--dump-json',
      '--no-warnings',
      '--no-playlist',
      '--no-download',
      '--remote-components', 'ejs:github',
    ];

    // استخدام ملف الكوكيز المحلي تلقائياً
    if (fs.existsSync(COOKIES_FILE)) {
      args.push('--cookies', COOKIES_FILE);
    } else if (cookies) {
      args.push('--cookies-from-browser', cookies);
    }

    args.push(url);

    logInfo(`Getting video info: ${url}`);
    const proc = spawn('yt-dlp', args);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        logError(`Failed to get video info: ${stderr}`);
        reject(new Error(stderr || 'Failed to get video info'));
        return;
      }

      try {
        const info = JSON.parse(stdout);
        const result = {
          id: info.id,
          title: info.title || 'Unknown',
          description: info.description || '',
          thumbnail: info.thumbnail || '',
          duration: info.duration || 0,
          durationString: info.duration_string || '0:00',
          uploader: info.uploader || info.channel || 'Unknown',
          uploadDate: info.upload_date || '',
          viewCount: info.view_count || 0,
          likeCount: info.like_count || 0,
          extractor: info.extractor || 'unknown',
          url: info.webpage_url || url,
          filesize: info.filesize_approx || info.filesize || 0,
          formats: (info.formats || [])
            .filter(f => f.vcodec !== 'none' || f.acodec !== 'none')
            .map(f => ({
              formatId: f.format_id,
              ext: f.ext,
              resolution: f.resolution || `${f.width || '?'}x${f.height || '?'}`,
              height: f.height || 0,
              fps: f.fps || 0,
              filesize: f.filesize || f.filesize_approx || 0,
              vcodec: f.vcodec,
              acodec: f.acodec,
              isAudioOnly: f.vcodec === 'none',
              isVideoOnly: f.acodec === 'none',
              note: f.format_note || '',
            })),
          subtitles: Object.keys(info.subtitles || {}),
          automaticCaptions: Object.keys(info.automatic_captions || {}).slice(0, 30),
        };

        logSuccess(`Video info fetched: ${result.title}`);
        resolve(result);
      } catch (e) {
        logError(`Failed to parse video info: ${e.message}`);
        reject(new Error('Failed to parse video info'));
      }
    });

    proc.on('error', (err) => {
      logError(`yt-dlp process error: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * جلب معلومات قائمة التشغيل
 * المرجع: mode_playlist() L833-849
 */
function getPlaylistInfo(url, cookies = null) {
  return new Promise((resolve, reject) => {
    const args = [
      '--flat-playlist',
      '--dump-json',
      '--no-warnings',
      '--yes-playlist',
      '--remote-components', 'ejs:github',
    ];

    // استخدام ملف الكوكيز المحلي تلقائياً
    if (fs.existsSync(COOKIES_FILE)) {
      args.push('--cookies', COOKIES_FILE);
    } else if (cookies) {
      args.push('--cookies-from-browser', cookies);
    }

    args.push(url);

    logInfo(`Getting playlist info: ${url}`);
    const proc = spawn('yt-dlp', args);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        logError(`Failed to get playlist info: ${stderr}`);
        reject(new Error(stderr || 'Failed to get playlist info'));
        return;
      }

      try {
        const lines = stdout.trim().split('\n').filter(l => l.trim());
        const entries = lines.map(l => JSON.parse(l));

        if (entries.length === 0) {
          reject(new Error('Empty playlist'));
          return;
        }

        const firstEntry = entries[0];
        const result = {
          title: firstEntry.playlist_title || firstEntry.playlist || 'Playlist',
          count: entries.length,
          uploader: firstEntry.playlist_uploader || firstEntry.uploader || 'Unknown',
          entries: entries.map((e, i) => ({
            index: i + 1,
            id: e.id,
            title: e.title || `Video ${i + 1}`,
            duration: e.duration || 0,
            url: e.url || e.webpage_url || '',
          })),
        };

        logSuccess(`Playlist info: ${result.title} (${result.count} videos)`);
        resolve(result);
      } catch (e) {
        logError(`Failed to parse playlist info: ${e.message}`);
        reject(new Error('Failed to parse playlist info'));
      }
    });

    proc.on('error', (err) => {
      logError(`yt-dlp process error: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * بناء أمر yt-dlp وتنفيذ التحميل
 * المرجع: build_ytdlp_command() L464-524
 */
function startDownload(downloadId, options, onProgress) {
  const {
    url,
    type = 'video',       // 'video' | 'audio'
    quality = 'best',     // format code or height
    audioQuality = '192', // MP3 kbps
    subtitleLang = null,
    cookies = null,
    isPlaylist = false,
    playlistItems = null,
  } = options;

  // إعداد مجلد التحميل
  const downloadPath = path.join(DOWNLOADS_DIR, downloadId);
  fs.mkdirSync(downloadPath, { recursive: true });

  // إنشاء سجل المهمة - المرجع: run_ytdlp_with_logging() L536-557
  const { taskId, taskLogPath } = createTaskLog({
    platform: options.platform || 'Unknown',
    type: type === 'video' ? `Video (${quality})` : `Audio MP3 (${audioQuality} kbps)`,
    quality: type === 'video' ? quality : `${audioQuality} kbps`,
    subtitles: subtitleLang || 'none',
    url,
  });

  // بناء الأمر - المرجع: build_ytdlp_command() L469-523
  const outputTemplate = isPlaylist
    ? `${downloadPath}/%(playlist_index)03d - %(title)s.%(ext)s`
    : `${downloadPath}/%(title)s.%(ext)s`;

  const args = [
    '--newline',
    '--progress',
    '--no-warnings',
    '--ignore-errors',
    '--no-abort-on-error',
    '--retries', '10',
    '--fragment-retries', '10',
    '--retry-sleep', '5',
    '--remote-components', 'ejs:github',
    '-o', outputTemplate,
  ];

  // تجاوز قيود YouTube - المرجع: L482-487
  if (options.platform === 'YouTube') {
    args.push(
      '--extractor-args', 'youtube:player_client=default,web_safari,mweb',
      '--user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
    );
  }

  // كوكيز - المرجع: L489-491
  if (fs.existsSync(COOKIES_FILE)) {
    args.push('--cookies', COOKIES_FILE);
  } else if (cookies) {
    args.push('--cookies-from-browser', cookies);
  }

  // نوع التحميل - المرجع: L493-510
  if (type === 'audio') {
    args.push(
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', audioQuality,
      '--embed-thumbnail',
      '--add-metadata'
    );
  } else {
    if (quality === 'best' || !quality) {
      args.push('-f', 'bestvideo+bestaudio/best', '--merge-output-format', 'mp4');
    } else if (/^\d+$/.test(quality) && parseInt(quality) >= 144 && parseInt(quality) <= 4320) {
      args.push('-f', `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]`, '--merge-output-format', 'mp4');
    } else {
      args.push('-f', `${quality}+bestaudio/${quality}/best`, '--merge-output-format', 'mp4');
    }
  }

  // ترجمة - المرجع: L512-519
  if (subtitleLang) {
    args.push(
      '--write-subs',
      '--write-auto-subs',
      '--sub-langs', subtitleLang,
      '--convert-subs', 'srt'
    );
  }

  // قائمة تشغيل - المرجع: L895-896
  if (isPlaylist) {
    args.push('--yes-playlist');
    if (playlistItems) {
      args.push('--playlist-items', playlistItems);
    }
  } else {
    args.push('--no-playlist');
  }

  args.push(url);

  logInfo(`Starting download [${downloadId}]: ${args.join(' ')}`);
  appendToTaskLog(taskLogPath, `Command: yt-dlp ${args.join(' ')}\n`);

  const proc = spawn('yt-dlp', args);

  const downloadInfo = {
    id: downloadId,
    url,
    type,
    quality: type === 'video' ? quality : `${audioQuality}kbps`,
    status: 'downloading',
    progress: 0,
    speed: '',
    eta: '',
    filename: '',
    totalSize: '',
    downloadedSize: '',
    process: proc,
    taskLogPath,
    startedAt: new Date(),
    downloadPath,
  };

  activeDownloads.set(downloadId, downloadInfo);

  proc.stdout.on('data', (data) => {
    const output = data.toString();
    appendToTaskLog(taskLogPath, output);

    // تحليل شريط التقدم
    const progressMatch = output.match(/(\d+\.?\d*)%/);
    const speedMatch = output.match(/at\s+(\S+)/);
    const etaMatch = output.match(/ETA\s+(\S+)/);
    const sizeMatch = output.match(/of\s+~?\s*(\S+)/);
    const downloadedMatch = output.match(/(\d+\.?\d*\s*[KMG]iB)/);
    const destMatch = output.match(/Destination:\s*(.+)/);
    const mergeMatch = output.match(/Merging formats into "(.+)"/);

    if (progressMatch) {
      downloadInfo.progress = parseFloat(progressMatch[1]);
    }
    if (speedMatch) downloadInfo.speed = speedMatch[1];
    if (etaMatch) downloadInfo.eta = etaMatch[1];
    if (sizeMatch) downloadInfo.totalSize = sizeMatch[1];
    if (downloadedMatch) downloadInfo.downloadedSize = downloadedMatch[1];
    if (destMatch) downloadInfo.filename = path.basename(destMatch[1].trim());
    if (mergeMatch) downloadInfo.filename = path.basename(mergeMatch[1].trim());

    if (onProgress) {
      onProgress({
        id: downloadId,
        status: 'downloading',
        progress: downloadInfo.progress,
        speed: downloadInfo.speed,
        eta: downloadInfo.eta,
        filename: downloadInfo.filename,
        totalSize: downloadInfo.totalSize,
      });
    }
  });

  proc.stderr.on('data', (data) => {
    const output = data.toString();
    appendToTaskLog(taskLogPath, `[STDERR] ${output}`);
    logWarn(`Download [${downloadId}] stderr: ${output.trim()}`);
  });

  return new Promise((resolve) => {
    proc.on('close', (code) => {
      downloadInfo.status = code === 0 ? 'completed' : 'error';
      downloadInfo.progress = code === 0 ? 100 : downloadInfo.progress;
      downloadInfo.completedAt = new Date();

      appendToTaskLog(taskLogPath, `\n================================================================\n  Exit Code: ${code}\n  Finished : ${new Date().toISOString()}\n================================================================`);

      // جمع الملفات المحملة
      const files = [];
      if (fs.existsSync(downloadPath)) {
        const allFiles = fs.readdirSync(downloadPath);
        for (const f of allFiles) {
          const filePath = path.join(downloadPath, f);
          const stats = fs.statSync(filePath);
          files.push({
            name: f,
            path: filePath,
            size: stats.size,
            ext: path.extname(f),
          });
        }
      }

      downloadInfo.files = files;

      if (code === 0) {
        logSuccess(`Download completed [${downloadId}]: ${files.length} files`);
      } else {
        logError(`Download failed [${downloadId}]: exit code ${code}`);
      }

      if (onProgress) {
        onProgress({
          id: downloadId,
          status: downloadInfo.status,
          progress: downloadInfo.progress,
          files,
        });
      }

      resolve({
        id: downloadId,
        status: downloadInfo.status,
        files,
        taskLogPath,
      });
    });

    proc.on('error', (err) => {
      downloadInfo.status = 'error';
      downloadInfo.error = err.message;
      logError(`Download process error [${downloadId}]: ${err.message}`);

      if (onProgress) {
        onProgress({
          id: downloadId,
          status: 'error',
          error: err.message,
        });
      }

      resolve({
        id: downloadId,
        status: 'error',
        error: err.message,
      });
    });
  });
}

/**
 * إلغاء التحميل
 */
function cancelDownload(downloadId) {
  const download = activeDownloads.get(downloadId);
  if (download && download.process) {
    download.process.kill('SIGTERM');
    download.status = 'cancelled';
    logInfo(`Download cancelled [${downloadId}]`);
    return true;
  }
  return false;
}

/**
 * الحصول على حالة التحميل
 */
function getDownloadStatus(downloadId) {
  const download = activeDownloads.get(downloadId);
  if (!download) return null;

  return {
    id: download.id,
    url: download.url,
    type: download.type,
    quality: download.quality,
    status: download.status,
    progress: download.progress,
    speed: download.speed,
    eta: download.eta,
    filename: download.filename,
    totalSize: download.totalSize,
    files: download.files || [],
    startedAt: download.startedAt,
    completedAt: download.completedAt,
  };
}

/**
 * الحصول على كل التحميلات
 */
function getAllDownloads() {
  const downloads = [];
  for (const [id, d] of activeDownloads) {
    downloads.push({
      id,
      url: d.url,
      type: d.type,
      quality: d.quality,
      status: d.status,
      progress: d.progress,
      filename: d.filename,
      startedAt: d.startedAt,
      completedAt: d.completedAt,
      files: d.files || [],
    });
  }
  return downloads.sort((a, b) => b.startedAt - a.startedAt);
}

/**
 * جلب الدقات المتاحة
 * المرجع: choose_format_and_quality() L329-337
 */
function getAvailableFormats(url, cookies = null) {
  return new Promise((resolve, reject) => {
    const args = ['--dump-json', '--no-warnings', '--no-download', '--no-playlist', '--remote-components', 'ejs:github'];
    // استخدام ملف الكوكيز المحلي تلقائياً
    if (fs.existsSync(COOKIES_FILE)) {
      args.push('--cookies', COOKIES_FILE);
    } else if (cookies) {
      args.push('--cookies-from-browser', cookies);
    }
    args.push(url);

    const proc = spawn('yt-dlp', args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || 'Failed to get formats'));
        return;
      }

      try {
        const info = JSON.parse(stdout);
        const videoFormats = [];
        const audioFormats = [];
        const seenHeights = new Set();

        for (const f of (info.formats || [])) {
          if (f.vcodec !== 'none' && f.height && !seenHeights.has(f.height)) {
            seenHeights.add(f.height);
            videoFormats.push({
              formatId: f.format_id,
              height: f.height,
              label: `${f.height}p`,
              fps: f.fps || 30,
              ext: f.ext,
              filesize: f.filesize || f.filesize_approx || 0,
            });
          }
          if (f.vcodec === 'none' && f.acodec !== 'none') {
            audioFormats.push({
              formatId: f.format_id,
              abr: f.abr || 0,
              ext: f.ext,
              filesize: f.filesize || f.filesize_approx || 0,
            });
          }
        }

        videoFormats.sort((a, b) => b.height - a.height);
        audioFormats.sort((a, b) => b.abr - a.abr);

        resolve({ videoFormats, audioFormats });
      } catch (e) {
        reject(new Error('Failed to parse formats'));
      }
    });
  });
}

/**
 * استخراج روابط التحميل المباشرة (بدون تحميل)
 * يرجع URLs مباشرة من CDN للتحميل من الجوال
 */
function extractDirectUrls(url, options = {}) {
  const { quality = 'best', type = 'video' } = options;

  return new Promise((resolve, reject) => {
    const args = [
      '--dump-json',
      '--no-warnings',
      '--no-download',
      '--no-playlist',
      '--remote-components', 'ejs:github',
    ];

    // استخدام ملف الكوكيز المحلي تلقائياً
    if (fs.existsSync(COOKIES_FILE)) {
      args.push('--cookies', COOKIES_FILE);
    }

    // تحديد الصيغة حسب النوع والجودة
    if (type === 'audio') {
      args.push('-f', 'bestaudio');
    } else {
      if (quality === 'best' || !quality) {
        args.push('-f', 'bestvideo+bestaudio/best');
      } else if (/^\d+$/.test(quality) && parseInt(quality) >= 144) {
        args.push('-f', `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]`);
      } else {
        args.push('-f', `${quality}+bestaudio/${quality}/best`);
      }
    }

    args.push(url);

    logInfo(`[Extract] Getting direct URLs: ${url}`);
    const startTime = Date.now();
    const proc = spawn('yt-dlp', args);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      const elapsed = Date.now() - startTime;

      if (code !== 0) {
        logError(`[Extract] Failed: ${stderr}`);
        reject(new Error(stderr || 'Failed to extract URLs'));
        return;
      }

      try {
        const info = JSON.parse(stdout);

        // استخراج روابط التحميل المباشرة
        const directUrls = [];

        // الرابط الأساسي (المدمج أو الأفضل)
        if (info.url) {
          directUrls.push({
            type: 'combined',
            url: info.url,
            ext: info.ext || 'mp4',
            filesize: info.filesize || info.filesize_approx || 0,
            quality: info.format_note || info.resolution || 'best',
            headers: info.http_headers || {},
          });
        }

        // روابط الفيديو والصوت المنفصلة (adaptive)
        if (info.requested_formats) {
          for (const f of info.requested_formats) {
            directUrls.push({
              type: f.vcodec !== 'none' ? 'video' : 'audio',
              url: f.url,
              ext: f.ext,
              filesize: f.filesize || f.filesize_approx || 0,
              quality: f.format_note || f.resolution || '',
              height: f.height || 0,
              width: f.width || 0,
              bitrate: f.tbr || f.abr || 0,
              codec: f.vcodec !== 'none' ? f.vcodec : f.acodec,
              headers: f.http_headers || {},
            });
          }
        }

        // جلب كل الصيغ المتاحة للاختيار
        const allFormats = (info.formats || [])
          .filter(f => f.url && (f.vcodec !== 'none' || f.acodec !== 'none'))
          .map(f => ({
            itag: f.format_id,
            url: f.url,
            ext: f.ext,
            quality: f.format_note || f.resolution || '',
            height: f.height || 0,
            filesize: f.filesize || f.filesize_approx || 0,
            isVideo: f.vcodec !== 'none',
            isAudio: f.acodec !== 'none' && f.vcodec === 'none',
            isCombined: f.vcodec !== 'none' && f.acodec !== 'none',
            headers: f.http_headers || {},
          }));

        const result = {
          id: info.id,
          title: info.title || 'Unknown',
          thumbnail: info.thumbnail || '',
          duration: info.duration || 0,
          directUrls,
          allFormats,
          _extractedIn: `${elapsed}ms`,
        };

        logSuccess(`[Extract] Got ${directUrls.length} direct URLs in ${elapsed}ms`);
        resolve(result);
      } catch (e) {
        logError(`[Extract] Parse error: ${e.message}`);
        reject(new Error('Failed to parse extracted URLs'));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = {
  checkRequirements,
  getVideoInfo,
  getPlaylistInfo,
  startDownload,
  cancelDownload,
  getDownloadStatus,
  getAllDownloads,
  getAvailableFormats,
  extractDirectUrls,
  DOWNLOADS_DIR,
};
