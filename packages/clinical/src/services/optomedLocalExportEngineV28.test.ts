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
  public completed = false;
  private pendingRequests = 0;
  public simulateAbortAfterRequests = false;

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
          if (this.pendingRequests === 0) {
            setTimeout(() => {
              if (this.simulateAbortAfterRequests) {
                this.abort();
              } else if (!this.aborted && this.oncomplete) {
                this.completed = true;
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
  public lastTx: MockIDBTransaction | null = null;
  public shouldSimulateAbort = false;

  constructor(name: string, version: number, stores: Record<string, any[]>) {
    this.name = name;
    this.version = version;
    this.objectStoreNames = Object.keys(stores);
    this.storeData = new Map(Object.entries(stores));
  }

  transaction(stores: string[], mode = 'readonly') {
    if (this.closed) throw new Error('Database is closed');
    const tx = new MockIDBTransaction(mode, this.storeData);
    if (this.shouldSimulateAbort) {
      tx.simulateAbortAfterRequests = true;
    }
    this.lastTx = tx;
    return tx;
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

describe('OPTOMED V2.8 — Critérios de Aceitação e Integridade Estrita', () => {

  // 1. Transação sofre abort() após todos os getAll().onsuccess responderem
  it('1. Deve travar readStatus em INCOMPLETE_READ_WITH_ERRORS se a transação for abortada após todos getAll() responderem', async () => {
    const stores: Record<string, any[]> = {};
    EXPECTED_STORES.forEach(s => { stores[s] = [{ id: '1', data: 'ok' }]; });

    const { mockWindow, dbInstance } = createMockBrowser(stores);
    dbInstance.shouldSimulateAbort = true; // Força abort logo após os getAll() responderem

    const result = await runOptomedLocalExport({
      windowObj: mockWindow,
      onDownloadReady: () => true
    });

    expect(result.backupReport.auditStatus.readStatus).toBe('INCOMPLETE_READ_WITH_ERRORS');
    expect(result.backupReport.auditStatus.isReadAndSerializedComplete).toBe(false);
    expect(result.isExportComplete).toBe(false);
    expect(result.backupReport.auditStatus.errorsList.some(e => e.includes('abortada'))).toBe(true);
  });

  // 2. Transação conclui com oncomplete normal
  it('2. Deve atingir COMPLETE_SUCCESS quando todos getAll() respondem e activeTx.oncomplete dispara normalmente', async () => {
    const stores: Record<string, any[]> = {};
    EXPECTED_STORES.forEach(s => { stores[s] = [{ id: 'test_1', data: { name: 'Paciente Valido' } }]; });

    const { mockWindow } = createMockBrowser(stores);

    const result = await runOptomedLocalExport({
      windowObj: mockWindow,
      onDownloadReady: () => true
    });

    expect(result.backupReport.auditStatus.readStatus).toBe('COMPLETE_SUCCESS');
    expect(result.backupReport.auditStatus.serializationStatus).toBe('SERIALIZED_AND_PARSED_100%');
    expect(result.backupReport.auditStatus.isReadAndSerializedComplete).toBe(true);
    expect(result.backupReport.auditStatus.errorsCount).toBe(0);
  });

  // 3. Inspeção direta do conteúdo serializado (string do Blob)
  it('3. O conteúdo serializado dentro do Blob JSON gerado deve conter manifesto consistente com downloadInitiated=false e fileVerifiedOnDisk=false', async () => {
    const stores: Record<string, any[]> = {};
    EXPECTED_STORES.forEach(s => { stores[s] = []; });

    const { mockWindow } = createMockBrowser(stores);

    let downloadedContent = '';
    const result = await runOptomedLocalExport({
      windowObj: mockWindow,
      onDownloadReady: (_name, jsonContent) => {
        downloadedContent = jsonContent;
        return true;
      }
    });

    expect(downloadedContent.length).toBeGreaterThan(0);
    const parsedFileJson = JSON.parse(downloadedContent);

    // O arquivo gravado em disco NUNCA pode ter downloadInitiated=true ou fileVerifiedOnDisk=true gravados dentro de si
    expect(parsedFileJson.auditStatus.downloadInitiated).toBe(false);
    expect(parsedFileJson.auditStatus.fileVerifiedOnDisk).toBe(false);
    expect(parsedFileJson.auditStatus.isReadAndSerializedComplete).toBe(true);
    expect(parsedFileJson.auditStatus.serializationStatus).toBe('SERIALIZED_AND_PARSED_100%');
    expect(parsedFileJson.auditStatus.readStatus).toBe('COMPLETE_SUCCESS');

    // Em memória, após o disparo do download, o objeto reflete que a tentativa foi iniciada
    expect(result.backupReport.auditStatus.downloadInitiated).toBe(true);
    expect(result.isExportComplete).toBe(true);
  });

  // 4. Sanitização rigorosa de credenciais e tokens variantes
  it('4. Deve identificar e sanitizar todas as variantes de chaves de autenticação (pinHash, jwt, idToken, cookie, session)', () => {
    const sensitiveTokens = [
      'pinHash', 'PIN_HASH', 'userPinHash',
      'jwt', 'JWT', 'jwtToken', 'user_jwt',
      'idToken', 'id_token', 'googleIdToken',
      'cookie', 'userCookie', 'sessionCookie',
      'session', 'sessionId', 'current_session',
      'refreshToken', 'refresh_token',
      'clientSecret', 'client_secret',
      'privateKey', 'private_key',
      'passwordHash', 'password_hash',
      'credentialHash', 'tokenValue'
    ];

    sensitiveTokens.forEach(token => {
      expect(isSensitiveKey(token)).toBe(true);
    });

    // Chaves legítimas clínicas NÃO devem ser sanitizadas
    const clinicalSafeKeys = [
      'patientName', 'patientGlobalId', 'anamnese', 'conduta',
      'refraction', 'visualAcuity', 'evolution', 'documentNumber',
      'clinicalNotes', 'sessionNumber', 'sessionDate' // sessionNumber e sessionDate são clínicos
    ];

    clinicalSafeKeys.forEach(safeKey => {
      expect(isSensitiveKey(safeKey)).toBe(false);
    });

    const payload = {
      user: {
        id: 'u1',
        pinHash: 'super_secret_pin_123',
        jwt: 'eyJhbGciOi...',
        idToken: 'token_abc_999'
      },
      patient: {
        fullName: 'Maria da Silva',
        anamnese: 'Queixa de dor ocular',
        sessionDate: '2026-10-19'
      }
    };

    const sanitized = sanitizeSecretsRecursively(payload);
    expect(sanitized.user.pinHash).toBeUndefined();
    expect(sanitized.user.jwt).toBeUndefined();
    expect(sanitized.user.idToken).toBeUndefined();
    expect(sanitized.patient.fullName).toBe('Maria da Silva');
    expect(sanitized.patient.anamnese).toBe('Queixa de dor ocular');
    expect(sanitized.patient.sessionDate).toBe('2026-10-19');
  });

  // 5. Particionamento temporal estrito com UTC-4
  it('5. Deve classificar datas civis sem conversão de fuso e instantes UTC-4 sem sobreposição entre 19 e 20/10/2026', () => {
    // Datas civis
    expect(parseCanonicalDate('2026-10-19')).toBe('2026-10-19');
    expect(parseCanonicalDate('2026-10-20')).toBe('2026-10-20');
    expect(parseCanonicalDate('2026-10-21')).toBe('2026-10-21');

    // Transição exata em Campo Grande (UTC-4)
    // 2026-10-19 23:59:59 em UTC-4 é 2026-10-20T03:59:59Z
    expect(parseCanonicalDate('2026-10-20T03:59:59Z')).toBe('2026-10-19');
    // 2026-10-20 00:00:00 em UTC-4 é 2026-10-20T04:00:00Z
    expect(parseCanonicalDate('2026-10-20T04:00:00Z')).toBe('2026-10-20');
    // 2026-10-20 23:59:59 em UTC-4 é 2026-10-21T03:59:59Z
    expect(parseCanonicalDate('2026-10-21T03:59:59Z')).toBe('2026-10-20');
    // 2026-10-21 00:00:00 em UTC-4 é 2026-10-21T04:00:00Z
    expect(parseCanonicalDate('2026-10-21T04:00:00Z')).toBe('2026-10-21');
  });

  // 6. Suporte a clínica com múltiplos sublinhados no LocalStorage
  it('6. Deve extrair clinicId com múltiplos sublinhados preservando a entidade', () => {
    const key = 'optotipo_ivs_matriz_sul_patients_v2';
    const parsed = parseLocalStorageEntityKey(key);

    expect(parsed.isRecognized).toBe(true);
    expect(parsed.entityName).toBe('patients');
    expect(parsed.clinicId).toBe('ivs_matriz_sul');
  });
});
