import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { 
  Appointment, 
  AppointmentStatus, 
  Patient, 
  ClinicalEncounter,
  canTransitionAppointmentStatus,
  ALLOWED_APPOINTMENT_TRANSITIONS,
  mergeAppointmentStatuses,
  isPatientInWaitingQueue
} from '@optotipo/shared';
import { offlineDb } from './offlineDb';

describe('FASE 6 — Fluxo Clínico-Operacional Ponta a Ponta: Recepção, Agenda, Check-In, Fila e Atendimento', () => {
  const TEST_CLINIC_ID = 'test-clinic-fase6';
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
    offlineDb.setActiveClinicId(TEST_CLINIC_ID);
  });

  it('1. Máquina de Estados: deve validar ciclo de vida rigoroso sem permitir saltos arbitrários', () => {
    // Transições legais
    expect(canTransitionAppointmentStatus('scheduled', 'checked_in')).toBe(true);
    expect(canTransitionAppointmentStatus('checked_in', 'waiting')).toBe(true);
    expect(canTransitionAppointmentStatus('waiting', 'called')).toBe(true);
    expect(canTransitionAppointmentStatus('called', 'in_consultation')).toBe(true);
    expect(canTransitionAppointmentStatus('in_consultation', 'completed')).toBe(true);

    // Transição direta de agendamento para chamada (ex: adiantamento de paciente)
    expect(canTransitionAppointmentStatus('scheduled', 'waiting')).toBe(true);
    expect(canTransitionAppointmentStatus('checked_in', 'called')).toBe(true);

    // Transições proibidas (saltos incoerentes que quebram auditoria)
    expect(canTransitionAppointmentStatus('scheduled', 'completed')).toBe(false);
    expect(canTransitionAppointmentStatus('scheduled', 'in_consultation')).toBe(false);
    expect(canTransitionAppointmentStatus('completed', 'waiting')).toBe(false);
    expect(canTransitionAppointmentStatus('completed', 'in_consultation')).toBe(false);
    expect(canTransitionAppointmentStatus('canceled', 'in_consultation')).toBe(false);
  });

  it('2. Recepção e Check-In: deve registrar checkInAt e transitar status para checked_in com ticket', () => {
    const apt: Appointment = {
      id: 'apt-001',
      patientId: 'pat-001',
      patientName: 'Maria Silva',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles',
      date: '2026-09-24',
      time: '09:00',
      durationMinutes: 30,
      type: 'refrativo',
      status: 'scheduled',
      clinicId: TEST_CLINIC_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    offlineDb.saveAppointment(apt, TEST_CLINIC_ID);

    // Recepção realiza Check-In
    const success = offlineDb.updateAppointmentStatus(apt.id, 'checked_in', TEST_CLINIC_ID);
    expect(success).toBe(true);

    // Verificação na persistência
    const loaded = offlineDb.getAppointments(TEST_CLINIC_ID).find(a => a.id === apt.id);
    expect(loaded?.status).toBe('checked_in');
    expect(loaded?.checkInAt).toBeDefined();
  });

  it('3. Anti-Concorrência: deve detectar e bloquear múltiplos atendimentos simultâneos para o mesmo paciente', () => {
    const patientId = 'pat-simultaneous-01';

    // Nenhum encontro ativo no início
    const check1 = offlineDb.hasActiveEncounter(patientId, undefined, undefined, TEST_CLINIC_ID);
    expect(check1.active).toBe(false);

    // Inicia um atendimento
    const enc1: ClinicalEncounter = {
      id: 'enc-active-01',
      patientId,
      date: new Date().toISOString(),
      status: 'in_progress',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles',
      syncStatus: 'synced',
      updatedAt: new Date().toISOString()
    };
    offlineDb.saveEncounter(enc1, TEST_CLINIC_ID);

    // Sistema deve acusar atendimento ativo
    const check2 = offlineDb.hasActiveEncounter(patientId, undefined, undefined, TEST_CLINIC_ID);
    expect(check2.active).toBe(true);
    expect(check2.encounter?.id).toBe(enc1.id);
  });

  it('4. Chamada na TV e Atendimento: transições automáticas chamando e iniciando consulta', () => {
    const apt: Appointment = {
      id: 'apt-tv-01',
      patientId: 'pat-tv-01',
      patientName: 'João Pereira',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles',
      date: '2026-09-24',
      time: '10:00',
      durationMinutes: 30,
      type: 'refrativo',
      status: 'checked_in',
      clinicId: TEST_CLINIC_ID,
      isPriority: true,
      ticketNumber: 'P-01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    offlineDb.saveAppointment(apt, TEST_CLINIC_ID);

    // Profissional chama o paciente na TV
    const successCall = offlineDb.updateAppointmentStatus(apt.id, 'called', TEST_CLINIC_ID);
    expect(successCall).toBe(true);

    const calledApt = offlineDb.getAppointments(TEST_CLINIC_ID).find(a => a.id === apt.id);
    expect(calledApt?.status).toBe('called');
    expect(calledApt?.calledAt).toBeDefined();

    // Profissional inicia a consulta
    const successConsult = offlineDb.updateAppointmentStatus(apt.id, 'in_consultation', TEST_CLINIC_ID);
    expect(successConsult).toBe(true);

    const consultApt = offlineDb.getAppointments(TEST_CLINIC_ID).find(a => a.id === apt.id);
    expect(consultApt?.status).toBe('in_consultation');
    expect(consultApt?.startedAt).toBeDefined();
  });

  it('5. Encerramento Clínico: salvar encounter concluído deve finalizar agendamento automaticamente', () => {
    const patientId = 'pat-complete-01';
    const apt: Appointment = {
      id: 'apt-to-finish-01',
      patientId,
      patientName: 'Carlos Drummond',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles',
      date: '2026-09-24',
      time: '11:00',
      durationMinutes: 30,
      type: 'refrativo',
      status: 'in_consultation',
      clinicId: TEST_CLINIC_ID,
      ticketNumber: 'R-05',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    offlineDb.saveAppointment(apt, TEST_CLINIC_ID);

    // Médico conclui a consulta no prontuário
    const encounter: ClinicalEncounter = {
      id: 'enc-finish-01',
      patientId,
      appointmentId: apt.id,
      date: '2026-09-24T11:05:00.000Z',
      status: 'completed',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles',
      syncStatus: 'synced',
      updatedAt: new Date().toISOString()
    };
    offlineDb.saveEncounter(encounter, TEST_CLINIC_ID);

    // O agendamento correspondente deve transitar para completed com completedAt
    const finishApt = offlineDb.getAppointments(TEST_CLINIC_ID).find(a => a.id === apt.id);
    expect(finishApt?.status).toBe('completed');
    expect(finishApt?.completedAt).toBeDefined();
  });

  it('6. Regra de Ordenação e Prioridade Legal: pacientes preferenciais devem preceder na fila', () => {
    const list: Appointment[] = [
      {
        id: '1',
        patientId: 'p1',
        patientName: 'Normal 1',
        examinerId: 'dr',
        examinerName: 'Dr',
        date: '2026-09-24',
        time: '08:00',
        durationMinutes: 30,
        type: 'refrativo',
        status: 'waiting',
        isPriority: false,
        checkInAt: '2026-09-24T08:00:00.000Z',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: '2',
        patientId: 'p2',
        patientName: 'Preferencial 1 (Idoso)',
        examinerId: 'dr',
        examinerName: 'Dr',
        date: '2026-09-24',
        time: '08:15',
        durationMinutes: 30,
        type: 'refrativo',
        status: 'waiting',
        isPriority: true,
        checkInAt: '2026-09-24T08:15:00.000Z',
        createdAt: '',
        updatedAt: ''
      }
    ];

    // Ordenação: Prioridade Legal (Lei 10.048) primeiro
    const sorted = [...list].sort((a, b) => {
      const prioA = a.isPriority ? 1 : 0;
      const prioB = b.isPriority ? 1 : 0;
      if (prioA !== prioB) return prioB - prioA;
      return (a.checkInAt || '').localeCompare(b.checkInAt || '');
    });

    expect(sorted[0].id).toBe('2'); // Preferencial veio primeiro
    expect(sorted[1].id).toBe('1');
  });
});
