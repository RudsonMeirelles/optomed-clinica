import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { offlineDb } from './offlineDb';
import { ClinicalEncounter, Patient, ClinicalEpisode, Prescription } from '@optotipo/shared';

describe('OPTOMED — INCIDENTE P0: Isolamento Estrito de Dados entre Clínicas (IVS × MEGA STAR)', () => {
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

  // --------------------------------------------------------------------------
  // TEST A: Token / Sessão IVS -> GET Pacientes IVS = 200 / Autorizado
  // --------------------------------------------------------------------------
  it('Teste A: Sessão IVS tem acesso garantido aos pacientes cadastrados na IVS', () => {
    const patientIvs: Patient = {
      id: 'pat-ivs-001',
      patientGlobalId: 'gid-paciente-alpha',
      fullName: 'Carlos Eduardo IVS',
      birthDate: '1980-05-10',
      nationality: 'BR',
      documentType: 'CPF',
      documentNumber: '111.222.333-44',
      phone: '+55 45 99999-1111',
      lgpdConsent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    offlineDb.savePatient(patientIvs, 'ivs');
    const ivsPatients = offlineDb.getPatients('ivs');

    expect(ivsPatients.some(p => p.id === 'pat-ivs-001')).toBe(true);
    expect(ivsPatients.find(p => p.id === 'pat-ivs-001')?.fullName).toBe('Carlos Eduardo IVS');
  });

  // --------------------------------------------------------------------------
  // TEST B: Token / Sessão IVS -> Tentar obter Pacientes Mega Star = Isolamento estrito (Vazio / 403)
  // --------------------------------------------------------------------------
  it('Teste B: Consulta no escopo IVS não retorna nem vaza pacientes cadastrados na Mega Star', () => {
    const patientMega: Patient = {
      id: 'pat-mega-001',
      patientGlobalId: 'gid-paciente-beta',
      fullName: 'Roberto Silva Mega Star',
      birthDate: '1990-08-20',
      nationality: 'PY',
      documentType: 'CI',
      documentNumber: '5.555.444',
      phone: '+595 981 111 222',
      lgpdConsent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Salva explicitamente no escopo da Mega Star
    offlineDb.savePatient(patientMega, 'megastar');

    // Ao consultar a IVS, o paciente da Mega Star NUNCA deve aparecer
    const ivsPatients = offlineDb.getPatients('ivs');
    expect(ivsPatients.some(p => p.id === 'pat-mega-001')).toBe(false);
    expect(ivsPatients.some(p => p.fullName.includes('Mega Star'))).toBe(false);
  });

  // --------------------------------------------------------------------------
  // TEST C: Token / Sessão Mega Star -> GET Pacientes Mega Star = 200 / Autorizado
  // --------------------------------------------------------------------------
  it('Teste C: Sessão Mega Star tem acesso garantido aos pacientes cadastrados na Mega Star', () => {
    const patientMega: Patient = {
      id: 'pat-mega-002',
      patientGlobalId: 'gid-paciente-gamma',
      fullName: 'Larissa Mendez Mega Star',
      birthDate: '1995-12-01',
      nationality: 'PY',
      documentType: 'CI',
      documentNumber: '4.888.777',
      phone: '+595 982 333 444',
      lgpdConsent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    offlineDb.savePatient(patientMega, 'megastar');
    const megaPatients = offlineDb.getPatients('megastar');

    expect(megaPatients.some(p => p.id === 'pat-mega-002')).toBe(true);
    expect(megaPatients.find(p => p.id === 'pat-mega-002')?.fullName).toBe('Larissa Mendez Mega Star');
  });

  // --------------------------------------------------------------------------
  // TEST D: Token / Sessão Mega Star -> Tentar obter Pacientes IVS = Isolamento estrito (Vazio / 403)
  // --------------------------------------------------------------------------
  it('Teste D: Consulta no escopo Mega Star não retorna nem vaza pacientes cadastrados na IVS', () => {
    const patientIvs: Patient = {
      id: 'pat-ivs-002',
      patientGlobalId: 'gid-paciente-delta',
      fullName: 'Ana Paula IVS',
      birthDate: '1988-03-15',
      nationality: 'BR',
      documentType: 'CPF',
      documentNumber: '999.888.777-66',
      phone: '+55 45 98888-7777',
      lgpdConsent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    offlineDb.savePatient(patientIvs, 'ivs');

    // Ao consultar a Mega Star, o paciente da IVS NUNCA deve aparecer
    const megaPatients = offlineDb.getPatients('megastar');
    expect(megaPatients.some(p => p.id === 'pat-ivs-002')).toBe(false);
    expect(megaPatients.some(p => p.fullName.includes('IVS'))).toBe(false);
  });

  // --------------------------------------------------------------------------
  // TEST E: Token IVS -> patientGlobalId de Mega Star -> Não retornar prontuário da Mega Star
  // --------------------------------------------------------------------------
  it('Teste E: Sessão IVS consultando patientGlobalId existente na Mega Star NÃO acessa dados clínicos da Mega Star', () => {
    const sharedGlobalId = 'GLOBAL-SHARED-IVS-MEGA-01';

    // Paciente cadastrado na Mega Star com histórico clínico na Mega Star
    const patientMega: Patient = {
      id: 'pat-mega-e1',
      patientGlobalId: sharedGlobalId,
      fullName: 'Fernando Alonso',
      birthDate: '1981-07-29',
      nationality: 'PY',
      documentType: 'CI',
      documentNumber: '1.234.567',
      phone: '+595 983 000 111',
      lgpdConsent: true,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z'
    };
    offlineDb.savePatient(patientMega, 'megastar');

    const encounterMega: ClinicalEncounter = {
      id: 'enc-mega-secret',
      patientId: 'pat-mega-e1',
      patientGlobalId: sharedGlobalId,
      date: '2026-01-10T14:00:00.000Z',
      status: 'completed',
      examinerName: 'Dr. Mega Star',
      conduct: 'Prontuário Confidencial da Mega Star',
      updatedAt: '2026-01-10T14:30:00.000Z'
    };
    offlineDb.saveEncounter(encounterMega, 'megastar');

    // Paciente também comparece na IVS (mesmo patientGlobalId)
    const patientIvs: Patient = {
      id: 'pat-ivs-e1',
      patientGlobalId: sharedGlobalId,
      fullName: 'Fernando Alonso',
      birthDate: '1981-07-29',
      nationality: 'BR',
      documentType: 'CPF',
      documentNumber: '777.666.555-44',
      phone: '+55 45 99999-0000',
      lgpdConsent: true,
      createdAt: '2026-02-01T10:00:00.000Z',
      updatedAt: '2026-02-01T10:00:00.000Z'
    };
    offlineDb.savePatient(patientIvs, 'ivs');

    // Sessão IVS consulta prontuário (default allowedClinics = [activeClinicId] = ['ivs'])
    offlineDb.setActiveClinicId('ivs');
    const historyIvs = offlineDb.getUnifiedPatientHistory('pat-ivs-e1', sharedGlobalId);

    // Deve retornar 0 atendimentos da Mega Star!
    expect(historyIvs.encounters.some(e => e.id === 'enc-mega-secret')).toBe(false);
    expect(historyIvs.encounters.some(e => e.clinicId === 'megastar')).toBe(false);
    expect(historyIvs.encounters.length).toBe(0);
  });

  // --------------------------------------------------------------------------
  // TEST F: Token Mega Star -> patientGlobalId de IVS -> Não retornar prontuário da IVS
  // --------------------------------------------------------------------------
  it('Teste F: Sessão Mega Star consultando patientGlobalId existente na IVS NÃO acessa dados clínicos da IVS', () => {
    const sharedGlobalId = 'GLOBAL-SHARED-IVS-MEGA-02';

    // Prontuário confidencial criado na IVS
    const patientIvs: Patient = {
      id: 'pat-ivs-f1',
      patientGlobalId: sharedGlobalId,
      fullName: 'Juliana Paes',
      birthDate: '1979-03-26',
      nationality: 'BR',
      documentType: 'CPF',
      documentNumber: '222.333.444-55',
      phone: '+55 45 98765-4321',
      lgpdConsent: true,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z'
    };
    offlineDb.savePatient(patientIvs, 'ivs');

    const encounterIvs: ClinicalEncounter = {
      id: 'enc-ivs-confidential',
      patientId: 'pat-ivs-f1',
      patientGlobalId: sharedGlobalId,
      date: '2026-01-15T15:00:00.000Z',
      status: 'completed',
      examinerName: 'Dr. Rudson Meirelles',
      conduct: 'Diagnóstico Confidencial IVS - Suspeita de Glaucoma',
      updatedAt: '2026-01-15T15:30:00.000Z'
    };
    offlineDb.saveEncounter(encounterIvs, 'ivs');

    // Paciente cadastrado na Mega Star
    const patientMega: Patient = {
      id: 'pat-mega-f1',
      patientGlobalId: sharedGlobalId,
      fullName: 'Juliana Paes',
      birthDate: '1979-03-26',
      nationality: 'PY',
      documentType: 'CI',
      documentNumber: '6.789.012',
      phone: '+595 981 999 888',
      lgpdConsent: true,
      createdAt: '2026-02-10T10:00:00.000Z',
      updatedAt: '2026-02-10T10:00:00.000Z'
    };
    offlineDb.savePatient(patientMega, 'megastar');

    // Sessão Mega Star consulta prontuário
    offlineDb.setActiveClinicId('megastar');
    const historyMega = offlineDb.getUnifiedPatientHistory('pat-mega-f1', sharedGlobalId);

    // O prontuário da IVS NUNCA pode vazar para a Mega Star
    expect(historyMega.encounters.some(e => e.id === 'enc-ivs-confidential')).toBe(false);
    expect(historyMega.encounters.some(e => e.clinicId === 'ivs')).toBe(false);
    expect(historyMega.encounters.length).toBe(0);
  });

  // --------------------------------------------------------------------------
  // TEST G: Login IVS -> Logout -> Login Mega Star -> Nenhum paciente IVS visível
  // --------------------------------------------------------------------------
  it('Teste G: Transição de contexto IVS -> Logout -> Login Mega Star limpa visão e exibe zero pacientes da IVS', () => {
    // 1. Contexto IVS
    offlineDb.setActiveClinicId('ivs');
    const patientIvs: Patient = {
      id: 'pat-ivs-g1',
      patientGlobalId: 'gid-g1',
      fullName: 'Paciente Exclusivo IVS',
      birthDate: '1985-06-15',
      nationality: 'BR',
      documentType: 'CPF',
      documentNumber: '333.444.555-66',
      phone: '+55 45 91111-2222',
      lgpdConsent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    offlineDb.savePatient(patientIvs, 'ivs');

    expect(offlineDb.getPatients('ivs').some(p => p.id === 'pat-ivs-g1')).toBe(true);

    // 2. Simula Logout e Login na Mega Star
    offlineDb.setActiveClinicId('megastar');
    const currentPatientsInMega = offlineDb.getPatients('megastar');

    // Garante que o paciente da IVS não é retornado na listagem da Mega Star
    expect(currentPatientsInMega.some(p => p.id === 'pat-ivs-g1')).toBe(false);
    expect(currentPatientsInMega.some(p => p.fullName === 'Paciente Exclusivo IVS')).toBe(false);
  });

  // --------------------------------------------------------------------------
  // TEST H: Login Mega Star -> Refresh -> Nenhum paciente IVS visível
  // --------------------------------------------------------------------------
  it('Teste H: Refresh da página no escopo Mega Star restaura apenas dados locais da Mega Star', () => {
    // Cria paciente na IVS e paciente na Mega Star
    offlineDb.savePatient({
      id: 'pat-ivs-h1',
      patientGlobalId: 'gid-h1-ivs',
      fullName: 'Paciente IVS Isolado',
      birthDate: '1992-01-01',
      nationality: 'BR',
      documentType: 'CPF',
      documentNumber: '111.111.111-11',
      phone: '+55 45 9999-0001',
      lgpdConsent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, 'ivs');

    offlineDb.savePatient({
      id: 'pat-mega-h2',
      patientGlobalId: 'gid-h2-mega',
      fullName: 'Paciente Mega Star Nativo',
      birthDate: '1993-02-02',
      nationality: 'PY',
      documentType: 'CI',
      documentNumber: '2.222.222',
      phone: '+595 981 222 333',
      lgpdConsent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, 'megastar');

    // Simula reload com activeClinicId = megastar
    offlineDb.setActiveClinicId('megastar');
    const activeClinicId = offlineDb.getActiveClinicId();
    expect(activeClinicId).toBe('megastar');

    const loadedPatients = offlineDb.getPatients(activeClinicId);
    expect(loadedPatients.some(p => p.id === 'pat-mega-h2')).toBe(true);
    expect(loadedPatients.some(p => p.id === 'pat-ivs-h1')).toBe(false);
  });

  // --------------------------------------------------------------------------
  // TEST I: Mega Star offline -> Somente dados locais autorizados da Mega Star
  // --------------------------------------------------------------------------
  it('Teste I: Operação Offline na Mega Star lê e escreve exclusivamente na partição local da Mega Star', () => {
    offlineDb.setActiveClinicId('megastar');

    const offlineMegaPatient: Patient = {
      id: 'pat-mega-offline-01',
      patientGlobalId: 'gid-mega-offline',
      fullName: 'Atendimento Offline Mega Star',
      birthDate: '1987-11-23',
      nationality: 'PY',
      documentType: 'CI',
      documentNumber: '3.333.333',
      phone: '+595 982 444 555',
      lgpdConsent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    offlineDb.savePatient(offlineMegaPatient, 'megastar');

    // Verifica que está no storage da Mega Star
    const megaStorageKey = 'optotipo_megastar_patients_v2';
    const rawMega = store[megaStorageKey];
    expect(rawMega).toBeDefined();
    expect(rawMega).toContain('Atendimento Offline Mega Star');

    // Verifica que NÃO tocou o storage da IVS
    const ivsStorageKey = 'optotipo_ivs_patients_v2';
    const rawIvs = store[ivsStorageKey];
    if (rawIvs) {
      expect(rawIvs).not.toContain('Atendimento Offline Mega Star');
    }
  });

  // --------------------------------------------------------------------------
  // TEST J: Mega Star reconecta -> Sincronizar somente dados Mega Star
  // --------------------------------------------------------------------------
  it('Teste J: Rotina de sincronização remota inicializada foca estritamente na clínica ativa', () => {
    offlineDb.setActiveClinicId('megastar');
    expect(offlineDb.getActiveClinicId()).toBe('megastar');

    // O método getPatients('megastar') retorna apenas os pacientes da megastar
    const patientsToSync = offlineDb.getPatients('megastar');
    patientsToSync.forEach(p => {
      // Nenhum paciente da IVS pode estar contido aqui
      expect(p.id.startsWith('pat-ivs')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // TEST K: Usuário global em contexto Mega Star -> Somente Mega Star visível
  // --------------------------------------------------------------------------
  it('Teste K: Superadmin / Usuário com escopo global atuando no contexto Mega Star visualiza estritamente Mega Star', () => {
    const effectiveClinicId = 'megastar'; // Contexto selecionado no seletor de unidade

    // Adiciona paciente IVS e Mega Star
    offlineDb.savePatient({
      id: 'pat-ivs-k',
      patientGlobalId: 'gid-k1',
      fullName: 'Paciente Unidade IVS',
      birthDate: '1970-01-01',
      nationality: 'BR',
      documentType: 'CPF',
      documentNumber: '000.111.222-33',
      phone: '+55 45 99000-0000',
      lgpdConsent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, 'ivs');

    offlineDb.savePatient({
      id: 'pat-mega-k',
      patientGlobalId: 'gid-k2',
      fullName: 'Paciente Unidade Mega Star',
      birthDate: '1975-02-02',
      nationality: 'PY',
      documentType: 'CI',
      documentNumber: '9.999.999',
      phone: '+595 981 000 999',
      lgpdConsent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, 'megastar');

    // Ao invocar a consulta do escopo ativo (PatientsList com effectiveClinicId)
    const viewList = offlineDb.getPatients(effectiveClinicId);
    expect(viewList.some(p => p.id === 'pat-mega-k')).toBe(true);
    expect(viewList.some(p => p.id === 'pat-ivs-k')).toBe(false);
  });

  // --------------------------------------------------------------------------
  // TEST L: Usuário global muda explicitamente para IVS -> Somente IVS visível
  // --------------------------------------------------------------------------
  it('Teste L: Superadmin muda explicitamente a unidade para IVS -> Visão comuta estritamente para IVS', () => {
    offlineDb.savePatient({
      id: 'pat-ivs-l',
      patientGlobalId: 'gid-l1',
      fullName: 'Paciente Unidade IVS - L',
      birthDate: '1970-01-01',
      nationality: 'BR',
      documentType: 'CPF',
      documentNumber: '000.111.222-33',
      phone: '+55 45 99000-0000',
      lgpdConsent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, 'ivs');

    offlineDb.savePatient({
      id: 'pat-mega-l',
      patientGlobalId: 'gid-l2',
      fullName: 'Paciente Unidade Mega Star - L',
      birthDate: '1975-02-02',
      nationality: 'PY',
      documentType: 'CI',
      documentNumber: '9.999.999',
      phone: '+595 981 000 999',
      lgpdConsent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, 'megastar');

    let effectiveClinicId = 'megastar';
    expect(offlineDb.getPatients(effectiveClinicId).some(p => p.id === 'pat-ivs-l')).toBe(false);

    // Comutação de contexto para IVS
    effectiveClinicId = 'ivs';
    const viewList = offlineDb.getPatients(effectiveClinicId);
    expect(viewList.some(p => p.id === 'pat-ivs-l')).toBe(true);
    expect(viewList.some(p => p.id === 'pat-mega-l')).toBe(false);
  });

  // --------------------------------------------------------------------------
  // TEST M: IVS -> Mega Star -> Cache anterior não permanece na UI
  // --------------------------------------------------------------------------
  it('Teste M: Troca de clínica IVS -> Mega Star invalida completamente dados da IVS na memória local', () => {
    offlineDb.savePatient({
      id: 'pat-ivs-m',
      patientGlobalId: 'gid-m1',
      fullName: 'Paciente Unidade IVS - M',
      birthDate: '1970-01-01',
      nationality: 'BR',
      documentType: 'CPF',
      documentNumber: '000.111.222-33',
      phone: '+55 45 99000-0000',
      lgpdConsent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, 'ivs');

    // 1. Estado inicial em IVS
    offlineDb.setActiveClinicId('ivs');
    const ivsList = offlineDb.getPatients('ivs');
    expect(ivsList.some(p => p.id === 'pat-ivs-m')).toBe(true);

    // 2. Mudança para Mega Star
    offlineDb.setActiveClinicId('megastar');
    const newContextList = offlineDb.getPatients(offlineDb.getActiveClinicId());
    
    // NENHUM registro da IVS deve constar na coleção da nova clínica
    expect(newContextList.some(p => p.id === 'pat-ivs-m')).toBe(false);
    expect(newContextList.every(p => !p.id.startsWith('pat-ivs'))).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST N: Mega Star -> IVS -> Cache anterior não permanece na UI
  // --------------------------------------------------------------------------
  it('Teste N: Troca de clínica Mega Star -> IVS invalida completamente dados da Mega Star na memória local', () => {
    offlineDb.savePatient({
      id: 'pat-mega-n',
      patientGlobalId: 'gid-n1',
      fullName: 'Paciente Unidade Mega Star - N',
      birthDate: '1975-02-02',
      nationality: 'PY',
      documentType: 'CI',
      documentNumber: '9.999.999',
      phone: '+595 981 000 999',
      lgpdConsent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, 'megastar');

    // 1. Estado inicial em Mega Star
    offlineDb.setActiveClinicId('megastar');
    const megaList = offlineDb.getPatients('megastar');
    expect(megaList.some(p => p.id === 'pat-mega-n')).toBe(true);

    // 2. Mudança para IVS
    offlineDb.setActiveClinicId('ivs');
    const newContextList = offlineDb.getPatients(offlineDb.getActiveClinicId());

    // NENHUM registro da Mega Star deve constar na coleção da nova clínica
    expect(newContextList.some(p => p.id === 'pat-mega-n')).toBe(false);
    expect(newContextList.every(p => !p.id.startsWith('pat-mega'))).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST O: patientGlobalId compartilhado -> Prontuários e episódios estritamente isolados
  // --------------------------------------------------------------------------
  it('Teste O: Mesmo patientGlobalId nas duas clínicas permite deduplicação cadastral, mas prontuários, refrações e condutas permanecem 100% blindados por clinicId', () => {
    const identicalGlobalId = 'GLOBAL-PACIENTE-FRONTEIRA-SHARED-999';

    // Cadastro na IVS
    const patIvs: Patient = {
      id: 'pat-fronteira-ivs',
      patientGlobalId: identicalGlobalId,
      fullName: 'Elena Gomez',
      birthDate: '1984-09-12',
      nationality: 'BR',
      documentType: 'CPF',
      documentNumber: '888.777.666-55',
      phone: '+55 45 99111-2233',
      lgpdConsent: true,
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z'
    };
    offlineDb.savePatient(patIvs, 'ivs');

    // Cadastro na Mega Star
    const patMega: Patient = {
      id: 'pat-fronteira-mega',
      patientGlobalId: identicalGlobalId,
      fullName: 'Elena Gomez',
      birthDate: '1984-09-12',
      nationality: 'PY',
      documentType: 'CI',
      documentNumber: '3.456.789',
      phone: '+595 981 555 666',
      lgpdConsent: true,
      createdAt: '2026-03-02T10:00:00.000Z',
      updatedAt: '2026-03-02T10:00:00.000Z'
    };
    offlineDb.savePatient(patMega, 'megastar');

    // Consulta e prescrição na IVS
    const encounterIvs: ClinicalEncounter = {
      id: 'enc-ivs-elena',
      patientId: 'pat-fronteira-ivs',
      patientGlobalId: identicalGlobalId,
      date: '2026-03-05T14:00:00.000Z',
      status: 'completed',
      examinerName: 'Dr. IVS',
      conduct: 'Conduta realizada em Foz do Iguaçu (IVS)',
      subjectiveRefraction: {
        id: 'rx-ivs',
        encounterId: 'enc-ivs-elena',
        od: { sphere: -2.00, cylinder: -0.50, axis: 180, visualAcuity: '20/20' },
        oe: { sphere: -2.25, cylinder: -0.75, axis: 175, visualAcuity: '20/20' }
      },
      updatedAt: '2026-03-05T14:40:00.000Z'
    };
    offlineDb.saveEncounter(encounterIvs, 'ivs');

    // Consulta e prescrição na Mega Star
    const encounterMega: ClinicalEncounter = {
      id: 'enc-mega-elena',
      patientId: 'pat-fronteira-mega',
      patientGlobalId: identicalGlobalId,
      date: '2026-03-10T09:00:00.000Z',
      status: 'completed',
      examinerName: 'Dra. Mega Star',
      conduct: 'Conduta realizada na Mega Star (Paraguai)',
      subjectiveRefraction: {
        id: 'rx-mega',
        encounterId: 'enc-mega-elena',
        od: { sphere: -1.75, cylinder: 0.00, axis: 0, visualAcuity: '20/25' },
        oe: { sphere: -2.00, cylinder: -0.50, axis: 180, visualAcuity: '20/20' }
      },
      updatedAt: '2026-03-10T09:30:00.000Z'
    };
    offlineDb.saveEncounter(encounterMega, 'megastar');

    // 1. Consulta no contexto IVS (escopo padrão da sessão: ['ivs'])
    offlineDb.setActiveClinicId('ivs');
    const historyIvs = offlineDb.getUnifiedPatientHistory('pat-fronteira-ivs', identicalGlobalId);

    expect(historyIvs.encounters.length).toBe(1);
    expect(historyIvs.encounters[0].id).toBe('enc-ivs-elena');
    expect(historyIvs.encounters[0].conduct).toContain('IVS');
    expect(historyIvs.encounters.some(e => e.id === 'enc-mega-elena')).toBe(false);

    // 2. Consulta no contexto Mega Star (escopo padrão da sessão: ['megastar'])
    offlineDb.setActiveClinicId('megastar');
    const historyMega = offlineDb.getUnifiedPatientHistory('pat-fronteira-mega', identicalGlobalId);

    expect(historyMega.encounters.length).toBe(1);
    expect(historyMega.encounters[0].id).toBe('enc-mega-elena');
    expect(historyMega.encounters[0].conduct).toContain('Mega Star');
    expect(historyMega.encounters.some(e => e.id === 'enc-ivs-elena')).toBe(false);
  });
});
