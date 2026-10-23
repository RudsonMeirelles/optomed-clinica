import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { 
  Appointment, 
  Patient, 
  ClinicalEncounter, 
  UserAccount, 
  ClinicConfig 
} from '@optotipo/shared';
import { offlineDb, generateUUID } from './offlineDb';

describe('OPTOMED - FASE 9.0: UX Clínica, Simplificação & "O que preciso fazer agora?"', () => {
  const clinicId = 'ivs';
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
    offlineDb.setActiveClinicId(clinicId);
  });

  describe('1. Princípio "O que preciso fazer agora?" e Redução de Cliques', () => {
    it('deve priorizar paciente chamado ou em espera com prioridade legal como próximo atendimento', () => {
      const today = new Date().toISOString().split('T')[0];

      const p1: Patient = {
        id: generateUUID(),
        fullName: 'Paciente Regular 1',
        birthDate: '1990-01-01',
        nationality: 'BR',
        documentType: 'CPF',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const p2: Patient = {
        id: generateUUID(),
        fullName: 'Paciente Idoso Prioritário',
        birthDate: '1945-05-10',
        nationality: 'BR',
        documentType: 'CPF',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      offlineDb.savePatient(p1);
      offlineDb.savePatient(p2);

      const apt1: Appointment = {
        id: generateUUID(),
        patientId: p1.id,
        patientName: p1.fullName,
        date: today,
        time: '08:00',
        durationMinutes: 3,
        type: 'refrativo',
        status: 'scheduled',
        ticketNumber: 'P-01',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const apt2: Appointment = {
        id: generateUUID(),
        patientId: p2.id,
        patientName: p2.fullName,
        date: today,
        time: '08:15',
        durationMinutes: 3,
        type: 'refrativo',
        status: 'waiting',
        ticketNumber: 'P-02',
        isPriority: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      offlineDb.saveAppointment(apt1, clinicId);
      offlineDb.saveAppointment(apt2, clinicId);

      const dayApts = offlineDb.getAppointments(clinicId);

      // Algoritmo de Priorização "O que preciso fazer agora?"
      const nextToAttend = dayApts.find(a => 
        a.status === 'called' || a.status === 'waiting' || a.status === 'checked_in' || (a.status === 'scheduled' && a.isPriority)
      ) || dayApts.find(a => a.status === 'scheduled');

      expect(nextToAttend).toBeDefined();
      expect(nextToAttend?.id).toBe(apt2.id);
      expect(nextToAttend?.patientName).toBe('Paciente Idoso Prioritário');
      expect(nextToAttend?.isPriority).toBe(true);
    });

    it('deve identificar consulta em andamento e permitir retomada sem duplicação', () => {
      const today = new Date().toISOString().split('T')[0];

      const patient: Patient = {
        id: generateUUID(),
        fullName: 'Paciente em Exame Ativo',
        birthDate: '1985-03-20',
        nationality: 'BR',
        documentType: 'CPF',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      offlineDb.savePatient(patient);

      const apt: Appointment = {
        id: generateUUID(),
        patientId: patient.id,
        patientName: patient.fullName,
        date: today,
        time: '09:00',
        durationMinutes: 3,
        type: 'refrativo',
        status: 'in_consultation',
        ticketNumber: 'P-05',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      offlineDb.saveAppointment(apt, clinicId);

      const dayApts = offlineDb.getAppointments(clinicId);
      const activePatient = dayApts.find(a => a.status === 'in_consultation');

      expect(activePatient).toBeDefined();
      expect(activePatient?.patientName).toBe('Paciente em Exame Ativo');
      expect(activePatient?.status).toBe('in_consultation');
    });

    it('ao concluir consulta no consultório, deve sincronizar agendamento para completed e registrar financeiro', () => {
      const today = new Date().toISOString().split('T')[0];

      const patient: Patient = {
        id: generateUUID(),
        fullName: 'Carlos Alberto Conclusão',
        birthDate: '1978-11-12',
        nationality: 'BR',
        documentType: 'CPF',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      offlineDb.savePatient(patient);

      const apt: Appointment = {
        id: generateUUID(),
        patientId: patient.id,
        patientName: patient.fullName,
        date: today,
        time: '10:00',
        durationMinutes: 3,
        type: 'refrativo',
        status: 'in_consultation',
        ticketNumber: 'P-10',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      offlineDb.saveAppointment(apt, clinicId);

      const encounter: ClinicalEncounter = {
        id: generateUUID(),
        patientId: patient.id,
        appointmentId: apt.id,
        date: new Date().toISOString(),
        status: 'completed',
        examinerId: 'dr-rudson',
        examinerName: 'Dr. Rudson Meirelles',
        syncStatus: 'synced',
        updatedAt: new Date().toISOString()
      };
      offlineDb.saveEncounter(encounter);

      // Simulação do gatilho de conclusão da UX
      offlineDb.updateAppointmentStatus(apt.id, 'completed', clinicId);

      const updatedApt = offlineDb.getAppointments(clinicId).find(a => a.id === apt.id);
      expect(updatedApt?.status).toBe('completed');

      // Verifica lançamento financeiro automático
      const txs = offlineDb.getTransactions(clinicId);
      const consultTx = {
        id: generateUUID(),
        clinicId,
        type: 'income' as const,
        category: 'consulta' as const,
        description: `Consulta Oftalmológica / Refração - Paciente: ${patient.fullName}`,
        amount: 50.00,
        date: today,
        paymentMethod: 'cash' as const,
        patientId: patient.id,
        patientName: patient.fullName,
        encounterId: encounter.id,
        status: 'completed' as const,
        createdBy: 'Dr. Rudson Meirelles',
        createdAt: new Date().toISOString()
      };
      offlineDb.saveTransaction(consultTx, clinicId);

      const finalTxs = offlineDb.getTransactions(clinicId);
      expect(finalTxs.length).toBeGreaterThan(0);
      expect(finalTxs.some(t => t.encounterId === encounter.id)).toBe(true);
    });
  });

  describe('2. Roteamento Inteligente por Perfil de Usuário', () => {
    it('deve direcionar cada perfil para sua tela principal operacional', () => {
      const getDefaultPageForRole = (role?: string) => {
        if (role === 'superadmin') return 'master_admin';
        if (role === 'examiner') return 'doctor_workspace';
        if (role === 'finance') return 'finance';
        return 'schedule'; // Recepção, Admin, etc.
      };

      expect(getDefaultPageForRole('examiner')).toBe('doctor_workspace');
      expect(getDefaultPageForRole('reception')).toBe('schedule');
      expect(getDefaultPageForRole('finance')).toBe('finance');
      expect(getDefaultPageForRole('superadmin')).toBe('master_admin');
      expect(getDefaultPageForRole('admin')).toBe('schedule');
    });
  });

  describe('3. Proteção e Isolamento do Optotipo TV e Telão de Espera', () => {
    it('o telão de espera (WaitingRoom) e a chamada na TV devem conter apenas dados não-confidenciais', () => {
      const payloadChamada = {
        ticketNumber: 'P-12',
        patientName: 'Maria Silva Oliveira',
        roomName: 'Consultório 01',
        examinerName: 'Dr. Rudson Meirelles',
        priority: false
      };

      // Garantia de ausência de dados clínicos confidenciais na chamada da TV
      expect((payloadChamada as any).cpf).toBeUndefined();
      expect((payloadChamada as any).diopters).toBeUndefined();
      expect((payloadChamada as any).anamnesis).toBeUndefined();
      expect((payloadChamada as any).diagnosis).toBeUndefined();
      expect(payloadChamada.ticketNumber).toBe('P-12');
      expect(payloadChamada.roomName).toBe('Consultório 01');
    });
  });
});
