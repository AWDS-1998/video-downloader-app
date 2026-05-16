/**
 * useDownload Hook
 * يستخدم DownloadManager لاستخراج CDN URL + تحميل مباشر
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import downloadManager, { DownloadTask } from '../services/downloadManager';

export const useDownload = () => {
  const [currentTask, setCurrentTask] = useState<DownloadTask | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    unsubRef.current = downloadManager.onProgress((task) => {
      setCurrentTask({ ...task });

      const active = ['extracting', 'downloading', 'saving'].includes(task.status);
      setIsDownloading(active);

      if (task.status === 'error' && task.error) {
        setError(task.error);
      }
    });

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

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
      setError(err.message || 'فشل بدء التحميل');
      setIsDownloading(false);
      throw err;
    }
  }, []);

  const cancelDownload = useCallback(async () => {
    if (currentTask) {
      await downloadManager.cancelDownload(currentTask.id);
      setIsDownloading(false);
    }
  }, [currentTask]);

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
    cancelDownload,
    clearDownload,
  };
};
