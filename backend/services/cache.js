/**
 * Cache Service - تخزين مؤقت للبيانات
 * يمنع تكرار طلبات yt-dlp لنفس الفيديو
 */

class CacheService {
  constructor(defaultTTL = 3600) { // 1 ساعة افتراضي
    this.cache = new Map();
    this.defaultTTL = defaultTTL * 1000; // تحويل لـ ms

    // تنظيف دوري كل 10 دقائق
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  /**
   * جلب قيمة من الكاش
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    item.hits++;
    return item.value;
  }

  /**
   * تخزين قيمة في الكاش
   */
  set(key, value, ttlSeconds = null) {
    const ttl = (ttlSeconds || this.defaultTTL / 1000) * 1000;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
      hits: 0,
    });
  }

  /**
   * حذف قيمة
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * تنظيف العناصر المنتهية الصلاحية
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, item] of this.cache) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`[CACHE] Cleaned ${cleaned} expired items. Active: ${this.cache.size}`);
    }
  }

  /**
   * إحصائيات الكاش
   */
  stats() {
    return {
      size: this.cache.size,
      items: Array.from(this.cache.entries()).map(([key, item]) => ({
        key,
        hits: item.hits,
        expiresIn: Math.round((item.expiresAt - Date.now()) / 1000) + 's',
      })),
    };
  }

  clear() {
    this.cache.clear();
  }
}

// كاش واحد مشترك
const videoInfoCache = new CacheService(3600);   // 1 ساعة للمعلومات
const formatsCache = new CacheService(1800);      // 30 دقيقة للصيغ

module.exports = { CacheService, videoInfoCache, formatsCache };
