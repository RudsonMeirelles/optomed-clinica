import { ClientMessage, TVMessage, OptotypeStimulusState } from '@optotipo/shared';
import { loadSettings } from './storageService';

type MessageHandler = (msg: ClientMessage) => void;

class LanPairingService {
  private socket: WebSocket | null = null;
  private channel: BroadcastChannel | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private isConnected: boolean = false;
  private pingInterval: number | null = null;
  private reconnectTimeout: number | null = null;

  constructor() {
    // Inicializa canal de broadcast local para comunicação intra-navegador/LAN instantânea
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('optotipo_meirelles_lan_bridge');
      this.channel.onmessage = (event) => {
        if (event.data && typeof event.data === 'object') {
          this.notifyHandlers(event.data as ClientMessage);
        }
      };
    }
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public connect(customIpOrUrl?: string): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    const settings = loadSettings();
    let host = customIpOrUrl || settings.serverIp || '192.168.1.144';

    // Se estiver rodando no navegador do PC em localhost
    if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !customIpOrUrl) {
      host = window.location.hostname;
    }

    let targetUrl = host;
    if (!targetUrl.startsWith('ws://') && !targetUrl.startsWith('wss://')) {
      targetUrl = `ws://${host}:8765/tv`;
    }

    try {
      if (this.socket) {
        try { this.socket.close(); } catch {}
      }

      this.socket = new WebSocket(targetUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as ClientMessage;
          this.notifyHandlers(msg);
        } catch (err) {
          console.error('Erro ao processar mensagem recebida:', err);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.stopHeartbeat();
        // Tentativa suave de reconexão a cada 3s sem travar o aplicativo
        this.reconnectTimeout = window.setTimeout(() => this.connect(), 3000);
      };

      this.socket.onerror = () => {
        this.isConnected = false;
      };
    } catch {
      this.isConnected = false;
      this.reconnectTimeout = window.setTimeout(() => this.connect(), 4000);
    }
  }

  public onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private notifyHandlers(msg: ClientMessage): void {
    this.handlers.forEach((h) => {
      try {
        h(msg);
      } catch (err) {
        console.error('Erro no handler:', err);
      }
    });
  }

  public sendStateUpdate(state: OptotypeStimulusState, isCalibrated: boolean = true): void {
    const msg: TVMessage = {
      type: 'STATE_CHANGED',
      state,
      isCalibrated
    };
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    }
    if (this.channel) {
      this.channel.postMessage(msg);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = window.setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'HEARTBEAT' }));
      }
    }, 10000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

export const lanPairingService = new LanPairingService();
