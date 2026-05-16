/**
 * WebSocket Service
 * للتقدم المباشر في التحميل (real-time progress)
 */

type MessageHandler = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private serverUrl: string = 'wss://misbartube.lnkub.com/ws';
  private isConnecting: boolean = false;

  setServerUrl(url: string) {
    const httpUrl = url.replace(/^https?:\/\//, '');
    this.serverUrl = `ws://${httpUrl}/ws`;
  }

  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        console.log('[WS] Connected');
        this.emit('connected', { connected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data.data || data);
        } catch (e) {
          console.warn('[WS] Parse error:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        console.log('[WS] Disconnected');
        this.emit('disconnected', { connected: false });
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        this.isConnecting = false;
        console.warn('[WS] Error:', error);
      };
    } catch (e) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      console.log('[WS] Reconnecting...');
      this.connect();
    }, 5000);
  }

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  on(event: string, handler: MessageHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: MessageHandler) {
    this.handlers.get(event)?.delete(handler);
  }

  private emit(event: string, data: any) {
    this.handlers.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (e) {
        console.error('[WS] Handler error:', e);
      }
    });
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsService = new WebSocketService();
export default wsService;
