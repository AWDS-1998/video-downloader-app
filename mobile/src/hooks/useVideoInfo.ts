/**
 * useVideoInfo Hook
 * جلب معلومات الفيديو والمنصة
 */

import { useState, useCallback } from 'react';
import api from '../services/api';
import { VideoInfo } from '../types';
import { isValidUrl } from '../utils/platform';

export const useVideoInfo = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<VideoInfo | null>(null);

  const fetchInfo = useCallback(async (url: string, cookies?: string | null) => {
    if (!isValidUrl(url)) {
      setError('الرابط غير صالح');
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.getVideoInfo(url, cookies);
      setInfo(data);
      return data;
    } catch (err: any) {
      const msg = err.message || 'فشل جلب معلومات الفيديو';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearInfo = useCallback(() => {
    setInfo(null);
    setError(null);
  }, []);

  return { info, loading, error, fetchInfo, clearInfo };
};
