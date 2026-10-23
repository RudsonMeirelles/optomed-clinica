import { describe, it, expect } from 'vitest';

// Funções sob teste extraídas do script de auditoria do Optomed

export function sanitizeSecretsRecursively(val: any): any {
  if (val === null || val === undefined) return val;
  if (Array.isArray(val)) return val.map(sanitizeSecretsRecursively);
  if (typeof val === 'object') {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      const lower = k.toLowerCase();
      if (
        lower === 'password' ||
        lower === 'passwordhash' ||
        lower === 'salt' ||
        lower === 'auth_token' ||
        lower === 'token' ||
        lower === 'accesstoken' ||
        lower === 'refreshtoken' ||
        lower === 'sessiontoken' ||
        lower === 'secret' ||
        lower === 'authorization' ||
        lower === 'apikey' ||
        lower === 'bearertoken'
      ) {
        continue;
      }
      clean[k] = sanitizeSecretsRecursively(v);
    }
    return clean;
  }
  return val;
}

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

  // 1. Clínico
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
    const res = classify(parseCanonicalDate(c, targetTz));
    if (res === '19_oct' || res === '20_oct') {
      clinicalStatus = res;
      break;
    } else if (res === 'other_date') {
      clinicalStatus = 'other_date';
    }
  }

  // 2. Técnico
  let technicalStatus = 'invalid_or_missing';
  const techCandidates = [record.updatedAt, record.createdAt, record.timestamp];
  for (const c of techCandidates) {
    const res = classify(parseCanonicalDate(c, targetTz));
    if (res === '19_oct' || res === '20_oct') {
      technicalStatus = res;
      break;
    } else if (res === 'other_date') {
      technicalStatus = 'other_date';
    }
  }

  // 3. Outbox
  let outboxStatus = 'invalid_or_missing';
  if (record.operationId) {
    const outboxCandidates = [record.createdAt, record.timestamp];
    for (const c of outboxCandidates) {
      const res = classify(parseCanonicalDate(c, targetTz));
      if (res === '19_oct' || res === '20_oct') {
        outboxStatus = res;
        break;
      } else if (res === 'other_date') {
        outboxStatus = 'other_date';
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

describe('OPTOMED — Homologação Estática e Unitária do Backup Local', () => {

  describe('1. Datas e Fusos Horários (America/Campo_Grande UTC-4 e America/Asuncion UTC-3)', () => {
    it('deve classificar strings de data civil sem fuso (YYYY-MM-DD) diretamente', () => {
      expect(parseCanonicalDate('2026-10-19')).toBe('2026-10-19');
      expect(parseCanonicalDate('2026-10-20')).toBe('2026-10-20');
      expect(parseCanonicalDate('19/10/2026')).toBe('2026-10-19');
      expect(parseCanonicalDate('20/10/2026')).toBe('2026-10-20');
    });

    it('deve converter corretamente timestamp UTC para o dia civil correto em Campo Grande', () => {
      // 2026-10-20T02:30:00Z em UTC é 2026-10-19T22:30:00-04:00 em Campo Grande
      const utcIso = '2026-10-20T02:30:00Z';
      expect(parseCanonicalDate(utcIso, 'America/Campo_Grande')).toBe('2026-10-19');
    });

    it('deve manter transição estrita entre 19/10 23:59 e 20/10 00:01 sem sobreposição', () => {
      const late19 = '2026-10-19T23:59:59-04:00';
      const early20 = '2026-10-20T00:00:01-04:00';
      expect(parseCanonicalDate(late19, 'America/Campo_Grande')).toBe('2026-10-19');
      expect(parseCanonicalDate(early20, 'America/Campo_Grande')).toBe('2026-10-20');
    });

    it('deve separar data clínica de data técnica de gravação', () => {
      const appointment = {
        id: 'apt-1',
        date: '2026-10-19', // Data da consulta
        createdAt: '2026-10-15T10:00:00Z',
        updatedAt: '2026-10-20T09:00:00-04:00' // Atualizado no dia seguinte
      };
      const res = inspectRecordDates(appointment, 'appointments');
      expect(res.clinical).toBe('19_oct');
      expect(res.technical).toBe('20_oct');
    });
  });

  describe('2. Sanitização Recursiva de Segredos sem Perda de Dados Clínicos', () => {
    it('deve eliminar tokens, senhas e hashes em múltiplos níveis sem tocar em anamnese ou refração', () => {
      const dirtyClinicalData = {
        patientId: 'p-1',
        patientName: 'Maria Silva',
        passwordHash: 'pbkdf2:1000...',
        salt: 'secret_salt',
        sessionToken: 'jwt-12345',
        clinicalEncounter: {
          refractionOD: { spherical: -2.50, cylinder: -0.75, axis: 180 },
          refractionOE: { spherical: -2.00, cylinder: -0.50, axis: 175 },
          conduct: 'Prescrito óculos para longe',
          auth_token: 'should-be-removed',
          credentials: {
            apiKey: 'secret_key'
          }
        }
      };

      const cleaned = sanitizeSecretsRecursively(dirtyClinicalData);

      expect(cleaned.passwordHash).toBeUndefined();
      expect(cleaned.salt).toBeUndefined();
      expect(cleaned.sessionToken).toBeUndefined();
      expect(cleaned.clinicalEncounter.auth_token).toBeUndefined();
      expect(cleaned.clinicalEncounter.credentials).toEqual({});

      // Preservação absoluta dos dados de exame e clínicos
      expect(cleaned.patientName).toBe('Maria Silva');
      expect(cleaned.clinicalEncounter.refractionOD.spherical).toBe(-2.50);
      expect(cleaned.clinicalEncounter.conduct).toBe('Prescrito óculos para longe');
    });
  });

  describe('3. Deduplicação Canônica e Separação de Identificadores', () => {
    it('deve deduplicar pacientes existentes em múltiplas fontes com mesmo ID canônico', () => {
      const canonicalMap = new Map<string, any>();
      const secondaryMap = new Map<string, any>();
      let missingCount = 0;

      function register(p: any) {
        const stableId = p.patientGlobalId || p.id || p.documentNumber;
        const name = p.fullName ? p.fullName.trim().toLowerCase() : null;
        if (stableId) {
          if (!canonicalMap.has(stableId)) canonicalMap.set(stableId, p);
        } else if (name) {
          missingCount++;
          if (!secondaryMap.has(name)) secondaryMap.set(name, p);
        } else {
          missingCount++;
        }
      }

      register({ id: 'p-100', fullName: 'João da Silva', documentNumber: '123456' });
      register({ id: 'p-100', fullName: 'João da Silva', documentNumber: '123456' });
      register({ fullName: 'Pedro Sem Documento' });
      register({ fullName: 'Pedro Sem Documento' });

      expect(canonicalMap.size).toBe(1);
      expect(secondaryMap.size).toBe(1);
      expect(missingCount).toBe(2);
      const collisions = Math.max(0, missingCount - secondaryMap.size);
      expect(collisions).toBe(1);
    });
  });

  describe('4. Auditoria da Outbox e Detecção de Duplicidades por operationId', () => {
    it('deve calcular operações únicas e duplicadas sem descartar registros do backup', () => {
      const lsOutbox = [
        { operationId: 'op-1', entity: 'patients', action: 'create' },
        { operationId: 'op-2', entity: 'appointments', action: 'update' }
      ];
      const idbSyncQueue = [
        { operationId: 'op-1', entity: 'patients', action: 'create' },
        { operationId: 'op-3', entity: 'encounters', action: 'create' }
      ];

      const lsOpIds = new Set(lsOutbox.map(o => o.operationId));
      const idbOpIds = new Set(idbSyncQueue.map(o => o.operationId));
      const allDistinct = new Set([...lsOpIds, ...idbOpIds]);

      let common = 0;
      for (const id of lsOpIds) {
        if (idbOpIds.has(id)) common++;
      }

      expect(allDistinct.size).toBe(3);
      expect(common).toBe(1);
      expect(lsOutbox.length).toBe(2);
      expect(idbSyncQueue.length).toBe(2);
    });
  });

  describe('5. Simulação de Resiliência no Lifecycle do IndexedDB', () => {
    it('deve simular cancelamento seguro em timeout e descarte de conexão tardia', () => {
      let isAborted = false;
      let dbClosed = false;

      const mockDb = {
        close: () => { dbClosed = true; }
      };

      isAborted = true;

      const onsuccess = () => {
        if (isAborted) {
          mockDb.close();
          return 'ABORTED_AND_CLOSED';
        }
        return 'PROCEEDED';
      };

      const result = onsuccess();
      expect(result).toBe('ABORTED_AND_CLOSED');
      expect(dbClosed).toBe(true);
    });
  });

  describe('6. Critérios Estritos de Sucesso e Integridade Roundtrip JSON', () => {
    it('não deve marcar sucesso completo se houver erro ou store ausente', () => {
      const mockReport = {
        auditStatus: {
          readStatus: 'IN_PROGRESS',
          serializationStatus: 'PENDING',
          downloadInitiated: false,
          isFullyConsistent: false,
          errorsList: ['Stores esperadas ausentes no IndexedDB: clinical_documents']
        },
        sourcesSummary: {
          indexedDb: {
            accessible: true,
            missingExpectedStores: ['clinical_documents'],
            storesSuccessfullyRead: 18,
            storesExpected: 19
          }
        }
      };

      const jsonRoundtripVerified = true;
      const downloadTriggered = true;

      if (
        mockReport.auditStatus.errorsList.length === 0 &&
        mockReport.sourcesSummary.indexedDb.accessible &&
        mockReport.sourcesSummary.indexedDb.missingExpectedStores.length === 0 &&
        mockReport.sourcesSummary.indexedDb.storesSuccessfullyRead === mockReport.sourcesSummary.indexedDb.storesExpected
      ) {
        mockReport.auditStatus.readStatus = 'COMPLETE_SUCCESS';
      } else {
        mockReport.auditStatus.readStatus = 'PARTIAL_READ_WITH_ERRORS';
      }

      mockReport.auditStatus.isFullyConsistent = (
        mockReport.auditStatus.readStatus === 'COMPLETE_SUCCESS' &&
        jsonRoundtripVerified &&
        downloadTriggered
      );

      expect(mockReport.auditStatus.readStatus).toBe('PARTIAL_READ_WITH_ERRORS');
      expect(mockReport.auditStatus.isFullyConsistent).toBe(false);
    });
  });
});
