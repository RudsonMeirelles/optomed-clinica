// RemoteSyncService — sincroniza localStorage com o servidor Express via REST

type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

export type SyncStatusListener = (status: SyncStatus, pending: number) => void;

const SYNC_ENTITIES = ['patients', 'encounters', 'appointments', 'prescriptions'] as const;
type SyncEntity = typeof SYNC_ENTITIES[number];

function getApiBase(): string {
  try {
    const envUrl = (import.meta as any)?.env?.VITE_API_URL;
    if (envUrl) return String(envUrl).replace(/\/$/, '');
  } catch {}
  return '';
}

class RemoteSyncService {
  private status: SyncStatus = 'offline';
  private listeners: Set<SyncStatusListener> = new Set();
  private pendingCount = 0;
  private syncInProgress = false;

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

  async push(clinicId: string, entity: SyncEntity, data: any[]): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.onLine) return;
    const base = getApiBase();
    try {
      const res = await fetch(base + '/api/data/' + clinicId + '/' + entity, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
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
      await fetch(base + '/api/data/' + clinicId + '/' + entity + '/' + id, { method: 'DELETE' });
    } catch {}
  }

  async pull(clinicId: string, entity: SyncEntity): Promise<any[] | null> {
    if (typeof navigator === 'undefined' || !navigator.onLine) return null;
    const base = getApiBase();
    try {
      const res = await fetch(base + '/api/data/' + clinicId + '/' + entity, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      return Array.isArray(json.data) ? json.data : null;
    } catch (err) {
      console.warn('[Sync] pull ' + entity + ' falhou:', err);
      return null;
    }
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
      const base = getApiBase();
      let healthOk = false;
      try {
        const healthRes = await fetch(base + '/health', { cache: 'no-store' });
        healthOk = healthRes.ok;
      } catch {}

      if (!healthOk) {
        this.notify('error');
        this.syncInProgress = false;
        return;
      }

      for (const entity of SYNC_ENTITIES) {
        try {
          const serverData = await this.pull(clinicId, entity);
          const localData = getLocal(entity);

          if (serverData === null) {
            if (localData.length > 0) {
              await this.push(clinicId, entity, localData);
            }
          } else if (serverData.length === 0 && localData.length > 0) {
            await this.push(clinicId, entity, localData);
          } else if (serverData.length > 0) {
            const merged = this.mergeData(serverData, localData);
            setLocal(entity, merged);
            if (merged.length !== serverData.length) {
              await this.push(clinicId, entity, merged);
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

  private mergeData(serverData: any[], localData: any[]): any[] {
    const map = new Map<string, any>();
    for (const item of serverData) {
      if (item && item.id) map.set(item.id, item);
    }
    for (const item of localData) {
      if (!item || !item.id) continue;
      const existing = map.get(item.id);
      if (!existing) {
        map.set(item.id, item);
      } else {
        const existingTs = existing.updatedAt || existing.createdAt || '';
        const localTs = item.updatedAt || item.createdAt || '';
        if (localTs > existingTs) {
          map.set(item.id, item);
        }
      }
    }
    return Array.from(map.values());
  }
}

export const remoteSync = new RemoteSyncService();