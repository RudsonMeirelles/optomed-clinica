/**
 * Optomed - Identidade Global do Paciente & Detecção de Duplicidades (Fase 3.2)
 * Tipos e funções utilitárias determinísticas de normalização e scoring
 */
/**
 * Normalização determinística de Documentos (CPF, RG, CI Paraguaia, RUC Paraguaio, Passaporte)
 */
export function normalizeDocumentNumber(doc, docType) {
    if (!doc)
        return '';
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
export function validateDocumentFormat(value, docType) {
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
export function normalizePhoneNumber(phone, countryCode = '+55') {
    if (!phone)
        return '';
    let digits = phone.replace(/\D/g, '');
    if (!digits)
        return '';
    const cleanCc = countryCode.replace(/\D/g, '');
    if (cleanCc && !digits.startsWith(cleanCc)) {
        digits = cleanCc + digits;
    }
    return digits;
}
/**
 * Normalização determinística de Nomes para comparação fonética/textual
 */
export function normalizePersonName(name) {
    if (!name)
        return '';
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
export function evaluateDuplicateMatch(newCandidate, existing) {
    const normNewName = normalizePersonName(newCandidate.fullName);
    const normExistName = normalizePersonName(existing.fullName);
    const normNewDoc = normalizeDocumentNumber(newCandidate.documentNumber);
    const normExistDoc = normalizeDocumentNumber(existing.documentNumber);
    const normNewPhone = normalizePhoneNumber(newCandidate.phone, newCandidate.phoneCountryCode);
    const normExistPhone = normalizePhoneNumber(existing.phone, existing.phoneCountryCode);
    const reasons = [];
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
    }
    else if (normNewName && normExistName) {
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
//# sourceMappingURL=patientIdentity.js.map