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
    startDate?: string;
    startedAt?: string;
    currentPeriodEnd?: string;
    expiresAt?: string;
    trialEndsAt?: string;
    pixCode?: string;
    pixQrUrl?: string;
    isAutoRenew?: boolean;
    autoRenew?: boolean;
    lastPaymentDate?: string;
    maxUsers?: number;
    maxDoctors?: number;
    licenseKey?: string;
    contractTermsAccepted?: boolean;
    contractAcceptedAt?: string;
    licensedDevices?: string[];
}
export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'cash' | 'transfer' | 'outro';
export type TransactionCategory = 'consulta' | 'exame' | 'venda_oculos' | 'venda_lentes' | 'procedimento' | 'aluguel' | 'salario' | 'fornecedor_insumos' | 'energia_agua_internet' | 'marketing' | 'software_licenca' | 'impostos' | 'outros';
export interface FinancialTransaction {
    id: string;
    clinicId: string;
    type: TransactionType;
    category: TransactionCategory;
    description: string;
    amount: number;
    date: string;
    paymentMethod: PaymentMethod;
    patientId?: string;
    patientName?: string;
    encounterId?: string;
    receiptNumber?: string;
    status: 'completed' | 'pending' | 'canceled';
    isSettled?: boolean;
    settledAt?: string;
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
    id: string;
    clinicId: string;
    clinicName: string;
    plan: SubscriptionPlan;
    amount: number;
    status: 'pending' | 'paid' | 'overdue' | 'canceled';
    dueDate: string;
    paidAt?: string;
    paymentMethod?: PaymentMethod;
    pixCode?: string;
    pixQrUrl?: string;
    receiptNumber?: string;
    createdAt: string;
}
export type ProfessionalContractType = 'period_half_day' | 'period_full_day' | 'per_consultation' | 'custom_commission';
export interface ProfessionalWorkSession {
    id: string;
    clinicId: string;
    examinerId: string;
    examinerName: string;
    date: string;
    contractType: ProfessionalContractType;
    baseAmount: number;
    notes?: string;
    status: 'active' | 'closed' | 'paid';
    createdAt: string;
}
export interface ProfessionalSettlementReport {
    examinerName: string;
    periodDescription: string;
    previousBalancePending: number;
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
    totalProductionAmount: number;
    totalPayableAmount: number;
    currentCashBalance: number;
    hasCashAvailability: boolean;
    settlementStatus: 'pending' | 'settled';
}
export interface ClinicConfig {
    id: string;
    code: string;
    name: string;
    tagline?: string;
    logoUrl?: string;
    primaryColor?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: 'Brasil' | 'Paraguai' | 'other';
    defaultLanguage?: 'pt-BR' | 'es-PY';
    defaultCurrency?: 'BRL' | 'PYG' | 'USD';
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
    clinicId: string;
    clinicName: string;
    email?: string;
    phone?: string;
    registryNumber?: string;
    customLogoUrl?: string;
    isActive?: boolean;
    createdAt?: string;
}
export type AppointmentType = 'consulta_geral' | 'refrativo' | 'retorno' | 'pediatrico' | 'baixa_visao' | 'urgencia';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'waiting' | 'in_consultation' | 'completed' | 'canceled' | 'no_show';
export interface Appointment {
    id: string;
    patientId: string;
    patientName: string;
    patientNationality: NationalityType;
    patientPhone?: string;
    patientDocument?: string;
    examinerId: string;
    examinerName: string;
    date: string;
    time: string;
    durationMinutes: number;
    type: AppointmentType;
    status: AppointmentStatus;
    ticketNumber?: string;
    isPriority?: boolean;
    notes?: string;
    room?: string;
    createdAt: string;
    updatedAt: string;
}
export interface Patient {
    id: string;
    fullName: string;
    birthDate: string;
    sex?: 'M' | 'F' | 'other' | 'uninformed';
    nationality: NationalityType;
    documentType: DocumentType;
    documentNumber?: string;
    phoneCountryCode: string;
    phone?: string;
    city?: string;
    country?: string;
    address?: string;
    guardianName?: string;
    notes?: string;
    lgpdConsent: boolean;
    lgpdConsentDate?: string;
    createdAt: string;
    updatedAt: string;
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
    allergies?: string;
    medicationsInUse?: string;
    pathologicalHistory?: string;
    hasHypertension: boolean;
    bloodPressure?: string;
    hasDiabetes: boolean;
    bloodGlucoseMgDl?: string;
    hba1cPercent?: string;
    hasGlaucomaFamily?: boolean;
    hasCataract?: boolean;
    hasPterygium?: boolean;
    hasDryEye?: boolean;
    otherSystemicConditions?: string;
    clinicalNotes?: string;
}
export interface EyeRefractionValues {
    sphere?: number;
    cylinder?: number;
    axis?: number;
    addition?: number;
    prism?: number;
    prismBase?: 'in' | 'out' | 'up' | 'down';
    visualAcuity?: string;
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
    treatments?: string[];
    condition?: 'bom' | 'riscado' | 'desgastado' | 'antigo' | string;
    usageTime?: string;
    notes?: string;
}
export interface VisualAcuityEntry {
    eye: 'OD' | 'OE' | 'AO';
    uncorrected?: string;
    corrected?: string;
    pinhole?: string;
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
    treatments?: string[];
    specialLenses?: string;
    additionalOpticalInfo?: string;
    notes?: string;
}
export interface BinocularTestsRecord {
    id: string;
    encounterId: string;
    coverTestDistance?: string;
    coverTestNear?: string;
    stereopsisArcsec?: number;
    stereopsisTestType?: string;
    colorVisionIshihara?: string;
    ppcNearPointConvergenceCm?: number;
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
    treatments?: string[];
    additionalOpticalInfo?: string;
    observations?: string;
    returnInstructions?: string;
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
    dataUrl: string;
    createdAt: string;
}
export interface EyeDrawingAnnotation {
    x: number;
    y: number;
    text: string;
    color: string;
}
export interface EyeDrawingData {
    anteriorSegmentOD?: string;
    anteriorSegmentOE?: string;
    retinaOD?: string;
    retinaOE?: string;
    notes?: string;
    updatedAt: string;
}
export interface ClinicalEncounter {
    id: string;
    patientId: string;
    date: string;
    status: 'waiting' | 'in_progress' | 'completed' | 'canceled';
    examinerId: string;
    examinerName: string;
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
    returnInstructions?: string;
    isReturnEncounter?: boolean;
    returnReferenceEncounterId?: string;
    clinicalImages?: OphthalmicImageRecord[];
    eyeDrawing?: EyeDrawingData;
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
export declare function calculateAge(birthDateStr?: string): PatientAge | null;
export interface ReturnReminder {
    id: string;
    patientId: string;
    patientName: string;
    patientPhone?: string;
    patientNationality: NationalityType;
    encounterDate: string;
    returnWeeks: number;
    targetDate: string;
    instructions: string;
    examinerName: string;
    status: 'overdue' | 'due_this_week' | 'upcoming';
    daysDifference: number;
}
export interface AgeGroupDistribution {
    pediatric: number;
    young: number;
    presbyopic: number;
    senior: number;
    uninformed: number;
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
    consultationsByPeriod: {
        label: string;
        count: number;
    }[];
}
//# sourceMappingURL=types.d.ts.map