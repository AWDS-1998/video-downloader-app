/**
 * Download Manager - مدير التحميل
 * يستخدم السيرفر للتحميل + WebSocket لمتابعة التقدم
 * عند الاكتمال يحفظ الملف في الجوال
 */

import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import api from './api';
import wsService from './websocket';

// أنواع البيانات
export interface DownloadTask {
  id: string;
  title: string;
  url: string;
  filename: string;
  filesize: number;
  quality: string;
  type: 'video' | 'audio';
  status: 'pending' | 'starting' | 'downloading' | 'saving' | 'completed' | 'error' | 'cancelled';
  progress: number;           // 0-100
  downloadedBytes: number;
  speed: number;              // bytes/sec
  speedText: string;
  eta: string;
  error?: string;
  localPath?: string;
  thumbnail?: string;
  startedAt: number;
  serverDownloadId?: string;  // ID التحميل على السيرفر
}

type ProgressCallback = (task: DownloadTask) => void;

class DownloadManagerClass {
  private tasks: Map<string, DownloadTask> = new Map();
  private progressCallbacks: Set<ProgressCallback> = new Set();
  private wsUnsub: (() => void) | null = null;

  constructor() {
    this.setupWebSocket();
  }

  /**
   * ربط WebSocket لاستقبال تحديثات التقدم من السيرفر
   */
  private setupWebSocket() {
    // الاتصال بالسيرفر
    wsService.connect();

    // الاستماع لتحديثات التقدم
    this.wsUnsub = wsService.on('progress', (data: any) => {
      // البحث عن المهمة المطابقة
      for (const [taskId, task] of this.tasks) {
        if (task.serverDownloadId === data.id) {
          task.progress = data.progress || 0;
          task.speedText = data.speed || '';
          task.eta = data.eta || '';
          task.filename = data.filename || task.filename;

          if (data.status === 'completed') {
            task.status = 'saving';
            this.notifyProgress(task);
            // تحميل الملف من السيرفر إلى الجوال
            this.saveFileToPhone(task, data);
          } else if (data.status === 'error') {
            task.status = 'error';
            task.error = data.error || 'فشل التحميل';
            this.notifyProgress(task);
          } else {
            task.status = 'downloading';
            this.notifyProgress(task);
          }
          break;
        }
      }
    });
  }

  /**
   * الاشتراك في تحديثات التقدم
   */
  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  private notifyProgress(task: DownloadTask) {
    this.progressCallbacks.forEach(cb => {
      try { cb({ ...task }); } catch (e) { console.error('[DM] Callback error:', e); }
    });
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
    const taskId = `dl_${Date.now()}`;

    const task: DownloadTask = {
      id: taskId,
      title: options.title,
      url: options.url,
      filename: '',
      filesize: 0,
      quality: options.quality || 'best',
      type: options.type || 'video',
      status: 'starting',
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
      // بدء التحميل على السيرفر
      const response = await api.startDownload({
        url: options.url,
        type: options.type || 'video',
        quality: options.quality || 'best',
        audioQuality: options.type === 'audio' ? (options.quality || '192') : undefined,
        subtitleLang: null,
        cookies: null,
        isPlaylist: false,
        playlistItems: null,
      });

      task.serverDownloadId = response.id;
      task.status = 'downloading';
      this.notifyProgress(task);

      return taskId;
    } catch (error: any) {
      task.status = 'error';
      task.error = error.message || 'فشل بدء التحميل';
      this.notifyProgress(task);
      throw error;
    }
  }

  /**
   * حفظ الملف من السيرفر إلى الجوال
   */
  private async saveFileToPhone(task: DownloadTask, data: any) {
    try {
      if (!data.files || data.files.length === 0) {
        task.status = 'completed';
        task.progress = 100;
        this.notifyProgress(task);
        return;
      }

      const file = data.files[0];
      const fileUrl = api.getFileUrl(task.serverDownloadId!, file.name);
      const localUri = FileSystem.documentDirectory + file.name;

      task.status = 'saving';
      this.notifyProgress(task);

      // تحميل الملف من السيرفر إلى التخزين المحلي
      const download = await FileSystem.downloadAsync(fileUrl, localUri);

      if (download.uri) {
        task.localPath = download.uri;

        // حفظ في المعرض
        try {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status === 'granted') {
            await MediaLibrary.saveToLibraryAsync(download.uri);
          }
        } catch (e) {
          console.warn('[DM] Gallery save failed:', e);
        }
      }

      task.status = 'completed';
      task.progress = 100;
      task.speedText = '';
      task.eta = '';
      this.notifyProgress(task);
    } catch (error: any) {
      task.status = 'error';
      task.error = 'فشل حفظ الملف: ' + (error.message || '');
      this.notifyProgress(task);
    }
  }

  /**
   * إلغاء التحميل
   */
  async cancelDownload(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // إلغاء على السيرفر
    if (task.serverDownloadId) {
      try {
        await api.cancelDownload(task.serverDownloadId);
      } catch (e) { /* ignore */ }
    }

    task.status = 'cancelled';
    this.notifyProgress(task);
  }

  /**
   * جلب مهمة
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
   * حذف مهمة
   */
  removeTask(taskId: string): void {
    this.tasks.delete(taskId);
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

export const downloadManager = new DownloadManagerClass();
export const DownloadManager = DownloadManagerClass;
export default downloadManager;
