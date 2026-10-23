import { describe, it, expect, vi } from 'vitest';
import {
  runOptomedLocalExport,
  isSensitiveKey,
  sanitizeSecretsRecursively,
  parseCanonicalDate,
  inspectRecordDates,
  parseLocalStorageEntityKey,
  EXPECTED_STORES,
  DB_NAME
} from './optomedLocalExportEngine';

class MockIDBRequest {
  public result: any = null;
  public error: any = null;
  public onsuccess: any = null;
  public onerror: any = null;
  public onblocked: any = null;
}

class MockIDBTransaction {
  public mode: string;
  public stores: Map<string, any[]>;
  public onabort: any = null;
  public onerror: any = null;
  public oncomplete: any = null;
  public aborted = false;
  private pendingRequests = 0;

  constructor(mode: string, stores: Map<string, any[]>) {
    this.mode = mode;
    this.stores = stores;
  }

  objectStore(name: string) {
    if (this.aborted) throw new Error('Transaction is aborted');
    const records = this.stores.get(name) || [];
    return {
      getAll: () => {
        this.pendingRequests++;
        const req = new MockIDBRequest();
        setTimeout(() => {
          if (this.aborted) {
            req.error = new Error('Transaction aborted');
            if (req.onerror) req.onerror();
          } else {
            req.result = JSON.parse(JSON.stringify(records));
            if (req.onsuccess) req.onsuccess();
          }
          this.pendingRequests--;
          if (this.pendingRequests === 0 && !this.aborted) {
            setTimeout(() => {
              if (!this.aborted && this.oncomplete) {
                this.oncomplete();
              }
            }, 5);
          }
        }, 5);
        return req;
      }
    };
  }

  abort() {
    this.aborted = true;
    if (this.onabort) this.onabort();
  }
}

class MockIDBDatabase {
  public name: string;
  public version: number;
  public objectStoreNames: string[];
  public closed = false;
  private storeData: Map<string, any[]>;

  constructor(name: string, version: number, stores: Record<string, any[]>) {
    this.name = name;
    this.version = version;
    this.objectStoreNames = Object.keys(stores);
    this.storeData = new Map(Object.entries(stores));
  }

  transaction(stores: string[], mode = 'readonly') {
    if (this.closed) throw new Error('Database is closed');
    return new MockIDBTransaction(mode, this.storeData);
  }

  close() {
    this.closed = true;
  }
}

function createMockBrowser(storesRecord: Record<string, any[]>, lsData: Record<string, string> = {}) {
  const lsMap = new Map<string, string>(Object.entries(lsData));
  const dbInstance = new MockIDBDatabase(DB_NAME, 5, storesRecord);

  const mockWindow: any = {
    navigator: {
      platform: 'Win32',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
      onLine: true
    },
    localStorage: {
      get length() { return lsMap.size; },
      key: (i: number) => Array.from(lsMap.keys())[i] || null,
      getItem: (k: string) => lsMap.get(k) ?? null,
      setItem: vi.fn(),
      removeItem: (k: string) => lsMap.delete(k),
      clear: vi.fn()
    },
    indexedDB: {
      open: (name: string) => {
        const req = new MockIDBRequest();
        setTimeout(() => {
          req.result = dbInstance;
          if (req.onsuccess) req.onsuccess({ target: req });
        }, 5);
        return req;
      }
    }
  };

  return { mockWindow, dbInstance, lsMap };
}

describe('OPTOMED V2.7 — Testes de Aceitação Estrita', () => {

  // 1. Erro em Store Adicional deve impedir leitura integral
  it('1. Erro de leitura em store adicional deve travar readStatus em INCOMPLETE_READ_WITH_ERRORS', async () => {
    const stores: Record<string, any[]> = {};
    EXPECTED_STORES.forEach(s => { stores[s] = []; });
    stores['custom_audit_extra'] = [{ id: 1 }]; // Store adicional presente

    const { mockWindow, dbInstance } = createMockBrowser(stores);

    // Provoca falha de getAll() especificamente na store adicional
    const origTx = dbInstance.transaction.bind(dbInstance);
    dbInstance.transaction = (sNames: string[], mode: string) => {
      const tx = origTx(sNames, mode);
      const origStore = tx.objectStore.bind(tx);
      tx.objectStore = (name: string) => {
        if (name === 'custom_audit_extra') {
          return {
            getAll: () => {
              const req = new MockIDBRequest();
              setTimeout(() => {
                req.error = new Error('Read error in extra store');
                if (req.onerror) req.onerror();
              }, 5);
              return req;
            }
          };
        }
        return origStore(name);
      };
      return tx;
    };

    const result = await runOptomedLocalExport({
      windowObj: mockWindow,
      onDownloadReady: () => true
    });

    expect(result.backupReport.sourcesSummary.indexedDb.storesWithReadError).toContain('custom_audit_extra');
    expect(result.backupReport.auditStatus.readStatus).toBe('INCOMPLETE_READ_WITH_ERRORS');
    expect(result.isExportComplete).toBe(false);
  });

  // 2. Timeout e evento tardio com controle de estado
  it('2. Timeout deve interromper a rotina, abortar transação ativa e ignorar callbacks tardios', async () => {
    let lateDbInstance: MockIDBDatabase | null = null;
    let lateTrigger: any = null;

    const mockWindow: any = {
      navigator: { onLine: true },
      localStorage: { length: 0, key: () => null },
      indexedDB: {
        open: () => {
          const req = new MockIDBRequest();
          setTimeout(() => {
            lateDbInstance = new MockIDBDatabase(DB_NAME, 5, {});
            req.result = lateDbInstance;
            lateTrigger = () => req.onsuccess({ target: req });
          }, 100);
          return req;
        }
      }
    };

    const runPromise = runOptomedLocalExport({
      windowObj: mockWindow,
      customTimeoutMs: 25,
      onDownloadReady: () => true
    });

    const result = await runPromise;
    expect(result.isExportComplete).toBe(false);
    expect(result.backupReport.auditStatus.readStatus).toBe('INCOMPLETE_READ_WITH_ERRORS');

    if (lateTrigger) lateTrigger();

    if (lateDbInstance) {
      expect((lateDbInstance as any).closed).toBe(true);
    }
  });

  // 3. Manifesto final dentro do arquivo serializado
  it('3. O manifesto dentro do arquivo JSON deve refletir coerentemente o estado final de integridade', async () => {
    const stores: Record<string, any[]> = {};
    EXPECTED_STORES.forEach(s => { stores[s] = []; });
    const { mockWindow } = createMockBrowser(stores);

    let downloadedJson = '';
    const result = await runOptomedLocalExport({
      windowObj: mockWindow,
      onDownloadReady: (_name, content) => {
        downloadedJson = content;
        return true;
      }
    });

    expect(result.isExportComplete).toBe(true);
    expect(downloadedJson.length).toBeGreaterThan(0);

    const parsedInFile = JSON.parse(downloadedJson);
    expect(parsedInFile.auditStatus.readStatus).toBe('COMPLETE_SUCCESS');
    expect(parsedInFile.auditStatus.serializationStatus).toBe('SERIALIZED_AND_PARSED_100%');
    expect(parsedInFile.auditStatus.fileVerifiedOnDisk).toBe(false); // Sempre false dentro do arquivo
    expect(parsedInFile.auditStatus.isExportComplete).toBe(true);
  });

  // 4. Campos sensíveis alternativos
  it('4. Deve sanitizar sessionId, passwordHash, credentialHash, tokenValue, refresh_token, clientSecret, authorization e apiKey', () => {
    const payload = {
      sessionId: 'sess-abc-123',
      passwordHash: 'pbkdf2:hash_xyz',
      credentialHash: 'sha256_hash_123',
      tokenValue: 'secret_token_val',
      refresh_token: 'refresh_tok_999',
      clientSecret: 'secret_client_val',
      authorization: 'Bearer jwt_token_header',
      apiKey: 'api_key_secret_val',
      nested: {
        rawPassword: 'plainPassword123',
        licenseKey: 'OPTO-LIC-9999'
      },
      patientGlobalId: 'glob-uuid-1',
      patientName: 'Maria Antônia',
      clinicalNotes: 'Paciente com acuidade corrigida 20/20'
    };

    const sanitized = sanitizeSecretsRecursively(payload);

    expect(sanitized.sessionId).toBeUndefined();
    expect(sanitized.passwordHash).toBeUndefined();
    expect(sanitized.credentialHash).toBeUndefined();
    expect(sanitized.tokenValue).toBeUndefined();
    expect(sanitized.refresh_token).toBeUndefined();
    expect(sanitized.clientSecret).toBeUndefined();
    expect(sanitized.authorization).toBeUndefined();
    expect(sanitized.apiKey).toBeUndefined();
    expect(sanitized.nested.rawPassword).toBeUndefined();
    expect(sanitized.nested.licenseKey).toBeUndefined();

    // Dados clínicos preservados
    expect(sanitized.patientGlobalId).toBe('glob-uuid-1');
    expect(sanitized.patientName).toBe('Maria Antônia');
    expect(sanitized.clinicalNotes).toContain('20/20');
  });

  // 5. Datas em limites de fuso (America/Campo_Grande UTC-4)
  it('5. Deve classificar datas civis sem conversão e instantes nos limites estritos de 19 e 20/10', () => {
    // Datas civis puras
    expect(parseCanonicalDate('2026-10-19')).toBe('2026-10-19');
    expect(parseCanonicalDate('19/10/2026')).toBe('2026-10-19');
    expect(parseCanonicalDate('2026-10-20')).toBe('2026-10-20');
    expect(parseCanonicalDate('20/10/2026')).toBe('2026-10-20');

    // 19/10 às 23:59:59 em UTC-4 equivale a 20/10 às 03:59:59 UTC
    expect(parseCanonicalDate('2026-10-20T03:59:59Z')).toBe('2026-10-19');

    // 20/10 às 00:00:01 em UTC-4 equivale a 20/10 às 04:00:01 UTC
    expect(parseCanonicalDate('2026-10-20T04:00:01Z')).toBe('2026-10-20');
  });

  // 6. Clínica com ID contendo sublinhados
  it('6. Deve extrair corretamente entidade e clínica mesmo quando o clinicId possui sublinhados', () => {
    const k1 = 'optotipo_ivs_matriz_sul_patients_v2';
    const parsed1 = parseLocalStorageEntityKey(k1);
    expect(parsed1.entityName).toBe('patients');
    expect(parsed1.clinicId).toBe('ivs_matriz_sul');

    const k2 = 'optotipo_consultorio_dr_meirelles_appointments_v2';
    const parsed2 = parseLocalStorageEntityKey(k2);
    expect(parsed2.entityName).toBe('appointments');
    expect(parsed2.clinicId).toBe('consultorio_dr_meirelles');

    const k3 = 'optotipo_chave_estranha_sem_entidade';
    const parsed3 = parseLocalStorageEntityKey(k3);
    expect(parsed3.entityName).toBe('unrecognized_entity');
  });

  // 7. Paciente repetido em fontes distintas
  it('7. Deve manter censo de pacientes separado por fonte e registrar duplicidades cruzadas', async () => {
    const stores: Record<string, any[]> = {};
    EXPECTED_STORES.forEach(s => { stores[s] = []; });
    stores['patients'] = [
      { patientGlobalId: 'glob-common-1', id: 'loc-1', fullName: 'Carlos Cunha' }
    ];

    const lsData = {
      'optotipo_ivs_patients_v2': JSON.stringify([
        { patientGlobalId: 'glob-common-1', id: 'loc-1', fullName: 'Carlos Cunha' }
      ]),
      'optomed_offline_sync_queue_v2': JSON.stringify([
        { entity: 'patients', payload: { patientGlobalId: 'glob-outbox-2', id: 'loc-3', fullName: 'Ana Paula' } }
      ])
    };

    const { mockWindow } = createMockBrowser(stores, lsData);

    const result = await runOptomedLocalExport({
      windowObj: mockWindow,
      onDownloadReady: () => true
    });

    const census = result.backupReport.patientCensusBySource;
    expect(census.indexedDbPersistedPatients.physicalRecords).toBe(1);
    expect(census.localStoragePersistedPatients.physicalRecords).toBe(1);
    expect(census.outboxPayloadPatients.physicalRecords).toBe(1);

    expect(census.crossSourceAudit.distinctGlobalIdsAcrossSources).toBe(2); // glob-common-1 e glob-outbox-2
    expect(census.crossSourceAudit.duplicateGlobalIdsAcrossSources).toBe(1); // glob-common-1 presente em IDB e LS
  });
});
