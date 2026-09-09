export interface WaitingRoomMediaItem {
  id: string;
  type: 'video' | 'image' | 'text' | 'iframe';
  title: string;
  url?: string; // YouTube URL, URL direta de vídeo MP4, ou imagem Base64 / URL
  textContent?: string;
  durationSeconds: number; // Tempo de exibição de cada item (para carrossel)
  active: boolean;
}

export interface WaitingRoomSettings {
  enabledMedia: boolean;
  mediaPosition: 'right' | 'bottom' | 'fullscreen_background';
  marqueeText: string;
  items: WaitingRoomMediaItem[];
}

const STORAGE_KEY = 'optomed_waiting_room_media_v1';

export const DEFAULT_WAITING_ROOM_SETTINGS: WaitingRoomSettings = {
  enabledMedia: true,
  mediaPosition: 'right',
  marqueeText: '🌟 Bem-vindo à nossa Clínica! Cuide da saúde dos seus olhos regularmente. Consulte nossos especialistas. • Atendimento humanizado e tecnologia de ponta.',
  items: [
    {
      id: 'demo-1',
      type: 'text',
      title: 'Dica de Saúde Ocular',
      textContent: '👀 Faça pausas a cada 20 minutos olhando para uma distância de 6 metros para descansar sua visão do uso de telas (Regra 20-20-20).',
      durationSeconds: 15,
      active: true
    },
    {
      id: 'demo-2',
      type: 'text',
      title: 'Lentes e Tratamentos Especiais',
      textContent: '✨ Conheça nossos tratamentos para controle de miopia, lentes com filtro de luz azul e antirreflexo premium.',
      durationSeconds: 15,
      active: true
    }
  ]
};

export class WaitingRoomMediaService {
  public static getSettings(): WaitingRoomSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Erro ao carregar configurações de mídia:', e);
    }
    return DEFAULT_WAITING_ROOM_SETTINGS;
  }

  public static saveSettings(settings: WaitingRoomSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      // Notifica abas/telas abertas
      window.dispatchEvent(new CustomEvent('optomed_media_settings_updated', { detail: settings }));
    } catch (e) {
      console.error('Erro ao salvar configurações de mídia:', e);
    }
  }

  public static addMediaItem(item: Omit<WaitingRoomMediaItem, 'id'>): WaitingRoomMediaItem {
    const settings = this.getSettings();
    const newItem: WaitingRoomMediaItem = {
      ...item,
      id: 'media_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
    };
    settings.items.push(newItem);
    this.saveSettings(settings);
    return newItem;
  }

  public static removeMediaItem(id: string): void {
    const settings = this.getSettings();
    settings.items = settings.items.filter(i => i.id !== id);
    this.saveSettings(settings);
  }

  public static toggleMediaItem(id: string): void {
    const settings = this.getSettings();
    const item = settings.items.find(i => i.id === id);
    if (item) {
      item.active = !item.active;
      this.saveSettings(settings);
    }
  }
}
