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
    amountCents?: number;
    currency?: 'BRL' | 'PYG' | 'USD';
    discount?: number;
    date: string;
    paymentMethod: PaymentMethod;
    patientId?: string;
    patientName?: string;
    appointmentId?: string;
    encounterId?: string;
    receiptNumber?: string;
    cashRegisterId?: string;
    status: 'completed' | 'pending' | 'canceled';
    isSettled?: boolean;
    settledAt?: string;
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
    id: string;
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
export type ExaminerRemunerationRuleType = 'fixed_period' | 'per_appointment' | 'percentage' | 'mixed_guarantee';
export type ExaminerPeriodKind = 'extraordinary' | 'fixed' | 'avulso';
export type RemunerationStatus = 'pending' | 'approved' | 'closed' | 'paid' | 'canceled' | 'adjusted';
export interface ExaminerFixedPeriod {
    id: string;
    clinicId: string;
    examinerId: string;
    examinerName: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    validFrom: string;
    validUntil?: string;
    remunerationType: ExaminerRemunerationRuleType;
    fixedAmount?: number;
    perAppointmentAmount?: number;
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
    date: string;
    startTime: string;
    endTime: string;
    remunerationType: ExaminerRemunerationRuleType;
    fixedAmount?: number;
    perAppointmentAmount?: number;
    percentage?: number;
    status: 'active' | 'canceled';
    notes?: string;
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
    perAppointmentAmount: number;
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
    id: string;
    appointmentId: string;
    clinicId: string;
    clinicName?: string;
    examinerId: string;
    examinerName: string;
    patientId?: string;
    patientName: string;
    date: string;
    time: string;
    appointmentType: string;
    periodKind: ExaminerPeriodKind;
    periodId?: string;
    ruleDescription: string;
    calculationBasis: string;
    ruleSnapshot: RemunerationRuleSnapshot;
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
    id: string;
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
    id: string;
    name: string;
    code: string;
    country: 'Brasil' | 'Paraguai' | 'other';
    city?: string;
    address?: string;
    timezone: string;
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
    defaultLanguage?: 'pt-BR' | 'es-PY';
    defaultCurrency?: 'BRL' | 'PYG' | 'USD';
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
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'checked_in' | 'waiting' | 'called' | 'in_consultation' | 'completed' | 'canceled' | 'no_show' | 'rescheduled';
export interface Appointment {
    patientGlobalId?: string;
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
    clinicId?: string;
    clinicName?: string;
    checkInAt?: string;
    calledAt?: string;
    startedAt?: string;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
}
export interface Patient {
    patientGlobalId?: string;
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
    systemicHistory?: string;
    personalHistory?: string;
    familyHistory?: string;
    medications?: string;
    medicationsInUse?: string;
    allergies?: string;
    surgicalHistory?: string;
    previousSurgeries?: string;
    traumaHistory?: string;
    previousGlasses?: boolean;
    currentGlasses: boolean;
    contactLensHistory?: string;
    contactLenses: boolean;
    occupationalHistory?: string;
    screenExposure?: string;
    habits?: string;
    pregnancyStatus?: string;
    observations?: string;
    clinicalNotes?: string;
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
    updatedAt?: string;
    updatedBy?: string;
    version?: number;
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
    treatments?: string[];
    additionalOpticalInfo?: string;
    observations?: string;
    returnInstructions?: string;
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
export type EpisodeStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
export interface ClinicalEpisode {
    id: string;
    clinicId: string;
    patientId: string;
    patientGlobalId?: string;
    title: string;
    description?: string;
    status: EpisodeStatus;
    startDate: string;
    endDate?: string;
    doctorId?: string;
    doctorName?: string;
    createdAt: string;
    updatedAt: string;
    closedAt?: string;
    version?: number;
    _deleted?: boolean;
    deletedAt?: string;
    deletedBy?: string;
}
export interface ClinicalEncounter {
    patientGlobalId?: string;
    id: string;
    patientId: string;
    clinicId?: string;
    clinicName?: string;
    country?: string;
    episodeId?: string;
    appointmentId?: string;
    date: string;
    startedAt?: string;
    completedAt?: string;
    version?: number;
    status: 'waiting' | 'in_progress' | 'completed' | 'canceled';
    examinerId: string;
    examinerName: string;
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
    internalConductNotes?: string;
    returnInWeeks?: number;
    returnInstructions?: string;
    isReturnEncounter?: boolean;
    returnReferenceEncounterId?: string;
    diagnoses?: DiagnosisEntry[];
    structuredConduct?: ClinicalConduct;
    evolutions?: ClinicalEvolution[];
    medicalPrescriptions?: MedicalPrescriptionRecord[];
    clinicalDocuments?: ClinicalDocumentRecord[];
    clinicalImages?: OphthalmicImageRecord[];
    eyeDrawing?: EyeDrawingData;
    syncStatus: 'synced' | 'pending_sync';
    updatedAt: string;
}
export type DiagnosisEye = 'OD' | 'OE' | 'OU' | 'unspecified';
export type DiagnosisStatus = 'suspected' | 'confirmed' | 'historical' | 'resolved';
export interface DiagnosisEntry {
    id: string;
    encounterId: string;
    code?: string;
    codingSystem?: 'CID-10' | 'CID-11' | 'SNOMED-CT' | 'custom';
    description: string;
    eye: DiagnosisEye;
    status: DiagnosisStatus;
    primary: boolean;
    notes?: string;
    createdAt: string;
    updatedAt?: string;
}
export interface ClinicalConduct {
    id: string;
    encounterId: string;
    treatmentPlan?: string;
    orientations?: string;
    returnWeeks?: number;
    returnInstructions?: string;
    returnTargetDate?: string;
    referrals?: string;
    requestedExams?: string[];
    internalNotes?: string;
    notes?: string;
}
export type EvolutionType = 'evolution' | 'amendment' | 'correction' | 'addendum' | 'clinical_note';
export interface ClinicalEvolution {
    id: string;
    encounterId: string;
    patientId: string;
    clinicId: string;
    professionalId: string;
    professionalName: string;
    timestamp: string;
    text: string;
    structuredData?: Record<string, any>;
    type: EvolutionType;
    version: number;
    supersedesId?: string;
    amendmentReason?: string;
    previousContent?: string;
    createdAt: string;
    createdBy: string;
}
export interface PrescribedMedication {
    id: string;
    name: string;
    activePrinciple?: string;
    concentration?: string;
    dosage: string;
    route: string;
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
export type ClinicalDocumentType = 'optical_prescription' | 'medical_prescription' | 'referral_letter' | 'exam_request' | 'medical_certificate' | 'clinical_report';
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