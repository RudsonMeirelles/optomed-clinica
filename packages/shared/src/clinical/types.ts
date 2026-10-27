

export type SyncAction = 'create' | 'update' | 'delete' | 'upsert';
export type SyncState = 'pending' | 'processing' | 'synced' | 'failed' | 'conflict';

export interface SyncableMetadata {
  operationId?: string;
  version?: number;
  _deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  lastSyncedAt?: string;
}

export interface SyncQueueItem {
  operationId: string;
  clinicId: string;
  entity: string;
  action: SyncAction;
  recordId: string;
  payload: any;
  version: number;
  createdAt: string;
  attempts: number;
  lastError?: string;
  nextRetryAt: number;
  state: SyncState;
}

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
  licenseKey?: string; // Ex: OPTO-2026-BR-9281-B892
  contractTermsAccepted?: boolean;
  contractAcceptedAt?: string;
  licensedDevices?: string[]; // IDs de dispositivos autorizados (TV, PC, etc.)
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
  amount: number; // Valor decimal na moeda
  amountCents?: number; // Representação segura em centavos inteiros (Fase 8.0)
  currency?: 'BRL' | 'PYG' | 'USD';
  discount?: number; // Desconto concedido
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  patientId?: string;
  patientName?: string;
  appointmentId?: string;
  encounterId?: string;
  receiptNumber?: string; // Número do recibo/comprovante
  cashRegisterId?: string; // Vínculo com a sessão de caixa
  status: 'completed' | 'pending' | 'canceled';
  isSettled?: boolean; // Se o valor já foi liquidado/baixado
  settledAt?: string; // Data/hora da liquidação
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  _deleted?: boolean;
}

export interface POSItem {
  id: string;
  code?: string;
  name: string;
  category: 'consulta' | 'exame' | 'produto' | 'servico';
  price: number;
  costPrice?: number;
  currency?: 'BRL' | 'PYG' | 'USD';
  isActive: boolean;
}

export interface CashRegisterSession {
  id: string; // UUID
  clinicId: string;
  operatorId: string;
  operatorName: string;
  openedAt: string;
  closedAt?: string;
  status: 'open' | 'closed';
  openingBalance: number;
  openingBalanceCents: number;
  totalIncome: number;
  totalExpense: number;
  expectedBalance: number;
  declaredBalance?: number;
  difference?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  _deleted?: boolean;
}

export interface CashRegisterSummary {
  date: string;
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  currentBalance: number;
  transactionsCount: number;
  activeSession?: CashRegisterSession | null;
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

// --------------------------------------------------------------------------
// MOTOR FINANCEIRO DE REMUNERAÇÃO DOS EXAMINADORES (IVS & MULTIUNIDADES)
// --------------------------------------------------------------------------

export type ExaminerRemunerationRuleType = 'fixed_period' | 'per_appointment' | 'percentage' | 'mixed_guarantee';
export type ExaminerPeriodKind = 'extraordinary' | 'fixed' | 'avulso';
export type RemunerationStatus = 'pending' | 'approved' | 'closed' | 'paid' | 'canceled' | 'adjusted';

export interface ExaminerFixedPeriod {
  id: string;
  clinicId: string;
  examinerId: string;
  examinerName: string;
  dayOfWeek: number; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  startTime: string; // HH:mm ex: "13:00"
  endTime: string; // HH:mm ex: "17:30"
  validFrom: string; // YYYY-MM-DD
  validUntil?: string; // YYYY-MM-DD opcional
  remunerationType: ExaminerRemunerationRuleType;
  fixedAmount?: number; // Ex: 500.00
  perAppointmentAmount?: number; // Ex: 100.00
  percentage?: number;
  minimumGuarantee?: number;
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface ExaminerSpecialPeriod {
  id: string;
  clinicId: string;
  examinerId: string;
  examinerName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm ex: "08:00"
  endTime: string; // HH:mm ex: "12:00"
  remunerationType: ExaminerRemunerationRuleType;
  fixedAmount?: number; // Ex: 350.00
  perAppointmentAmount?: number;
  percentage?: number;
  status: 'active' | 'canceled';
  notes?: string; // Motivo: Mutirão, Campanha, etc.
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface ExaminerAvulsoRule {
  id: string;
  clinicId: string;
  examinerId: string;
  examinerName: string;
  perAppointmentAmount: number; // Ex: 100.00
  percentage?: number;
  validFrom?: string;
  validUntil?: string;
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RemunerationRuleSnapshot {
  ruleId: string;
  ruleType: ExaminerPeriodKind;
  remunerationType: ExaminerRemunerationRuleType;
  remunerationValue: number;
  clinicId: string;
  examinerId: string;
  examinerName: string;
  validFrom?: string;
  validUntil?: string;
  explanation: string;
  snapshotAt: string;
}

export interface RemunerationAuditEntry {
  action: 'CREATE' | 'APPROVE' | 'CLOSE' | 'PAY' | 'CANCEL' | 'ADJUST' | 'REOPEN';
  author: string;
  timestamp: string;
  oldAmount?: number;
  newAmount?: number;
  oldStatus?: RemunerationStatus;
  newStatus?: RemunerationStatus;
  reason?: string;
}

export interface ExaminerRemunerationRecord {
  id: string; // Idempotente: rem_apt_{appointmentId}
  appointmentId: string;
  clinicId: string;
  clinicName?: string;
  examinerId: string;
  examinerName: string;
  patientId?: string;
  patientName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  appointmentType: string;
  periodKind: ExaminerPeriodKind;
  periodId?: string;
  ruleDescription: string;
  calculationBasis: string; // Explicação detalhada transparente
  ruleSnapshot: RemunerationRuleSnapshot; // Preserva o histórico mesmo se a regra mudar futuramente
  calculatedAmount: number;
  finalAmount: number;
  status: RemunerationStatus;
  closureId?: string;
  paidAt?: string;
  paymentMethod?: string;
  isRetroactiveAdjusted?: boolean;
  hasConflict?: boolean;
  conflictDetails?: string;
  auditTrail: RemunerationAuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ExaminerClosureRecord {
  id: string; // ex: closure_{clinicId}_{examinerId}_{YYYYMM}
  clinicId: string;
  examinerId: string;
  examinerName: string;
  startDate: string;
  endDate: string;
  totalFixedAmount: number;
  totalAvulsoAmount: number;
  totalExtraordinaryAmount: number;
  totalGrossAmount: number;
  status: 'closed' | 'paid';
  closedBy: string;
  closedAt: string;
  paidBy?: string;
  paidAt?: string;
  paymentMethod?: string;
  remunerationIds: string[];
  notes?: string;
}

export interface RemunerationPreviewResult {
  applicable: boolean;
  ruleType: ExaminerPeriodKind;
  ruleId: string;
  examinerId: string;
  examinerName: string;
  clinicId: string;
  appointmentId?: string;
  amount: number;
  status: 'PREVIEW' | 'CONFLICT' | 'NOT_APPLICABLE';
  explanation: string;
  conflict: boolean;
  conflictDetails?: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictType?: 'EXTRAORDINARY_OVERLAP' | 'FIXED_OVERLAP' | 'MULTIPLE_SPECIAL_SAME_TIME';
  message?: string;
  conflictingRules?: Array<{
    id: string;
    type: 'fixed' | 'extraordinary';
    description: string;
    timeRange: string;
  }>;
}

export interface ClinicUnit {
  id: string; // ex: 'ivs' | 'megastar' | 'vision' | 'outro' ou UUID
  name: string; // Nome da unidade
  code: string; // 'IVS', 'MEGA_STAR', 'VISUAL', etc.
  country: 'Brasil' | 'Paraguai' | 'other';
  city?: string;
  address?: string;
  timezone: string; // ex: 'America/Sao_Paulo' ou 'America/Asuncion'
  currency: 'BRL' | 'PYG' | 'USD';
  language: 'pt-BR' | 'es-PY';
  status: 'active' | 'inactive' | 'suspended';
  clinicalSettings?: {
    defaultConsultationDurationMinutes?: number;
    optotypeDistanceMeters?: number;
    enableSmartTV?: boolean;
    enableRemoteControl?: boolean;
    prescriptionFooterText?: string;
    customDisclaimers?: string[];
  };
  phone?: string;
  documentCnpjOrRuc?: string;
  tagline?: string;
  logoUrl?: string;
  primaryColor?: string;
  ownerEmail?: string;
  ownerName?: string;
  subscription?: ClinicSubscription;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicConfig extends ClinicUnit {
  // Aliases para retrocompatibilidade
  defaultLanguage?: 'pt-BR' | 'es-PY';
  defaultCurrency?: 'BRL' | 'PYG' | 'USD';
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
export type AppointmentStatus = 
  | 'scheduled'
  | 'confirmed'
  | 'checked_in'
  | 'waiting'
  | 'called'
  | 'in_consultation'
  | 'completed'
  | 'canceled'
  | 'no_show'
  | 'rescheduled';

export interface Appointment {
  patientGlobalId?: string;
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
  isOutOfContractPeriod?: boolean; // Consulta atendida fora do período contratado / Avulso negociado
  contractPeriodNotes?: string; // Justificativa ou notas do período negociado/extraordinário
  notes?: string;
  room?: string; // ex: 'Consultório 1'
  clinicId?: string;
  clinicName?: string;
  checkInAt?: string; // ISO timestamp do momento do check-in / chegada
  calledAt?: string; // ISO timestamp do momento da chamada na TV
  startedAt?: string; // ISO timestamp do início da consulta
  completedAt?: string; // ISO timestamp da finalização da consulta
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  patientGlobalId?: string;
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
  
  // 1. Queixa e Doença Atual
  chiefComplaint: string;
  historyOfPresentIllness?: string; // HDA
  
  // 2. Antecedentes Oculares e Sistêmicos
  ocularHistory?: string;
  systemicHistory?: string; // Antecedentes clínicos e sistêmicos estruturados
  personalHistory?: string;
  familyHistory?: string;
  
  // 3. Medicamentos e Alergias
  medications?: string; // Fármacos estruturados
  medicationsInUse?: string; // Fármacos em uso contínuo (legado mantido)
  allergies?: string; // Alergias oculares, medicamentosas e sistêmicas
  
  // 4. Cirurgias e Traumatismos
  surgicalHistory?: string; // Cirurgias oftalmológicas e gerais estruturadas
  previousSurgeries?: string; // Cirurgias prévias (legado mantido)
  traumaHistory?: string; // Traumas oculares e craniofaciais
  
  // 5. Óculos e Lentes de Contato
  previousGlasses?: boolean; // Uso pregresso de óculos
  currentGlasses: boolean; // Uso atual de óculos (legado mantido)
  contactLensHistory?: string; // Histórico, tipo e rotina de lentes de contato
  contactLenses: boolean; // Uso atual de lentes de contato (legado mantido)
  
  // 6. Ocupação, Telas e Hábitos
  occupationalHistory?: string; // Profissão / atividade visual predominante
  screenExposure?: string; // Exposição a computadores, celulares e telas (ex: "8h/dia")
  habits?: string; // Hábitos (tabagismo, etilismo, esportes de impacto, sol)
  pregnancyStatus?: string; // Gravidez / lactação (se clinicamente aplicável)
  
  // 7. Observações Gerais
  observations?: string; // Observações livres do ato assistencial
  clinicalNotes?: string; // Notas clínicas gerais (legado mantido)
  pathologicalHistory?: string; // Histórico patológico pregresso (legado mantido)
  
  // Parâmetros vitais e biomarcadores legados mantidos intactos:
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
  
  // Rastreabilidade e Auditoria
  updatedAt?: string; // ISO
  updatedBy?: string; // Nome ou ID do profissional
  version?: number;
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
  usageTime?: string; // Tempo de uso do óculos atual (ex: "6 meses", "1 ano", "2 anos", "3+ anos")
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
  additionalOpticalInfo?: string; // Informações adicionais do receituário óptico (exclusivo para dioptria/armação/óculos)
  notes?: string;
}

/**
 * FASE 4.0: Refração Final Homologada pelo examinador.
 * Representa a decisão refrativa definitiva da qual a prescrição óptica é derivada.
 */
export interface FinalRefraction extends SubjectiveRefraction {
  confirmedAt?: string;
  confirmedBy?: string;
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
  clinicId?: string;
  clinicName?: string;
  date: string;
  od: EyeRefractionValues;
  oe: EyeRefractionValues;
  addition?: number;
  pdDistanceMm?: number;
  pdNearMm?: number;
  lensType?: 'monofocal' | 'bifocal' | 'multifocal' | 'ocupacional';
  material?: 'resina' | 'policarbonato' | 'trivex' | 'alto_indice' | 'cristal';
  treatments?: string[]; // Anti-reflexo, Filtro Azul, Fotossensível
  additionalOpticalInfo?: string; // Informações adicionais de dioptria (armação, lentes, etc.)
  observations?: string;
  returnInstructions?: string; // Indicação de retorno aberta definida pelo examinador
  examinerName?: string;
  examinerRegistry?: string;
  expirationDate: string;
  version?: number;
  supersedesId?: string;
  isIssued?: boolean;
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

export type EpisodeStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';

export interface ClinicalEpisode {
  id: string; // UUID v4
  clinicId: string;
  patientId: string;
  patientGlobalId?: string;
  title: string;
  description?: string;
  status: EpisodeStatus;
  startDate: string; // ISO ou YYYY-MM-DD
  endDate?: string;
  doctorId?: string;
  doctorName?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  closedAt?: string; // ISO
  version?: number;
  _deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface ClinicalEncounter {
  patientGlobalId?: string;
  id: string; // UUID v4
  patientId: string;
  clinicId?: string;
  clinicName?: string;
  country?: string;
  episodeId?: string; // Referência ao ClinicalEpisode
  appointmentId?: string; // Referência ao agendamento administrativo correspondente
  date: string; // ISO
  startedAt?: string; // ISO início do ato assistencial
  completedAt?: string; // ISO finalização do ato assistencial
  version?: number; // Versionamento incremental
  status: 'waiting' | 'in_progress' | 'completed' | 'canceled';
  examinerId: string;
  examinerName: string;
  
  // Registros clínicos vinculados
  anamnesis?: Anamnesis;
  lensometry?: Lensometry;
  visualAcuity?: VisualAcuityRecord;
  autorefraction?: Autorefraction;
  subjectiveRefraction?: SubjectiveRefraction;
  finalRefraction?: FinalRefraction;
  binocularTests?: BinocularTestsRecord;
  contrastTest?: ContrastTestRecord;
  colorVision?: ColorVisionRecord;
  amslerTest?: AmslerRecord;
  prescription?: Prescription;
  clinicalNotes?: string;
  conduct?: string;
  internalConductNotes?: string; // Observação interna de conduta (diálogo clínico confidencial, não sai no receituário)
  returnInWeeks?: number;
  returnInstructions?: string; // Indicação de retorno em texto livre
  isReturnEncounter?: boolean; // Indica se este atendimento é uma consulta de retorno
  returnReferenceEncounterId?: string; // ID da consulta anterior de referência
  
  // FASE 3.7: Diagnóstico e Conduta Estruturada
  diagnoses?: DiagnosisEntry[];
  structuredConduct?: ClinicalConduct;

  // FASE 3.8: Evoluções e Adendos Vinculados
  evolutions?: ClinicalEvolution[];

  // FASE 3.9: Prescrição Médica e Documentos Clínicos Emitidos
  medicalPrescriptions?: MedicalPrescriptionRecord[];
  clinicalDocuments?: ClinicalDocumentRecord[];

  // Imagens e Desenhos Anatômicos Oculares
  clinicalImages?: OphthalmicImageRecord[];
  eyeDrawing?: EyeDrawingData;

  // Controle de sincronização offline
  syncStatus: 'synced' | 'pending_sync';
  updatedAt: string;
}

// ==========================================
// FASE 3.7: DIAGNÓSTICO + CONDUTA CLÍNICA
// ==========================================

export type DiagnosisEye = 'OD' | 'OE' | 'OU' | 'unspecified';
export type DiagnosisStatus = 'suspected' | 'confirmed' | 'historical' | 'resolved';

export interface DiagnosisEntry {
  id: string; // UUID v4
  encounterId: string;
  code?: string; // Ex: "H52.1" (CID-10) ou "9D00.1" (CID-11)
  codingSystem?: 'CID-10' | 'CID-11' | 'SNOMED-CT' | 'custom';
  description: string; // Ex: "Miopia"
  eye: DiagnosisEye;
  status: DiagnosisStatus;
  primary: boolean; // Diagnóstico principal do encontro
  notes?: string;
  createdAt: string; // ISO
  updatedAt?: string;
}

export interface ClinicalConduct {
  id: string;
  encounterId: string;
  treatmentPlan?: string;
  orientations?: string; // Orientações ao paciente (ergonomia, cuidados)
  returnWeeks?: number;
  returnInstructions?: string; // Instrução de retorno
  returnTargetDate?: string; // YYYY-MM-DD
  referrals?: string; // Encaminhamentos
  requestedExams?: string[]; // Exames complementares solicitados
  internalNotes?: string; // Observação interna confidencial (não sai na receita)
  notes?: string;
}

// ==========================================
// FASE 3.8: EVOLUÇÃO CLÍNICA & AMENDMENTS
// ==========================================

export type EvolutionType = 'evolution' | 'amendment' | 'correction' | 'addendum' | 'clinical_note';

export interface ClinicalEvolution {
  id: string; // UUID v4
  encounterId: string;
  patientId: string;
  clinicId: string;
  professionalId: string;
  professionalName: string;
  timestamp: string; // ISO
  text: string;
  structuredData?: Record<string, any>;
  type: EvolutionType;
  version: number;
  supersedesId?: string; // ID da evolução ou registro que este adendo retifica
  amendmentReason?: string; // Motivo da retificação
  previousContent?: string; // Conteúdo anterior arquivado de forma imutável
  createdAt: string;
  createdBy: string;
}

// ==========================================
// FASE 3.9: PRESCRIÇÕES & DOCUMENTOS CLÍNICOS
// ==========================================

export interface PrescribedMedication {
  id: string;
  name: string;
  activePrinciple?: string;
  concentration?: string;
  dosage: string;
  route: string; // 'Uso Tópico Ocular' | 'Uso Oral' | 'Uso Tópico Palpebral'
  frequency: string;
  duration?: string;
  instructions?: string;
  notes?: string;
}

export interface MedicalPrescriptionRecord {
  id: string;
  encounterId: string;
  patientId: string;
  patientName: string;
  clinicId: string;
  date: string;
  medications: PrescribedMedication[];
  generalInstructions?: string;
  examinerId: string;
  examinerName: string;
  examinerRegistry?: string;
  version: number;
  createdAt: string;
  supersedesId?: string;
}

export type ClinicalDocumentType = 
  | 'optical_prescription'
  | 'medical_prescription'
  | 'referral_letter'
  | 'exam_request'
  | 'medical_certificate'
  | 'clinical_report';

export interface ClinicalDocumentRecord {
  id: string;
  encounterId: string;
  patientId: string;
  clinicId: string;
  type: ClinicalDocumentType;
  title: string;
  content: string;
  structuredPayload?: any;
  professionalId: string;
  professionalName: string;
  professionalRegistry?: string;
  issuedAt: string;
  version: number;
  supersedesId?: string;
  isSigned?: boolean;
}



export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'PAIR_DEVICE';
  resourceType: 'PATIENT' | 'EPISODE' | 'ENCOUNTER' | 'PRESCRIPTION' | 'DEVICE' | 'AUTH' | 'FINANCE';
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
