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
export declare const ALLOWED_APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]>;
/**
 * Valida se uma transição de status de agendamento é clinicamente coerente.
 */
export declare function canTransitionAppointmentStatus(currentStatus: AppointmentStatus, targetStatus: AppointmentStatus): boolean;
/**
 * Retorna o rótulo legível em português do status.
 */
export declare function getAppointmentStatusLabel(status: AppointmentStatus): string;
/**
 * Define se o status indica paciente fisicamente presente na clínica aguardando chamada.
 */
export declare function isPatientInWaitingQueue(status: AppointmentStatus): boolean;
/**
 * Define a precedência de status para consolidação / merge de registros.
 * completed > in_consultation > called > waiting > checked_in > confirmed > scheduled
 */
export declare function getAppointmentStatusPrecedence(status: AppointmentStatus): number;
/**
 * Mescla dois status escolhendo o de maior relevância clínica/operacional.
 */
export declare function mergeAppointmentStatuses(statusA: AppointmentStatus, statusB: AppointmentStatus): AppointmentStatus;
//# sourceMappingURL=appointmentStateMachine.d.ts.map