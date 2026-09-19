// RemoteSyncService — sincronizacao em tempo real com o servidor Express via REST

type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

export type SyncStatusListener = (status: SyncStatus, pending: number) => void;

const SYNC_ENTITIES = ['patients', 'encounters', 'appointments', 'prescriptions'] as const;
type SyncEntity = typeof SYNC_ENTITIES[number];

let cachedApiBase: string | null = null;

function getApiBase(): string {
  if (cachedApiBase !== null) return cachedApiBase;

  try {
    const envUrl = (import.meta as any)?.env?.VITE_API_URL;
    if (envUrl) {
      cachedApiBase = String(envUrl).replace(/\/$/, '');
      return cachedApiBase;
    }
  } catch {}

  // Detecção inteligente em ambiente de navegador
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    // Se acessando pelo túnel de qualquer subdomínio da clínica (app, clinica, api) ou local/LAN, usa caminho relativo ''
    // porque o próprio Cloudflare Tunnel direciona app.optomed.app.br e clinica.optomed.app.br diretamente para o Express na porta 8765!
    if (
      hostname.includes('optomed.app.br') ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.')
    ) {
      cachedApiBase = '';
      return '';
    }
    // Se estiver em ambiente Vercel legado ou domínio externo, direciona para o túnel da clínica
    if (hostname.includes('vercel.app')) {
      cachedApiBase = 'https://clinica.optomed.app.br';
      return cachedApiBase;
    }
  }

  cachedApiBase = '';
  return '';
}

class RemoteSyncService {
  private status: SyncStatus = 'offline';
  private listeners: Set<SyncStatusListener> = new Set();
  private pendingCount = 0;
  private syncInProgress = false;
  private periodicTimer: ReturnType<typeof setInterval> | null = null;
  private apiAvailable: boolean | null = null;

  addListener(fn: SyncStatusListener) { this.listeners.add(fn); }
  removeListener(fn: SyncStatusListener) { this.listeners.delete(fn); }

  private notify(status: SyncStatus, pending = this.pendingCount) {
    this.status = status;
    this.pendingCount = pending;
    this.listeners.forEach(fn => fn(status, pending));
  }

  getStatus(): SyncStatus { return this.status; }
  getPending(): number { return this.pendingCount; }

  private lastSyncKey(clinicId: string, entity: string) {
    return 'optomed_sync_ts_' + clinicId + '_' + entity;
  }

  private async checkApiAvailable(): Promise<boolean> {
    const base = getApiBase();
    try {
      const res = await fetch(base + '/health', { cache: 'no-store', signal: AbortSignal.timeout(3000) });
      this.apiAvailable = res.ok;
      return res.ok;
    } catch {
      this.apiAvailable = false;
      return false;
    }
  }

  async push(clinicId: string, entity: SyncEntity, data: any[]): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.onLine) return;
    const base = getApiBase();
    try {
      const res = await fetch(base + '/api/data/' + clinicId + '/' + entity, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      localStorage.setItem(this.lastSyncKey(clinicId, entity), new Date().toISOString());
    } catch (err) {
      console.warn('[Sync] push ' + entity + ' falhou:', err);
    }
  }

  async upsert(clinicId: string, entity: SyncEntity, record: any): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.onLine) return;
    const base = getApiBase();
    try {
      const res = await fetch(base + '/api/data/' + clinicId + '/' + entity + '/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
    } catch (err) {
      console.warn('[Sync] upsert ' + entity + ' falhou:', err);
    }
  }

  async remove(clinicId: string, entity: SyncEntity, id: string): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.onLine) return;
    const base = getApiBase();
    try {
      await fetch(base + '/api/data/' + clinicId + '/' + entity + '/' + id, {
        method: 'DELETE',
        signal: AbortSignal.timeout(5000),
      });
    } catch {}
  }

  async pull(clinicId: string, entity: SyncEntity): Promise<any[] | null> {
    if (typeof navigator === 'undefined' || !navigator.onLine) return null;
    const base = getApiBase();
    try {
      const res = await fetch(base + '/api/data/' + clinicId + '/' + entity, {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      return Array.isArray(json.data) ? json.data : null;
    } catch (err) {
      console.warn('[Sync] pull ' + entity + ' falhou:', err);
      return null;
    }
  }

  // Forca upload de TODOS os dados locais ao servidor (migracao inicial)
  async forceUploadAll(
    clinicId: string,
    getLocal: (entity: SyncEntity) => any[]
  ): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.onLine) return;
    const available = await this.checkApiAvailable();
    if (!available) return;
    this.notify('syncing', 0);
    for (const entity of SYNC_ENTITIES) {
      try {
        const localData = getLocal(entity);
        if (localData.length > 0) {
          await this.push(clinicId, entity, localData);
          console.log('[Sync] forceUpload ' + entity + ': ' + localData.length + ' registros enviados');
        }
      } catch (err) {
        console.warn('[Sync] forceUpload ' + entity + ' erro:', err);
      }
    }
    this.notify('synced', 0);
  }

  async fullSync(
    clinicId: string,
    getLocal: (entity: SyncEntity) => any[],
    setLocal: (entity: SyncEntity, data: any[]) => void
  ): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.onLine || this.syncInProgress) return;
    this.syncInProgress = true;
    this.notify('syncing', 0);

    try {
      const available = await this.checkApiAvailable();
      if (!available) {
        this.notify('error');
        this.syncInProgress = false;
        return;
      }

      for (const entity of SYNC_ENTITIES) {
        try {
          const serverData = await this.pull(clinicId, entity);
          const localData = getLocal(entity);

          if (serverData === null) {
            // API falhou — envia local se tiver dados
            if (localData.length > 0) {
              await this.push(clinicId, entity, localData);
            }
          } else if (serverData.length === 0 && localData.length > 0) {
            // Servidor vazio, local tem dados — envia TUDO para o servidor
            await this.push(clinicId, entity, localData);
            console.log('[Sync] Upload inicial ' + entity + ': ' + localData.length + ' registros');
          } else if (serverData.length > 0) {
            // Ambos tem dados — mescla por updatedAt e sincroniza
            const { merged, hasLocalChanges } = this.mergeData(serverData, localData);
            setLocal(entity, merged);
            // Se houver qualquer dado novo ou mais atual localmente, envia para o servidor
            if (hasLocalChanges || merged.length > serverData.length) {
              await this.push(clinicId, entity, merged);
              console.log('[Sync] Atualização enviada ao servidor para ' + entity + ': ' + merged.length + ' registros');
            }
          }
        } catch (err) {
          console.warn('[Sync] fullSync ' + entity + ' erro:', err);
        }
      }

      this.notify('synced', 0);
    } catch (err) {
      console.warn('[Sync] fullSync erro geral:', err);
      this.notify('error');
    } finally {
      this.syncInProgress = false;
    }
  }

  // Inicia sincronizacao periodica automatica a cada 15 segundos com sincronizacao instantanea no foco e reconexao
  startPeriodicSync(
    clinicId: string,
    getLocal: (entity: SyncEntity) => any[],
    setLocal: (entity: SyncEntity, data: any[]) => void
  ): void {
    if (this.periodicTimer) return; // ja iniciado
    // Sync imediato
    this.fullSync(clinicId, getLocal, setLocal);
    // Sync frequente a cada 15 segundos
    this.periodicTimer = setInterval(() => {
      this.fullSync(clinicId, getLocal, setLocal);
    }, 15000);

    if (typeof window !== 'undefined') {
      const handleFocusOrOnline = () => {
        if (navigator.onLine && !this.syncInProgress) {
          this.fullSync(clinicId, getLocal, setLocal);
        }
      };
      window.addEventListener('online', handleFocusOrOnline);
      window.addEventListener('focus', handleFocusOrOnline);
    }
    console.log('[Sync] Sincronizacao periodica iniciada (15s)');
  }

  stopPeriodicSync(): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }
  }

  private mergeData(serverData: any[], localData: any[]): { merged: any[]; hasLocalChanges: boolean } {
    const map = new Map<string, any>();
    let hasLocalChanges = false;

    for (const item of serverData) {
      if (item && item.id) map.set(item.id, item);
    }
    for (const item of localData) {
      if (!item || !item.id) continue;
      const existing = map.get(item.id);
      if (!existing) {
        map.set(item.id, item);
        hasLocalChanges = true;
      } else {
        const existingTs = existing.updatedAt || existing.createdAt || '';
        const localTs = item.updatedAt || item.createdAt || '';
        if (localTs > existingTs) {
          map.set(item.id, item);
          hasLocalChanges = true;
        }
      }
    }
    return { merged: Array.from(map.values()), hasLocalChanges };
  }
}

export const remoteSync = new RemoteSyncService();
