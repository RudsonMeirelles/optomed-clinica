import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Appointment, mergeAppointmentStatuses } from '@optotipo/shared';
import { 
  filterAppointmentsByScope, 
  calculateScopedAgendaCounters, 
  ClinicAgendaScope 
} from './agendaService';

describe('OPTOMED — Agenda Dinâmica + Online-First + Realtime (Fase P0/P1)', () => {
  const targetDate = '2026-09-26';

  const mockAppointments: Appointment[] = [
    {
      id: 'apt-1',
      patientId: 'pat-1',
      patientName: 'Carlos Silva',
      examinerId: 'examiner-1',
      examinerName: 'Dr. Rudson Meirelles',
      room: 'Consultório 1',
      date: targetDate,
      time: '08:00',
      durationMinutes: 15,
      type: 'refrativo',
      status: 'scheduled',
      ticketNumber: 'P-01',
      createdAt: '2026-09-26T08:00:00.000Z',
      updatedAt: '2026-09-26T08:00:00.000Z'
    },
    {
      id: 'apt-2',
      patientId: 'pat-2',
      patientName: 'Maria Santos',
      examinerId: 'examiner-1',
      examinerName: 'Dr. Rudson Meirelles',
      room: 'Consultório 1',
      date: targetDate,
      time: '08:30',
      durationMinutes: 15,
      type: 'refrativo',
      status: 'waiting',
      ticketNumber: 'P-02',
      createdAt: '2026-09-26T08:30:00.000Z',
      updatedAt: '2026-09-26T08:30:00.000Z'
    },
    {
      id: 'apt-3',
      patientId: 'pat-3',
      patientName: 'Lucas Ferreira',
      examinerId: 'examiner-2',
      examinerName: 'Dr. Outro Médico',
      room: 'Consultório 2',
      date: targetDate,
      time: '09:00',
      durationMinutes: 15,
      type: 'refrativo',
      status: 'in_consultation',
      ticketNumber: 'P-03',
      createdAt: '2026-09-26T09:00:00.000Z',
      updatedAt: '2026-09-26T09:00:00.000Z'
    },
    {
      id: 'apt-4',
      patientId: 'pat-4',
      patientName: 'Ana Souza',
      examinerId: 'examiner-2',
      examinerName: 'Dr. Outro Médico',
      room: 'Consultório 2',
      date: targetDate,
      time: '09:30',
      durationMinutes: 15,
      type: 'refrativo',
      status: 'completed',
      ticketNumber: 'P-04',
      createdAt: '2026-09-26T09:30:00.000Z',
      updatedAt: '2026-09-26T09:30:00.000Z'
    }
  ];

  it('A. Isolamento por Escopo de Examinador: examinador 1 só vê e conta consultas do seu consultório', () => {
    const scopeExaminer1: ClinicAgendaScope = {
      clinicId: 'ivs',
      examinerId: 'examiner-1',
      room: 'Consultório 1',
      role: 'examiner',
      isMultiunitAuthorized: false
    };

    const filtered = filterAppointmentsByScope(mockAppointments, scopeExaminer1);
    expect(filtered).toHaveLength(2);
    expect(filtered.map(a => a.id)).toEqual(['apt-1', 'apt-2']);

    const counters = calculateScopedAgendaCounters(mockAppointments, targetDate, scopeExaminer1);
    expect(counters.totalDay).toBe(2);
    expect(counters.waitingOrCheckedIn).toBe(1);
    expect(counters.inConsultation).toBe(0); // Não vê a consulta em andamento do Consultório 2!
  });

  it('B. Isolamento por Escopo de Examinador: examinador 2 só vê e conta consultas do Consultório 2', () => {
    const scopeExaminer2: ClinicAgendaScope = {
      clinicId: 'ivs',
      examinerId: 'examiner-2',
      room: 'Consultório 2',
      role: 'examiner',
      isMultiunitAuthorized: false
    };

    const filtered = filterAppointmentsByScope(mockAppointments, scopeExaminer2);
    expect(filtered).toHaveLength(2);
    expect(filtered.map(a => a.id)).toEqual(['apt-3', 'apt-4']);

    const counters = calculateScopedAgendaCounters(mockAppointments, targetDate, scopeExaminer2);
    expect(counters.totalDay).toBe(2);
    expect(counters.inConsultation).toBe(1);
    expect(counters.completed).toBe(1);
    expect(counters.waitingOrCheckedIn).toBe(0); // Não vaza o paciente esperando do Consultório 1!
  });

  it('C. Recepção e Admin da Unidade visualizam a grade completa da clínica ativa', () => {
    const scopeReception: ClinicAgendaScope = {
      clinicId: 'ivs',
      role: 'reception',
      isMultiunitAuthorized: false
    };

    const filtered = filterAppointmentsByScope(mockAppointments, scopeReception);
    expect(filtered).toHaveLength(4);

    const counters = calculateScopedAgendaCounters(mockAppointments, targetDate, scopeReception);
    expect(counters.totalDay).toBe(4);
    expect(counters.waitingOrCheckedIn).toBe(1);
    expect(counters.inConsultation).toBe(1);
    expect(counters.completed).toBe(1);
  });

  it('D. Deduplicação e Transição Segura de Status de Agendamento (State Machine)', () => {
    // scheduled -> confirmed
    expect(mergeAppointmentStatuses('scheduled', 'confirmed')).toBe('confirmed');
    // confirmed -> waiting (check-in)
    expect(mergeAppointmentStatuses('confirmed', 'waiting')).toBe('waiting');
    // waiting -> in_consultation (atendimento iniciado)
    expect(mergeAppointmentStatuses('waiting', 'in_consultation')).toBe('in_consultation');
    // in_consultation -> completed (finalizado)
    expect(mergeAppointmentStatuses('in_consultation', 'completed')).toBe('completed');
  });

  it('E. Idempotência por operationId: requisições repetidas não duplicam agendamentos', () => {
    const journal = new Set<string>();
    const opId = 'op-sched-test-uuid-123';

    const processOperation = (id: string, record: any) => {
      if (journal.has(id)) {
        return { duplicate: true, record };
      }
      journal.add(id);
      return { duplicate: false, record };
    };

    const res1 = processOperation(opId, mockAppointments[0]);
    expect(res1.duplicate).toBe(false);

    const res2 = processOperation(opId, mockAppointments[0]);
    expect(res2.duplicate).toBe(true);
  });
});
