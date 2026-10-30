import { 
  Patient, 
  ClinicalEpisode,
  EpisodeStatus,
  ClinicalEncounter, 
  Prescription, 
  AuditLogEntry,
  Appointment,
  AppointmentStatus,
  ClinicConfig,
  ClinicUnit,
  UserAccount,
  ReturnReminder,
  ReportStats,
  AgeGroupDistribution,
  calculateAge,
  FinancialTransaction,
  POSItem,
  CashRegisterSession,
  CashRegisterSummary,
  ProfessionalContractType,
  ProfessionalWorkSession,
  ProfessionalSettlementReport,
  ExaminerFixedPeriod,
  ExaminerSpecialPeriod,
  ExaminerAvulsoRule,
  ExaminerRemunerationRecord,
  ExaminerClosureRecord,
  RemunerationStatus,
  ClinicalEvolution,
  MedicalPrescriptionRecord,
  ClinicalDocumentRecord,
  canTransitionAppointmentStatus,
  mergeAppointmentStatuses,
  toCents,
  fromCents,
  safeSum,
  safeSub
} from '@optotipo/shared';
import { RECOVERED_RECORDS } from '../data/recoveredClinicalData';
import { SEED_APPOINTMENTS_12_09_2026, SEED_PATIENTS_12_09_2026, SCHEDULE_DATE_12_09_2026 } from '../data/schedule12092026';
import { remoteSync, type SyncEntity } from './remoteSync';
import { syncQueue } from './syncQueueService';
import { 
  evaluateDuplicateMatch, 
  DuplicateCandidateMatch, 
  GlobalPatientIdentity, 
  PatientLinkAuditLog,
  normalizeDocumentNumber,
  normalizePhoneNumber,
  normalizePersonName
} from '@optotipo/shared';
import { indexedDbStorage } from './indexedDbStorage';
import { examinerRemunerationService } from './examinerRemunerationService';
export const DEFAULT_CLINICS: ClinicConfig[] = [
  {
    id: 'ivs',
    code: 'IVS',
    name: 'IVS - Instituto da Visão e Saúde',
    tagline: 'Oftalmologia Especializada & Exames Avançados',
    primaryColor: '#2563EB', // Blue
    city: 'Ponta Porã',
    country: 'Brasil',
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
    language: 'pt-BR',
    defaultLanguage: 'pt-BR',
    defaultCurrency: 'BRL',
    status: 'active',
    address: 'Av. Jorge Schimmelpfeng, 500',
    phone: '+55 (45) 3522-1000',
    clinicalSettings: {
      defaultConsultationDurationMinutes: 30,
      optotypeDistanceMeters: 6,
      enableSmartTV: true,
      enableRemoteControl: true
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-09-24T00:00:00.000Z'
  },
  {
    id: 'megastar',
    code: 'MEGA_STAR',
    name: 'Mega Star Consultório Oftalmológico',
    tagline: 'Centro de Diagnóstico e Refração Visual',
    primaryColor: '#7C3AED', // Purple
    city: 'Pedro Juan Caballero',
    country: 'Paraguai',
    timezone: 'America/Asuncion',
    currency: 'PYG',
    language: 'es-PY',
    defaultLanguage: 'es-PY',
    defaultCurrency: 'PYG',
    status: 'active',
    address: 'Shopping Mega Star, Piso 3',
    phone: '+595 981 123456',
    clinicalSettings: {
      defaultConsultationDurationMinutes: 30,
      optotypeDistanceMeters: 6,
      enableSmartTV: true,
      enableRemoteControl: true
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-09-24T00:00:00.000Z'
  },
  {
    id: 'vision',
    code: 'VISUAL',
    name: 'Visual Clínica dos Olhos',
    tagline: 'Excelência em Optometria e Contatologia Especializada',
    primaryColor: '#059669', // Emerald Green
    city: 'Pedro Juan Caballero',
    country: 'Paraguai',
    timezone: 'America/Asuncion',
    currency: 'PYG',
    language: 'es-PY',
    defaultLanguage: 'es-PY',
    defaultCurrency: 'PYG',
    status: 'active',
    address: 'Av. Dr. Francia / Centro Médico Visual',
    phone: '+595 981 302850',
    clinicalSettings: {
      defaultConsultationDurationMinutes: 30,
      optotypeDistanceMeters: 6,
      enableSmartTV: true,
      enableRemoteControl: true
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-09-24T00:00:00.000Z'
  },
  {
    id: 'stillo-itamarati',
    code: 'STILLO',
    name: 'Clínica Stillo Itamarati',
    tagline: 'Atendimento Oftalmológico Especializado - Distrito de Itamarati',
    primaryColor: '#D97706', // Amber / Gold
    city: 'Ponta Porã / Itamarati',
    country: 'Brasil',
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
    language: 'pt-BR',
    defaultLanguage: 'pt-BR',
    defaultCurrency: 'BRL',
    status: 'active',
    address: 'Distrito Nova Itamarati',
    phone: '+55 (67) 99999-0000',
    clinicalSettings: {
      defaultConsultationDurationMinutes: 15,
      optotypeDistanceMeters: 6,
      enableSmartTV: true,
      enableRemoteControl: true
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-09-26T00:00:00.000Z'
  },
  {
    id: 'outro',
    code: 'OUTRO',
    name: 'Consultório Dr. Meirelles',
    tagline: 'Atendimento Clínico Personalizado',
    primaryColor: '#EA580C', // Amber/Orange
    city: 'Ponta Porã',
    country: 'Brasil',
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
    language: 'pt-BR',
    defaultLanguage: 'pt-BR',
    defaultCurrency: 'BRL',
    status: 'active',
    address: 'Centro Médico Integrado, Sala 402',
    phone: '+55 (45) 99999-8888',
    clinicalSettings: {
      defaultConsultationDurationMinutes: 30,
      optotypeDistanceMeters: 6,
      enableSmartTV: true,
      enableRemoteControl: true
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-09-24T00:00:00.000Z'
  }
];

const DB_CLINICS_KEY = 'optotipo_clinics_config_v2';
const DB_ACTIVE_CLINIC_ID_KEY = 'optotipo_active_clinic_id_v2';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Entidades que podem ser evictadas do localStorage para liberar espaço (SOMENTE dados não clínicos — NUNCA apagar prontuários)
// Ordem de prioridade: menos críticas primeiro
// AVISO: encounters, episodes, prescriptions, evolutions, clinical_documents NUNCA devem ser evictados
const EVICTABLE_ENTITIES = ['audit_logs', 'work_sessions', 'pos_items'] as const;

// Chaves do localStorage que NUNCA devem ser evictadas (auth, config, flags)
const PROTECTED_KEY_PREFIXES = ['optotipo_clinical_auth_', 'optotipo_active_clinic_', 'optotipo_clinics_config', 'optomed_'];

/**
 * Função global de sanitização e desempacotamento de registros (self-healing cache).
 * Se um registro estiver envelopado ({ storageKey, clinicId, id, data: { ... } }),
 * extrai os campos reais do objeto interno 'data' para a raiz.
 */
export function unwrapEntityRecord<T = any>(item: any): T {
  if (!item || typeof item !== 'object') return item;
  if (item.data && typeof item.data === 'object') {
    const inner = item.data;
    return {
      ...inner,
      id: inner.id || item.id,
      clinicId: inner.clinicId || item.clinicId,
      updatedAt: inner.updatedAt || item.updatedAt
    } as T;
  }
  return item as T;
}

export function sanitizeEntityList<T = any>(list: any[]): T[] {
  if (!Array.isArray(list)) return [];
  return list.map(item => unwrapEntityRecord<T>(item));
}

class OfflineDatabaseService {
  private activeClinicId: string = 'ivs';
  private syncChannel: BroadcastChannel | null = null;
  /** Chaves que foram migradas para IndexedDB-only por falta de espaço no localStorage */
  private idbOnlyKeys: Set<string> = new Set();

  /**
   * Wrapper seguro para localStorage.setItem() que captura QuotaExceededError.
   * Estratégia de fallback em 3 camadas:
   * 1. Tenta gravar normalmente no localStorage
   * 2. Se falhar, tenta evictar dados antigos/menos críticos e regravar
   * 3. Se ainda falhar, marca a chave como IndexedDB-only (dados ficam seguros no IDB)
   * Nunca lança exceção — garante que o app não trava.
   */
  private safeSetItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      this.idbOnlyKeys.delete(key);
      return true;
    } catch (e: any) {
      if (e?.name === 'QuotaExceededError' || e?.code === 22 || e?.code === 1014) {
        console.warn(`[OfflineDb] QuotaExceededError ao gravar "${key}" (${(value.length / 1024).toFixed(0)}KB). Tentando liberar espaço...`);
        
        // Camada 2: tentar evictar dados menos críticos de outras entidades
        const freed = this.evictLeastCriticalData(key);
        if (freed) {
          try {
            localStorage.setItem(key, value);
            this.idbOnlyKeys.delete(key);
            console.info(`[OfflineDb] Espaço liberado com sucesso. "${key}" gravado no localStorage.`);
            return true;
          } catch {
            // Ainda não coube — vai para camada 3
          }
        }

        // Camada 3: remover esta chave do localStorage e marcar como IDB-only
        try { localStorage.removeItem(key); } catch {}
        this.idbOnlyKeys.add(key);
        console.warn(`[OfflineDb] "${key}" migrado para IndexedDB-only. Dados seguros no IDB.`);
        return false;
      }
      // Outros erros (ex: localStorage desabilitado em modo privado)
      console.warn(`[OfflineDb] Erro inesperado ao gravar "${key}":`, e);
      return false;
    }
  }

  /**
   * Enfileira mutação clínica/financeira no Outbox durável e aciona o despachante autônomo.
   * Garante idempotência e persistência antes do envio pela rede.
   */
  public enqueueOutboxMutation(
    clinicId: string, 
    entity: SyncEntity, 
    action: 'create' | 'update' | 'delete' | 'upsert', 
    recordId: string, 
    payload: any
  ): string {
    const queueItem = syncQueue.enqueue({
      clinicId,
      entity,
      action,
      recordId,
      payload
    });
    // Dispara o processamento imediato em background de forma autônoma
    remoteSync.triggerQueueProcessing(clinicId).catch(() => {});
    return queueItem.operationId;
  }

  /**
   * Tenta liberar espaço no localStorage evictando dados de entidades menos críticas.
   * Dados evictados são preservados no IndexedDB e no servidor (via sync anterior).
   * @returns true se algum espaço foi liberado
   */
  private evictLeastCriticalData(protectedKey: string): boolean {
    let freedSomething = false;
    const clinicIds = ['ivs', 'clinica-principal', 'vision', 'central', 'megastar'];
    
    for (const entity of EVICTABLE_ENTITIES) {
      for (const cid of clinicIds) {
        const entityKey = `optotipo_${cid}_${entity}_v2`;
        if (entityKey === protectedKey) continue; // Não evictar a própria chave que estamos tentando gravar
        
        try {
          const existing = localStorage.getItem(entityKey);
          if (existing && existing.length > 1024) { // Só evicta se for significativo (>1KB)
            localStorage.removeItem(entityKey);
            this.idbOnlyKeys.add(entityKey);
            freedSomething = true;
            console.info(`[OfflineDb] Evictado "${entityKey}" (${(existing.length / 1024).toFixed(0)}KB) do localStorage → IndexedDB-only`);
            
            // Tenta retornar cedo se já liberou espaço suficiente
            try {
              // Teste: consegue gravar 100KB?
              const testKey = '__optomed_quota_test__';
              localStorage.setItem(testKey, 'x'.repeat(102400));
              localStorage.removeItem(testKey);
              return true; // Espaço suficiente liberado
            } catch {
              // Precisa evictar mais
            }
          }
        } catch {}
      }
    }
    return freedSomething;
  }

  constructor() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.syncChannel = new BroadcastChannel('optomed_clinical_offline_db_sync');
        this.syncChannel.onmessage = (event) => {
          if (event.data && event.data.type && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(event.data.type, { detail: event.data.detail }));
          }
        };
      }

      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(DB_ACTIVE_CLINIC_ID_KEY);
        // Migração e espelhamento resiliente assíncrono para IndexedDB
        indexedDbStorage.migrateFromLocalStorage().catch(e => console.warn('[IndexedDB] Migração inicial:', e));
        if (saved) {
          this.activeClinicId = saved;
        }
        
        // Auto-recuperação de todos os pacientes e prontuários históricos desde 25/08/2026 e 18/09/2026
        const recoveryFlagKey = 'optomed_historical_recovery_2026_v2';
        if (!localStorage.getItem(recoveryFlagKey)) {
          this.restoreRecoveredHistoricalData();
          this.safeSetItem(recoveryFlagKey, 'true');
        }

        // Semeador automático da agenda de 12/09/2026 (Exclusivo para a clínica IVS)
        const scheduleFlagKey = 'optomed_schedule_seed_12092026_v3';
        if (!localStorage.getItem(scheduleFlagKey)) {
          this.seedSchedule12092026('ivs');
          this.cleanupVisionContamination();
          this.safeSetItem(scheduleFlagKey, 'true');
        }
      }

      // Sincronização inicial com o servidor — busca dados remotos e mescla
      this.initRemoteSync();

      // Hidratação assíncrona: recupera dados do IndexedDB que podem ter sido evictados do localStorage
      this.hydrateFromIndexedDb();
    } catch (err) {
      console.warn('[OfflineDb] Aviso na inicialização do storage:', err);
      this.activeClinicId = 'ivs';
    }
  }

  /**
   * Recupera dados do IndexedDB para o localStorage quando este está vazio para uma entidade.
   * Funciona como rede de segurança: se o localStorage foi limpo (quota, clear manual, etc.),
   * os dados salvos no IndexedDB são restaurados automaticamente.
   */
  private async hydrateFromIndexedDb(): Promise<void> {
    const clinicIds = ['ivs', 'clinica-principal', 'vision', 'central', 'megastar'];
    const entities: Array<{ name: string; store: string; event?: string }> = [
      { name: 'episodes', store: 'episodes', event: 'optomed_episode_updated' },
      { name: 'patients', store: 'patients', event: 'optomed_patient_updated' },
      { name: 'encounters', store: 'encounters', event: 'optomed_encounter_updated' },
      { name: 'appointments', store: 'appointments', event: 'optomed_appointment_updated' },
      { name: 'prescriptions', store: 'prescriptions' },
      { name: 'evolutions', store: 'evolutions', event: 'optomed_evolution_updated' },
      { name: 'clinical_documents', store: 'clinical_documents', event: 'optomed_document_updated' },
    ];

    try {
      const ready = await indexedDbStorage.init();
      if (!ready) return;

      for (const cid of clinicIds) {
        for (const { name, store, event } of entities) {
          try {
            const lsKey = this.getKey(name, cid);
            const existing = localStorage.getItem(lsKey);
            // Se localStorage já tem dados, não precisa hidratar
            if (existing && existing.length > 2) continue; // "[]" tem length 2

            const idbData = await indexedDbStorage.getAll(store as any, cid);
            if (idbData && idbData.length > 0) {
              console.info(`[OfflineDb] Hidratando "${lsKey}" do IndexedDB (${idbData.length} registros)`);
              // Tenta gravar no localStorage, se não couber, marca como IDB-only
              this.safeSetItem(lsKey, JSON.stringify(idbData));
              // Dispara evento para que a UI recarregue os dados
              if (event && typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent(event, { detail: { clinicId: cid } }));
              }
            }
          } catch {}
        }
      }
    } catch (e) {
      console.warn('[OfflineDb] Hidratação IndexedDB falhou:', e);
    }
  }

  private initRemoteSync() {
    // Inicia sync exclusivamente da clínica ativa/autorizada da sessão
    setTimeout(() => {
      const clinicId = this.activeClinicId;
      remoteSync.startPeriodicSync(clinicId, this.getSyncGetLocal(clinicId), this.getSyncSetLocal(clinicId));
    }, 800);
  }

  private getSyncGetLocal(clinicId: string) {
    return (entity: string) => {
      if (entity === 'patients') return this.getPatients(clinicId);
      if (entity === 'episodes') return this.getEpisodes(clinicId);
      if (entity === 'encounters') return this.getEncounters(clinicId);
      if (entity === 'appointments') return this.getAppointments(clinicId);
      if (entity === 'prescriptions') return this.getPrescriptions(clinicId);
      if (entity === 'transactions') return this.getTransactions(clinicId);
      if (entity === 'work_sessions') return this.getWorkSessions(clinicId);
      if (entity === 'pos_items') return this.getPOSItems(clinicId);
      if (entity === 'audit_logs') return this.getAuditLogs(clinicId);
      if (entity === 'evolutions') return this.getEvolutions(clinicId);
      if (entity === 'clinical_documents') return this.getClinicalDocuments(clinicId);
      if (entity === 'examiner_fixed_periods') return this.getExaminerFixedPeriods(clinicId);
      if (entity === 'examiner_special_periods') return this.getExaminerSpecialPeriods(clinicId);
      if (entity === 'examiner_avulso_rules') return this.getExaminerAvulsoRules(clinicId);
      if (entity === 'examiner_remunerations') return this.getExaminerRemunerations(clinicId);
      if (entity === 'examiner_closures') return this.getExaminerClosures(clinicId);
      return [];
    };
  }

  private getSyncSetLocal(clinicId: string) {
    return (entity: string, data: any[]) => {
      const key = entity === 'transactions' 
        ? this.getKey('financial_transactions', clinicId)
        : this.getKey(entity, clinicId);
      
      // Gravar no localStorage com proteção contra QuotaExceededError
      this.safeSetItem(key, JSON.stringify(data));
      
      // Gravar simultaneamente no IndexedDB (capacidade ilimitada, fallback seguro)
      const idbStore = entity as any;
      if (Array.isArray(data) && data.length > 0 && data[0]?.id) {
        indexedDbStorage.saveAll(idbStore, clinicId, data).catch(e => 
          console.warn(`[IndexedDB] sync setLocal ${entity}:`, e)
        );
      }

      // Broadcast de atualização por tipo de entidade
      const broadcastMap: Record<string, string> = {
        patients: 'optomed_patient_updated',
        episodes: 'optomed_episode_updated',
        encounters: 'optomed_encounter_updated',
        appointments: 'optomed_appointment_updated',
        transactions: 'optomed_finance_updated',
        evolutions: 'optomed_evolution_updated',
        clinical_documents: 'optomed_document_updated',
        examiner_fixed_periods: 'optomed_examiner_periods_updated',
        examiner_special_periods: 'optomed_examiner_periods_updated',
        examiner_avulso_rules: 'optomed_examiner_periods_updated',
        examiner_remunerations: 'optomed_examiner_remuneration_updated',
        examiner_closures: 'optomed_examiner_closures_updated'
      };
      const eventName = broadcastMap[entity];
      if (eventName) {
        this.broadcastSync(eventName, { clinicId });
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(eventName, { detail: { clinicId } }));
      }
    };
  }


  private broadcastSync(type: string, detail: any) {
    if (this.syncChannel) {
      try {
        this.syncChannel.postMessage({ type, detail });
      } catch {}
    }
  }

  // --- GERENCIAMENTO MULTI-CLÍNICA (BANCOS ISOLADOS) ---
  public getActiveClinicId(): string {
    return this.activeClinicId;
  }

  public setActiveClinicId(clinicId: string): void {
    if (!clinicId) return;
    this.activeClinicId = clinicId;
    try {
      this.safeSetItem(DB_ACTIVE_CLINIC_ID_KEY, clinicId);
      remoteSync.stopPeriodicSync();
      remoteSync.startPeriodicSync(clinicId, this.getSyncGetLocal(clinicId) as any, this.getSyncSetLocal(clinicId) as any);
      remoteSync.fullSync(clinicId, this.getSyncGetLocal(clinicId) as any, this.getSyncSetLocal(clinicId) as any);
    } catch {}
  }

  // --- MULTI-CLÍNICA / CONFIGURAÇÃO DE CONSULTÓRIOS ---
  public getClinics(): ClinicConfig[] {
    try {
      const raw = localStorage.getItem(DB_CLINICS_KEY);
      if (!raw) {
        this.saveClinics(DEFAULT_CLINICS);
        return DEFAULT_CLINICS;
      }
      const parsed: ClinicConfig[] = JSON.parse(raw);
      // Garantir atualização das cidades das clínicas e integridade de dados
      let modified = false;
      const updated: ClinicConfig[] = parsed.map(c => {
        let clinicModified = false;
        let newCity = c.city;
        if (!newCity || newCity === 'Foz do Iguaçu') {
          newCity = 'Ponta Porã';
          clinicModified = true;
        } else if (newCity === 'Ciudad del Este' || newCity === 'Pedro Juan Caballero / Ciudad del Este') {
          newCity = 'Pedro Juan Caballero';
          clinicModified = true;
        }

        if (c.id === 'vision' || c.code === 'VISION' || c.code === 'VISUAL') {
          const currentName = c.name || '';
          if (currentName.includes('Vision') || !currentName.includes('Visual') || clinicModified) {
            modified = true;
            return {
              ...c,
              code: 'VISUAL',
              name: 'Visual Clínica dos Olhos',
              tagline: 'Excelência em Optometria e Contatologia Especializada',
              address: 'Av. Dr. Francia / Centro Médico Visual',
              country: 'Paraguai' as const,
              defaultLanguage: 'es-PY' as const,
              defaultCurrency: 'PYG' as const,
              city: newCity
            };
          }
        }

        if (clinicModified) {
          modified = true;
          return {
            ...c,
            city: newCity
          };
        }

        return c;
      });

      // Garantir presença da Clínica Stillo Itamarati se não constar no cache
      if (!updated.some(c => c.id === 'stillo-itamarati')) {
        const stilloClinic = DEFAULT_CLINICS.find(c => c.id === 'stillo-itamarati');
        if (stilloClinic) {
          updated.push(stilloClinic);
          modified = true;
        }
      }

      if (modified) {
        this.saveClinics(updated);
      }
      return updated;
    } catch {
      return DEFAULT_CLINICS;
    }
  }

  public saveClinics(clinics: ClinicConfig[]): void {
    try {
      this.safeSetItem(DB_CLINICS_KEY, JSON.stringify(clinics));
    } catch {}
  }

  public saveClinic(clinic: ClinicConfig | ClinicUnit): ClinicConfig {
    const list = this.getClinics();
    const idx = list.findIndex(c => c.id === clinic.id);
    const now = new Date().toISOString();

    const prepared: ClinicConfig = {
      ...clinic,
      timezone: clinic.timezone || (clinic.country === 'Paraguai' ? 'America/Asuncion' : 'America/Sao_Paulo'),
      currency: clinic.currency || (clinic.country === 'Paraguai' ? 'PYG' : 'BRL'),
      language: clinic.language || (clinic.country === 'Paraguai' ? 'es-PY' : 'pt-BR'),
      defaultLanguage: (clinic as any).defaultLanguage || clinic.language || (clinic.country === 'Paraguai' ? 'es-PY' : 'pt-BR'),
      defaultCurrency: (clinic as any).defaultCurrency || clinic.currency || (clinic.country === 'Paraguai' ? 'PYG' : 'BRL'),
      status: clinic.status || 'active',
      createdAt: clinic.createdAt || now,
      updatedAt: now
    };

    if (idx >= 0) {
      list[idx] = prepared;
    } else {
      list.push(prepared);
    }
    this.saveClinics(list);
    return prepared;
  }

  public getClinicById(id: string): ClinicConfig | undefined {
    return this.getClinics().find(c => c.id === id);
  }

  public getActiveClinic(): ClinicConfig {
    const clinics = this.getClinics();
    return clinics.find(c => c.id === this.activeClinicId) || clinics[0] || DEFAULT_CLINICS[0];
  }

  // Chaves de banco isoladas por consultório
  private getKey(base: string, clinicId = this.activeClinicId): string {
    return `optotipo_${clinicId}_${base}_v2`;
  }

  // --- PACIENTES ---
  public getPatients(clinicId = this.activeClinicId): Patient[] {
    try {
      const raw = localStorage.getItem(this.getKey('patients', clinicId));
      if (!raw) {
        // Inicializa se vazio para a clínica no cache local sem sobrescrever o servidor central
        const initial = this.getInitialPatientsForClinic(clinicId);
        this.safeSetItem(this.getKey('patients', clinicId), JSON.stringify(initial));
        return initial;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        let hasWrapped = false;
        const cleaned = parsed.map(item => {
          if (item && item.data && typeof item.data === 'object') {
            hasWrapped = true;
            return unwrapEntityRecord<Patient>(item);
          }
          return item;
        });
        if (hasWrapped) {
          this.safeSetItem(this.getKey('patients', clinicId), JSON.stringify(cleaned));
        }
        return cleaned;
      }
      return [];
    } catch {
      return [];
    }
  }

  public savePatients(patients: Patient[], clinicId = this.activeClinicId): void {
    this.safeSetItem(this.getKey('patients', clinicId), JSON.stringify(patients));
    // Persistência dual resiliente em IndexedDB
    indexedDbStorage.saveAll('patients', clinicId, patients).catch(e => console.warn('[IndexedDB] savePatients:', e));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_patient_updated', { detail: { clinicId, patients } }));
    }
    this.broadcastSync('optomed_patient_updated', { clinicId, patients });
    remoteSync.push(clinicId, 'patients', patients);
  }

  public savePatient(patient: Patient, clinicId = this.activeClinicId): void {
    // Garante que o paciente possua um patientGlobalId retrocompatível
    const patientWithGlobalId: Patient = {
      ...patient,
      patientGlobalId: patient.patientGlobalId || `gid_${Date.now()}_${generateUUID().substring(0, 8)}`
    };

    const list = this.getPatients(clinicId);
    const idx = list.findIndex(p => p.id === patientWithGlobalId.id);
    if (idx >= 0) {
      list[idx] = { ...patientWithGlobalId, updatedAt: new Date().toISOString() };
    } else {
      list.unshift(patientWithGlobalId);
    }
    this.savePatients(list, clinicId);
    this.logAudit('UPDATE', 'PATIENT', patient.id, `Atualizado cadastro de ${patient.fullName}`, clinicId);
    this.enqueueOutboxMutation(clinicId, 'patients', idx >= 0 ? 'update' : 'create', patientWithGlobalId.id, patientWithGlobalId);
    remoteSync.upsert(clinicId, 'patients', patientWithGlobalId).catch(e => console.warn('[Sync] upsert patient:', e));

    // Sincronização em tempo real com os agendamentos existentes deste paciente
    try {
      const aptList = this.getAppointments(clinicId);
      let modified = false;
      const updatedApts = aptList.map(a => {
        if (a.patientId === patient.id || (patient.fullName && a.patientName.trim().toLowerCase() === patient.fullName.trim().toLowerCase())) {
          modified = true;
          return {
            ...a,
            patientId: patient.id,
            patientName: patient.fullName,
            patientPhone: patient.phone || a.patientPhone,
            patientNationality: patient.nationality || a.patientNationality,
            patientDocument: patient.documentNumber || a.patientDocument,
            updatedAt: new Date().toISOString()
          };
        }
        return a;
      });
      if (modified) {
        this.saveAppointments(updatedApts, clinicId);
      }
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_patient_updated', { detail: { clinicId, patient } }));
    }
  }

  public deletePatient(patientId: string, clinicId = this.activeClinicId): void {
    const list = this.getPatients(clinicId).filter(p => p.id !== patientId);
    this.savePatients(list, clinicId);
    // Notifica remoção com tombstone para propagação durável e Outbox
    this.enqueueOutboxMutation(clinicId, 'patients', 'delete', patientId, { id: patientId, _deleted: true });
    remoteSync.remove(clinicId, 'patients', patientId).catch(e => console.warn('[Sync] deletePatient remove:', e));
    this.logAudit('DELETE', 'PATIENT', patientId, 'Registro de paciente removido', clinicId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_patient_updated', { detail: { clinicId, patientId } }));
    }
  }


  // --- IDENTIDADE GLOBAL E DETECÇÃO SEGURA DE DUPLICIDADES (FASE 3.2) ---

  /**
   * Procura candidatos a duplicidade no banco local entre todas as clínicas ou na clínica informada
   */
  public findDuplicateCandidates(
    candidate: {
      fullName: string;
      birthDate?: string;
      documentType?: string;
      documentNumber?: string;
      phone?: string;
      phoneCountryCode?: string;
    },
    ignorePatientId?: string,
    targetClinicId?: string
  ): DuplicateCandidateMatch[] {
    const clinicsToSearch = targetClinicId ? [targetClinicId] : this.getClinics().map(c => c.id);
    const candidates: DuplicateCandidateMatch[] = [];

    for (const cid of clinicsToSearch) {
      const patients = this.getPatients(cid);
      for (const p of patients) {
        if (ignorePatientId && p.id === ignorePatientId) continue;
        const match = evaluateDuplicateMatch(candidate, {
          ...p,
          clinicId: cid
        });
        if (match) {
          candidates.push(match);
        }
      }
    }

    return candidates.sort((a, b) => b.score - a.score);
  }

  /**
   * Confirma vínculo manual de dois registros locais sob o mesmo patientGlobalId com auditoria
   */
  public linkPatients(
    sourcePatientId: string,
    sourceClinicId: string,
    targetPatientId: string,
    targetClinicId: string,
    userId = 'dr-meirelles',
    userName = 'Dr. Rudson Meirelles',
    reason = 'Vínculo manual confirmado pelo examinador'
  ): { success: boolean; sharedGlobalId: string } {
    const sourceList = this.getPatients(sourceClinicId);
    const sourcePatient = sourceList.find(p => p.id === sourcePatientId);

    const targetList = this.getPatients(targetClinicId);
    const targetPatient = targetList.find(p => p.id === targetPatientId);

    if (!sourcePatient || !targetPatient) {
      return { success: false, sharedGlobalId: '' };
    }

    // O patientGlobalId compartilhado prevalece (se um já tiver, adota ele)
    const sharedGlobalId = targetPatient.patientGlobalId || sourcePatient.patientGlobalId || `gid_${Date.now()}_${generateUUID().substring(0, 8)}`;

    sourcePatient.patientGlobalId = sharedGlobalId;
    sourcePatient.updatedAt = new Date().toISOString();
    this.savePatients(sourceList, sourceClinicId);

    targetPatient.patientGlobalId = sharedGlobalId;
    targetPatient.updatedAt = new Date().toISOString();
    this.savePatients(targetList, targetClinicId);

    // Registra log de auditoria do vínculo
    this.logLinkAudit({
      id: generateUUID(),
      action: 'LINK_CONFIRMED',
      patientGlobalId: sharedGlobalId,
      targetPatientId,
      targetClinicId,
      userId,
      userName,
      timestamp: new Date().toISOString(),
      reason
    });

    return { success: true, sharedGlobalId };
  }

  /**
   * Desfaz um vínculo manual com atribuição de novo patientGlobalId exclusivo e auditoria
   */
  public unlinkPatient(
    patientId: string,
    clinicId: string,
    userId = 'dr-meirelles',
    userName = 'Dr. Rudson Meirelles',
    reason = 'Desfeita associação manual incorreta'
  ): { success: boolean; newGlobalId: string } {
    const list = this.getPatients(clinicId);
    const patient = list.find(p => p.id === patientId);
    if (!patient) return { success: false, newGlobalId: '' };

    const oldGlobalId = patient.patientGlobalId || '';
    const newGlobalId = `gid_${Date.now()}_${generateUUID().substring(0, 8)}`;

    patient.patientGlobalId = newGlobalId;
    patient.updatedAt = new Date().toISOString();
    this.savePatients(list, clinicId);

    this.logLinkAudit({
      id: generateUUID(),
      action: 'LINK_UNDONE',
      patientGlobalId: oldGlobalId,
      targetPatientId: patientId,
      targetClinicId: clinicId,
      userId,
      userName,
      timestamp: new Date().toISOString(),
      reason: `${reason} -> Atribuído novo ID global: ${newGlobalId}`
    });

    return { success: true, newGlobalId };
  }

  private logLinkAudit(entry: PatientLinkAuditLog): void {
    try {
      const key = 'optomed_patient_link_audit_logs_v2';
      const raw = localStorage.getItem(key);
      const list: PatientLinkAuditLog[] = raw ? JSON.parse(raw) : [];
      list.unshift(entry);
      this.safeSetItem(key, JSON.stringify(list.slice(0, 500)));
      this.logAudit('UPDATE', 'PATIENT', entry.targetPatientId, `[${entry.action}] ${entry.reason || ''}`, entry.targetClinicId);
    } catch {}
  }

  public getPatientLinkAuditLogs(): PatientLinkAuditLog[] {
    try {
      const key = 'optomed_patient_link_audit_logs_v2';
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // --- EPISÓDIOS CLÍNICOS (LONGITUDINAL) ---
  public getEpisodes(clinicId = this.activeClinicId): ClinicalEpisode[] {
    try {
      const raw = localStorage.getItem(this.getKey('episodes', clinicId));
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveEpisodes(episodes: ClinicalEpisode[], clinicId = this.activeClinicId): void {
    this.safeSetItem(this.getKey('episodes', clinicId), JSON.stringify(episodes));
    indexedDbStorage.saveAll('episodes' as any, clinicId, episodes).catch(e => console.warn('[IndexedDB] saveEpisodes:', e));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_episode_updated', { detail: { clinicId, episodes } }));
    }
    this.broadcastSync('optomed_episode_updated', { clinicId, episodes });
    remoteSync.push(clinicId, 'episodes' as any, episodes);
  }

  public saveEpisode(episode: ClinicalEpisode, clinicId = this.activeClinicId): ClinicalEpisode {
    const list = this.getEpisodes(clinicId);
    const idx = list.findIndex(e => e.id === episode.id);
    const now = new Date().toISOString();
    const prepared: ClinicalEpisode = {
      ...episode,
      clinicId: episode.clinicId || clinicId,
      version: (episode.version || 1) + (idx >= 0 ? 1 : 0),
      updatedAt: now
    };
    if (idx >= 0) {
      list[idx] = prepared;
    } else {
      list.unshift(prepared);
    }
    this.saveEpisodes(list, clinicId);
    this.logAudit(idx >= 0 ? 'UPDATE' : 'CREATE', 'EPISODE', episode.id, `Episódio clínico ${prepared.title} (${prepared.status})`, clinicId);
    return prepared;
  }

  public getEpisodesByPatient(patientId: string, clinicId = this.activeClinicId): ClinicalEpisode[] {
    const all = this.getEpisodes(clinicId);
    const patients = this.getPatients(clinicId);
    const pat = patients.find(p => p.id === patientId);
    const globalId = pat?.patientGlobalId;

    return all.filter(ep => {
      if (ep._deleted) return false;
      if (ep.patientId === patientId) return true;
      if (globalId && ep.patientGlobalId === globalId) return true;
      return false;
    });
  }

  public getOrCreateActiveEpisode(patientId: string, title?: string, clinicId = this.activeClinicId): ClinicalEpisode {
    const existingActive = this.getEpisodesByPatient(patientId, clinicId).find(ep => ep.status === 'ACTIVE');
    if (existingActive) return existingActive;

    const patients = this.getPatients(clinicId);
    const pat = patients.find(p => p.id === patientId);

    const newEpisode: ClinicalEpisode = {
      id: generateUUID(),
      clinicId,
      patientId,
      patientGlobalId: pat?.patientGlobalId,
      title: title || 'Atendimento Oftalmológico e Refração',
      status: 'ACTIVE',
      startDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };
    return this.saveEpisode(newEpisode, clinicId);
  }

  public closeEpisode(episodeId: string, clinicId = this.activeClinicId): void {
    const list = this.getEpisodes(clinicId);
    const ep = list.find(e => e.id === episodeId);
    if (!ep) return;
    const now = new Date().toISOString();
    ep.status = 'COMPLETED';
    ep.closedAt = now;
    ep.endDate = now;
    ep.updatedAt = now;
    ep.version = (ep.version || 1) + 1;
    this.saveEpisodes(list, clinicId);
    this.logAudit('UPDATE', 'EPISODE', ep.id, `Episódio clínico concluído`, clinicId);
  }

  // --- TRAVA DE ATENDIMENTO CONCORRENTE / SIMULTÂNEO ---
  public hasActiveEncounter(
    patientId: string, 
    patientGlobalId?: string, 
    excludeEncounterId?: string, 
    clinicId = this.activeClinicId,
    checkAllClinics = false
  ): { active: boolean; encounter?: ClinicalEncounter } {
    const clinicsToScan = checkAllClinics 
      ? this.getClinics().map(c => c.id)
      : [clinicId];

    for (const cid of clinicsToScan) {
      const encounters = this.getEncounters(cid);
      const active = encounters.find(enc => {
        if (excludeEncounterId && enc.id === excludeEncounterId) return false;
        if (enc.status !== 'in_progress') return false;

        const matchesPatientId = enc.patientId === patientId;
        const matchesGlobalId = Boolean(patientGlobalId && enc.patientGlobalId && enc.patientGlobalId === patientGlobalId);
        return matchesPatientId || matchesGlobalId;
      });

      if (active) {
        return { active: true, encounter: active };
      }
    }

    return { active: false };
  }

  // --- PRONTUÁRIOS / ATENDIMENTOS ---
  public getEncounters(clinicId = this.activeClinicId): ClinicalEncounter[] {
    try {
      const raw = localStorage.getItem(this.getKey('encounters', clinicId));
      if (!raw) return [];
      const parsed: any[] = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      let hasWrapped = false;
      const cleaned = parsed.map(rawEnc => {
        let enc = rawEnc;
        if (enc && enc.data && typeof enc.data === 'object') {
          hasWrapped = true;
          enc = unwrapEntityRecord<ClinicalEncounter>(enc);
        }
        if (!enc.episodeId) {
          return { ...enc, episodeId: 'LEGACY_EPISODE' };
        }
        return enc;
      });
      if (hasWrapped) {
        this.safeSetItem(this.getKey('encounters', clinicId), JSON.stringify(cleaned));
      }
      return cleaned;
    } catch {
      return [];
    }
  }

  /**
   * Recupera o Histórico Longitudinal Completo de um Paciente entre todas as Unidades Autorizadas (Fase 7.0)
   * Preserva a clínica de origem de cada atendimento sem mover nem duplicar dados.
   */
  public getUnifiedPatientHistory(
    patientId: string, 
    patientGlobalId?: string,
    allowedClinics: string[] | 'all' = [this.activeClinicId]
  ): {
    encounters: (ClinicalEncounter & { clinicId: string; clinicName: string; country: string })[];
    episodes: (ClinicalEpisode & { clinicId: string; clinicName: string })[];
    prescriptions: (Prescription & { clinicId: string })[];
    documents: (ClinicalDocumentRecord & { clinicId: string })[];
  } {
    const allClinics = this.getClinics();
    const targetClinics = allowedClinics === 'all'
      ? allClinics
      : allClinics.filter(c => Array.isArray(allowedClinics) && allowedClinics.includes(c.id));

    const combinedEncounters: (ClinicalEncounter & { clinicId: string; clinicName: string; country: string })[] = [];
    const combinedEpisodes: (ClinicalEpisode & { clinicId: string; clinicName: string })[] = [];
    const combinedPrescriptions: (Prescription & { clinicId: string })[] = [];
    const combinedDocuments: (ClinicalDocumentRecord & { clinicId: string })[] = [];

    // Se não tiver globalId fornecido, busca no cadastro do paciente na clínica ativa
    let effectiveGlobalId = patientGlobalId;
    if (!effectiveGlobalId) {
      for (const clinic of targetClinics) {
        const pat = this.getPatients(clinic.id).find(p => p.id === patientId);
        if (pat?.patientGlobalId) {
          effectiveGlobalId = pat.patientGlobalId;
          break;
        }
      }
    }

    for (const clinic of targetClinics) {
      const cid = clinic.id;

      // 1. Encontros Clínicos
      const encs = this.getEncounters(cid);
      encs.forEach(enc => {
        const matchesLocal = enc.patientId === patientId;
        const matchesGlobal = Boolean(effectiveGlobalId && enc.patientGlobalId && enc.patientGlobalId === effectiveGlobalId);
        if (matchesLocal || matchesGlobal) {
          combinedEncounters.push({
            ...enc,
            clinicId: cid,
            clinicName: clinic.name,
            country: clinic.country || 'Brasil'
          });
        }
      });

      // 2. Episódios
      const eps = this.getEpisodes(cid);
      eps.forEach(ep => {
        if (ep._deleted) return;
        const matchesLocal = ep.patientId === patientId;
        const matchesGlobal = Boolean(effectiveGlobalId && ep.patientGlobalId && ep.patientGlobalId === effectiveGlobalId);
        if (matchesLocal || matchesGlobal) {
          combinedEpisodes.push({
            ...ep,
            clinicId: cid,
            clinicName: clinic.name
          });
        }
      });

      // 3. Receitas
      const rxs = this.getPrescriptions(cid);
      rxs.forEach(rx => {
        if (rx.patientId === patientId) {
          combinedPrescriptions.push({ ...rx, clinicId: cid });
        }
      });

      // 4. Documentos Clínicos
      const docs = this.getClinicalDocuments(cid);
      docs.forEach(doc => {
        if (doc.patientId === patientId) {
          combinedDocuments.push({ ...doc, clinicId: cid });
        }
      });
    }

    // Ordenação cronológica decrescente dos atendimentos
    combinedEncounters.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    combinedEpisodes.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    return {
      encounters: combinedEncounters,
      episodes: combinedEpisodes,
      prescriptions: combinedPrescriptions,
      documents: combinedDocuments
    };
  }

  public saveEncounters(encounters: ClinicalEncounter[], clinicId = this.activeClinicId): void {
    this.safeSetItem(this.getKey('encounters', clinicId), JSON.stringify(encounters));
    // Persistência dual resiliente em IndexedDB
    indexedDbStorage.saveAll('encounters', clinicId, encounters).catch(e => console.warn('[IndexedDB] saveEncounters:', e));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_encounter_updated', { detail: { clinicId, encounters } }));
    }
    this.broadcastSync('optomed_encounter_updated', { clinicId, encounters });
    remoteSync.push(clinicId, 'encounters', encounters);
  }

  public saveEncounter(encounter: ClinicalEncounter, clinicId = this.activeClinicId): void {
    const list = this.getEncounters(clinicId);
    const idx = list.findIndex(e => e.id === encounter.id);
    const now = new Date().toISOString();

    // Se já estiver concluído anteriormente e tentarem sobrescrever para em andamento sem versão
    if (idx >= 0 && list[idx].status === 'completed' && encounter.status === 'in_progress') {
      console.warn(`[ClinicalEncounter] Bloqueada tentativa de reverter encontro concluído ${encounter.id} sem reabertura explícita`);
      return;
    }

    // Vincular ou criar episódio clínico ativo caso não possua
    let episodeId = encounter.episodeId && encounter.episodeId !== 'LEGACY_EPISODE' ? encounter.episodeId : undefined;
    if (!episodeId) {
      const activeEp = this.getOrCreateActiveEpisode(encounter.patientId, undefined, clinicId);
      episodeId = activeEp.id;
    }

    const preparedEncounter: ClinicalEncounter = {
      ...encounter,
      episodeId,
      version: (encounter.version || (idx >= 0 ? list[idx].version || 1 : 1)) + (idx >= 0 ? 1 : 0),
      startedAt: encounter.startedAt || (idx >= 0 ? list[idx].startedAt : now),
      completedAt: encounter.status === 'completed' ? (encounter.completedAt || now) : encounter.completedAt,
      updatedAt: now
    };

    if (idx >= 0) {
      list[idx] = preparedEncounter;
    } else {
      list.unshift(preparedEncounter);
    }
    this.saveEncounters(list, clinicId);
    this.logAudit('UPDATE', 'ENCOUNTER', encounter.id, `Prontuário clínico atualizado (status: ${preparedEncounter.status}, ep: ${episodeId})`, clinicId);
    this.enqueueOutboxMutation(clinicId, 'encounters', idx >= 0 ? 'update' : 'create', preparedEncounter.id, preparedEncounter);
    remoteSync.upsert(clinicId, 'encounters', preparedEncounter).catch(e => console.warn('[Sync] upsert encounter:', e));

    // Quando o prontuário é atualizado/concluído, sincroniza o status em TODOS os agendamentos correspondentes do paciente
    try {
      const apts = this.getAppointments(clinicId);
      let changed = false;
      const encDateStr = encounter.date ? encounter.date.split('T')[0] : '';
      const patient = this.getPatients(clinicId).find(p => p.id === encounter.patientId);

      const nextApts = apts.map(a => {
        const matchesPatient = (preparedEncounter.appointmentId && a.id === preparedEncounter.appointmentId) ||
          a.patientId === encounter.patientId || 
          (patient && a.patientName.trim().toLowerCase() === patient.fullName.trim().toLowerCase());
        
        // Se coincidir paciente e data (ou data vazia)
        if (matchesPatient && (!encDateStr || a.date === encDateStr || apts.length <= 50)) {
          if (encounter.status === 'completed' && a.status !== 'completed') {
            changed = true;
            const now = new Date().toISOString();
            return { ...a, status: 'completed' as AppointmentStatus, completedAt: a.completedAt || now, updatedAt: now };
          } else if (encounter.status === 'in_progress' && (a.status === 'waiting' || a.status === 'checked_in' || a.status === 'called')) {
            changed = true;
            const now = new Date().toISOString();
            return { ...a, status: 'in_consultation' as AppointmentStatus, startedAt: a.startedAt || now, updatedAt: now };
          }
        }
        return a;
      });

      if (changed) {
        this.saveAppointments(nextApts, clinicId);
      }
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_encounter_updated', { detail: { clinicId, encounter: preparedEncounter } }));
    }
    this.broadcastSync('optomed_encounter_updated', { clinicId, encounter: preparedEncounter });
  }

  // --- RECEITAS ÓPTICAS ---
  public getPrescriptions(clinicId = this.activeClinicId): Prescription[] {
    try {
      const raw = localStorage.getItem(this.getKey('prescriptions', clinicId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        let hasWrapped = false;
        const cleaned = parsed.map(item => {
          if (item && item.data && typeof item.data === 'object') {
            hasWrapped = true;
            return unwrapEntityRecord<Prescription>(item);
          }
          return item;
        });
        if (hasWrapped) {
          this.safeSetItem(this.getKey('prescriptions', clinicId), JSON.stringify(cleaned));
        }
        return cleaned;
      }
      return [];
    } catch {
      return [];
    }
  }

  public savePrescriptions(rxs: Prescription[], clinicId = this.activeClinicId): void {
    this.safeSetItem(this.getKey('prescriptions', clinicId), JSON.stringify(rxs));
    indexedDbStorage.saveAll('prescriptions', clinicId, rxs).catch(e => console.warn('[IndexedDB] savePrescriptions:', e));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_prescription_updated', { detail: { clinicId, prescriptions: rxs } }));
    }
    this.broadcastSync('optomed_prescription_updated', { clinicId, prescriptions: rxs });
    remoteSync.push(clinicId, 'prescriptions', rxs);
  }

  public savePrescription(rx: Prescription, clinicId = this.activeClinicId): Prescription {
    const list = this.getPrescriptions(clinicId);
    const existingIndex = list.findIndex(p => p.id === rx.id);
    const now = new Date().toISOString();

    let targetRx: Prescription;

    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      // FASE 26: Se a receita já foi formalmente emitida/impressa (isIssued === true),
      // não sobrescreve silenciosamente: preserva o histórico criando nova versão rastreada!
      if (existing.isIssued) {
        targetRx = {
          ...rx,
          id: `rx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          version: (existing.version || 1) + 1,
          supersedesId: existing.id,
          clinicId: rx.clinicId || clinicId,
          date: now,
          isIssued: true
        };
        list.unshift(targetRx);
        this.logAudit('CREATE', 'PRESCRIPTION', targetRx.id, `Nova versão emitida de receita óptica v${targetRx.version} (substitui ${existing.id}) para ${targetRx.patientName}`, clinicId);
      } else {
        targetRx = {
          ...rx,
          clinicId: rx.clinicId || clinicId,
          version: rx.version || existing.version || 1
        };
        list[existingIndex] = targetRx;
        this.logAudit('UPDATE', 'PRESCRIPTION', targetRx.id, `Receita óptica rascunho atualizada para ${targetRx.patientName}`, clinicId);
      }
    } else {
      targetRx = {
        ...rx,
        clinicId: rx.clinicId || clinicId,
        version: rx.version || 1,
        date: rx.date || now
      };
      list.unshift(targetRx);
      this.logAudit('CREATE', 'PRESCRIPTION', targetRx.id, `Receita óptica gerada para ${targetRx.patientName}`, clinicId);
    }

    this.savePrescriptions(list, clinicId);
    this.enqueueOutboxMutation(clinicId, 'prescriptions', existingIndex >= 0 ? 'update' : 'create', targetRx.id, targetRx);
    remoteSync.upsert(clinicId, 'prescriptions', targetRx).catch(e => console.warn('[Sync] upsert prescription:', e));
    return targetRx;
  }

  public getPrescriptionsByEncounter(encounterId: string, clinicId = this.activeClinicId): Prescription[] {
    return this.getPrescriptions(clinicId)
      .filter(p => p.encounterId === encounterId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public getPrescriptionsByPatient(patientId: string, clinicId = this.activeClinicId): Prescription[] {
    return this.getPrescriptions(clinicId)
      .filter(p => p.patientId === patientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // --- EVOLUÇÕES CLÍNICAS LONGITUDINAIS & AMENDMENTS (FASE 3.8) ---
  public getEvolutions(clinicId = this.activeClinicId): ClinicalEvolution[] {
    try {
      const raw = localStorage.getItem(this.getKey('evolutions', clinicId));
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveEvolutions(evolutions: ClinicalEvolution[], clinicId = this.activeClinicId): void {
    this.safeSetItem(this.getKey('evolutions', clinicId), JSON.stringify(evolutions));
    indexedDbStorage.saveAll('evolutions' as any, clinicId, evolutions).catch(e => console.warn('[IndexedDB] saveEvolutions:', e));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_evolution_updated', { detail: { clinicId, evolutions } }));
    }
    this.broadcastSync('optomed_evolution_updated', { clinicId, evolutions });
    remoteSync.push(clinicId, 'evolutions' as any, evolutions);
  }

  public saveEvolution(evolution: ClinicalEvolution, clinicId = this.activeClinicId): ClinicalEvolution {
    const list = this.getEvolutions(clinicId);
    const existingIndex = list.findIndex(e => e.id === evolution.id);
    const now = new Date().toISOString();

    const prepared: ClinicalEvolution = {
      ...evolution,
      clinicId: evolution.clinicId || clinicId,
      timestamp: evolution.timestamp || now,
      createdAt: evolution.createdAt || now
    };

    if (existingIndex >= 0) {
      // Regra de Integridade Clínica: Não sobrescrever silenciosamente registros existentes
      prepared.version = (list[existingIndex].version || 1) + 1;
      list[existingIndex] = prepared;
    } else {
      list.unshift(prepared);
    }

    this.saveEvolutions(list, clinicId);
    this.logAudit(existingIndex >= 0 ? 'UPDATE' : 'CREATE', 'ENCOUNTER', prepared.id, `Evolução clínica (${prepared.type}) registrada`, clinicId);
    this.enqueueOutboxMutation(clinicId, 'evolutions' as any, existingIndex >= 0 ? 'update' : 'create', prepared.id, prepared);
    remoteSync.upsert(clinicId, 'evolutions' as any, prepared).catch(e => console.warn('[Sync] upsert evolution:', e));
    return prepared;
  }

  /**
   * Registra um Adendo / Amendment auditável retificando um registro anterior sem apagar o original
   */
  public createAmendment(params: {
    originalEvolutionId: string;
    encounterId: string;
    patientId: string;
    newText: string;
    reason: string;
    professionalId: string;
    professionalName: string;
    clinicId?: string;
  }): ClinicalEvolution {
    const cid = params.clinicId || this.activeClinicId;
    const list = this.getEvolutions(cid);
    const original = list.find(e => e.id === params.originalEvolutionId);

    const now = new Date().toISOString();
    const amendment: ClinicalEvolution = {
      id: generateUUID(),
      encounterId: params.encounterId,
      patientId: params.patientId,
      clinicId: cid,
      professionalId: params.professionalId,
      professionalName: params.professionalName,
      timestamp: now,
      text: params.newText,
      type: 'amendment',
      version: original ? (original.version || 1) + 1 : 1,
      supersedesId: params.originalEvolutionId,
      amendmentReason: params.reason,
      previousContent: original ? original.text : undefined,
      createdAt: now,
      createdBy: params.professionalName
    };

    list.unshift(amendment);
    this.saveEvolutions(list, cid);
    this.logAudit('UPDATE', 'ENCOUNTER', amendment.id, `Adendo clínico registrado vinculando #${params.originalEvolutionId}: ${params.reason}`, cid);
    this.enqueueOutboxMutation(cid, 'evolutions' as any, 'create', amendment.id, amendment);
    remoteSync.upsert(cid, 'evolutions' as any, amendment).catch(e => console.warn('[Sync] upsert amendment:', e));
    return amendment;
  }

  public getEvolutionsByEncounter(encounterId: string, clinicId = this.activeClinicId): ClinicalEvolution[] {
    return this.getEvolutions(clinicId)
      .filter(e => e.encounterId === encounterId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getEvolutionsByPatient(patientId: string, clinicId = this.activeClinicId): ClinicalEvolution[] {
    return this.getEvolutions(clinicId)
      .filter(e => e.patientId === patientId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // --- DOCUMENTOS CLÍNICOS EMITIDOS (FASE 3.9) ---
  public getClinicalDocuments(clinicId = this.activeClinicId): ClinicalDocumentRecord[] {
    try {
      const raw = localStorage.getItem(this.getKey('clinical_documents', clinicId));
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveClinicalDocuments(docs: ClinicalDocumentRecord[], clinicId = this.activeClinicId): void {
    this.safeSetItem(this.getKey('clinical_documents', clinicId), JSON.stringify(docs));
    indexedDbStorage.saveAll('clinical_documents' as any, clinicId, docs).catch(e => console.warn('[IndexedDB] saveClinicalDocuments:', e));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_document_updated', { detail: { clinicId, docs } }));
    }
    this.broadcastSync('optomed_document_updated', { clinicId, docs });
    remoteSync.push(clinicId, 'clinical_documents' as any, docs);
  }

  public saveClinicalDocument(doc: ClinicalDocumentRecord, clinicId = this.activeClinicId): ClinicalDocumentRecord {
    const list = this.getClinicalDocuments(clinicId);
    const existingIndex = list.findIndex(d => d.id === doc.id);
    const now = new Date().toISOString();

    const prepared: ClinicalDocumentRecord = {
      ...doc,
      clinicId: doc.clinicId || clinicId,
      issuedAt: doc.issuedAt || now,
      version: doc.version || (existingIndex >= 0 ? (list[existingIndex].version || 1) + 1 : 1)
    };

    if (existingIndex >= 0) {
      list[existingIndex] = prepared;
    } else {
      list.unshift(prepared);
    }

    this.saveClinicalDocuments(list, clinicId);
    this.logAudit(existingIndex >= 0 ? 'UPDATE' : 'CREATE', 'PRESCRIPTION', prepared.id, `Documento clínico emitido: ${prepared.title} (${prepared.type})`, clinicId);
    this.enqueueOutboxMutation(clinicId, 'clinical_documents' as any, existingIndex >= 0 ? 'update' : 'create', prepared.id, prepared);
    remoteSync.upsert(clinicId, 'clinical_documents' as any, prepared).catch(e => console.warn('[Sync] upsert clinical document:', e));
    return prepared;
  }

  public getClinicalDocumentsByEncounter(encounterId: string, clinicId = this.activeClinicId): ClinicalDocumentRecord[] {
    return this.getClinicalDocuments(clinicId)
      .filter(d => d.encounterId === encounterId)
      .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
  }

  public getClinicalDocumentsByPatient(patientId: string, clinicId = this.activeClinicId): ClinicalDocumentRecord[] {
    return this.getClinicalDocuments(clinicId)
      .filter(d => d.patientId === patientId)
      .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
  }
  public getAppointments(clinicId = this.activeClinicId): Appointment[] {
    try {
      const raw = localStorage.getItem(this.getKey('appointments', clinicId));
      if (!raw) {
        const initial = this.getInitialAppointmentsForClinic(clinicId);
        this.safeSetItem(this.getKey('appointments', clinicId), JSON.stringify(initial));
        return initial;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        let hasWrapped = false;
        const cleaned = parsed.map(item => {
          if (item && item.data && typeof item.data === 'object') {
            hasWrapped = true;
            return unwrapEntityRecord<Appointment>(item);
          }
          return item;
        });
        if (hasWrapped) {
          this.safeSetItem(this.getKey('appointments', clinicId), JSON.stringify(cleaned));
        }
        return cleaned;
      }
      return [];
    } catch {
      return [];
    }
  }

  public saveAppointments(appointments: Appointment[], clinicId = this.activeClinicId): void {
    this.safeSetItem(this.getKey('appointments', clinicId), JSON.stringify(appointments));
    // Persistência dual resiliente em IndexedDB
    indexedDbStorage.saveAll('appointments', clinicId, appointments).catch(e => console.warn('[IndexedDB] saveAppointments:', e));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_appointment_updated', { detail: { clinicId, appointments } }));
    }
    this.broadcastSync('optomed_appointment_updated', { clinicId, appointments });
    remoteSync.push(clinicId, 'appointments', appointments);
  }

  public saveAppointment(appointment: Appointment, clinicId = this.activeClinicId): void {
    const list = this.getAppointments(clinicId);
    const existingIndex = list.findIndex(a => a.id === appointment.id);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...appointment, updatedAt: new Date().toISOString() };
    } else {
      list.push(appointment);
    }
    list.sort((a, b) => a.time.localeCompare(b.time));
    this.saveAppointments(list, clinicId);
    this.logAudit('UPDATE', 'PATIENT', appointment.patientId, `Agendamento para ${appointment.patientName} às ${appointment.time}`, clinicId);
    const savedApt = list.find(a => a.id === appointment.id) || appointment;
    this.enqueueOutboxMutation(clinicId, 'appointments', existingIndex >= 0 ? 'update' : 'create', savedApt.id, savedApt);
    remoteSync.upsert(clinicId, 'appointments', savedApt).catch(e => console.warn('[Sync] upsert appointment:', e));
  }

  public updateAppointmentStatus(id: string, status: AppointmentStatus, clinicId = this.activeClinicId, force = false): boolean {
    const list = this.getAppointments(clinicId);
    const apt = list.find(a => a.id === id);
    if (!apt) return false;

    // Validação estrita pela máquina de estados (a menos que forçado por sincronização remota)
    if (!force && !canTransitionAppointmentStatus(apt.status, status)) {
      console.warn(`[StateMachine] Transição inválida bloqueada: ${apt.status} -> ${status} para agendamento ${id}`);
      return false;
    }

    const now = new Date().toISOString();
    apt.status = status;
    apt.updatedAt = now;

    if (status === 'checked_in' || status === 'waiting') {
      if (!apt.checkInAt) apt.checkInAt = now;
    } else if (status === 'called') {
      apt.calledAt = now;
    } else if (status === 'in_consultation') {
      if (!apt.startedAt) apt.startedAt = now;
    } else if (status === 'completed') {
      if (!apt.completedAt) apt.completedAt = now;
      // MOTOR FINANCEIRO: gera a remuneração automática, auditável e idempotente para o examinador
      try {
        examinerRemunerationService.generateRemunerationOnAppointmentCompletion(apt, clinicId);
      } catch (e) {
        console.warn('[Remuneration] Falha ao processar remuneração na conclusão da consulta:', e);
      }
    }

    this.saveAppointments(list, clinicId);
    this.logAudit('UPDATE', 'PATIENT', apt.patientId, `Status de agendamento alterado para ${status}`, clinicId);
    this.enqueueOutboxMutation(clinicId, 'appointments', 'update', apt.id, apt);
    remoteSync.upsert(clinicId, 'appointments', apt).catch(e => console.warn('[Sync] upsert status appointment:', e));
    return true;
  }

  public deleteAppointment(id: string, clinicId = this.activeClinicId): void {
    const list = this.getAppointments(clinicId).filter(a => a.id !== id);
    this.saveAppointments(list, clinicId);
    this.enqueueOutboxMutation(clinicId, 'appointments', 'delete', id, { id, _deleted: true });
    remoteSync.remove(clinicId, 'appointments', id).catch(e => console.warn('[Sync] deleteAppointment remove:', e));
    this.logAudit('DELETE', 'PATIENT', id, 'Agendamento removido da agenda', clinicId);
  }

  // --- AUDITORIA LGPD ---
  public getAuditLogs(clinicId = this.activeClinicId): AuditLogEntry[] {
    try {
      const raw = localStorage.getItem(this.getKey('audit_logs', clinicId));
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public logAudit(
    action: AuditLogEntry['action'],
    resourceType: AuditLogEntry['resourceType'],
    resourceId: string,
    details: string,
    clinicId = this.activeClinicId
  ): void {
    const list = this.getAuditLogs(clinicId);
    const entry: AuditLogEntry = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      userId: 'dr-meirelles',
      userName: 'Dr. Rudson Meirelles',
      action,
      resourceType,
      resourceId,
      details: `[${clinicId.toUpperCase()}] ${details}`
    };
    list.unshift(entry);
    const capped = list.slice(0, 500);
    this.safeSetItem(this.getKey('audit_logs', clinicId), JSON.stringify(capped));
    remoteSync.push(clinicId, 'audit_logs', capped);
  }

  public getPendingSyncCount(): number {
    return remoteSync.getPending();
  }

  public getSyncStatus() {
    return remoteSync.getStatus();
  }

  public addSyncListener(fn: (status: string, pending: number) => void) {
    remoteSync.addListener(fn as any);
  }

  public removeSyncListener(fn: (status: string, pending: number) => void) {
    remoteSync.removeListener(fn as any);
  }

  public async manualSync(): Promise<void> {
    const clinicId = this.activeClinicId;
    await remoteSync.fullSync(clinicId, this.getSyncGetLocal(clinicId) as any, this.getSyncSetLocal(clinicId) as any);
  }

  // Forca o envio de TODOS os dados locais ao servidor (migracao inicial / recuperacao)
  public async forceUploadAll(): Promise<void> {
    const clinicId = this.activeClinicId;
    await remoteSync.forceUploadAll(clinicId, this.getSyncGetLocal(clinicId) as any);
  }

  // Limpa a fila de sincronização pendente se houver mutações órfãs acumuladas
  public clearSyncQueue(): void {
    remoteSync.clearQueue();
  }

  // Dados iniciais específicos por consultório (IVS inicia 100% limpo, apenas dados reais cadastrados pelo usuário)
  private getInitialPatientsForClinic(clinicId: string): Patient[] {
    if (clinicId === 'ivs') {
      return [];
    } else if (clinicId === 'megastar') {
      return [
        {
          id: 'p2-megastar',
          fullName: 'Juan Carlos Benítez',
          birthDate: '1978-08-22',
          sex: 'M',
          nationality: 'PY',
          documentType: 'CI_PY',
          documentNumber: '4.892.120',
          phoneCountryCode: '+595',
          phone: '+595 981 456789',
          city: 'Pedro Juan Caballero',
          country: 'Paraguai',
          notes: 'Presbiopia progressiva e necessidade de novos óculos multifocais.',
          lgpdConsent: true,
          lgpdConsentDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    } else if (clinicId === 'vision') {
      return [
        {
          id: 'p3-vision',
          fullName: 'Enzo Gabriel Silva (Menor)',
          birthDate: '2018-03-10',
          sex: 'M',
          nationality: 'BR',
          documentType: 'RG',
          documentNumber: '12.345.678-9',
          phoneCountryCode: '+55',
          phone: '+55 (45) 97777-8888',
          city: 'Ponta Porã',
          country: 'Brasil',
          guardianName: 'Juliana Silva (Mãe)',
          notes: 'Triagem visual escolar infantil.',
          lgpdConsent: true,
          lgpdConsentDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    }
    return [];
  }

  // --- LEMBRETES DE RETORNO (SOLICITADOS PELO EXAMINADOR) ---
  public getReturnReminders(clinicId = this.activeClinicId): ReturnReminder[] {
    const encounters = this.getEncounters(clinicId);
    const patients = this.getPatients(clinicId);
    const reminders: ReturnReminder[] = [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    for (const enc of encounters) {
      // Verifica se houve recomendação de semanas de retorno ou texto de retorno
      if (enc.returnInWeeks && enc.returnInWeeks > 0) {
        const patient = patients.find(p => p.id === enc.patientId);
        const encDate = new Date(enc.date);
        
        // Data alvo = data do exame + (returnInWeeks * 7 dias)
        const targetDateObj = new Date(encDate.getTime() + enc.returnInWeeks * 7 * 24 * 60 * 60 * 1000);
        const targetDateStr = targetDateObj.toISOString().split('T')[0];
        
        // Diferença em dias em relação a hoje
        const diffTime = targetDateObj.getTime() - now.getTime();
        const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status: ReturnReminder['status'] = 'upcoming';
        if (daysDiff < 0) {
          status = 'overdue';
        } else if (daysDiff <= 7) {
          status = 'due_this_week';
        }

        reminders.push({
          id: enc.id,
          patientId: enc.patientId,
          patientName: patient?.fullName || 'Paciente',
          patientPhone: patient?.phone,
          patientNationality: patient?.nationality || 'BR',
          encounterDate: enc.date,
          returnWeeks: enc.returnInWeeks,
          targetDate: targetDateStr,
          instructions: enc.returnInstructions || `Retorno em ${enc.returnInWeeks} semanas`,
          examinerName: enc.examinerName || 'Dr. Rudson Meirelles',
          status,
          daysDifference: daysDiff
        });
      }
    }

    // Ordena os que estão atrasados ou com retorno mais próximo primeiro
    return reminders.sort((a, b) => a.daysDifference - b.daysDifference);
  }

  // --- RELATÓRIOS E ESTATÍSTICAS GERENCIAIS ---
  public getReportStats(
    timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' = 'monthly',
    customStart?: string,
    customEnd?: string,
    clinicId = this.activeClinicId
  ): ReportStats {
    const encounters = this.getEncounters(clinicId);
    const prescriptions = this.getPrescriptions(clinicId);
    const patients = this.getPatients(clinicId);

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (timeframe === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (timeframe === 'weekly') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
    } else if (timeframe === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (timeframe === 'yearly') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else if (timeframe === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart + 'T00:00:00');
      endDate = new Date(customEnd + 'T23:59:59');
    }

    // Filtra atendimentos no intervalo
    const filteredEncounters = encounters.filter(e => {
      const d = new Date(e.date);
      return d >= startDate && d <= endDate;
    });

    const filteredPrescriptions = prescriptions.filter(p => {
      const d = new Date(p.date);
      return d >= startDate && d <= endDate;
    });

    // Distribuição por Faixa Etária
    const ageDistribution: AgeGroupDistribution = {
      pediatric: 0,
      young: 0,
      presbyopic: 0,
      senior: 0,
      uninformed: 0
    };

    // Distribuição por Nacionalidade
    const natDistribution = { br: 0, py: 0, other: 0 };

    for (const enc of filteredEncounters) {
      const pat = patients.find(p => p.id === enc.patientId);
      if (pat) {
        if (pat.nationality === 'BR') natDistribution.br++;
        else if (pat.nationality === 'PY') natDistribution.py++;
        else natDistribution.other++;

        const age = calculateAge(pat.birthDate);
        if (!age) {
          ageDistribution.uninformed++;
        } else if (age.years <= 12) {
          ageDistribution.pediatric++;
        } else if (age.years <= 39) {
          ageDistribution.young++;
        } else if (age.years <= 59) {
          ageDistribution.presbyopic++;
        } else {
          ageDistribution.senior++;
        }
      } else {
        ageDistribution.uninformed++;
      }
    }

    // Agrupamento temporal para gráficos
    const periodMap = new Map<string, number>();

    if (timeframe === 'daily') {
      // 8h às 19h
      for (let h = 8; h <= 19; h++) {
        const label = `${h.toString().padStart(2, '0')}:00`;
        periodMap.set(label, 0);
      }
      filteredEncounters.forEach(e => {
        const d = new Date(e.date);
        const h = `${d.getHours().toString().padStart(2, '0')}:00`;
        if (periodMap.has(h)) {
          periodMap.set(h, (periodMap.get(h) || 0) + 1);
        }
      });
    } else if (timeframe === 'weekly') {
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      days.forEach(d => periodMap.set(d, 0));
      filteredEncounters.forEach(e => {
        const d = new Date(e.date);
        const dayName = days[d.getDay()];
        periodMap.set(dayName, (periodMap.get(dayName) || 0) + 1);
      });
    } else if (timeframe === 'monthly') {
      // Dias 1 a 31
      const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i += 2) {
        periodMap.set(`Dia ${i}`, 0);
      }
      filteredEncounters.forEach(e => {
        const d = new Date(e.date);
        const day = d.getDate();
        // Agrupa por faixas ou dia par mais próximo
        const bucket = `Dia ${day % 2 === 0 ? day : day}`;
        periodMap.set(bucket, (periodMap.get(bucket) || 0) + 1);
      });
    } else if (timeframe === 'yearly') {
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      months.forEach(m => periodMap.set(m, 0));
      filteredEncounters.forEach(e => {
        const d = new Date(e.date);
        const m = months[d.getMonth()];
        periodMap.set(m, (periodMap.get(m) || 0) + 1);
      });
    }

    const consultationsByPeriod = Array.from(periodMap.entries()).map(([label, count]) => ({
      label,
      count
    }));

    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const averagePerDay = Number((filteredEncounters.length / totalDays).toFixed(1));

    return {
      totalConsultations: filteredEncounters.length,
      completedConsultations: filteredEncounters.filter(e => e.status === 'completed').length,
      totalPrescriptions: filteredPrescriptions.length,
      totalPatients: patients.length,
      averagePerDay,
      nationalityDistribution: natDistribution,
      ageDistribution,
      timeframe,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      consultationsByPeriod
    };
  }

  // --- RESTAURAÇÃO E IMPORTAÇÃO DO BANCO DE DADOS ---
  public restoreBackup(jsonData: any, clinicId = this.activeClinicId): boolean {
    try {
      if (jsonData.patients && Array.isArray(jsonData.patients)) {
        this.savePatients(jsonData.patients, clinicId);
      }
      if (jsonData.encounters && Array.isArray(jsonData.encounters)) {
        this.saveEncounters(jsonData.encounters, clinicId);
      }
      if (jsonData.prescriptions && Array.isArray(jsonData.prescriptions)) {
        this.savePrescriptions(jsonData.prescriptions, clinicId);
      }
      if (jsonData.appointments && Array.isArray(jsonData.appointments)) {
        this.saveAppointments(jsonData.appointments, clinicId);
      }
      if (jsonData.transactions && Array.isArray(jsonData.transactions)) {
        this.saveTransactions(jsonData.transactions, clinicId);
      }
      if (jsonData.workSessions && Array.isArray(jsonData.workSessions)) {
        this.saveWorkSessions(jsonData.workSessions, clinicId);
      }
      this.logAudit('UPDATE', 'PATIENT', 'DATABASE_RESTORE', 'Restauração de backup do banco de dados realizada com sucesso', clinicId);
      return true;
    } catch {
      return false;
    }
  }

  // --- LIMPEZA DE DADOS FICTÍCIOS / ZERAR CONSULTÓRIO PARA DADOS 100% REAIS ---
  public clearClinicData(clinicId = this.activeClinicId): void {
    try {
      localStorage.removeItem(this.getKey('patients', clinicId));
      localStorage.removeItem(this.getKey('encounters', clinicId));
      localStorage.removeItem(this.getKey('prescriptions', clinicId));
      localStorage.removeItem(this.getKey('appointments', clinicId));
      localStorage.removeItem(this.getKey('financial_transactions', clinicId));
      localStorage.removeItem(this.getKey('work_sessions', clinicId));
      
      // Salva explicitamente arrays vazios para evitar recriação de mocks automáticos
      this.savePatients([], clinicId);
      this.saveEncounters([], clinicId);
      this.saveAppointments([], clinicId);
      this.saveTransactions([], clinicId);
      this.saveWorkSessions([], clinicId);

      this.logAudit('DELETE', 'PATIENT', 'DATABASE_CLEAR', 'Dados fictícios removidos do consultório; pronto para dados 100% reais.', clinicId);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('optomed_appointment_updated', { detail: { clinicId, appointments: [] } }));
        window.dispatchEvent(new CustomEvent('optomed_finance_updated', { detail: { clinicId } }));
      }
    } catch {}
  }

  // --- RESTAURAÇÃO HISTÓRICA COMPLETA DE DADOS CLÍNICOS E PACIENTES (DESDE 25/08/2026) ---
  public restoreRecoveredHistoricalData(clinicId = 'ivs'): void {
    try {
      // 1. Pacientes: mescla sem duplicar
      const currentPatients = this.getPatients(clinicId);
      const patientMap = new Map<string, Patient>();
      currentPatients.forEach(p => patientMap.set(p.id, p));

      RECOVERED_RECORDS.forEach(rec => {
        if (!patientMap.has(rec.patient.id)) {
          patientMap.set(rec.patient.id, rec.patient as Patient);
        }
      });
      const updatedPatients = Array.from(patientMap.values());
      this.savePatients(updatedPatients, clinicId);

      // 2. Prontuários (Encounters): mescla sem duplicar
      const currentEncounters = this.getEncounters(clinicId);
      const encounterMap = new Map<string, ClinicalEncounter>();
      currentEncounters.forEach(e => encounterMap.set(e.id, e));

      RECOVERED_RECORDS.forEach(rec => {
        if (rec.encounter && !encounterMap.has(rec.encounter.id)) {
          encounterMap.set(rec.encounter.id, rec.encounter as ClinicalEncounter);
        }
      });
      const updatedEncounters = Array.from(encounterMap.values());
      this.saveEncounters(updatedEncounters, clinicId);

      // 3. Receitas ópticas (Prescriptions): mescla sem duplicar
      const currentPrescriptions = this.getPrescriptions(clinicId);
      const prescriptionMap = new Map<string, Prescription>();
      currentPrescriptions.forEach(p => prescriptionMap.set(p.id, p));

      RECOVERED_RECORDS.forEach(rec => {
        if (rec.prescription && !prescriptionMap.has(rec.prescription.id)) {
          prescriptionMap.set(rec.prescription.id, rec.prescription as Prescription);
        }
      });
      const updatedPrescriptions = Array.from(prescriptionMap.values());
      this.safeSetItem(this.getKey('prescriptions', clinicId), JSON.stringify(updatedPrescriptions));

      // 4. Agendamentos históricos para a agenda e painel do médico
      const currentApts = this.getAppointments(clinicId);
      const aptMap = new Map<string, Appointment>();
      currentApts.forEach(a => aptMap.set(a.id, a));

      RECOVERED_RECORDS.forEach((rec, idx) => {
        const aptId = `apt-rec-${rec.patient.id}`;
        if (!aptMap.has(aptId)) {
          const encDate = rec.encounter?.date || rec.patient.createdAt;
          const dateStr = encDate ? encDate.split('T')[0] : '2026-09-08';
          const timeStr = encDate && encDate.includes('T')
            ? new Date(encDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : '08:30';

          aptMap.set(aptId, {
            id: aptId,
            patientId: rec.patient.id,
            patientName: rec.patient.fullName,
            patientNationality: rec.patient.nationality || 'BR',
            patientPhone: rec.patient.phone,
            patientDocument: rec.patient.documentNumber,
            examinerId: 'user-examinador',
            examinerName: 'Dr. Rudson Meirelles',
            date: dateStr,
            time: timeStr,
            durationMinutes: 3,
            type: 'refrativo',
            status: rec.encounter?.status === 'completed' ? 'completed' : 'in_consultation',
            ticketNumber: `P-${String(idx + 1).padStart(2, '0')}`,
            notes: rec.patient.notes || 'Atendimento registrado no consultório.',
            room: 'Consultório 1',
            createdAt: rec.patient.createdAt,
            updatedAt: rec.patient.updatedAt
          });
        }
      });
      const updatedApts = Array.from(aptMap.values());
      this.saveAppointments(updatedApts, clinicId);

      this.logAudit('UPDATE', 'PATIENT', 'HISTORICAL_RECOVERY', `Recuperados com sucesso ${RECOVERED_RECORDS.length} pacientes e prontuários históricos desde 25/08/2026`, clinicId);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('optomed_appointment_updated', { detail: { clinicId, appointments: updatedApts } }));
      }
    } catch (e) {
      console.error('Erro na recuperação histórica:', e);
    }
  }

  // Semeador oficial da agenda do dia 12/09/2026 (Sábado) para todas as clínicas ou clínica ativa
  public seedSchedule12092026(clinicId = this.activeClinicId): void {
    try {
      // 1. Pacientes do dia 12/09/2026
      const currentPatients = this.getPatients(clinicId);
      const patientMap = new Map<string, Patient>();
      currentPatients.forEach(p => patientMap.set(p.id, p));

      SEED_PATIENTS_12_09_2026.forEach(sp => {
        // Se o paciente ainda não existe pelo ID ou pelo nome aproximado
        const existsByName = currentPatients.some(
          p => p.fullName.trim().toLowerCase() === sp.fullName.trim().toLowerCase()
        );
        if (!patientMap.has(sp.id) && !existsByName) {
          patientMap.set(sp.id, sp);
        }
      });
      this.savePatients(Array.from(patientMap.values()), clinicId);

      // 2. Agendamentos do dia 12/09/2026
      const currentApts = this.getAppointments(clinicId);
      const aptMap = new Map<string, Appointment>();
      currentApts.forEach(a => aptMap.set(a.id, a));

      SEED_APPOINTMENTS_12_09_2026.forEach(sa => {
        const existsByNameAndTime = currentApts.some(
          a => a.date === SCHEDULE_DATE_12_09_2026 && a.patientName.trim().toLowerCase() === sa.patientName.trim().toLowerCase()
        );
        if (!aptMap.has(sa.id) && !existsByNameAndTime) {
          aptMap.set(sa.id, sa);
        }
      });

      const updatedApts = Array.from(aptMap.values()).sort((a, b) => {
        if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '');
        return (a.time || '').localeCompare(b.time || '');
      });
      this.saveAppointments(updatedApts, clinicId);

      this.logAudit('UPDATE', 'PATIENT', 'SCHEDULE_SEED_12092026', `Agenda oficial de 12/09/2026 cadastrada com ${SEED_APPOINTMENTS_12_09_2026.length} pacientes`, clinicId);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('optomed_appointment_updated', { detail: { clinicId, appointments: updatedApts } }));
      }
    } catch (err) {
      console.error('Erro ao semear agenda de 12/09/2026:', err);
    }
  }

  // Remove dados fictícios conhecidos (Maria Helena, Enzo Gabriel, Juan Carlos Benítez) de um consultório
  public removeMockPatients(clinicId = this.activeClinicId): void {
    const mockNames = [
      'maria helena dos santos',
      'maria helena',
      'enzo gabriel silva (menor)',
      'enzo gabriel silva',
      'juan carlos benítez',
      'juan carlos benitez'
    ];

    // 1. Filtrar pacientes
    const currentPatients = this.getPatients(clinicId);
    const mockPatientIds = currentPatients
      .filter(p => mockNames.includes(p.fullName.toLowerCase().trim()))
      .map(p => p.id);

    const realPatients = currentPatients.filter(p => !mockNames.includes(p.fullName.toLowerCase().trim()));
    this.savePatients(realPatients, clinicId);

    // 2. Filtrar agendamentos
    const currentApts = this.getAppointments(clinicId);
    const realApts = currentApts.filter(a => !mockNames.includes(a.patientName.toLowerCase().trim()) && !mockPatientIds.includes(a.patientId));
    this.saveAppointments(realApts, clinicId);

    // 3. Filtrar prontuários (por patientId ou prescrição)
    const currentEncounters = this.getEncounters(clinicId);
    const realEncounters = currentEncounters.filter(e => {
      if (mockPatientIds.includes(e.patientId)) return false;
      if (e.prescription?.patientName && mockNames.includes(e.prescription.patientName.toLowerCase().trim())) return false;
      return true;
    });
    this.saveEncounters(realEncounters, clinicId);

    // 4. Filtrar transações financeiras vinculadas a pacientes fictícios
    const currentTxs = this.getTransactions(clinicId);
    const realTxs = currentTxs.filter(t => !t.patientName || !mockNames.includes(t.patientName.toLowerCase().trim()));
    this.saveTransactions(realTxs, clinicId);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_appointment_updated', { detail: { clinicId, appointments: realApts } }));
      window.dispatchEvent(new CustomEvent('optomed_finance_updated', { detail: { clinicId } }));
    }
  }

  // Remove contaminação de agendamentos da IVS de 12/09/2026 dentro da clínica Vision e Mega Star
  public cleanupVisionContamination(): void {
    try {
      const ivsApts = this.getAppointments('ivs');
      const ivsPatientNames = new Set(ivsApts.map(a => a.patientName.trim().toLowerCase()));

      ['vision', 'megastar'].forEach(cid => {
        const apts = this.getAppointments(cid);
        // Mantém apenas os que NÃO foram clonados da grade de 12/09 da IVS
        const filtered = apts.filter(a => {
          if (a.id.startsWith('apt-12092026-')) return false;
          if (a.date === '2026-09-12' && ivsPatientNames.has(a.patientName.trim().toLowerCase())) return false;
          return true;
        });
        if (filtered.length !== apts.length) {
          this.saveAppointments(filtered, cid);
        }

        // Também limpa pacientes semeados da IVS que não pertencem à Vision
        const patients = this.getPatients(cid);
        const filteredPatients = patients.filter(p => {
          if (p.id.startsWith('p-12092026-')) return false;
          if (ivsPatientNames.has(p.fullName.trim().toLowerCase())) return false;
          return true;
        });
        if (filteredPatients.length !== patients.length) {
          this.savePatients(filteredPatients, cid);
        }
      });
    } catch (err) {
      console.error('Erro na limpeza de contaminação cruzada:', err);
    }
  }

  public getTransactions(clinicId = this.activeClinicId): FinancialTransaction[] {
    try {
      const raw = localStorage.getItem(this.getKey('financial_transactions', clinicId));
      if (!raw) {
        const initial = this.getInitialTransactionsForClinic(clinicId);
        this.saveTransactions(initial, clinicId);
        return initial;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        let hasWrapped = false;
        const cleaned = parsed.map(item => {
          if (item && item.data && typeof item.data === 'object') {
            hasWrapped = true;
            return unwrapEntityRecord<FinancialTransaction>(item);
          }
          return item;
        });
        if (hasWrapped) {
          this.safeSetItem(this.getKey('financial_transactions', clinicId), JSON.stringify(cleaned));
        }
        return cleaned;
      }
      return [];
    } catch {
      return [];
    }
  }

  public saveTransactions(transactions: FinancialTransaction[], clinicId = this.activeClinicId): void {
    this.safeSetItem(this.getKey('financial_transactions', clinicId), JSON.stringify(transactions));
    indexedDbStorage.saveAll('transactions' as any, clinicId, transactions).catch(e => console.warn('[IndexedDB] saveTransactions:', e));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_finance_updated', { detail: { clinicId } }));
    }
    this.broadcastSync('optomed_finance_updated', { clinicId });
    remoteSync.push(clinicId, 'transactions', transactions);
  }

  public saveTransaction(tx: FinancialTransaction, clinicId = this.activeClinicId): void {
    const list = this.getTransactions(clinicId);
    const idx = list.findIndex(t => t.id === tx.id);
    const now = new Date().toISOString();

    // Tratamento de matemática decimal segura (armazenamento em centavos inteiros)
    const safeAmountCents = tx.amountCents !== undefined ? tx.amountCents : toCents(tx.amount || 0);
    const safeAmount = fromCents(safeAmountCents);

    // Se houver caixa aberto para a clínica e a transação não tiver cashRegisterId associado
    const activeSession = this.getActiveCashRegisterSession(clinicId);

    const prepared: FinancialTransaction = {
      ...tx,
      clinicId: tx.clinicId || clinicId,
      amount: safeAmount,
      amountCents: safeAmountCents,
      currency: tx.currency || this.getClinicById(clinicId)?.currency || 'BRL',
      cashRegisterId: tx.cashRegisterId || (activeSession?.id),
      updatedAt: now
    };

    if (idx >= 0) {
      list[idx] = prepared;
    } else {
      list.unshift(prepared);
    }
    this.saveTransactions(list, clinicId);
    this.logAudit(
      idx >= 0 ? 'UPDATE' : 'CREATE', 
      'FINANCE' as any, 
      prepared.id, 
      `${prepared.type === 'income' ? 'Entrada' : 'Saída'} de ${prepared.currency || 'R$'} ${prepared.amount.toFixed(2)} - ${prepared.description}`, 
      clinicId
    );
    this.enqueueOutboxMutation(clinicId, 'transactions', idx >= 0 ? 'update' : 'create', prepared.id, prepared);
    remoteSync.upsert(clinicId, 'transactions', prepared).catch(e => console.warn('[Sync] upsert transaction:', e));
  }

  public deleteTransaction(id: string, clinicId = this.activeClinicId): void {
    const list = this.getTransactions(clinicId);
    const target = list.find(t => t.id === id);
    if (!target) return;

    // Marca como tombstone para sincronização durável
    const updated = list.filter(t => t.id !== id);
    this.saveTransactions(updated, clinicId);
    this.enqueueOutboxMutation(clinicId, 'transactions', 'delete', id, { id, _deleted: true });
    remoteSync.remove(clinicId, 'transactions', id).catch(e => console.warn('[Sync] deleteTransaction remove:', e));
    this.logAudit('DELETE', 'FINANCE' as any, id, 'Lançamento financeiro removido', clinicId);
  }

  public settleTransaction(id: string, isSettled: boolean = true, clinicId = this.activeClinicId): void {
    const list = this.getTransactions(clinicId);
    const idx = list.findIndex(t => t.id === id);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        isSettled,
        settledAt: isSettled ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString()
      };
      const settledTx = list[idx];
      this.saveTransactions(list, clinicId);
      this.logAudit('UPDATE', 'FINANCE' as any, id, `Lançamento ${isSettled ? 'liquidado (baixa efetuada)' : 'reaberto'} no financeiro`, clinicId);
      this.enqueueOutboxMutation(clinicId, 'transactions', 'update', settledTx.id, settledTx);
      remoteSync.upsert(clinicId, 'transactions', settledTx).catch(e => console.warn('[Sync] upsert settled transaction:', e));
    }
  }

  /**
   * Dá baixa em lote em todas as transações com data/competência até a data limite estipulada (ex: 2026-09-30).
   * Valores liquidados saem do fluxo do dia mantendo consistência no extrato mensal e relatórios.
   */
  public settleAllTransactionsUntilDate(maxDateStr: string = '2026-09-30', clinicId = this.activeClinicId): number {
    const list = this.getTransactions(clinicId);
    let count = 0;
    const now = new Date().toISOString();
    const updated = list.map(tx => {
      const txDate = tx.date || (tx.createdAt ? tx.createdAt.slice(0, 10) : '2026-09-26');
      if (txDate <= maxDateStr && !tx.isSettled) {
        count++;
        return {
          ...tx,
          isSettled: true,
          settledAt: tx.settledAt || `${maxDateStr}T23:59:59.000Z`,
          updatedAt: now
        };
      }
      return tx;
    });

    if (count > 0) {
      this.saveTransactions(updated, clinicId);
      this.logAudit('UPDATE', 'FINANCE' as any, `batch_${Date.now()}`, `Baixa em lote de ${count} lançamentos até ${maxDateStr} realizada`, clinicId);
    }
    return count;
  }

  // --- SESSÕES E CICLO DE VIDA DO CAIXA (ABERTURA -> MOVIMENTAÇÕES -> CONFERÊNCIA -> FECHAMENTO) ---
  public getCashRegisterSessions(clinicId = this.activeClinicId): CashRegisterSession[] {
    try {
      const raw = localStorage.getItem(this.getKey('cash_registers', clinicId));
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveCashRegisterSessions(sessions: CashRegisterSession[], clinicId = this.activeClinicId): void {
    this.safeSetItem(this.getKey('cash_registers', clinicId), JSON.stringify(sessions));
    indexedDbStorage.saveAll('cash_registers' as any, clinicId, sessions).catch(e => console.warn('[IndexedDB] saveCashRegisterSessions:', e));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_cash_register_updated', { detail: { clinicId } }));
    }
    this.broadcastSync('optomed_cash_register_updated', { clinicId });
    remoteSync.push(clinicId, 'cash_registers' as any, sessions);
  }

  public getActiveCashRegisterSession(clinicId = this.activeClinicId): CashRegisterSession | null {
    const sessions = this.getCashRegisterSessions(clinicId);
    return sessions.find(s => s.status === 'open' && !s._deleted) || null;
  }

  public openCashRegisterSession(
    operatorId: string, 
    operatorName: string, 
    openingBalance: number = 0, 
    notes?: string,
    clinicId = this.activeClinicId
  ): CashRegisterSession {
    const active = this.getActiveCashRegisterSession(clinicId);
    if (active) {
      throw new Error(`Já existe um caixa aberto para esta unidade (Operador: ${active.operatorName}, aberto em ${new Date(active.openedAt).toLocaleTimeString()}).`);
    }

    const openCents = toCents(openingBalance);
    const now = new Date().toISOString();
    const newSession: CashRegisterSession = {
      id: generateUUID(),
      clinicId,
      operatorId,
      operatorName,
      openedAt: now,
      status: 'open',
      openingBalance: fromCents(openCents),
      openingBalanceCents: openCents,
      totalIncome: 0,
      totalExpense: 0,
      expectedBalance: fromCents(openCents),
      notes,
      createdAt: now,
      updatedAt: now
    };

    const list = this.getCashRegisterSessions(clinicId);
    list.unshift(newSession);
    this.saveCashRegisterSessions(list, clinicId);
    this.logAudit('CREATE', 'FINANCE' as any, newSession.id, `Caixa aberto por ${operatorName} com saldo inicial de R$ ${newSession.openingBalance.toFixed(2)}`, clinicId);
    this.enqueueOutboxMutation(clinicId, 'cash_registers' as any, 'create', newSession.id, newSession);
    remoteSync.upsert(clinicId, 'cash_registers' as any, newSession).catch(e => console.warn('[Sync] upsert open cash register:', e));
    return newSession;
  }

  public closeCashRegisterSession(
    sessionId: string,
    declaredBalance: number,
    notes?: string,
    clinicId = this.activeClinicId
  ): CashRegisterSession {
    const list = this.getCashRegisterSessions(clinicId);
    const idx = list.findIndex(s => s.id === sessionId);
    if (idx < 0) {
      throw new Error('Sessão de caixa não encontrada.');
    }
    const session = list[idx];
    if (session.status === 'closed') {
      throw new Error('Este caixa já foi fechado e não pode ser reaberto ou alterado.');
    }

    // Calcula movimentações ocorridas durante a sessão
    const txs = this.getTransactions(clinicId).filter(t => 
      t.status === 'completed' && 
      (t.cashRegisterId === session.id || (!t.cashRegisterId && t.date === session.openedAt.split('T')[0]))
    );

    const totalIncome = safeSum(...txs.filter(t => t.type === 'income').map(t => t.amount));
    const totalExpense = safeSum(...txs.filter(t => t.type === 'expense').map(t => t.amount));
    const expectedBalance = safeSub(safeSum(session.openingBalance, totalIncome), totalExpense);
    const declaredSafe = fromCents(toCents(declaredBalance));
    const difference = safeSub(declaredSafe, expectedBalance);

    const now = new Date().toISOString();
    const closedSession: CashRegisterSession = {
      ...session,
      status: 'closed',
      closedAt: now,
      totalIncome,
      totalExpense,
      expectedBalance,
      declaredBalance: declaredSafe,
      difference,
      notes: notes || session.notes,
      updatedAt: now
    };

    list[idx] = closedSession;
    this.saveCashRegisterSessions(list, clinicId);
    this.logAudit(
      'UPDATE', 
      'FINANCE' as any, 
      sessionId, 
      `Caixa fechado. Esperado: R$ ${expectedBalance.toFixed(2)} | Informado: R$ ${declaredSafe.toFixed(2)} | Dif: R$ ${difference.toFixed(2)}`, 
      clinicId
    );
    this.enqueueOutboxMutation(clinicId, 'cash_registers' as any, 'update', closedSession.id, closedSession);
    remoteSync.upsert(clinicId, 'cash_registers' as any, closedSession).catch(e => console.warn('[Sync] upsert close cash register:', e));
    return closedSession;
  }

  public getCashRegisterSummary(dateStr?: string, clinicId = this.activeClinicId): CashRegisterSummary {
    const today = dateStr || new Date().toISOString().split('T')[0];
    const txs = this.getTransactions(clinicId).filter(t => t.date === today && t.status === 'completed' && !t._deleted);
    const activeSession = this.getActiveCashRegisterSession(clinicId);

    const totalIncome = safeSum(...txs.filter(t => t.type === 'income').map(t => t.amount));
    const totalExpense = safeSum(...txs.filter(t => t.type === 'expense').map(t => t.amount));
    const openingBalance = activeSession ? activeSession.openingBalance : 0;
    const currentBalance = safeSub(safeSum(openingBalance, totalIncome), totalExpense);

    return {
      date: today,
      openingBalance,
      totalIncome,
      totalExpense,
      currentBalance,
      transactionsCount: txs.length,
      activeSession
    };
  }

  // --- ITENS DE PDV & TABELA DE PREÇOS DA CLÍNICA ---
  public getPOSItems(clinicId = this.activeClinicId): POSItem[] {
    try {
      const raw = localStorage.getItem(this.getKey('pos_items', clinicId));
      if (!raw) {
        const initial = this.getDefaultPOSItems();
        this.savePOSItems(initial, clinicId);
        return initial;
      }
      return JSON.parse(raw);
    } catch {
      return this.getDefaultPOSItems();
    }
  }

  public savePOSItems(items: POSItem[], clinicId = this.activeClinicId): void {
    this.safeSetItem(this.getKey('pos_items', clinicId), JSON.stringify(items));
    remoteSync.push(clinicId, 'pos_items', items);
  }

  public savePOSItem(item: POSItem, clinicId = this.activeClinicId): void {
    const list = this.getPOSItems(clinicId);
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    this.savePOSItems(list, clinicId);
    this.enqueueOutboxMutation(clinicId, 'pos_items', idx >= 0 ? 'update' : 'create', item.id, item);
    remoteSync.upsert(clinicId, 'pos_items', item).catch(e => console.warn('[Sync] upsert pos_item:', e));
  }

  private getDefaultPOSItems(clinicId = this.activeClinicId): POSItem[] {
    const isIvs = clinicId === 'ivs';
    return [
      { 
        id: 'pos_1', 
        name: 'Consulta Oftalmológica / Refração Completa', 
        category: 'consulta', 
        price: isIvs ? 50.00 : 150.00, 
        isActive: true 
      },
      { 
        id: 'pos_2', 
        name: 'Consulta de Retorno (Não Cobrar)', 
        category: 'consulta', 
        price: 0.00, 
        isActive: true 
      },
      { id: 'pos_3', name: 'Exame de Tonometria de Aplanação', category: 'exame', price: isIvs ? 40.00 : 80.00, isActive: true },
      { id: 'pos_4', name: 'Mapeamento de Retina / Fundoscopia', category: 'exame', price: isIvs ? 80.00 : 120.00, isActive: true },
      { id: 'pos_5', name: 'Adaptação e Teste de Lentes de Contato', category: 'servico', price: isIvs ? 60.00 : 100.00, isActive: true },
      { id: 'pos_6', name: 'Armação Receituário Premium', category: 'produto', price: 250.00, isActive: true },
      { id: 'pos_7', name: 'Lentes com Filtro de Luz Azul & Antirreflexo', category: 'produto', price: 200.00, isActive: true }
    ];
  }

  // --- REGIME DE TRABALHO & ACERTO FINANCEIRO DO EXAMINADOR (DR. MEIRELLES / IVS) ---
  public getWorkSessions(clinicId = this.activeClinicId): ProfessionalWorkSession[] {
    try {
      const raw = localStorage.getItem(this.getKey('work_sessions', clinicId));
      if (!raw) {
        const initial = this.getInitialWorkSessionsForClinic(clinicId);
        this.saveWorkSessions(initial, clinicId);
        return initial;
      }
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveWorkSessions(sessions: ProfessionalWorkSession[], clinicId = this.activeClinicId): void {
    this.safeSetItem(this.getKey('work_sessions', clinicId), JSON.stringify(sessions));
    remoteSync.push(clinicId, 'work_sessions', sessions);
  }

  public saveWorkSession(session: ProfessionalWorkSession, clinicId = this.activeClinicId): void {
    const list = this.getWorkSessions(clinicId);
    const idx = list.findIndex(s => s.id === session.id);
    if (idx >= 0) {
      list[idx] = session;
    } else {
      list.unshift(session);
    }
    this.saveWorkSessions(list, clinicId);
    this.logAudit('CREATE', 'FINANCE' as any, session.id, `Sessão de trabalho registrada: ${session.contractType} para ${session.examinerName}`, clinicId);
    this.enqueueOutboxMutation(clinicId, 'work_sessions', idx >= 0 ? 'update' : 'create', session.id, session);
    remoteSync.upsert(clinicId, 'work_sessions', session).catch(e => console.warn('[Sync] upsert work session:', e));
  }

  /**
   * Retorna a regra padrão de cobrança automática por dia da semana:
   * - IVS: Terça-feira (13h às 18h) -> Fixo R$ 500,00 (Meia Diária / Turno 5h)
   * - IVS: Quarta-feira (08h às 13h) -> Fixo R$ 500,00 (Meia Diária / Turno 5h)
   * - Demais dias: R$ 50,00 por atendimento / consulta realizada
   */
  public getDefaultContractTypeForDate(dateStr: string, clinicId = this.activeClinicId): {
    contractType: ProfessionalContractType;
    baseAmount: number;
    description: string;
    isFixedTurn: boolean;
  } {
    const isIvs = clinicId === 'ivs';
    if (!isIvs) {
      return {
        contractType: 'per_consultation',
        baseAmount: 150.00,
        description: 'Cobrança padrão por consulta',
        isFixedTurn: false
      };
    }

    // Obter o dia da semana considerando UTC/local da string YYYY-MM-DD
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);
    const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado

    // Caso específico para sábados de atendimento com diária integral (10/10/2026 e 17/10/2026): Período Fechado / Diária Integral de R$ 1.000,00
    if (dateStr === '2026-10-10' || dateStr === '2026-10-17') {
      return {
        contractType: 'period_full_day',
        baseAmount: 1000.00,
        description: `Sábado (${dateStr === '2026-10-17' ? '17/10/2026' : '10/10/2026'}) - Período Fechado (Diária Integral) - Fixo R$ 1.000,00`,
        isFixedTurn: true
      };
    }

    if (dayOfWeek === 2) {
      // Terça-feira (13h às 18h) - Fixo R$ 500,00 (Meia Diária / Turno 5h)
      return {
        contractType: 'period_half_day',
        baseAmount: 500.00,
        description: 'Terça-feira (13h às 18h) - Fixo R$ 500,00 (Meia Diária / Turno 5h)',
        isFixedTurn: true
      };
    } else if (dayOfWeek === 3) {
      // Quarta-feira (08h às 12h) - Fixo R$ 500,00 (Meia Diária / Turno 4h)
      return {
        contractType: 'period_half_day',
        baseAmount: 500.00,
        description: 'Quarta-feira (08h às 12h) - Fixo R$ 500,00 (Meia Diária / Turno 4h)',
        isFixedTurn: true
      };
    } else {
      // Demais dias: R$ 50,00 por consulta / atendimento
      return {
        contractType: 'per_consultation',
        baseAmount: 50.00,
        description: 'Cobrança por Atendimento Realizado - R$ 50,00',
        isFixedTurn: false
      };
    }
  }

  /**
   * Obtém a sessão de trabalho registrada para o dia específico ou gera a padrão automática.
   */
  public getWorkSessionForDate(
    dateStr: string,
    examinerName = 'Dr. Rudson Meirelles',
    clinicId = this.activeClinicId
  ): ProfessionalWorkSession {
    const sessions = this.getWorkSessions(clinicId);
    const existing = sessions.find(s => s.date === dateStr && (!examinerName || s.examinerName === examinerName));
    if (existing) {
      return existing;
    }

    const defaultRule = this.getDefaultContractTypeForDate(dateStr, clinicId);
    return {
      id: `sess_${clinicId}_${dateStr.replace(/-/g, '')}`,
      clinicId,
      examinerId: 'user-examinador',
      examinerName,
      date: dateStr,
      contractType: defaultRule.contractType,
      baseAmount: defaultRule.baseAmount,
      notes: defaultRule.description,
      status: 'active',
      createdAt: `${dateStr}T08:00:00.000Z`
    };
  }

  public getProfessionalSettlementReport(examinerName = 'Dr. Rudson Meirelles', clinicId = this.activeClinicId): ProfessionalSettlementReport {
    const summary = this.getCashRegisterSummary(undefined, clinicId);
    const isIvs = clinicId === 'ivs';

    // --- IVS: Relatório dinâmico com base nas transações reais a partir de 01/10/2026 ---
    if (isIvs) {
      const allTransactions = this.getTransactions(clinicId);
      const allAppointments = this.getAppointments(clinicId);

      // Transações em aberto a partir de 01/10/2026 (excluindo deletadas e já quitadas)
      // Apenas receitas efetivamente de consultas/atendimentos clínicos que geram repasse
      const CUTOFF_DATE = '2026-10-01';
      const openTransactions = allTransactions.filter(t => {
        const txDate = t.date || (t.createdAt ? t.createdAt.slice(0, 10) : '');
        const isConsultationCategory = !t.category || t.category === 'consulta' || t.description.toLowerCase().includes('consulta') || t.description.toLowerCase().includes('refração') || t.description.toLowerCase().includes('atendimento');
        return txDate >= CUTOFF_DATE
          && !t.isSettled
          && !t._deleted
          && t.type === 'income'
          && t.status === 'completed'
          && isConsultationCategory;
      });

      // Se houver transações em outubro em aberto OU se as transações de setembro já foram verificadas
      const hasOctoberOpen = openTransactions.length > 0;

      // Verifica se houve lançamento de pagamento de repasse ao examinador
      const isPaidTx = allTransactions.some(
        t => t.type === 'expense' && (t.category === 'salario' || t.description.toLowerCase().includes('repasse') || t.description.toLowerCase().includes('meirelles'))
      );
      const isFlagSettled = typeof localStorage !== 'undefined' && localStorage.getItem('optomed_ivs_repasse_settled_sept2026') === 'true';

      // Se há transações a partir de 01/10/2026 em aberto, calcula dinamicamente o novo período
      if (hasOctoberOpen) {
        // Agrupa por data para compor entradas diárias
        const byDate = new Map<string, typeof openTransactions>();
        for (const tx of openTransactions) {
          const d = tx.date || (tx.createdAt ? tx.createdAt.slice(0, 10) : '');
          if (!byDate.has(d)) byDate.set(d, []);
          byDate.get(d)!.push(tx);
        }

        const specialPeriods = this.getExaminerSpecialPeriods(clinicId);
        const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const dailyEntries: ProfessionalSettlementReport['dailyEntries'] = [];
        let totalConsultationsCount = 0;

        for (const [dateStr, txs] of Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
          const parts = dateStr.split('-');
          const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          const dayOfWeek = dateObj.getDay();
          const dayName = dayNames[dayOfWeek];
          const [year, month, day] = parts;
          const dayLabel = `${day}/${month}/${year} (${dayName})`;

          const workSession = this.getWorkSessionForDate(dateStr, examinerName, clinicId);
          const consultCount = txs.length;
          const isFixedPeriod = workSession.contractType === 'period_half_day' || workSession.contractType === 'period_full_day';

          if (isFixedPeriod) {
            totalConsultationsCount += consultCount;
            const isFullDay = workSession.contractType === 'period_full_day';

            // Identificar atendimentos dentro vs fora do período contratado
            let insideContractCount = 0;
            let outOfContractCount = 0;

            for (const tx of txs) {
              const matchedApt = allAppointments.find(a => 
                (tx.encounterId && a.id === tx.encounterId) ||
                (a.date === dateStr && a.patientName === tx.patientName)
              );

              // 1. Override manual expresso
              if (matchedApt?.isOutOfContractPeriod === true) {
                outOfContractCount++;
                continue;
              }

              // Extrai horário de atendimento do agendamento ou do createdAt da transação
              let timeStr = matchedApt?.time;
              if (!timeStr && tx.createdAt) {
                const dateParsed = new Date(tx.createdAt);
                if (!isNaN(dateParsed.getTime())) {
                  timeStr = dateParsed.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                    timeZone: 'America/Campo_Grande'
                  });
                }
              }

              let isOut = false;
              if (timeStr) {
                const [hStr, mStr] = timeStr.split(':');
                const tMinutes = (parseInt(hStr, 10) || 0) * 60 + (parseInt(mStr, 10) || 0);

                // 2. Verifica se há Período Extraordinário / Especial Negociado cobrindo esta data e horário
                const matchedSpecial = specialPeriods.find(p => {
                  if (p.status !== 'active' || p.date !== dateStr) return false;
                  const [sh, sm] = (p.startTime || '08:00').split(':').map(Number);
                  const [eh, em] = (p.endTime || '18:00').split(':').map(Number);
                  const sMin = (sh || 0) * 60 + (sm || 0);
                  const eMin = (eh || 0) * 60 + (em || 0);
                  return tMinutes >= sMin && tMinutes <= eMin;
                });

                if (matchedSpecial) {
                  // Coberto por período extraordinário negociado -> NÃO é avulso adicional
                  isOut = false;
                } else if (dayOfWeek === 2) {
                  // Terça-feira: das 13:00 às 18:00 contratado
                  isOut = tMinutes < 13 * 60 || tMinutes > 18 * 60;
                } else if (dayOfWeek === 3) {
                  // Quarta-feira: das 08:00 às 12:00 contratado
                  isOut = tMinutes < 8 * 60 || tMinutes > 12 * 60;
                }
              }

              if (isOut) {
                outOfContractCount++;
              } else {
                insideContractCount++;
              }
            }

            const countSuffix = insideContractCount > 0 
              ? ` • ${insideContractCount} atendimento${insideContractCount !== 1 ? 's' : ''} no período contratado` 
              : (consultCount > 0 ? ` • ${consultCount} atendimento${consultCount !== 1 ? 's' : ''} realizado${consultCount !== 1 ? 's' : ''}` : '');
            const descriptionBase = workSession.notes || (isFullDay ? 'Sábado - Período Fechado (Diária Integral) - Fixo R$ 1.000,00' : 'Meia Diária / Turno - Fixo R$ 500,00');

            dailyEntries.push({
              date: dateStr,
              dayLabel,
              type: isFullDay ? 'diaria_completa' : 'meia_diaria',
              description: `${descriptionBase}${countSuffix}`,
              quantity: 1,
              unitPrice: workSession.baseAmount,
              totalAmount: workSession.baseAmount
            });

            // Se houver atendimentos fora do período contratado no mesmo dia (ex: tarde de quarta-feira), acrescenta como consultas avulsas
            if (outOfContractCount > 0) {
              const avulsoUnitPrice = 50.00;
              dailyEntries.push({
                date: dateStr,
                dayLabel,
                type: 'consultas',
                description: `Atendimentos Avulsos fora do período contratado • ${outOfContractCount} consulta${outOfContractCount !== 1 ? 's' : ''} a R$ 50,00`,
                quantity: outOfContractCount,
                unitPrice: avulsoUnitPrice,
                totalAmount: outOfContractCount * avulsoUnitPrice
              });
            }
          } else {
            totalConsultationsCount += consultCount;
            dailyEntries.push({
              date: dateStr,
              dayLabel,
              type: 'consultas',
              description: `${consultCount} Consulta${consultCount !== 1 ? 's' : ''} Clínica${consultCount !== 1 ? 's' : ''} / Refração Realizadas`,
              quantity: consultCount,
              unitPrice: workSession.baseAmount,
              totalAmount: consultCount * workSession.baseAmount
            });
          }
        }

        const totalProductionAmount = dailyEntries.reduce((acc, e) => acc + e.totalAmount, 0);

        let periodDescription = 'A partir de 01/10/2026';
        if (dailyEntries.length > 0) {
          const firstDate = dailyEntries[0].date;
          const lastDate = dailyEntries[dailyEntries.length - 1].date;
          const fParts = firstDate.split('-');
          const lParts = lastDate.split('-');
          const fLabel = `${fParts[2]}/${fParts[1]}/${fParts[0]}`;
          const lLabel = `${lParts[2]}/${lParts[1]}/${lParts[0]}`;
          periodDescription = firstDate === lastDate ? `Dia ${fLabel}` : `${fLabel} a ${lLabel}`;
        }

        return {
          examinerName,
          periodDescription,
          previousBalancePending: 0,
          dailyEntries,
          totalConsultationsCount,
          totalProductionAmount,
          totalPayableAmount: totalProductionAmount,
          currentCashBalance: summary.currentBalance,
          hasCashAvailability: summary.currentBalance >= totalProductionAmount,
          settlementStatus: 'pending'
        };
      }

      // Caso base / histórico (Setembro 2026): Quitado por padrão com base nos atendimentos até 30/09/2026
      const isSettled = isPaidTx || isFlagSettled || allTransactions.every(t => {
        const txDate = t.date || (t.createdAt ? t.createdAt.slice(0, 10) : '');
        return txDate > '2026-09-30' || t.isSettled;
      });

      const previousBalancePending = 550.00;
      const dailyEntries: ProfessionalSettlementReport['dailyEntries'] = [
        {
          date: '2026-09-03',
          dayLabel: '03/09/2026 (Quinta-feira)',
          type: 'consultas',
          description: '12 Consultas Clínicas / Refração Realizadas',
          quantity: 12,
          unitPrice: 50.00,
          totalAmount: 600.00
        },
        {
          date: '2026-09-04',
          dayLabel: '04/09/2026 (Sexta-feira)',
          type: 'consultas',
          description: '5 Consultas Clínicas / Refração Realizadas',
          quantity: 5,
          unitPrice: 50.00,
          totalAmount: 250.00
        },
        {
          date: '2026-09-05',
          dayLabel: '05/09/2026 (Sábado - Hoje)',
          type: 'meia_diaria',
          description: 'Atendimento por Período (5h) / Meia Diária',
          quantity: 1,
          unitPrice: 500.00,
          totalAmount: 500.00
        }
      ];

      const totalConsultationsCount = 17;
      const totalProductionAmount = dailyEntries.reduce((acc, curr) => acc + curr.totalAmount, 0); // R$ 1.350,00
      const totalPayableAmount = previousBalancePending + totalProductionAmount; // R$ 1.900,00

      return {
        examinerName,
        periodDescription: 'Semana de 31/08/2026 a 05/09/2026',
        previousBalancePending,
        dailyEntries,
        totalConsultationsCount,
        totalProductionAmount,
        totalPayableAmount,
        currentCashBalance: summary.currentBalance,
        hasCashAvailability: summary.currentBalance >= totalPayableAmount,
        settlementStatus: isSettled ? 'settled' : 'pending'
      };
    }

    // Padrão para outras clínicas
    return {
      examinerName,
      periodDescription: 'Semana Atual',
      previousBalancePending: 0,
      dailyEntries: [],
      totalConsultationsCount: 0,
      totalProductionAmount: 0,
      totalPayableAmount: 0,
      currentCashBalance: summary.currentBalance,
      hasCashAvailability: true,
      settlementStatus: 'pending'
    };
  }

  private getInitialWorkSessionsForClinic(clinicId: string): ProfessionalWorkSession[] {
    if (clinicId === 'ivs') {
      return [
        {
          id: 'sess_ivs_1',
          clinicId: 'ivs',
          examinerId: 'user-examinador',
          examinerName: 'Dr. Rudson Meirelles',
          date: '2026-09-03',
          contractType: 'per_consultation',
          baseAmount: 50.00,
          notes: '12 consultas realizadas',
          status: 'closed',
          createdAt: '2026-09-03T18:00:00Z'
        },
        {
          id: 'sess_ivs_2',
          clinicId: 'ivs',
          examinerId: 'user-examinador',
          examinerName: 'Dr. Rudson Meirelles',
          date: '2026-09-04',
          contractType: 'per_consultation',
          baseAmount: 50.00,
          notes: '5 consultas realizadas',
          status: 'closed',
          createdAt: '2026-09-04T18:00:00Z'
        },
        {
          id: 'sess_ivs_3',
          clinicId: 'ivs',
          examinerId: 'user-examinador',
          examinerName: 'Dr. Rudson Meirelles',
          date: '2026-09-05',
          contractType: 'period_half_day',
          baseAmount: 500.00,
          notes: 'Atendimento por Período de 5h (Meia Diária)',
          status: 'active',
          createdAt: '2026-09-05T08:00:00Z'
        },
        {
          id: 'sess_ivs_1010',
          clinicId: 'ivs',
          examinerId: 'user-examinador',
          examinerName: 'Dr. Rudson Meirelles',
          date: '2026-10-10',
          contractType: 'period_full_day',
          baseAmount: 1000.00,
          notes: 'Sábado (10/10/2026) - Período Fechado (Diária Integral) - Fixo R$ 1.000,00',
          status: 'active',
          createdAt: '2026-10-10T08:00:00Z'
        },
        {
          id: 'sess_ivs_1710',
          clinicId: 'ivs',
          examinerId: 'user-examinador',
          examinerName: 'Dr. Rudson Meirelles',
          date: '2026-10-17',
          contractType: 'period_full_day',
          baseAmount: 1000.00,
          notes: 'Sábado (17/10/2026) - Atendimento Regime Integral Diária - Fixo R$ 1.000,00',
          status: 'active',
          createdAt: '2026-10-17T08:00:00Z'
        }
      ];
    }
    return [];
  }

  private getInitialTransactionsForClinic(clinicId: string): FinancialTransaction[] {
    const today = new Date().toISOString().split('T')[0];
    const isIvs = clinicId === 'ivs';
    
    if (isIvs) {
      return [
        // Lançamentos do dia de hoje (05/09/2026)
        {
          id: `tx_${clinicId}_1`,
          clinicId,
          type: 'income',
          category: 'consulta',
          description: 'Consulta Oftalmológica & Exame de Refração - Maria Helena',
          amount: 50.00,
          date: today,
          paymentMethod: 'pix',
          patientName: 'Maria Helena dos Santos',
          receiptNumber: 'REC-2026-8801',
          status: 'completed',
          createdBy: 'Recepção',
          createdAt: new Date().toISOString()
        },
        {
          id: `tx_${clinicId}_2`,
          clinicId,
          type: 'income',
          category: 'consulta',
          description: 'Consulta de Retorno (Controle de Rotina) - Retorno Gratuito',
          amount: 0.00,
          date: today,
          paymentMethod: 'cash',
          patientName: 'Enzo Gabriel Silva',
          receiptNumber: 'REC-2026-8802',
          status: 'completed',
          createdBy: 'Recepção',
          createdAt: new Date().toISOString()
        },
        {
          id: `tx_${clinicId}_3`,
          clinicId,
          type: 'income',
          category: 'venda_lentes',
          description: 'Venda de Óculos Completo + Lentes Antirreflexo',
          amount: 450.00,
          date: today,
          paymentMethod: 'credit_card',
          patientName: 'Juan Carlos Benítez',
          receiptNumber: 'REC-2026-8803',
          status: 'completed',
          createdBy: 'Recepção',
          createdAt: new Date().toISOString()
        },
        {
          id: `tx_${clinicId}_4`,
          clinicId,
          type: 'income',
          category: 'consulta',
          description: 'Faturamento de Consultas do Dia 03/09 (12 atendimentos a R$ 50)',
          amount: 600.00,
          date: '2026-09-03',
          paymentMethod: 'pix',
          receiptNumber: 'REC-2026-8790',
          status: 'completed',
          isSettled: true,
          settledAt: '2026-09-30T23:59:59.000Z',
          createdBy: 'Recepção',
          createdAt: '2026-09-03T18:00:00Z'
        },
        {
          id: `tx_${clinicId}_5`,
          clinicId,
          type: 'income',
          category: 'consulta',
          description: 'Faturamento de Consultas do Dia 04/09 (5 atendimentos a R$ 50)',
          amount: 250.00,
          date: '2026-09-04',
          paymentMethod: 'pix',
          receiptNumber: 'REC-2026-8795',
          status: 'completed',
          isSettled: true,
          settledAt: '2026-09-30T23:59:59.000Z',
          createdBy: 'Recepção',
          createdAt: '2026-09-04T18:00:00Z'
        },
        {
          id: `tx_${clinicId}_6`,
          clinicId,
          type: 'income',
          category: 'procedimento',
          description: 'Caixa Inicial & Faturamento de Exames Acumulado na Semana',
          amount: 1200.00,
          date: today,
          paymentMethod: 'pix',
          receiptNumber: 'REC-2026-8800',
          status: 'completed',
          createdBy: 'Administração',
          createdAt: new Date().toISOString()
        },
        {
          id: `tx_${clinicId}_repasse_quitado_3009`,
          clinicId,
          type: 'expense',
          category: 'salario',
          description: 'Repasse & Acerto Semanal de Atendimentos: Dr. Rudson Meirelles (Ref: Acerto quitado até 30/09/2026)',
          amount: 1900.00,
          amountCents: 190000,
          currency: 'BRL',
          date: '2026-09-30',
          paymentMethod: 'pix',
          receiptNumber: 'REP-2026-3009',
          status: 'completed',
          isSettled: true,
          settledAt: '2026-09-30T23:59:59.000Z',
          createdBy: 'Direção Administrativa / Financeiro',
          createdAt: '2026-09-30T20:00:00.000Z'
        }
      ];
    }

    return [
      {
        id: `tx_${clinicId}_1`,
        clinicId,
        type: 'income',
        category: 'consulta',
        description: 'Consulta Oftalmológica & Exame de Refração - Maria Helena',
        amount: 150.00,
        date: today,
        paymentMethod: 'pix',
        patientName: 'Maria Helena dos Santos',
        status: 'completed',
        createdBy: 'Recepção',
        createdAt: new Date().toISOString()
      },
      {
        id: `tx_${clinicId}_2`,
        clinicId,
        type: 'income',
        category: 'consulta',
        description: 'Consulta de Retorno (Controle de Rotina) - Retorno Gratuito',
        amount: 0.00,
        date: today,
        paymentMethod: 'cash',
        patientName: 'Enzo Gabriel Silva',
        status: 'completed',
        createdBy: 'Recepção',
        createdAt: new Date().toISOString()
      },
      {
        id: `tx_${clinicId}_3`,
        clinicId,
        type: 'income',
        category: 'venda_lentes',
        description: 'Par de Lentes com Antirreflexo Crizal',
        amount: 200.00,
        date: today,
        paymentMethod: 'credit_card',
        patientName: 'Juan Carlos Benítez',
        status: 'completed',
        createdBy: 'Recepção',
        createdAt: new Date().toISOString()
      },
      {
        id: `tx_${clinicId}_4`,
        clinicId,
        type: 'expense',
        category: 'fornecedor_insumos',
        description: 'Compra de colírios anestésicos e tiras de fluoresceína',
        amount: 55.00,
        date: today,
        paymentMethod: 'pix',
        status: 'completed',
        createdBy: 'Administração',
        createdAt: new Date().toISOString()
      }
    ];
  }

  private getInitialAppointmentsForClinic(clinicId: string): Appointment[] {
    const today = new Date().toISOString().split('T')[0];
    if (clinicId === 'ivs') {
      return [];
    } else if (clinicId === 'megastar') {
      return [
        {
          id: 'apt-ms-1',
          patientId: 'p2-megastar',
          patientName: 'Juan Carlos Benítez',
          patientNationality: 'PY',
          patientPhone: '+595 981 456789',
          patientDocument: '4.892.120',
          examinerId: 'user-examinador',
          examinerName: 'Dr. Rudson Meirelles',
          date: today,
          time: '09:15',
          durationMinutes: 30,
          type: 'consulta_geral',
          status: 'confirmed',
          notes: 'Exame de refração e adaptação de lentes.',
          room: 'Consultório Mega Star',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    } else if (clinicId === 'vision') {
      return [
        {
          id: 'apt-vis-1',
          patientId: 'p3-vision',
          patientName: 'Enzo Gabriel Silva (Menor)',
          patientNationality: 'BR',
          patientPhone: '+55 (45) 97777-8888',
          patientDocument: '12.345.678-9',
          examinerId: 'user-examinador',
          examinerName: 'Dr. Rudson Meirelles',
          date: today,
          time: '10:00',
          durationMinutes: 30,
          type: 'pediatrico',
          status: 'scheduled',
          notes: 'Acompanhado pela mãe.',
          room: 'Consultório Visual',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    }
    return [];
  }

  // ==========================================================================
  // MOTOR DE REMUNERAÇÃO DOS EXAMINADORES: PERSISTÊNCIA & REGRAS (OFFLINE-FIRST)
  // ==========================================================================

  public getExaminerFixedPeriods(clinicId = this.activeClinicId): ExaminerFixedPeriod[] {
    try {
      const raw = localStorage.getItem(this.getKey('examiner_fixed_periods', clinicId));
      if (!raw) {
        const initial = this.getInitialExaminerFixedPeriods(clinicId);
        this.saveExaminerFixedPeriods(initial, clinicId);
        return initial;
      }
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveExaminerFixedPeriods(periods: ExaminerFixedPeriod[], clinicId = this.activeClinicId): void {
    this.safeSetItem(this.getKey('examiner_fixed_periods', clinicId), JSON.stringify(periods));
    indexedDbStorage.saveAll('examiner_fixed_periods' as any, clinicId, periods).catch(e => console.warn('[IDB] saveFixedPeriods:', e));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_examiner_periods_updated', { detail: { clinicId } }));
    }
    this.broadcastSync('optomed_examiner_periods_updated', { clinicId });
    remoteSync.push(clinicId, 'examiner_fixed_periods' as any, periods);
  }

  public saveExaminerFixedPeriod(period: ExaminerFixedPeriod, clinicId = this.activeClinicId): void {
    const list = this.getExaminerFixedPeriods(clinicId);
    const idx = list.findIndex(p => p.id === period.id);
    const now = new Date().toISOString();
    if (idx >= 0) {
      list[idx] = { ...period, updatedAt: now };
    } else {
      list.push({ ...period, createdAt: period.createdAt || now, updatedAt: now });
    }
    this.saveExaminerFixedPeriods(list, clinicId);
    this.logAudit('CREATE', 'FINANCE' as any, period.id, `Período Fixo ${period.dayOfWeek} (${period.startTime}-${period.endTime}) salvo para ${period.examinerName}`, clinicId);
    this.enqueueOutboxMutation(clinicId, 'examiner_fixed_periods' as any, idx >= 0 ? 'update' : 'create', period.id, list[idx >= 0 ? idx : list.length - 1]);
    remoteSync.upsert(clinicId, 'examiner_fixed_periods' as any, list[idx >= 0 ? idx : list.length - 1]).catch(e => console.warn('[Sync] upsert fixed period:', e));
  }

  public deleteExaminerFixedPeriod(id: string, clinicId = this.activeClinicId): void {
    const list = this.getExaminerFixedPeriods(clinicId).filter(p => p.id !== id);
    this.saveExaminerFixedPeriods(list, clinicId);
    this.logAudit('DELETE', 'FINANCE' as any, id, `Período Fixo removido`, clinicId);
    this.enqueueOutboxMutation(clinicId, 'examiner_fixed_periods' as any, 'delete', id, { id, _deleted: true });
    remoteSync.remove(clinicId, 'examiner_fixed_periods' as any, id).catch(e => console.warn('[Sync] remove fixed period:', e));
  }

  public getExaminerSpecialPeriods(clinicId = this.activeClinicId): ExaminerSpecialPeriod[] {
    try {
      const raw = localStorage.getItem(this.getKey('examiner_special_periods', clinicId));
      if (!raw) {
        const initial = this.getInitialExaminerSpecialPeriods(clinicId);
        this.saveExaminerSpecialPeriods(initial, clinicId);
        return initial;
      }
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveExaminerSpecialPeriods(periods: ExaminerSpecialPeriod[], clinicId = this.activeClinicId): void {
    this.safeSetItem(this.getKey('examiner_special_periods', clinicId), JSON.stringify(periods));
    indexedDbStorage.saveAll('examiner_special_periods' as any, clinicId, periods).catch(e => console.warn('[IDB] saveSpecialPeriods:', e));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_examiner_periods_updated', { detail: { clinicId } }));
    }
    this.broadcastSync('optomed_examiner_periods_updated', { clinicId });
    remoteSync.push(clinicId, 'examiner_special_periods' as any, periods);
  }

  public saveExaminerSpecialPeriod(period: ExaminerSpecialPeriod, clinicId = this.activeClinicId): void {
    const list = this.getExaminerSpecialPeriods(clinicId);
    const idx = list.findIndex(p => p.id === period.id);
    const now = new Date().toISOString();
    if (idx >= 0) {
      list[idx] = { ...period, updatedAt: now };
    } else {
      list.push({ ...period, createdAt: period.createdAt || now, updatedAt: now });
    }
    this.saveExaminerSpecialPeriods(list, clinicId);
    this.logAudit('CREATE', 'FINANCE' as any, period.id, `Período Extraordinário ${period.date} (${period.startTime}-${period.endTime}) salvo para ${period.examinerName}`, clinicId);
    this.enqueueOutboxMutation(clinicId, 'examiner_special_periods' as any, idx >= 0 ? 'update' : 'create', period.id, list[idx >= 0 ? idx : list.length - 1]);
    remoteSync.upsert(clinicId, 'examiner_special_periods' as any, list[idx >= 0 ? idx : list.length - 1]).catch(e => console.warn('[Sync] upsert special period:', e));
  }

  public deleteExaminerSpecialPeriod(id: string, clinicId = this.activeClinicId): void {
    const list = this.getExaminerSpecialPeriods(clinicId).filter(p => p.id !== id);
    this.saveExaminerSpecialPeriods(list, clinicId);
    this.logAudit('DELETE', 'FINANCE' as any, id, `Período Extraordinário removido`, clinicId);
    this.enqueueOutboxMutation(clinicId, 'examiner_special_periods' as any, 'delete', id, { id, _deleted: true });
    remoteSync.remove(clinicId, 'examiner_special_periods' as any, id).catch(e => console.warn('[Sync] remove special period:', e));
  }

  public getExaminerAvulsoRules(clinicId = this.activeClinicId): ExaminerAvulsoRule[] {
    try {
      const raw = localStorage.getItem(this.getKey('examiner_avulso_rules', clinicId));
      if (!raw) {
        const initial = this.getInitialExaminerAvulsoRules(clinicId);
        this.saveExaminerAvulsoRules(initial, clinicId);
        return initial;
      }
      const parsed: ExaminerAvulsoRule[] = JSON.parse(raw);
      // Migração suave caso a regra inicial anterior do IVS de R$ 100 ainda esteja no cache local
      if (clinicId === 'ivs') {
        let changed = false;
        const updated = parsed.map(r => {
          if (r.id === 'eav_ivs_meirelles' && r.perAppointmentAmount === 100.00) {
            changed = true;
            return {
              ...r,
              perAppointmentAmount: 50.00,
              notes: 'Atendimento Avulso IVS (fora de período fixo/extraordinário): R$ 50,00 por consulta (100% repasse)'
            };
          }
          return r;
        });
        if (changed) {
          this.saveExaminerAvulsoRules(updated, clinicId);
          return updated;
        }
      }
      return parsed;
    } catch {
      return [];
    }
  }

  public saveExaminerAvulsoRules(rules: ExaminerAvulsoRule[], clinicId = this.activeClinicId): void {
    this.safeSetItem(this.getKey('examiner_avulso_rules', clinicId), JSON.stringify(rules));
    indexedDbStorage.saveAll('examiner_avulso_rules' as any, clinicId, rules).catch(e => console.warn('[IDB] saveAvulsoRules:', e));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_examiner_periods_updated', { detail: { clinicId } }));
    }
    this.broadcastSync('optomed_examiner_periods_updated', { clinicId });
    remoteSync.push(clinicId, 'examiner_avulso_rules' as any, rules);
  }

  public saveExaminerAvulsoRule(rule: ExaminerAvulsoRule, clinicId = this.activeClinicId): void {
    const list = this.getExaminerAvulsoRules(clinicId);
    const idx = list.findIndex(r => r.id === rule.id);
    const now = new Date().toISOString();
    if (idx >= 0) {
      list[idx] = { ...rule, updatedAt: now };
    } else {
      list.push({ ...rule, createdAt: rule.createdAt || now, updatedAt: now });
    }
    this.saveExaminerAvulsoRules(list, clinicId);
    this.logAudit('CREATE', 'FINANCE' as any, rule.id, `Regra Avulsa para ${rule.examinerName}: R$ ${rule.perAppointmentAmount.toFixed(2)}`, clinicId);
    this.enqueueOutboxMutation(clinicId, 'examiner_avulso_rules' as any, idx >= 0 ? 'update' : 'create', rule.id, list[idx >= 0 ? idx : list.length - 1]);
    remoteSync.upsert(clinicId, 'examiner_avulso_rules' as any, list[idx >= 0 ? idx : list.length - 1]).catch(e => console.warn('[Sync] upsert avulso rule:', e));
  }

  public getExaminerRemunerations(clinicId = this.activeClinicId): ExaminerRemunerationRecord[] {
    try {
      const raw = localStorage.getItem(this.getKey('examiner_remunerations', clinicId));
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveExaminerRemunerations(records: ExaminerRemunerationRecord[], clinicId = this.activeClinicId): void {
    this.safeSetItem(this.getKey('examiner_remunerations', clinicId), JSON.stringify(records));
    indexedDbStorage.saveAll('examiner_remunerations' as any, clinicId, records).catch(e => console.warn('[IDB] saveRemunerations:', e));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_examiner_remuneration_updated', { detail: { clinicId } }));
    }
    this.broadcastSync('optomed_examiner_remuneration_updated', { clinicId });
    remoteSync.push(clinicId, 'examiner_remunerations' as any, records);
  }

  public saveExaminerRemuneration(record: ExaminerRemunerationRecord, clinicId = this.activeClinicId): void {
    const list = this.getExaminerRemunerations(clinicId);
    const idx = list.findIndex(r => r.id === record.id);
    const now = new Date().toISOString();
    if (idx >= 0) {
      list[idx] = { ...record, updatedAt: now };
    } else {
      list.unshift({ ...record, createdAt: record.createdAt || now, updatedAt: now });
    }
    this.saveExaminerRemunerations(list, clinicId);
    this.enqueueOutboxMutation(clinicId, 'examiner_remunerations' as any, idx >= 0 ? 'update' : 'create', record.id, list[idx >= 0 ? idx : 0]);
    remoteSync.upsert(clinicId, 'examiner_remunerations' as any, list[idx >= 0 ? idx : 0]).catch(e => console.warn('[Sync] upsert examiner remuneration:', e));
  }

  public getExaminerClosures(clinicId = this.activeClinicId): ExaminerClosureRecord[] {
    try {
      const raw = localStorage.getItem(this.getKey('examiner_closures', clinicId));
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveExaminerClosures(closures: ExaminerClosureRecord[], clinicId = this.activeClinicId): void {
    this.safeSetItem(this.getKey('examiner_closures', clinicId), JSON.stringify(closures));
    indexedDbStorage.saveAll('examiner_closures' as any, clinicId, closures).catch(e => console.warn('[IDB] saveClosures:', e));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_examiner_closures_updated', { detail: { clinicId } }));
    }
    this.broadcastSync('optomed_examiner_closures_updated', { clinicId });
    remoteSync.push(clinicId, 'examiner_closures' as any, closures);
  }

  public saveExaminerClosure(closure: ExaminerClosureRecord, clinicId = this.activeClinicId): void {
    const list = this.getExaminerClosures(clinicId);
    const idx = list.findIndex(c => c.id === closure.id);
    if (idx >= 0) {
      list[idx] = closure;
    } else {
      list.unshift(closure);
    }
    this.saveExaminerClosures(list, clinicId);
    this.logAudit('CREATE', 'FINANCE' as any, closure.id, `Fechamento de remuneração de ${closure.startDate} a ${closure.endDate} para ${closure.examinerName}: R$ ${closure.totalGrossAmount.toFixed(2)}`, clinicId);
    this.enqueueOutboxMutation(clinicId, 'examiner_closures' as any, idx >= 0 ? 'update' : 'create', closure.id, closure);
    remoteSync.upsert(clinicId, 'examiner_closures' as any, closure).catch(e => console.warn('[Sync] upsert examiner closure:', e));
  }

  // Sementes iniciais para a clínica IVS (Dr. Rudson Meirelles)
  private getInitialExaminerFixedPeriods(clinicId: string): ExaminerFixedPeriod[] {
    if (clinicId === 'ivs') {
      return [
        {
          id: 'efp_ivs_tuesday',
          clinicId: 'ivs',
          examinerId: 'user-examinador',
          examinerName: 'Dr. Rudson Meirelles',
          dayOfWeek: 2, // Terça-feira
          startTime: '13:00',
          endTime: '18:00',
          validFrom: '2026-10-01',
          remunerationType: 'fixed_period',
          fixedAmount: 500.00,
          active: true,
          notes: 'Terça-feira (13:00 às 18:00) - Fixo R$ 500,00 por período contratado',
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z'
        },
        {
          id: 'efp_ivs_wednesday',
          clinicId: 'ivs',
          examinerId: 'user-examinador',
          examinerName: 'Dr. Rudson Meirelles',
          dayOfWeek: 3, // Quarta-feira
          startTime: '08:00',
          endTime: '13:00',
          validFrom: '2026-10-01',
          remunerationType: 'fixed_period',
          fixedAmount: 500.00,
          active: true,
          notes: 'Quarta-feira (08:00 às 13:00) - Fixo R$ 500,00 por período contratado',
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z'
        }
      ];
    }
    return [];
  }

  private getInitialExaminerSpecialPeriods(clinicId: string): ExaminerSpecialPeriod[] {
    if (clinicId === 'ivs') {
      return [
        {
          id: 'esp_ivs_mutirao_1010',
          clinicId: 'ivs',
          examinerId: 'user-examinador',
          examinerName: 'Dr. Rudson Meirelles',
          date: '2026-10-10',
          startTime: '08:00',
          endTime: '12:00',
          remunerationType: 'fixed_period',
          fixedAmount: 350.00,
          status: 'active',
          notes: 'Mutirão Especial de Sábado - R$ 350,00',
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z'
        }
      ];
    }
    return [];
  }

  private getInitialExaminerAvulsoRules(clinicId: string): ExaminerAvulsoRule[] {
    if (clinicId === 'ivs') {
      return [
        {
          id: 'eav_ivs_meirelles',
          clinicId: 'ivs',
          examinerId: 'user-examinador',
          examinerName: 'Dr. Rudson Meirelles',
          perAppointmentAmount: 50.00,
          active: true,
          notes: 'Atendimento Avulso IVS (fora de período fixo/extraordinário): R$ 50,00 por consulta (100% repasse)',
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z'
        }
      ];
    }
    return [];
  }
}

export const offlineDb = new OfflineDatabaseService();

