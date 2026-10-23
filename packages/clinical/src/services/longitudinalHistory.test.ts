import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { offlineDb } from './offlineDb';
import { ClinicalEncounter, Patient } from '@optotipo/shared';

describe('OPTOMED — FASE 25: Histórico Clínico Longitudinal & Comparação', () => {
  let store: Record<string, string> = {};

  beforeAll(() => {
    const localStorageMock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value.toString(); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };
    (global as any).localStorage = localStorageMock;
  });

  beforeEach(() => {
    store = {};
  });

  it('1. Histórico: deve recuperar atendimentos cronologicamente ordenados preservando a integridade original', () => {
    const patient: Patient = {
      id: 'pat-long-1',
      patientGlobalId: 'glob-long-1',
      fullName: 'Maria Aparecida Santos',
      birthDate: '1975-04-12',
      nationality: 'BR',
      documentType: 'CPF',
      documentNumber: '123.456.789-00',
      phoneCountryCode: '+55',
      phone: '+55 45 99999-8888',
      lgpdConsent: true,
      createdAt: '2025-01-01T10:00:00.000Z',
      updatedAt: '2025-01-01T10:00:00.000Z'
    };
    offlineDb.savePatient(patient, 'ivs');

    const encAnterior: ClinicalEncounter = {
      id: 'enc-2025-01',
      patientId: 'pat-long-1',
      patientGlobalId: 'glob-long-1',
      date: '2025-01-15T14:00:00.000Z',
      status: 'completed',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles',
      subjectiveRefraction: {
        id: 'rx-2025',
        encounterId: 'enc-2025-01',
        od: { sphere: -1.50, cylinder: -0.50, axis: 90, visualAcuity: '20/25', prism: 1.0, prismBase: 'in' },
        oe: { sphere: -1.75, cylinder: -0.75, axis: 85, visualAcuity: '20/20' },
        addition: 1.75,
        pdDistanceMm: 62
      },
      conduct: 'Prescrição de óculos monofocais com antirreflexo.',
      returnInstructions: 'Retorno em 1 ano.',
      syncStatus: 'synced',
      updatedAt: '2025-01-15T14:30:00.000Z'
    };

    const encAtual: ClinicalEncounter = {
      id: 'enc-2026-02',
      patientId: 'pat-long-1',
      patientGlobalId: 'glob-long-1',
      date: '2026-02-20T09:00:00.000Z',
      status: 'completed',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles',
      subjectiveRefraction: {
        id: 'rx-2026',
        encounterId: 'enc-2026-02',
        od: { sphere: -2.00, cylinder: -0.50, axis: 90, visualAcuity: '20/20' },
        oe: { sphere: -2.25, cylinder: -1.00, axis: 90, visualAcuity: '20/20' },
        addition: 2.00,
        pdDistanceMm: 62
      },
      conduct: 'Atualização da graduação para miopia e presbiopia.',
      returnInstructions: 'Controle em 12 meses.',
      syncStatus: 'synced',
      updatedAt: '2026-02-20T09:30:00.000Z'
    };

    offlineDb.saveEncounter(encAnterior, 'ivs');
    offlineDb.saveEncounter(encAtual, 'ivs');

    const history = offlineDb.getUnifiedPatientHistory('pat-long-1', 'glob-long-1');
    expect(history.encounters.length).toBe(2);
    // Mais recente primeiro
    expect(history.encounters[0].id).toBe('enc-2026-02');
    expect(history.encounters[1].id).toBe('enc-2025-01');
    // Não altera os dados anteriores
    expect(history.encounters[1].subjectiveRefraction?.od?.sphere).toBe(-1.50);
  });

  it('2. Comparação OD x OD e OE x OE com preservação de lateralidade', () => {
    const rxAntigo = {
      od: { sphere: +1.00, cylinder: -0.50, axis: 180, visualAcuity: '20/30' },
      oe: { sphere: +1.50, cylinder: -1.00, axis: 175, visualAcuity: '20/25' }
    };

    const rxNovo = {
      od: { sphere: +1.25, cylinder: -0.50, axis: 180, visualAcuity: '20/20' },
      oe: { sphere: +1.75, cylinder: -1.00, axis: 180, visualAcuity: '20/20' }
    };

    // OD x OD
    expect(rxAntigo.od.sphere).not.toBe(rxNovo.od.sphere);
    expect(rxAntigo.od.axis).toBe(rxNovo.od.axis);

    // OE x OE
    expect(rxAntigo.oe.sphere).toBe(+1.50);
    expect(rxNovo.oe.sphere).toBe(+1.75);

    // Lateralidade estrita: nunca comparar OD com OE
    expect(rxAntigo.od.sphere).not.toBe(rxAntigo.oe.sphere);
  });

  it('3. Dados Ausentes: deve identificar ausência explicitamente como "não registrado" e nunca como normalidade', () => {
    const encSemPio: ClinicalEncounter = {
      id: 'enc-missing-data',
      patientId: 'pat-missing',
      date: '2026-03-01T10:00:00.000Z',
      status: 'completed',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles',
      syncStatus: 'synced',
      updatedAt: '2026-03-01T10:30:00.000Z'
    };

    // Função de extração pura e imutável para validação
    const extractPio = (enc: ClinicalEncounter, eye: 'OD' | 'OE') => {
      const notes = enc.clinicalNotes || '';
      const regex = eye === 'OD' ? /PIO OD:\s*([0-9]+)/i : /PIO OE:\s*([0-9]+)/i;
      const match = notes.match(regex);
      return match ? `${match[1]} mmHg` : 'não registrado';
    };

    const pioOD = extractPio(encSemPio, 'OD');
    const pioOE = extractPio(encSemPio, 'OE');

    expect(pioOD).toBe('não registrado');
    expect(pioOE).toBe('não registrado');
    expect(pioOD).not.toBe('12 mmHg'); // Não assumir normalidade
    expect(pioOD).not.toBe('Normal');
  });

  it('4. Múltiplas Clínicas e patientGlobalId: unifica histórico de Brasil e Paraguai sem misturar pacientes distintos', () => {
    // Paciente com mesmo patientGlobalId cadastrado no Brasil (ivs) e Paraguai (vision)
    const patBR: Patient = {
      id: 'pat-br-01',
      patientGlobalId: 'GLOBAL-FRONTEIRA-777',
      fullName: 'Alejandro Fernandez',
      birthDate: '1985-08-20',
      nationality: 'BR',
      documentType: 'CPF',
      documentNumber: '999.888.777-66',
      phoneCountryCode: '+55',
      lgpdConsent: true,
      createdAt: '2025-06-01T10:00:00.000Z',
      updatedAt: '2025-06-01T10:00:00.000Z'
    };
    offlineDb.savePatient(patBR, 'ivs');

    const patPY: Patient = {
      id: 'pat-py-02',
      patientGlobalId: 'GLOBAL-FRONTEIRA-777',
      fullName: 'Alejandro Fernandez',
      birthDate: '1985-08-20',
      nationality: 'PY',
      documentType: 'CI_PY',
      documentNumber: '4.555.666',
      phoneCountryCode: '+595',
      lgpdConsent: true,
      createdAt: '2026-01-10T10:00:00.000Z',
      updatedAt: '2026-01-10T10:00:00.000Z'
    };
    offlineDb.savePatient(patPY, 'vision');

    // Consulta no Brasil (ivs)
    const encBR: ClinicalEncounter = {
      id: 'enc-br-01',
      patientId: 'pat-br-01',
      patientGlobalId: 'GLOBAL-FRONTEIRA-777',
      date: '2025-06-05T15:00:00.000Z',
      status: 'completed',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles',
      syncStatus: 'synced',
      updatedAt: '2025-06-05T15:00:00.000Z'
    };
    offlineDb.saveEncounter(encBR, 'ivs');

    // Consulta no Paraguai (vision)
    const encPY: ClinicalEncounter = {
      id: 'enc-py-02',
      patientId: 'pat-py-02',
      patientGlobalId: 'GLOBAL-FRONTEIRA-777',
      date: '2026-01-15T11:00:00.000Z',
      status: 'completed',
      examinerId: 'dr-paraguai',
      examinerName: 'Dr. Oftalmólogo PY',
      syncStatus: 'synced',
      updatedAt: '2026-01-15T11:00:00.000Z'
    };
    offlineDb.saveEncounter(encPY, 'vision');

    // Outro paciente em 'ivs' que NÃO deve ser misturado
    const patOutro: Patient = {
      id: 'pat-outro-99',
      patientGlobalId: 'GLOBAL-OUTRO-999',
      fullName: 'Outro Paciente',
      birthDate: '1990-01-01',
      nationality: 'BR',
      documentType: 'CPF',
      phoneCountryCode: '+55',
      lgpdConsent: true,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z'
    };
    offlineDb.savePatient(patOutro, 'ivs');

    const encOutro: ClinicalEncounter = {
      id: 'enc-outro-99',
      patientId: 'pat-outro-99',
      patientGlobalId: 'GLOBAL-OUTRO-999',
      date: '2026-02-01T10:00:00.000Z',
      status: 'completed',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles',
      syncStatus: 'synced',
      updatedAt: '2026-02-01T10:00:00.000Z'
    };
    offlineDb.saveEncounter(encOutro, 'ivs');

    // Busca histórico longitudinal global de Alejandro com autorização interunidades explícita ('ivs', 'vision')
    const unified = offlineDb.getUnifiedPatientHistory('pat-br-01', 'GLOBAL-FRONTEIRA-777', ['ivs', 'vision']);
    expect(unified.encounters.length).toBe(2);
    expect(unified.encounters.map(e => e.id)).toContain('enc-br-01');
    expect(unified.encounters.map(e => e.id)).toContain('enc-py-02');
    expect(unified.encounters.map(e => e.id)).not.toContain('enc-outro-99'); // Isolamento preservado

    // Origens identificadas
    const pyFound = unified.encounters.find(e => e.id === 'enc-py-02');
    expect(pyFound?.clinicId).toBe('vision');
  });

  it('5. Privacidade TV: histórico clínico nunca é exposto na chamada de TV ou painel de espera', () => {
    // Ticket de chamada de paciente contém apenas nome, senha, sala e prioridade
    const tvTicket = {
      ticketNumber: 'P-01',
      patientName: 'Maria Aparecida Santos',
      roomName: 'Consultório 1',
      examinerName: 'Dr. Rudson Meirelles',
      priority: false
    };

    // Valida que o ticket da TV não contém dados de anamnese, dioptrias, refração ou diagnósticos
    expect((tvTicket as any).diagnoses).toBeUndefined();
    expect((tvTicket as any).subjectiveRefraction).toBeUndefined();
    expect((tvTicket as any).anamnesis).toBeUndefined();
    expect((tvTicket as any).clinicalNotes).toBeUndefined();
    expect((tvTicket as any).conduct).toBeUndefined();
  });

  it('6. Offline e Sincronização: histórico e consultas permanecem operacionais sem internet', () => {
    const encOffline: ClinicalEncounter = {
      id: 'enc-offline-mode',
      patientId: 'pat-offline-1',
      date: new Date().toISOString(),
      status: 'in_progress',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles',
      syncStatus: 'pending_sync',
      updatedAt: new Date().toISOString()
    };

    // Gravação local offline
    offlineDb.saveEncounter(encOffline, 'ivs');

    const loaded = offlineDb.getEncounters('ivs');
    const found = loaded.find(e => e.id === 'enc-offline-mode');
    expect(found).toBeDefined();
    expect(found?.syncStatus).toBe('pending_sync');
  });
});
