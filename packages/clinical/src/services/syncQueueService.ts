/**
 * Optomed Offline Sync Queue Service
 * Fila persistente com garantias de entrega, idempotência (operationId),
 * retry com backoff exponencial + jitter e suporte a tombstones.
 */

import { SyncQueueItem, SyncAction, SyncState } from '@optotipo/shared';
import { generateUUID } from './offlineDb';

const QUEUE_STORAGE_KEY = 'optomed_offline_sync_queue_v2';
const MAX_ATTEMPTS = 8;
const BASE_RETRY_DELAY_MS = 2000;
const MAX_RETRY_DELAY_MS = 60000;

class SyncQueueService {
  private queue: SyncQueueItem[] = [];
  private isProcessing = false;
  private timer: any = null;

  constructor() {
    this.loadQueue();
  }

  private loadQueue(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
        if (raw) {
          const parsed: SyncQueueItem[] = JSON.parse(raw);
          // 1. Reseta itens travados em 'processing'
          parsed.forEach(item => {
            if (item.state === 'processing') {
              item.state = 'pending';
            }
          });

          // 2. Colapso e compactação inteligente: se houver múltiplos updates para o mesmo clinicId+entity+recordId,
          // mantém apenas o mais recente, limpando filas gigantes acumuladas
          const latestMap = new Map<string, SyncQueueItem>();
          const otherItems: SyncQueueItem[] = [];

          for (const item of parsed) {
            // Se for update/bulk, colapsa por chave
            if (item.action === 'update' || item.recordId === 'bulk') {
              const key = `${item.clinicId}:${item.entity}:${item.recordId}`;
              latestMap.set(key, item);
            } else {
              otherItems.push(item);
            }
          }

          this.queue = [...Array.from(latestMap.values()), ...otherItems];

          // Limita teto de segurança da fila em memória e no storage
          if (this.queue.length > 200) {
            this.queue = this.queue.slice(-200);
          }
          this.saveQueue();
        }
      }
    } catch {
      this.queue = [];
    }
  }

  private saveQueue(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
      }
    } catch {}
  }

  /**
   * Enfileira uma nova mutação com operationId idempotente
   */
  public enqueue(item: {
    clinicId: string;
    entity: string;
    action: SyncAction;
    recordId: string;
    payload: any;
    version?: number;
    operationId?: string;
  }): SyncQueueItem {
    const operationId = item.operationId || `op_${Date.now()}_${generateUUID()}`;

    // Evita duplicatas se o mesmo operationId já estiver na fila
    const existing = this.queue.find(q => q.operationId === operationId);
    if (existing) {
      return existing;
    }

    // Se for 'update' ou lote 'bulk', substitui a mutação pendente anterior da mesma entidade
    // para evitar enfileirar milhares de snapshots idênticos
    if (item.action === 'update' || item.recordId === 'bulk') {
      const pendingIdx = this.queue.findIndex(
        q => q.clinicId === item.clinicId && q.entity === item.entity && q.recordId === item.recordId && q.state === 'pending'
      );
      if (pendingIdx >= 0) {
        this.queue[pendingIdx] = {
          ...this.queue[pendingIdx],
          operationId,
          payload: item.payload,
          version: item.version || (item.payload && item.payload.version) || this.queue[pendingIdx].version + 1,
          createdAt: new Date().toISOString(),
          attempts: 0,
          nextRetryAt: Date.now()
        };
        this.saveQueue();
        return this.queue[pendingIdx];
      }
    }

    const queueItem: SyncQueueItem = {
      operationId,
      clinicId: item.clinicId,
      entity: item.entity,
      action: item.action,
      recordId: item.recordId,
      payload: item.payload,
      version: item.version || (item.payload && item.payload.version) || 1,
      createdAt: new Date().toISOString(),
      attempts: 0,
      nextRetryAt: Date.now(),
      state: 'pending'
    };

    this.queue.push(queueItem);

    // Limita teto máximo de segurança
    if (this.queue.length > 200) {
      this.queue = this.queue.slice(-200);
    }

    this.saveQueue();
    return queueItem;
  }

  
  public getReadyItems(clinicId?: string): SyncQueueItem[] {
    const now = Date.now();
    return this.queue.filter(item => {
      const matchClinic = !clinicId || item.clinicId === clinicId;
      return matchClinic && (item.state === 'pending' || item.state === 'failed') && item.nextRetryAt <= now && item.attempts < MAX_ATTEMPTS;
    });
  }

  public getPendingCount(clinicId?: string): number {
    return this.queue.filter(item => {
      const matchClinic = !clinicId || item.clinicId === clinicId;
      return matchClinic && (item.state === 'pending' || item.state === 'processing');
    }).length;
  }

  public getPendingItems(): SyncQueueItem[] {
    const now = Date.now();
    return this.queue.filter(
      item => (item.state === 'pending' || item.state === 'failed') && item.nextRetryAt <= now && item.attempts < MAX_ATTEMPTS
    );
  }

  public getAll(): SyncQueueItem[] {
    return [...this.queue];
  }

  public markProcessing(operationId: string): void {
    const item = this.queue.find(q => q.operationId === operationId);
    if (item) {
      item.state = 'processing';
      item.attempts += 1;
      this.saveQueue();
    }
  }

  public markSuccess(operationId: string): void {
    // Remove da fila ao ser confirmado pelo servidor
    this.queue = this.queue.filter(q => q.operationId !== operationId);
    this.saveQueue();
  }

  public markFailure(operationId: string, error: string, isPermanent = false): void {
    const item = this.queue.find(q => q.operationId === operationId);
    if (item) {
      item.lastError = error;
      if (isPermanent || item.attempts >= MAX_ATTEMPTS) {
        item.state = 'failed';
      } else {
        item.state = 'pending';
        // Backoff exponencial com jitter: 2s, 4s, 8s, 16s... + random jitter
        const delay = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, item.attempts - 1), MAX_RETRY_DELAY_MS);
        const jitter = Math.floor(Math.random() * 1000);
        item.nextRetryAt = Date.now() + delay + jitter;
      }
      this.saveQueue();
    }
  }

  public markConflict(operationId: string, error: string): void {
    const item = this.queue.find(q => q.operationId === operationId);
    if (item) {
      item.state = 'conflict';
      item.lastError = error;
      this.saveQueue();
    }
  }

  public resetFailedToPending(clinicId?: string): number {
    let count = 0;
    this.queue.forEach(item => {
      const matchClinic = !clinicId || item.clinicId === clinicId;
      if (matchClinic && (item.state === 'failed' || item.attempts >= MAX_ATTEMPTS)) {
        item.state = 'pending';
        item.attempts = 0;
        item.nextRetryAt = Date.now();
        item.lastError = undefined;
        count++;
      }
    });
    if (count > 0) {
      this.saveQueue();
    }
    return count;
  }

  public clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }
}

export const syncQueueService = new SyncQueueService();

export const syncQueue = syncQueueService;
