/**
 * OPTOMED AUDITED LOCAL EXPORT ENGINE V2.8
 * Motor de preservação e auditoria local estritamente somente leitura.
 * Compatível com execução via DevTools Snippets ou testes automatizados Vitest.
 */

export const DB_NAME = 'optomed_db_v2';
export const EXPECTED_STORES = [
  'patients', 'episodes', 'encounters', 'appointments', 'prescriptions',
  'transactions', 'work_sessions', 'pos_items', 'cash_registers',
  'audit_logs', 'sync_queue', 'metadata', 'evolutions', 'clinical_documents',
  'examiner_fixed_periods', 'examiner_special_periods', 'examiner_avulso_rules',
  'examiner_remunerations', 'examiner_closures'
] as const;

export const KNOWN_ENTITIES = [
  'clinics', 'patients', 'episodes', 'appointments', 'encounters', 'prescriptions',
  'transactions', 'work_sessions', 'pos_items', 'cash_registers', 'audit_logs',
  'evolutions', 'clinical_documents', 'examiner_fixed_periods', 'examiner_special_periods',
  'examiner_avulso_rules', 'examiner_remunerations', 'examiner_closures'
] as const;

/**
 * Identifica a entidade a partir da chave do LocalStorage de forma resiliente
 * mesmo quando o clinicId possui múltiplos sublinhados (ex: optotipo_ivs_matriz_sul_patients_v2).
 */
export function parseLocalStorageEntityKey(key: string): { entityName: string; clinicId: string | null; isRecognized: boolean } {
  if (key === 'optomed_offline_sync_queue_v2') {
    return { entityName: 'outbox', clinicId: null, isRecognized: true };
  }

  if (key.startsWith('optotipo_') && key.endsWith('_v2')) {
    const core = key.slice('optotipo_'.length, -'_v2'.length);
    for (const ent of KNOWN_ENTITIES) {
      if (core === ent) {
        return { entityName: ent, clinicId: null, isRecognized: true };
      }
      if (core.endsWith('_' + ent)) {
        const clinicPart = core.slice(0, -(ent.length + 1));
        return { entityName: ent, clinicId: clinicPart, isRecognized: true };
      }
    }
  }

  return { entityName: 'unrecognized_entity', clinicId: null, isRecognized: false };
}

/**
 * Normaliza e identifica chaves sensíveis que contenham credenciais, tokens, segredos ou sessões.
 * Cobre explicitamente: password, pinHash, jwt, cookie, session, idToken, clientSecret,
 * privateKey, credentialHash, refreshToken, accessToken e variantes.
 */
export function isSensitiveKey(k: string): boolean {
  const lower = String(k).toLowerCase();
  const normalized = lower.replace(/[-_]/g, '');

  // Exceções explícitas para termos clínicos legítimos que contêm a substring 'session'
  if (k === 'sessionNumber' || k === 'sessionDate' || lower === 'session_number' || lower === 'session_date') {
    return false;
  }

  // Se a chave for exatamente 'session' ou 'sessionid', ou começar com session, é sensível
  const isSessionSensitive = (
    normalized === 'session' ||
    normalized.includes('sessionid') ||
    normalized.includes('sessioncookie') ||
    normalized.includes('sessiontoken') ||
    normalized.includes('useression') ||
    normalized.includes('currentsession')
  );

  return (
    normalized.includes('password') ||
    normalized.includes('pinhash') ||
    normalized.includes('jwt') ||
    normalized.includes('cookie') ||
    isSessionSensitive ||
    normalized.includes('idtoken') ||
    normalized.includes('clientsecret') ||
    normalized.includes('privatekey') ||
    normalized.includes('credentialhash') ||
    normalized.includes('refreshtoken') ||
    normalized.includes('accesstoken') ||
    normalized.includes('authtoken') ||
    normalized.includes('bearertoken') ||
    normalized.includes('tokenvalue') ||
    normalized.includes('passwordhash') ||
    normalized.includes('rawpassword') ||
    normalized === 'secret' ||
    normalized === 'token' ||
    normalized === 'salt' ||
    normalized === 'salthex' ||
    normalized === 'storedhash' ||
    normalized === 'authorization' ||
    normalized === 'apikey' ||
    normalized === 'licensekey'
  );
}

/**
 * Sanitiza recursivamente valores sensíveis sem tocar em dados clínicos nem identificadores legítimos.
 */
export function sanitizeSecretsRecursively(val: any): any {
  if (val === null || val === undefined) return val;
  if (Array.isArray(val)) return val.map(sanitizeSecretsRecursively);
  if (typeof val === 'object') {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (isSensitiveKey(k)) {
        continue;
      }
      clean[k] = sanitizeSecretsRecursively(v);
    }
    return clean;
  }
  return val;
}

/**
 * Interpretação estrita de data e fuso horário para o fuso clínico local (America/Campo_Grande UTC-4).
 * - Datas civis puras (YYYY-MM-DD ou DD/MM/YYYY) são preservadas como datas civis sem conversão de fuso.
 * - Instantes (ISO com Z ou offset, ou Epoch ms) são convertidos para o dia civil correspondente em Campo Grande.
 */
export function parseCanonicalDate(val: any, targetTz = 'America/Campo_Grande'): string | null {
  if (val === null || val === undefined || val === '') return null;

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      const p = trimmed.split('/');
      return `${p[2]}-${p[1]}-${p[0]}`;
    }
  }

  const d = new Date(val);
  if (isNaN(d.getTime())) return null;

  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: targetTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return fmt.format(d);
  } catch {
    return null;
  }
}

/**
 * Classificador temporal segregando Data Clínica, Timestamp Técnico e Timestamp de Outbox.
 */
export function inspectRecordDates(record: any, entityName: string, targetTz = 'America/Campo_Grande') {
  if (!record || typeof record !== 'object') {
    return { clinical: 'no_record', technical: 'no_record', outbox: 'no_record' };
  }

  const classify = (dateStr: string | null) => {
    if (!dateStr) return 'invalid_or_missing';
    if (dateStr === '2026-10-19') return '19_oct';
    if (dateStr === '2026-10-20') return '20_oct';
    return 'other_date';
  };

  // 1. Data Clínica
  let clinicalCandidates: any[] = [];
  if (entityName === 'appointments') clinicalCandidates = [record.date];
  else if (entityName === 'encounters') clinicalCandidates = [record.date, record.startedAt, record.completedAt];
  else if (entityName === 'prescriptions') clinicalCandidates = [record.date, record.issuedAt];
  else if (entityName === 'transactions') clinicalCandidates = [record.date];
  else if (entityName === 'clinical_documents') clinicalCandidates = [record.date, record.issuedAt];
  else if (entityName === 'evolutions') clinicalCandidates = [record.date];
  else clinicalCandidates = [record.date, record.startedAt, record.completedAt, record.issuedAt];

  let clinicalStatus = 'invalid_or_missing';
  for (const c of clinicalCandidates) {
    if (c !== undefined && c !== null && c !== '') {
      const res = classify(parseCanonicalDate(c, targetTz));
      if (res === '19_oct' || res === '20_oct') {
        clinicalStatus = res;
        break;
      } else if (res === 'other_date') {
        clinicalStatus = 'other_date';
      }
    }
  }

  // 2. Timestamp Técnico
  let technicalStatus = 'invalid_or_missing';
  const techCandidates = [record.updatedAt, record.createdAt, record.timestamp];
  for (const t of techCandidates) {
    if (t !== undefined && t !== null && t !== '') {
      const res = classify(parseCanonicalDate(t, targetTz));
      if (res === '19_oct' || res === '20_oct') {
        technicalStatus = res;
        break;
      } else if (res === 'other_date') {
        technicalStatus = 'other_date';
      }
    }
  }

  // 3. Timestamp da Outbox
  let outboxStatus = 'invalid_or_missing';
  if (record.operationId || entityName === 'outbox' || entityName === 'sync_queue') {
    const outboxCandidates = [record.createdAt, record.timestamp];
    for (const o of outboxCandidates) {
      if (o !== undefined && o !== null && o !== '') {
        const res = classify(parseCanonicalDate(o, targetTz));
        if (res === '19_oct' || res === '20_oct') {
          outboxStatus = res;
          break;
        } else if (res === 'other_date') {
          outboxStatus = 'other_date';
        }
      }
    }
  }

  if (record.payload && typeof record.payload === 'object') {
    const inner = inspectRecordDates(record.payload, record.entity || entityName, targetTz);
    if (clinicalStatus === 'invalid_or_missing') clinicalStatus = inner.clinical;
    if (technicalStatus === 'invalid_or_missing') technicalStatus = inner.technical;
  }

  return { clinical: clinicalStatus, technical: technicalStatus, outbox: outboxStatus };
}

export interface ExportEngineOptions {
  windowObj?: any;
  customTimeoutMs?: number;
  onDownloadReady?: (filename: string, content: string) => boolean;
}

/**
 * Função principal do exportador local V2.8
 */
export async function runOptomedLocalExport(options: ExportEngineOptions = {}) {
  const win = options.windowObj || (typeof window !== 'undefined' ? window : null);
  const timeoutMs = options.customTimeoutMs || 8000;

  const backupReport: any = {
    metadata: {
      generator: 'Optomed Final Local Audit Engine v2.8-PRODUCTION-AUDITED',
      exportedAt: new Date().toISOString(),
      browserPlatform: win?.navigator?.platform || 'node_env',
      browserUserAgent: win?.navigator?.userAgent || 'vitest_env',
      isOnline: win?.navigator?.onLine ?? true,
      activeClinicId: win?.localStorage?.getItem?.('optotipo_active_clinic_id_v2') ||
                      win?.localStorage?.getItem?.('optotipo_active_clinic_id') || 'ivs'
    },
    auditStatus: {
      readStatus: 'IN_PROGRESS',
      serializationStatus: 'PENDING',
      downloadInitiated: false,
      fileVerifiedOnDisk: false, // Sempre false dentro do arquivo gerado
      isReadAndSerializedComplete: false, // Indica exclusivamente leitura e serialização válidas
      isExportComplete: false, // Conclusão técnica completa (leitura integral, serialização 100% e download iniciado)
      errorsCount: 0,
      errorsList: []
    },
    sourcesSummary: {
      indexedDb: {
        databaseName: DB_NAME,
        accessible: false,
        actualVersion: null,
        storesExpected: EXPECTED_STORES.length,
        storesFound: 0,
        storesSuccessfullyRead: 0,
        missingExpectedStores: [] as string[],
        additionalStoresFound: [] as string[],
        storesWithReadError: [] as string[],
        totalRecordsByStore: {} as Record<string, number>,
        totalRecordsAllStores: 0
      },
      localStorage: {
        totalKeysInStorage: 0,
        relevantKeysFound: 0,
        keysSuccessfullyRead: 0,
        keysWithReadError: [] as string[],
        unrecognizedKeys: [] as string[],
        recordsByEntity: {} as Record<string, number>
      },
      outboxSources: {
        localStorageOutbox: {
          exists: false,
          physicalTotal: 0,
          withOperationIdCount: 0,
          withoutOperationIdCount: 0,
          unparseablePayloadsCount: 0,
          byState: { pending: 0, processing: 0, failed: 0, success: 0, other: 0 }
        },
        indexedDbSyncQueue: {
          exists: false,
          physicalTotal: 0,
          withOperationIdCount: 0,
          withoutOperationIdCount: 0,
          unparseablePayloadsCount: 0,
          byState: { pending: 0, processing: 0, failed: 0, success: 0, other: 0 }
        },
        distinctOperationIdsCount: 0,
        duplicateOperationsAcrossSourcesCount: 0
      }
    },
    patientCensusBySource: {
      indexedDbPersistedPatients: {
        physicalRecords: 0,
        withGlobalIdCount: 0,
        withLocalIdOnlyCount: 0,
        withDocumentOnlyCount: 0,
        withNameOnlyCount: 0,
        missingAllIdentifiersCount: 0
      },
      localStoragePersistedPatients: {
        physicalRecords: 0,
        withGlobalIdCount: 0,
        withLocalIdOnlyCount: 0,
        withDocumentOnlyCount: 0,
        withNameOnlyCount: 0,
        missingAllIdentifiersCount: 0
      },
      outboxPayloadPatients: {
        physicalRecords: 0,
        withGlobalIdCount: 0,
        withLocalIdOnlyCount: 0,
        withDocumentOnlyCount: 0,
        withNameOnlyCount: 0,
        missingAllIdentifiersCount: 0
      },
      crossSourceAudit: {
        distinctGlobalIdsAcrossSources: 0,
        distinctLocalIdsAcrossSources: 0,
        duplicateGlobalIdsAcrossSources: 0,
        potentialNameCollisions: 0
      }
    },
    semanticTemporalInventory: {
      october19: {
        byClinicalDate: { patients: 0, appointments: 0, encounters: 0, prescriptions: 0, transactions: 0, clinical_documents: 0, evolutions: 0, other: 0, total: 0 },
        byTechnicalTimestamp: { patients: 0, appointments: 0, encounters: 0, prescriptions: 0, transactions: 0, clinical_documents: 0, evolutions: 0, other: 0, total: 0 },
        byOutboxTimestamp: 0
      },
      october20: {
        byClinicalDate: { patients: 0, appointments: 0, encounters: 0, prescriptions: 0, transactions: 0, clinical_documents: 0, evolutions: 0, other: 0, total: 0 },
        byTechnicalTimestamp: { patients: 0, appointments: 0, encounters: 0, prescriptions: 0, transactions: 0, clinical_documents: 0, evolutions: 0, other: 0, total: 0 },
        byOutboxTimestamp: 0
      },
      otherDatesCount: 0,
      invalidOrMissingDatesCount: 0
    },
    data: {
      indexedDb: {} as Record<string, any[]>,
      localStorageEntities: {} as Record<string, any>,
      localStorageOutboxOperations: [] as any[],
      indexedDbSyncQueueOperations: [] as any[]
    }
  };

  const allGlobalIds = new Set<string>();
  const allLocalIds = new Set<string>();
  const seenGlobalIdsPerSource = new Map<string, Set<string>>([
    ['idb', new Set<string>()],
    ['ls', new Set<string>()],
    ['outbox', new Set<string>()]
  ]);
  const nameOnlyMap = new Map<string, number>();

  function registerPatientBySource(patientObj: any, source: 'idb' | 'ls' | 'outbox') {
    if (!patientObj || typeof patientObj !== 'object') return;

    let targetBucket;
    if (source === 'idb') targetBucket = backupReport.patientCensusBySource.indexedDbPersistedPatients;
    else if (source === 'ls') targetBucket = backupReport.patientCensusBySource.localStoragePersistedPatients;
    else targetBucket = backupReport.patientCensusBySource.outboxPayloadPatients;

    targetBucket.physicalRecords++;

    const gId = patientObj.patientGlobalId;
    const lId = patientObj.id;
    const doc = patientObj.documentNumber;
    const name = patientObj.fullName ? patientObj.fullName.trim().toLowerCase() : (patientObj.patientName ? patientObj.patientName.trim().toLowerCase() : null);

    if (gId) {
      targetBucket.withGlobalIdCount++;
      allGlobalIds.add(gId);
      seenGlobalIdsPerSource.get(source)!.add(gId);
    } else if (lId) {
      targetBucket.withLocalIdOnlyCount++;
      allLocalIds.add(lId);
    } else if (doc) {
      targetBucket.withDocumentOnlyCount++;
    } else if (name) {
      targetBucket.withNameOnlyCount++;
      nameOnlyMap.set(name, (nameOnlyMap.get(name) || 0) + 1);
    } else {
      targetBucket.missingAllIdentifiersCount++;
    }
  }

  function indexTemporalRecord(entityType: string, item: any) {
    const dates = inspectRecordDates(item, entityType);

    if (dates.clinical === '19_oct') {
      const bucket = backupReport.semanticTemporalInventory.october19.byClinicalDate;
      if (bucket[entityType] !== undefined) bucket[entityType]++; else bucket.other++;
      bucket.total++;
    }
    if (dates.technical === '19_oct') {
      const bucket = backupReport.semanticTemporalInventory.october19.byTechnicalTimestamp;
      if (bucket[entityType] !== undefined) bucket[entityType]++; else bucket.other++;
      bucket.total++;
    }
    if (dates.outbox === '19_oct') {
      backupReport.semanticTemporalInventory.october19.byOutboxTimestamp++;
    }

    if (dates.clinical === '20_oct') {
      const bucket = backupReport.semanticTemporalInventory.october20.byClinicalDate;
      if (bucket[entityType] !== undefined) bucket[entityType]++; else bucket.other++;
      bucket.total++;
    }
    if (dates.technical === '20_oct') {
      const bucket = backupReport.semanticTemporalInventory.october20.byTechnicalTimestamp;
      if (bucket[entityType] !== undefined) bucket[entityType]++; else bucket.other++;
      bucket.total++;
    }
    if (dates.outbox === '20_oct') {
      backupReport.semanticTemporalInventory.october20.byOutboxTimestamp++;
    }

    if (dates.clinical === 'other_date' || dates.technical === 'other_date') {
      backupReport.semanticTemporalInventory.otherDatesCount++;
    } else if (dates.clinical === 'invalid_or_missing' && dates.technical === 'invalid_or_missing') {
      backupReport.semanticTemporalInventory.invalidOrMissingDatesCount++;
    }
  }

  const lsOpIds = new Set<string>();
  const idbOpIds = new Set<string>();

  // --- 1. LOCALSTORAGE (SOMENTE LEITURA E PARSER ROBUSTO DE CHAVES) ---
  try {
    if (win?.localStorage) {
      const totalKeys = win.localStorage.length || 0;
      backupReport.sourcesSummary.localStorage.totalKeysInStorage = totalKeys;

      const capturedKeys: string[] = [];
      for (let i = 0; i < totalKeys; i++) {
        const k = win.localStorage.key(i);
        if (k) capturedKeys.push(k);
      }

      for (const key of capturedKeys) {
        if (key === 'optotipo_clinical_auth_token_v2' || key.toLowerCase().includes('auth_token')) {
          continue;
        }

        if (key.startsWith('optomed') || key.startsWith('optotipo')) {
          backupReport.sourcesSummary.localStorage.relevantKeysFound++;
          try {
            const raw = win.localStorage.getItem(key);
            if (raw === null) {
              backupReport.sourcesSummary.localStorage.keysWithReadError.push(key);
              backupReport.auditStatus.errorsList.push(`Chave '${key}' retornou null durante a leitura do LocalStorage.`);
              continue;
            }

            let parsed: any;
            try {
              parsed = JSON.parse(raw);
            } catch {
              parsed = raw;
            }

            parsed = sanitizeSecretsRecursively(parsed);

            const parsedKeyInfo = parseLocalStorageEntityKey(key);

            if (parsedKeyInfo.entityName === 'outbox') {
              backupReport.sourcesSummary.outboxSources.localStorageOutbox.exists = true;
              if (Array.isArray(parsed)) {
                backupReport.sourcesSummary.outboxSources.localStorageOutbox.physicalTotal = parsed.length;
                parsed.forEach(op => {
                  if (!op || typeof op !== 'object') {
                    backupReport.sourcesSummary.outboxSources.localStorageOutbox.unparseablePayloadsCount++;
                    return;
                  }

                  const opId = op.operationId || op.id;
                  if (opId) {
                    lsOpIds.add(opId);
                    backupReport.sourcesSummary.outboxSources.localStorageOutbox.withOperationIdCount++;
                  } else {
                    backupReport.sourcesSummary.outboxSources.localStorageOutbox.withoutOperationIdCount++;
                  }

                  const state = op.state || 'other';
                  if (backupReport.sourcesSummary.outboxSources.localStorageOutbox.byState[state] !== undefined) {
                    backupReport.sourcesSummary.outboxSources.localStorageOutbox.byState[state]++;
                  } else {
                    backupReport.sourcesSummary.outboxSources.localStorageOutbox.byState.other++;
                  }

                  indexTemporalRecord('outbox', op);
                  if (op.entity === 'patients' && op.payload) registerPatientBySource(op.payload, 'outbox');

                  backupReport.data.localStorageOutboxOperations.push(op);
                });
              } else {
                backupReport.sourcesSummary.outboxSources.localStorageOutbox.unparseablePayloadsCount++;
              }
            } else if (parsedKeyInfo.entityName === 'unrecognized_entity') {
              backupReport.sourcesSummary.localStorage.unrecognizedKeys.push(key);
              backupReport.data.localStorageEntities[key] = parsed;
            } else {
              const entName = parsedKeyInfo.entityName;
              if (Array.isArray(parsed)) {
                backupReport.sourcesSummary.localStorage.recordsByEntity[entName] =
                  (backupReport.sourcesSummary.localStorage.recordsByEntity[entName] || 0) + parsed.length;
                parsed.forEach(item => {
                  indexTemporalRecord(entName, item);
                  if (entName === 'patients') registerPatientBySource(item, 'ls');
                });
              }
              backupReport.data.localStorageEntities[key] = parsed;
            }

            backupReport.sourcesSummary.localStorage.keysSuccessfullyRead++;
          } catch (keyErr: any) {
            backupReport.sourcesSummary.localStorage.keysWithReadError.push(key);
            backupReport.auditStatus.errorsList.push(`Erro ao ler chave localStorage '${key}': ${String(keyErr)}`);
          }
        }
      }
    }
  } catch (lsGlobalErr: any) {
    backupReport.auditStatus.errorsList.push(`Falha global no LocalStorage: ${String(lsGlobalErr)}`);
  }

  // --- 2. INDEXEDDB (CICLO DE VIDA REESTRUTURADO: ONCOMPLETE OBRIGATÓRIO PARA SUCESSO) ---
  let dbInstance: any = null;
  let activeTx: any = null;
  let txState: string = 'NONE';
  let isDone = false;

  await new Promise<void>((resolve) => {
    if (!win?.indexedDB) {
      backupReport.auditStatus.errorsList.push('API IndexedDB indisponível no navegador.');
      return resolve();
    }

    let openReq: any;
    let timeoutHandle: any = null;

    const safeCloseDb = () => {
      // Aborta SOMENTE se a transação estiver no estado explicitamente ACTIVE
      if (activeTx && txState === 'ACTIVE') {
        try {
          activeTx.abort();
          txState = 'ABORTED';
        } catch {
          // Ignora se o driver já encerrou
        }
      }
      activeTx = null;

      if (dbInstance) {
        try { dbInstance.close(); } catch {}
        dbInstance = null;
      }
    };

    const finish = (errorMsg?: string) => {
      if (isDone) return;
      isDone = true;
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (errorMsg) backupReport.auditStatus.errorsList.push(errorMsg);
      safeCloseDb();
      resolve();
    };

    timeoutHandle = setTimeout(() => {
      finish(`Timeout de ${timeoutMs}ms atingido durante a extração do IndexedDB.`);
    }, timeoutMs);

    try {
      openReq = win.indexedDB.open(DB_NAME);
    } catch (openEx: any) {
      return finish(`Exceção ao chamar indexedDB.open: ${String(openEx)}`);
    }

    openReq.onerror = () => {
      finish(`Evento onerror ao abrir ${DB_NAME}: ${openReq.error ? openReq.error.message : 'desconhecido'}`);
    };

    openReq.onblocked = () => {
      backupReport.auditStatus.errorsList.push(`Abertura do IndexedDB ${DB_NAME} foi bloqueada.`);
    };

    openReq.onsuccess = (e: any) => {
      if (isDone) {
        const lateDb = e.target.result;
        try { lateDb.close(); } catch {}
        return;
      }

      dbInstance = e.target.result;
      backupReport.sourcesSummary.indexedDb.accessible = true;
      backupReport.sourcesSummary.indexedDb.actualVersion = dbInstance.version;

      const liveStores = Array.from(dbInstance.objectStoreNames) as string[];
      backupReport.sourcesSummary.indexedDb.storesFound = liveStores.length;
      backupReport.sourcesSummary.indexedDb.missingExpectedStores = EXPECTED_STORES.filter(s => !liveStores.includes(s));
      backupReport.sourcesSummary.indexedDb.additionalStoresFound = liveStores.filter(s => !(EXPECTED_STORES as readonly string[]).includes(s));

      if (backupReport.sourcesSummary.indexedDb.missingExpectedStores.length > 0) {
        backupReport.auditStatus.errorsList.push(`Stores esperadas ausentes no IndexedDB: ${backupReport.sourcesSummary.indexedDb.missingExpectedStores.join(', ')}`);
      }

      if (liveStores.length === 0) {
        return finish();
      }

      try {
        activeTx = dbInstance.transaction(liveStores, 'readonly');
        txState = 'ACTIVE';
      } catch (txEx: any) {
        return finish(`Falha ao abrir transação readonly: ${String(txEx)}`);
      }

      // Regra V2.8: oncomplete é a ÚNICA transição para conclusão normal bem-sucedida da transação
      activeTx.oncomplete = () => {
        txState = 'COMPLETED';
        if (!isDone) finish();
      };

      activeTx.onabort = () => {
        txState = 'ABORTED';
        if (!isDone) {
          finish('Transação IndexedDB abortada inesperadamente.');
        }
      };

      activeTx.onerror = () => {
        if (!isDone) {
          backupReport.auditStatus.errorsList.push('Erro na transação IndexedDB.');
        }
      };

      liveStores.forEach(storeName => {
        try {
          const store = activeTx.objectStore(storeName);
          const getReq = store.getAll();

          getReq.onsuccess = () => {
            if (isDone) return;

            const rows = getReq.result || [];
            backupReport.sourcesSummary.indexedDb.totalRecordsByStore[storeName] = rows.length;
            backupReport.sourcesSummary.indexedDb.totalRecordsAllStores += rows.length;
            backupReport.sourcesSummary.indexedDb.storesSuccessfullyRead++;

            const sanitizedRows = rows.map((r: any) => {
              const cleanedRow = sanitizeSecretsRecursively(r);
              const unwrapped = (cleanedRow && typeof cleanedRow === 'object' && cleanedRow.data) ? cleanedRow.data : cleanedRow;

              indexTemporalRecord(storeName, unwrapped);

              if (storeName === 'patients') {
                registerPatientBySource(unwrapped, 'idb');
              }

              if (storeName === 'sync_queue') {
                backupReport.sourcesSummary.outboxSources.indexedDbSyncQueue.physicalTotal++;
                const opId = unwrapped.operationId || unwrapped.id;
                if (opId) {
                  idbOpIds.add(opId);
                  backupReport.sourcesSummary.outboxSources.indexedDbSyncQueue.withOperationIdCount++;
                } else {
                  backupReport.sourcesSummary.outboxSources.indexedDbSyncQueue.withoutOperationIdCount++;
                }

                const state = unwrapped.state || 'other';
                if (backupReport.sourcesSummary.outboxSources.indexedDbSyncQueue.byState[state] !== undefined) {
                  backupReport.sourcesSummary.outboxSources.indexedDbSyncQueue.byState[state]++;
                } else {
                  backupReport.sourcesSummary.outboxSources.indexedDbSyncQueue.byState.other++;
                }
                backupReport.data.indexedDbSyncQueueOperations.push(unwrapped);
              }

              return cleanedRow;
            });

            backupReport.data.indexedDb[storeName] = sanitizedRows;
            // NOTA V2.8: Não chamamos finish() aqui! Aguardamos o evento activeTx.oncomplete
          };

          getReq.onerror = () => {
            if (isDone) return;
            backupReport.sourcesSummary.indexedDb.storesWithReadError.push(storeName);
            backupReport.auditStatus.errorsList.push(`Falha no getAll() da store '${storeName}': ${getReq.error ? getReq.error.message : 'desconhecido'}`);
          };
        } catch (storeEx: any) {
          if (isDone) return;
          backupReport.sourcesSummary.indexedDb.storesWithReadError.push(storeName);
          backupReport.auditStatus.errorsList.push(`Exceção ao ler store '${storeName}': ${String(storeEx)}`);
        }
      });
    };
  });

  // --- 3. CONSOLIDAÇÃO DA AUDITORIA DA OUTBOX E PACIENTES ---
  const allDistinctOpIds = new Set([...lsOpIds, ...idbOpIds]);
  backupReport.sourcesSummary.outboxSources.distinctOperationIdsCount = allDistinctOpIds.size;
  backupReport.sourcesSummary.outboxSources.indexedDbSyncQueue.exists = idbOpIds.size > 0;

  let commonOps = 0;
  for (const id of lsOpIds) {
    if (idbOpIds.has(id)) commonOps++;
  }
  backupReport.sourcesSummary.outboxSources.duplicateOperationsAcrossSourcesCount = commonOps;

  const idbGlobals = seenGlobalIdsPerSource.get('idb')!;
  const lsGlobals = seenGlobalIdsPerSource.get('ls')!;
  let crossDupGlobals = 0;
  for (const gid of idbGlobals) {
    if (lsGlobals.has(gid)) crossDupGlobals++;
  }

  let totalCollisions = 0;
  for (const count of nameOnlyMap.values()) {
    if (count > 1) totalCollisions += (count - 1);
  }

  backupReport.patientCensusBySource.crossSourceAudit.distinctGlobalIdsAcrossSources = allGlobalIds.size;
  backupReport.patientCensusBySource.crossSourceAudit.distinctLocalIdsAcrossSources = allLocalIds.size;
  backupReport.patientCensusBySource.crossSourceAudit.duplicateGlobalIdsAcrossSources = crossDupGlobals;
  backupReport.patientCensusBySource.crossSourceAudit.potentialNameCollisions = totalCollisions;

  // --- 4. CONSOLIDAÇÃO DE READ STATUS ANTES DA SERIALIZAÇÃO ---
  const idbSummary = backupReport.sourcesSummary.indexedDb;
  const lsSummary = backupReport.sourcesSummary.localStorage;

  const isIdbComplete = (
    idbSummary.accessible &&
    txState === 'COMPLETED' &&
    idbSummary.missingExpectedStores.length === 0 &&
    idbSummary.storesWithReadError.length === 0 &&
    idbSummary.storesSuccessfullyRead === idbSummary.storesFound &&
    idbSummary.storesFound >= idbSummary.storesExpected
  );

  const isLsComplete = (lsSummary.keysWithReadError.length === 0);

  if (isIdbComplete && isLsComplete && backupReport.auditStatus.errorsList.length === 0) {
    backupReport.auditStatus.readStatus = 'COMPLETE_SUCCESS';
  } else {
    backupReport.auditStatus.readStatus = 'INCOMPLETE_READ_WITH_ERRORS';
  }

  // --- 5. SERIALIZAÇÃO E TESTE ROUNDTRIP TOTAL ---
  let candidateJson = '';
  let roundtripPassed = false;

  try {
    backupReport.auditStatus.serializationStatus = 'IN_PROGRESS';
    candidateJson = JSON.stringify(backupReport, null, 2);
    const parsedCandidate = JSON.parse(candidateJson);

    if (JSON.stringify(parsedCandidate) === JSON.stringify(backupReport)) {
      backupReport.auditStatus.serializationStatus = 'SERIALIZED_AND_PARSED_100%';
      roundtripPassed = true;
    } else {
      backupReport.auditStatus.serializationStatus = 'ROUNDTRIP_MISMATCH';
      backupReport.auditStatus.errorsList.push('Discrepância estrutural detectada no teste de roundtrip.');
    }
  } catch (serEx: any) {
    backupReport.auditStatus.serializationStatus = 'SERIALIZATION_FAILED';
    backupReport.auditStatus.errorsList.push(`Erro fatal ao serializar JSON: ${String(serEx)}`);
  }

  // --- 6. FECHAMENTO RIGOROSO DO MANIFESTO ANTES DA CRIAÇÃO DO BLOB ---
  const isReadAndSerializedComplete = (
    backupReport.auditStatus.readStatus === 'COMPLETE_SUCCESS' &&
    roundtripPassed &&
    backupReport.auditStatus.errorsList.length === 0
  );

  backupReport.auditStatus.isReadAndSerializedComplete = isReadAndSerializedComplete;
  backupReport.auditStatus.fileVerifiedOnDisk = false; // Sempre false dentro do arquivo exportado
  backupReport.auditStatus.downloadInitiated = false;  // No arquivo gravado, reflete estado pré-disparo
  backupReport.auditStatus.isExportComplete = isReadAndSerializedComplete;
  backupReport.auditStatus.errorsCount = backupReport.auditStatus.errorsList.length;

  // Congelamento estrito da string JSON que será entregue ao download
  const finalJsonString = JSON.stringify(backupReport, null, 2);
  const fileSizeBytes = new Blob([finalJsonString]).size;

  let downloadInitiatedSuccess = false;
  const clinicTag = backupReport.metadata.activeClinicId;
  const dateTag = new Date().toISOString().slice(0, 10);
  const fileName = `optomed_backup_auditado_${clinicTag}_${dateTag}.json`;

  if (roundtripPassed) {
    if (options.onDownloadReady) {
      downloadInitiatedSuccess = options.onDownloadReady(fileName, finalJsonString);
    } else if (win?.document) {
      try {
        const blob = new Blob([finalJsonString], { type: 'application/json' });
        const objectUrl = win.URL.createObjectURL(blob);
        const anchor = win.document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = fileName;
        win.document.body.appendChild(anchor);
        anchor.click();
        win.document.body.removeChild(anchor);
        downloadInitiatedSuccess = true;
        setTimeout(() => win.URL.revokeObjectURL(objectUrl), 60000);
      } catch (dlEx: any) {
        downloadInitiatedSuccess = false;
        console.error('[OPTOMED AUDITORIA] Falha ao iniciar download no navegador:', dlEx);
      }
    }
  }

  // Atualiza no retorno operacional em memória
  backupReport.auditStatus.downloadInitiated = downloadInitiatedSuccess;
  if (!downloadInitiatedSuccess) {
    backupReport.auditStatus.isExportComplete = false;
  }

  return {
    backupReport,
    jsonString: finalJsonString,
    fileSizeBytes,
    isExportComplete: backupReport.auditStatus.isExportComplete
  };
}
