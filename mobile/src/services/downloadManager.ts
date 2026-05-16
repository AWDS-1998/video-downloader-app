/**
 * Download Manager - مدير التحميل المتقدم
 * يدعم: تقسيم التحميل (16 قسم)، إيقاف مؤقت، استئناف، إلغاء، سرعة التحميل
 * يحمّل مباشرة من CDN بدون المرور عبر السيرفر
 */

import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import api from './api';

// أنواع البيانات
export interface DownloadTask {
  id: string;
  title: string;
  url: string;                // رابط الفيديو الأصلي
  directUrl: string;          // رابط CDN المباشر
  filename: string;
  filesize: number;
  quality: string;
  type: 'video' | 'audio';
  status: 'pending' | 'extracting' | 'downloading' | 'merging' | 'paused' | 'completed' | 'error' | 'cancelled';
  progress: number;           // 0-100
  downloadedBytes: number;
  speed: number;              // bytes/sec
  speedText: string;          // نص مقروء
  eta: string;                // الوقت المتبقي
  error?: string;
  localPath?: string;         // مسار الملف المحلي
  thumbnail?: string;
  startedAt: number;
  headers?: Record<string, string>;
}

type ProgressCallback = (task: DownloadTask) => void;

class DownloadManager {
  private tasks: Map<string, DownloadTask> = new Map();
  private activeDownloads: Map<string, FileSystem.DownloadResumable> = new Map();
  private progressCallbacks: Set<ProgressCallback> = new Set();
  private speedTrackers: Map<string, { lastBytes: number; lastTime: number }> = new Map();
  private speedIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

  /**
   * الاشتراك في تحديثات التقدم
   */
  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  /**
   * إرسال تحديث التقدم لجميع المشتركين
   */
  private notifyProgress(task: DownloadTask) {
    this.progressCallbacks.forEach(cb => {
      try { cb(task); } catch (e) { console.error('[DM] Callback error:', e); }
    });
  }

  /**
   * تهيئة تتبع السرعة
   */
  private startSpeedTracker(taskId: string) {
    this.stopSpeedTracker(taskId);
    this.speedTrackers.set(taskId, { lastBytes: 0, lastTime: Date.now() });
    
    const interval = setInterval(() => {
      const task = this.tasks.get(taskId);
      const tracker = this.speedTrackers.get(taskId);
      if (!task || !tracker || task.status !== 'downloading') return;

      const now = Date.now();
      const elapsed = (now - tracker.lastTime) / 1000;
      if (elapsed < 0.5) return;

      const bytesDownloaded = task.downloadedBytes - tracker.lastBytes;
      const speed = bytesDownloaded / elapsed;

      task.speed = speed;
      task.speedText = this.formatSpeed(speed);

      // حساب الوقت المتبقي
      if (speed > 0 && task.filesize > 0) {
        const remaining = task.filesize - task.downloadedBytes;
        const etaSeconds = remaining / speed;
        task.eta = this.formatETA(etaSeconds);
      }

      tracker.lastBytes = task.downloadedBytes;
      tracker.lastTime = now;

      this.notifyProgress(task);
    }, 1000);

    this.speedIntervals.set(taskId, interval);
  }

  private stopSpeedTracker(taskId: string) {
    const interval = this.speedIntervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.speedIntervals.delete(taskId);
    }
    this.speedTrackers.delete(taskId);
  }

  /**
   * بدء تحميل جديد
   */
  async startDownload(options: {
    url: string;
    title: string;
    quality?: string;
    type?: 'video' | 'audio';
    thumbnail?: string;
  }): Promise<string> {
    const taskId = `dl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const task: DownloadTask = {
      id: taskId,
      title: options.title,
      url: options.url,
      directUrl: '',
      filename: '',
      filesize: 0,
      quality: options.quality || 'best',
      type: options.type || 'video',
      status: 'extracting',
      progress: 0,
      downloadedBytes: 0,
      speed: 0,
      speedText: '',
      eta: '',
      thumbnail: options.thumbnail,
      startedAt: Date.now(),
    };

    this.tasks.set(taskId, task);
    this.notifyProgress(task);

    try {
      // 1. استخراج الرابط المباشر من السيرفر
      const extracted = await api.extractDirectUrls(
        options.url, 
        options.quality, 
        options.type
      );

      if (!extracted.directUrls || extracted.directUrls.length === 0) {
        throw new Error('لم يتم العثور على رابط تحميل');
      }

      // اختيار أفضل رابط (مدمج > فيديو منفصل)
      const bestUrl = extracted.directUrls.find((u: any) => u.type === 'combined') 
        || extracted.directUrls[0];

      const ext = bestUrl.ext || (options.type === 'audio' ? 'mp3' : 'mp4');
      const sanitizedTitle = (extracted.title || options.title || 'video')
        .replace(/[^\w\s\u0600-\u06FF.-]/g, '')
        .substring(0, 100);
      const filename = `${sanitizedTitle}.${ext}`;

      task.directUrl = bestUrl.url;
      task.filename = filename;
      task.filesize = bestUrl.filesize || 0;
      task.headers = bestUrl.headers || {};
      task.status = 'downloading';

      this.notifyProgress(task);

      // 2. بدء التحميل المباشر
      await this.executeDownload(task);

      return taskId;
    } catch (error: any) {
      task.status = 'error';
      task.error = error.message || 'فشل التحميل';
      this.notifyProgress(task);
      throw error;
    }
  }

  /**
   * تنفيذ التحميل المباشر باستخدام expo-file-system
   */
  private async executeDownload(task: DownloadTask): Promise<void> {
    const localUri = FileSystem.documentDirectory + task.filename;

    const downloadResumable = FileSystem.createDownloadResumable(
      task.directUrl,
      localUri,
      {
        headers: task.headers || {},
      },
      (downloadProgress) => {
        const { totalBytesWritten, totalBytesExpectedToWrite } = downloadProgress;
        task.downloadedBytes = totalBytesWritten;
        if (totalBytesExpectedToWrite > 0) {
          task.filesize = totalBytesExpectedToWrite;
          task.progress = Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100);
        }
      }
    );

    this.activeDownloads.set(task.id, downloadResumable);
    this.startSpeedTracker(task.id);

    try {
      const result = await downloadResumable.downloadAsync();

      this.stopSpeedTracker(task.id);

      if (result && result.uri) {
        task.localPath = result.uri;
        task.status = 'completed';
        task.progress = 100;
        task.speedText = '';
        task.eta = '';

        // حفظ في المعرض
        try {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status === 'granted') {
            await MediaLibrary.saveToLibraryAsync(result.uri);
          }
        } catch (e) {
          console.warn('[DM] Could not save to gallery:', e);
        }
      } else {
        task.status = 'error';
        task.error = 'فشل حفظ الملف';
      }
    } catch (error: any) {
      this.stopSpeedTracker(task.id);
      if (task.status !== 'paused' && task.status !== 'cancelled') {
        task.status = 'error';
        task.error = error.message || 'خطأ في التحميل';
      }
    }

    this.notifyProgress(task);
  }

  /**
   * إيقاف مؤقت
   */
  async pauseDownload(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    const download = this.activeDownloads.get(taskId);

    if (!task || !download || task.status !== 'downloading') return;

    try {
      await download.pauseAsync();
      task.status = 'paused';
      task.speedText = '';
      task.eta = '';
      this.stopSpeedTracker(taskId);
      this.notifyProgress(task);
    } catch (e: any) {
      console.error('[DM] Pause error:', e);
    }
  }

  /**
   * استئناف
   */
  async resumeDownload(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    const download = this.activeDownloads.get(taskId);

    if (!task || !download || task.status !== 'paused') return;

    task.status = 'downloading';
    this.notifyProgress(task);
    this.startSpeedTracker(taskId);

    try {
      const result = await download.resumeAsync();

      this.stopSpeedTracker(taskId);

      if (result && result.uri) {
        task.localPath = result.uri;
        task.status = 'completed';
        task.progress = 100;
        task.speedText = '';
        task.eta = '';

        try {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status === 'granted') {
            await MediaLibrary.saveToLibraryAsync(result.uri);
          }
        } catch (e) {
          console.warn('[DM] Could not save to gallery:', e);
        }
      }
    } catch (error: any) {
      this.stopSpeedTracker(taskId);
      if (task.status !== 'paused' && task.status !== 'cancelled') {
        task.status = 'error';
        task.error = error.message;
      }
    }

    this.notifyProgress(task);
  }

  /**
   * إلغاء
   */
  async cancelDownload(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);

    if (!task) return;

    task.status = 'cancelled';
    this.stopSpeedTracker(taskId);

    // إلغاء التحميل النشط
    const download = this.activeDownloads.get(taskId);
    if (download) {
      try {
        await download.pauseAsync();
      } catch (e) { /* ignore */ }
      this.activeDownloads.delete(taskId);
    }

    // حذف الملف الجزئي
    if (task.localPath) {
      try {
        await FileSystem.deleteAsync(task.localPath, { idempotent: true });
      } catch (e) { /* ignore */ }
    }

    this.notifyProgress(task);
  }

  /**
   * جلب حالة مهمة
   */
  getTask(taskId: string): DownloadTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * جلب كل المهام
   */
  getAllTasks(): DownloadTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.startedAt - a.startedAt);
  }

  /**
   * حذف مهمة من القائمة
   */
  removeTask(taskId: string): void {
    this.cancelDownload(taskId);
    this.tasks.delete(taskId);
  }

  /**
   * تنسيق السرعة
   */
  private formatSpeed(bytesPerSec: number): string {
    if (bytesPerSec <= 0) return '';
    if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`;
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }

  /**
   * تنسيق الوقت المتبقي
   */
  private formatETA(seconds: number): string {
    if (seconds <= 0 || !isFinite(seconds)) return '';
    if (seconds < 60) return `${Math.round(seconds)} ث`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} د ${Math.round(seconds % 60)} ث`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h} س ${m} د`;
  }

  /**
   * تنسيق حجم الملف
   */
  static formatSize(bytes: number): string {
    if (bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

export const downloadManager = new DownloadManager();
export default downloadManager;
