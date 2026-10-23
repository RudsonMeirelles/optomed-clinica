import { describe, it, expect } from 'vitest';
import { 
  canTransitionAppointmentStatus, 
  getAppointmentStatusLabel, 
  isPatientInWaitingQueue,
  mergeAppointmentStatuses,
  ALLOWED_APPOINTMENT_TRANSITIONS,
  AppointmentStatus
} from './appointmentStateMachine';

describe('Máquina de Estados de Agendamento e Atendimento Clínico (Subfase 6.1)', () => {
  it('deve permitir o fluxo linear ideal de atendimento', () => {
    // scheduled -> confirmed -> checked_in -> waiting -> called -> in_consultation -> completed
    expect(canTransitionAppointmentStatus('scheduled', 'confirmed')).toBe(true);
    expect(canTransitionAppointmentStatus('confirmed', 'checked_in')).toBe(true);
    expect(canTransitionAppointmentStatus('checked_in', 'waiting')).toBe(true);
    expect(canTransitionAppointmentStatus('waiting', 'called')).toBe(true);
    expect(canTransitionAppointmentStatus('called', 'in_consultation')).toBe(true);
    expect(canTransitionAppointmentStatus('in_consultation', 'completed')).toBe(true);
  });

  it('deve permitir check-in direto a partir de agendado (scheduled -> checked_in ou waiting)', () => {
    expect(canTransitionAppointmentStatus('scheduled', 'checked_in')).toBe(true);
    expect(canTransitionAppointmentStatus('scheduled', 'waiting')).toBe(true);
  });

  it('deve bloquear transições clinicamente incoerentes', () => {
    // Não pode pular de scheduled direto para completed
    expect(canTransitionAppointmentStatus('scheduled', 'completed')).toBe(false);
    // Completed é estado terminal — não pode voltar para scheduled ou in_consultation
    expect(canTransitionAppointmentStatus('completed', 'scheduled')).toBe(false);
    expect(canTransitionAppointmentStatus('completed', 'in_consultation')).toBe(false);
    expect(canTransitionAppointmentStatus('completed', 'waiting')).toBe(false);
    // Não pode pular de canceled para in_consultation sem reagendar
    expect(canTransitionAppointmentStatus('canceled', 'in_consultation')).toBe(false);
  });

  it('deve permitir fluxos de exceção como cancelamento, ausência (no_show) e reagendamento', () => {
    expect(canTransitionAppointmentStatus('scheduled', 'canceled')).toBe(true);
    expect(canTransitionAppointmentStatus('scheduled', 'no_show')).toBe(true);
    expect(canTransitionAppointmentStatus('scheduled', 'rescheduled')).toBe(true);
    expect(canTransitionAppointmentStatus('waiting', 'no_show')).toBe(true);
    expect(canTransitionAppointmentStatus('waiting', 'canceled')).toBe(true);
  });

  it('deve identificar corretamente quando o paciente está em fila de espera física', () => {
    expect(isPatientInWaitingQueue('checked_in')).toBe(true);
    expect(isPatientInWaitingQueue('waiting')).toBe(true);
    expect(isPatientInWaitingQueue('called')).toBe(true);

    expect(isPatientInWaitingQueue('scheduled')).toBe(false);
    expect(isPatientInWaitingQueue('in_consultation')).toBe(false);
    expect(isPatientInWaitingQueue('completed')).toBe(false);
    expect(isPatientInWaitingQueue('canceled')).toBe(false);
  });

  it('deve mesclar status respeitando a precedência clínica', () => {
    // completed tem maior precedência que in_consultation e waiting
    expect(mergeAppointmentStatuses('completed', 'waiting')).toBe('completed');
    expect(mergeAppointmentStatuses('waiting', 'completed')).toBe('completed');
    expect(mergeAppointmentStatuses('in_consultation', 'waiting')).toBe('in_consultation');
    expect(mergeAppointmentStatuses('waiting', 'in_consultation')).toBe('in_consultation');
    expect(mergeAppointmentStatuses('waiting', 'scheduled')).toBe('waiting');
    expect(mergeAppointmentStatuses('scheduled', 'confirmed')).toBe('confirmed');
  });

  it('deve possuir rótulos legíveis para todos os status cadastrados', () => {
    const statuses: AppointmentStatus[] = [
      'scheduled', 'confirmed', 'checked_in', 'waiting', 
      'called', 'in_consultation', 'completed', 'canceled', 
      'no_show', 'rescheduled'
    ];

    statuses.forEach(st => {
      const label = getAppointmentStatusLabel(st);
      expect(label).toBeTruthy();
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(3);
    });
  });
});
