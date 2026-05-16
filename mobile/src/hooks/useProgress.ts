/**
 * useProgress Hook
 * متابعة تقدم التحميل عبر WebSocket
 */

import { useState, useEffect, useCallback } from 'react';
import wsService from '../services/websocket';
import { DownloadProgress } from '../types';

export const useProgress = (targetId?: string | null) => {
  const [progressData, setProgressData] = useState<DownloadProgress | null>(null);

  useEffect(() => {
    const unsub = wsService.on('progress', (data: DownloadProgress) => {
      if (!targetId || data.id === targetId) {
        setProgressData(data);
      }
    });

    return () => unsub();
  }, [targetId]);

  const clearProgress = useCallback(() => {
    setProgressData(null);
  }, []);

  return { progressData, clearProgress };
};
