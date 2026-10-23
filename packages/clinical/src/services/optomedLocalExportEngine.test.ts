import { describe, it, expect, vi } from 'vitest';
import {
  runOptomedLocalExport,
  isSensitiveKey,
  sanitizeSecretsRecursively,
  parseCanonicalDate,
  inspectRecordDates,
  EXPECTED_STORES,
  DB_NAME
} from './optomedLocalExportEngine';

// Mocks de infraestrutura do navegador para testes automatizados com dados puramente sintéticos
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
  public finished = false;
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
                this.finished = true;
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
    this.finished = true;
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

describe('OPTOMED — Bateria de 15 Testes Obrigatórios do Exportador Local V2.6', () => {

  // 1. Serialização final coerente com o manifesto
  it('1. Serialização final deve ser 100% coerente com o manifesto serializado', async () => {
    const fullStores: Record<string, any[]> = {};
    EXPECTED_STORES.forEach(s => { fullStores[s] = []; });
    const { mockWindow } = createMockBrowser(fullStores);

    const result = await runOptomedLocalExport({
      windowObj: mockWindow,
      onDownloadReady: () => true
    });

    expect(result.backupReport.auditStatus.serializationStatus).toBe('SERIALIZED_AND_PARSED_100%');
    expect(result.backupReport.auditStatus.readStatus).toBe('COMPLETE_SUCCESS');
    expect(result.backupReport.auditStatus.downloadInitiated).toBe(true);
    expect(result.isExportComplete).toBe(true);
  });

  // 2. Timeout e tentativa de abortar transação ativa
  it('2. Timeout deve interromper rotina, tentar abortar transação e fechar conexão com segurança', async () => {
    const fullStores: Record<string, any[]> = {};
    EXPECTED_STORES.forEach(s => { fullStores[s] = []; });
    const { mockWindow, dbInstance } = createMockBrowser(fullStores);

    // Força abertura sem disparar callback para provocar timeout
    mockWindow.indexedDB.open = () => new MockIDBRequest();

    const result = await runOptomedLocalExport({
      windowObj: mockWindow,
      customTimeoutMs: 30,
      onDownloadReady: () => true
    });

    expect(result.isExportComplete).toBe(false);
    expect(result.backupReport.auditStatus.readStatus).toBe('INCOMPLETE_READ_WITH_ERRORS');
    expect(result.backupReport.auditStatus.errorsList.some((e: string) => e.includes('Timeout'))).toBe(true);
  });

  // 3. Callback tardio após encerramento
  it('3. Callback tardio após encerramento não deve alterar resultados e deve fechar o banco tardio', async () => {
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

    // Dispara o callback tardio
    if (lateTrigger) lateTrigger();

    if (lateDbInstance) {
      expect((lateDbInstance as any).closed).toBe(true);
    }
  });

  // 4. Store esperada ausente
  it('4. Store esperada ausente deve travar readStatus como INCOMPLETE_READ_WITH_ERRORS', async () => {
    const stores: Record<string, any[]> = {};
    EXPECTED_STORES.filter(s => s !== 'clinical_documents').forEach(s => { stores[s] = []; });
    const { mockWindow } = createMockBrowser(stores);

    const result = await runOptomedLocalExport({
      windowObj: mockWindow,
      onDownloadReady: () => true
    });

    expect(result.isExportComplete).toBe(false);
    expect(result.backupReport.auditStatus.readStatus).toBe('INCOMPLETE_READ_WITH_ERRORS');
    expect(result.backupReport.sourcesSummary.indexedDb.missingExpectedStores).toContain('clinical_documents');
  });

  // 5. Store adicional presente
  it('5. Store adicional deve ser inventariada em additionalStoresFound sem gerar erro por ser adicional', async () => {
    const stores: Record<string, any[]> = {};
    EXPECTED_STORES.forEach(s => { stores[s] = []; });
    stores['custom_extra_store'] = [{ id: 'extra-1', data: 'sintetico' }];
    const { mockWindow } = createMockBrowser(stores);

    const result = await runOptomedLocalExport({
      windowObj: mockWindow,
      onDownloadReady: () => true
    });

    expect(result.backupReport.sourcesSummary.indexedDb.additionalStoresFound).toContain('custom_extra_store');
    expect(result.backupReport.sourcesSummary.indexedDb.storesSuccessfullyRead).toBe(20);
    expect(result.backupReport.auditStatus.readStatus).toBe('COMPLETE_SUCCESS');
  });

  // 6. Erro de leitura em uma store
  it('6. Erro de leitura em store deve registrar em storesWithReadError e impedir sucesso integral', async () => {
    const stores: Record<string, any[]> = {};
    EXPECTED_STORES.forEach(s => { stores[s] = []; });
    const { mockWindow, dbInstance } = createMockBrowser(stores);

    // Sobrescreve transaction para falhar getAll() em 'prescriptions'
    const origTx = dbInstance.transaction.bind(dbInstance);
    dbInstance.transaction = (sNames: string[], mode: string) => {
      const tx = origTx(sNames, mode);
      const origStore = tx.objectStore.bind(tx);
      tx.objectStore = (name: string) => {
        if (name === 'prescriptions') {
          return {
            getAll: () => {
              const req = new MockIDBRequest();
              setTimeout(() => {
                req.error = new Error('Disk read fault');
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

    expect(result.isExportComplete).toBe(false);
    expect(result.backupReport.auditStatus.readStatus).toBe('INCOMPLETE_READ_WITH_ERRORS');
    expect(result.backupReport.sourcesSummary.indexedDb.storesWithReadError).toContain('prescriptions');
  });

  // 7. Contagem física versus IDs únicos na outbox
  it('7. Deve contabilizar separadamente contagem física e IDs distintos na Outbox', async () => {
    const stores: Record<string, any[]> = {};
    EXPECTED_STORES.forEach(s => { stores[s] = []; });
    stores['sync_queue'] = [
      { operationId: 'op-1', state: 'pending' },
      { operationId: 'op-1', state: 'pending' }, // mesmo ID físico repetido
      { state: 'pending' } // sem operationId
    ];

    const { mockWindow } = createMockBrowser(stores);

    const result = await runOptomedLocalExport({
      windowObj: mockWindow,
      onDownloadReady: () => true
    });

    const outboxSummary = result.backupReport.sourcesSummary.outboxSources.indexedDbSyncQueue;
    expect(outboxSummary.physicalTotal).toBe(3);
    expect(outboxSummary.withOperationIdCount).toBe(2);
    expect(outboxSummary.withoutOperationIdCount).toBe(1);
    expect(result.backupReport.sourcesSummary.outboxSources.distinctOperationIdsCount).toBe(1);
  });

  // 8. Operações duplicadas entre fontes sem exclusão de dados
  it('8. Operações duplicadas entre LS e IDB devem ser registradas sem descartar registros', async () => {
    const stores: Record<string, any[]> = {};
    EXPECTED_STORES.forEach(s => { stores[s] = []; });
    stores['sync_queue'] = [
      { operationId: 'op-shared', entity: 'encounters', state: 'pending' }
    ];

    const lsData = {
      'optomed_offline_sync_queue_v2': JSON.stringify([
        { operationId: 'op-shared', entity: 'encounters', state: 'pending' },
        { operationId: 'op-unique-ls', entity: 'patients', state: 'pending' }
      ])
    };

    const { mockWindow } = createMockBrowser(stores, lsData);

    const result = await runOptomedLocalExport({
      windowObj: mockWindow,
      onDownloadReady: () => true
    });

    expect(result.backupReport.sourcesSummary.outboxSources.distinctOperationIdsCount).toBe(2);
    expect(result.backupReport.sourcesSummary.outboxSources.duplicateOperationsAcrossSourcesCount).toBe(1);
    expect(result.backupReport.data.localStorageOutboxOperations.length).toBe(2);
    expect(result.backupReport.data.indexedDbSyncQueueOperations.length).toBe(1);
  });

  // 9. Sanitização de chaves sensíveis alternativas e aninhadas
  it('9. Deve sanitizar sessionId, passwordHash, credentialHash, tokenValue, refresh_token e campos aninhados', () => {
    const payload = {
      sessionId: 'sess_123',
      passwordHash: 'hash_abc',
      credentialHash: 'cred_456',
      tokenValue: 'tok_789',
      refresh_token: 'ref_999',
      clientSecret: 'sec_111',
      privateKey: 'pem_key',
      auth: {
        nestedSessionId: 'sess_nested',
        authToken: 'tok_nested'
      },
      patientId: 'p-1',
      patientName: 'João da Silva'
    };

    const sanitized = sanitizeSecretsRecursively(payload);
    expect(sanitized.sessionId).toBeUndefined();
    expect(sanitized.passwordHash).toBeUndefined();
    expect(sanitized.credentialHash).toBeUndefined();
    expect(sanitized.tokenValue).toBeUndefined();
    expect(sanitized.refresh_token).toBeUndefined();
    expect(sanitized.clientSecret).toBeUndefined();
    expect(sanitized.privateKey).toBeUndefined();
    expect(sanitized.auth.nestedSessionId).toBeUndefined();
    expect(sanitized.auth.authToken).toBeUndefined();

    expect(sanitized.patientId).toBe('p-1');
    expect(sanitized.patientName).toBe('João da Silva');
  });

  // 10. Preservação de dados clínicos necessários
  it('10. Deve preservar dados clínicos essenciais (anamnese, refração, acuidade, evolução, conduta)', () => {
    const clinicalObj = {
      patientId: 'pat-uuid-1',
      date: '2026-10-19',
      visualAcuity: { od: '20/20', oe: '20/25' },
      finalRefraction: { od: { spherical: -2.5, cylindrical: -0.75, axis: 90 } },
      anamnesis: { chiefComplaint: 'Cefaleia e vista embaçada' },
      conduct: 'Prescrição de lentes multifocais',
      evolutions: [{ date: '2026-10-19', note: 'Evolução clínica estável' }]
    };

    const sanitized = sanitizeSecretsRecursively(clinicalObj);
    expect(sanitized).toEqual(clinicalObj);
  });

  // 11. Classificação temporal dos dias 19 e 20 de outubro
  it('11. Deve classificar datas civis, timestamps com offset e UTC sem colisão entre 19 e 20/10', () => {
    // 19/10 civil
    expect(parseCanonicalDate('2026-10-19')).toBe('2026-10-19');
    expect(parseCanonicalDate('19/10/2026')).toBe('2026-10-19');

    // 20/10 civil
    expect(parseCanonicalDate('2026-10-20')).toBe('2026-10-20');
    expect(parseCanonicalDate('20/10/2026')).toBe('2026-10-20');

    // Transição de meia-noite em Campo Grande (UTC-4)
    // 19/10 23:59:00 UTC-4 = 2026-10-20T03:59:00Z
    expect(parseCanonicalDate('2026-10-20T03:59:00Z')).toBe('2026-10-19');
    // 20/10 00:01:00 UTC-4 = 2026-10-20T04:01:00Z
    expect(parseCanonicalDate('2026-10-20T04:01:00Z')).toBe('2026-10-20');
  });

  // 12. IDs locais e globais potencialmente conflitantes
  it('12. Deve segregar contagens por identificador global confiável, local e colisões de nome', async () => {
    const stores: Record<string, any[]> = {};
    EXPECTED_STORES.forEach(s => { stores[s] = []; });
    stores['patients'] = [
      { patientGlobalId: 'glob-1', id: 'loc-1', fullName: 'Carlos Silva' },
      { id: 'loc-2', fullName: 'Maria Souza' }, // Sem globalId
      { documentNumber: '12345678900', fullName: 'Pedro Santos' }, // Apenas documento
      { fullName: 'Ana Repetida' }, // Apenas nome
      { fullName: 'Ana Repetida' }, // Colisão de nome sem documento
      { observations: 'Sem identificador nenhum' } // Sem nada
    ];

    const { mockWindow } = createMockBrowser(stores);

    const result = await runOptomedLocalExport({
      windowObj: mockWindow,
      onDownloadReady: () => true
    });

    const reg = result.backupReport.patientCensusBySource.indexedDbPersistedPatients;
    expect(reg.physicalRecords).toBe(6);
    expect(reg.withGlobalIdCount).toBe(1);
    expect(reg.withLocalIdOnlyCount).toBe(1);
    expect(reg.withDocumentOnlyCount).toBe(1);
    expect(reg.withNameOnlyCount).toBe(2);
    expect(reg.missingAllIdentifiersCount).toBe(1);
    expect(result.backupReport.patientCensusBySource.crossSourceAudit.potentialNameCollisions).toBe(1);
  });

  // 13. Chave de LocalStorage removida durante a leitura
  it('13. Deve tratar graciosamente chave de LocalStorage removida concorrentemente durante a leitura', async () => {
    const stores: Record<string, any[]> = {};
    EXPECTED_STORES.forEach(s => { stores[s] = []; });

    const lsData = {
      'optomed_key_normal': JSON.stringify({ id: 1 }),
      'optomed_key_evict': JSON.stringify({ id: 2 })
    };

    const { mockWindow, lsMap } = createMockBrowser(stores, lsData);

    // Sobrescreve getItem para retornar null simulando remoção por outra aba
    const origGet = mockWindow.localStorage.getItem.bind(mockWindow.localStorage);
    mockWindow.localStorage.getItem = (k: string) => {
      if (k === 'optomed_key_evict') return null;
      return origGet(k);
    };

    const result = await runOptomedLocalExport({
      windowObj: mockWindow,
      onDownloadReady: () => true
    });

    expect(result.backupReport.sourcesSummary.localStorage.keysWithReadError).toContain('optomed_key_evict');
    expect(result.backupReport.auditStatus.readStatus).toBe('INCOMPLETE_READ_WITH_ERRORS');
    expect(result.isExportComplete).toBe(false);
  });

  // 14. JSON válido após a sanitização
  it('14. O JSON final deve ser estritamente válido e semanticamente idêntico no roundtrip', async () => {
    const stores: Record<string, any[]> = {};
    EXPECTED_STORES.forEach(s => { stores[s] = []; });
    stores['encounters'] = [{ id: 'enc-1', date: '2026-10-19', status: 'completed' }];

    const { mockWindow } = createMockBrowser(stores);

    const result = await runOptomedLocalExport({
      windowObj: mockWindow,
      onDownloadReady: () => true
    });

    expect(result.jsonString.length).toBeGreaterThan(0);
    const parsed = JSON.parse(result.jsonString);
    expect(parsed.data.indexedDb.encounters[0].id).toBe('enc-1');
  });

  // 15. Indicação inequívoca de que o arquivo ainda não foi verificado no disco
  it('15. O manifesto dentro do arquivo exportado deve declarar fileVerifiedOnDisk: false', async () => {
    const stores: Record<string, any[]> = {};
    EXPECTED_STORES.forEach(s => { stores[s] = []; });
    const { mockWindow } = createMockBrowser(stores);

    const result = await runOptomedLocalExport({
      windowObj: mockWindow,
      onDownloadReady: () => true
    });

    expect(result.backupReport.auditStatus.fileVerifiedOnDisk).toBe(false);
    const parsed = JSON.parse(result.jsonString);
    expect(parsed.auditStatus.fileVerifiedOnDisk).toBe(false);
  });
});
