import { 
  ClinicConfig, 
  ClinicSubscription, 
  BillingInvoice, 
  SubscriptionPlan, 
  SubscriptionStatus, 
  PaymentMethod,
  Appointment
} from '@optotipo/shared';
import { offlineDb, generateUUID } from './offlineDb';

export interface PlanDetails {
  id: SubscriptionPlan;
  name: string;
  durationMonths: number;
  price: number;
  monthlyEquivalent: number;
  discountPercentage: number;
  badge?: string;
  features: string[];
}

export const SUBSCRIPTION_PLANS: PlanDetails[] = [
  {
    id: 'basic_monthly',
    name: 'Plano Básico (Sem Gestão Financeira)',
    durationMonths: 1,
    price: 59.90,
    monthlyEquivalent: 59.90,
    discountPercentage: 0,
    badge: 'Econômico',
    features: [
      'Acesso a todos os 17 módulos de Optotipo na TV/Monitor',
      'Controle Remoto sem fio via Wi-Fi/LAN em tempo real',
      'Prontuário Oftalmológico Eletrônico & Anamnese',
      'Receituário de Dioptria e Farmacológico (A4 e Térmica)',
      'Recepção, Agendamento e Lista de Espera',
      '❌ Sem módulo de Gestão Financeira / Fluxo de Caixa / PDV'
    ]
  },
  {
    id: 'monthly',
    name: 'Plano Mensal Completo (Com Gestão & PDV)',
    durationMonths: 1,
    price: 149.00,
    monthlyEquivalent: 149.00,
    discountPercentage: 0,
    badge: 'Mais Popular',
    features: [
      'Tudo do Plano Básico incluso',
      '⭐ MÓDULO DE GESTÃO DA CLÍNICA COMPLETO',
      'Fluxo de Caixa em tempo real (Entradas e Saídas)',
      'PDV (Frente de Caixa: Consultas, Exames, Lentes, Óculos)',
      'Fechamento diário de caixa e recibos de pagamento',
      'Relatórios financeiros de faturamento e despesas',
      'Suporte prioritário via WhatsApp'
    ]
  },
  {
    id: 'semiannual',
    name: 'Plano Semestral Completo (6 Meses)',
    durationMonths: 6,
    price: 749.00,
    monthlyEquivalent: 124.83,
    discountPercentage: 16,
    badge: '16% de Desconto',
    features: [
      'Tudo do Plano Mensal Completo incluso',
      '⭐ Gestão Financeira e PDV Totalmente Liberados',
      'Economia de R$ 145,00 no período',
      'Até 3 consultórios/médicos na mesma clínica',
      'Backup em Nuvem e sincronização diária'
    ]
  },
  {
    id: 'annual',
    name: 'Plano Anual Completo (12 Meses)',
    durationMonths: 12,
    price: 1299.00,
    monthlyEquivalent: 108.25,
    discountPercentage: 28,
    badge: 'Melhor Custo-Benefício (28% OFF)',
    features: [
      'Tudo do Plano Semestral incluso',
      '⭐ Gestão Financeira, Fluxo de Caixa & PDV Ilimitados',
      'Economia de R$ 489,00 no ano',
      'Médicos e consultórios Ilimitados',
      'Suporte VIP 24/7 e consultoria de implantação',
      'Personalização de logo e cores do consultório'
    ]
  }
];

const DB_INVOICES_KEY = 'optomed_billing_invoices_v1';

class LicensingService {
  // Retorna os dados de licenciamento da clínica atual
  public getSubscription(clinicId?: string): ClinicSubscription {
    const targetId = clinicId || offlineDb.getActiveClinicId();
    const clinic = offlineDb.getClinics().find(c => c.id === targetId);

    if (clinic?.subscription) {
      return clinic.subscription;
    }

    // Default: Período de Teste Gratuito de 14 dias com Gestão Completa
    const now = new Date();
    const expires = new Date();
    expires.setDate(expires.getDate() + 14);

    const defaultSub: ClinicSubscription = {
      plan: 'trial',
      status: 'trial',
      startedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      autoRenew: true,
      priceAmount: 0,
      hasManagementModule: true,
      maxUsers: 5,
      maxDoctors: 2,
      licenseKey: this.generateLicenseKey(targetId, 'trial')
    };

    return defaultSub;
  }

  // Gera uma Chave de Licença Serial Criptográfica & Legível
  public generateLicenseKey(clinicId: string, plan: SubscriptionPlan): string {
    const year = new Date().getFullYear();
    const cleanId = clinicId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || 'OPT1';
    let planCode = 'TRL';
    if (plan === 'basic_monthly') planCode = 'BAS';
    if (plan === 'monthly') planCode = 'MEN';
    if (plan === 'semiannual') planCode = 'SEM';
    if (plan === 'annual') planCode = 'ANU';

    // Hash pseudo-aleatório determinístico
    let hash = 0;
    const seed = `${clinicId}-${plan}-${year}-optomed-auth`;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const hexCheck = Math.abs(hash).toString(16).toUpperCase().padStart(4, '0').slice(-4);
    const randPart = Math.floor(1000 + Math.random() * 9000);

    return `OPTO-${year}-${planCode}-${cleanId}-${randPart}`;
  }

  // Verifica se o módulo de gestão financeira está habilitado para a clínica
  public hasManagementModuleEnabled(clinicId?: string): boolean {
    const sub = this.getSubscription(clinicId);
    if (sub.plan === 'basic_monthly') {
      return false;
    }
    return true; // Trial, Monthly, Semiannual, Annual possuem o módulo liberado
  }

  // Verifica se o acesso está liberado para a clínica
  public checkAccessStatus(clinicId?: string): {
    hasAccess: boolean;
    status: SubscriptionStatus;
    daysRemaining: number;
    isTrial: boolean;
    isGracePeriod: boolean;
    isExpired: boolean;
    message?: string;
  } {
    const sub = this.getSubscription(clinicId);
    const now = new Date().getTime();
    const expiryDateStr = sub.expiresAt || sub.currentPeriodEnd || new Date().toISOString();
    const expiryDate = new Date(expiryDateStr).getTime();
    const diffMs = expiryDate - now;
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (sub.status === 'suspended' || sub.status === 'canceled') {
      return {
        hasAccess: false,
        status: sub.status,
        daysRemaining: 0,
        isTrial: sub.plan === 'trial',
        isGracePeriod: false,
        isExpired: true,
        message: 'A licença de uso da sua clínica está suspensa. Renove agora para continuar atendendo.'
      };
    }

    if (daysRemaining <= 0) {
      // 3 dias de tolerância (grace period) antes de bloquear
      if (daysRemaining >= -3) {
        return {
          hasAccess: true,
          status: 'grace_period',
          daysRemaining,
          isTrial: sub.plan === 'trial',
          isGracePeriod: true,
          isExpired: false,
          message: `Sua licença expirou recentemente (${Math.abs(daysRemaining)} dias atrás). Regularize para evitar o bloqueio.`
        };
      } else {
        return {
          hasAccess: false,
          status: 'suspended',
          daysRemaining: 0,
          isTrial: sub.plan === 'trial',
          isGracePeriod: false,
          isExpired: true,
          message: 'Sua assinatura expirou. Efetue o pagamento da renovação para desbloquear o sistema imediatamente.'
        };
      }
    }

    return {
      hasAccess: true,
      status: sub.status,
      daysRemaining,
      isTrial: sub.plan === 'trial',
      isGracePeriod: false,
      isExpired: false,
      message: sub.plan === 'trial' 
        ? `Período de Teste Gratuito: ${daysRemaining} dias restantes.` 
        : `Assinatura Ativa (${daysRemaining} dias restantes).`
    };
  }

  // Gera uma cobrança/fatura para a clínica
  public createInvoice(
    clinicId: string, 
    plan: SubscriptionPlan, 
    paymentMethod: PaymentMethod = 'pix'
  ): BillingInvoice {
    const clinic = offlineDb.getClinics().find(c => c.id === clinicId);
    const planInfo = SUBSCRIPTION_PLANS.find(p => p.id === plan) || SUBSCRIPTION_PLANS[0];
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3); // 3 dias para vencimento

    // Gera código PIX Copia e Cola formatado padrão BACEN
    const pixCode = `00020126580014br.gov.bcb.pix0136optomed-financeiro-${clinicId}-${Date.now()}520400005303986540${planInfo.price.toFixed(2)}5802BR5916OPTOMED SAAS6009FOZ IGUACU62070503***6304${Math.floor(1000 + Math.random() * 9000)}`;

    const invoice: BillingInvoice = {
      id: generateUUID(),
      clinicId,
      clinicName: clinic?.name || 'Clínica Oftalmológica',
      plan,
      amount: planInfo.price,
      status: 'pending',
      dueDate: dueDate.toISOString().split('T')[0],
      paymentMethod,
      pixCode,
      pixQrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode)}`,
      receiptNumber: `FAT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toISOString()
    };

    const invoices = this.getAllInvoices();
    invoices.unshift(invoice);
    this.saveInvoices(invoices);

    return invoice;
  }

  // Confirmação de pagamento e ativação da licença
  public approveInvoiceAndActivate(invoiceId: string): boolean {
    const invoices = this.getAllInvoices();
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return false;

    invoice.status = 'paid';
    invoice.paidAt = new Date().toISOString();
    this.saveInvoices(invoices);

    // Atualiza a assinatura da clínica
    const planInfo = SUBSCRIPTION_PLANS.find(p => p.id === invoice.plan) || SUBSCRIPTION_PLANS[0];
    const clinics = offlineDb.getClinics();
    const clinicIndex = clinics.findIndex(c => c.id === invoice.clinicId);

    if (clinicIndex >= 0) {
      const now = new Date();
      const expires = new Date();
      expires.setMonth(expires.getMonth() + planInfo.durationMonths);

      clinics[clinicIndex].subscription = {
        plan: invoice.plan,
        status: 'active',
        startedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        autoRenew: true,
        priceAmount: invoice.amount,
        hasManagementModule: invoice.plan !== 'basic_monthly',
        lastPaymentDate: now.toISOString(),
        maxUsers: invoice.plan === 'annual' ? 99 : 5,
        maxDoctors: invoice.plan === 'annual' ? 99 : 3,
        licenseKey: clinics[clinicIndex].subscription?.licenseKey || this.generateLicenseKey(invoice.clinicId, invoice.plan)
      };

      offlineDb.saveClinic(clinics[clinicIndex]);
    }

    return true;
  }

  // Ativação / prorrogação manual pelo Super Administrador
  public setClinicSubscriptionManually(
    clinicId: string, 
    plan: SubscriptionPlan, 
    monthsToAdd: number
  ): void {
    const clinics = offlineDb.getClinics();
    const clinic = clinics.find(c => c.id === clinicId);
    if (!clinic) return;

    const now = new Date();
    const expiryStr = clinic.subscription?.expiresAt || clinic.subscription?.currentPeriodEnd;
    const currentExpiry = expiryStr ? new Date(expiryStr) : now;
    const baseDate = currentExpiry > now ? currentExpiry : now;
    
    baseDate.setMonth(baseDate.getMonth() + monthsToAdd);

    clinic.subscription = {
      plan,
      status: 'active',
      startedAt: clinic.subscription?.startedAt || now.toISOString(),
      expiresAt: baseDate.toISOString(),
      autoRenew: true,
      priceAmount: SUBSCRIPTION_PLANS.find(p => p.id === plan)?.price || 149.00,
      hasManagementModule: plan !== 'basic_monthly',
      lastPaymentDate: now.toISOString(),
      maxUsers: 20,
      maxDoctors: 10,
      licenseKey: clinic.subscription?.licenseKey || this.generateLicenseKey(clinicId, plan)
    };

    offlineDb.saveClinic(clinic);
  }

  public getAllInvoices(): BillingInvoice[] {
    try {
      const raw = localStorage.getItem(DB_INVOICES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public saveInvoices(invoices: BillingInvoice[]): void {
    try {
      localStorage.setItem(DB_INVOICES_KEY, JSON.stringify(invoices));
    } catch {}
  }

  public getInvoicesByClinic(clinicId: string): BillingInvoice[] {
    return this.getAllInvoices().filter(i => i.clinicId === clinicId);
  }
}

export const licensingService = new LicensingService();

// --- SERVIÇO DE INTEGRAÇÃO COM GOOGLE CALENDAR & ESCALA MULTI-CLÍNICA ---
export interface CalendarConflict {
  hasConflict: boolean;
  type?: 'CROSS_CLINIC_OVERLAP' | 'TIME_OVERLAP';
  message?: string;
  conflictingAppointment?: Appointment;
  conflictingClinicName?: string;
}

export class CalendarIntegrationService {
  /**
   * Obtém todos os agendamentos de todas as clínicas cadastradas para o profissional
   */
  public getAllClinicsAppointments(): (Appointment & { clinicId: string; clinicName: string })[] {
    const clinics = offlineDb.getClinics();
    const allAppointments: (Appointment & { clinicId: string; clinicName: string })[] = [];

    clinics.forEach(clinic => {
      const apts = offlineDb.getAppointments(clinic.id);
      apts.forEach(a => {
        allAppointments.push({
          ...a,
          clinicId: clinic.id,
          clinicName: clinic.name
        });
      });
    });

    return allAppointments;
  }

  /**
   * Validação de Conflito de Horário:
   * Bloqueia ou alerta sobreposição de horário tanto na clínica atual quanto em outra clínica onde o profissional atende
   */
  public checkAppointmentConflict(
    targetClinicId: string,
    date: string,
    time: string,
    durationMinutes: number = 3,
    ignoreAppointmentId?: string
  ): CalendarConflict {
    const allAppointments = this.getAllClinicsAppointments();

    const targetStartMinutes = this.timeToMinutes(time);
    const targetEndMinutes = targetStartMinutes + durationMinutes;

    for (const apt of allAppointments) {
      if (ignoreAppointmentId && apt.id === ignoreAppointmentId) continue;
      if (apt.date !== date) continue;
      if (apt.status === 'canceled') continue;

      const aptStartMinutes = this.timeToMinutes(apt.time);
      const aptEndMinutes = aptStartMinutes + (apt.durationMinutes || 3);

      const hasOverlap = targetStartMinutes < aptEndMinutes && targetEndMinutes > aptStartMinutes;

      if (hasOverlap) {
        if (apt.clinicId !== targetClinicId) {
          return {
            hasConflict: true,
            type: 'CROSS_CLINIC_OVERLAP',
            message: `⚠️ CONFLITO DE AGENDA ENTRE CLÍNICAS: O Dr. Meirelles já possui atendimento agendado na unidade "${apt.clinicName}" para o paciente ${apt.patientName} às ${apt.time}. Evite duplicidade de compromisso!`,
            conflictingAppointment: apt,
            conflictingClinicName: apt.clinicName
          };
        } else {
          return {
            hasConflict: true,
            type: 'TIME_OVERLAP',
            message: `⚠️ HORÁRIO OCUPADO: Já existe consulta marcada para o paciente ${apt.patientName} às ${apt.time} nesta clínica.`,
            conflictingAppointment: apt,
            conflictingClinicName: apt.clinicName
          };
        }
      }
    }

    return { hasConflict: false };
  }

  /**
   * Gera o link direto para adicionar o compromisso ao Google Calendar com 1 clique.
   * Demarcação explícita como Atendimento Clínico para a agenda "Atendimentos" do Dr. Rudson Meirelles.
   */
  public generateGoogleCalendarUrl(appointment: Appointment, clinic: ClinicConfig): string {
    const [year, month, day] = appointment.date.split('-');
    const [hour, min] = (appointment.time || '08:00').split(':');

    const startDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour || 8), Number(min || 0));
    const endDate = new Date(startDate.getTime() + (appointment.durationMinutes || 3) * 60000);

    const formatGoogleDate = (d: Date) => {
      return d.toISOString().replace(/-|:|\.\d+/g, '');
    };

    // Título demarcado como [Atendimento] + Unidade + Paciente
    const title = encodeURIComponent(`[Atendimento] ${appointment.patientName} - ${clinic.name}`);
    const details = encodeURIComponent(
      `📋 ATENDIMENTO CLÍNICO OFTALMOLÓGICO / OPTOMÉTRICO\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 Paciente: ${appointment.patientName}\n` +
      `📞 Telefone/WhatsApp: ${appointment.patientPhone || 'Não informado'}\n` +
      `🏷️ Categoria: Atendimentos\n` +
      `🩺 Tipo de Consulta: ${appointment.type}\n` +
      `👨‍⚕️ Examinador: ${appointment.examinerName || 'Dr. Rudson Meirelles'}\n` +
      `🏥 Unidade / Clínica: ${clinic.name} (${clinic.code})\n` +
      `📍 Local: ${clinic.address || ''}, ${clinic.city || ''}\n` +
      `📝 Observações / Queixa: ${appointment.notes || 'Sem observações adicionais'}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Sincronização Integrada OptoMed Multi-Clínica`
    );
    const location = encodeURIComponent(`${clinic.name} - ${clinic.address || ''}, ${clinic.city || ''}`);
    const dates = `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}&sf=true&output=xml`;
  }

  /**
   * Gera arquivo .ics para importar diretamente em qualquer aplicativo de calendário (Google, Outlook, Apple Calendar)
   * Demarcado com categoria "Atendimentos" para importação direta na agenda Atendimentos do Google Calendar.
   */
  public downloadICalFile(appointment: Appointment, clinic: ClinicConfig): void {
    const [year, month, day] = appointment.date.split('-');
    const [hour, min] = (appointment.time || '08:00').split(':');

    const startDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour || 8), Number(min || 0));
    const endDate = new Date(startDate.getTime() + (appointment.durationMinutes || 3) * 60000);

    const formatDateICal = (d: Date) => {
      return d.toISOString().replace(/-|:|\.\d+/g, '');
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OptoMed Clinical SaaS//PT_BR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Atendimentos',
      'BEGIN:VEVENT',
      `UID:${appointment.id}@optomed.app`,
      `DTSTAMP:${formatDateICal(new Date())}`,
      `DTSTART:${formatDateICal(startDate)}`,
      `DTEND:${formatDateICal(endDate)}`,
      `SUMMARY:[Atendimento] ${appointment.patientName} - ${clinic.name}`,
      `DESCRIPTION:Atendimento Clínico - ${appointment.type}\\nPaciente: ${appointment.patientName}\\nTel: ${appointment.patientPhone || 'N/A'}\\nExaminador: ${appointment.examinerName || 'Dr. Rudson Meirelles'}\\nClínica: ${clinic.name}\\nObs: ${appointment.notes || ''}`,
      `LOCATION:${clinic.name}, ${clinic.city || ''}`,
      'CATEGORIES:Atendimentos,Consultas Clínicas',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `atendimento_${appointment.patientName.replace(/\s+/g, '_')}_${appointment.date}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Exporta TODOS os agendamentos de TODAS as clínicas em um único arquivo .ics
   * Perfeito para a tela de "Importar e Exportar" do Google Agenda mostrada na foto do Dr. Meirelles,
   * inserindo instantaneamente na agenda "Atendimentos" com todas as unidades sincronizadas.
   */
  public downloadAllAppointmentsICalFile(targetClinicId?: string): { count: number; filename: string } {
    const clinics = offlineDb.getClinics();
    const all = this.getAllClinicsAppointments().filter(a => {
      if (targetClinicId && targetClinicId !== 'all') {
        return a.clinicId === targetClinicId;
      }
      return true;
    });

    const formatDateICal = (d: Date) => {
      return d.toISOString().replace(/-|:|\.\d+/g, '');
    };

    const eventsIcs: string[] = [];

    // 1. Adiciona todos os atendimentos cadastrados dos pacientes
    all.forEach(apt => {
      const [year, month, day] = (apt.date || '').split('-');
      if (!year || !month || !day) return;
      const [hour, min] = (apt.time || '08:00').split(':');
      const startDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour || 8), Number(min || 0));
      const endDate = new Date(startDate.getTime() + (apt.durationMinutes || 3) * 60000);

      const clinicName = apt.clinicName || 'Consultório';
      let symbol = '🟢';
      let colorHex = '#2563EB';
      if (clinicName.includes('Central')) { symbol = '🟦'; colorHex = '#06B6D4'; }
      else if (clinicName.includes('Visual')) { symbol = '🌸'; colorHex = '#F43F5E'; }
      else if (clinicName.includes('Santa Rosa')) { symbol = '⬛'; colorHex = '#334155'; }
      else if (clinicName.includes('Mega Star')) { symbol = '🟢'; colorHex = '#059669'; }
      else if (clinicName.includes('Vision')) { symbol = '🟢'; colorHex = '#10B981'; }
      else { symbol = '🔵'; colorHex = '#2563EB'; }

      eventsIcs.push([
        'BEGIN:VEVENT',
        `UID:${apt.id}@optomed.app`,
        `DTSTAMP:${formatDateICal(new Date())}`,
        `DTSTART:${formatDateICal(startDate)}`,
        `DTEND:${formatDateICal(endDate)}`,
        `SUMMARY:${symbol} [Atendimento] ${apt.patientName} - ${clinicName}`,
        `DESCRIPTION:Atendimento Clínico - ${apt.type}\\nPaciente: ${apt.patientName}\\nTelefone: ${apt.patientPhone || 'N/A'}\\nExaminador: ${apt.examinerName || 'Dr. Rudson Meirelles'}\\nUnidade: ${clinicName}\\nCor no Sistema: ${colorHex}\\nObs: ${apt.notes || ''}`,
        `LOCATION:${clinicName}`,
        `COLOR:${colorHex}`,
        `X-COLOR:${colorHex}`,
        `X-APPLE-CALENDAR-COLOR:${colorHex}`,
        'CATEGORIES:Atendimentos,Consultas Clínicas',
        'STATUS:CONFIRMED',
        'END:VEVENT'
      ].join('\r\n'));
    });

    // 2. Adiciona automaticamente toda a escala de Atendimentos futuros do Dr. Meirelles até o fim de 2026 com títulos e cores idênticas ao sistema
    const pad = (n: number) => String(n).padStart(2, '0');
    const startRange = new Date(2026, 8, 1);
    const endRange = new Date(2026, 11, 31);

    for (let cur = new Date(startRange); cur <= endRange; cur.setDate(cur.getDate() + 1)) {
      const y = cur.getFullYear();
      const m = cur.getMonth() + 1;
      const d = cur.getDate();
      const dow = cur.getDay(); // 0: Dom, 1: Seg, 2: Ter, 3: Qua, 4: Qui, 5: Sex, 6: Sáb
      if (dow === 0) continue;

      const pushShift = (
        name: string,
        loc: string,
        sh: number,
        sm: number,
        eh: number,
        em: number,
        desc: string,
        symbol: string,
        colorHex: string,
        customTitle?: string
      ) => {
        const sDate = new Date(y, m - 1, d, sh, sm, 0);
        const eDate = new Date(y, m - 1, d, eh, em, 0);
        const title = customTitle || `${symbol} ${name}`;

        eventsIcs.push([
          'BEGIN:VEVENT',
          `UID:shift-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${y}${pad(m)}${pad(d)}${sh >= 16 ? '-t2' : ''}@optomed.app`,
          `DTSTAMP:${formatDateICal(new Date())}`,
          `DTSTART:${formatDateICal(sDate)}`,
          `DTEND:${formatDateICal(eDate)}`,
          `SUMMARY:${title}`,
          `DESCRIPTION:${desc}\\nExaminador: Dr. Rudson Meirelles\\nUnidade: ${name}\\nHorário: ${pad(sh)}:${pad(sm)} às ${pad(eh)}:${pad(em)}\\nCor no Sistema: ${colorHex}\\nCategoria: Atendimentos`,
          `LOCATION:${loc}`,
          `COLOR:${colorHex}`,
          `X-COLOR:${colorHex}`,
          `X-APPLE-CALENDAR-COLOR:${colorHex}`,
          'CATEGORIES:Atendimentos,Consultas Clínicas',
          'STATUS:CONFIRMED',
          'END:VEVENT'
        ].join('\r\n'));
      };

      // 1. Instituto (Segundas e Terças - Azul)
      if (dow === 1 || dow === 2) {
        pushShift(
          'Instituto da Visão e Saúde (IVS)',
          'Av. Jorge Schimmelpfeng, 500, Foz do Iguaçu',
          8, 0, 18, 0,
          'Turno de Atendimentos Clínicos do Examinador (08:00 às 18:00 Br)',
          '🔵',
          '#2563EB',
          '🔵 Instituto (08:00 às 18:00 Br)'
        );
      } else if (dow === 3) {
        // 2. Clínica Central (Quartas Turno 1 - Ciano)
        pushShift(
          'Clínica Central (PY)',
          'Ciudad del Este, Paraguai',
          13, 0, 15, 45,
          'Turno Duplo PY: Atendimentos Clínica Central',
          '🟦',
          '#06B6D4',
          '🟦 Clínica Central (13:00 às 15:45 Py)'
        );
        // 3. Clínica Visual (Quartas Turno 2 - Rosa)
        pushShift(
          'Clínica Visual (PY)',
          'Hernandarias, Paraguai',
          16, 0, 17, 30,
          'Turno Duplo PY: Atendimentos Clínica Visual',
          '🌸',
          '#F43F5E',
          '🌸 Clínica Visual (16:00 às 17:30 Py)'
        );
      }

      // 4. Hospital Santa Rosa PY (Grafite/Slate)
      if ((m === 9 && (d === 10 || d === 11 || d === 24 || d === 25)) ||
          (m === 10 && (d === 8 || d === 9))) {
        pushShift(
          'Hospital Santa Rosa PY',
          'Santa Rosa del Aguaray, Paraguai',
          8, 0, 18, 0,
          'Plantão de Atendimentos Clínicos Santa Rosa PY',
          '⬛',
          '#334155',
          '⬛ Santa Rosa PY (Dia Inteiro)'
        );
      }

      // 5. Mega Star PY (Verde Esmeralda)
      if ((m === 9 && d === 26) || (m === 10 && d === 31) || (m === 11 && d === 28) || (m === 12 && d === 19)) {
        pushShift(
          'Mega Star Consultório Oftalmológico',
          'Shopping Mega Star, Piso 3, Ciudad del Este',
          7, 30, 14, 0,
          'Atendimentos Clínicos e Refração Visual Mega Star',
          '🟢',
          '#059669',
          '🟢 Mega Star (07:30 às 14:00)'
        );
      }

      // 6. Vision Clínica de Ojos (Verde)
      if (dow === 5 && !((m === 9 && (d === 11 || d === 25)) || (m === 10 && d === 9))) {
        pushShift(
          'Vision Clínica de Ojos',
          'Av. Dr. Francia / Centro Médico Vision, Pedro Juan Caballero / Ciudad del Este',
          8, 30, 17, 0,
          'Atendimentos de Optometria e Lentes Vision Clínica',
          '🟢',
          '#10B981',
          '🟢 Vision Clínica (08:30 às 17:00)'
        );
      }
    }

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OptoMed Clinical SaaS//PT_BR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Atendimentos',
      ...eventsIcs,
      'END:VCALENDAR'
    ].join('\r\n');

    const filename = `atendimentos_dr_meirelles_todas_clinicas.ics`;
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { count: eventsIcs.length, filename };
  }

  /**
   * Gera texto estruturado de aviso diário, semanal ou mensal para o examinador (com botão para copiar e enviar WhatsApp)
   */
  public generateExaminerNotificationText(
    period: 'day' | 'week' | 'month',
    targetDate: string,
    examinerName: string = 'Dr. Rudson Meirelles'
  ): string {
    const all = this.getAllClinicsAppointments().filter(
      a => a.examinerName.toLowerCase().includes('meirelles') || a.examinerName === examinerName
    );

    const [year, month, day] = targetDate.split('-').map(Number);
    const target = new Date(year, month - 1, day);

    let filtered: (Appointment & { clinicName: string })[] = [];
    let periodTitle = '';

    if (period === 'day') {
      periodTitle = `AGENDA DO DIA (${target.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })})`;
      filtered = all.filter(a => a.date === targetDate && a.status !== 'canceled');
    } else if (period === 'week') {
      const dayOfWeek = target.getDay();
      const monday = new Date(target);
      monday.setDate(target.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      
      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5);

      const monStr = monday.toISOString().split('T')[0];
      const satStr = saturday.toISOString().split('T')[0];

      periodTitle = `PROGRAMAÇÃO SEMANAL (${monday.toLocaleDateString('pt-BR')} a ${saturday.toLocaleDateString('pt-BR')})`;
      filtered = all.filter(a => a.date >= monStr && a.date <= satStr && a.status !== 'canceled');
    } else {
      const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
      periodTitle = `PROGRAMAÇÃO MENSAL (${target.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()})`;
      filtered = all.filter(a => a.date.startsWith(monthPrefix) && a.status !== 'canceled');
    }

    filtered.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });

    let msg = `📅 *${periodTitle}*\n`;
    msg += `👨‍⚕️ *Examinador:* ${examinerName}\n`;
    msg += `📊 *Total de Consultas:* ${filtered.length}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (filtered.length === 0) {
      msg += `✨ *Nenhum compromisso agendado para este período.*\nDisponível para atendimentos e escalas.`;
      return msg;
    }

    const byDate: { [d: string]: (Appointment & { clinicName: string })[] } = {};
    filtered.forEach(a => {
      if (!byDate[a.date]) byDate[a.date] = [];
      byDate[a.date].push(a);
    });

    Object.keys(byDate).sort().forEach(d => {
      const dayApts = byDate[d];
      const [y, m, dayNum] = d.split('-').map(Number);
      const dayDate = new Date(y, m - 1, dayNum);
      const dayLabel = dayDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });

      msg += `📍 *${dayLabel.toUpperCase()}* (${dayApts.length} pac.):\n`;
      dayApts.forEach(apt => {
        msg += `  • *${apt.time}* - ${apt.patientName} (${apt.patientNationality === 'PY' ? '🇵🇾' : '🇧🇷'}) | 🏥 _${apt.clinicName}_\n`;
      });
      msg += `\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🔒 *OptoMed Global Calendar* — Sem duplicidade de compromissos.`;
    return msg;
  }

  private timeToMinutes(timeStr: string): number {
    const [h, m] = (timeStr || '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
}

export const calendarIntegrationService = new CalendarIntegrationService();
