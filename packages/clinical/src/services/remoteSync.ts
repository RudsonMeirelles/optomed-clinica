// RemoteSyncService — sincronização resiliente em tempo real com o servidor Express via REST,
// suportando Fila Offline Durável, Idempotência (operationId), Tombstones (_deleted) e Backoff Exponencial.

import { syncQueue } from './syncQueueService';
import { type SyncAction, mergeAppointmentStatuses } from '@optotipo/shared';
import { SecurityService } from './securityService';

type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

export type SyncStatusListener = (status: SyncStatus, pending: number) => void;

export const SYNC_ENTITIES = [
  'clinics',
  'patients',
  'episodes',
  'appointments',
  'encounters',
  'prescriptions',
  'transactions',
  'work_sessions',
  'pos_items',
  'cash_registers',
  'audit_logs',
  'evolutions',
  'clinical_documents',
  'examiner_fixed_periods',
  'examiner_special_periods',
  'examiner_avulso_rules',
  'examiner_remunerations',
  'examiner_closures'
] as const;
export type SyncEntity = typeof SYNC_ENTITIES[number];

let cachedApiBase: string | null = null;

export function getApiBase(): string {
  if (cachedApiBase !== null) return cachedApiBase;

  try {
    const envUrl = (import.meta as any)?.env?.VITE_API_URL;
    if (envUrl) {
      cachedApiBase = String(envUrl).replace(/\/$/, '');
      return cachedApiBase;
    }
  } catch {}

  // Permite configuração manual via localStorage para suporte a redes externas/túneis
  if (typeof localStorage !== 'undefined') {
    const customUrl = localStorage.getItem('optomed_server_url');
    if (customUrl && customUrl.trim()) {
      cachedApiBase = customUrl.trim().replace(/\/$/, '');
      return cachedApiBase;
    }
  }

  // Detecção inteligente em ambiente de navegador
  if (typeof window !== 'undefined' && window.location) {
    const { hostname, port, protocol } = window.location;
    
    // Se acessado via túnel ou domínio de produção
    if (hostname.includes('optomed.app.br')) {
      cachedApiBase = '';
      return '';
    }
    if (hostname.includes('vercel.app')) {
      cachedApiBase = 'https://clinica.optomed.app.br';
      return cachedApiBase;
    }

    // Se acessado diretamente via Express (em qualquer porta onde o bundle é servido, ex: 8765 ou 8766)
    const pathname = window.location.pathname || '';
    if (pathname.includes('/clinical') || pathname.includes('/tv') || pathname.includes('/controle')) {
      cachedApiBase = '';
      return '';
    }

    // Se estiver rodando em desenvolvimento Vite (ex: porta 5173, 5174) em localhost ou IP da LAN
    // o backend Express atende na porta 8765 (ou porta customizada no localStorage)
    if (port && (port === '5173' || port === '5174')) {
      cachedApiBase = `${protocol}//${hostname}:8765`;
      return cachedApiBase;
    }

    // Se acessado diretamente na porta padrão ou servido pelo Express
    cachedApiBase = '';
    return '';
  }

  cachedApiBase = '';
  return '';
}

class RemoteSyncService {
  private status: SyncStatus = 'offline';
  private listeners: Set<SyncStatusListener> = new Set();
  private pendingCount = 0;
  private syncInProgress = false;
  private periodicTimer: any = null;
  private queueProcessorTimer: any = null;
  private isProcessingQueue = false;
  private focusOrOnlineHandler: (() => void) | null = null;

  addListener(fn: SyncStatusListener) { this.listeners.add(fn); }
  removeListener(fn: SyncStatusListener) { this.listeners.delete(fn); }

  private notify(status: SyncStatus, pending = this.pendingCount) {
    this.status = status;
    this.pendingCount = pending;
    this.listeners.forEach(fn => fn(status, pending));
  }

  getStatus(): SyncStatus { return this.status; }
  getPending(): number { return this.pendingCount; }

  private getAuthHeaders(operationId?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (operationId) {
      headers['x-operation-id'] = operationId;
    }
    if (typeof localStorage !== 'undefined') {
      let token = localStorage.getItem('optotipo_clinical_auth_token_v2');

      // Auto-recuperação de token: se o token não existir ou estiver expirado,
      // regenera a partir dos dados do usuário logado armazenados localmente
      if (!token) {
        try {
          const rawUser = localStorage.getItem('optotipo_clinical_auth_user_v2');
          if (rawUser) {
            const user = JSON.parse(rawUser);
            if (user && user.id && user.role) {
              token = SecurityService.generateSessionToken({
                userId: user.id,
                username: user.username,
                role: user.role,
                clinicId: user.clinicId || 'ivs',
                allowedClinics: user.role === 'superadmin' ? 'all' : [user.clinicId || 'ivs']
              });
              localStorage.setItem('optotipo_clinical_auth_token_v2', token);
            }
          }
        } catch {}
      } else {
        // Se for token Base64 do cliente, verifica se está prestes a expirar e renova
        try {
          const decoded = SecurityService.decodeSessionToken(token);
          if (!decoded) {
            // Token expirado ou inválido: renova
            const rawUser = localStorage.getItem('optotipo_clinical_auth_user_v2');
            if (rawUser) {
              const user = JSON.parse(rawUser);
              if (user && user.id && user.role) {
                token = SecurityService.generateSessionToken({
                  userId: user.id,
                  username: user.username,
                  role: user.role,
                  clinicId: user.clinicId || 'ivs',
                  allowedClinics: user.role === 'superadmin' ? 'all' : [user.clinicId || 'ivs']
                });
                localStorage.setItem('optotipo_clinical_auth_token_v2', token);
              }
            }
          }
        } catch {}
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  private lastSyncKey(clinicId: string, entity: string) {
    return 'optomed_sync_ts_' + clinicId + '_' + entity;
  }

  async checkApiAvailable(): Promise<boolean> {
    const base = getApiBase();
    try {
      const res = await fetch(base + '/health', { cache: 'no-store', signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  // --- FILA OFFLINE DURÁVEL & OPERAÇÕES ATÔMICAS ---

  /**
   * Enfileira uma mutação clínica na fila persistente durável (IndexedDB)
   */
  async enqueueMutation(clinicId: string, entity: SyncEntity, action: SyncAction, payload: any): Promise<string> {
    const recordId = payload?.id || (Array.isArray(payload) ? 'bulk' : String(payload));
    const item = syncQueue.enqueue({
      clinicId,
      entity,
      action,
      recordId,
      payload
    });
    const count = syncQueue.getPendingCount(clinicId);
    this.pendingCount = count;
    this.notify(this.status, count);

    // Tenta processar imediatamente em background se online
    if (typeof navigator === 'undefined' || navigator.onLine) {
      this.triggerQueueProcessing(clinicId);
    }
    return item.operationId;
  }

  /**
   * Dispara o processamento sequencial da fila persistente durável
   */
  async triggerQueueProcessing(clinicId: string): Promise<void> {
    if (this.isProcessingQueue) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.notify('offline', await syncQueue.getPendingCount(clinicId));
      return;
    }

    this.isProcessingQueue = true;
    try {
      // Auto-recuperação: se houver itens que falharam por token antigo ou 401 transitório, reseta para nova tentativa
      this.resetFailedQueue(clinicId);

      const readyItems = await syncQueue.getReadyItems(clinicId);
      // Processamento sequencial estrito para garantir que mutações no mesmo registro
      // ou entre registros interdependentes mantenham rigorosamente a ordem cronológica de gravação.
      for (const item of readyItems) {
        await syncQueue.markProcessing(item.operationId);
        try {
          const success = await this.dispatchQueueItem(item);
          if (success) {
            await syncQueue.markSuccess(item.operationId);
          } else {
            await syncQueue.markFailure(item.operationId, 'Falha temporária ao enviar operação');
          }
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          // 401 e 403 NÃO devem ser marcados como isFatal (permanente), pois decorrem de token expirado/desatualizado
          // e serão enviados com sucesso assim que o usuário renovar a sessão ou fizer login.
          const isFatal = errMsg.includes('400') && !errMsg.includes('401') && !errMsg.includes('403');
          await syncQueue.markFailure(item.operationId, errMsg, isFatal);
        }
      }
    } finally {
      this.isProcessingQueue = false;
      const count = await syncQueue.getPendingCount(clinicId);
      this.pendingCount = count;
      this.notify(count > 0 ? 'syncing' : 'synced', count);
    }
  }

  /**
   * Reseta itens que falharam anteriormente para pending para nova tentativa
   */
  resetFailedQueue(clinicId?: string): number {
    const count = syncQueue.resetFailedToPending(clinicId);
    if (count > 0) {
      const pending = syncQueue.getPendingCount(clinicId);
      this.pendingCount = pending;
      this.notify(pending > 0 ? 'syncing' : 'synced', pending);
    }
    return count;
  }

  private async dispatchQueueItem(item: any): Promise<boolean> {
    const base = getApiBase();

    // Se o payload for um array (e.g. vindo de push()), envia para o endpoint bulk /api/data/:clinicId/:entity
    if (Array.isArray(item.payload)) {
      const url = `${base}/api/data/${item.clinicId}/${item.entity}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(item.operationId),
        body: JSON.stringify({ data: item.payload, operationId: item.operationId }),
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return true;
    }

    const url = `${base}/api/data/${item.clinicId}/${item.entity}/upsert`;

    let payloadRecord = item.payload;
    if (item.action === 'delete' || item.action === 'DELETE') {
      payloadRecord = {
        id: item.payload?.id || item.payload,
        _deleted: true,
        deletedAt: new Date().toISOString()
      };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(item.operationId),
      body: JSON.stringify({ record: payloadRecord, operationId: item.operationId }),
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return true;
  }

  async push(clinicId: string, entity: SyncEntity, data: any[], operationId?: string): Promise<void> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      // Quando offline, enfileira a carga completa na fila durável
      await this.enqueueMutation(clinicId, entity, 'update', data);
      return;
    }
    const base = getApiBase();
    try {
      const res = await fetch(base + '/api/data/' + clinicId + '/' + entity, {
        method: 'POST',
        headers: this.getAuthHeaders(operationId),
        body: JSON.stringify({ data, operationId }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.lastSyncKey(clinicId, entity), new Date().toISOString());
      }
    } catch (err) {
      console.warn('[Sync] push ' + entity + ' falhou, salvando na fila offline:', err);
      await this.enqueueMutation(clinicId, entity, 'update', data);
    }
  }

  async upsert(clinicId: string, entity: SyncEntity, record: any, operationId?: string): Promise<boolean> {
    const opId = operationId || `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await this.enqueueMutation(clinicId, entity, 'update', record);
      return false;
    }
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/data/${clinicId}/${entity}/upsert`, {
        method: 'POST',
        headers: this.getAuthHeaders(opId),
        body: JSON.stringify({ record, operationId: opId }),
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        return true;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.warn(`[Sync] upsert imediato falhou, salvando na fila offline:`, e);
      await this.enqueueMutation(clinicId, entity, 'update', record);
      return false;
    }
  }

  async remove(clinicId: string, entity: SyncEntity, id: string, operationId?: string): Promise<boolean> {
    const opId = operationId || `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await this.enqueueMutation(clinicId, entity, 'delete', { id });
      return false;
    }
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/data/${clinicId}/${entity}/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(opId),
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        return true;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.warn(`[Sync] remove imediato falhou, salvando na fila offline:`, e);
      await this.enqueueMutation(clinicId, entity, 'delete', { id });
      return false;
    }
  }

  async pull(clinicId: string, entity: SyncEntity): Promise<{ data: any[] | null; tombstones?: Record<string, string> }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return { data: null };
    const base = getApiBase();
    try {
      const res = await fetch(base + '/api/data/' + clinicId + '/' + entity, {
        cache: 'no-store',
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      return {
        data: Array.isArray(json.data) ? json.data : null,
        tombstones: json.tombstones || {}
      };
    } catch (err) {
      console.warn('[Sync] pull ' + entity + ' falhou:', err);
      return { data: null };
    }
  }

  async forceUploadAll(
    clinicId: string,
    getLocal: (entity: SyncEntity) => any[]
  ): Promise<void> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const available = await this.checkApiAvailable();
    if (!available) return;
    this.notify('syncing', 0);

    // 1. Reseta operações que falharam e drena a fila persistente
    this.resetFailedQueue(clinicId);
    await this.triggerQueueProcessing(clinicId);

    // 2. Envia coleções locais completas
    for (const entity of SYNC_ENTITIES) {
      try {
        const localData = getLocal(entity);
        if (localData && localData.length > 0) {
          await this.push(clinicId, entity, localData);
          console.log('[Sync] forceUpload ' + entity + ': ' + localData.length + ' registros enviados');
        }
      } catch (err) {
        console.warn('[Sync] forceUpload ' + entity + ' erro:', err);
      }
    }

    // 3. Processa novamente qualquer operação que tenha entrado na fila
    await this.triggerQueueProcessing(clinicId);

    const pending = await syncQueue.getPendingCount(clinicId);
    this.notify(pending > 0 ? 'syncing' : 'synced', pending);
  }

  async fullSync(
    clinicId: string,
    getLocal: (entity: SyncEntity) => any[],
    setLocal: (entity: SyncEntity, data: any[]) => void
  ): Promise<void> {
    if (this.syncInProgress) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.notify('offline');
      return;
    }

    this.syncInProgress = true;
    this.notify('syncing', this.pendingCount);

    try {
      const available = await this.checkApiAvailable();
      if (!available) {
        this.notify('error', this.pendingCount);
        this.syncInProgress = false;
        return;
      }

      // Primeiro drena operações pendentes na fila
      await this.triggerQueueProcessing(clinicId);

      // Tenta Delta Sync primeiro (1 única requisição leve para todas as entidades)
      let deltaSucceeded = false;
      const lastDeltaKey = `optomed_${clinicId}_last_delta_sync`;
      const lastDeltaIso = typeof localStorage !== 'undefined' ? localStorage.getItem(lastDeltaKey) : null;

      // Salvaguarda histórica: se o cliente tiver menos registros que o esperado (ou encounters zerados),
      // invalida lastDeltaIso para forçar carga histórica completa não-destrutiva
      const localPatients = getLocal('patients') || [];
      const localEncounters = getLocal('encounters') || [];
      const isLocalHistorySparse = localPatients.length < 100 || localEncounters.length < 100;

      try {
        const deltaUrl = `${getApiBase()}/api/sync/delta/${clinicId}${lastDeltaIso && !isLocalHistorySparse ? `?since=${encodeURIComponent(lastDeltaIso)}` : ''}`;
        const deltaRes = await fetch(deltaUrl, {
          cache: 'no-store',
          headers: this.getAuthHeaders(),
          signal: AbortSignal.timeout(10000)
        });

        if (deltaRes.ok) {
          const deltaJson = await deltaRes.json();
          if (deltaJson && deltaJson.ok && deltaJson.delta) {
            deltaSucceeded = true;
            const syncedAt = deltaJson.syncedAt || new Date().toISOString();

            for (const entity of SYNC_ENTITIES) {
              const serverData = deltaJson.delta[entity] || [];
              const tombstones = deltaJson.tombstones?.[entity] || {};
              const localData = getLocal(entity) || [];

              if (lastDeltaIso && !isLocalHistorySparse && serverData.length === 0 && Object.keys(tombstones).length === 0) {
                // Sem alterações no servidor desde o último delta e cache local já estabelecido
                continue;
              }

              const { merged, hasLocalChanges } = this.mergeDataWithTombstones(serverData, localData, tombstones, entity);
              setLocal(entity, merged);
              if (hasLocalChanges) {
                await this.push(clinicId, entity, merged);
              }
            }

            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(lastDeltaKey, syncedAt);
            }
          }
        }
      } catch (deltaErr) {
        console.warn('[Sync] Delta Sync indisponível ou falhou, usando fullSync padrão:', deltaErr);
      }

      // Se o Delta Sync não foi possível (servidor legado ou falha), faz o fullSync paralelo de fallback
      if (!deltaSucceeded) {
        const pullResults = await Promise.allSettled(
          SYNC_ENTITIES.map(async (entity) => {
            const res = await this.pull(clinicId, entity);
            return { entity, serverData: res.data, tombstones: res.tombstones };
          })
        );

        for (const result of pullResults) {
          if (result.status !== 'fulfilled') continue;
          const { entity, serverData, tombstones } = result.value;
          try {
            const localData = getLocal(entity) || [];

            if (serverData === null) {
              if (localData.length > 0) {
                await this.push(clinicId, entity, localData);
              }
            } else if (serverData.length === 0 && localData.length > 0) {
              const filteredLocal = tombstones
                ? localData.filter(item => !tombstones[item.id] && !item._deleted)
                : localData;
              
              if (filteredLocal.length > 0) {
                await this.push(clinicId, entity, filteredLocal);
              } else if (filteredLocal.length !== localData.length) {
                setLocal(entity, filteredLocal);
              }
            } else if (serverData.length > 0 || Object.keys(tombstones || {}).length > 0) {
              const { merged, hasLocalChanges } = this.mergeDataWithTombstones(serverData || [], localData, tombstones || {}, entity);
              setLocal(entity, merged);
              if (hasLocalChanges) {
                await this.push(clinicId, entity, merged);
              }
            }
          } catch (err) {
            console.warn('[Sync] fullSync ' + entity + ' erro:', err);
          }
        }
      }

      const pending = await syncQueue.getPendingCount(clinicId);
      this.notify(pending > 0 ? 'syncing' : 'synced', pending);
    } catch (err) {
      console.warn('[Sync] fullSync erro geral:', err);
      this.notify('error', this.pendingCount);
    } finally {
      this.syncInProgress = false;
    }
  }

  private lastSyncTimestamp = 0;

  startPeriodicSync(
    clinicId: string,
    getLocal: (entity: SyncEntity) => any[],
    setLocal: (entity: SyncEntity, data: any[]) => void
  ): void {
    if (this.periodicTimer) return;
    this.fullSync(clinicId, getLocal, setLocal);
    this.lastSyncTimestamp = Date.now();

    // Sync periódico inteligente a cada 60 segundos
    // O WebSocket já notifica instantaneamente em tempo real quando algo muda
    this.periodicTimer = setInterval(() => {
      this.fullSync(clinicId, getLocal, setLocal);
      this.lastSyncTimestamp = Date.now();
    }, 60000);

    // Verificador da fila offline a cada 30 segundos
    // Útil apenas quando existem operações pendentes offline
    this.queueProcessorTimer = setInterval(() => {
      if (this.pendingCount > 0) {
        this.triggerQueueProcessing(clinicId);
      }
    }, 30000);

    if (typeof window !== 'undefined') {
      // Armazena o handler como propriedade da classe para permitir remoção correta no stopPeriodicSync.
      // Sem isso, a cada troca de consultório (setActiveClinicId), acumulam-se closures na window.
      this.focusOrOnlineHandler = () => {
        const now = Date.now();
        // Throttle: só faz fullSync no foco se tiver passado mais de 30 segundos desde o último sync
        if (now - this.lastSyncTimestamp < 30000) return;
        if (navigator.onLine && !this.syncInProgress) {
          this.lastSyncTimestamp = now;
          this.triggerQueueProcessing(clinicId);
          this.fullSync(clinicId, getLocal, setLocal);
        }
      };
      window.addEventListener('online', this.focusOrOnlineHandler);
      window.addEventListener('focus', this.focusOrOnlineHandler);
    }
  }

  stopPeriodicSync(): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }
    if (this.queueProcessorTimer) {
      clearInterval(this.queueProcessorTimer);
      this.queueProcessorTimer = null;
    }
    // Remove os listeners de janela para evitar acúmulo de closures a cada troca de consultório
    if (this.focusOrOnlineHandler && typeof window !== 'undefined') {
      window.removeEventListener('online', this.focusOrOnlineHandler);
      window.removeEventListener('focus', this.focusOrOnlineHandler);
      this.focusOrOnlineHandler = null;
    }
  }

  private mergeDataWithTombstones(
    serverData: any[],
    localData: any[],
    tombstones: Record<string, string>,
    entity?: SyncEntity
  ): { merged: any[]; hasLocalChanges: boolean } {
    const map = new Map<string, any>();
    let hasLocalChanges = false;

    // 1. Carrega dados do servidor que não estão com tombstone
    for (const rawItem of serverData) {
      const item = (rawItem && rawItem.data && typeof rawItem.data === 'object' && rawItem.storageKey)
        ? { ...rawItem.data, id: rawItem.data.id || rawItem.id }
        : rawItem;
      if (item && item.id && !tombstones[item.id] && !item._deleted) {
        map.set(item.id, item);
      }
    }

    // 2. Mescla dados locais
    for (const rawItem of localData) {
      const item = (rawItem && rawItem.data && typeof rawItem.data === 'object' && rawItem.storageKey)
        ? { ...rawItem.data, id: rawItem.data.id || rawItem.id }
        : rawItem;
      if (!item || !item.id) continue;

      // Se o item local foi deletado ou existe lápide no servidor
      if (tombstones[item.id]) {
        const tombTime = new Date(tombstones[item.id]).getTime();
        const localTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
        if (localTime <= tombTime) {
          // Lápide é mais recente ou igual: expurga local
          map.delete(item.id);
          continue;
        }
      }

      if (item._deleted) {
        map.delete(item.id);
        continue;
      }

      const existing = map.get(item.id);
      if (!existing) {
        map.set(item.id, item);
        hasLocalChanges = true;
      } else {
        // Se for agendamento, preserva precedência de status clínico (completed > in_consultation > called > ...)
        if (entity === 'appointments' && existing.status && item.status) {
          const resolvedStatus = mergeAppointmentStatuses(existing.status, item.status);
          const existingTs = existing.updatedAt || existing.createdAt || '';
          const localTs = item.updatedAt || item.createdAt || '';
          
          let baseRecord = localTs > existingTs ? { ...existing, ...item } : { ...item, ...existing };
          baseRecord.status = resolvedStatus;

          // Preserva timestamps de marcos operacionais mais avançados
          if (existing.checkInAt || item.checkInAt) baseRecord.checkInAt = item.checkInAt || existing.checkInAt;
          if (existing.calledAt || item.calledAt) baseRecord.calledAt = item.calledAt || existing.calledAt;
          if (existing.startedAt || item.startedAt) baseRecord.startedAt = item.startedAt || existing.startedAt;
          if (existing.completedAt || item.completedAt) baseRecord.completedAt = item.completedAt || existing.completedAt;

          map.set(item.id, baseRecord);
          if (localTs > existingTs || resolvedStatus !== existing.status) {
            hasLocalChanges = true;
          }
        } else {
          const existingTs = existing.updatedAt || existing.createdAt || '';
          const localTs = item.updatedAt || item.createdAt || '';
          if (localTs > existingTs) {
            // Registro local mais recente
            map.set(item.id, item);
            hasLocalChanges = true;
          }
        }
      }
    }

    return { merged: Array.from(map.values()), hasLocalChanges };
  }

  /**
   * Limpa a fila de mutações offline durável
   */
  public clearQueue(): void {
    syncQueue.clearQueue();
    this.pendingCount = 0;
    this.notify('synced', 0);
  }
}

export const remoteSync = new RemoteSyncService();
