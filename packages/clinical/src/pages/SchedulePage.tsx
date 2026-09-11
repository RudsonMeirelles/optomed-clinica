import React, { useState, useEffect } from 'react';
import { Appointment, AppointmentStatus, AppointmentType, Patient, UserAccount, ReturnReminder, NationalityType, DocumentType, ClinicalEncounter } from '@optotipo/shared';
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
  Trash2
} from 'lucide-react';
import { offlineDb, generateUUID } from '../services/offlineDb';
import { calendarIntegrationService } from '../services/licensingService';
import { lanController } from '../services/lanController';

interface SchedulePageProps {
  onStartEncounter: (patient: Patient) => void;
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
}

interface DaySchedule {
  shifts: ShiftInfo[];
  description?: string;
  isOffDay?: boolean;
}

// Mapeamento Oficial dos Locais Conforme o Calendário Trimestral
const LOCATION_CONFIGS = {
  INSTITUTO: {
    locationName: 'Instituto da Visão e Saúde (IVS)',
    shortName: 'Instituto',
    hours: '08:00 às 18:00 (Br)',
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

  // --- 1. AGOSTO 2026 (monthStr === 8) ---
  if (monthStr === 8) {
    // Segundas e Terças: Instituto (08:00 às 18:00 Br) -> 03, 04, 10, 11, 17, 18, 24, 25, 31
    if (dayOfWeek === 1 || dayOfWeek === 2) {
      return { shifts: [LOCATION_CONFIGS.INSTITUTO] };
    }
    // Quartas: Central (13:00 às 15:45) + Visual (16:00 às 17:30) -> 05, 12, 19, 26
    if (dayOfWeek === 3) {
      return {
        shifts: [LOCATION_CONFIGS.CLINICA_CENTRAL, LOCATION_CONFIGS.CLINICA_VISUAL],
        description: 'Quarta: Turno Duplo PY (Central + Visual)'
      };
    }
    // Hospital Santa Rosa PY: 27 (qui) e 28 (sex)
    if (day === 27 || day === 28) {
      return { shifts: [LOCATION_CONFIGS.SANTA_ROSA] };
    }
    // Mega Star: Último Sábado (29)
    if (day === 29) {
      return { shifts: [LOCATION_CONFIGS.MEGA_STAR] };
    }
  }

  // --- 2. SETEMBRO 2026 (monthStr === 9) ---
  if (monthStr === 9) {
    // Segundas e Terças: Instituto (08:00 às 18:00 Br) -> 01, 07, 08, 14, 15, 21, 22, 28, 29
    if (dayOfWeek === 1 || dayOfWeek === 2) {
      return { shifts: [LOCATION_CONFIGS.INSTITUTO] };
    }
    // Quartas: Central (13:00 às 15:45) + Visual (16:00 às 17:30) -> 02, 09, 16, 23, 30
    if (dayOfWeek === 3) {
      return {
        shifts: [LOCATION_CONFIGS.CLINICA_CENTRAL, LOCATION_CONFIGS.CLINICA_VISUAL],
        description: 'Quarta: Turno Duplo PY (Central + Visual)'
      };
    }
    // Hospital Santa Rosa PY: 10 (qui), 11 (sex), 24 (qui), 25 (sex)
    if (day === 10 || day === 11 || day === 24 || day === 25) {
      return { shifts: [LOCATION_CONFIGS.SANTA_ROSA] };
    }
    // Mega Star: Último Sábado (26)
    if (day === 26) {
      return { shifts: [LOCATION_CONFIGS.MEGA_STAR] };
    }
  }

  // --- 3. OUTUBRO 2026 (monthStr === 10) ---
  if (monthStr === 10) {
    // Segundas e Terças: Instituto (08:00 às 18:00 Br) -> 05, 06, 12, 13, 19, 20, 26, 27
    if (dayOfWeek === 1 || dayOfWeek === 2) {
      return { shifts: [LOCATION_CONFIGS.INSTITUTO] };
    }
    // Quartas: Central (13:00 às 15:45) + Visual (16:00 às 17:30) -> 07, 14, 21, 28
    if (dayOfWeek === 3) {
      return {
        shifts: [LOCATION_CONFIGS.CLINICA_CENTRAL, LOCATION_CONFIGS.CLINICA_VISUAL],
        description: 'Quarta: Turno Duplo PY (Central + Visual)'
      };
    }
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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [encounters, setEncounters] = useState<ClinicalEncounter[]>([]);
  const [returnReminders, setReturnReminders] = useState<ReturnReminder[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [isExaminerBriefingOpen, setIsExaminerBriefingOpen] = useState<boolean>(false);
  const [briefingPeriod, setBriefingPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Form de Agendamento (Criação e Edição)
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [appointmentDate, setAppointmentDate] = useState<string>(selectedDate);
  const [bookingMode, setBookingMode] = useState<'existing' | 'quick'>('quick');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [quickPatientName, setQuickPatientName] = useState<string>('');
  const [quickPatientPhone, setQuickPatientPhone] = useState<string>('');
  const [quickPatientNationality, setQuickPatientNationality] = useState<NationalityType>('BR');
  const [newTime, setNewTime] = useState<string>('10:30');
  const [newType, setNewType] = useState<AppointmentType>('refrativo');
  const [newNotes, setNewNotes] = useState<string>('');
  const [newExaminerName, setNewExaminerName] = useState<string>('Dr. Rudson Meirelles');

  // Modal para Completar Cadastro Presencial quando o paciente chega
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState<boolean>(false);
  const [targetPatientToComplete, setTargetPatientToComplete] = useState<Patient | null>(null);
  const [targetAppointmentToComplete, setTargetAppointmentToComplete] = useState<Appointment | null>(null);
  const [completeBirthDate, setCompleteBirthDate] = useState<string>('');
  const [completeDocumentType, setCompleteDocumentType] = useState<DocumentType>('CPF');
  const [completeDocumentNumber, setCompleteDocumentNumber] = useState<string>('');
  const [completeCity, setCompleteCity] = useState<string>('Foz do Iguaçu');
  const [completeAddress, setCompleteAddress] = useState<string>('');
  const [completeGuardianName, setCompleteGuardianName] = useState<string>('');
  const [completeSex, setCompleteSex] = useState<Patient['sex']>('uninformed');

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
    setAppointments(offlineDb.getAppointments());
    setPatients(offlineDb.getPatients());
    setEncounters(offlineDb.getEncounters());
    setReturnReminders(offlineDb.getReturnReminders());
  };

  useEffect(() => {
    loadData();

    // Ouvintes de eventos em tempo real para sincronização instantânea de agendamentos
    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('optomed_appointment_updated', handleUpdate);
    window.addEventListener('optomed_new_patient_registered', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Polling ultrarrápido a cada 2.5 segundos para garantir sincronização entre diferentes abas e dispositivos na LAN
    const timer = setInterval(() => {
      loadData();
    }, 2500);

    return () => {
      clearInterval(timer);
      window.removeEventListener('optomed_appointment_updated', handleUpdate);
      window.removeEventListener('optomed_new_patient_registered', handleUpdate);
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
    offlineDb.updateAppointmentStatus(id, newStatus);
    loadData();
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
    onStartEncounter(p);
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
      city: apt.patientNationality === 'PY' ? 'Ciudad del Este' : 'Foz do Iguaçu',
      address: '',
      guardianName: '',
      lgpdConsent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setTargetPatientToComplete(p);
    setTargetAppointmentToComplete(apt);
    setCompleteBirthDate(p.birthDate || '');
    setCompleteSex(p.sex || 'uninformed');
    setCompleteDocumentType(p.documentType || (p.nationality === 'PY' ? 'CI_PY' : 'CPF'));
    setCompleteDocumentNumber(p.documentNumber || '');
    setCompleteCity(p.city || (p.nationality === 'PY' ? 'Ciudad del Este' : 'Foz do Iguaçu'));
    setCompleteAddress(p.address || '');
    setCompleteGuardianName(p.guardianName || '');
    setIsCompleteModalOpen(true);
  };

  const handleSaveCompletedRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPatientToComplete) return;

    const updatedPatient: Patient = {
      ...targetPatientToComplete,
      birthDate: completeBirthDate,
      sex: completeSex,
      documentType: completeDocumentType,
      documentNumber: completeDocumentNumber.trim() || undefined,
      city: completeCity.trim() || undefined,
      address: completeAddress.trim() || undefined,
      guardianName: completeGuardianName.trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    offlineDb.savePatient(updatedPatient);

    // Se houver agendamento associado e estiver agendado, confirma chegada para sala de espera
    if (targetAppointmentToComplete) {
      if (targetAppointmentToComplete.status === 'scheduled') {
        offlineDb.updateAppointmentStatus(targetAppointmentToComplete.id, 'waiting');
      }
    }

    loadData();
    setIsCompleteModalOpen(false);
    setTargetPatientToComplete(null);
    setTargetAppointmentToComplete(null);
  };

  const openNewAppointmentModal = () => {
    setEditingAppointmentId(null);
    setAppointmentDate(selectedDate);
    setSelectedPatientId('');
    setQuickPatientName('');
    setQuickPatientPhone('');
    setQuickPatientNationality('BR');
    setNewTime('10:30');
    setNewType('refrativo');
    setNewNotes('');
    setNewExaminerName('Dr. Rudson Meirelles');
    setConflictWarning(null);
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
    setNewTime(apt.time || '10:30');
    setNewType(apt.type || 'refrativo');
    setNewNotes(apt.notes || '');
    setNewExaminerName(apt.examinerName || 'Dr. Rudson Meirelles');
    setBookingMode(apt.patientId && patients.some(p => p.id === apt.patientId) ? 'existing' : 'quick');
    setConflictWarning(null);
    setIsNewModalOpen(true);
  };

  const handleDeleteAppointment = (apt: Appointment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm(`Deseja realmente excluir/cancelar o agendamento de "${apt.patientName}" às ${apt.time}?`);
    if (!confirmed) return;

    offlineDb.deleteAppointment(apt.id, activeClinic.id);
    loadData();
  };

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();

    let patientId = selectedPatientId;
    let patientName = '';
    let patientPhone = '';
    let patientNat: NationalityType = 'BR';
    let patientDoc = '';

    if (bookingMode === 'existing') {
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
          offlineDb.savePatient(updatedPat);
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
          city: quickPatientNationality === 'PY' ? 'Ciudad del Este' : 'Foz do Iguaçu',
          country: quickPatientNationality === 'PY' ? 'Paraguai' : 'Brasil',
          address: '',
          notes: newNotes.trim() || 'Agendamento rápido realizado via agenda',
          lgpdConsent: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        offlineDb.savePatient(newQuickPatient);
        patientId = newPatientId;
        patientName = newQuickPatient.fullName;
        patientPhone = newQuickPatient.phone || '';
        patientNat = quickPatientNationality;
      }
    }

    const targetDate = appointmentDate || selectedDate;

    // 🔒 Verificação de Anti-Conflito de Compromissos Multi-Clínica
    const conflict = calendarIntegrationService.checkAppointmentConflict(
      activeClinic.id,
      targetDate,
      newTime,
      30,
      editingAppointmentId || undefined
    );

    if (conflict.hasConflict) {
      setConflictWarning(conflict.message || 'Existe um conflito de horário agendado para o examinador.');
      return;
    }

    setConflictWarning(null);

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
        durationMinutes: existingApt?.durationMinutes || 30,
        type: newType,
        status: existingApt?.status || 'scheduled',
        ticketNumber: existingApt?.ticketNumber || 'P-01',
        notes: newNotes,
        room: existingApt?.room || 'Consultório 1',
        createdAt: existingApt?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      offlineDb.saveAppointment(updatedApt);
      loadData();

      // Notifica alteração para o examinador e agenda em tempo real
      window.dispatchEvent(new CustomEvent('optomed_appointment_updated', { detail: updatedApt }));

      setIsNewModalOpen(false);
      setEditingAppointmentId(null);
      setSelectedPatientId('');
      setQuickPatientName('');
      setQuickPatientPhone('');
      setNewNotes('');
      setConflictWarning(null);
      return;
    }

    // ➕ Criação de Novo Agendamento
    // Gerar Senha Sequencial Diária (ex: P-01, P-02...)
    const existingDayCount = appointments.filter(a => a.date === targetDate).length;
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
      durationMinutes: 30,
      type: newType,
      status: 'scheduled',
      ticketNumber: generatedTicket,
      notes: newNotes,
      room: 'Consultório 1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    offlineDb.saveAppointment(newApt);
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

  // Consolidação completa em tempo real na Agenda (Agendamentos + Prontuários + Cadastros de Hoje)
  const getMergedDayAppointments = (): Appointment[] => {
    const map = new Map<string, Appointment>();

    // 1. Agendamentos na data
    appointments.filter(a => getLocalDateStr(a.date) === selectedDate).forEach(apt => {
      map.set(apt.patientId || apt.id, { ...apt });
    });

    // 2. Encounters realizados na data selecionada
    encounters.filter(e => getLocalDateStr(e.date) === selectedDate).forEach(enc => {
      const patientObj = patients.find(p => p.id === enc.patientId);
      const existing = map.get(enc.patientId);
      if (existing) {
        if (enc.status === 'completed') existing.status = 'completed';
        else if (enc.status === 'in_progress' && existing.status !== 'completed') existing.status = 'in_consultation';
      } else {
        const timeFromDate = enc.date && enc.date.includes('T')
          ? new Date(enc.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : '08:00';

        map.set(enc.patientId, {
          id: `apt-enc-${enc.id}`,
          patientId: enc.patientId,
          patientName: patientObj?.fullName || 'Paciente em Atendimento',
          patientNationality: patientObj?.nationality || 'BR',
          patientPhone: patientObj?.phone,
          patientDocument: patientObj?.documentNumber,
          examinerId: 'user-examinador',
          examinerName: enc.examinerName || 'Dr. Rudson Meirelles',
          date: selectedDate,
          time: timeFromDate,
          durationMinutes: 30,
          type: 'refrativo',
          status: enc.status === 'completed' ? 'completed' : 'in_consultation',
          ticketNumber: 'P-01',
          notes: enc.anamnesis?.chiefComplaint || 'Atendimento registrado no consultório.',
          room: 'Consultório 1',
          createdAt: enc.date || new Date().toISOString(),
          updatedAt: enc.updatedAt || new Date().toISOString()
        });
      }
    });

    // 3. Se a data for hoje, inclui pacientes cadastrados hoje
    const todayStr = getLocalDateStr(new Date().toISOString());
    if (selectedDate === todayStr) {
      patients.filter(p => getLocalDateStr(p.createdAt) === todayStr).forEach((p, idx) => {
        if (!map.has(p.id)) {
          map.set(p.id, {
            id: `apt-pat-${p.id}`,
            patientId: p.id,
            patientName: p.fullName,
            patientNationality: p.nationality,
            patientPhone: p.phone,
            patientDocument: p.documentNumber,
            examinerId: 'user-examinador',
            examinerName: 'Dr. Rudson Meirelles',
            date: selectedDate,
            time: p.createdAt ? new Date(p.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '08:00',
            durationMinutes: 30,
            type: 'refrativo',
            status: 'waiting',
            ticketNumber: `P-${String(idx + 1).padStart(2, '0')}`,
            notes: p.notes || 'Paciente cadastrado na recepção hoje.',
            room: 'Consultório 1',
            createdAt: p.createdAt || new Date().toISOString(),
            updatedAt: p.updatedAt || new Date().toISOString()
          });
        }
      });
    }

    return Array.from(map.values()).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  };

  // Filtragem da agenda
  const dayAppointments = getMergedDayAppointments();
  const filteredAppointments = dayAppointments.filter(a => {
    const matchesStatus = filterStatus === 'ALL' || a.status === filterStatus;
    const matchesQuery = !searchQuery || 
      a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.patientPhone && a.patientPhone.includes(searchQuery));
    return matchesStatus && matchesQuery;
  });

  // Métricas do Dia
  const totalCount = dayAppointments.length;
  const waitingCount = dayAppointments.filter(a => a.status === 'waiting').length;
  const inConsultCount = dayAppointments.filter(a => a.status === 'in_consultation').length;
  const completedCount = dayAppointments.filter(a => a.status === 'completed').length;

  const activeClinic = offlineDb.getActiveClinic();
  const isIvs = activeClinic.id === 'ivs';
  const consultPrice = isIvs ? 50.00 : 150.00;

  // Escala oficial da data selecionada
  const selectedDaySchedule = getDayOfficialSchedule(selectedDate);

  // Cálculo financeiro dos atendimentos concluídos/em andamento do dia
  const completedOrInConsult = dayAppointments.filter(a => a.status === 'completed' || a.status === 'in_consultation');
  const paidConsultationsCount = completedOrInConsult.filter(a => a.type !== 'retorno').length;
  const freeReturnsCount = completedOrInConsult.filter(a => a.type === 'retorno').length;
  const dayEstimatedRevenue = paidConsultationsCount * consultPrice;

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'waiting':
        return (
          <span className="bg-amber-50 text-amber-900 border border-amber-300 px-3 py-1 rounded-full font-bold text-[11px] flex items-center gap-1.5 shadow-xs animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Na Recepção (Aguardando)
          </span>
        );
      case 'in_consultation':
        return (
          <span className="bg-emerald-50 text-emerald-900 border border-emerald-300 px-3 py-1 rounded-full font-bold text-[11px] flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Em Atendimento
          </span>
        );
      case 'confirmed':
        return (
          <span className="bg-blue-50 text-blue-900 border border-blue-200 px-3 py-1 rounded-full font-bold text-[11px] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Confirmado
          </span>
        );
      case 'completed':
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-full font-bold text-[11px] flex items-center gap-1.5">
            <Check className="w-3 h-3 text-emerald-600" /> Concluído
          </span>
        );
      case 'canceled':
        return (
          <span className="bg-red-50 text-red-800 border border-red-200 px-3 py-1 rounded-full font-bold text-[11px]">
            Cancelado
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-800 border border-slate-200 px-3 py-1 rounded-full font-bold text-[11px]">
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

  const isToday = selectedDate === todayIso;

  // Cálculos do grid do mês atual
  const firstDayOfMonth = new Date(calendarYear, calendarMonth - 1, 1).getDay();
  const totalDaysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
  const monthName = new Date(calendarYear, calendarMonth - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6 select-none animate-fadeIn">
      
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
            onClick={() => setIsExaminerBriefingOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            title="Gerar aviso e resumo de programação diária, semanal ou mensal para o examinador"
          >
            <Send className="w-4 h-4" />
            <span>Avisos da Agenda</span>
          </button>

          <button
            onClick={openNewAppointmentModal}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-blue-600/25 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Novo Agendamento
          </button>
        </div>
      </div>

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
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Agendados no Dia</span>
            <span className="text-2xl font-black text-slate-900 mt-0.5 block">{totalCount}</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <CalendarCheck className="w-5 h-5" />
          </div>
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

        {/* Faturamento do Dia & Acerto do Examinador */}
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
              <span>Lista de Pacientes do Dia ({dayAppointments.length})</span>
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

                    <div className="flex items-center gap-2 self-end md:self-auto">
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
                    const schedule = getDayOfficialSchedule(dateStr);
                    const dayApts = appointments.filter(a => a.date === dateStr);
                    const isSelected = selectedDate === dateStr;
                    const isTodayCell = dateStr === todayIso;

                    return (
                      <div
                        key={dateStr}
                        onClick={() => {
                          setSelectedDate(dateStr);
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
                        {/* Topo do Card: Número do Dia + Badge Hoje */}
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
                            {dayApts.length > 0 && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-slate-900 text-white font-mono">
                                {dayApts.length}p
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Conteúdo / Locais de Atendimento Conforme Calendário Trimestral */}
                        <div className="space-y-1 my-auto">
                          {schedule.isOffDay ? (
                            <div className="text-[10px] text-red-500 font-bold text-center py-1">
                              Folga
                            </div>
                          ) : schedule.shifts.length === 0 ? (
                            <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                              <span>Livre</span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {schedule.shifts.map((shift, sIdx) => (
                                <div
                                  key={sIdx}
                                  className={`rounded-lg px-1.5 py-1 text-[9px] font-black leading-tight shadow-xs ${shift.colorBg} ${shift.colorText}`}
                                  title={`${shift.locationName} (${shift.hours})`}
                                >
                                  <div className="truncate">{shift.shortName}</div>
                                  <div className="text-[8px] opacity-90 truncate font-mono">{shift.hours}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Rodapé do Card: Contagem Real em Tempo Real */}
                        <div className="text-[8px] text-slate-500 font-bold truncate">
                          {dayApts.length > 0 
                            ? `${dayApts.length} ${dayApts.length === 1 ? 'consulta' : 'consultas'}` 
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

                {!isToday && (
                  <button
                    onClick={handleSetToday}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Ir para Hoje
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
            </div>
          </div>

          {/* Lista de Atendimentos */}
          <div className="space-y-3">
            {filteredAppointments.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center text-slate-400 space-y-3">
                <CalendarIcon className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-bold text-sm text-slate-600">Nenhum atendimento agendado para esta data.</p>
                <button
                  onClick={() => setIsNewModalOpen(true)}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  + Agendar Novo Paciente
                </button>
              </div>
            ) : (
              filteredAppointments.map((apt) => {
                const isWaiting = apt.status === 'waiting';
                const isInConsult = apt.status === 'in_consultation';

                return (
                  <div
                    key={apt.id}
                    className={`bg-white rounded-3xl p-5 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs hover:shadow-md ${
                      isInConsult
                        ? 'border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/20'
                        : isWaiting
                        ? 'border-amber-300 ring-2 ring-amber-100/60'
                        : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {/* Dados do Paciente e Horário */}
                    <div className="flex items-start gap-4">
                      {/* Horário em Bloco Destacado */}
                      <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center font-mono shrink-0 shadow-sm">
                        <Clock className="w-3.5 h-3.5 text-blue-400 mb-0.5" />
                        <span className="font-black text-sm">{apt.time}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* SENHA EM DESTAQUE */}
                          <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 border border-amber-400 shadow-xs flex items-center gap-1">
                            <span>SENHA:</span>
                            <span className="text-sm">{apt.ticketNumber || `P-${String(dayAppointments.indexOf(apt) + 1).padStart(2, '0')}`}</span>
                          </span>

                          <span className="font-black text-slate-900 text-base">{apt.patientName}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {apt.patientNationality === 'PY' ? '🇵🇾 Paraguai' : '🇧🇷 Brasil'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                            {getTypeLabel(apt.type)}
                          </span>
                          {getStatusBadge(apt.status)}
                        </div>

                        <div className="text-xs text-slate-500 flex items-center gap-4 mt-1 font-medium">
                          {apt.patientPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-slate-400" /> {apt.patientPhone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Stethoscope className="w-3.5 h-3.5 text-slate-400" /> {apt.examinerName}
                          </span>
                        </div>

                        {apt.notes && (
                          <p className="text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/70 mt-1 max-w-xl">
                            <b>Obs:</b> {apt.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Ações Rápidas por Perfil e Integração com Google Agenda */}
                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0 flex-wrap">
                      
                      {/* Botão Chamar Senha no Painel da TV */}
                      <button
                        type="button"
                        onClick={() => {
                          const ticketNum = apt.ticketNumber || `P-${String(dayAppointments.indexOf(apt) + 1).padStart(2, '0')}`;
                          lanController.callPatient({
                            ticketNumber: ticketNum,
                            patientName: apt.patientName,
                            roomName: apt.room || 'Consultório 1',
                            examinerName: apt.examinerName || 'Dr. Rudson Meirelles',
                            priority: apt.isPriority
                          });
                        }}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                        title="Chamar senha e nome do paciente no telão da TV com som"
                      >
                        <Bell className="w-4 h-4 animate-bounce" />
                        <span>Chamar na TV</span>
                      </button>

                      {/* Botão Adicionar ao Google Agenda */}
                      <a
                        href={calendarIntegrationService.generateGoogleCalendarUrl(apt, activeClinic)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Adicionar ao Google Calendar / Agenda"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Google Agenda</span>
                      </a>

                      {/* Botão Baixar .ics */}
                      <button
                        type="button"
                        onClick={() => calendarIntegrationService.downloadICalFile(apt, activeClinic)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Baixar arquivo de calendário (.ics) para Outlook/Apple/Google"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Botão Completar Cadastro (Presencial) */}
                      <button
                        type="button"
                        onClick={(e) => openCompleteModal(apt, e)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Completar dados cadastrais (CPF/CI, nascimento, endereço) na chegada"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Dados / Cadastro</span>
                      </button>

                      {/* Botão Editar Agendamento (Disponível para Examinador e Recepção) */}
                      <button
                        type="button"
                        onClick={(e) => openEditAppointmentModal(apt, e)}
                        className="p-2 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Editar data, horário, tipo, profissional ou notas deste agendamento"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Editar</span>
                      </button>

                      {/* Botão Excluir Agendamento */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteAppointment(apt, e)}
                        className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Excluir ou cancelar este agendamento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {currentUser.role === 'reception' && (
                        <>
                          {apt.status === 'scheduled' && (
                            <button
                              onClick={() => {
                                handleStatusChange(apt.id, 'waiting');
                              }}
                              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <UserCheck className="w-4 h-4 text-amber-600" />
                              <span>Confirmar Chegada</span>
                            </button>
                          )}
                          {apt.status === 'waiting' && (
                            <span className="text-xs text-amber-700 font-bold bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                              Na Sala de Espera
                            </span>
                          )}
                        </>
                      )}

                      {currentUser.role !== 'reception' && (
                        <button
                          onClick={() => handleCallPatient(apt)}
                          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>Atender Paciente</span>
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

            {/* Alternador entre Agendamento Rápido (Nome + Telefone) e Paciente Já Cadastrado */}
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setBookingMode('quick')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                  bookingMode === 'quick' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⚡ Agendamento Rápido (Nome + Telefone)
              </button>
              <button
                type="button"
                onClick={() => setBookingMode('existing')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                  bookingMode === 'existing' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👤 Paciente Já Cadastrado
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

              {/* Data da Consulta (Permite reprogramar ao editar ou selecionar data específica) */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <label className="font-bold text-slate-700 block mb-1">DATA DA CONSULTA *</label>
                <input
                  type="date"
                  required
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                />
              </div>

              {bookingMode === 'quick' ? (
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
                <div>
                  <label className="font-bold text-slate-700 block mb-1">SELECIONE O PACIENTE *</label>
                  <select
                    required
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="" disabled>Selecione um paciente cadastrado...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.nationality === 'PY' ? '🇵🇾 Paraguai' : '🇧🇷 Brasil'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">HORÁRIO *</label>
                  <input
                    type="time"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
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
                  }}
                  className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition-transform cursor-pointer"
                >
                  {editingAppointmentId ? 'Salvar Alterações' : 'Confirmar Agendamento'}
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
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Paciente</span>
                  <span className="font-black text-sm text-slate-900">{targetPatientToComplete.fullName}</span>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800">
                  {targetPatientToComplete.nationality === 'PY' ? '🇵🇾 Paraguai' : '🇧🇷 Brasil'}
                </span>
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
    </div>
  );
};
