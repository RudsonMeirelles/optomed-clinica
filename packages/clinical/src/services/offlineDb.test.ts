import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { offlineDb, generateUUID } from './offlineDb';
import { ClinicalEncounter, Patient } from '@optotipo/shared';

describe('Serviço de Banco de Dados Offline, Lembretes e Relatórios', () => {
  let store: Record<string, string> = {};

  beforeAll(() => {
    // Mock simples de localStorage para ambiente Node vitest
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

  it('deve gerar UUIDs v4 válidos e distintos', () => {
    const id1 = generateUUID();
    const id2 = generateUUID();

    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
    expect(id1.length).toBeGreaterThanOrEqual(36);
  });

  it('deve calcular lembretes de retorno solicitados pelo examinador', () => {
    const patient: Patient = {
      id: 'p-test-1',
      fullName: 'Carlos Eduardo Teste',
      birthDate: '1980-01-01',
      nationality: 'BR',
      documentType: 'CPF',
      phone: '+55 45 99999-1111',
      phoneCountryCode: '+55',
      lgpdConsent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    offlineDb.savePatient(patient, 'ivs');

    const encounter: ClinicalEncounter = {
      id: 'enc-test-1',
      patientId: 'p-test-1',
      date: new Date().toISOString(),
      status: 'completed',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles',
      returnInWeeks: 4,
      returnInstructions: 'Retorno para avaliar adaptação de lentes',
      syncStatus: 'synced',
      updatedAt: new Date().toISOString()
    };
    offlineDb.saveEncounter(encounter, 'ivs');

    const reminders = offlineDb.getReturnReminders('ivs');
    expect(reminders.length).toBe(1);
    expect(reminders[0].patientName).toBe('Carlos Eduardo Teste');
    expect(reminders[0].returnWeeks).toBe(4);
    expect(reminders[0].status).toBeDefined();
  });

  it('deve gerar relatório estatístico agregando consultas e faixa etária', () => {
    const patChild: Patient = {
      id: 'p-child',
      fullName: 'Criança Teste',
      birthDate: '2018-05-10', // ~8 anos (pediátrico)
      nationality: 'BR',
      documentType: 'RG',
      phoneCountryCode: '+55',
      lgpdConsent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const patPresbyopic: Patient = {
      id: 'p-presb',
      fullName: 'Adulto Presbiopia Teste',
      birthDate: '1975-03-20', // ~51 anos (presbiopia)
      nationality: 'PY',
      documentType: 'CI_PY',
      phoneCountryCode: '+595',
      lgpdConsent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    offlineDb.savePatient(patChild, 'ivs');
    offlineDb.savePatient(patPresbyopic, 'ivs');

    offlineDb.saveEncounter({
      id: 'enc-1',
      patientId: 'p-child',
      date: new Date().toISOString(),
      status: 'completed',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles',
      syncStatus: 'synced',
      updatedAt: new Date().toISOString()
    }, 'ivs');

    offlineDb.saveEncounter({
      id: 'enc-2',
      patientId: 'p-presb',
      date: new Date().toISOString(),
      status: 'completed',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles',
      syncStatus: 'synced',
      updatedAt: new Date().toISOString()
    }, 'ivs');

    const stats = offlineDb.getReportStats('monthly', undefined, undefined, 'ivs');
    expect(stats.totalConsultations).toBe(2);
    expect(stats.completedConsultations).toBe(2);
    expect(stats.ageDistribution.pediatric).toBe(1);
    expect(stats.ageDistribution.presbyopic).toBe(1);
    expect(stats.nationalityDistribution.br).toBe(1);
    expect(stats.nationalityDistribution.py).toBe(1);
  });
});

