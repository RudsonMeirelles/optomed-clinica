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
  linkedPatientIds: { clinicId: string; patientId: string; linkedAt: string }[];
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
  score: number; // 0 - 100
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
export function normalizeDocumentNumber(doc?: string, docType?: PatientIdentifierItem['type'] | string): string {
  if (!doc) return '';
  const clean = doc.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  // Se for CPF, garante apenas números se possível
  if (docType === 'CPF') {
    return doc.replace(/\D/g, '');
  }
  return clean;
}

/**
 * Validação sintática não-bloqueante de documentos
 */
export function validateDocumentFormat(value: string, docType: string): { valid: boolean; message?: string } {
  if (!value || !value.trim()) {
    // Paciente sem documento (ex: criança, estrangeiro em trânsito) é expressamente permitido
    return { valid: true };
  }
  const clean = value.replace(/[^0-9A-Za-z]/g, '');

  switch (docType) {
    case 'CPF': {
      const digits = value.replace(/\D/g, '');
      if (digits.length !== 11) {
        return { valid: false, message: 'CPF brasileiro deve conter 11 dígitos numéricos.' };
      }
      return { valid: true };
    }
    case 'CI_PY': {
      // Cédula de Identidad Civil do Paraguai: 5 a 8 dígitos numéricos
      const digits = value.replace(/\D/g, '');
      if (digits.length < 5 || digits.length > 9) {
        return { valid: false, message: 'Cédula de Identidad (PY) geralmente possui entre 5 e 8 dígitos.' };
      }
      return { valid: true };
    }
    case 'RUC_PY': {
      // RUC do Paraguai: dígitos + dígito verificador (ex: 80012345-6)
      const digits = value.replace(/[^0-9-]/g, '');
      if (digits.length < 6) {
        return { valid: false, message: 'RUC (PY) inválido.' };
      }
      return { valid: true };
    }
    case 'PASSPORT': {
      if (clean.length < 5 || clean.length > 15) {
        return { valid: false, message: 'Número de passaporte deve conter entre 5 e 15 caracteres alfanuméricos.' };
      }
      return { valid: true };
    }
    default:
      return { valid: true };
  }
}

/**
 * Normalização determinística de Telefones com código do país (+55 Brasil, +595 Paraguai)
 */
export function normalizePhoneNumber(phone?: string, countryCode: string = '+55'): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  const cleanCc = countryCode.replace(/\D/g, '');
  if (cleanCc && !digits.startsWith(cleanCc)) {
    digits = cleanCc + digits;
  }
  return digits;
}

/**
 * Normalização determinística de Nomes para comparação fonética/textual
 */
export function normalizePersonName(name?: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Avaliador explicável e auditável de duplicidade entre pacientes
 */
export function evaluateDuplicateMatch(
  newCandidate: {
    fullName: string;
    birthDate?: string;
    documentType?: string;
    documentNumber?: string;
    phone?: string;
    phoneCountryCode?: string;
  },
  existing: {
    id: string;
    patientGlobalId?: string;
    fullName: string;
    birthDate?: string;
    documentType?: string;
    documentNumber?: string;
    phone?: string;
    phoneCountryCode?: string;
    clinicId?: string;
  }
): DuplicateCandidateMatch | null {
  const normNewName = normalizePersonName(newCandidate.fullName);
  const normExistName = normalizePersonName(existing.fullName);

  const normNewDoc = normalizeDocumentNumber(newCandidate.documentNumber);
  const normExistDoc = normalizeDocumentNumber(existing.documentNumber);

  const normNewPhone = normalizePhoneNumber(newCandidate.phone, newCandidate.phoneCountryCode);
  const normExistPhone = normalizePhoneNumber(existing.phone, existing.phoneCountryCode);

  const reasons: string[] = [];
  let score = 0;

  const docMatches = Boolean(normNewDoc && normExistDoc && normNewDoc === normExistDoc);
  const birthMatches = Boolean(newCandidate.birthDate && existing.birthDate && newCandidate.birthDate === existing.birthDate);
  const nameMatches = Boolean(normNewName && normExistName && normNewName === normExistName);
  const phoneMatches = Boolean(normNewPhone && normExistPhone && normNewPhone === normExistPhone);

  if (docMatches) {
    score += 50;
    reasons.push('Documento idêntico (' + (newCandidate.documentType || 'DOC') + ')');
  }

  if (birthMatches) {
    score += 30;
    reasons.push('Data de nascimento idêntica (' + newCandidate.birthDate + ')');
  }

  if (nameMatches) {
    score += 25;
    reasons.push('Nome completo idêntico');
  } else if (normNewName && normExistName) {
    if (normNewName.includes(normExistName) || normExistName.includes(normNewName)) {
      score += 15;
      reasons.push('Alta similaridade de nome');
    }
  }

  if (phoneMatches) {
    score += 15;
    reasons.push('Telefone de contato idêntico');
  }

  // Documento oficial idêntico constitui evidência forte isolada ou associada
  if (docMatches || score >= 60 || (nameMatches && birthMatches)) {
    return {
      existingPatientId: existing.id,
      existingPatientGlobalId: existing.patientGlobalId,
      existingFullName: existing.fullName,
      existingBirthDate: existing.birthDate,
      existingDocumentNumber: existing.documentNumber,
      existingClinicId: existing.clinicId || 'ivs',
      strength: 'STRONG',
      reasons,
      score: Math.min(100, score)
    };
  }

  if (score >= 30 || (nameMatches && !newCandidate.birthDate)) {
    return {
      existingPatientId: existing.id,
      existingPatientGlobalId: existing.patientGlobalId,
      existingFullName: existing.fullName,
      existingBirthDate: existing.birthDate,
      existingDocumentNumber: existing.documentNumber,
      existingClinicId: existing.clinicId || 'ivs',
      strength: 'POSSIBLE',
      reasons,
      score
    };
  }

  return null;
}
