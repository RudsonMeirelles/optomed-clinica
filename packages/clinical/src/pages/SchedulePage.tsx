import React, { useState, useEffect } from 'react';
import { 
  Appointment, 
  AppointmentStatus, 
  AppointmentType, 
  Patient, 
  UserAccount, 
  ReturnReminder, 
  NationalityType, 
  DocumentType, 
  ClinicalEncounter,
  ClinicConfig,
  ClinicUnit,
  mergeAppointmentStatuses,
  isPatientInWaitingQueue
} from '@optotipo/shared';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter, 
  Play, 
  X, 
  Phone, 
  MapPin, 
  Stethoscope, 
  ArrowRight,
  UserCheck,
  Bell,
  MessageSquare,
  CalendarCheck,
  Glasses,
  Check,
  TrendingUp,
  Activity,
  DollarSign,
  Wallet,
  ArrowUpRight,
  Scale,
  LayoutGrid,
  List,
  Building2,
  ExternalLink,
  Share2,
  Copy,
  AlertTriangle,
  ShieldCheck,
  Download,
  CalendarPlus,
  Send,
  Edit3,
  Trash2,
  Bookmark,
  Flag,
  Sparkles,
  Pin,
  ClockAlert,
  CalendarOff,
  CheckSquare
} from 'lucide-react';
import { offlineDb, generateUUID } from '../services/offlineDb';
import { examinerRemunerationService } from '../services/examinerRemunerationService';
import { calendarIntegrationService } from '../services/licensingService';
import { lanController } from '../services/lanController';
import { filterAppointmentsByScope, calculateScopedAgendaCounters, ClinicAgendaScope } from '../services/agendaService';
import { CheckInModal } from '../components/CheckInModal';

interface SchedulePageProps {
  onStartEncounter: (patient: Patient, encounter?: ClinicalEncounter) => void;
  currentUser: UserAccount;
}

// Estrutura do Calendário Oficial Trimestral
interface ShiftInfo {
  locationName: string;
  shortName: string;
  hours: string;
  colorBg: string;
  colorBorder: string;
  colorText: string;
  badgeBg: string;
  badgeText: string;
  iconKey?: string;
  customColor?: string;
}

interface DaySchedule {
  shifts: ShiftInfo[];
  description?: string;
  isOffDay?: boolean;
}

// Mapeamento Oficial dos Locais Conforme o Calendário Trimestral
const LOCATION_CONFIGS = {
  INSTITUTO_TERCA: {
    locationName: 'Instituto da Visão e Saúde (IVS)',
    shortName: 'Instituto',
    hours: '13:00 às 18:00 (Br)',
    colorBg: 'bg-blue-600 hover:bg-blue-700',
    colorBorder: 'border-blue-700',
    colorText: 'text-white',
    badgeBg: 'bg-blue-800/80 text-blue-100',
    badgeText: 'text-blue-100'
  },
  INSTITUTO_QUARTA: {
    locationName: 'Instituto da Visão e Saúde (IVS)',
    shortName: 'Instituto',
    hours: '08:00 às 12:00 (Br)',
    colorBg: 'bg-blue-600 hover:bg-blue-700',
    colorBorder: 'border-blue-700',
    colorText: 'text-white',
    badgeBg: 'bg-blue-800/80 text-blue-100',
    badgeText: 'text-blue-100'
  },
  INSTITUTO: {
    locationName: 'Instituto da Visão e Saúde (IVS)',
    shortName: 'Instituto',
    hours: 'Atendimento IVS',
    colorBg: 'bg-blue-600 hover:bg-blue-700',
    colorBorder: 'border-blue-700',
    colorText: 'text-white',
    badgeBg: 'bg-blue-800/80 text-blue-100',
    badgeText: 'text-blue-100'
  },
  CLINICA_CENTRAL: {
    locationName: 'Clínica Central (PY)',
    shortName: 'Clínica Central',
    hours: '13:00 às 15:45 (Py)',
    colorBg: 'bg-cyan-500 hover:bg-cyan-600',
    colorBorder: 'border-cyan-600',
    colorText: 'text-slate-950',
    badgeBg: 'bg-cyan-700 text-white',
    badgeText: 'text-cyan-900'
  },
  CLINICA_VISUAL: {
    locationName: 'Clínica Visual (PY)',
    shortName: 'Clínica Visual',
    hours: '16:00 às 17:30 (Py)',
    colorBg: 'bg-rose-500 hover:bg-rose-600',
    colorBorder: 'border-rose-600',
    colorText: 'text-white',
    badgeBg: 'bg-rose-800 text-rose-100',
    badgeText: 'text-rose-900'
  },
  SANTA_ROSA: {
    locationName: 'Hospital Santa Rosa PY',
    shortName: 'Santa Rosa PY',
    hours: 'Dia Inteiro',
    colorBg: 'bg-slate-700 hover:bg-slate-800',
    colorBorder: 'border-slate-800',
    colorText: 'text-white',
    badgeBg: 'bg-slate-900 text-slate-200',
    badgeText: 'text-slate-200'
  },
  MEGA_STAR: {
    locationName: 'Mega Star',
    shortName: 'Mega Star',
    hours: '07:30 às 14:00',
    colorBg: 'bg-emerald-600 hover:bg-emerald-700',
    colorBorder: 'border-emerald-700',
    colorText: 'text-white',
    badgeBg: 'bg-emerald-800 text-emerald-100',
    badgeText: 'text-emerald-100'
  },
  STILLO_ITAMARATI: {
    locationName: 'Clínica Stillo Itamarati',
    shortName: 'Clínica Stillo',
    hours: '08:00 às 15:00',
    colorBg: 'bg-amber-600 hover:bg-amber-700',
    colorBorder: 'border-amber-700',
    colorText: 'text-white',
    badgeBg: 'bg-amber-800 text-amber-100',
    badgeText: 'text-amber-100'
  }
};

// Função para retornar a escala do dia conforme a imagem oficial do calendário trimestral 2026
const getDayOfficialSchedule = (dateStr: string): DaySchedule => {
  const [year, monthStr, dayStr] = dateStr.split('-').map(Number);
  const day = Number(dayStr);
  const dateObj = new Date(year, monthStr - 1, day);
  const dayOfWeek = dateObj.getDay(); // 0: Dom, 1: Seg, 2: Ter, 3: Qua, 4: Qui, 5: Sex, 6: Sáb

  // Domingos: Folga / Sem atendimento
  if (dayOfWeek === 0) {
    return {
      shifts: [],
      isOffDay: true,
      description: 'Domingo - Sem atendimento'
    };
  }

  // Segundas-feiras: Livre conforme determinação da nova escala
  if (dayOfWeek === 1) {
    return {
      shifts: [],
      description: 'Segunda-feira Livre'
    };
  }

  // Regra Permanente: Todo primeiro sábado do mês -> Atendimento na Clínica Stillo Itamarati (08:00 às 15:00, dias 1 a 7)
  if (dayOfWeek === 6 && day <= 7) {
    return {
      shifts: [LOCATION_CONFIGS.STILLO_ITAMARATI],
      description: '1º Sábado do Mês: Atendimento Stillo Ita (08h às 15h)'
    };
  }

  // Terças-feiras: Atendimento IVS das 13:00 às 18:00 (Br)
  if (dayOfWeek === 2) {
    return {
      shifts: [LOCATION_CONFIGS.INSTITUTO_TERCA],
      description: 'Terça-feira: Atendimento IVS (13:00 às 18:00)'
    };
  }

  // Quartas-feiras: Atendimento IVS das 08:00 às 12:00 (Br)
  if (dayOfWeek === 3) {
    return {
      shifts: [LOCATION_CONFIGS.INSTITUTO_QUARTA],
      description: 'Quarta-feira: Atendimento IVS (08:00 às 12:00)'
    };
  }

  // Demais eventos especiais por mês (Santa Rosa e Mega Star)
  if (monthStr === 8) {
    // Hospital Santa Rosa PY: 27 (qui) e 28 (sex)
    if (day === 27 || day === 28) {
      return { shifts: [LOCATION_CONFIGS.SANTA_ROSA] };
    }
    // Mega Star: Último Sábado (29)
    if (day === 29) {
      return { shifts: [LOCATION_CONFIGS.MEGA_STAR] };
    }
  }

  if (monthStr === 9) {
    // Hospital Santa Rosa PY: 10 (qui), 11 (sex), 24 (qui), 25 (sex)
    if (day === 10 || day === 11 || day === 24 || day === 25) {
      return { shifts: [LOCATION_CONFIGS.SANTA_ROSA] };
    }
    // Mega Star: Último Sábado (26)
    if (day === 26) {
      return { shifts: [LOCATION_CONFIGS.MEGA_STAR] };
    }
  }

  if (monthStr === 10) {
    // Hospital Santa Rosa PY: 08 (qui) e 09 (sex)
    if (day === 8 || day === 9) {
      return { shifts: [LOCATION_CONFIGS.SANTA_ROSA] };
    }
    // Mega Star: Último Sábado (31)
    if (day === 31) {
      return { shifts: [LOCATION_CONFIGS.MEGA_STAR] };
    }
  }

  // Demais dias sem marcação oficial -> Livre / Disponível
  return {
    shifts: [],
    description: 'Dia Livre (Sem escala externa)'
  };
};

/**
 * Converte horário 'HH:mm' para minutos do dia
 */
const timeStringToMinutes = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
};

/**
 * Avalia se uma consulta está dentro ou fora do período contratado da clínica.
 * Regra da IVS:
 * - Terça-feira: das 13:00 às 18:00 (Br)
 * - Quarta-feira: das 08:00 às 12:00 (Br)
 * - Suporta override manual (apt.isOutOfContractPeriod = true/false)
 * - Suporta dias negociados por período (ExaminerSpecialPeriod cadastrado ou CustomShiftOverride)
 */
export const isAppointmentOutOfContract = (
  apt: { date?: string; time?: string; isOutOfContractPeriod?: boolean; clinicId?: string },
  currentClinicId?: string
): { isOutOfContract: boolean; isNegotiatedPeriod: boolean; reason: string; label: string } => {
  const targetClinic = apt.clinicId || currentClinicId || 'ivs';

  // 1. Override manual expresso definido pelo examinador ou recepção
  if (apt.isOutOfContractPeriod === true) {
    return {
      isOutOfContract: true,
      isNegotiatedPeriod: false,
      reason: 'Marcado manualmente como fora do período contratado',
      label: 'Fora do Contrato (Avulso)'
    };
  }

  // 2. Se a clínica for IVS, aplica a grade contratual oficial
  if (targetClinic === 'ivs') {
    if (!apt.date) {
      return { isOutOfContract: false, isNegotiatedPeriod: false, reason: 'Sem data definida', label: 'Contratado' };
    }

    // Calcula dia da semana (0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb)
    const [y, m, d] = apt.date.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d, 12, 0, 0).getDay();
    const tMin = timeStringToMinutes(apt.time || '08:00');

    // 2.1 Verifica se há Período Especial / Extraordinário Negociado nesta data exata
    try {
      const specialPeriods = offlineDb.getExaminerSpecialPeriods('ivs');
      const matchedSpecial = specialPeriods.find(p => {
        if (p.status !== 'active' || p.date !== apt.date) return false;
        const sMin = timeStringToMinutes(p.startTime);
        const eMin = timeStringToMinutes(p.endTime);
        return tMin >= sMin && tMin <= eMin;
      });

      if (matchedSpecial) {
        return {
          isOutOfContract: false,
          isNegotiatedPeriod: true,
          reason: `Período Negociado: ${matchedSpecial.notes || 'Atendimento Extraordinário'} (${matchedSpecial.startTime} às ${matchedSpecial.endTime})`,
          label: 'Período Negociado'
        };
      }
    } catch {
      // Ignora erro de leitura caso localStorage não esteja disponível
    }

    // 2.2 Terça-feira contratada: 13:00 às 18:00 (780 a 1080 min)
    if (dayOfWeek === 2) {
      if (tMin >= 13 * 60 && tMin <= 18 * 60) {
        return {
          isOutOfContract: false,
          isNegotiatedPeriod: false,
          reason: 'Período Contratado: Terça-feira (13:00 às 18:00)',
          label: 'Período Contratado'
        };
      } else {
        return {
          isOutOfContract: true,
          isNegotiatedPeriod: false,
          reason: `Horário fora da grade contratada da Terça-feira (13:00 às 18:00): agendado às ${apt.time}`,
          label: 'Fora do Horário (Terça)'
        };
      }
    }

    // 2.3 Quarta-feira contratada: 08:00 às 12:00 (480 a 720 min)
    if (dayOfWeek === 3) {
      if (tMin >= 8 * 60 && tMin <= 12 * 60) {
        return {
          isOutOfContract: false,
          isNegotiatedPeriod: false,
          reason: 'Período Contratado: Quarta-feira (08:00 às 12:00)',
          label: 'Período Contratado'
        };
      } else {
        return {
          isOutOfContract: true,
          isNegotiatedPeriod: false,
          reason: `Horário fora da grade contratada da Quarta-feira (08:00 às 12:00): agendado às ${apt.time}`,
          label: 'Fora do Horário (Quarta)'
        };
      }
    }

    // 2.4 Qualquer outro dia da semana na IVS (Segunda, Quinta, Sexta, Sábado, Domingo)
    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return {
      isOutOfContract: true,
      isNegotiatedPeriod: false,
      reason: `Dia fora do contrato oficial da IVS (${dayNames[dayOfWeek]}). Contratado: Terça (13h-18h) e Quarta (08h-12h).`,
      label: 'Fora do Contrato'
    };
  }

  // Se não for IVS e não estiver marcado manualmente, considera na grade padrão
  return {
    isOutOfContract: false,
    isNegotiatedPeriod: false,
    reason: 'Atendimento na unidade regular',
    label: 'Regular'
  };
};

const CUSTOM_SHIFTS_KEY = 'optomed_custom_shifts_schedule_v2';

export interface CustomShiftOverride {
  date: string; // YYYY-MM-DD
  isOffDay?: boolean;
  description?: string;
  shifts?: ShiftInfo[];
}

const getCustomShiftOverrides = (): Record<string, CustomShiftOverride> => {
  try {
    const raw = localStorage.getItem(CUSTOM_SHIFTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveCustomShiftOverride = (date: string, override: CustomShiftOverride) => {
  try {
    const current = getCustomShiftOverrides();
    current[date] = override;
    localStorage.setItem(CUSTOM_SHIFTS_KEY, JSON.stringify(current));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_custom_shifts_updated', { detail: { date, override } }));
    }
  } catch {}
};

const removeCustomShiftOverride = (date: string) => {
  try {
    const current = getCustomShiftOverrides();
    delete current[date];
    localStorage.setItem(CUSTOM_SHIFTS_KEY, JSON.stringify(current));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_custom_shifts_updated', { detail: { date } }));
    }
  } catch {}
};

export const SchedulePage: React.FC<SchedulePageProps> = ({ onStartEncounter, currentUser }) => {
  const [activeMainTab, setActiveMainTab] = useState<'schedule' | 'returns'>('schedule');
  const [scheduleViewMode, setScheduleViewMode] = useState<'month' | 'day'>('month');
  
  // Obter data real de hoje
  const getTodayIso = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayIso = getTodayIso();
  const initialDateObj = new Date();

  // Ano e Mês selecionados para navegação no calendário (atualizados automaticamente com a data real)
  const [calendarYear, setCalendarYear] = useState<number>(initialDateObj.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(initialDateObj.getMonth() + 1);

  const [selectedDate, setSelectedDate] = useState<string>(todayIso);

  // Reconhecimento do usuário DR. Rudson Meirelles e Examinadores com Permissão Total
  const isDoctorRudson = 
    Boolean(currentUser.fullName && /rudson|meirelles/i.test(currentUser.fullName)) ||
    Boolean(currentUser.username && /rudson|meirelles/i.test(currentUser.username)) ||
    currentUser.role === 'superadmin' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'examiner';

  const userClinicId = (currentUser.clinicId && currentUser.clinicId !== 'all') 
    ? currentUser.clinicId 
    : offlineDb.getActiveClinicId();

  const activeClinic = offlineDb.getClinics().find(c => c.id === userClinicId) || offlineDb.getActiveClinic();
  const isIvs = activeClinic.id === 'ivs';
  const consultPrice = isIvs ? 50.00 : 150.00;

  // O Dr. Rudson Meirelles tem acesso total multi-unidades irrestrito para gerenciar todas as clínicas
  const isRestrictedUser = !isDoctorRudson && Boolean(currentUser.clinicId && currentUser.clinicId !== 'all');
  const isExaminer = currentUser.role !== 'reception';
  // Permissão financeira: visível apenas para usuários do perfil administrativo/financeiro/examinador, ocultando da recepção
  const canViewFinancials = currentUser.role !== 'reception';
  // Permissão total para editar, adicionar e excluir eventos e agendamentos
  const canManageSchedule = isDoctorRudson || isExaminer || currentUser.role !== 'reception';

  const [customShiftsTick, setCustomShiftsTick] = useState(0);

  const getEffectiveDaySchedule = (dateStr: string): DaySchedule => {
    const overrides = getCustomShiftOverrides();
    if (overrides[dateStr]) {
      return {
        shifts: overrides[dateStr].shifts || [],
        description: overrides[dateStr].description,
        isOffDay: overrides[dateStr].isOffDay
      };
    }
    return getDayOfficialSchedule(dateStr);
  };

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [encounters, setEncounters] = useState<ClinicalEncounter[]>([]);
  const [returnReminders, setReturnReminders] = useState<ReturnReminder[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterOutOfContract, setFilterOutOfContract] = useState<boolean>(false);
  const [clinicFilter, setClinicFilter] = useState<string>(isRestrictedUser ? userClinicId : 'CURRENT'); // 'CURRENT' | 'ALL' | clinic.id
  const [datePeriodFilter, setDatePeriodFilter] = useState<'day' | 'this_week' | 'all'>('day');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [isExaminerBriefingOpen, setIsExaminerBriefingOpen] = useState<boolean>(false);
  const [isAutoSyncModalOpen, setIsAutoSyncModalOpen] = useState<boolean>(false);
  const [syncUrlCopied, setSyncUrlCopied] = useState<boolean>(false);
  const [briefingPeriod, setBriefingPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [conflictWarningIsWarning, setConflictWarningIsWarning] = useState<boolean>(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState<boolean>(false);
  const [checkInTargetAppointment, setCheckInTargetAppointment] = useState<Appointment | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Form de Agendamento (Criação e Edição)
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [targetBookingClinicId, setTargetBookingClinicId] = useState<string>(userClinicId);
  const [appointmentDate, setAppointmentDate] = useState<string>(selectedDate);
  const [bookingMode, setBookingMode] = useState<'existing' | 'quick' | 'event'>('quick');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientFilterQuery, setPatientFilterQuery] = useState<string>('');
  const [quickPatientName, setQuickPatientName] = useState<string>('');
  const [quickPatientPhone, setQuickPatientPhone] = useState<string>('');
  const [quickPatientNationality, setQuickPatientNationality] = useState<NationalityType>('BR');
  const [newTime, setNewTime] = useState<string>('10:30');
  const [newDurationMinutes, setNewDurationMinutes] = useState<number>(3);
  const [newType, setNewType] = useState<AppointmentType | 'urgencia'>('refrativo');
  const [newNotes, setNewNotes] = useState<string>('');
  const [newIsOutOfContractPeriod, setNewIsOutOfContractPeriod] = useState<boolean>(false);
  const [newContractPeriodNotes, setNewContractPeriodNotes] = useState<string>('');
  const [newExaminerName, setNewExaminerName] = useState<string>('Dr. Rudson Meirelles');

  // Modal de Ajuste de Escala / Eventos Oficiais do Calendário
  const [isScaleModalOpen, setIsScaleModalOpen] = useState<boolean>(false);
  const [scaleEditDate, setScaleEditDate] = useState<string>(selectedDate);
  const [scaleLocationName, setScaleLocationName] = useState<string>('Instituto da Visão e Saúde (IVS)');
  const [scaleShortName, setScaleShortName] = useState<string>('Instituto');
  const [scaleHours, setScaleHours] = useState<string>('08:00 às 18:00 (Br)');
  const [scaleIsOffDay, setScaleIsOffDay] = useState<boolean>(false);
  const [scaleDescription, setScaleDescription] = useState<string>('');

  // Modal para Cadastrar Nova Clínica / Unidade de Atendimento Diretamente na Agenda
  const [isNewClinicModalOpen, setIsNewClinicModalOpen] = useState<boolean>(false);
  const [newClinicName, setNewClinicName] = useState<string>('');
  const [newClinicCity, setNewClinicCity] = useState<string>('Ponta Porã');
  const [newClinicCountry, setNewClinicCountry] = useState<'Brasil' | 'Paraguai'>('Brasil');
  const [newClinicAddress, setNewClinicAddress] = useState<string>('');
  const [newClinicPhone, setNewClinicPhone] = useState<string>('');
  const [newClinicColor, setNewClinicColor] = useState<string>('#2563EB');

  // Ajusta o horário em saltos de 3 minutos
  const adjustTimeByMinutes = (currentTime: string, deltaMin: number): string => {
    const [h, m] = (currentTime || '08:00').split(':').map(Number);
    let total = (isNaN(h) ? 8 : h) * 60 + (isNaN(m) ? 0 : m) + deltaMin;
    if (total < 0) total = 0;
    if (total >= 1440) total = 1437;
    const newH = Math.floor(total / 60);
    const newM = total % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  // Modal para Completar Cadastro Presencial quando o paciente chega
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState<boolean>(false);
  const [targetPatientToComplete, setTargetPatientToComplete] = useState<Patient | null>(null);
  const [targetAppointmentToComplete, setTargetAppointmentToComplete] = useState<Appointment | null>(null);
  const [completeFullName, setCompleteFullName] = useState<string>('');
  const [completePhone, setCompletePhone] = useState<string>('');
  const [completeNationality, setCompleteNationality] = useState<NationalityType>('BR');
  const [completeBirthDate, setCompleteBirthDate] = useState<string>('');
  const [completeDocumentType, setCompleteDocumentType] = useState<DocumentType>('CPF');
  const [completeDocumentNumber, setCompleteDocumentNumber] = useState<string>('');
  const [completeCity, setCompleteCity] = useState<string>('Ponta Porã');
  const [completeAddress, setCompleteAddress] = useState<string>('');
  const [completeGuardianName, setCompleteGuardianName] = useState<string>('');
  const [completeSex, setCompleteSex] = useState<Patient['sex']>('uninformed');
  const [completeNotes, setCompleteNotes] = useState<string>('');
  const [aptToDelete, setAptToDelete] = useState<Appointment | null>(null);

  const getLocalDateStr = (dStr?: string): string => {
    if (!dStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return dStr.slice(0, 10);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return dStr.slice(0, 10);
    }
  };

  const loadData = () => {
    const effectiveClinic = isRestrictedUser ? userClinicId : offlineDb.getActiveClinicId();
    setAppointments(offlineDb.getAppointments(effectiveClinic));
    setPatients(offlineDb.getPatients(effectiveClinic));
    setEncounters(offlineDb.getEncounters(effectiveClinic));
    setReturnReminders(offlineDb.getReturnReminders(effectiveClinic));
  };

  useEffect(() => {
    offlineDb.cleanupVisionContamination();
    loadData();

    // Ouvintes de eventos em tempo real para sincronização instantânea de agendamentos
    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('optomed_appointment_updated', handleUpdate);
    window.addEventListener('optomed_new_patient_registered', handleUpdate);
    window.addEventListener('optomed_patient_updated', handleUpdate);
    window.addEventListener('optomed_encounter_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Polling de fallback a cada 8 segundos (sincronização instantânea já ocorre via WebSocket e eventos customizados)
    const timer = setInterval(() => {
      loadData();
    }, 8000);

    return () => {
      clearInterval(timer);
      window.removeEventListener('optomed_appointment_updated', handleUpdate);
      window.removeEventListener('optomed_new_patient_registered', handleUpdate);
      window.removeEventListener('optomed_patient_updated', handleUpdate);
      window.removeEventListener('optomed_encounter_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const openScheduleReturnModal = (reminder: ReturnReminder) => {
    setSelectedPatientId(reminder.patientId);
    setSelectedDate(reminder.targetDate);
    setNewTime('09:00');
    setNewType('retorno');
    setNewNotes(`Retorno solicitado pelo examinador (${reminder.instructions})`);
    setNewExaminerName(reminder.examinerName || 'Dr. Rudson Meirelles');
    setIsNewModalOpen(true);
  };

  const handleDateChange = (daysDelta: number) => {
    const current = new Date(selectedDate + 'T12:00:00');
    current.setDate(current.getDate() + daysDelta);
    const newDateStr = current.toISOString().split('T')[0];
    setSelectedDate(newDateStr);
    
    // Sincronizar o mês do calendário caso mude de mês
    const [, m, y] = [current.getDate(), current.getMonth() + 1, current.getFullYear()];
    setCalendarMonth(m);
    setCalendarYear(y);
  };

  const handleSetToday = () => {
    const now = new Date();
    setSelectedDate(getTodayIso());
    setCalendarMonth(now.getMonth() + 1);
    setCalendarYear(now.getFullYear());
  };

  const handleStatusChange = (id: string, newStatus: AppointmentStatus) => {
    // Permite finalizar/concluir diretamente a partir de qualquer estado na interface
    offlineDb.updateAppointmentStatus(id, newStatus, undefined, newStatus === 'completed');
    loadData();
  };

  const handleCompleteAllWaiting = () => {
    const pendingList = dayAppointments.filter(a => a.status === 'waiting' || a.status === 'checked_in' || a.status === 'in_consultation');
    if (pendingList.length === 0) return;
    if (window.confirm(`Deseja concluir todas as ${pendingList.length} consultas em andamento/espera de hoje?`)) {
      pendingList.forEach(apt => {
        offlineDb.updateAppointmentStatus(apt.id, 'completed', undefined, true);
      });
      loadData();
    }
  };

  const handleCallPatient = (apt: Appointment) => {
    offlineDb.updateAppointmentStatus(apt.id, 'in_consultation');
    loadData();

    // Dispara a chamada de senha na tela da TV e Sala de Espera
    const ticketNum = apt.ticketNumber || `P-${String(dayAppointments.indexOf(apt) + 1).padStart(2, '0')}`;
    lanController.callPatient({
      ticketNumber: ticketNum,
      patientName: apt.patientName,
      roomName: apt.room || 'Consultório 1',
      examinerName: apt.examinerName || 'Dr. Rudson Meirelles',
      priority: apt.isPriority
    });

    let p = patients.find(pat => pat.id === apt.patientId);
    if (!p) {
      p = {
        id: apt.patientId || generateUUID(),
        fullName: apt.patientName,
        birthDate: '',
        nationality: apt.patientNationality,
        documentType: apt.patientNationality === 'PY' ? 'CI_PY' : 'CPF',
        documentNumber: apt.patientDocument,
        phoneCountryCode: apt.patientNationality === 'PY' ? '+595' : '+55',
        phone: apt.patientPhone,
        notes: apt.notes,
        lgpdConsent: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      offlineDb.savePatient(p);
    }
    
    // Busca o encounter correspondente existente para não criar prontuário em branco
    const existingEnc = encounters.find(e => e.patientId === p!.id && getLocalDateStr(e.date) === (apt.date || selectedDate)) ||
                        encounters.find(e => e.patientId === p!.id);
    onStartEncounter(p, existingEnc);
  };

  const openCompleteModal = (apt: Appointment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const p = patients.find(pat => pat.id === apt.patientId) || {
      id: apt.patientId || generateUUID(),
      fullName: apt.patientName,
      birthDate: '',
      sex: 'uninformed' as const,
      nationality: apt.patientNationality || 'BR',
      documentType: apt.patientNationality === 'PY' ? 'CI_PY' : 'CPF',
      documentNumber: apt.patientDocument || '',
      phoneCountryCode: apt.patientNationality === 'PY' ? '+595' : '+55',
      phone: apt.patientPhone || '',
      city: apt.patientNationality === 'PY' ? 'Pedro Juan Caballero' : 'Ponta Porã',
      address: '',
      guardianName: '',
      lgpdConsent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setTargetPatientToComplete(p);
    setTargetAppointmentToComplete(apt);
    setCompleteFullName(p.fullName || apt.patientName || '');
    setCompletePhone(p.phone || apt.patientPhone || '');
    setCompleteNationality(p.nationality || apt.patientNationality || 'BR');
    setCompleteBirthDate(p.birthDate || '');
    setCompleteSex(p.sex || 'uninformed');
    setCompleteDocumentType(p.documentType || ((p.nationality || apt.patientNationality) === 'PY' ? 'CI_PY' : 'CPF'));
    setCompleteDocumentNumber(p.documentNumber || apt.patientDocument || '');
    setCompleteCity(p.city || ((p.nationality || apt.patientNationality) === 'PY' ? 'Pedro Juan Caballero' : 'Ponta Porã'));
    setCompleteAddress(p.address || '');
    setCompleteGuardianName(p.guardianName || '');
    setCompleteNotes(p.notes || apt.notes || '');
    setIsCompleteModalOpen(true);
  };

  const handleSaveCompletedRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPatientToComplete) return;

    const updatedPatient: Patient = {
      ...targetPatientToComplete,
      fullName: completeFullName.trim() || targetPatientToComplete.fullName,
      phone: completePhone.trim() ? completePhone.trim() : undefined,
      nationality: completeNationality,
      birthDate: completeBirthDate,
      sex: completeSex,
      documentType: completeDocumentType,
      documentNumber: completeDocumentNumber.trim() || undefined,
      city: completeCity.trim() || undefined,
      address: completeAddress.trim() || undefined,
      guardianName: completeGuardianName.trim() || undefined,
      notes: completeNotes.trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    offlineDb.savePatient(updatedPatient);

    // Se houver agendamento associado e estiver agendado, confirma chegada para sala de espera e atualiza dados
    if (targetAppointmentToComplete) {
      const nextStatus = targetAppointmentToComplete.status === 'scheduled' ? 'waiting' : targetAppointmentToComplete.status;
      const updatedApt: Appointment = {
        ...targetAppointmentToComplete,
        patientName: updatedPatient.fullName,
        patientPhone: updatedPatient.phone,
        patientNationality: updatedPatient.nationality,
        patientDocument: updatedPatient.documentNumber,
        status: nextStatus,
        notes: updatedPatient.notes || targetAppointmentToComplete.notes,
        updatedAt: new Date().toISOString()
      };
      offlineDb.saveAppointment(updatedApt);
    }

    loadData();
    setIsCompleteModalOpen(false);
    setTargetPatientToComplete(null);
    setTargetAppointmentToComplete(null);
  };

  const openNewAppointmentModal = (dateToUse?: string) => {
    const targetDate = dateToUse || selectedDate;
    setEditingAppointmentId(null);
    setAppointmentDate(targetDate);
    setSelectedPatientId('');
    setQuickPatientName('');
    setQuickPatientPhone('');
    setQuickPatientNationality('BR');

    // Sugere o próximo horário disponível na grade de 3 em 3 minutos
    const dayOfWeek = new Date(targetDate + 'T12:00:00').getDay();
    const defaultStartTime = dayOfWeek === 2 ? '13:00' : '08:00';

    const dayApts = appointments.filter(a => a.date === targetDate && a.status !== 'canceled');
    if (dayApts.length > 0) {
      const sortedTimes = dayApts
        .map(a => a.time || defaultStartTime)
        .sort((a, b) => a.localeCompare(b));
      const lastTime = sortedTimes[sortedTimes.length - 1];
      const nextTime = adjustTimeByMinutes(lastTime, 3);
      setNewTime(nextTime);
    } else {
      setNewTime(defaultStartTime);
    }

    setNewDurationMinutes(3);
    setNewType('refrativo');
    setNewNotes('');
    setNewIsOutOfContractPeriod(false);
    setNewContractPeriodNotes('');
    setNewExaminerName('Dr. Rudson Meirelles');
    setConflictWarning(null);
    setConflictWarningIsWarning(false);
    setTargetBookingClinicId(clinicFilter !== 'ALL' && clinicFilter !== 'CURRENT' ? clinicFilter : userClinicId);
    setIsNewModalOpen(true);
  };

  const openEditAppointmentModal = (apt: Appointment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingAppointmentId(apt.id);
    setAppointmentDate(apt.date || selectedDate);
    setSelectedPatientId(apt.patientId || '');
    setQuickPatientName(apt.patientName || '');
    setQuickPatientPhone(apt.patientPhone || '');
    setQuickPatientNationality(apt.patientNationality || 'BR');
    setNewTime(apt.time || '08:00');
    setNewDurationMinutes(apt.durationMinutes || 3);
    setNewType(apt.type || 'refrativo');
    setNewNotes(apt.notes || '');
    setNewIsOutOfContractPeriod(Boolean(apt.isOutOfContractPeriod));
    setNewContractPeriodNotes(apt.contractPeriodNotes || '');
    setNewExaminerName(apt.examinerName || 'Dr. Rudson Meirelles');
    setBookingMode(apt.patientId && patients.some(p => p.id === apt.patientId) ? 'existing' : 'quick');
    setConflictWarning(null);
    setConflictWarningIsWarning(false);
    setTargetBookingClinicId((apt as any).clinicId || userClinicId);
    setIsNewModalOpen(true);
  };

  const handleDeleteAppointment = (apt: Appointment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAptToDelete(apt);
  };

  const handleConfirmDeleteAppointment = () => {
    if (!aptToDelete) return;
    const apt = aptToDelete;
    const clinicToDelete = (apt as any).clinicId || userClinicId || activeClinic.id;
    
    // 1. Remove o agendamento específico da clínica
    offlineDb.deleteAppointment(apt.id, clinicToDelete);
    if (activeClinic.id !== clinicToDelete) {
      offlineDb.deleteAppointment(apt.id, activeClinic.id);
    }

    // 2. Se for gerado a partir de encounter temporário (apt-enc-xxx)
    if (apt.id.startsWith('apt-enc-')) {
      const encId = apt.id.replace('apt-enc-', '');
      const currentEncs = offlineDb.getEncounters(clinicToDelete).filter(enc => enc.id !== encId);
      offlineDb.saveEncounters(currentEncs, clinicToDelete);
    }

    setAptToDelete(null);
    loadData();
    window.dispatchEvent(new CustomEvent('optomed_appointment_updated', { detail: { id: apt.id, clinicId: clinicToDelete, deleted: true } }));
  };

  /**
   * Alterna rapidamente a marcação de fora do período contratado de uma consulta
   */
  const handleToggleOutOfContractPeriod = (apt: Appointment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetClinic = (apt as any).clinicId || userClinicId || activeClinic.id;
    const currentEvaluation = isAppointmentOutOfContract(apt, targetClinic);
    const newStatus = !currentEvaluation.isOutOfContract;

    const updatedApt: Appointment = {
      ...apt,
      isOutOfContractPeriod: newStatus,
      updatedAt: new Date().toISOString()
    };

    offlineDb.saveAppointment(updatedApt, targetClinic);
    loadData();
    window.dispatchEvent(new CustomEvent('optomed_appointment_updated', { detail: updatedApt }));
  };

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();

    const targetClinicId = targetBookingClinicId || (isRestrictedUser ? userClinicId : activeClinic.id);

    let patientId = selectedPatientId;
    let patientName = '';
    let patientPhone = '';
    let patientNat: NationalityType = 'BR';
    let patientDoc = '';

    if (bookingMode === 'event') {
      // Modo Evento / Compromisso / Bloqueio da Agenda
      if (!quickPatientName.trim()) return;
      patientId = selectedPatientId || generateUUID();
      patientName = quickPatientName.trim();
      patientPhone = quickPatientPhone.trim();
      patientNat = quickPatientNationality;
      patientDoc = '';
    } else if (bookingMode === 'existing') {
      const existing = patients.find(p => p.id === selectedPatientId);
      if (!existing) return;
      patientId = existing.id;
      patientName = existing.fullName;
      patientPhone = existing.phone || '';
      patientNat = existing.nationality || 'BR';
      patientDoc = existing.documentNumber || '';
    } else {
      // Modo Agendamento Rápido (Apenas Nome + Telefone)
      if (!quickPatientName.trim()) return;

      if (editingAppointmentId) {
        // Se estiver editando, busca paciente já existente para atualizar nome e telefone
        const existingPatient = patients.find(p => p.id === selectedPatientId);
        if (existingPatient) {
          patientId = existingPatient.id;
          const updatedPat: Patient = {
            ...existingPatient,
            fullName: quickPatientName.trim(),
            phone: quickPatientPhone.trim() ? `${quickPatientNationality === 'PY' ? '+595' : '+55'} ${quickPatientPhone.trim()}` : existingPatient.phone,
            nationality: quickPatientNationality,
            updatedAt: new Date().toISOString()
          };
          offlineDb.savePatient(updatedPat, targetClinicId);
          patientName = updatedPat.fullName;
          patientPhone = updatedPat.phone || '';
          patientNat = quickPatientNationality;
        } else {
          patientId = selectedPatientId || generateUUID();
          patientName = quickPatientName.trim();
          patientPhone = quickPatientPhone.trim();
          patientNat = quickPatientNationality;
        }
      } else {
        const newPatientId = generateUUID();
        const newQuickPatient: Patient = {
          id: newPatientId,
          fullName: quickPatientName.trim(),
          birthDate: '',
          sex: 'uninformed',
          nationality: quickPatientNationality,
          documentType: quickPatientNationality === 'PY' ? 'CI_PY' : 'CPF',
          documentNumber: '',
          phoneCountryCode: quickPatientNationality === 'PY' ? '+595' : '+55',
          phone: quickPatientPhone.trim() ? `${quickPatientNationality === 'PY' ? '+595' : '+55'} ${quickPatientPhone.trim()}` : undefined,
          city: quickPatientNationality === 'PY' ? 'Pedro Juan Caballero' : 'Ponta Porã',
          country: quickPatientNationality === 'PY' ? 'Paraguai' : 'Brasil',
          address: '',
          notes: newNotes.trim() || 'Agendamento rápido realizado via agenda',
          lgpdConsent: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        offlineDb.savePatient(newQuickPatient, targetClinicId);
        patientId = newPatientId;
        patientName = newQuickPatient.fullName;
        patientPhone = newQuickPatient.phone || '';
        patientNat = quickPatientNationality;
      }
    }

    const targetDate = appointmentDate || selectedDate;

    // 🔒 Verificação de Anti-Conflito de Compromissos Multi-Clínica (intervalo de 3 min)
    const conflict = calendarIntegrationService.checkAppointmentConflict(
      targetClinicId,
      targetDate,
      newTime,
      newDurationMinutes || 3,
      editingAppointmentId || undefined
    );

    // Se for conflito rígido (mesma clínica), bloqueia
    // Se for aviso entre clínicas (isWarning), exibe aviso mas permite confirmação se já foi visto
    if (conflict.hasConflict && !conflict.isWarning) {
      setConflictWarning(conflict.message || 'Existe um conflito de horário ocupado nesta clínica.');
      setConflictWarningIsWarning(false);
      return;
    }

    // Se houver aviso cruzado e ainda não estava ciente, apresenta o aviso em amarelo
    if (conflict.hasConflict && conflict.isWarning && !conflictWarning) {
      setConflictWarning(conflict.message || 'Existe um atendimento em outra unidade do profissional.');
      setConflictWarningIsWarning(true);
      return;
    }

    setConflictWarning(null);
    setConflictWarningIsWarning(false);

    if (editingAppointmentId) {
      // ✏️ Atualização de Agendamento Existente
      const existingApt = appointments.find(a => a.id === editingAppointmentId);
      const updatedApt: Appointment = {
        id: editingAppointmentId,
        patientId: patientId || existingApt?.patientId || generateUUID(),
        patientName: patientName || existingApt?.patientName || 'Paciente',
        patientNationality: patientNat,
        patientPhone: patientPhone,
        patientDocument: patientDoc || existingApt?.patientDocument,
        examinerId: existingApt?.examinerId || 'user-examinador',
        examinerName: newExaminerName,
        date: targetDate,
        time: newTime,
        durationMinutes: newDurationMinutes || existingApt?.durationMinutes || 3,
        type: newType,
        status: existingApt?.status || 'scheduled',
        ticketNumber: existingApt?.ticketNumber || 'P-01',
        notes: newNotes,
        isOutOfContractPeriod: newIsOutOfContractPeriod,
        contractPeriodNotes: newContractPeriodNotes.trim() || undefined,
        room: existingApt?.room || 'Consultório 1',
        createdAt: existingApt?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      offlineDb.saveAppointment(updatedApt, targetClinicId);
      loadData();

      // Notifica alteração para o examinador e agenda em tempo real
      window.dispatchEvent(new CustomEvent('optomed_appointment_updated', { detail: updatedApt }));

      setIsNewModalOpen(false);
      setEditingAppointmentId(null);
      setSelectedPatientId('');
      setQuickPatientName('');
      setQuickPatientPhone('');
      setNewNotes('');
      setNewIsOutOfContractPeriod(false);
      setNewContractPeriodNotes('');
      setConflictWarning(null);
      return;
    }

    // ➕ Criação de Novo Agendamento
    // Gerar Senha Sequencial Diária (ex: P-01, P-02...)
    const targetApts = offlineDb.getAppointments(targetClinicId);
    const existingDayCount = targetApts.filter(a => a.date === targetDate).length;
    const generatedTicket = `P-${String(existingDayCount + 1).padStart(2, '0')}`;

    const newApt: Appointment = {
      id: generateUUID(),
      patientId: patientId,
      patientName: patientName,
      patientNationality: patientNat,
      patientPhone: patientPhone,
      patientDocument: patientDoc,
      examinerId: 'user-examinador',
      examinerName: newExaminerName,
      date: targetDate,
      time: newTime,
      durationMinutes: newDurationMinutes || 3,
      type: newType,
      status: 'scheduled',
      ticketNumber: generatedTicket,
      notes: newNotes,
      isOutOfContractPeriod: newIsOutOfContractPeriod,
      contractPeriodNotes: newContractPeriodNotes.trim() || undefined,
      room: 'Consultório 1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    offlineDb.saveAppointment(newApt, targetClinicId);
    loadData();

    // Emite notificação imediata na tela do examinador
    window.dispatchEvent(new CustomEvent('optomed_new_patient_registered', {
      detail: {
        patientName: newApt.patientName,
        patientId: newApt.patientId,
        ticketNumber: newApt.ticketNumber,
        time: newApt.time,
        type: newApt.type === 'refrativo' ? 'Refração & Grau' : 'Consulta Geral',
        isPriority: newApt.isPriority,
        appointmentId: newApt.id
      }
    }));

    setIsNewModalOpen(false);
    setEditingAppointmentId(null);
    setSelectedPatientId('');
    setQuickPatientName('');
    setQuickPatientPhone('');
    setNewNotes('');
    setConflictWarning(null);
  };

  // Consolidação completa e deduplicação em tempo real na Agenda
  // Unifica Agendamentos + Prontuários + Cadastros de Pacientes sem qualquer duplicidade
  const getMergedDayAppointments = (): (Appointment & { clinicName?: string; clinicId?: string })[] => {
    const isGlobal = Boolean(searchQuery && searchQuery.trim().length > 0) || datePeriodFilter === 'all';
    const activeClinic = offlineDb.getActiveClinic();

    // Helper de correspondência de data/período
    const matchesPeriod = (itemDate?: string): boolean => {
      if (isGlobal) return true;
      if (!itemDate) return false;
      const dStr = getLocalDateStr(itemDate);
      if (datePeriodFilter === 'day') {
        return dStr === selectedDate;
      }
      if (datePeriodFilter === 'this_week') {
        // Semana dinâmica em torno da data selecionada
        const sel = new Date(selectedDate + 'T12:00:00');
        const curr = new Date(dStr + 'T12:00:00');
        const diffDays = Math.abs((curr.getTime() - sel.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }
      return dStr === selectedDate;
    };

    // Normalizador de nome para chave de deduplicação infalível
    const normalizeCleanName = (name?: string): string => {
      if (!name) return '';
      return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
    };

    // Mapa por ID de paciente e mapa por nome normalizado (para vincular prontuário/agendamento avulso)
    const map = new Map<string, Appointment & { clinicName?: string; clinicId?: string }>();
    const patientNameToKey = new Map<string, string>();

    // Helper para buscar chave existente ou registrar nova
    const findExistingKey = (patientId?: string, patientName?: string): string | null => {
      if (patientId && map.has(patientId)) return patientId;
      const clean = normalizeCleanName(patientName);
      if (clean && patientNameToKey.has(clean)) {
        const mappedKey = patientNameToKey.get(clean)!;
        if (map.has(mappedKey)) return mappedKey;
      }
      return null;
    };

    // Helper para salvar item e registrar índices
    const setRecord = (key: string, record: Appointment & { clinicName?: string; clinicId?: string }) => {
      map.set(key, record);
      const clean = normalizeCleanName(record.patientName);
      if (clean) patientNameToKey.set(clean, key);
      if (record.patientId) patientNameToKey.set(record.patientId, key);
    };

    const mergeStatus = (currentStatus: AppointmentStatus, newStatus: AppointmentStatus): AppointmentStatus => {
      return mergeAppointmentStatuses(currentStatus, newStatus);
    };

    if (clinicFilter === 'ALL') {
      const allClinicsApts = calendarIntegrationService.getAllClinicsAppointments();
      const filteredAll = allClinicsApts.filter(a => matchesPeriod(a.date));

      // 1. Agendamentos de todas as clínicas
      filteredAll.forEach(apt => {
        const key = apt.patientId || apt.id;
        const existingKey = findExistingKey(apt.patientId, apt.patientName);
        if (existingKey) {
          const existing = map.get(existingKey)!;
          existing.status = mergeStatus(existing.status, apt.status);
          if (apt.time && apt.time !== '08:00') existing.time = apt.time;
          if (apt.notes) existing.notes = apt.notes;
          if (apt.isOutOfContractPeriod !== undefined) existing.isOutOfContractPeriod = apt.isOutOfContractPeriod;
          if (apt.contractPeriodNotes) existing.contractPeriodNotes = apt.contractPeriodNotes;
        } else {
          setRecord(key, { ...apt });
        }
      });

      // 2. Prontuários (Encounters) de todas as clínicas
      const allClinics = offlineDb.getClinics();
      allClinics.forEach(c => {
        const clinicEncounters = offlineDb.getEncounters(c.id).filter(e => matchesPeriod(e.date));
        const clinicPatients = offlineDb.getPatients(c.id);
        clinicEncounters.forEach(enc => {
          const patientObj = clinicPatients.find(p => p.id === enc.patientId);
          const patientName = patientObj?.fullName || 'Paciente em Atendimento';
          const existingKey = findExistingKey(enc.patientId, patientName);
          const encDateStr = getLocalDateStr(enc.date) || selectedDate;
          const mappedStatus: AppointmentStatus = enc.status === 'completed' ? 'completed' : 'in_consultation';

          if (existingKey) {
            const existing = map.get(existingKey)!;
            existing.status = mergeStatus(existing.status, mappedStatus);
            if (!existing.notes && enc.anamnesis?.chiefComplaint) {
              existing.notes = enc.anamnesis.chiefComplaint;
            }
            if (patientObj) {
              if (!existing.patientPhone) existing.patientPhone = patientObj.phone;
              if (!existing.patientDocument) existing.patientDocument = patientObj.documentNumber;
            }
          } else {
            const timeFromDate = enc.date && enc.date.includes('T')
              ? new Date(enc.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              : '08:00';

            const recordKey = enc.patientId || `enc-${enc.id}`;
            setRecord(recordKey, {
              id: `apt-enc-${enc.id}`,
              patientId: enc.patientId,
              patientName: patientName,
              patientNationality: patientObj?.nationality || 'BR',
              patientPhone: patientObj?.phone,
              patientDocument: patientObj?.documentNumber,
              examinerId: 'user-examinador',
              examinerName: enc.examinerName || 'Dr. Rudson Meirelles',
              date: encDateStr,
              time: timeFromDate,
              durationMinutes: 3,
              type: 'refrativo',
              status: mappedStatus,
              ticketNumber: 'P-01',
              notes: enc.anamnesis?.chiefComplaint || 'Atendimento registrado no consultório.',
              room: 'Consultório 1',
              clinicId: c.id,
              clinicName: c.name,
              createdAt: enc.date || new Date().toISOString(),
              updatedAt: enc.updatedAt || new Date().toISOString()
            });
          }
        });

        // 3. Pacientes cadastrados na clínica
        const clinicSourcePatients = clinicPatients.filter(p => matchesPeriod(p.createdAt));
        clinicSourcePatients.forEach((p, idx) => {
          const existingKey = findExistingKey(p.id, p.fullName);
          if (existingKey) {
            const existing = map.get(existingKey)!;
            if (!existing.patientPhone && p.phone) existing.patientPhone = p.phone;
            if (!existing.patientDocument && p.documentNumber) existing.patientDocument = p.documentNumber;
          } else {
            const patDateStr = getLocalDateStr(p.createdAt) || selectedDate;
            const hasCompletedEnc = clinicEncounters.some(e => e.patientId === p.id && e.status === 'completed');
            const hasAnyEnc = clinicEncounters.some(e => e.patientId === p.id);
            const computedStatus: AppointmentStatus = hasCompletedEnc ? 'completed' : (hasAnyEnc ? 'in_consultation' : 'waiting');

            setRecord(p.id, {
              id: `apt-pat-${p.id}`,
              patientId: p.id,
              patientName: p.fullName,
              patientNationality: p.nationality,
              patientPhone: p.phone,
              patientDocument: p.documentNumber,
              examinerId: 'user-examinador',
              examinerName: 'Dr. Rudson Meirelles',
              date: patDateStr,
              time: p.createdAt ? new Date(p.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '08:00',
              durationMinutes: 3,
              type: 'refrativo',
              status: computedStatus,
              ticketNumber: `P-${String(idx + 1).padStart(2, '0')}`,
              notes: p.notes || (hasCompletedEnc ? 'Atendimento concluído.' : 'Paciente cadastrado na recepção.'),
              room: 'Consultório 1',
              clinicId: c.id,
              clinicName: c.name,
              createdAt: p.createdAt || new Date().toISOString(),
              updatedAt: p.updatedAt || new Date().toISOString()
            });
          }
        });
      });
    } else {
      // Clínica Específica ou Ativa
      const targetClinicId = clinicFilter === 'CURRENT' ? (isRestrictedUser ? userClinicId : activeClinic.id) : clinicFilter;
      const clinicObj = offlineDb.getClinics().find(c => c.id === targetClinicId) || activeClinic;
      const targetApts = offlineDb.getAppointments(targetClinicId);
      const targetEncounters = offlineDb.getEncounters(targetClinicId);
      const targetPatients = offlineDb.getPatients(targetClinicId);

      // 1. Agendamentos
      const sourceApts = targetApts.filter(a => matchesPeriod(a.date));

      sourceApts.forEach(apt => {
        const key = apt.patientId || apt.id;
        const existingKey = findExistingKey(apt.patientId, apt.patientName);
        if (existingKey) {
          const existing = map.get(existingKey)!;
          existing.status = mergeStatus(existing.status, apt.status);
          if (apt.time && apt.time !== '08:00') existing.time = apt.time;
          if (apt.notes) existing.notes = apt.notes;
          if (apt.isOutOfContractPeriod !== undefined) existing.isOutOfContractPeriod = apt.isOutOfContractPeriod;
          if (apt.contractPeriodNotes) existing.contractPeriodNotes = apt.contractPeriodNotes;
        } else {
          setRecord(key, { ...apt, clinicId: targetClinicId, clinicName: clinicObj.name });
        }
      });

      // 2. Encounters realizados (Prontuários)
      const sourceEncounters = targetEncounters.filter(e => matchesPeriod(e.date));

      sourceEncounters.forEach(enc => {
        const patientObj = targetPatients.find(p => p.id === enc.patientId);
        const patientName = patientObj?.fullName || 'Paciente em Atendimento';
        const existingKey = findExistingKey(enc.patientId, patientName);
        const encDateStr = getLocalDateStr(enc.date) || selectedDate;
        const mappedStatus: AppointmentStatus = enc.status === 'completed' ? 'completed' : 'in_consultation';

        if (existingKey) {
          const existing = map.get(existingKey)!;
          existing.status = mergeStatus(existing.status, mappedStatus);
          if (!existing.notes && enc.anamnesis?.chiefComplaint) {
            existing.notes = enc.anamnesis.chiefComplaint;
          }
          if (patientObj) {
            if (!existing.patientPhone) existing.patientPhone = patientObj.phone;
            if (!existing.patientDocument) existing.patientDocument = patientObj.documentNumber;
          }
        } else {
          const timeFromDate = enc.date && enc.date.includes('T')
            ? new Date(enc.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : '08:00';

          const recordKey = enc.patientId || `enc-${enc.id}`;
          setRecord(recordKey, {
            id: `apt-enc-${enc.id}`,
            patientId: enc.patientId,
            patientName: patientName,
            patientNationality: patientObj?.nationality || 'BR',
            patientPhone: patientObj?.phone,
            patientDocument: patientObj?.documentNumber,
            examinerId: 'user-examinador',
            examinerName: enc.examinerName || 'Dr. Rudson Meirelles',
            date: encDateStr,
            time: timeFromDate,
            durationMinutes: 3,
            type: 'refrativo',
            status: mappedStatus,
            ticketNumber: 'P-01',
            notes: enc.anamnesis?.chiefComplaint || 'Atendimento registrado no consultório.',
            room: 'Consultório 1',
            clinicId: targetClinicId,
            clinicName: clinicObj.name,
            createdAt: enc.date || new Date().toISOString(),
            updatedAt: enc.updatedAt || new Date().toISOString()
          });
        }
      });

      // 3. Pacientes cadastrados
      const sourcePatients = targetPatients.filter(p => matchesPeriod(p.createdAt));

      sourcePatients.forEach((p, idx) => {
        const existingKey = findExistingKey(p.id, p.fullName);
        if (existingKey) {
          const existing = map.get(existingKey)!;
          if (!existing.patientPhone && p.phone) existing.patientPhone = p.phone;
          if (!existing.patientDocument && p.documentNumber) existing.patientDocument = p.documentNumber;
        } else {
          const patDateStr = getLocalDateStr(p.createdAt) || selectedDate;
          const hasCompletedEnc = targetEncounters.some(e => e.patientId === p.id && e.status === 'completed');
          const hasAnyEnc = targetEncounters.some(e => e.patientId === p.id);
          const computedStatus: AppointmentStatus = hasCompletedEnc ? 'completed' : (hasAnyEnc ? 'in_consultation' : 'waiting');

          setRecord(p.id, {
            id: `apt-pat-${p.id}`,
            patientId: p.id,
            patientName: p.fullName,
            patientNationality: p.nationality,
            patientPhone: p.phone,
            patientDocument: p.documentNumber,
            examinerId: 'user-examinador',
            examinerName: 'Dr. Rudson Meirelles',
            date: patDateStr,
            time: p.createdAt ? new Date(p.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '08:00',
            durationMinutes: 3,
            type: 'refrativo',
            status: computedStatus,
            ticketNumber: `P-${String(idx + 1).padStart(2, '0')}`,
            notes: p.notes || (hasCompletedEnc ? 'Atendimento concluído.' : 'Paciente cadastrado na recepção.'),
            room: 'Consultório 1',
            clinicId: targetClinicId,
            clinicName: clinicObj.name,
            createdAt: p.createdAt || new Date().toISOString(),
            updatedAt: p.updatedAt || new Date().toISOString()
          });
        }
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      if (isGlobal && a.date !== b.date) {
        return (b.date || '').localeCompare(a.date || '');
      }
      return (a.time || '').localeCompare(b.time || '');
    });
  };

  // Escopo de Agenda Seguro (Isolamento de Examinador, Sala e Unidade)
  const currentAgendaScope: ClinicAgendaScope = {
    clinicId: userClinicId,
    examinerId: currentUser.id,
    room: lanController.getPairedRoom(),
    role: currentUser.role,
    isMultiunitAuthorized: isDoctorRudson
  };

  // Filtragem da agenda respeitando o escopo do usuário logado
  const rawDayAppointments = getMergedDayAppointments();
  const dayAppointments = filterAppointmentsByScope(rawDayAppointments, currentAgendaScope);

  const filteredAppointments = dayAppointments.filter(a => {
    const matchesStatus = filterStatus === 'ALL' || a.status === filterStatus;
    const matchesQuery = !searchQuery || 
      (a.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.patientPhone && a.patientPhone.includes(searchQuery));
    
    // Filtro específico para consultas fora do período contratado
    if (filterOutOfContract) {
      const contractCheck = isAppointmentOutOfContract(a, activeClinic.id);
      if (!contractCheck.isOutOfContract) return false;
    }

    return matchesStatus && matchesQuery;
  });

  // Quantidade de consultas fora do período contratado no dia selecionado
  const outOfContractCount = dayAppointments.filter(a => isAppointmentOutOfContract(a, activeClinic.id).isOutOfContract).length;

  // Métricas Seguras do Dia (Scoped Counters)
  const scopedCounters = calculateScopedAgendaCounters(rawDayAppointments, selectedDate, currentAgendaScope);
  const totalCount = scopedCounters.totalDay;
  const waitingCount = scopedCounters.waitingOrCheckedIn;
  const inConsultCount = scopedCounters.inConsultation;
  const completedCount = scopedCounters.completed;

  // Próximo Paciente da Recepção ("O que preciso fazer agora?")
  // Para recepção: próximo que precisa de Check-in ou chamar senha
  const nextReceptionPatient = dayAppointments.find(a => a.status === 'scheduled' || a.status === 'confirmed') ||
                               dayAppointments.find(a => a.status === 'waiting' || a.status === 'checked_in');

  // Escala oficial ou personalizada da data selecionada
  const selectedDaySchedule = getEffectiveDaySchedule(selectedDate);

  // Cálculo financeiro dos atendimentos concluídos/em andamento do dia
  const completedOrInConsult = dayAppointments.filter(a => a.status === 'completed' || a.status === 'in_consultation');
  const paidConsultationsCount = completedOrInConsult.filter(a => a.type !== 'retorno').length;
  const freeReturnsCount = completedOrInConsult.filter(a => a.type === 'retorno').length;
  const dayEstimatedRevenue = paidConsultationsCount * consultPrice;

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'waiting':
        return (
          <span className="bg-amber-50 text-amber-800 border border-amber-200/80 px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Na Recepção
          </span>
        );
      case 'in_consultation':
        return (
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Em Atendimento
          </span>
        );
      case 'confirmed':
        return (
          <span className="bg-blue-50 text-blue-800 border border-blue-200/80 px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Confirmado
          </span>
        );
      case 'completed':
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-200/80 px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1.5">
            <Check className="w-3 h-3 text-emerald-600" /> Concluído
          </span>
        );
      case 'canceled':
        return (
          <span className="bg-red-50 text-red-700 border border-red-200/80 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
            Cancelado
          </span>
        );
      default:
        return (
          <span className="bg-slate-50 text-slate-700 border border-slate-200/80 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
            Agendado
          </span>
        );
    }
  };

  const getTypeLabel = (type: AppointmentType) => {
    switch (type) {
      case 'refrativo': return 'Refração & Grau';
      case 'consulta_geral': return 'Consulta Geral';
      case 'pediatrico': return 'Pediátrico';
      case 'retorno': return 'Retorno';
      case 'baixa_visao': return 'Baixa Visão';
      case 'urgencia': return 'Urgência';
      default: return type;
    }
  };

  const getEventBadgeDetails = (type: AppointmentType, clinicName?: string) => {
    switch (type) {
      case 'urgencia':
        return { icon: '🚨', label: 'Cirurgia / Procedimento', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
      case 'consulta_geral':
        return { icon: '📋', label: 'Compromisso / Reunião', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
      case 'refrativo':
        return { icon: '🏥', label: clinicName || 'Atendimento / Plantão', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
      case 'retorno':
        return { icon: '🏖️', label: 'Folga / Ausência', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' };
      case 'baixa_visao':
        return { icon: '🔒', label: 'Bloqueio / Particular', bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' };
      case 'pediatrico':
        return { icon: '🔬', label: 'Exame / Ambulatório', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
      default:
        return { icon: '📅', label: getTypeLabel(type), bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' };
    }
  };

  const isToday = selectedDate === todayIso;

  // Cálculos do grid do mês atual
  const firstDayOfMonth = new Date(calendarYear, calendarMonth - 1, 1).getDay();
  const totalDaysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
  const monthName = new Date(calendarYear, calendarMonth - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      
      {/* 1. Header com Título e Ação Rápida */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              AGENDA DO CONSULTÓRIO & ESCALA MÉDICA
            </h1>
            <span className="text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" /> Calendário Oficial 2026
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Dr. Rudson Meirelles • Mapeamento oficial de locais: Instituto (IVS), Clínica Central, Clínica Visual, Santa Rosa PY e Mega Star
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isIvs && (
            <div className="hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-2xl">
              <Scale className="w-4 h-4 text-amber-600" />
              <div className="text-left">
                <span className="text-[9px] uppercase font-black text-amber-700 block tracking-wider">Regime do Dia (Dr. Meirelles)</span>
                <span className="text-xs font-black text-amber-900">Período 5h (Meia Diária)</span>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              calendarIntegrationService.downloadAllAppointmentsICalFile();
              setIsAutoSyncModalOpen(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/20 active:scale-95"
            title="Sincronização 100% Automática e Autônoma com o Google Agenda do Dr. Meirelles"
          >
            <CalendarPlus className="w-4 h-4 text-white animate-pulse" />
            <span>Sincronização Automática Google</span>
          </button>

          <button
            onClick={() => setIsExaminerBriefingOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            title="Gerar aviso e resumo de programação diária, semanal ou mensal para o examinador"
          >
            <Send className="w-4 h-4" />
            <span>Avisos da Agenda</span>
          </button>

          {canManageSchedule && (
            <button
              onClick={() => openNewAppointmentModal(selectedDate)}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-blue-600/25 active:scale-95 transition-all cursor-pointer"
              title="Adicionar evento ou agendar atendimento na agenda do Dr. Rudson Meirelles"
            >
              <Plus className="w-4 h-4" /> Novo Evento / Agendamento
            </button>
          )}
        </div>
      </div>

      {/* Identificação de Permissão do Dr. Rudson Meirelles */}
      {isDoctorRudson && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 rounded-2xl px-4 py-2 flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Perfil: <b>DR. Rudson Meirelles</b> — Permissão Total de Agenda Ativa (Adicionar, Editar e Excluir Eventos Liberado)</span>
          </div>
          <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-black uppercase">
            Acesso Total Multi-Clínicas
          </span>
        </div>
      )}

      {/* 2. Banner de Status da Escala do Dia Selecionado */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-3xl p-5 border border-slate-700 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full text-blue-200">
                Data em Destaque
              </span>
              <span className="text-sm font-black text-amber-300">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>

            {/* Turnos / Locais do Dia */}
            <div className="flex items-center gap-3 flex-wrap pt-1">
              {selectedDaySchedule.shifts.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-slate-300 font-bold bg-white/10 px-3 py-1.5 rounded-xl">
                  <span>⚪ {selectedDaySchedule.description || 'Dia Livre / Sem atendimento externo cadastrado'}</span>
                </div>
              ) : (
                selectedDaySchedule.shifts.map((shift, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black ${
                      shift.shortName === 'Instituto' 
                        ? 'bg-blue-600/90 border-blue-400 text-white' 
                        : shift.shortName === 'Clínica Central'
                        ? 'bg-cyan-500/90 border-cyan-300 text-slate-950'
                        : shift.shortName === 'Clínica Visual'
                        ? 'bg-rose-500/90 border-rose-300 text-white'
                        : shift.shortName === 'Santa Rosa PY'
                        ? 'bg-slate-700/90 border-slate-500 text-white'
                        : shift.shortName === 'Clínica Stillo'
                        ? 'bg-amber-600/90 border-amber-400 text-white'
                        : 'bg-emerald-600/90 border-emerald-400 text-white'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{shift.locationName}</span>
                    <span className="bg-black/30 px-2 py-0.5 rounded-md text-[10px] font-mono">
                      {shift.hours}
                    </span>
                  </div>
                ))
              )}

              {canManageSchedule && (
                <button
                  type="button"
                  onClick={() => {
                    setScaleEditDate(selectedDate);
                    const existing = selectedDaySchedule.shifts[0];
                    if (existing) {
                      setScaleLocationName(existing.locationName);
                      setScaleShortName(existing.shortName);
                      setScaleHours(existing.hours);
                      setScaleIsOffDay(Boolean(selectedDaySchedule.isOffDay));
                      setScaleDescription(selectedDaySchedule.description || '');
                    } else {
                      setScaleLocationName('Instituto da Visão e Saúde (IVS)');
                      setScaleShortName('Instituto');
                      setScaleHours('08:00 às 18:00 (Br)');
                      setScaleIsOffDay(Boolean(selectedDaySchedule.isOffDay));
                      setScaleDescription(selectedDaySchedule.description || '');
                    }
                    setIsScaleModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title="Editar escala ou turnos do Dr. Rudson Meirelles nesta data"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Ajustar Escala / Turno</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* Botão de Ação Rápida: Agendar Consulta */}
            <button
              type="button"
              onClick={() => openNewAppointmentModal(selectedDate)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-emerald-600/25 flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Agendar nova consulta ou atendimento clínico para esta data"
            >
              <CalendarPlus className="w-4 h-4 text-white" />
              <span>Agendar Consulta</span>
            </button>

            {(waitingCount > 0 || inConsultCount > 0) && (
              <button
                type="button"
                onClick={handleCompleteAllWaiting}
                className="px-3.5 py-2 bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer border border-emerald-500/50"
                title="Concluir todos os atendimentos pendentes do dia"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Concluir Fila do Dia ({waitingCount + inConsultCount})</span>
              </button>
            )}

            <button
              onClick={handleSetToday}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Ir para Hoje ({new Date().toLocaleDateString('pt-BR')})
            </button>
          </div>
        </div>
      </div>

      {/* 3. Cards de Métricas e KPIs Rápidos do Dia & Financeiro IVS */}
      <div className={`grid grid-cols-2 sm:grid-cols-2 ${canViewFinancials ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between group hover:border-blue-300 transition-all">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Agendados no Dia</span>
              <button
                type="button"
                onClick={() => openNewAppointmentModal(selectedDate)}
                className="opacity-80 group-hover:opacity-100 text-[10px] bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white px-1.5 py-0.5 rounded-md font-black transition-all cursor-pointer flex items-center gap-0.5"
                title="Agendar nova consulta para esta data"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>Agendar</span>
              </button>
            </div>
            <span className="text-2xl font-black text-slate-900 mt-0.5 block">{totalCount}</span>
          </div>
          <button
            type="button"
            onClick={() => openNewAppointmentModal(selectedDate)}
            className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all cursor-pointer shadow-2xs"
            title="Clique para agendar consulta para esta data"
          >
            <CalendarCheck className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Na Recepção</span>
            <span className="text-2xl font-black text-amber-900 mt-0.5 block">{waitingCount}</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Em Atendimento</span>
            <span className="text-2xl font-black text-emerald-900 mt-0.5 block">{inConsultCount}</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Concluídos</span>
            <span className="text-2xl font-black text-slate-900 mt-0.5 block">{completedCount}</span>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Faturamento do Dia & Acerto do Examinador (Oculto para perfil Recepção; visível apenas para Financeiro / Examinador / Admin) */}
        {canViewFinancials && (
          <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl p-4 shadow-md flex items-center justify-between col-span-2 sm:col-span-1 border border-blue-900/50">
            <div>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">
                {isIvs ? 'Atendimentos IVS (Hoje)' : 'Receita do Dia'}
              </span>
              <span className="text-xl font-black text-white mt-0.5 block">
                R$ {dayEstimatedRevenue.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-300 font-medium block mt-0.5">
                {paidConsultationsCount} pagas (R$ {consultPrice.toFixed(0)}) {freeReturnsCount > 0 && `• ${freeReturnsCount} retornos (R$ 0)`}
              </span>
            </div>
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        )}
      </div>

      {/* 4. Seletor de Abas Principais (Agenda vs Retornos) e Alternância de Visualização */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 rounded-2xl border border-slate-300/60 max-w-fit">
          <button
            type="button"
            onClick={() => setActiveMainTab('schedule')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeMainTab === 'schedule'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Agenda & Escala Trimestral</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('returns')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeMainTab === 'returns'
                ? 'bg-white text-amber-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Lembretes de Retorno ({returnReminders.length})</span>
            {returnReminders.filter(r => r.status === 'overdue' || r.status === 'due_this_week').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Alternador de Modo de Visualização (Calendário Mensal vs Lista Diária) */}
        {activeMainTab === 'schedule' && (
          <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setScheduleViewMode('month')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                scheduleViewMode === 'month'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Visão Calendário (Mês)</span>
            </button>
            <button
              type="button"
              onClick={() => setScheduleViewMode('day')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                scheduleViewMode === 'day'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>{datePeriodFilter === 'this_week' ? 'Atendimentos Desta Semana' : 'Lista de Pacientes do Dia'} ({dayAppointments.length})</span>
            </button>
          </div>
        )}
      </div>

      {activeMainTab === 'returns' ? (
        /* ABA DE LEMBRETES DE RETORNO SOLICITADOS PELO EXAMINADOR */
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200/80 rounded-3xl p-5 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
            <Bell className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-sm text-amber-950">Controle de Retornos Recomendados pelo Examinador</p>
              <p className="text-amber-800 mt-1 leading-relaxed">
                Esta lista reúne automaticamente todos os pacientes com prazo de retorno solicitado durante o atendimento clínico. Entre em contato para confirmar ou agende o retorno com 1 clique.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden divide-y divide-slate-100">
            {returnReminders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <CalendarCheck className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-bold">Nenhum lembrete de retorno pendente.</p>
              </div>
            ) : (
              returnReminders.map((reminder) => {
                const isOverdue = reminder.status === 'overdue';
                const isDueThisWeek = reminder.status === 'due_this_week';

                return (
                  <div key={reminder.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">{reminder.patientName}</span>
                        {isOverdue && (
                          <span className="px-2.5 py-0.5 bg-red-100 text-red-800 border border-red-200 rounded-full text-[10px] font-bold">
                            Vencido
                          </span>
                        )}
                        {isDueThisWeek && (
                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-[10px] font-bold">
                            Nesta Semana
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 font-medium">{reminder.instructions}</p>
                      <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-1">
                        <span>Data Alvo: <b>{new Date(reminder.targetDate).toLocaleDateString('pt-BR')}</b></span>
                        {reminder.patientPhone && <span>Tel: {reminder.patientPhone}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
                      <a
                        href={calendarIntegrationService.generateWhatsAppReturnUrl(reminder, activeClinic)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Enviar mensagem automática de retorno no WhatsApp do paciente"
                      >
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                        <span>Lembrar no WhatsApp</span>
                      </a>

                      <button
                        onClick={() => openScheduleReturnModal(reminder)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <CalendarCheck className="w-4 h-4" /> Agendar Retorno
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* ABA DA AGENDA DE CONSULTAS */
        <div className="space-y-5">
          
          {/* 1. VISÃO DE CALENDÁRIO MENSAL OFICIAL TRIMESTRAL */}
          {scheduleViewMode === 'month' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6 animate-fadeIn">
              
              {/* Header do Mês e Seletor do Trimestre */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight capitalize">
                      {monthName}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Calendário Trimestral Oficial de Atendimentos — Dr. Rudson Meirelles
                    </p>
                  </div>
                </div>

                {/* Seletor Rápido de Trimestre: Agosto, Setembro, Outubro */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
                  <button
                    onClick={() => { setCalendarMonth(8); setCalendarYear(2026); }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      calendarMonth === 8 ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Agosto 2026
                  </button>
                  <button
                    onClick={() => { setCalendarMonth(9); setCalendarYear(2026); }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      calendarMonth === 9 ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Setembro 2026
                  </button>
                  <button
                    onClick={() => { setCalendarMonth(10); setCalendarYear(2026); }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      calendarMonth === 10 ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Outubro 2026
                  </button>
                </div>
              </div>

              {/* Grid Oficial do Mês */}
              <div className="space-y-2">
                {/* Cabeçalho dos Dias da Semana */}
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-slate-500 uppercase tracking-wider py-1">
                  <div className="text-red-600">Dom</div>
                  <div>Seg</div>
                  <div>Ter</div>
                  <div>Qua</div>
                  <div>Qui</div>
                  <div>Sex</div>
                  <div>Sáb</div>
                </div>

                {/* Grade de Dias do Mês */}
                <div className="grid grid-cols-7 gap-2">
                  {/* Células vazias de alinhamento antes do dia 1 */}
                  {Array.from({ length: firstDayOfMonth }, (_, i) => (
                    <div key={`empty-${i}`} className="h-28 sm:h-32 rounded-2xl bg-slate-50/40 border border-dashed border-slate-200/50 opacity-40 p-2" />
                  ))}

                  {/* Dias do Mês (1 a totalDaysInMonth) */}
                  {Array.from({ length: totalDaysInMonth }, (_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const schedule = getEffectiveDaySchedule(dateStr);
                    // Agendamentos e eventos do dia
                    const dayApts = appointments.filter(a => getLocalDateStr(a.date) === dateStr && a.status !== 'canceled');
                    // Contagem consolidada (Agendamentos + Encounters + Pacientes do dia)
                    const dayPatIds = new Set<string>();
                    appointments.filter(a => getLocalDateStr(a.date) === dateStr).forEach(a => dayPatIds.add(a.patientId || a.id));
                    encounters.filter(e => getLocalDateStr(e.date) === dateStr).forEach(e => dayPatIds.add(e.patientId));
                    patients.filter(p => getLocalDateStr(p.createdAt) === dateStr).forEach(p => dayPatIds.add(p.id));
                    const totalDayPatients = dayPatIds.size;
                    const isSelected = selectedDate === dateStr;
                    const isTodayCell = dateStr === todayIso;

                    return (
                      <div
                        key={dateStr}
                        onClick={() => {
                          setSelectedDate(dateStr);
                          setDatePeriodFilter('day');
                          setScheduleViewMode('day');
                        }}
                        className={`h-28 sm:h-32 rounded-2xl p-2 flex flex-col justify-between transition-all cursor-pointer relative group overflow-hidden border ${
                          isSelected
                            ? 'ring-4 ring-blue-400 border-blue-600 shadow-lg scale-[1.02] z-10'
                            : 'border-slate-200 hover:border-slate-400 hover:shadow-md'
                        } ${
                          schedule.isOffDay
                            ? 'bg-rose-50/40 text-slate-700'
                            : schedule.shifts.length === 0
                            ? 'bg-white text-slate-800'
                            : 'bg-slate-50'
                        }`}
                      >
                        {/* Topo do Card: Número do Dia + Badge Hoje + Botão Rápido de Adicionar Evento */}
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-black ${
                            schedule.isOffDay ? 'text-red-600' : 'text-slate-900'
                          }`}>
                            {dayNum}
                          </span>

                          <div className="flex items-center gap-1">
                            {isTodayCell && (
                              <span className="text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase bg-amber-400 text-slate-950 shadow-xs">
                                Hoje
                              </span>
                            )}
                            {totalDayPatients > 0 && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-slate-900 text-white font-mono">
                                {totalDayPatients}p
                              </span>
                            )}
                            {canManageSchedule && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDate(dateStr);
                                  openNewAppointmentModal(dateStr);
                                }}
                                className="p-1 rounded-md bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white transition-all shadow-2xs cursor-pointer opacity-70 group-hover:opacity-100"
                                title={`Adicionar evento ou consulta no dia ${dayNum} (${dateStr})`}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Conteúdo / Locais de Atendimento Conforme Calendário Trimestral e Eventos */}
                        <div className="space-y-1 my-auto overflow-hidden">
                          {schedule.isOffDay ? (
                            <div className="text-[10px] text-red-500 font-bold text-center py-1">
                              Folga
                            </div>
                          ) : schedule.shifts.length === 0 && dayApts.length === 0 ? (
                            <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                              <span>Livre</span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {schedule.shifts.map((shift, sIdx) => (
                                <div
                                  key={sIdx}
                                  className={`rounded-lg px-1.5 py-0.5 text-[9px] font-black leading-tight shadow-xs ${shift.colorBg} ${shift.colorText}`}
                                  title={`${shift.locationName} (${shift.hours})`}
                                >
                                  <div className="truncate">{shift.shortName}</div>
                                  <div className="text-[8px] opacity-90 truncate font-mono">{shift.hours}</div>
                                </div>
                              ))}

                              {/* Eventos e Atendimentos do Dia com Ícones Vibrantes */}
                              {dayApts.slice(0, 2).map((apt, aIdx) => {
                                const badge = getEventBadgeDetails(apt.type, apt.clinicName);
                                return (
                                  <div
                                    key={`apt-${aIdx}`}
                                    className={`rounded-lg px-1.5 py-0.5 text-[8px] font-black flex items-center gap-1 border truncate shadow-2xs ${badge.bg} ${badge.text} ${badge.border}`}
                                    title={`${badge.icon} ${apt.patientName} (${apt.time})`}
                                  >
                                    <span className="shrink-0">{badge.icon}</span>
                                    <span className="truncate">{apt.patientName}</span>
                                  </div>
                                );
                              })}
                              {dayApts.length > 2 && (
                                <div className="text-[8px] text-purple-700 font-extrabold px-1">
                                  +{dayApts.length - 2} evento(s)
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Rodapé do Card: Contagem Real em Tempo Real */}
                        <div className="text-[8px] text-slate-500 font-bold truncate">
                          {totalDayPatients > 0 
                            ? `${totalDayPatients} ${totalDayPatients === 1 ? 'consulta/paciente' : 'consultas/pacientes'}` 
                            : schedule.shifts.length > 0 
                            ? schedule.shifts[0].shortName 
                            : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legenda Oficial do Rodapé (Idêntica ao Calendário Trimestral) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                  LEGENDA OFICIAL DA ESCALA MÉDICA (DR. RUDSON MEIRELLES)
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                  {/* 1. Instituto */}
                  <div className="flex items-center gap-2 bg-blue-600 text-white p-2.5 rounded-xl shadow-xs">
                    <span className="w-3 h-3 rounded-full bg-white shrink-0" />
                    <div>
                      <span className="font-black block text-[11px]">Segundas e Terças</span>
                      <span className="text-[10px] text-blue-100">Instituto: 08:00 às 18:00 (Br)</span>
                    </div>
                  </div>

                  {/* 2. Clínica Central */}
                  <div className="flex items-center gap-2 bg-cyan-500 text-slate-950 p-2.5 rounded-xl shadow-xs">
                    <span className="w-3 h-3 rounded-full bg-slate-950 shrink-0" />
                    <div>
                      <span className="font-black block text-[11px]">Quarta (Turno 1)</span>
                      <span className="text-[10px] text-slate-900">Clínica Central: 13:00 às 15:45 (Py)</span>
                    </div>
                  </div>

                  {/* 3. Clínica Visual */}
                  <div className="flex items-center gap-2 bg-rose-500 text-white p-2.5 rounded-xl shadow-xs">
                    <span className="w-3 h-3 rounded-full bg-white shrink-0" />
                    <div>
                      <span className="font-black block text-[11px]">Quarta (Turno 2)</span>
                      <span className="text-[10px] text-rose-100">Clínica Visual: 16:00 às 17:30 (Py)</span>
                    </div>
                  </div>

                  {/* 4. Hospital Santa Rosa PY */}
                  <div className="flex items-center gap-2 bg-slate-700 text-white p-2.5 rounded-xl shadow-xs">
                    <span className="w-3 h-3 rounded-full bg-slate-400 shrink-0" />
                    <div>
                      <span className="font-black block text-[11px]">Quintas e Sextas (Escala)</span>
                      <span className="text-[10px] text-slate-200">Santa Rosa PY: Dia Inteiro</span>
                    </div>
                  </div>

                  {/* 5. Mega Star */}
                  <div className="flex items-center gap-2 bg-emerald-600 text-white p-2.5 rounded-xl shadow-xs">
                    <span className="w-3 h-3 rounded-full bg-white shrink-0" />
                    <div>
                      <span className="font-black block text-[11px]">Último Sábado do Mês</span>
                      <span className="text-[10px] text-emerald-100">Mega Star: 07:30 às 14:00</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão de Atalho para Abrir Lista do Dia Selecionado */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  Data selecionada: <b>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</b>
                </span>
                <button
                  type="button"
                  onClick={() => setScheduleViewMode('day')}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Ver Atendimentos deste Dia</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* 2. VISÃO DE LISTA DE ATENDIMENTOS DO DIA */}
          {/* Barra de Navegação por Data e Filtros */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            {/* Navegador de Data */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDateChange(-1)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="Dia Anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    const [y, m] = e.target.value.split('-').map(Number);
                    setCalendarMonth(m);
                    setCalendarYear(y);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                />

                {/* Seletor de Período Rápido: Dia / Esta Semana / Todos */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setDatePeriodFilter('day')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      datePeriodFilter === 'day'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Dia
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDatePeriodFilter('this_week');
                      setFilterStatus('ALL');
                    }}
                    className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      datePeriodFilter === 'this_week' && filterStatus === 'ALL'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-blue-700 hover:bg-blue-50'
                    }`}
                    title="Exibir todos os pacientes atendidos nesta semana"
                  >
                    <span>⭐ Esta Semana ({dayAppointments.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDatePeriodFilter('this_week');
                      setFilterStatus('completed');
                    }}
                    className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      datePeriodFilter === 'this_week' && filterStatus === 'completed'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                    title="Exibir apenas consultas já realizadas e concluídas nesta semana"
                  >
                    <span>✅ Consultas Realizadas ({dayAppointments.filter(a => a.status === 'completed').length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDatePeriodFilter('all');
                      setFilterStatus('ALL');
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      datePeriodFilter === 'all'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos
                  </button>
                </div>

                {!isToday && (
                  <button
                    onClick={handleSetToday}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Ir para Hoje
                  </button>
                )}

                {selectedDate !== '2026-09-12' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate('2026-09-12');
                      setDatePeriodFilter('day');
                      setCalendarMonth(9);
                      setCalendarYear(2026);
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                    title="Ir para a agenda oficial de 12/09/2026"
                  >
                    <span>📅 Ver Sábado (12/09/2026)</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => handleDateChange(1)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="Próximo Dia"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Busca e Filtro de Status */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar paciente agendado..."
                  className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 w-48 sm:w-60 font-medium"
                />
              </div>

              {/* Filtro Multi-Clínica do Examinador */}
              {isRestrictedUser ? (
                <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl px-3 py-1.5 text-xs font-bold text-blue-900 flex items-center gap-1.5 shadow-xs">
                  <span>🏥 {offlineDb.getClinics().find(c => c.id === userClinicId)?.name || 'Esta Unidade'}</span>
                </div>
              ) : (
                <select
                  value={clinicFilter}
                  onChange={(e) => setClinicFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                  title="Filtrar por unidade do Dr. Meirelles ou ver todas sincronizadas"
                >
                  <option value="CURRENT">🏥 Esta Unidade ({activeClinic.name})</option>
                  <option value="ALL">🌐 Todas as Unidades (Dr. Meirelles)</option>
                  {offlineDb.getClinics().map(c => (
                    <option key={c.id} value={c.id}>
                      🏥 {c.name}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">Todos os Status</option>
                <option value="waiting">Na Recepção (Aguardando)</option>
                <option value="in_consultation">Em Atendimento</option>
                <option value="scheduled">Agendados</option>
                <option value="completed">Concluídos</option>
              </select>

              {/* Botão de Filtro Rápido: Fora do Período Contratado */}
              <button
                type="button"
                onClick={() => setFilterOutOfContract(!filterOutOfContract)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  filterOutOfContract
                    ? 'bg-amber-600 text-white shadow-amber-600/30 ring-2 ring-amber-400'
                    : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                }`}
                title="Filtrar apenas consultas atendidas fora do período contratado (IVS Terça 13h-18h / Quarta 08h-12h ou Avulsos)"
              >
                <ClockAlert className={`w-3.5 h-3.5 ${filterOutOfContract ? 'text-white' : 'text-amber-700'}`} />
                <span>Fora do Contrato</span>
                {outOfContractCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    filterOutOfContract ? 'bg-amber-800 text-white' : 'bg-amber-200 text-amber-950'
                  }`}>
                    {outOfContractCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Feedback de Busca Ativa */}
          {searchQuery.trim() && (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2.5 rounded-2xl text-xs flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Buscando em <b>todos os pacientes cadastrados e agendamentos</b> por: <b>"{searchQuery}"</b> — {filteredAppointments.length} encontrado(s).
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
              >
                Limpar busca
              </button>
            </div>
          )}

          {/* Card de Ação Rápida da Recepção: "O QUE PRECISO FAZER AGORA?" */}
          {nextReceptionPatient && (
            <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-md border border-blue-500/30 flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center gap-3.5 w-full md:w-auto">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0 shadow-inner">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-wider">
                      O QUE PRECISO FAZER AGORA?
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono text-xs font-bold">
                      {nextReceptionPatient.ticketNumber || 'P-01'} • {nextReceptionPatient.time}
                    </span>
                    {nextReceptionPatient.isPriority && (
                      <span className="px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 text-[10px] font-black uppercase">
                        Prioridade Legal
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black tracking-tight text-white mt-0.5">
                    {nextReceptionPatient.patientName}
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">
                    {nextReceptionPatient.status === 'scheduled' || nextReceptionPatient.status === 'confirmed'
                      ? 'Paciente agendado: realize o Check-in com 1 clique para transferi-lo à fila do examinador.'
                      : 'Paciente já em espera: anuncie no painel da TV ou acesse seu cadastro.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto justify-end shrink-0">
                {(nextReceptionPatient.status === 'scheduled' || nextReceptionPatient.status === 'confirmed') && (
                  <button
                    type="button"
                    onClick={() => {
                      setCheckInTargetAppointment(nextReceptionPatient);
                      setIsCheckInModalOpen(true);
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-emerald-500/30 transition-all active:scale-95 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4 text-white" />
                    <span>Fazer Check-In Agora</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const ticketNum = nextReceptionPatient.ticketNumber || 'P-01';
                    lanController.callPatient({
                      ticketNumber: ticketNum,
                      patientName: nextReceptionPatient.patientName,
                      roomName: nextReceptionPatient.room || 'Consultório 1',
                      examinerName: nextReceptionPatient.examinerName || 'Dr. Rudson Meirelles',
                      priority: nextReceptionPatient.isPriority
                    });
                  }}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Bell className="w-4 h-4 text-slate-950" />
                  <span>Chamar TV</span>
                </button>
              </div>
            </div>
          )}

          {/* Lista de Atendimentos */}
          <div className="space-y-3">
            {filteredAppointments.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-slate-200/80 text-center text-slate-500 space-y-4 shadow-xs">
                <div className="w-14 h-14 mx-auto bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                  <CalendarIcon className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="font-black text-base text-slate-800">
                    {searchQuery.trim()
                      ? `Nenhum registro para "${searchQuery}" nesta agenda.`
                      : 'Nenhum atendimento agendado para esta data.'}
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {searchQuery.trim()
                      ? 'O paciente ainda não possui horário agendado ou prontuário hoje. Deseja realizar o cadastro e agendá-lo agora?'
                      : 'Você pode incluir um novo agendamento rápido ou selecionar um paciente cadastrado.'}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                  {datePeriodFilter === 'day' && (
                    <button
                      type="button"
                      onClick={() => setDatePeriodFilter('this_week')}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <span>⭐ Ver Consultas Desta Semana ({appointments.filter(a => a.date && a.date >= '2026-09-05' && a.date <= '2026-09-19').length})</span>
                    </button>
                  )}
                  {canManageSchedule && (
                    searchQuery.trim() ? (
                      <button
                        type="button"
                        onClick={() => {
                          openNewAppointmentModal(selectedDate);
                          setQuickPatientName(searchQuery.trim());
                          setBookingMode('quick');
                        }}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-sm hover:shadow flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Cadastrar e Agendar "{searchQuery.trim()}"</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openNewAppointmentModal(selectedDate)}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-sm hover:shadow flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Agendar Novo Atendimento / Evento</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            ) : (
               filteredAppointments.map((apt) => {
                const isWaiting = apt.status === 'waiting';
                const isInConsult = apt.status === 'in_consultation';
                const ticketNum = apt.ticketNumber || `P-${String(dayAppointments.indexOf(apt) + 1).padStart(2, '0')}`;

                return (
                  <div
                    key={apt.id}
                    className={`group bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs hover:shadow-md ${
                      isInConsult
                        ? 'border-emerald-500/80 ring-2 ring-emerald-500/20 bg-gradient-to-r from-emerald-50/40 via-white to-white'
                        : isWaiting
                        ? 'border-amber-400/80 ring-2 ring-amber-500/15 bg-gradient-to-r from-amber-50/30 via-white to-white'
                        : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    {/* Bloco Esquerdo: Horário + Senha + Dados Clínicos */}
                    <div className="flex items-start sm:items-center gap-3.5 sm:gap-4.5 min-w-0">
                      {/* Horário & Senha em Bloco Integrado Moderno */}
                      <div className="flex flex-col items-center justify-center shrink-0">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center font-mono shadow-inner relative overflow-hidden group-hover:bg-slate-800 transition-colors">
                          <div className="flex items-center gap-1 text-[10px] text-sky-400 font-semibold uppercase tracking-wider mb-0.5">
                            <Clock className="w-3 h-3 text-sky-400" />
                          </div>
                          <span className="font-extrabold text-sm sm:text-base tracking-tight">{apt.time}</span>
                        </div>
                        <span className="mt-1.5 inline-flex items-center gap-1 font-mono font-black text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                          <span className="text-[9px] text-amber-700 font-bold">SENHA</span>
                          <span className="text-amber-900 font-extrabold">{ticketNum}</span>
                        </span>
                      </div>

                      {/* Informações Principais do Paciente */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        {/* Linha 1: Nome do Paciente e Badges Principais */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight hover:text-blue-700 transition-colors">
                            {apt.patientName}
                          </span>

                          {apt.clinicName && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/70 inline-flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-indigo-500" />
                              <span>{apt.clinicName}</span>
                            </span>
                          )}

                          {apt.date && apt.date !== selectedDate && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                              📅 {apt.date.split('-').reverse().join('/')}
                            </span>
                          )}

                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/60 inline-flex items-center gap-1">
                            {apt.patientNationality === 'PY' ? '🇵🇾 PY' : '🇧🇷 BR'}
                          </span>

                          {/* Tipo de Atendimento / Procedimento sem repetir o nome da clínica */}
                          {(() => {
                            const badge = getEventBadgeDetails(apt.type);
                            // Não exibe se o label for idêntico à clínica já mostrada
                            if (badge.label === apt.clinicName) return null;
                            return (
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 shadow-2xs ${badge.bg} ${badge.text} ${badge.border}`}>
                                <span>{badge.icon}</span>
                                <span>{badge.label}</span>
                              </span>
                            );
                          })()}

                          {getStatusBadge(apt.status)}

                          {/* Badge de Horário Contratual / Fora do Período / Negociado */}
                          {(() => {
                            const contractCheck = isAppointmentOutOfContract(apt, activeClinic.id);
                            if (contractCheck.isOutOfContract) {
                              return (
                                <span
                                  className="text-[11px] font-black px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 shadow-2xs bg-amber-50 text-amber-900 border-amber-300"
                                  title={`${contractCheck.reason}${apt.contractPeriodNotes ? ` • Obs: ${apt.contractPeriodNotes}` : ''}`}
                                >
                                  <ClockAlert className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>{contractCheck.label}</span>
                                </span>
                              );
                            }
                            if (contractCheck.isNegotiatedPeriod) {
                              return (
                                <span
                                  className="text-[11px] font-black px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 shadow-2xs bg-purple-50 text-purple-900 border-purple-200"
                                  title={contractCheck.reason}
                                >
                                  <Sparkles className="w-3 h-3 text-purple-600 shrink-0" />
                                  <span>{contractCheck.label}</span>
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        {/* Linha 2: Contato, Examinador e Sala */}
                        <div className="text-xs text-slate-500 flex items-center gap-3 sm:gap-4 font-medium flex-wrap">
                          {apt.patientPhone && (
                            <a
                              href={`tel:${apt.patientPhone}`}
                              className="inline-flex items-center gap-1.5 font-mono text-slate-700 hover:text-emerald-600 transition-colors"
                              title="Ligar para o paciente"
                            >
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-semibold">{apt.patientPhone}</span>
                            </a>
                          )}
                          <span className="inline-flex items-center gap-1.5 text-slate-600">
                            <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                            <span>{apt.examinerName}</span>
                          </span>
                          {apt.room && (
                            <span className="text-[11px] text-slate-400 font-medium">
                              • {apt.room}
                            </span>
                          )}
                        </div>

                        {/* Linha 3: Observações Clínicas/Recepção */}
                        {apt.notes && (
                          <div className="inline-flex items-baseline gap-1.5 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/70 transition-colors max-w-xl">
                            <span className="font-bold text-slate-700 shrink-0 text-[11px] uppercase tracking-wider">Obs:</span>
                            <span className="text-slate-600 truncate">{apt.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bloco Direito: Barra de Ferramentas e Ações Clínicas / Recepção com Disposição Otimizada */}
                    <div className="flex items-center justify-end gap-1.5 sm:gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0 flex-wrap">
                      
                      {/* Grupo 1: Comunicação Rápida (Chamar TV + WhatsApp) */}
                      <div className="flex items-center gap-1.5">
                        {/* Botão Chamar Senha na TV */}
                        <button
                          type="button"
                          onClick={() => {
                            lanController.callPatient({
                              ticketNumber: ticketNum,
                              patientName: apt.patientName,
                              roomName: apt.room || 'Consultório 1',
                              examinerName: apt.examinerName || 'Dr. Rudson Meirelles',
                              priority: apt.isPriority
                            });
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                          title="Chamar senha e nome do paciente no telão da TV com som"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>Chamar TV</span>
                        </button>

                        {/* Botão WhatsApp */}
                        <a
                          href={calendarIntegrationService.generateWhatsAppAppointmentUrl(apt, activeClinic)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 sm:px-2.5 sm:py-1.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Enviar lembrete e confirmação de agendamento no WhatsApp do paciente"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden xl:inline">WhatsApp</span>
                        </a>
                      </div>

                      {/* Grupo 2: Integração de Calendário (Google Agenda + Download .ics) */}
                      <div className="inline-flex items-center rounded-xl border border-slate-200/80 bg-slate-50/70 p-0.5">
                        <a
                          href={calendarIntegrationService.generateGoogleCalendarUrl(apt, activeClinic)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 sm:px-2 sm:py-1 text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                          title="Sincronizar no Google Agenda"
                        >
                          <CalendarPlus className="w-3.5 h-3.5 text-blue-500" />
                          <span className="hidden 2xl:inline">Google</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => calendarIntegrationService.downloadICalFile(apt, activeClinic)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg text-xs transition-all cursor-pointer"
                          title="Baixar arquivo de calendário (.ics)"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Grupo 3: Cadastro e Gestão */}
                      <div className="inline-flex items-center rounded-xl border border-slate-200/80 bg-slate-50/70 p-0.5">
                        {/* Botão Dados / Cadastro */}
                        <button
                          type="button"
                          onClick={(e) => openCompleteModal(apt, e)}
                          className="px-2 py-1 text-slate-700 hover:text-blue-700 hover:bg-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                          title="Completar ou verificar dados cadastrais (CPF/CI, nascimento, endereço)"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                          <span className="hidden sm:inline">Cadastro</span>
                        </button>

                        {/* Ações de Edição e Exclusão */}
                        {canManageSchedule && (
                          <>
                            {/* Botão / Ícone de Seleção Rápida de Fora do Período Contratado */}
                            {(() => {
                              const contractCheck = isAppointmentOutOfContract(apt, activeClinic.id);
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleOutOfContractPeriod(apt, e)}
                                  className={`p-1.5 sm:px-2 sm:py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-bold text-xs ${
                                    contractCheck.isOutOfContract
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs hover:bg-amber-200'
                                      : 'text-slate-400 hover:text-amber-700 hover:bg-amber-50'
                                  }`}
                                  title={
                                    contractCheck.isOutOfContract
                                      ? `Consulta marcada como FORA DO PERÍODO CONTRATADO (${contractCheck.reason}). Clique para desmarcar.`
                                      : 'Marcar consulta como ATENDIDA FORA DO PERÍODO CONTRATADO (Avulso / Extraordinário negociado)'
                                  }
                                >
                                  <ClockAlert className={`w-3.5 h-3.5 ${contractCheck.isOutOfContract ? 'text-amber-700' : 'text-slate-400'}`} />
                                  <span className="hidden xl:inline">
                                    {contractCheck.isOutOfContract ? 'Fora Contrato' : 'Contratado'}
                                  </span>
                                </button>
                              );
                            })()}

                            <button
                              type="button"
                              onClick={(e) => openEditAppointmentModal(apt, e)}
                              className="p-1.5 sm:px-2 sm:py-1 text-slate-600 hover:text-blue-700 hover:bg-white rounded-lg transition-all cursor-pointer flex items-center gap-1 font-bold text-xs"
                              title="Editar agendamento"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                              <span className="hidden xl:inline">Editar</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteAppointment(apt, e)}
                              className="p-1.5 sm:px-2 sm:py-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-bold text-xs"
                              title="Excluir agendamento"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span className="hidden xl:inline">Excluir</span>
                            </button>
                          </>
                        )}
                      </div>

                      {/* Grupo 4: Ações Exclusivas de Perfil (Recepção vs Examinador) */}
                      {currentUser.role === 'reception' && (
                        <div className="flex items-center gap-1.5">
                          {(apt.status === 'scheduled' || apt.status === 'confirmed') && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCheckInTargetAppointment(apt);
                                setIsCheckInModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                              title="Fazer Check-in do Paciente e Inserir na Fila de Espera"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-white" />
                              <span>Check-In</span>
                            </button>
                          )}
                          {(apt.status === 'checked_in' || apt.status === 'waiting') && (
                            <span className="text-xs text-amber-800 font-bold bg-amber-100/70 px-2.5 py-1 rounded-xl border border-amber-300">
                              Na Espera ({apt.ticketNumber || 'P-01'})
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              let p = patients.find(pat => pat.id === apt.patientId);
                              if (!p) {
                                p = {
                                  id: apt.patientId || generateUUID(),
                                  fullName: apt.patientName,
                                  birthDate: '',
                                  nationality: apt.patientNationality || 'BR',
                                  documentType: apt.patientNationality === 'PY' ? 'CI_PY' : 'CPF',
                                  documentNumber: apt.patientDocument,
                                  phoneCountryCode: apt.patientNationality === 'PY' ? '+595' : '+55',
                                  phone: apt.patientPhone,
                                  notes: apt.notes,
                                  lgpdConsent: true,
                                  createdAt: new Date().toISOString(),
                                  updatedAt: new Date().toISOString()
                                };
                                offlineDb.savePatient(p);
                              }
                              const existingEnc = encounters.find(e => e.patientId === p!.id && getLocalDateStr(e.date) === (apt.date || selectedDate)) ||
                                                  encounters.find(e => e.patientId === p!.id);
                              onStartEncounter(p, existingEnc);
                            }}
                            className="p-1.5 sm:px-2.5 sm:py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Visualizar refração e imprimir receituário do paciente"
                          >
                            <Glasses className="w-3.5 h-3.5 text-blue-600" />
                            <span className="hidden sm:inline">Receita</span>
                          </button>
                        </div>
                      )}

                      {/* Grupo 5: Alteração Rápida de Status */}
                      {(apt.status === 'scheduled' || apt.status === 'in_consultation' || apt.status === 'waiting' || apt.status === 'checked_in') && (
                        <div className="inline-flex items-center rounded-xl border border-slate-200/80 bg-slate-50/70 p-0.5">
                          {apt.status === 'scheduled' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(apt.id, 'confirmed');
                              }}
                              className="px-2 py-1 text-blue-700 hover:bg-blue-100/70 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="Confirmar presença / agendamento"
                            >
                              <Check className="w-3.5 h-3.5 text-blue-600" />
                              <span className="hidden sm:inline">Confirmar</span>
                            </button>
                          )}

                          {(apt.status === 'in_consultation' || apt.status === 'waiting' || apt.status === 'checked_in') && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(apt.id, 'completed');
                              }}
                              className="px-2 py-1 text-emerald-700 hover:bg-emerald-100/70 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="Concluir consulta na agenda"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="hidden sm:inline">Concluir</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Deseja cancelar o agendamento de "${apt.patientName}"?`)) {
                                handleStatusChange(apt.id, 'canceled');
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            title="Cancelar agendamento"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Grupo 6: Ação Principal de Atendimento */}
                      {currentUser.role !== 'reception' && (
                        <button
                          onClick={() => handleCallPatient(apt)}
                          className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Atender</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal de Novo Agendamento */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 text-slate-900 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2 text-blue-600 font-black">
                <CalendarIcon className="w-5 h-5" />
                <span>{editingAppointmentId ? 'EDITAR AGENDAMENTO DE CONSULTA' : 'NOVO AGENDAMENTO DE CONSULTA'}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNewModalOpen(false);
                  setEditingAppointmentId(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alternador entre Consulta Rápida, Paciente Cadastrado e Evento da Agenda */}
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-4 text-xs font-bold gap-1">
              <button
                type="button"
                onClick={() => setBookingMode('quick')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                  bookingMode === 'quick' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⚡ Consulta Rápida
              </button>
              <button
                type="button"
                onClick={() => setBookingMode('existing')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                  bookingMode === 'existing' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👤 Paciente Cadastrado
              </button>
              <button
                type="button"
                onClick={() => setBookingMode('event')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                  bookingMode === 'event' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📅 Evento / Compromisso
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-4 text-xs">
              {conflictWarning && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 flex items-start gap-2.5 animate-fadeIn">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-black text-xs block">Bloqueio de Duplicidade de Compromisso</span>
                    <p className="text-[11px] leading-relaxed font-medium">{conflictWarning}</p>
                    <span className="text-[10px] text-amber-800 block">
                      💡 Selecione outro horário ou verifique a agenda do Dr. Meirelles nas demais unidades.
                    </span>
                  </div>
                </div>
              )}

              {/* Clínica de Atendimento (Suporte Multi-Clínica do Dr. Rudson Meirelles) */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 block">CLÍNICA / UNIDADE DE ATENDIMENTO *</label>
                  {canManageSchedule && (
                    <button
                      type="button"
                      onClick={() => setIsNewClinicModalOpen(true)}
                      className="text-[11px] font-extrabold text-blue-700 hover:text-blue-900 bg-blue-100/70 hover:bg-blue-200/80 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                      title="Cadastrar uma nova clínica ou consultório parceiro"
                    >
                      <Plus className="w-3 h-3 text-blue-700" />
                      <span>+ Nova Clínica</span>
                    </button>
                  )}
                </div>
                {isRestrictedUser ? (
                  <div className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>🏥 {offlineDb.getClinics().find(c => c.id === userClinicId)?.name || 'Esta Unidade'}</span>
                    <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-bold border border-blue-100">
                      Unidade Fixa
                    </span>
                  </div>
                ) : (
                  <select
                    value={targetBookingClinicId}
                    onChange={(e) => {
                      if (e.target.value === '__add_new_clinic__') {
                        setIsNewClinicModalOpen(true);
                      } else {
                        setTargetBookingClinicId(e.target.value);
                      }
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {offlineDb.getClinics().map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.country === 'Paraguai' ? '🇵🇾' : '🇧🇷'} {c.city || c.country})
                      </option>
                    ))}
                    {canManageSchedule && (
                      <option value="__add_new_clinic__" className="text-blue-700 font-extrabold">
                        ➕ [Cadastrar Nova Clínica / Unidade...]
                      </option>
                    )}
                  </select>
                )}
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {isRestrictedUser ? 'Agendamento vinculado ao seu consultório oficial' : 'Permite agendar diretamente para qualquer clínica onde o Dr. Meirelles atende'}
                </span>
              </div>

              {/* Data da Consulta / Evento */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <label className="font-bold text-slate-700 block mb-1">DATA DO EVENTO / CONSULTA *</label>
                <input
                  type="date"
                  required
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                />
              </div>

              {bookingMode === 'event' ? (
                <div className="space-y-3 bg-purple-50/60 p-4 rounded-2xl border border-purple-100">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 text-xs">Compromisso / Bloqueio na Agenda</span>
                    <span className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-bold">
                      Dr. Rudson Meirelles
                    </span>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">TÍTULO DO EVENTO OU MOTIVO DO BLOQUEIO *</label>
                    <input
                      type="text"
                      required
                      value={quickPatientName}
                      onChange={(e) => setQuickPatientName(e.target.value)}
                      placeholder="Ex: Cirurgias Manhã, Reunião de Equipe, Plantão Santa Rosa, Folga, Congresso..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">LOCAL OU DETALHE</label>
                      <input
                        type="text"
                        value={quickPatientPhone}
                        onChange={(e) => setQuickPatientPhone(e.target.value)}
                        placeholder="Ex: Sala de Procedimentos, Auditório..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">CATEGORIA / ÍCONE DO EVENTO</label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-500 cursor-pointer"
                      >
                        <option value="urgencia">🚨 Cirurgia / Procedimento Cirúrgico</option>
                        <option value="consulta_geral">📋 Reunião / Compromisso Profissional</option>
                        <option value="refrativo">🏥 Plantão / Atendimento em Nova Clínica</option>
                        <option value="retorno">🏖️ Folga / Ausência Programada</option>
                        <option value="baixa_visao">🔒 Bloqueio de Horário / Particular</option>
                        <option value="pediatrico">🔬 Procedimento Ambulatorial / Exame</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : bookingMode === 'quick' ? (
                <div className="space-y-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900 text-xs">Dados Rápidos do Paciente</span>
                    <span className="text-[10px] text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-bold">
                      Preenchimento completo na chegada
                    </span>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">NOME COMPLETO *</label>
                    <input
                      type="text"
                      required
                      value={quickPatientName}
                      onChange={(e) => setQuickPatientName(e.target.value)}
                      placeholder="Ex: João da Silva ou María González"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">TELEFONE / WHATSAPP</label>
                      <input
                        type="text"
                        value={quickPatientPhone}
                        onChange={(e) => setQuickPatientPhone(e.target.value)}
                        placeholder="Ex: (45) 99999-9999"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">PAÍS / NACIONALIDADE</label>
                      <select
                        value={quickPatientNationality}
                        onChange={(e) => setQuickPatientNationality(e.target.value as NationalityType)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="BR">🇧🇷 Brasil (+55)</option>
                        <option value="PY">🇵🇾 Paraguai (+595)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 block">SELECIONE O PACIENTE *</label>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {patients.length} pacientes cadastrados
                    </span>
                  </div>

                  {/* Campo de Busca Rápida de Pacientes Cadastrados */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={patientFilterQuery}
                      onChange={(e) => setPatientFilterQuery(e.target.value)}
                      placeholder="Filtrar por nome, telefone ou documento..."
                      className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {(() => {
                    const filteredList = patients.filter(p => {
                      if (!patientFilterQuery.trim()) return true;
                      const q = patientFilterQuery.toLowerCase();
                      const pName = (p.fullName || '').toLowerCase();
                      return pName.includes(q) ||
                             (p.phone && p.phone.includes(q)) ||
                             (p.documentNumber && p.documentNumber.includes(q));
                    });

                    if (filteredList.length === 0 && patientFilterQuery.trim()) {
                      return (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-center animate-fadeIn">
                          <p className="text-[11px] font-bold text-amber-900">
                            Nenhum paciente cadastrado encontrado para "{patientFilterQuery}".
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickPatientName(patientFilterQuery.trim());
                              setBookingMode('quick');
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Cadastrar como Novo Paciente "{patientFilterQuery}"</span>
                          </button>
                        </div>
                      );
                    }

                    return (
                      <select
                        required
                        value={selectedPatientId}
                        onChange={(e) => setSelectedPatientId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="" disabled>Selecione um paciente cadastrado...</option>
                        {filteredList.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.fullName} ({p.nationality === 'PY' ? '🇵🇾' : '🇧🇷'}) {p.phone ? `• Tel: ${p.phone}` : ''}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">HORÁRIO *</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setNewTime(adjustTimeByMinutes(newTime, -3))}
                        className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer"
                        title="Subtrair 3 minutos"
                      >
                        -3m
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewTime(adjustTimeByMinutes(newTime, 3))}
                        className="px-1.5 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer"
                        title="Adicionar 3 minutos"
                      >
                        +3m
                      </button>
                    </div>
                  </div>
                  <input
                    type="time"
                    step="180"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {['08:00', '08:30', '09:00', '10:30', '13:30', '14:00', '15:30', '16:00'].map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setNewTime(slot)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                          newTime === slot
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Intervalo ágil de 3 em 3 minutos</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">TIPO DE CONSULTA</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="refrativo">Refração & Grau</option>
                    <option value="consulta_geral">Consulta Geral</option>
                    <option value="retorno">Retorno</option>
                    <option value="pediatrico">Pediátrico</option>
                    <option value="baixa_visao">Baixa Visão</option>
                    <option value="urgencia">Urgência</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">EXAMINADOR RESPONSÁVEL</label>
                <input
                  type="text"
                  value={newExaminerName}
                  onChange={(e) => setNewExaminerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>



              {/* Seleção de Atendimento Fora do Período Contratado / Negociado */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="isOutOfContractPeriodCheck"
                    checked={newIsOutOfContractPeriod}
                    onChange={(e) => setNewIsOutOfContractPeriod(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded mt-0.5 cursor-pointer accent-amber-600"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="isOutOfContractPeriodCheck"
                      className="font-bold text-amber-950 text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <ClockAlert className="w-3.5 h-3.5 text-amber-700" />
                      <span>Atendimento fora do período contratado (Avulso / Hora Extra / Negociado)</span>
                    </label>
                    <p className="text-[10px] text-amber-800 font-medium mt-0.5">
                      Contrato oficial IVS: <b>Terça-feira (13:00 às 18:00)</b> e <b>Quarta-feira (08:00 às 12:00)</b>. 
                      Marque esta opção caso a consulta ocorra fora desse expediente ou seja combinada em dia negociado por período.
                    </p>
                  </div>
                </div>

                {newIsOutOfContractPeriod && (
                  <div className="pt-2 border-t border-amber-200/60">
                    <label className="font-bold text-[11px] text-amber-900 block mb-1">
                      JUSTIFICATIVA / DETALHES DO PERÍODO NEGOCIADO (OPCIONAL)
                    </label>
                    <input
                      type="text"
                      value={newContractPeriodNotes}
                      onChange={(e) => setNewContractPeriodNotes(e.target.value)}
                      placeholder="Ex: Mutirão extraordinário, acordo de encaixe, atendimento pós-escala..."
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-amber-950 focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">OBSERVAÇÕES DO AGENDAMENTO</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Queixa rápida, indicação ou motivo do agendamento..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewModalOpen(false);
                    setEditingAppointmentId(null);
                    setConflictWarning(null);
                    setConflictWarningIsWarning(false);
                  }}
                  className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 font-bold rounded-xl shadow-md active:scale-95 transition-transform cursor-pointer ${
                    conflictWarningIsWarning 
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20' 
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                  }`}
                >
                  {conflictWarningIsWarning 
                    ? 'Confirmar Agendamento Mesmo com Aviso' 
                    : (editingAppointmentId ? 'Salvar Alterações' : 'Confirmar Agendamento')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Ajuste de Escala / Eventos Oficiais do Calendário (Dr. Rudson Meirelles) */}
      {isScaleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 text-slate-900 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2 text-blue-700 font-black">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>AJUSTAR ESCALA / TURNO DA AGENDA (DR. RUDSON MEIRELLES)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsScaleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (scaleIsOffDay) {
                  saveCustomShiftOverride(scaleEditDate, {
                    date: scaleEditDate,
                    isOffDay: true,
                    description: scaleDescription.trim() || 'Folga / Sem Atendimento Externo',
                    shifts: []
                  });
                } else {
                  const matched = offlineDb.getClinics().find(c => c.name === scaleShortName || c.name === scaleLocationName);
                  const isCentral = scaleShortName.toLowerCase().includes('central');
                  const isVisual = scaleShortName.toLowerCase().includes('visual');
                  const isSanta = scaleShortName.toLowerCase().includes('santa');
                  const isMega = scaleShortName.toLowerCase().includes('mega');
                  const isStillo = scaleShortName.toLowerCase().includes('stillo');

                  saveCustomShiftOverride(scaleEditDate, {
                    date: scaleEditDate,
                    isOffDay: false,
                    shifts: [
                      {
                        locationName: scaleLocationName.trim(),
                        shortName: scaleShortName.trim(),
                        hours: scaleHours.trim(),
                        colorBg: isCentral
                          ? 'bg-cyan-500 hover:bg-cyan-600'
                          : isVisual
                          ? 'bg-rose-500 hover:bg-rose-600'
                          : isSanta
                          ? 'bg-slate-700 hover:bg-slate-800'
                          : isMega
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : isStillo
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : matched?.primaryColor
                          ? 'bg-indigo-600 hover:bg-indigo-700'
                          : 'bg-blue-600 hover:bg-blue-700',
                        colorBorder: 'border-slate-700',
                        colorText: isCentral ? 'text-slate-950' : 'text-white',
                        badgeBg: 'bg-black/30',
                        badgeText: 'text-white',
                        customColor: matched?.primaryColor
                      }
                    ]
                  });
                }
                setCustomShiftsTick(t => t + 1);
                setIsScaleModalOpen(false);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="font-bold text-slate-700 block mb-1">DATA DA ESCALA</label>
                <input
                  type="date"
                  value={scaleEditDate}
                  onChange={(e) => setScaleEditDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <input
                  type="checkbox"
                  id="scaleOffDayCheck"
                  checked={scaleIsOffDay}
                  onChange={(e) => setScaleIsOffDay(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="scaleOffDayCheck" className="font-bold text-slate-800 cursor-pointer">
                  Marcar este dia como Folga / Sem Atendimento
                </label>
              </div>

              {!scaleIsOffDay && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 block">LOCAL / UNIDADE DE ATENDIMENTO</label>
                      <button
                        type="button"
                        onClick={() => setIsNewClinicModalOpen(true)}
                        className="text-[11px] font-extrabold text-blue-700 hover:text-blue-900 bg-blue-100/70 hover:bg-blue-200/80 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        title="Cadastrar uma nova clínica para incluir na escala"
                      >
                        <Plus className="w-3 h-3 text-blue-700" />
                        <span>+ Nova Clínica</span>
                      </button>
                    </div>
                    <select
                      value={scaleShortName}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__add_new_clinic__') {
                          setIsNewClinicModalOpen(true);
                          return;
                        }
                        setScaleShortName(val);
                        if (val === 'Instituto') {
                          setScaleLocationName('Instituto da Visão e Saúde (IVS)');
                          setScaleHours('08:00 às 18:00 (Br)');
                        } else if (val === 'Clínica Central') {
                          setScaleLocationName('Clínica Central (PY)');
                          setScaleHours('13:00 às 15:45 (Py)');
                        } else if (val === 'Clínica Visual') {
                          setScaleLocationName('Clínica Visual (PY)');
                          setScaleHours('16:00 às 17:30 (Py)');
                        } else if (val === 'Santa Rosa PY') {
                          setScaleLocationName('Hospital Santa Rosa PY');
                          setScaleHours('Dia Inteiro');
                        } else if (val === 'Mega Star') {
                          setScaleLocationName('Mega Star');
                        } else if (val === 'Clínica Stillo') {
                          setScaleLocationName('Clínica Stillo Itamarati');
                          setScaleHours('08:00 às 15:00');
                        } else {
                          const matchedClinic = offlineDb.getClinics().find(c => c.name === val || c.code === val || c.id === val);
                          if (matchedClinic) {
                            setScaleLocationName(matchedClinic.name);
                            setScaleHours('08:00 às 18:00');
                          }
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 cursor-pointer"
                    >
                      <option value="Instituto">IVS - Instituto da Visão e Saúde (Ponta Porã)</option>
                      <option value="Clínica Stillo">Clínica Stillo Itamarati (08:00 às 15:00)</option>
                      <option value="Clínica Central">Clínica Central (PY - Pedro Juan Caballero)</option>
                      <option value="Clínica Visual">Clínica Visual (PY - Pedro Juan Caballero)</option>
                      <option value="Santa Rosa PY">Hospital Santa Rosa PY</option>
                      <option value="Mega Star">Mega Star Consultório (Pedro Juan Caballero)</option>
                      {offlineDb.getClinics()
                        .filter(c => !['ivs', 'megastar', 'vision'].includes(c.id) && !c.name.toLowerCase().includes('instituto') && !c.name.toLowerCase().includes('mega star'))
                        .map(c => (
                          <option key={c.id} value={c.name}>
                            🏥 {c.name} ({c.country === 'Paraguai' ? '🇵🇾' : '🇧🇷'} {c.city || c.country})
                          </option>
                        ))
                      }
                      <option value="__add_new_clinic__" className="text-blue-700 font-extrabold">
                        ➕ [Cadastrar Nova Clínica / Unidade...]
                      </option>
                      <option value="Outro">Outro Local / Evento Personalizado</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">NOME DA UNIDADE / EVENTO</label>
                      <input
                        type="text"
                        value={scaleLocationName}
                        onChange={(e) => setScaleLocationName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">HORÁRIO / TURNO</label>
                      <input
                        type="text"
                        value={scaleHours}
                        onChange={(e) => setScaleHours(e.target.value)}
                        placeholder="Ex: 08:00 às 18:00"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    removeCustomShiftOverride(scaleEditDate);
                    setCustomShiftsTick(t => t + 1);
                    setIsScaleModalOpen(false);
                  }}
                  className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                  title="Restaurar a escala padrão oficial trimestral para esta data"
                >
                  Restaurar Escala Padrão
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsScaleModalOpen(false)}
                    className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md cursor-pointer"
                  >
                    Salvar Escala
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Cadastrar Nova Clínica / Consultório Diretamente na Agenda */}
      {isNewClinicModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 text-slate-900 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2 text-blue-700 font-black">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>CADASTRAR NOVA CLÍNICA / UNIDADE DE ATENDIMENTO</span>
              </div>
              <button
                type="button"
                onClick={() => setIsNewClinicModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newClinicName.trim()) return;

                const clinicId = generateUUID();
                const codeGenerated = newClinicName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 15);
                const createdClinic: ClinicConfig = {
                  id: clinicId,
                  code: codeGenerated,
                  name: newClinicName.trim(),
                  tagline: 'Centro de Atendimento Clínico & Diagnóstico',
                  primaryColor: newClinicColor,
                  city: newClinicCity.trim() || (newClinicCountry === 'Paraguai' ? 'Pedro Juan Caballero' : 'Ponta Porã'),
                  country: newClinicCountry,
                  defaultLanguage: newClinicCountry === 'Paraguai' ? ('es-PY' as const) : ('pt-BR' as const),
                  defaultCurrency: newClinicCountry === 'Paraguai' ? ('PYG' as const) : ('BRL' as const),
                  timezone: newClinicCountry === 'Paraguai' ? 'America/Asuncion' : 'America/Sao_Paulo',
                  currency: newClinicCountry === 'Paraguai' ? ('PYG' as const) : ('BRL' as const),
                  language: newClinicCountry === 'Paraguai' ? ('es-PY' as const) : ('pt-BR' as const),
                  status: 'active',
                  address: newClinicAddress.trim() || 'Consultório Parceiro',
                  phone: newClinicPhone.trim() || undefined,
                  clinicalSettings: {
                    defaultConsultationDurationMinutes: 30,
                    optotypeDistanceMeters: 6,
                    enableSmartTV: true,
                    enableRemoteControl: true
                  },
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };

                offlineDb.saveClinic(createdClinic);

                // Define como clínica ativa da seleção
                setTargetBookingClinicId(clinicId);
                setScaleShortName(createdClinic.name);
                setScaleLocationName(createdClinic.name);

                // Limpa campos
                setNewClinicName('');
                setNewClinicAddress('');
                setNewClinicPhone('');
                setIsNewClinicModalOpen(false);
                setCustomShiftsTick(t => t + 1);
                loadData();
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="font-bold text-slate-700 block mb-1">NOME DA NOVA CLÍNICA / CONSULTÓRIO *</label>
                <input
                  type="text"
                  required
                  value={newClinicName}
                  onChange={(e) => setNewClinicName(e.target.value)}
                  placeholder="Ex: Clínica Oftalmológica São Lucas, Hospital Regional..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">PAÍS / JURISDIÇÃO</label>
                  <select
                    value={newClinicCountry}
                    onChange={(e) => {
                      const c = e.target.value as 'Brasil' | 'Paraguai';
                      setNewClinicCountry(c);
                      setNewClinicCity(c === 'Paraguai' ? 'Pedro Juan Caballero' : 'Ponta Porã');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Brasil">🇧🇷 Brasil</option>
                    <option value="Paraguai">🇵🇾 Paraguai</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">CIDADE</label>
                  <input
                    type="text"
                    required
                    value={newClinicCity}
                    onChange={(e) => setNewClinicCity(e.target.value)}
                    placeholder="Ex: Ponta Porã ou Pedro Juan Caballero"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ENDEREÇO / LOCALIZAÇÃO</label>
                  <input
                    type="text"
                    value={newClinicAddress}
                    onChange={(e) => setNewClinicAddress(e.target.value)}
                    placeholder="Ex: Av. Central, Sala 201"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">TELEFONE / WHATSAPP</label>
                  <input
                    type="text"
                    value={newClinicPhone}
                    onChange={(e) => setNewClinicPhone(e.target.value)}
                    placeholder="Ex: (67) 99999-0000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">COR DE IDENTIFICAÇÃO NA AGENDA</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { color: '#2563EB', name: 'Azul (Padrão)' },
                    { color: '#7C3AED', name: 'Roxo' },
                    { color: '#059669', name: 'Verde Esmeralda' },
                    { color: '#EA580C', name: 'Laranja' },
                    { color: '#E11D48', name: 'Rosa/Cereja' },
                    { color: '#0891B2', name: 'Ciano' },
                    { color: '#475569', name: 'Ardósia / Grafite' }
                  ].map(opt => (
                    <button
                      key={opt.color}
                      type="button"
                      onClick={() => setNewClinicColor(opt.color)}
                      style={{ backgroundColor: opt.color }}
                      className={`w-7 h-7 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center text-white ${
                        newClinicColor === opt.color ? 'ring-3 ring-offset-2 ring-slate-800 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={opt.name}
                    >
                      {newClinicColor === opt.color && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewClinicModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar e Selecionar Clínica</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Completar Cadastro Presencial do Paciente */}
      {isCompleteModalOpen && targetPatientToComplete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 text-slate-900 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2 text-emerald-700 font-black">
                <UserCheck className="w-5 h-5" />
                <span>COMPLETAR CADASTRO PRESENCIAL (CHECK-IN)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCompleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompletedRegistration} className="space-y-4 text-xs">
              {/* Nome Completo */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">NOME COMPLETO DO PACIENTE *</label>
                <input
                  type="text"
                  required
                  value={completeFullName}
                  onChange={(e) => setCompleteFullName(e.target.value)}
                  placeholder="Nome completo..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Telefone e Nacionalidade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">TELEFONE / WHATSAPP</label>
                  <input
                    type="text"
                    value={completePhone}
                    onChange={(e) => setCompletePhone(e.target.value)}
                    placeholder="Ex: (45) 99999-9999 ou +595 981..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">NACIONALIDADE / PAÍS</label>
                  <select
                    value={completeNationality}
                    onChange={(e) => {
                      const nat = e.target.value as NationalityType;
                      setCompleteNationality(nat);
                      if (nat === 'PY') {
                        setCompleteDocumentType('CI_PY');
                        if (!completeCity || completeCity === 'Ponta Porã' || completeCity === 'Foz do Iguaçu') setCompleteCity('Pedro Juan Caballero');
                      } else {
                        setCompleteDocumentType('CPF');
                        if (!completeCity || completeCity === 'Pedro Juan Caballero' || completeCity === 'Ciudad del Este') setCompleteCity('Ponta Porã');
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="BR">🇧🇷 Brasil (+55)</option>
                    <option value="PY">🇵🇾 Paraguai (+595)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">DATA DE NASCIMENTO</label>
                  <input
                    type="date"
                    value={completeBirthDate}
                    onChange={(e) => setCompleteBirthDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">SEXO BIOLÓGICO</label>
                  <select
                    value={completeSex}
                    onChange={(e) => setCompleteSex(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="uninformed">Não informado</option>
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">TIPO DE DOCUMENTO</label>
                  <select
                    value={completeDocumentType}
                    onChange={(e) => setCompleteDocumentType(e.target.value as DocumentType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="CPF">CPF (Brasil)</option>
                    <option value="RG">RG (Brasil)</option>
                    <option value="CI_PY">Cédula de Identidad (Paraguai)</option>
                    <option value="DNI">DNI (Estrangeiro)</option>
                    <option value="PASSPORT">Passaporte</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">NÚMERO DO DOCUMENTO</label>
                  <input
                    type="text"
                    value={completeDocumentNumber}
                    onChange={(e) => setCompleteDocumentNumber(e.target.value)}
                    placeholder="Ex: 000.000.000-00 ou 1.234.567"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">CIDADE</label>
                  <input
                    type="text"
                    value={completeCity}
                    onChange={(e) => setCompleteCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">ENDEREÇO / BAIRRO</label>
                  <input
                    type="text"
                    value={completeAddress}
                    onChange={(e) => setCompleteAddress(e.target.value)}
                    placeholder="Rua, número, bairro..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">NOME DO RESPONSÁVEL (SE MENOR)</label>
                <input
                  type="text"
                  value={completeGuardianName}
                  onChange={(e) => setCompleteGuardianName(e.target.value)}
                  placeholder="Nome do pai/mãe ou responsável legal..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">OBSERVAÇÕES DO CADASTRO</label>
                <textarea
                  rows={2}
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  placeholder="Informações adicionais, convênio, observações clínicas ou cadastrais..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-transform cursor-pointer"
                >
                  Salvar Dados & Encaminhar para Espera
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Avisos e Programação da Agenda para o Examinador */}
      {isExaminerBriefingOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 text-slate-900 border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-emerald-700">
                <div className="p-2 bg-emerald-50 rounded-xl">
                  <Send className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    AVISO DE PROGRAMAÇÃO & AGENDA DO EXAMINADOR
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Envio de resumo diário, semanal e mensal para o Dr. Rudson Meirelles (Sem duplicidade)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExaminerBriefingOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Seletor de Período do Aviso */}
            <div className="flex items-center justify-between gap-3 bg-slate-100 p-1.5 rounded-2xl">
              <button
                onClick={() => setBriefingPeriod('day')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  briefingPeriod === 'day' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dia Selecionado ({new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})
              </button>
              <button
                onClick={() => setBriefingPeriod('week')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  briefingPeriod === 'week' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Programação Semanal
              </button>
              <button
                onClick={() => setBriefingPeriod('month')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  briefingPeriod === 'month' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Programação Mensal
              </button>
            </div>

            {/* Caixa de Visualização do Texto do Aviso */}
            <div className="relative">
              <div className="bg-slate-950 text-emerald-400 p-4 rounded-2xl font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto border border-slate-800 shadow-inner select-text">
                {calendarIntegrationService.generateExaminerNotificationText(
                  briefingPeriod,
                  selectedDate,
                  'Dr. Rudson Meirelles'
                )}
              </div>
            </div>

            {/* Ações: Copiar Texto / Enviar via WhatsApp */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Consolidado de todas as unidades (IVS, Clínica Central, Clínica Visual, Santa Rosa, Mega Star)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = calendarIntegrationService.generateExaminerNotificationText(
                      briefingPeriod,
                      selectedDate,
                      'Dr. Rudson Meirelles'
                    );
                    navigator.clipboard.writeText(text);
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2500);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copySuccess ? '✓ Copiado!' : 'Copiar Texto'}</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    calendarIntegrationService.generateExaminerNotificationText(
                      briefingPeriod,
                      selectedDate,
                      'Dr. Rudson Meirelles'
                    )
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar para WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SINCRONIZAÇÃO AUTÔNOMA E AUTOMÁTICA COM O GOOGLE AGENDA */}
      {isAutoSyncModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Sincronização Autônoma do Dr. Rudson Meirelles
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Conexão permanente entre o Sistema OptoMed e o Google Agenda (Agenda: <b>Atendimentos</b>)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAutoSyncModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Explicação da Autonomia e Próximos Eventos */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-950 space-y-1">
                <p className="font-bold text-emerald-900">
                  ✓ O arquivo com 101 atendimentos e turnos futuros (até o fim de 2026) foi gerado e baixado!
                </p>
                <p className="text-emerald-800">
                  Foram incluídos os atendimentos do <b>IVS (terças 13h às 18h e quartas 08h às 13h)</b>, <b>Stillo Ita (1º sábado 08h às 15h)</b>, <b>Hospital Santa Rosa PY</b> e <b>Mega Star</b>.
                </p>
              </div>
            </div>

            {/* Opção 1: Inscrição por URL Automática (100% Autônoma - Sem precisar subir arquivos no futuro) */}
            <div className="border border-blue-200 bg-blue-50/50 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider">
                  Opção 1 (Recomendada • 100% Autônoma)
                </span>
                <span className="text-xs font-black text-blue-900">Inscrição Automática por URL</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Para que o Google Calendar sincronize <b>sozinho em segundo plano</b> sem você precisar importar arquivos novamente:
              </p>
              <ol className="text-xs text-slate-700 space-y-1.5 pl-4 list-decimal font-medium">
                <li>No Google Agenda, no menu lateral esquerdo, clique no <b>"+"</b> ao lado de <i>"Outras agendas"</i>.</li>
                <li>Selecione <b>"Do URL"</b> (From URL).</li>
                <li>Cole o link oficial do calendário abaixo e clique em <b>"Adicionar agenda"</b>:</li>
              </ol>

              <div className="flex items-center gap-2 bg-white border border-blue-200 p-2 rounded-xl">
                <input
                  type="text"
                  readOnly
                  value="https://app.optomed.app.br/atendimentos.ics"
                  className="w-full bg-transparent text-xs font-mono text-blue-950 px-2 focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('https://app.optomed.app.br/atendimentos.ics');
                    setSyncUrlCopied(true);
                    setTimeout(() => setSyncUrlCopied(false), 3000);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{syncUrlCopied ? 'Copiado!' : 'Copiar URL'}</span>
                </button>
              </div>
              <p className="text-[11px] text-blue-700 italic">
                ℹ️ Com essa URL, qualquer novo paciente agendado ou alteração de escala entra sozinho no seu celular e Google Calendar!
              </p>
            </div>

            {/* Opção 2: Importação Imediata do Arquivo Completo */}
            <div className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-slate-700 text-white text-[10px] font-black uppercase tracking-wider">
                  Opção 2
                </span>
                <span className="text-xs font-black text-slate-900">Importação Direta na Tela Aberta</span>
              </div>
              <p className="text-xs text-slate-600">
                Se preferir usar a tela de importação que já está aberta:
              </p>
              <ol className="text-xs text-slate-700 space-y-1.5 pl-4 list-decimal font-medium">
                <li>Em <b>"Adicionar à agenda"</b>, escolha <b>Atendimentos</b>.</li>
                <li>Clique em <b>"Selecionar arquivo no seu computador"</b> e pegue o arquivo <b>atendimentos_dr_meirelles_todas_clinicas.ics</b> que acabou de ser baixado na pasta Downloads.</li>
                <li>Clique em <b>"Importar"</b>. Todos os 101 atendimentos e escalas futuras até dezembro entrarão instantaneamente.</li>
              </ol>
            </div>

            {/* Rodapé do Modal */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  calendarIntegrationService.downloadAllAppointmentsICalFile();
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Novamente Arquivo .ICS</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAutoSyncModalOpen(false)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
              >
                Entendi e Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Check-In Profissional com Regras Anti-Concorrência e Prioridade Legal */}
      <CheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => {
          setIsCheckInModalOpen(false);
          setCheckInTargetAppointment(null);
        }}
        initialAppointment={checkInTargetAppointment}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* FASE 29: Modal de Confirmação Acessível de Cancelamento/Exclusão de Agendamento */}
      {aptToDelete && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-apt-title"
          aria-describedby="delete-apt-desc"
        >
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-red-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-50 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 id="delete-apt-title" className="font-black text-sm text-slate-900 uppercase tracking-tight">
                  Cancelar / Excluir Agendamento
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  Ação que liberará o horário na grade clínica
                </span>
              </div>
            </div>

            <p id="delete-apt-desc" className="text-xs text-slate-600 leading-relaxed">
              Deseja realmente remover o agendamento de <strong>"{aptToDelete.patientName}"</strong> previsto para as <strong>{aptToDelete.time}</strong>? O horário ficará imediatamente disponível para novo paciente.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                autoFocus
                onClick={() => setAptToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Manter Agendamento
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAppointment}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md shadow-red-600/25 transition-colors"
              >
                Sim, Cancelar Horário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
