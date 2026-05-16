/**
 * useDownload Hook - إدارة التحميل المتقدم
 * يستخدم DownloadManager للتحميل المباشر مع إيقاف/استئناف/إلغاء
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import downloadManager, { DownloadTask } from '../services/downloadManager';

export const useDownload = () => {
  const [currentTask, setCurrentTask] = useState<DownloadTask | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  // الاشتراك في تحديثات التقدم
  useEffect(() => {
    unsubRef.current = downloadManager.onProgress((task) => {
      setCurrentTask(prev => {
        if (!prev || prev.id === task.id) {
          return { ...task };
        }
        return prev;
      });

      if (task.status === 'completed' || task.status === 'error' || task.status === 'cancelled') {
        setIsDownloading(false);
      }

      if (task.status === 'error' && task.error) {
        setError(task.error);
      }
    });

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  /**
   * بدء تحميل جديد
   */
  const startDownload = useCallback(async (options: {
    url: string;
    title: string;
    quality?: string;
    type?: 'video' | 'audio';
    thumbnail?: string;
  }) => {
    setIsDownloading(true);
    setError(null);
    setCurrentTask(null);

    try {
      const taskId = await downloadManager.startDownload(options);
      return taskId;
    } catch (err: any) {
      const msg = err.message || 'فشل بدء التحميل';
      setError(msg);
      setIsDownloading(false);
      throw err;
    }
  }, []);

  /**
   * إيقاف مؤقت
   */
  const pauseDownload = useCallback(async () => {
    if (currentTask) {
      await downloadManager.pauseDownload(currentTask.id);
    }
  }, [currentTask]);

  /**
   * استئناف
   */
  const resumeDownload = useCallback(async () => {
    if (currentTask) {
      setIsDownloading(true);
      await downloadManager.resumeDownload(currentTask.id);
    }
  }, [currentTask]);

  /**
   * إلغاء
   */
  const cancelDownload = useCallback(async () => {
    if (currentTask) {
      await downloadManager.cancelDownload(currentTask.id);
      setIsDownloading(false);
    }
  }, [currentTask]);

  /**
   * مسح الحالة
   */
  const clearDownload = useCallback(() => {
    setCurrentTask(null);
    setIsDownloading(false);
    setError(null);
  }, []);

  return {
    currentTask,
    isDownloading,
    error,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    clearDownload,
  };
};
