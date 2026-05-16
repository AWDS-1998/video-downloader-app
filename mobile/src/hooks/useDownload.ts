/**
 * useDownload Hook
 * إدارة عملية التحميل وإلغائها
 */

import { useState, useCallback } from 'react';
import api from '../services/api';
import { DownloadOptions } from '../types';

export const useDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDownloadId, setCurrentDownloadId] = useState<string | null>(null);

  const startDownload = useCallback(async (options: DownloadOptions) => {
    setIsDownloading(true);
    setError(null);
    try {
      const response = await api.startDownload(options);
      setCurrentDownloadId(response.id);
      return response.id;
    } catch (err: any) {
      const msg = err.message || 'فشل بدء التحميل';
      setError(msg);
      setIsDownloading(false);
      throw err;
    }
  }, []);

  const cancelDownload = useCallback(async (id?: string) => {
    const targetId = id || currentDownloadId;
    if (!targetId) return;

    try {
      await api.cancelDownload(targetId);
      if (targetId === currentDownloadId) {
        setIsDownloading(false);
        setCurrentDownloadId(null);
      }
    } catch (err: any) {
      console.error('Cancel error:', err);
    }
  }, [currentDownloadId]);

  return {
    isDownloading,
    setIsDownloading,
    error,
    startDownload,
    cancelDownload,
    currentDownloadId
  };
};
