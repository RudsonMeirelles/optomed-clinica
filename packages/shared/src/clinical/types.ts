

export type NationalityType = 'BR' | 'PY' | 'other';
export type DocumentType = 'CPF' | 'RG' | 'CI_PY' | 'RUC_PY' | 'PASSPORT' | 'OTHER';
export type UserRole = 'superadmin' | 'admin' | 'examiner' | 'reception';

export type SubscriptionPlan = 'trial' | 'basic' | 'basic_monthly' | 'complete' | 'monthly' | 'semiannual' | 'annual';
export type SubscriptionBillingCycle = 'monthly' | 'semiannual' | 'annual';
export type SubscriptionStatus = 'trial' | 'active' | 'grace_period' | 'blocked' | 'suspended' | 'canceled';

export interface ClinicSubscription {
  plan: SubscriptionPlan;
  billingCycle?: SubscriptionBillingCycle;
  price?: number;
  priceAmount?: number;
  hasManagementModule?: boolean;
  status: SubscriptionStatus;
  startDate?: string; // ISO
  startedAt?: string; // ISO
  currentPeriodEnd?: string; // ISO
  expiresAt?: string; // ISO
  trialEndsAt?: string;
  pixCode?: string;
  pixQrUrl?: string;
  isAutoRenew?: boolean;
  autoRenew?: boolean;
  lastPaymentDate?: string;
  maxUsers?: number;
  maxDoctors?: number;
}

export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'cash' | 'transfer' | 'outro';
export type TransactionCategory = 
  | 'consulta' 
  | 'exame' 
  | 'venda_oculos' 
  | 'venda_lentes' 
  | 'procedimento' 
  | 'aluguel' 
  | 'salario' 
  | 'fornecedor_insumos' 
  | 'energia_agua_internet' 
  | 'marketing' 
  | 'software_licenca' 
  | 'impostos' 
  | 'outros';

export interface FinancialTransaction {
  id: string; // UUID v4
  clinicId: string;
  type: TransactionType; // 'income' (Entrada) ou 'expense' (Saída)
  category: TransactionCategory;
  description: string;
  amount: number; // Valor em R$
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  patientId?: string;
  patientName?: string;
  encounterId?: string;
  receiptNumber?: string; // Número do recibo/comprovante
  status: 'completed' | 'pending' | 'canceled';
  createdBy: string;
  createdAt: string;
}

export interface POSItem {
  id: string;
  code?: string;
  name: string;
  category: 'consulta' | 'exame' | 'produto' | 'servico';
  price: number;
  costPrice?: number;
  isActive: boolean;
}

export interface CashRegisterSummary {
  date: string;
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  currentBalance: number;
  transactionsCount: number;
}

export interface BillingInvoice {
  id: string; // UUID v4
  clinicId: string;
  clinicName: string;
  plan: SubscriptionPlan;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'canceled';
  dueDate: string; // YYYY-MM-DD
  paidAt?: string;
  paymentMethod?: PaymentMethod;
  pixCode?: string;
  pixQrUrl?: string;
  receiptNumber?: string;
  createdAt: string;
}

// Modelos de Contrato de Trabalho do Profissional / Examinador
export type ProfessionalContractType = 'period_half_day' | 'period_full_day' | 'per_consultation' | 'custom_commission';

export interface ProfessionalWorkSession {
  id: string;
  clinicId: string;
  examinerId: string;
  examinerName: string;
  date: string; // YYYY-MM-DD
  contractType: ProfessionalContractType;
  baseAmount: number; // R$ 1000 (Diária), R$ 500 (Meia diária/5h), R$ 50 (por consulta)
  notes?: string;
  status: 'active' | 'closed' | 'paid';
  createdAt: string;
}

export interface ProfessionalSettlementReport {
  examinerName: string;
  periodDescription: string;
  previousBalancePending: number; // Ex: R$ 550,00 da semana passada
  dailyEntries: {
    date: string;
    dayLabel: string;
    type: 'consultas' | 'meia_diaria' | 'diaria_completa' | 'ajuste_saldo';
    description: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }[];
  totalConsultationsCount: number;
  totalProductionAmount: number; // Produção total dos dias
  totalPayableAmount: number; // Total Produção + Saldo Anterior
  currentCashBalance: number; // Saldo disponível em caixa
  hasCashAvailability: boolean;
  settlementStatus: 'pending' | 'settled';
}

export interface ClinicConfig {
  id: string; // 'ivs' | 'megastar' | 'vision' | 'outro' ou custom UUID
  code: string; // 'IVS', 'MEGA_STAR', 'VISION', 'OUTRO'
  name: string;
  tagline?: string;
  logoUrl?: string; // Data URL / SVG / path
  primaryColor?: string; // ex: '#3B82F6', '#10B981', '#8B5CF6'
  phone?: string;
  address?: string;
  city?: string;
  country?: 'Brasil' | 'Paraguai' | 'other';
  documentCnpjOrRuc?: string;
  ownerEmail?: string;
  ownerName?: string;
  subscription?: ClinicSubscription;
  createdAt?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  clinicId: string; // ID da clínica do usuário ou 'all' para superadmin
  clinicName: string;
  email?: string;
  phone?: string;
  registryNumber?: string; // CRM / CROO
  customLogoUrl?: string;
  isActive?: boolean;
  createdAt?: string;
}

export type AppointmentType = 'consulta_geral' | 'refrativo' | 'retorno' | 'pediatrico' | 'baixa_visao' | 'urgencia';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'waiting' | 'in_consultation' | 'completed' | 'canceled' | 'no_show';

export interface Appointment {
  id: string; // UUID v4
  patientId: string;
  patientName: string;
  patientNationality: NationalityType;
  patientPhone?: string;
  patientDocument?: string;
  examinerId: string; // ex: 'user-examinador'
  examinerName: string; // ex: 'Dr. Rudson Meirelles'
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (ex: "09:30")
  durationMinutes: number; // ex: 30
  type: AppointmentType;
  status: AppointmentStatus;
  ticketNumber?: string; // Senha do Paciente (ex: 'P-01', 'A-05', '042')
  isPriority?: boolean; // Preferencial / Prioridade
  notes?: string;
  room?: string; // ex: 'Consultório 1'
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string; // UUID v4
  fullName: string;
  birthDate: string; // YYYY-MM-DD
  sex?: 'M' | 'F' | 'other' | 'uninformed';
  nationality: NationalityType; // 'BR' (Brasil), 'PY' (Paraguai), 'other'
  documentType: DocumentType;
  documentNumber?: string;
  phoneCountryCode: string; // '+55' ou '+595'
  phone?: string;
  city?: string; // ex: Foz do Iguaçu, Ciudad del Este, etc.
  country?: string; // 'Brasil' | 'Paraguai'
  address?: string;
  guardianName?: string; // Para menores
  notes?: string;
  lgpdConsent: boolean; // Consentimento LGPD / Proteção de dados
  lgpdConsentDate?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface Anamnesis {
  id: string;
  encounterId: string;
  chiefComplaint: string;
  historyOfPresentIllness?: string;
  ocularHistory?: string;
  personalHistory?: string;
  familyHistory?: string;
  currentGlasses: boolean;
  contactLenses: boolean;
  previousSurgeries?: string;
  traumaHistory?: string;
  allergies?: string; // Quadro alérgico (medicamentos, colírios, etc.)
  medicationsInUse?: string; // Fármacos e medicamentos que o paciente faz uso contínuo
  pathologicalHistory?: string; // Histórico patológico pregresso (doenças preexistentes, cirurgias, infecções)
  hasHypertension: boolean;
  bloodPressure?: string; // Pressão Arterial (ex: "120/80 mmHg")
  hasDiabetes: boolean;
  bloodGlucoseMgDl?: string; // Nível de glicemia (ex: "105 mg/dL")
  hba1cPercent?: string; // Hemoglobina glicada (ex: "6.2%")
  hasGlaucomaFamily?: boolean; // Histórico familiar de glaucoma
  hasCataract?: boolean; // Catarata
  hasPterygium?: boolean; // Pterígio
  hasDryEye?: boolean; // Olho Seco
  otherSystemicConditions?: string;
}

export interface EyeRefractionValues {
  sphere?: number;      // Dioptrias esféricas (ex: -1.75, +2.50)
  cylinder?: number;    // Dioptrias cilíndricas (ex: -0.75)
  axis?: number;        // Eixo em graus (0 a 180)
  addition?: number;   // Adição para perto (ex: +1.50)
  prism?: number;      // Dioptrias prismáticas
  prismBase?: 'in' | 'out' | 'up' | 'down';
  visualAcuity?: string; // ex: "20/20"
}

export interface Lensometry {
  id: string;
  encounterId: string;
  od: EyeRefractionValues;
  oe: EyeRefractionValues;
  addition?: number;
  pdDistanceMm?: number;
  lensType?: 'monofocal' | 'bifocal' | 'multifocal' | 'ocupacional' | 'nenhum' | string;
  material?: 'resina' | 'policarbonato' | 'trivex' | 'alto_indice' | 'cristal' | string;
  treatments?: string[]; // Ex: ['Antirreflexo', 'Filtro Azul', 'Fotossensível', 'Proteção UV']
  condition?: 'bom' | 'riscado' | 'desgastado' | 'antigo' | string;
  notes?: string;
}

export interface VisualAcuityEntry {
  eye: 'OD' | 'OE' | 'AO';
  uncorrected?: string; // AVsc (ex: "20/40")
  corrected?: string;   // AVcc (ex: "20/20")
  pinhole?: string;     // AV com estenopeico / pinhole (ex: "20/25")
  optotypeType: string;
  distanceMeters: number;
  logMAR?: number;
  decimal?: number;
}

export interface VisualAcuityRecord {
  id: string;
  encounterId: string;
  entries: VisualAcuityEntry[];
  testedAt: string;
}

export interface Autorefraction {
  id: string;
  encounterId: string;
  od: EyeRefractionValues;
  oe: EyeRefractionValues;
  pdMm?: number;
  notes?: string;
}

export interface SubjectiveRefraction {
  id: string;
  encounterId: string;
  od: EyeRefractionValues;
  oe: EyeRefractionValues;
  addition?: number;
  pdDistanceMm?: number;
  pdNearMm?: number;
  lensType?: 'monofocal' | 'bifocal' | 'multifocal' | 'ocupacional' | 'nenhum' | string;
  material?: 'resina' | 'policarbonato' | 'trivex' | 'alto_indice' | 'cristal' | string;
  treatments?: string[]; // Ex: ['Antirreflexo Digital', 'Filtro Luz Azul (BlueCut)', 'Fotossensível (Transitions)', 'Proteção UV400']
  specialLenses?: string; // Ex: Prismas especiais, Lentes Esclerais, RGP Ceratocone, Tórica, Filtro Terapêutico
  notes?: string;
}

export interface BinocularTestsRecord {
  id: string;
  encounterId: string;
  coverTestDistance?: string; // Ortoforia, Exoforia, Endoforia, etc.
  coverTestNear?: string;
  stereopsisArcsec?: number; // ex: 40 segundos de arco
  stereopsisTestType?: string; // Titmus, Randot, Lang
  colorVisionIshihara?: string; // ex: "14/14 pranchas normais"
  ppcNearPointConvergenceCm?: number; // Ponto próximo de convergência em cm
  notes?: string;
}

export interface ContrastTestRecord {
  id: string;
  encounterId: string;
  contrastPercent: number;
  odThresholdLogCS?: number;
  oeThresholdLogCS?: number;
  notes?: string;
}

export interface ColorVisionRecord {
  id: string;
  encounterId: string;
  testedPlatesCount: number;
  correctPlatesCount: number;
  diagnosis: 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'unspecified_deficiency';
  notes?: string;
}

export interface AmslerRecord {
  id: string;
  encounterId: string;
  odResult: 'no_alteration' | 'metamorphopsia' | 'scotoma' | 'untested';
  oeResult: 'no_alteration' | 'metamorphopsia' | 'scotoma' | 'untested';
  notes?: string;
}

export interface Prescription {
  id: string;
  encounterId: string;
  patientId: string;
  patientName: string;
  date: string;
  od: EyeRefractionValues;
  oe: EyeRefractionValues;
  addition?: number;
  pdDistanceMm?: number;
  pdNearMm?: number;
  lensType?: 'monofocal' | 'bifocal' | 'multifocal' | 'ocupacional';
  material?: 'resina' | 'policarbonato' | 'trivex' | 'alto_indice' | 'cristal';
  treatments?: string[]; // Anti-reflexo, Filtro Azul, Fotossensível
  observations?: string;
  returnInstructions?: string; // Indicação de retorno aberta definida pelo examinador
  examinerName?: string;
  examinerRegistry?: string;
  expirationDate: string;
}

export interface OphthalmicImageRecord {
  id: string;
  encounterId: string;
  category: 'anterior_segment' | 'posterior_segment' | 'retina' | 'cornea' | 'exam_upload' | 'other';
  eye: 'OD' | 'OE' | 'AO';
  title: string;
  notes?: string;
  dataUrl: string; // Base64 data URL
  createdAt: string;
}

export interface EyeDrawingAnnotation {
  x: number; // Porcentagem 0-100
  y: number; // Porcentagem 0-100
  text: string;
  color: string;
}

export interface EyeDrawingData {
  anteriorSegmentOD?: string; // Base64 canvas drawing
  anteriorSegmentOE?: string;
  retinaOD?: string;
  retinaOE?: string;
  notes?: string;
  updatedAt: string;
}

export interface ClinicalEncounter {
  id: string; // UUID v4
  patientId: string;
  date: string; // ISO
  status: 'waiting' | 'in_progress' | 'completed' | 'canceled';
  examinerId: string;
  examinerName: string;
  
  // Registros clínicos vinculados
  anamnesis?: Anamnesis;
  lensometry?: Lensometry;
  visualAcuity?: VisualAcuityRecord;
  autorefraction?: Autorefraction;
  subjectiveRefraction?: SubjectiveRefraction;
  binocularTests?: BinocularTestsRecord;
  contrastTest?: ContrastTestRecord;
  colorVision?: ColorVisionRecord;
  amslerTest?: AmslerRecord;
  prescription?: Prescription;
  clinicalNotes?: string;
  conduct?: string;
  returnInWeeks?: number;
  returnInstructions?: string; // Indicação de retorno em texto livre
  
  // Imagens e Desenhos Anatômicos Oculares
  clinicalImages?: OphthalmicImageRecord[];
  eyeDrawing?: EyeDrawingData;

  // Controle de sincronização offline
  syncStatus: 'synced' | 'pending_sync';
  updatedAt: string;
}


export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'PAIR_DEVICE';
  resourceType: 'PATIENT' | 'ENCOUNTER' | 'PRESCRIPTION' | 'DEVICE' | 'AUTH' | 'FINANCE';
  resourceId: string;
  details: string;
}

export interface PatientAge {
  years: number;
  months: number;
  days?: number;
  formatted: string;
  isPediatric: boolean;
  isPresbyopic: boolean;
}

export function calculateAge(birthDateStr?: string): PatientAge | null {
  if (!birthDateStr || !birthDateStr.trim()) return null;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return null;

  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  const days = today.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0) return null;

  let formatted = '';
  if (years === 0) {
    formatted = months <= 1 ? `${Math.max(0, months)} mês` : `${months} meses`;
  } else if (years === 1) {
    formatted = months > 0 ? `1 ano e ${months} m` : '1 ano';
  } else {
    formatted = `${years} anos`;
  }

  return {
    years,
    months,
    days: Math.max(0, days),
    formatted,
    isPediatric: years <= 12,
    isPresbyopic: years >= 40
  };
}

export interface ReturnReminder {
  id: string; // encounter id
  patientId: string;
  patientName: string;
  patientPhone?: string;
  patientNationality: NationalityType;
  encounterDate: string; // ISO
  returnWeeks: number;
  targetDate: string; // YYYY-MM-DD
  instructions: string;
  examinerName: string;
  status: 'overdue' | 'due_this_week' | 'upcoming';
  daysDifference: number; // Negativo = atrasado, Positivo = dias restantes
}

export interface AgeGroupDistribution {
  pediatric: number; // 0-12 anos
  young: number;     // 13-39 anos
  presbyopic: number;// 40-59 anos
  senior: number;    // 60+ anos
  uninformed: number;// Sem data
}

export interface ReportStats {
  totalConsultations: number;
  completedConsultations: number;
  totalPrescriptions: number;
  totalPatients: number;
  averagePerDay: number;
  nationalityDistribution: {
    br: number;
    py: number;
    other: number;
  };
  ageDistribution: AgeGroupDistribution;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  startDate: string;
  endDate: string;
  consultationsByPeriod: { label: string; count: number }[];
}
