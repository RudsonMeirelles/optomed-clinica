/**
 * Optomed - Identidade Global do Paciente & Detecção de Duplicidades (Fase 3.2)
 * Tipos e funções utilitárias determinísticas de normalização e scoring
 */
export interface PatientIdentifierItem {
    type: 'CPF' | 'RG' | 'CI_PY' | 'RUC_PY' | 'PASSPORT' | 'OTHER';
    value: string;
    normalizedValue: string;
    country: 'Brasil' | 'Paraguai' | 'other';
    verified?: boolean;
    source?: string;
    createdAt: string;
}
export interface GlobalPatientIdentity {
    patientGlobalId: string;
    identifiers: PatientIdentifierItem[];
    linkedPatientIds: {
        clinicId: string;
        patientId: string;
        linkedAt: string;
    }[];
    primaryFullName: string;
    normalizedFullName: string;
    birthDate?: string;
    primaryPhone?: string;
    normalizedPhone?: string;
    createdAt: string;
    updatedAt: string;
    version: number;
}
export type DuplicateMatchStrength = 'STRONG' | 'POSSIBLE' | 'NONE';
export interface DuplicateCandidateMatch {
    existingPatientId: string;
    existingPatientGlobalId?: string;
    existingFullName: string;
    existingBirthDate?: string;
    existingDocumentNumber?: string;
    existingClinicId: string;
    strength: DuplicateMatchStrength;
    reasons: string[];
    score: number;
}
export interface PatientLinkAuditLog {
    id: string;
    action: 'LINK_CONFIRMED' | 'LINK_REJECTED' | 'LINK_UNDONE';
    patientGlobalId: string;
    targetPatientId: string;
    targetClinicId: string;
    userId: string;
    userName: string;
    timestamp: string;
    reason?: string;
}
/**
 * Normalização determinística de Documentos (CPF, RG, CI Paraguaia, RUC Paraguaio, Passaporte)
 */
export declare function normalizeDocumentNumber(doc?: string, docType?: PatientIdentifierItem['type'] | string): string;
/**
 * Validação sintática não-bloqueante de documentos
 */
export declare function validateDocumentFormat(value: string, docType: string): {
    valid: boolean;
    message?: string;
};
/**
 * Normalização determinística de Telefones com código do país (+55 Brasil, +595 Paraguai)
 */
export declare function normalizePhoneNumber(phone?: string, countryCode?: string): string;
/**
 * Normalização determinística de Nomes para comparação fonética/textual
 */
export declare function normalizePersonName(name?: string): string;
/**
 * Avaliador explicável e auditável de duplicidade entre pacientes
 */
export declare function evaluateDuplicateMatch(newCandidate: {
    fullName: string;
    birthDate?: string;
    documentType?: string;
    documentNumber?: string;
    phone?: string;
    phoneCountryCode?: string;
}, existing: {
    id: string;
    patientGlobalId?: string;
    fullName: string;
    birthDate?: string;
    documentType?: string;
    documentNumber?: string;
    phone?: string;
    phoneCountryCode?: string;
    clinicId?: string;
}): DuplicateCandidateMatch | null;
//# sourceMappingURL=patientIdentity.d.ts.map