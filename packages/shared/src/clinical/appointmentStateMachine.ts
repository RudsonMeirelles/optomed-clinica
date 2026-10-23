/**
 * OPTOMED — MÁQUINA DE ESTADOS DO AGENDAMENTO E ATENDIMENTO CLÍNICO
 * Fase 6.0 — Recepção, Agenda, Check-in e Fila de Atendimento
 */

import { AppointmentStatus } from './types';

/**
 * Matriz de transições permitidas da máquina de estados do Agendamento Clínico.
 * 
 * Fluxo ideal:
 * scheduled -> confirmed -> checked_in -> waiting -> called -> in_consultation -> completed
 * 
 * Fluxos de exceção:
 * - scheduled / confirmed -> canceled / no_show / rescheduled
 * - checked_in / waiting -> canceled / no_show
 * - called -> in_consultation / waiting (se paciente não respondeu)
 * - in_consultation -> completed
 */
export const ALLOWED_APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ['confirmed', 'checked_in', 'waiting', 'canceled', 'no_show', 'rescheduled'],
  confirmed: ['checked_in', 'waiting', 'scheduled', 'canceled', 'no_show', 'rescheduled'],
  checked_in: ['waiting', 'called', 'in_consultation', 'canceled', 'no_show'],
  waiting: ['called', 'in_consultation', 'checked_in', 'canceled', 'no_show'],
  called: ['in_consultation', 'waiting', 'no_show', 'canceled'],
  in_consultation: ['completed', 'waiting'], // waiting permitido em caso de interrupção ou necessidade de novo exame prévio
  completed: [], // Estado terminal
  canceled: ['scheduled'], // Reativação/reagendamento
  no_show: ['scheduled', 'waiting'], // Paciente chegou atrasado após ser marcado como ausente
  rescheduled: ['scheduled']
};

/**
 * Valida se uma transição de status de agendamento é clinicamente coerente.
 */
export function canTransitionAppointmentStatus(
  currentStatus: AppointmentStatus,
  targetStatus: AppointmentStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = ALLOWED_APPOINTMENT_TRANSITIONS[currentStatus];
  return Boolean(allowed && allowed.includes(targetStatus));
}

/**
 * Retorna o rótulo legível em português do status.
 */
export function getAppointmentStatusLabel(status: AppointmentStatus): string {
  switch (status) {
    case 'scheduled':
      return 'Agendado';
    case 'confirmed':
      return 'Confirmado';
    case 'checked_in':
      return 'Check-in Realizado';
    case 'waiting':
      return 'Aguardando na Recepção';
    case 'called':
      return 'Chamado no Telão';
    case 'in_consultation':
      return 'Em Atendimento';
    case 'completed':
      return 'Concluído';
    case 'canceled':
      return 'Cancelado';
    case 'no_show':
      return 'Não Compareceu';
    case 'rescheduled':
      return 'Reagendado';
    default:
      return status;
  }
}

/**
 * Define se o status indica paciente fisicamente presente na clínica aguardando chamada.
 */
export function isPatientInWaitingQueue(status: AppointmentStatus): boolean {
  return status === 'checked_in' || status === 'waiting' || status === 'called';
}

/**
 * Define a precedência de status para consolidação / merge de registros.
 * completed > in_consultation > called > waiting > checked_in > confirmed > scheduled
 */
export function getAppointmentStatusPrecedence(status: AppointmentStatus): number {
  switch (status) {
    case 'completed':
      return 100;
    case 'in_consultation':
      return 90;
    case 'called':
      return 80;
    case 'waiting':
      return 70;
    case 'checked_in':
      return 60;
    case 'confirmed':
      return 50;
    case 'scheduled':
      return 40;
    case 'rescheduled':
      return 30;
    case 'no_show':
      return 20;
    case 'canceled':
      return 10;
    default:
      return 0;
  }
}

/**
 * Mescla dois status escolhendo o de maior relevância clínica/operacional.
 */
export function mergeAppointmentStatuses(
  statusA: AppointmentStatus,
  statusB: AppointmentStatus
): AppointmentStatus {
  if (statusA === statusB) return statusA;
  const precA = getAppointmentStatusPrecedence(statusA);
  const precB = getAppointmentStatusPrecedence(statusB);
  return precA >= precB ? statusA : statusB;
}
