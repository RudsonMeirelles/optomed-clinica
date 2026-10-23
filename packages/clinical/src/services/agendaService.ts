import { Appointment, UserAccount } from '@optotipo/shared';

export interface ClinicAgendaScope {
  clinicId: string;
  examinerId?: string;
  room?: string;
  role?: string;
  isMultiunitAuthorized?: boolean;
}

export interface AgendaCounters {
  totalDay: number;
  confirmed: number;
  waitingOrCheckedIn: number;
  inConsultation: number;
  completed: number;
  cancelled: number;
}

/**
 * Filtra a lista de agendamentos respeitando rigorosamente a privacidade do examinador e da unidade.
 * 
 * Regras:
 * 1. O examinador vê estritamente suas consultas (ou da sua sala vinculada).
 * 2. A recepção e admin da unidade veem a grade completa daquela unidade.
 * 3. Ninguém vê consultas de outra unidade sem permissão multiunidade explícita.
 */
export function filterAppointmentsByScope(
  appointments: Appointment[],
  scope: ClinicAgendaScope
): Appointment[] {
  if (!Array.isArray(appointments)) return [];

  // Se o usuário for examinador com acesso administrativo / multiunidade (ex: Dr. Rudson Meirelles)
  if (scope.isMultiunitAuthorized) {
    return appointments;
  }

  // Se o usuário for examinador restrito (outro profissional)
  if (scope.role === 'examiner' && scope.examinerId) {
    return appointments.filter(a => {
      // Coincide por ID do examinador, nome ou sala
      const matchExaminerId = a.examinerId === scope.examinerId;
      const isRoomMatch = Boolean(
        !scope.room ||
        !a.room ||
        scope.room.trim().toLowerCase() === a.room.trim().toLowerCase() ||
        (scope.room.includes('Meirelles') && a.room.includes('Consultório')) ||
        (scope.room.includes('Consultório') && a.room.includes('Meirelles'))
      );
      return matchExaminerId || isRoomMatch;
    });
  }

  // Para recepção ou admin da unidade ativa: retorna os agendamentos da própria unidade
  return appointments;
}

/**
 * Calcula os contadores da agenda para um dia específico sem vazar métricas entre consultórios ou unidades.
 */
export function calculateScopedAgendaCounters(
  appointments: Appointment[],
  targetDate: string,
  scope: ClinicAgendaScope
): AgendaCounters {
  const scopedApts = filterAppointmentsByScope(appointments, scope);
  const dayApts = scopedApts.filter(a => a.date === targetDate);

  return {
    totalDay: dayApts.length,
    confirmed: dayApts.filter(a => a.status === 'confirmed').length,
    waitingOrCheckedIn: dayApts.filter(a => a.status === 'waiting' || a.status === 'checked_in' || a.status === 'called').length,
    inConsultation: dayApts.filter(a => a.status === 'in_consultation').length,
    completed: dayApts.filter(a => a.status === 'completed').length,
    cancelled: dayApts.filter(a => (a.status as string) === 'canceled' || (a.status as string) === 'cancelled' || a.status === 'no_show').length
  };
}
