/**
 * API Service - HTTP Client
 * يتواصل مع Backend Server
 */

const BASE_URL = 'https://misbartube.lnkub.com'; // Production server

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = BASE_URL;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP Error ${response.status}`);
      }

      return data;
    } catch (error: any) {
      if (error.message === 'Network request failed') {
        throw new Error('لا يمكن الاتصال بالسيرفر. تأكد من أن السيرفر يعمل.');
      }
      throw error;
    }
  }

  // فحص صحة السيرفر
  async healthCheck() {
    return this.request('/api/health');
  }

  // كشف المنصة - المرجع: detect_platform() L123-165
  async detectPlatform(url: string) {
    return this.request('/api/detect', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  // جلب معلومات الفيديو - المرجع: mode_single_video() L750-764
  async getVideoInfo(url: string, cookies?: string | null) {
    return this.request('/api/info', {
      method: 'POST',
      body: JSON.stringify({ url, cookies }),
    });
  }

  // جلب معلومات قائمة التشغيل - المرجع: mode_playlist() L833-849
  async getPlaylistInfo(url: string, cookies?: string | null) {
    return this.request('/api/playlist/info', {
      method: 'POST',
      body: JSON.stringify({ url, cookies }),
    });
  }

  // بدء التحميل - المرجع: mode_single_video() L778-782
  async startDownload(options: {
    url: string;
    type?: string;
    quality?: string;
    audioQuality?: string;
    subtitleLang?: string | null;
    cookies?: string | null;
    isPlaylist?: boolean;
    playlistItems?: string | null;
  }) {
    return this.request('/api/download', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  // حالة التحميل
  async getDownloadStatus(id: string) {
    return this.request(`/api/download/${id}`);
  }

  // إلغاء التحميل
  async cancelDownload(id: string) {
    return this.request(`/api/download/${id}/cancel`, { method: 'POST' });
  }

  // كل التحميلات - المرجع: mode_logs_manager() L1051-1137
  async getAllDownloads() {
    return this.request('/api/downloads');
  }

  // الدقات المتاحة - المرجع: choose_format_and_quality() L329-337
  async getFormats(url: string, cookies?: string | null) {
    return this.request('/api/formats', {
      method: 'POST',
      body: JSON.stringify({ url, cookies }),
    });
  }

  // المنصات المدعومة - المرجع: show_supported_platforms() L1142-1164
  async getPlatforms() {
    return this.request('/api/platforms');
  }

  // السجلات
  async getLogs() {
    return this.request('/api/logs');
  }

  async getLogContent(filename: string) {
    return this.request(`/api/logs/${filename}`);
  }

  async deleteOldLogs(days: number = 7) {
    return this.request(`/api/logs/old?days=${days}`, { method: 'DELETE' });
  }

  async deleteAllLogs() {
    return this.request('/api/logs/all', { method: 'DELETE' });
  }

  // رابط ملف التحميل
  getFileUrl(downloadId: string, filename: string) {
    return `${this.baseUrl}/api/download/${downloadId}/file/${encodeURIComponent(filename)}`;
  }
}

export const api = new ApiService();
export default api;
