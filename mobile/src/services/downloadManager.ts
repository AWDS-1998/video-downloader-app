/**
 * Download Manager - مدير التحميل المحسّن
 * 
 * المسار: السيرفر يستخرج رابط CDN → الجوال يحمّل مباشرة
 * يحل مشكلة حجب IP السيرفر من YouTube
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const HISTORY_KEY = '@download_history';

export interface DownloadTask {
  id: string;
  title: string;
  url: string;
  filename: string;
  filesize: number;
  quality: string;
  type: 'video' | 'audio';
  status: 'pending' | 'extracting' | 'downloading' | 'saving' | 'completed' | 'error' | 'cancelled';
  progress: number;
  downloadedBytes: number;
  speed: number;
  speedText: string;
  eta: string;
  error?: string;
  localPath?: string;
  thumbnail?: string;
  startedAt: number;
}

type ProgressCallback = (task: DownloadTask) => void;

class DownloadManagerClass {
  private tasks: Map<string, DownloadTask> = new Map();
  private progressCallbacks: Set<ProgressCallback> = new Set();
  private activeDownloads: Map<string, FileSystem.DownloadResumable> = new Map();
  private speedTrackers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.loadPersistedTasks();
  }

  private async loadPersistedTasks() {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      if (raw) {
        const saved: DownloadTask[] = JSON.parse(raw);
        for (const task of saved) {
          if (!this.tasks.has(task.id)) {
            this.tasks.set(task.id, task);
          }
        }
      }
    } catch (e) { /* ignore */ }
    this.initialized = true;
  }

  private async persistTasks() {
    try {
      const completed = Array.from(this.tasks.values())
        .filter(t => ['completed', 'error', 'cancelled'].includes(t.status));
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(completed));
    } catch (e) { /* ignore */ }
  }

  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  private notifyProgress(task: DownloadTask) {
    this.progressCallbacks.forEach(cb => {
      try { cb({ ...task }); } catch (e) { /* ignore */ }
    });
    // Auto-persist when task finishes
    if (['completed', 'error', 'cancelled'].includes(task.status)) {
      this.persistTasks();
    }
  }

  /**
   * بدء تحميل جديد
   * 1. يستخرج رابط مباشر من السيرفر (yt-dlp -g)
   * 2. يحمّل مباشرة من YouTube CDN عبر الجوال
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
      // الخطوة 1: استخراج رابط CDN من السيرفر
      const extracted = await api.extractDirectUrls(
        options.url,
        options.quality,
        options.type
      );

      if (!extracted || !extracted.directUrls || extracted.directUrls.length === 0) {
        throw new Error('لم يتم العثور على رابط تحميل صالح لهذه الجودة');
      }

      // البحث عن أفضل رابط مدمج (فيديو + صوت) لتجنب الحاجة لدمجهما على الجوال
      const bestUrl = extracted.directUrls.find((u: any) => u.ext === 'mp4')
        || extracted.directUrls[0];

      const ext = bestUrl.ext || (options.type === 'audio' ? 'm4a' : 'mp4');
      const sanitizedTitle = (extracted.title || options.title || 'video')
        .replace(/[^\w\s\u0600-\u06FF.-]/g, '_')
        .substring(0, 50);
      const filename = `${sanitizedTitle}_${Date.now() % 10000}.${ext}`;

      task.filename = filename;
      task.filesize = bestUrl.filesize || 0;
      task.status = 'downloading';
      this.notifyProgress(task);

      // الخطوة 2: تحميل مباشر من CDN
      await this.downloadFromCDN(task, bestUrl.url, filename, bestUrl.headers || {});

      return taskId;
    } catch (error: any) {
      task.status = 'error';
      task.error = error.message || 'فشل التحميل';
      this.notifyProgress(task);
      throw error;
    }
  }

  /**
   * تحميل مباشر من CDN إلى الجوال
   */
  private async downloadFromCDN(
    task: DownloadTask,
    url: string,
    filename: string,
    headers: Record<string, string>
  ): Promise<void> {
    const localUri = FileSystem.documentDirectory + filename;

    let lastBytes = 0;
    let lastTime = Date.now();

    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      localUri,
      { headers },
      (progress) => {
        const { totalBytesWritten, totalBytesExpectedToWrite } = progress;
        task.downloadedBytes = totalBytesWritten;

        if (totalBytesExpectedToWrite > 0) {
          task.filesize = totalBytesExpectedToWrite;
          task.progress = Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100);
        }

        // حساب السرعة
        const now = Date.now();
        const elapsed = (now - lastTime) / 1000;
        if (elapsed >= 1) {
          const speed = (totalBytesWritten - lastBytes) / elapsed;
          task.speed = speed;
          task.speedText = this.formatSpeed(speed);

          if (speed > 0 && totalBytesExpectedToWrite > 0) {
            const remaining = totalBytesExpectedToWrite - totalBytesWritten;
            task.eta = this.formatETA(remaining / speed);
          }

          lastBytes = totalBytesWritten;
          lastTime = now;
        }

        this.notifyProgress(task);
      }
    );

    this.activeDownloads.set(task.id, downloadResumable);

    try {
      const result = await downloadResumable.downloadAsync();

      if (result && result.uri) {
        task.localPath = result.uri;
        task.status = 'saving';
        this.notifyProgress(task);

        // حفظ في معرض الصور
        try {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status === 'granted') {
            await MediaLibrary.saveToLibraryAsync(result.uri);
          }
        } catch (e) {
          console.warn('[DM] Gallery save error:', e);
        }

        task.status = 'completed';
        task.progress = 100;
        task.speedText = '';
        task.eta = '';
      } else {
        throw new Error('فشل حفظ الملف');
      }
    } catch (error: any) {
      if (task.status !== 'cancelled') {
        task.status = 'error';
        task.error = error.message || 'خطأ في التحميل';
      }
    }

    this.activeDownloads.delete(task.id);
    this.notifyProgress(task);
  }

  async cancelDownload(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'cancelled';

    const download = this.activeDownloads.get(taskId);
    if (download) {
      try { await download.pauseAsync(); } catch (e) { /* ignore */ }
      this.activeDownloads.delete(taskId);
    }

    this.notifyProgress(task);
  }

  getTask(taskId: string): DownloadTask | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): DownloadTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.startedAt - a.startedAt);
  }

  removeTask(taskId: string): void {
    this.tasks.delete(taskId);
    this.persistTasks();
  }

  clearAllTasks(): void {
    // Keep only active downloads
    const active: [string, DownloadTask][] = [];
    for (const [id, task] of this.tasks) {
      if (['extracting', 'downloading', 'saving'].includes(task.status)) {
        active.push([id, task]);
      }
    }
    this.tasks = new Map(active);
    this.persistTasks();
  }

  private formatSpeed(bytesPerSec: number): string {
    if (bytesPerSec <= 0) return '';
    if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`;
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }

  private formatETA(seconds: number): string {
    if (seconds <= 0 || !isFinite(seconds)) return '';
    if (seconds < 60) return `${Math.round(seconds)} ث`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} د ${Math.round(seconds % 60)} ث`;
    return `${Math.floor(seconds / 3600)} س ${Math.floor((seconds % 3600) / 60)} د`;
  }

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
