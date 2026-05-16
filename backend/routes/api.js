/**
 * API Routes
 * يربط كل endpoints مع الخدمات (services)
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { detectPlatform, validateUrl, isPlaylistUrl, getAllPlatforms } = require('../services/platformDetector');
const downloader = require('../services/downloader');
const logger = require('../services/logger');

/**
 * GET /api/health - فحص الخادم
 */
router.get('/health', async (req, res) => {
  const requirements = await downloader.checkRequirements();
  res.json({
    status: 'ok',
    requirements,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/platforms - عرض المنصات المدعومة
 * المرجع: show_supported_platforms() L1142-1164
 */
router.get('/platforms', (req, res) => {
  res.json({ platforms: getAllPlatforms() });
});

/**
 * POST /api/detect - كشف المنصة من الرابط
 * المرجع: detect_platform() L123-165
 */
router.post('/detect', (req, res) => {
  const { url } = req.body;

  if (!url || !validateUrl(url)) {
    return res.status(400).json({ error: 'رابط غير صالح' });
  }

  const platform = detectPlatform(url);
  const isPlaylist = isPlaylistUrl(url);

  res.json({ platform, isPlaylist });
});

/**
 * POST /api/info - جلب معلومات الفيديو
 * المرجع: mode_single_video() L750-764
 */
router.post('/info', async (req, res) => {
  const { url, cookies } = req.body;

  if (!url || !validateUrl(url)) {
    return res.status(400).json({ error: 'رابط غير صالح' });
  }

  try {
    const platform = detectPlatform(url);
    const info = await downloader.getVideoInfo(url, cookies);
    res.json({ ...info, platform });
  } catch (err) {
    logger.logError(`API /info error: ${err.message}`);
    res.status(500).json({
      error: 'فشل جلب معلومات الفيديو',
      details: err.message,
      tips: [
        'جرّب استخدام كوكيز المتصفح',
        'تأكد من صحة الرابط',
        'تحقق من الإنترنت أو استخدم VPN',
      ],
    });
  }
});

/**
 * POST /api/playlist/info - معلومات قائمة التشغيل
 * المرجع: mode_playlist() L833-849
 */
router.post('/playlist/info', async (req, res) => {
  const { url, cookies } = req.body;

  if (!url || !validateUrl(url)) {
    return res.status(400).json({ error: 'رابط غير صالح' });
  }

  try {
    const platform = detectPlatform(url);
    const info = await downloader.getPlaylistInfo(url, cookies);
    res.json({ ...info, platform });
  } catch (err) {
    logger.logError(`API /playlist/info error: ${err.message}`);
    res.status(500).json({ error: 'فشل جلب معلومات القائمة', details: err.message });
  }
});

/**
 * POST /api/download - بدء التحميل
 * المرجع: mode_single_video() L778-782, mode_playlist() L895-896
 */
router.post('/download', (req, res) => {
  const { url, type, quality, audioQuality, subtitleLang, cookies, isPlaylist, playlistItems } = req.body;

  if (!url || !validateUrl(url)) {
    return res.status(400).json({ error: 'رابط غير صالح' });
  }

  const downloadId = uuidv4();
  const platform = detectPlatform(url);

  logger.logInfo(`New download request [${downloadId}]: ${url}`);

  // نبدأ التحميل في الخلفية
  downloader.startDownload(downloadId, {
    url,
    type: type || 'video',
    quality: quality || 'best',
    audioQuality: audioQuality || '192',
    subtitleLang,
    cookies,
    isPlaylist: isPlaylist || false,
    playlistItems,
    platform: platform.name,
  }, (progress) => {
    // نرسل التقدم عبر WebSocket (سيتم ربطه في server.js)
    if (global.wsBroadcast) {
      global.wsBroadcast(JSON.stringify({
        type: 'progress',
        data: progress,
      }));
    }
  });

  res.json({
    downloadId,
    status: 'started',
    platform,
    message: 'بدأ التحميل',
  });
});

/**
 * GET /api/download/:id - حالة التحميل
 */
router.get('/download/:id', (req, res) => {
  const status = downloader.getDownloadStatus(req.params.id);
  if (!status) {
    return res.status(404).json({ error: 'التحميل غير موجود' });
  }
  res.json(status);
});

/**
 * POST /api/download/:id/cancel - إلغاء التحميل
 */
router.post('/download/:id/cancel', (req, res) => {
  const success = downloader.cancelDownload(req.params.id);
  res.json({ success, message: success ? 'تم الإلغاء' : 'التحميل غير موجود' });
});

/**
 * GET /api/downloads - كل التحميلات
 * المرجع: mode_logs_manager() L1051-1137
 */
router.get('/downloads', (req, res) => {
  res.json({ downloads: downloader.getAllDownloads() });
});

/**
 * GET /api/formats - الدقات المتاحة
 * المرجع: choose_format_and_quality() L329-337
 */
router.post('/formats', async (req, res) => {
  const { url, cookies } = req.body;

  if (!url || !validateUrl(url)) {
    return res.status(400).json({ error: 'رابط غير صالح' });
  }

  try {
    const formats = await downloader.getAvailableFormats(url, cookies);
    res.json(formats);
  } catch (err) {
    res.status(500).json({ error: 'فشل جلب الدقات', details: err.message });
  }
});

/**
 * GET /api/logs - إدارة السجلات
 * المرجع: mode_logs_manager() L1051-1137
 */
router.get('/logs', (req, res) => {
  res.json({ logs: logger.getLogsList() });
});

router.get('/logs/:filename', (req, res) => {
  const content = logger.getLogContent(req.params.filename);
  if (!content) {
    return res.status(404).json({ error: 'السجل غير موجود' });
  }
  res.json({ content });
});

router.delete('/logs/old', (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const deleted = logger.deleteOldLogs(days);
  res.json({ deleted, message: `تم حذف ${deleted} ملف` });
});

router.delete('/logs/all', (req, res) => {
  const deleted = logger.deleteAllLogs();
  res.json({ deleted, message: `تم حذف ${deleted} ملف` });
});

/**
 * GET /api/download/:id/file/:filename - تحميل الملف
 */
router.get('/download/:id/file/:filename', (req, res) => {
  const status = downloader.getDownloadStatus(req.params.id);
  if (!status) {
    return res.status(404).json({ error: 'التحميل غير موجود' });
  }

  const file = (status.files || []).find(f => f.name === req.params.filename);
  if (!file) {
    return res.status(404).json({ error: 'الملف غير موجود' });
  }

  res.download(file.path, file.name);
});

module.exports = router;
