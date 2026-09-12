import { 
  Patient, 
  ClinicalEncounter, 
  Prescription, 
  AuditLogEntry,
  Appointment,
  AppointmentStatus,
  ClinicConfig,
  UserAccount,
  ReturnReminder,
  ReportStats,
  AgeGroupDistribution,
  calculateAge,
  FinancialTransaction,
  POSItem,
  CashRegisterSummary,
  ProfessionalContractType,
  ProfessionalWorkSession,
  ProfessionalSettlementReport
} from '@optotipo/shared';
import { RECOVERED_RECORDS } from '../data/recoveredClinicalData';
export const DEFAULT_CLINICS: ClinicConfig[] = [
  {
    id: 'ivs',
    code: 'IVS',
    name: 'IVS - Instituto da Visão e Saúde',
    tagline: 'Oftalmologia Especializada & Exames Avançados',
    primaryColor: '#2563EB', // Blue
    city: 'Foz do Iguaçu',
    country: 'Brasil',
    defaultLanguage: 'pt-BR',
    defaultCurrency: 'BRL',
    address: 'Av. Jorge Schimmelpfeng, 500',
    phone: '+55 (45) 3522-1000'
  },
  {
    id: 'megastar',
    code: 'MEGA_STAR',
    name: 'Mega Star Consultório Oftalmológico',
    tagline: 'Centro de Diagnóstico e Refração Visual',
    primaryColor: '#7C3AED', // Purple
    city: 'Ciudad del Este',
    country: 'Paraguai',
    defaultLanguage: 'es-PY',
    defaultCurrency: 'PYG',
    address: 'Shopping Mega Star, Piso 3',
    phone: '+595 981 123456'
  },
  {
    id: 'vision',
    code: 'VISION',
    name: 'Vision Clínica de Ojos',
    tagline: 'Excelencia en Optometría y Contactología Especializada',
    primaryColor: '#059669', // Emerald Green
    city: 'Pedro Juan Caballero / Ciudad del Este',
    country: 'Paraguai',
    defaultLanguage: 'es-PY',
    defaultCurrency: 'PYG',
    address: 'Av. Dr. Francia / Centro Médico Vision',
    phone: '+595 981 302850'
  },
  {
    id: 'outro',
    code: 'OUTRO',
    name: 'Consultório Dr. Meirelles',
    tagline: 'Atendimento Clínico Personalizado',
    primaryColor: '#EA580C', // Amber/Orange
    city: 'Foz do Iguaçu',
    country: 'Brasil',
    defaultLanguage: 'pt-BR',
    defaultCurrency: 'BRL',
    address: 'Centro Médico Integrado, Sala 402',
    phone: '+55 (45) 99999-8888'
  }
];

const DB_CLINICS_KEY = 'optotipo_clinics_config_v2';
const DB_ACTIVE_CLINIC_ID_KEY = 'optotipo_active_clinic_id_v2';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class OfflineDatabaseService {
  private activeClinicId: string = 'ivs';

  constructor() {
    try {
      const saved = localStorage.getItem(DB_ACTIVE_CLINIC_ID_KEY);
      if (saved) {
        this.activeClinicId = saved;
      }
      
      // Auto-recuperação de todos os pacientes e prontuários históricos desde 25/08/2026
      const recoveryFlagKey = 'optomed_historical_recovery_2026_v1';
      if (!localStorage.getItem(recoveryFlagKey)) {
        this.restoreRecoveredHistoricalData();
        localStorage.setItem(recoveryFlagKey, 'true');
      }
    } catch {
      this.activeClinicId = 'ivs';
    }
  }

  // --- GERENCIAMENTO MULTI-CLÍNICA (BANCOS ISOLADOS) ---
  public getActiveClinicId(): string {
    return this.activeClinicId;
  }

  public setActiveClinicId(clinicId: string): void {
    this.activeClinicId = clinicId;
    try {
      localStorage.setItem(DB_ACTIVE_CLINIC_ID_KEY, clinicId);
    } catch {}
  }

  public getClinics(): ClinicConfig[] {
    try {
      const raw = localStorage.getItem(DB_CLINICS_KEY);
      if (!raw) {
        this.saveClinics(DEFAULT_CLINICS);
        return DEFAULT_CLINICS;
      }
      const parsed: ClinicConfig[] = JSON.parse(raw);
      // Garantir integridade da clínica Vision com Espanhol (Paraguay)
      let modified = false;
      const updated: ClinicConfig[] = parsed.map(c => {
        if (c.id === 'vision' || c.code === 'VISION') {
          if (c.defaultLanguage !== 'es-PY' || c.country !== 'Paraguai') {
            modified = true;
            return {
              ...c,
              name: c.name && !c.name.includes('IVS') ? c.name : 'Vision Clínica de Ojos',
              tagline: c.tagline && !c.tagline.includes('Português') ? c.tagline : 'Excelencia en Optometría y Contactología Especializada',
              country: 'Paraguai' as const,
              defaultLanguage: 'es-PY' as const,
              defaultCurrency: 'PYG' as const,
              city: c.city || 'Pedro Juan Caballero / Ciudad del Este'
            };
          }
        }
        return c;
      });
      if (modified) {
        this.saveClinics(updated);
      }
      return updated;
    } catch {
      return DEFAULT_CLINICS;
    }
  }

  public saveClinics(clinics: ClinicConfig[]): void {
    try {
      localStorage.setItem(DB_CLINICS_KEY, JSON.stringify(clinics));
    } catch {}
  }

  public saveClinic(clinic: ClinicConfig): void {
    const list = this.getClinics();
    const idx = list.findIndex(c => c.id === clinic.id);
    if (idx >= 0) {
      list[idx] = clinic;
    } else {
      list.push(clinic);
    }
    this.saveClinics(list);
  }

  public getActiveClinic(): ClinicConfig {
    const clinics = this.getClinics();
    return clinics.find(c => c.id === this.activeClinicId) || clinics[0] || DEFAULT_CLINICS[0];
  }

  // Chaves de banco isoladas por consultório
  private getKey(base: string, clinicId = this.activeClinicId): string {
    return `optotipo_${clinicId}_${base}_v2`;
  }

  // --- PACIENTES ---
  public getPatients(clinicId = this.activeClinicId): Patient[] {
    try {
      const raw = localStorage.getItem(this.getKey('patients', clinicId));
      if (!raw) {
        // Inicializa se vazio para a clínica
        const initial = this.getInitialPatientsForClinic(clinicId);
        this.savePatients(initial, clinicId);
        return initial;
      }
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public savePatients(patients: Patient[], clinicId = this.activeClinicId): void {
    localStorage.setItem(this.getKey('patients', clinicId), JSON.stringify(patients));
  }

  public savePatient(patient: Patient, clinicId = this.activeClinicId): void {
    const list = this.getPatients(clinicId);
    const idx = list.findIndex(p => p.id === patient.id);
    if (idx >= 0) {
      list[idx] = { ...patient, updatedAt: new Date().toISOString() };
    } else {
      list.unshift(patient);
    }
    this.savePatients(list, clinicId);
    this.logAudit('UPDATE', 'PATIENT', patient.id, `Atualizado cadastro de ${patient.fullName}`, clinicId);
  }

  public deletePatient(patientId: string, clinicId = this.activeClinicId): void {
    const list = this.getPatients(clinicId).filter(p => p.id !== patientId);
    this.savePatients(list, clinicId);
    this.logAudit('DELETE', 'PATIENT', patientId, 'Registro de paciente removido', clinicId);
  }

  // --- PRONTUÁRIOS / ATENDIMENTOS ---
  public getEncounters(clinicId = this.activeClinicId): ClinicalEncounter[] {
    try {
      const raw = localStorage.getItem(this.getKey('encounters', clinicId));
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveEncounters(encounters: ClinicalEncounter[], clinicId = this.activeClinicId): void {
    localStorage.setItem(this.getKey('encounters', clinicId), JSON.stringify(encounters));
  }

  public saveEncounter(encounter: ClinicalEncounter, clinicId = this.activeClinicId): void {
    const list = this.getEncounters(clinicId);
    const idx = list.findIndex(e => e.id === encounter.id);
    if (idx >= 0) {
      list[idx] = { ...encounter, updatedAt: new Date().toISOString() };
    } else {
      list.unshift(encounter);
    }
    this.saveEncounters(list, clinicId);
    this.logAudit('UPDATE', 'ENCOUNTER', encounter.id, `Prontuário clínico atualizado`, clinicId);
  }

  // --- RECEITAS ÓPTICAS ---
  public getPrescriptions(clinicId = this.activeClinicId): Prescription[] {
    try {
      const raw = localStorage.getItem(this.getKey('prescriptions', clinicId));
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public savePrescription(rx: Prescription, clinicId = this.activeClinicId): void {
    const list = this.getPrescriptions(clinicId);
    list.unshift(rx);
    localStorage.setItem(this.getKey('prescriptions', clinicId), JSON.stringify(list));
    this.logAudit('CREATE', 'PRESCRIPTION', rx.id, `Receita óptica gerada para ${rx.patientName}`, clinicId);
  }

  // --- AGENDAMENTOS (AGENDA) ---
  public getAppointments(clinicId = this.activeClinicId): Appointment[] {
    try {
      const raw = localStorage.getItem(this.getKey('appointments', clinicId));
      if (!raw) {
        const initial = this.getInitialAppointmentsForClinic(clinicId);
        this.saveAppointments(initial, clinicId);
        return initial;
      }
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveAppointments(appointments: Appointment[], clinicId = this.activeClinicId): void {
    localStorage.setItem(this.getKey('appointments', clinicId), JSON.stringify(appointments));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_appointment_updated', { detail: { clinicId, appointments } }));
    }
  }

  public saveAppointment(appointment: Appointment, clinicId = this.activeClinicId): void {
    const list = this.getAppointments(clinicId);
    const existingIndex = list.findIndex(a => a.id === appointment.id);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...appointment, updatedAt: new Date().toISOString() };
    } else {
      list.push(appointment);
    }
    list.sort((a, b) => a.time.localeCompare(b.time));
    this.saveAppointments(list, clinicId);
    this.logAudit('UPDATE', 'PATIENT', appointment.patientId, `Agendamento para ${appointment.patientName} às ${appointment.time}`, clinicId);
  }

  public updateAppointmentStatus(id: string, status: AppointmentStatus, clinicId = this.activeClinicId): void {
    const list = this.getAppointments(clinicId);
    const apt = list.find(a => a.id === id);
    if (apt) {
      apt.status = status;
      apt.updatedAt = new Date().toISOString();
      this.saveAppointments(list, clinicId);
      this.logAudit('UPDATE', 'PATIENT', apt.patientId, `Status de agendamento alterado para ${status}`, clinicId);
    }
  }

  public deleteAppointment(id: string, clinicId = this.activeClinicId): void {
    const list = this.getAppointments(clinicId).filter(a => a.id !== id);
    this.saveAppointments(list, clinicId);
    this.logAudit('DELETE', 'PATIENT', id, 'Agendamento removido da agenda', clinicId);
  }

  // --- AUDITORIA LGPD ---
  public getAuditLogs(clinicId = this.activeClinicId): AuditLogEntry[] {
    try {
      const raw = localStorage.getItem(this.getKey('audit_logs', clinicId));
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public logAudit(
    action: AuditLogEntry['action'],
    resourceType: AuditLogEntry['resourceType'],
    resourceId: string,
    details: string,
    clinicId = this.activeClinicId
  ): void {
    const list = this.getAuditLogs(clinicId);
    const entry: AuditLogEntry = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      userId: 'dr-meirelles',
      userName: 'Dr. Rudson Meirelles',
      action,
      resourceType,
      resourceId,
      details: `[${clinicId.toUpperCase()}] ${details}`
    };
    list.unshift(entry);
    localStorage.setItem(this.getKey('audit_logs', clinicId), JSON.stringify(list.slice(0, 500)));
  }

  public getPendingSyncCount(): number {
    const encounters = this.getEncounters();
    return encounters.filter(e => e.syncStatus === 'pending_sync').length;
  }

  // Dados iniciais específicos por consultório (IVS inicia 100% limpo, apenas dados reais cadastrados pelo usuário)
  private getInitialPatientsForClinic(clinicId: string): Patient[] {
    if (clinicId === 'ivs') {
      return [];
    } else if (clinicId === 'megastar') {
      return [
        {
          id: 'p2-megastar',
          fullName: 'Juan Carlos Benítez',
          birthDate: '1978-08-22',
          sex: 'M',
          nationality: 'PY',
          documentType: 'CI_PY',
          documentNumber: '4.892.120',
          phoneCountryCode: '+595',
          phone: '+595 981 456789',
          city: 'Ciudad del Este',
          country: 'Paraguai',
          notes: 'Presbiopia progressiva e necessidade de novos óculos multifocais.',
          lgpdConsent: true,
          lgpdConsentDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    } else if (clinicId === 'vision') {
      return [
        {
          id: 'p3-vision',
          fullName: 'Enzo Gabriel Silva (Menor)',
          birthDate: '2018-03-10',
          sex: 'M',
          nationality: 'BR',
          documentType: 'RG',
          documentNumber: '12.345.678-9',
          phoneCountryCode: '+55',
          phone: '+55 (45) 97777-8888',
          city: 'Foz do Iguaçu',
          country: 'Brasil',
          guardianName: 'Juliana Silva (Mãe)',
          notes: 'Triagem visual escolar infantil.',
          lgpdConsent: true,
          lgpdConsentDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    }
    return [];
  }

  // --- LEMBRETES DE RETORNO (SOLICITADOS PELO EXAMINADOR) ---
  public getReturnReminders(clinicId = this.activeClinicId): ReturnReminder[] {
    const encounters = this.getEncounters(clinicId);
    const patients = this.getPatients(clinicId);
    const reminders: ReturnReminder[] = [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    for (const enc of encounters) {
      // Verifica se houve recomendação de semanas de retorno ou texto de retorno
      if (enc.returnInWeeks && enc.returnInWeeks > 0) {
        const patient = patients.find(p => p.id === enc.patientId);
        const encDate = new Date(enc.date);
        
        // Data alvo = data do exame + (returnInWeeks * 7 dias)
        const targetDateObj = new Date(encDate.getTime() + enc.returnInWeeks * 7 * 24 * 60 * 60 * 1000);
        const targetDateStr = targetDateObj.toISOString().split('T')[0];
        
        // Diferença em dias em relação a hoje
        const diffTime = targetDateObj.getTime() - now.getTime();
        const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status: ReturnReminder['status'] = 'upcoming';
        if (daysDiff < 0) {
          status = 'overdue';
        } else if (daysDiff <= 7) {
          status = 'due_this_week';
        }

        reminders.push({
          id: enc.id,
          patientId: enc.patientId,
          patientName: patient?.fullName || 'Paciente',
          patientPhone: patient?.phone,
          patientNationality: patient?.nationality || 'BR',
          encounterDate: enc.date,
          returnWeeks: enc.returnInWeeks,
          targetDate: targetDateStr,
          instructions: enc.returnInstructions || `Retorno em ${enc.returnInWeeks} semanas`,
          examinerName: enc.examinerName || 'Dr. Rudson Meirelles',
          status,
          daysDifference: daysDiff
        });
      }
    }

    // Ordena os que estão atrasados ou com retorno mais próximo primeiro
    return reminders.sort((a, b) => a.daysDifference - b.daysDifference);
  }

  // --- RELATÓRIOS E ESTATÍSTICAS GERENCIAIS ---
  public getReportStats(
    timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' = 'monthly',
    customStart?: string,
    customEnd?: string,
    clinicId = this.activeClinicId
  ): ReportStats {
    const encounters = this.getEncounters(clinicId);
    const prescriptions = this.getPrescriptions(clinicId);
    const patients = this.getPatients(clinicId);

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (timeframe === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (timeframe === 'weekly') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
    } else if (timeframe === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (timeframe === 'yearly') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else if (timeframe === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart + 'T00:00:00');
      endDate = new Date(customEnd + 'T23:59:59');
    }

    // Filtra atendimentos no intervalo
    const filteredEncounters = encounters.filter(e => {
      const d = new Date(e.date);
      return d >= startDate && d <= endDate;
    });

    const filteredPrescriptions = prescriptions.filter(p => {
      const d = new Date(p.date);
      return d >= startDate && d <= endDate;
    });

    // Distribuição por Faixa Etária
    const ageDistribution: AgeGroupDistribution = {
      pediatric: 0,
      young: 0,
      presbyopic: 0,
      senior: 0,
      uninformed: 0
    };

    // Distribuição por Nacionalidade
    const natDistribution = { br: 0, py: 0, other: 0 };

    for (const enc of filteredEncounters) {
      const pat = patients.find(p => p.id === enc.patientId);
      if (pat) {
        if (pat.nationality === 'BR') natDistribution.br++;
        else if (pat.nationality === 'PY') natDistribution.py++;
        else natDistribution.other++;

        const age = calculateAge(pat.birthDate);
        if (!age) {
          ageDistribution.uninformed++;
        } else if (age.years <= 12) {
          ageDistribution.pediatric++;
        } else if (age.years <= 39) {
          ageDistribution.young++;
        } else if (age.years <= 59) {
          ageDistribution.presbyopic++;
        } else {
          ageDistribution.senior++;
        }
      } else {
        ageDistribution.uninformed++;
      }
    }

    // Agrupamento temporal para gráficos
    const periodMap = new Map<string, number>();

    if (timeframe === 'daily') {
      // 8h às 19h
      for (let h = 8; h <= 19; h++) {
        const label = `${h.toString().padStart(2, '0')}:00`;
        periodMap.set(label, 0);
      }
      filteredEncounters.forEach(e => {
        const d = new Date(e.date);
        const h = `${d.getHours().toString().padStart(2, '0')}:00`;
        if (periodMap.has(h)) {
          periodMap.set(h, (periodMap.get(h) || 0) + 1);
        }
      });
    } else if (timeframe === 'weekly') {
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      days.forEach(d => periodMap.set(d, 0));
      filteredEncounters.forEach(e => {
        const d = new Date(e.date);
        const dayName = days[d.getDay()];
        periodMap.set(dayName, (periodMap.get(dayName) || 0) + 1);
      });
    } else if (timeframe === 'monthly') {
      // Dias 1 a 31
      const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i += 2) {
        periodMap.set(`Dia ${i}`, 0);
      }
      filteredEncounters.forEach(e => {
        const d = new Date(e.date);
        const day = d.getDate();
        // Agrupa por faixas ou dia par mais próximo
        const bucket = `Dia ${day % 2 === 0 ? day : day}`;
        periodMap.set(bucket, (periodMap.get(bucket) || 0) + 1);
      });
    } else if (timeframe === 'yearly') {
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      months.forEach(m => periodMap.set(m, 0));
      filteredEncounters.forEach(e => {
        const d = new Date(e.date);
        const m = months[d.getMonth()];
        periodMap.set(m, (periodMap.get(m) || 0) + 1);
      });
    }

    const consultationsByPeriod = Array.from(periodMap.entries()).map(([label, count]) => ({
      label,
      count
    }));

    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const averagePerDay = Number((filteredEncounters.length / totalDays).toFixed(1));

    return {
      totalConsultations: filteredEncounters.length,
      completedConsultations: filteredEncounters.filter(e => e.status === 'completed').length,
      totalPrescriptions: filteredPrescriptions.length,
      totalPatients: patients.length,
      averagePerDay,
      nationalityDistribution: natDistribution,
      ageDistribution,
      timeframe,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      consultationsByPeriod
    };
  }

  // --- RESTAURAÇÃO E IMPORTAÇÃO DO BANCO DE DADOS ---
  public restoreBackup(jsonData: any, clinicId = this.activeClinicId): boolean {
    try {
      if (jsonData.patients && Array.isArray(jsonData.patients)) {
        this.savePatients(jsonData.patients, clinicId);
      }
      if (jsonData.encounters && Array.isArray(jsonData.encounters)) {
        this.saveEncounters(jsonData.encounters, clinicId);
      }
      if (jsonData.prescriptions && Array.isArray(jsonData.prescriptions)) {
        localStorage.setItem(this.getKey('prescriptions', clinicId), JSON.stringify(jsonData.prescriptions));
      }
      if (jsonData.appointments && Array.isArray(jsonData.appointments)) {
        this.saveAppointments(jsonData.appointments, clinicId);
      }
      this.logAudit('UPDATE', 'PATIENT', 'DATABASE_RESTORE', 'Restauração de backup do banco de dados realizada com sucesso', clinicId);
      return true;
    } catch {
      return false;
    }
  }

  // --- LIMPEZA DE DADOS FICTÍCIOS / ZERAR CONSULTÓRIO PARA DADOS 100% REAIS ---
  public clearClinicData(clinicId = this.activeClinicId): void {
    try {
      localStorage.removeItem(this.getKey('patients', clinicId));
      localStorage.removeItem(this.getKey('encounters', clinicId));
      localStorage.removeItem(this.getKey('prescriptions', clinicId));
      localStorage.removeItem(this.getKey('appointments', clinicId));
      localStorage.removeItem(this.getKey('financial_transactions', clinicId));
      localStorage.removeItem(this.getKey('work_sessions', clinicId));
      
      // Salva explicitamente arrays vazios para evitar recriação de mocks automáticos
      this.savePatients([], clinicId);
      this.saveEncounters([], clinicId);
      this.saveAppointments([], clinicId);
      this.saveTransactions([], clinicId);
      this.saveWorkSessions([], clinicId);

      this.logAudit('DELETE', 'PATIENT', 'DATABASE_CLEAR', 'Dados fictícios removidos do consultório; pronto para dados 100% reais.', clinicId);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('optomed_appointment_updated', { detail: { clinicId, appointments: [] } }));
        window.dispatchEvent(new CustomEvent('optomed_finance_updated', { detail: { clinicId } }));
      }
    } catch {}
  }

  // --- RESTAURAÇÃO HISTÓRICA COMPLETA DE DADOS CLÍNICOS E PACIENTES (DESDE 25/08/2026) ---
  public restoreRecoveredHistoricalData(clinicId = 'ivs'): void {
    try {
      // 1. Pacientes: mescla sem duplicar
      const currentPatients = this.getPatients(clinicId);
      const patientMap = new Map<string, Patient>();
      currentPatients.forEach(p => patientMap.set(p.id, p));

      RECOVERED_RECORDS.forEach(rec => {
        if (!patientMap.has(rec.patient.id)) {
          patientMap.set(rec.patient.id, rec.patient as Patient);
        }
      });
      const updatedPatients = Array.from(patientMap.values());
      this.savePatients(updatedPatients, clinicId);

      // 2. Prontuários (Encounters): mescla sem duplicar
      const currentEncounters = this.getEncounters(clinicId);
      const encounterMap = new Map<string, ClinicalEncounter>();
      currentEncounters.forEach(e => encounterMap.set(e.id, e));

      RECOVERED_RECORDS.forEach(rec => {
        if (rec.encounter && !encounterMap.has(rec.encounter.id)) {
          encounterMap.set(rec.encounter.id, rec.encounter as ClinicalEncounter);
        }
      });
      const updatedEncounters = Array.from(encounterMap.values());
      this.saveEncounters(updatedEncounters, clinicId);

      // 3. Receitas ópticas (Prescriptions): mescla sem duplicar
      const currentPrescriptions = this.getPrescriptions(clinicId);
      const prescriptionMap = new Map<string, Prescription>();
      currentPrescriptions.forEach(p => prescriptionMap.set(p.id, p));

      RECOVERED_RECORDS.forEach(rec => {
        if (rec.prescription && !prescriptionMap.has(rec.prescription.id)) {
          prescriptionMap.set(rec.prescription.id, rec.prescription as Prescription);
        }
      });
      const updatedPrescriptions = Array.from(prescriptionMap.values());
      localStorage.setItem(this.getKey('prescriptions', clinicId), JSON.stringify(updatedPrescriptions));

      // 4. Agendamentos históricos para a agenda e painel do médico
      const currentApts = this.getAppointments(clinicId);
      const aptMap = new Map<string, Appointment>();
      currentApts.forEach(a => aptMap.set(a.id, a));

      RECOVERED_RECORDS.forEach((rec, idx) => {
        const aptId = `apt-rec-${rec.patient.id}`;
        if (!aptMap.has(aptId)) {
          const encDate = rec.encounter?.date || rec.patient.createdAt;
          const dateStr = encDate ? encDate.split('T')[0] : '2026-09-08';
          const timeStr = encDate && encDate.includes('T')
            ? new Date(encDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : '08:30';

          aptMap.set(aptId, {
            id: aptId,
            patientId: rec.patient.id,
            patientName: rec.patient.fullName,
            patientNationality: rec.patient.nationality || 'BR',
            patientPhone: rec.patient.phone,
            patientDocument: rec.patient.documentNumber,
            examinerId: 'user-examinador',
            examinerName: 'Dr. Rudson Meirelles',
            date: dateStr,
            time: timeStr,
            durationMinutes: 3,
            type: 'refrativo',
            status: rec.encounter?.status === 'completed' ? 'completed' : 'in_consultation',
            ticketNumber: `P-${String(idx + 1).padStart(2, '0')}`,
            notes: rec.patient.notes || 'Atendimento registrado no consultório.',
            room: 'Consultório 1',
            createdAt: rec.patient.createdAt,
            updatedAt: rec.patient.updatedAt
          });
        }
      });
      const updatedApts = Array.from(aptMap.values());
      this.saveAppointments(updatedApts, clinicId);

      this.logAudit('UPDATE', 'PATIENT', 'HISTORICAL_RECOVERY', `Recuperados com sucesso ${RECOVERED_RECORDS.length} pacientes e prontuários históricos desde 25/08/2026`, clinicId);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('optomed_appointment_updated', { detail: { clinicId, appointments: updatedApts } }));
      }
    } catch (e) {
      console.error('Erro na recuperação histórica:', e);
    }
  }

  // Remove dados fictícios conhecidos (Maria Helena, Enzo Gabriel, Juan Carlos Benítez) de um consultório
  public removeMockPatients(clinicId = this.activeClinicId): void {
    const mockNames = [
      'maria helena dos santos',
      'maria helena',
      'enzo gabriel silva (menor)',
      'enzo gabriel silva',
      'juan carlos benítez',
      'juan carlos benitez'
    ];

    // 1. Filtrar pacientes
    const currentPatients = this.getPatients(clinicId);
    const mockPatientIds = currentPatients
      .filter(p => mockNames.includes(p.fullName.toLowerCase().trim()))
      .map(p => p.id);

    const realPatients = currentPatients.filter(p => !mockNames.includes(p.fullName.toLowerCase().trim()));
    this.savePatients(realPatients, clinicId);

    // 2. Filtrar agendamentos
    const currentApts = this.getAppointments(clinicId);
    const realApts = currentApts.filter(a => !mockNames.includes(a.patientName.toLowerCase().trim()) && !mockPatientIds.includes(a.patientId));
    this.saveAppointments(realApts, clinicId);

    // 3. Filtrar prontuários (por patientId ou prescrição)
    const currentEncounters = this.getEncounters(clinicId);
    const realEncounters = currentEncounters.filter(e => {
      if (mockPatientIds.includes(e.patientId)) return false;
      if (e.prescription?.patientName && mockNames.includes(e.prescription.patientName.toLowerCase().trim())) return false;
      return true;
    });
    this.saveEncounters(realEncounters, clinicId);

    // 4. Filtrar transações financeiras vinculadas a pacientes fictícios
    const currentTxs = this.getTransactions(clinicId);
    const realTxs = currentTxs.filter(t => !t.patientName || !mockNames.includes(t.patientName.toLowerCase().trim()));
    this.saveTransactions(realTxs, clinicId);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_appointment_updated', { detail: { clinicId, appointments: realApts } }));
      window.dispatchEvent(new CustomEvent('optomed_finance_updated', { detail: { clinicId } }));
    }
  }

  // --- MÓDULO DE GESTÃO FINANCEIRA & PDV (FLUXO DE CAIXA) ---
  public getTransactions(clinicId = this.activeClinicId): FinancialTransaction[] {
    try {
      const raw = localStorage.getItem(this.getKey('financial_transactions', clinicId));
      if (!raw) {
        const initial = this.getInitialTransactionsForClinic(clinicId);
        this.saveTransactions(initial, clinicId);
        return initial;
      }
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveTransactions(transactions: FinancialTransaction[], clinicId = this.activeClinicId): void {
    localStorage.setItem(this.getKey('financial_transactions', clinicId), JSON.stringify(transactions));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('optomed_finance_updated', { detail: { clinicId } }));
    }
  }

  public saveTransaction(tx: FinancialTransaction, clinicId = this.activeClinicId): void {
    const list = this.getTransactions(clinicId);
    const idx = list.findIndex(t => t.id === tx.id);
    if (idx >= 0) {
      list[idx] = tx;
    } else {
      list.unshift(tx);
    }
    this.saveTransactions(list, clinicId);
    this.logAudit(
      'CREATE', 
      'FINANCE' as any, 
      tx.id, 
      `${tx.type === 'income' ? 'Entrada' : 'Saída'} de R$ ${tx.amount.toFixed(2)} - ${tx.description}`, 
      clinicId
    );
  }

  public deleteTransaction(id: string, clinicId = this.activeClinicId): void {
    const list = this.getTransactions(clinicId).filter(t => t.id !== id);
    this.saveTransactions(list, clinicId);
    this.logAudit('DELETE', 'FINANCE' as any, id, 'Lançamento financeiro removido', clinicId);
  }

  public settleTransaction(id: string, isSettled: boolean = true, clinicId = this.activeClinicId): void {
    const list = this.getTransactions(clinicId);
    const idx = list.findIndex(t => t.id === id);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        isSettled,
        settledAt: isSettled ? new Date().toISOString() : undefined
      };
      this.saveTransactions(list, clinicId);
      this.logAudit('UPDATE', 'FINANCE' as any, id, `Lançamento ${isSettled ? 'liquidado (baixa efetuada)' : 'reaberto'} no financeiro`, clinicId);
    }
  }

  public getCashRegisterSummary(dateStr?: string, clinicId = this.activeClinicId): CashRegisterSummary {
    const today = dateStr || new Date().toISOString().split('T')[0];
    const txs = this.getTransactions(clinicId).filter(t => t.date === today && t.status === 'completed');

    const totalIncome = txs
      .filter(t => t.type === 'income')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const totalExpense = txs
      .filter(t => t.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0);

    return {
      date: today,
      openingBalance: 0,
      totalIncome,
      totalExpense,
      currentBalance: totalIncome - totalExpense,
      transactionsCount: txs.length
    };
  }

  // --- ITENS DE PDV & TABELA DE PREÇOS DA CLÍNICA ---
  public getPOSItems(clinicId = this.activeClinicId): POSItem[] {
    try {
      const raw = localStorage.getItem(this.getKey('pos_items', clinicId));
      if (!raw) {
        const initial = this.getDefaultPOSItems();
        this.savePOSItems(initial, clinicId);
        return initial;
      }
      return JSON.parse(raw);
    } catch {
      return this.getDefaultPOSItems();
    }
  }

  public savePOSItems(items: POSItem[], clinicId = this.activeClinicId): void {
    localStorage.setItem(this.getKey('pos_items', clinicId), JSON.stringify(items));
  }

  public savePOSItem(item: POSItem, clinicId = this.activeClinicId): void {
    const list = this.getPOSItems(clinicId);
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    this.savePOSItems(list, clinicId);
  }

  private getDefaultPOSItems(clinicId = this.activeClinicId): POSItem[] {
    const isIvs = clinicId === 'ivs';
    return [
      { 
        id: 'pos_1', 
        name: 'Consulta Oftalmológica / Refração Completa', 
        category: 'consulta', 
        price: isIvs ? 50.00 : 150.00, 
        isActive: true 
      },
      { 
        id: 'pos_2', 
        name: 'Consulta de Retorno (Não Cobrar)', 
        category: 'consulta', 
        price: 0.00, 
        isActive: true 
      },
      { id: 'pos_3', name: 'Exame de Tonometria de Aplanação', category: 'exame', price: isIvs ? 40.00 : 80.00, isActive: true },
      { id: 'pos_4', name: 'Mapeamento de Retina / Fundoscopia', category: 'exame', price: isIvs ? 80.00 : 120.00, isActive: true },
      { id: 'pos_5', name: 'Adaptação e Teste de Lentes de Contato', category: 'servico', price: isIvs ? 60.00 : 100.00, isActive: true },
      { id: 'pos_6', name: 'Armação Receituário Premium', category: 'produto', price: 250.00, isActive: true },
      { id: 'pos_7', name: 'Lentes com Filtro de Luz Azul & Antirreflexo', category: 'produto', price: 200.00, isActive: true }
    ];
  }

  // --- REGIME DE TRABALHO & ACERTO FINANCEIRO DO EXAMINADOR (DR. MEIRELLES / IVS) ---
  public getWorkSessions(clinicId = this.activeClinicId): ProfessionalWorkSession[] {
    try {
      const raw = localStorage.getItem(this.getKey('work_sessions', clinicId));
      if (!raw) {
        const initial = this.getInitialWorkSessionsForClinic(clinicId);
        this.saveWorkSessions(initial, clinicId);
        return initial;
      }
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveWorkSessions(sessions: ProfessionalWorkSession[], clinicId = this.activeClinicId): void {
    localStorage.setItem(this.getKey('work_sessions', clinicId), JSON.stringify(sessions));
  }

  public saveWorkSession(session: ProfessionalWorkSession, clinicId = this.activeClinicId): void {
    const list = this.getWorkSessions(clinicId);
    const idx = list.findIndex(s => s.id === session.id);
    if (idx >= 0) {
      list[idx] = session;
    } else {
      list.unshift(session);
    }
    this.saveWorkSessions(list, clinicId);
    this.logAudit('CREATE', 'FINANCE' as any, session.id, `Sessão de trabalho registrada: ${session.contractType} para ${session.examinerName}`, clinicId);
  }

  public getProfessionalSettlementReport(examinerName = 'Dr. Rudson Meirelles', clinicId = this.activeClinicId): ProfessionalSettlementReport {
    const summary = this.getCashRegisterSummary(undefined, clinicId);
    const isIvs = clinicId === 'ivs';

    // Para o IVS, compor a somatória detalhada solicitada pelo Dr. Meirelles
    if (isIvs) {
      const previousBalancePending = 550.00; // Saldo da semana passada a pagar
      const dailyEntries: ProfessionalSettlementReport['dailyEntries'] = [
        {
          date: '2026-09-03',
          dayLabel: '03/09/2026 (Quinta-feira)',
          type: 'consultas',
          description: '12 Consultas Clínicas / Refração Realizadas',
          quantity: 12,
          unitPrice: 50.00,
          totalAmount: 600.00
        },
        {
          date: '2026-09-04',
          dayLabel: '04/09/2026 (Sexta-feira)',
          type: 'consultas',
          description: '5 Consultas Clínicas / Refração Realizadas',
          quantity: 5,
          unitPrice: 50.00,
          totalAmount: 250.00
        },
        {
          date: '2026-09-05',
          dayLabel: '05/09/2026 (Sábado - Hoje)',
          type: 'meia_diaria',
          description: 'Atendimento por Período (5h) / Meia Diária',
          quantity: 1,
          unitPrice: 500.00,
          totalAmount: 500.00
        }
      ];

      const totalConsultationsCount = 17;
      const totalProductionAmount = dailyEntries.reduce((acc, curr) => acc + curr.totalAmount, 0); // R$ 1.350,00
      const totalPayableAmount = previousBalancePending + totalProductionAmount; // R$ 1.900,00

      return {
        examinerName,
        periodDescription: 'Semana de 31/08/2026 a 05/09/2026',
        previousBalancePending,
        dailyEntries,
        totalConsultationsCount,
        totalProductionAmount,
        totalPayableAmount,
        currentCashBalance: summary.currentBalance,
        hasCashAvailability: summary.currentBalance >= totalPayableAmount,
        settlementStatus: 'pending'
      };
    }

    // Padrão para outras clínicas
    return {
      examinerName,
      periodDescription: 'Semana Atual',
      previousBalancePending: 0,
      dailyEntries: [],
      totalConsultationsCount: 0,
      totalProductionAmount: 0,
      totalPayableAmount: 0,
      currentCashBalance: summary.currentBalance,
      hasCashAvailability: true,
      settlementStatus: 'pending'
    };
  }

  private getInitialWorkSessionsForClinic(clinicId: string): ProfessionalWorkSession[] {
    if (clinicId === 'ivs') {
      return [
        {
          id: 'sess_ivs_1',
          clinicId: 'ivs',
          examinerId: 'user-examinador',
          examinerName: 'Dr. Rudson Meirelles',
          date: '2026-09-03',
          contractType: 'per_consultation',
          baseAmount: 50.00,
          notes: '12 consultas realizadas',
          status: 'closed',
          createdAt: '2026-09-03T18:00:00Z'
        },
        {
          id: 'sess_ivs_2',
          clinicId: 'ivs',
          examinerId: 'user-examinador',
          examinerName: 'Dr. Rudson Meirelles',
          date: '2026-09-04',
          contractType: 'per_consultation',
          baseAmount: 50.00,
          notes: '5 consultas realizadas',
          status: 'closed',
          createdAt: '2026-09-04T18:00:00Z'
        },
        {
          id: 'sess_ivs_3',
          clinicId: 'ivs',
          examinerId: 'user-examinador',
          examinerName: 'Dr. Rudson Meirelles',
          date: '2026-09-05',
          contractType: 'period_half_day',
          baseAmount: 500.00,
          notes: 'Atendimento por Período de 5h (Meia Diária)',
          status: 'active',
          createdAt: '2026-09-05T08:00:00Z'
        }
      ];
    }
    return [];
  }

  private getInitialTransactionsForClinic(clinicId: string): FinancialTransaction[] {
    const today = new Date().toISOString().split('T')[0];
    const isIvs = clinicId === 'ivs';
    
    if (isIvs) {
      return [
        // Lançamentos do dia de hoje (05/09/2026)
        {
          id: `tx_${clinicId}_1`,
          clinicId,
          type: 'income',
          category: 'consulta',
          description: 'Consulta Oftalmológica & Exame de Refração - Maria Helena',
          amount: 50.00,
          date: today,
          paymentMethod: 'pix',
          patientName: 'Maria Helena dos Santos',
          receiptNumber: 'REC-2026-8801',
          status: 'completed',
          createdBy: 'Recepção',
          createdAt: new Date().toISOString()
        },
        {
          id: `tx_${clinicId}_2`,
          clinicId,
          type: 'income',
          category: 'consulta',
          description: 'Consulta de Retorno (Controle de Rotina) - Retorno Gratuito',
          amount: 0.00,
          date: today,
          paymentMethod: 'cash',
          patientName: 'Enzo Gabriel Silva',
          receiptNumber: 'REC-2026-8802',
          status: 'completed',
          createdBy: 'Recepção',
          createdAt: new Date().toISOString()
        },
        {
          id: `tx_${clinicId}_3`,
          clinicId,
          type: 'income',
          category: 'venda_lentes',
          description: 'Venda de Óculos Completo + Lentes Antirreflexo',
          amount: 450.00,
          date: today,
          paymentMethod: 'credit_card',
          patientName: 'Juan Carlos Benítez',
          receiptNumber: 'REC-2026-8803',
          status: 'completed',
          createdBy: 'Recepção',
          createdAt: new Date().toISOString()
        },
        {
          id: `tx_${clinicId}_4`,
          clinicId,
          type: 'income',
          category: 'consulta',
          description: 'Faturamento de Consultas do Dia 03/09 (12 atendimentos a R$ 50)',
          amount: 600.00,
          date: '2026-09-03',
          paymentMethod: 'pix',
          receiptNumber: 'REC-2026-8790',
          status: 'completed',
          createdBy: 'Recepção',
          createdAt: '2026-09-03T18:00:00Z'
        },
        {
          id: `tx_${clinicId}_5`,
          clinicId,
          type: 'income',
          category: 'consulta',
          description: 'Faturamento de Consultas do Dia 04/09 (5 atendimentos a R$ 50)',
          amount: 250.00,
          date: '2026-09-04',
          paymentMethod: 'pix',
          receiptNumber: 'REC-2026-8795',
          status: 'completed',
          createdBy: 'Recepção',
          createdAt: '2026-09-04T18:00:00Z'
        },
        {
          id: `tx_${clinicId}_6`,
          clinicId,
          type: 'income',
          category: 'procedimento',
          description: 'Caixa Inicial & Faturamento de Exames Acumulado na Semana',
          amount: 1200.00,
          date: today,
          paymentMethod: 'pix',
          receiptNumber: 'REC-2026-8800',
          status: 'completed',
          createdBy: 'Administração',
          createdAt: new Date().toISOString()
        }
      ];
    }

    return [
      {
        id: `tx_${clinicId}_1`,
        clinicId,
        type: 'income',
        category: 'consulta',
        description: 'Consulta Oftalmológica & Exame de Refração - Maria Helena',
        amount: 150.00,
        date: today,
        paymentMethod: 'pix',
        patientName: 'Maria Helena dos Santos',
        status: 'completed',
        createdBy: 'Recepção',
        createdAt: new Date().toISOString()
      },
      {
        id: `tx_${clinicId}_2`,
        clinicId,
        type: 'income',
        category: 'consulta',
        description: 'Consulta de Retorno (Controle de Rotina) - Retorno Gratuito',
        amount: 0.00,
        date: today,
        paymentMethod: 'cash',
        patientName: 'Enzo Gabriel Silva',
        status: 'completed',
        createdBy: 'Recepção',
        createdAt: new Date().toISOString()
      },
      {
        id: `tx_${clinicId}_3`,
        clinicId,
        type: 'income',
        category: 'venda_lentes',
        description: 'Par de Lentes com Antirreflexo Crizal',
        amount: 200.00,
        date: today,
        paymentMethod: 'credit_card',
        patientName: 'Juan Carlos Benítez',
        status: 'completed',
        createdBy: 'Recepção',
        createdAt: new Date().toISOString()
      },
      {
        id: `tx_${clinicId}_4`,
        clinicId,
        type: 'expense',
        category: 'fornecedor_insumos',
        description: 'Compra de colírios anestésicos e tiras de fluoresceína',
        amount: 55.00,
        date: today,
        paymentMethod: 'pix',
        status: 'completed',
        createdBy: 'Administração',
        createdAt: new Date().toISOString()
      }
    ];
  }

  private getInitialAppointmentsForClinic(clinicId: string): Appointment[] {
    const today = new Date().toISOString().split('T')[0];
    if (clinicId === 'ivs') {
      return [];
    } else if (clinicId === 'megastar') {
      return [
        {
          id: 'apt-ms-1',
          patientId: 'p2-megastar',
          patientName: 'Juan Carlos Benítez',
          patientNationality: 'PY',
          patientPhone: '+595 981 456789',
          patientDocument: '4.892.120',
          examinerId: 'user-examinador',
          examinerName: 'Dr. Rudson Meirelles',
          date: today,
          time: '09:15',
          durationMinutes: 30,
          type: 'consulta_geral',
          status: 'confirmed',
          notes: 'Exame de refração e adaptação de lentes.',
          room: 'Consultório Mega Star',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    } else if (clinicId === 'vision') {
      return [
        {
          id: 'apt-vis-1',
          patientId: 'p3-vision',
          patientName: 'Enzo Gabriel Silva (Menor)',
          patientNationality: 'BR',
          patientPhone: '+55 (45) 97777-8888',
          patientDocument: '12.345.678-9',
          examinerId: 'user-examinador',
          examinerName: 'Dr. Rudson Meirelles',
          date: today,
          time: '10:00',
          durationMinutes: 30,
          type: 'pediatrico',
          status: 'scheduled',
          notes: 'Acompanhado pela mãe.',
          room: 'Consultório Vision',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    }
    return [];
  }
}

export const offlineDb = new OfflineDatabaseService();

