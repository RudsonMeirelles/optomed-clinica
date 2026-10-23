/**
 * Optomed IndexedDB Storage Service
 * Suporta armazenamento de grande capacidade (GBs), consultas assíncronas e alta performance.
 * Inclui fallback automático para localStorage e migração transparente sem perda de dados.
 */

const DB_NAME = 'optomed_db_v2';
const DB_VERSION = 5; // Versão 5: adiciona stores do motor de remuneração dos examinadores

export const INDEXEDDB_STORES = [
  'patients',
  'episodes',
  'encounters',
  'appointments',
  'prescriptions',
  'transactions',
  'work_sessions',
  'pos_items',
  'cash_registers',
  'audit_logs',
  'sync_queue',
  'metadata',
  'evolutions',
  'clinical_documents',
  'examiner_fixed_periods',
  'examiner_special_periods',
  'examiner_avulso_rules',
  'examiner_remunerations',
  'examiner_closures'
] as const;

export type StoreName = typeof INDEXEDDB_STORES[number];

class IndexedDbStorageService {
  private db: IDBDatabase | null = null;
  private isSupported: boolean = false;
  private initPromise: Promise<boolean> | null = null;

  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'indexedDB' in window;
  }

  public async init(): Promise<boolean> {
    if (!this.isSupported) return false;
    if (this.db) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          INDEXEDDB_STORES.forEach(storeName => {
            if (!db.objectStoreNames.contains(storeName)) {
              const store = db.createObjectStore(storeName, { keyPath: 'storageKey' });
              // Índice por clinicId para consultas otimizadas (evita scan completo)
              store.createIndex('clinicId', 'clinicId', { unique: false });
            } else {
              // Adiciona índice clinicId em stores existentes (migração v3→v4)
              try {
                const tx = (event.target as IDBOpenDBRequest).transaction!;
                const store = tx.objectStore(storeName);
                if (!store.indexNames.contains('clinicId')) {
                  store.createIndex('clinicId', 'clinicId', { unique: false });
                }
              } catch {}
            }
          });
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          resolve(true);
        };

        request.onerror = () => {
          this.db = null;
          resolve(false);
        };
      } catch {
        this.db = null;
        resolve(false);
      }
    });

    return this.initPromise;
  }

  private getCompositeKey(storeName: StoreName, clinicId: string, id: string): string {
    return `${clinicId}__${id}`;
  }

  public async get<T = any>(storeName: StoreName, clinicId: string, id: string): Promise<T | null> {
    const ready = await this.init();
    if (!ready || !this.db) {
      // Fallback transparente para localStorage
      try {
        if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem(`optotipo_${clinicId}_${storeName}_v2`);
          if (raw) {
            const list = JSON.parse(raw);
            const found = list.find((item: any) => item && item.id === id);
            return found || null;
          }
        }
      } catch {}
      return null;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(this.getCompositeKey(storeName, clinicId, id));

        req.onsuccess = () => {
          if (req.result && req.result.data) {
            resolve(req.result.data as T);
          } else {
            resolve(null);
          }
        };

        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  public async getAll<T = any>(storeName: StoreName, clinicId: string): Promise<T[]> {
    const ready = await this.init();
    if (!ready || !this.db) {
      // Fallback transparente para localStorage
      try {
        if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem(`optotipo_${clinicId}_${storeName}_v2`);
          if (raw) {
            const list = JSON.parse(raw);
            return Array.isArray(list) ? list : [];
          }
        }
      } catch {}
      return [];
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        
        // Usa índice clinicId quando disponível (otimizado: evita scan completo)
        let req: IDBRequest;
        try {
          const index = store.index('clinicId');
          req = index.getAll(clinicId);
        } catch {
          // Fallback: scan completo se índice não existir (pré-migração)
          req = store.getAll();
        }

        req.onsuccess = () => {
          if (Array.isArray(req.result)) {
            const filtered = req.result
              .filter(item => item && item.clinicId === clinicId)
              .map(item => item.data as T);
            resolve(filtered);
          } else {
            resolve([]);
          }
        };

        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  public async put<T = any>(storeName: StoreName, clinicId: string, id: string, data: T): Promise<boolean> {
    const ready = await this.init();
    if (!ready || !this.db) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const record = {
          storageKey: this.getCompositeKey(storeName, clinicId, id),
          clinicId,
          id,
          data,
          updatedAt: new Date().toISOString()
        };
        const req = store.put(record);

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  public async putMany<T = any>(storeName: StoreName, clinicId: string, items: (T & { id: string })[]): Promise<boolean> {
    const ready = await this.init();
    if (!ready || !this.db) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);

        items.forEach(item => {
          if (item && item.id) {
            store.put({
              storageKey: this.getCompositeKey(storeName, clinicId, item.id),
              clinicId,
              id: item.id,
              data: item,
              updatedAt: new Date().toISOString()
            });
          }
        });

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  public async delete(storeName: StoreName, clinicId: string, id: string): Promise<boolean> {
    const ready = await this.init();
    if (!ready || !this.db) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(this.getCompositeKey(storeName, clinicId, id));

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  
  public async saveAll<T = any>(storeName: StoreName, clinicId: string, items: (T & { id: string })[]): Promise<boolean> {
    return this.putMany(storeName, clinicId, items);
  }

  public async saveItem<T = any>(storeName: StoreName, clinicId: string, item: T & { id: string }): Promise<boolean> {
    if (!item || !item.id) return false;
    return this.put(storeName, clinicId, item.id, item);
  }

  public async deleteItem(storeName: StoreName, clinicId: string, id: string): Promise<boolean> {
    return this.delete(storeName, clinicId, id);
  }

  public async migrateFromLocalStorage(
    clinicId = 'ivs',
    entityKeyMap: Record<string, StoreName> = {
      patients: 'patients',
      episodes: 'episodes',
      encounters: 'encounters',
      appointments: 'appointments',
      prescriptions: 'prescriptions',
      financial_transactions: 'transactions',
      work_sessions: 'work_sessions',
      pos_items: 'pos_items',
      audit_logs: 'audit_logs',
      evolutions: 'evolutions',
      clinical_documents: 'clinical_documents',
      cash_registers: 'cash_registers'
    }
  ): Promise<{ migratedCount: number }> {
    let count = 0;
    if (typeof localStorage === 'undefined') return { migratedCount: 0 };
    const migrationMarkerKey = `optomed_idb_migrated_${clinicId}_v3`; // v3: inclui episodes, evolutions, clinical_documents, cash_registers
    if (localStorage.getItem(migrationMarkerKey)) {
      return { migratedCount: 0 }; // Idempotência garantida: já migrado
    }

    for (const [localKey, storeName] of Object.entries(entityKeyMap)) {
      try {
        const raw = localStorage.getItem(`optotipo_${clinicId}_${localKey}_v2`);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            await this.putMany(storeName, clinicId, list);
            count += list.length;
          }
        }
      } catch {}
    }

    localStorage.setItem(migrationMarkerKey, new Date().toISOString());
    return { migratedCount: count };
  }
}

export const indexedDbStorage = new IndexedDbStorageService();
