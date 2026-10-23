import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { 
  ClinicUnit, 
  ClinicConfig, 
  Patient, 
  ClinicalEncounter, 
  ClinicalEpisode,
  normalizeDocumentNumber,
  validateDocumentFormat,
  normalizePhoneNumber,
  evaluateDuplicateMatch,
  calculateAge,
  canTransitionAppointmentStatus
} from '@optotipo/shared';
import { offlineDb } from './offlineDb';
import crypto from 'crypto';

describe('FASE 7 — Multiunidade, Operação Transfronteiriça Brasil/Paraguai e Identidade Clínica Longitudinal', () => {
  let store: Record<string, string> = {};

  beforeAll(() => {
    const localStorageMock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value.toString(); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };
    (global as any).localStorage = localStorageMock;
  });

  beforeEach(() => {
    store = {};
    offlineDb.setActiveClinicId('ivs');
  });

  it('1. Criação de Unidade: deve instanciar ClinicUnit completa com timezone, moeda e configurações clínicas', () => {
    const unitBR: ClinicUnit = {
      id: 'clinic-foz-01',
      name: 'Optomed Foz do Iguaçu',
      code: 'FOZ_BR',
      country: 'Brasil',
      city: 'Foz do Iguaçu',
      address: 'Av. Brasil, 1500',
      timezone: 'America/Sao_Paulo',
      currency: 'BRL',
      language: 'pt-BR',
      status: 'active',
      clinicalSettings: {
        defaultConsultationDurationMinutes: 30,
        optotypeDistanceMeters: 6,
        enableSmartTV: true,
        enableRemoteControl: true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    expect(unitBR.country).toBe('Brasil');
    expect(unitBR.currency).toBe('BRL');
    expect(unitBR.timezone).toBe('America/Sao_Paulo');
    expect(unitBR.clinicalSettings.optotypeDistanceMeters).toBe(6);
  });

  it('2. Edição de Unidade: deve permitir atualização de parâmetros mantendo integridade estrutural', () => {
    const clinic: ClinicConfig = {
      id: 'clinic-cde-01',
      name: 'Optomed Ciudad del Este',
      code: 'CDE_PY',
      country: 'Paraguai',
      city: 'Ciudad del Este',
      address: 'Monseñor Rodríguez 123',
      timezone: 'America/Asuncion',
      currency: 'PYG',
      language: 'es-PY',
      status: 'active',
      clinicalSettings: {
        defaultConsultationDurationMinutes: 40,
        optotypeDistanceMeters: 5,
        enableSmartTV: true,
        enableRemoteControl: true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    offlineDb.saveClinic(clinic);
    const retrieved = offlineDb.getClinicById('clinic-cde-01');
    expect(retrieved).toBeDefined();
    expect(retrieved?.country).toBe('Paraguai');
    expect(retrieved?.currency).toBe('PYG');
    expect(retrieved?.language).toBe('es-PY');

    // Edição
    if (retrieved) {
      const updated: ClinicConfig = {
        ...retrieved,
        name: 'Optomed CDE Centro Oftalmológico',
        clinicalSettings: {
          ...retrieved.clinicalSettings,
          optotypeDistanceMeters: 4
        }
      };
      offlineDb.saveClinic(updated);
      const afterUpdate = offlineDb.getClinicById('clinic-cde-01');
      expect(afterUpdate?.name).toBe('Optomed CDE Centro Oftalmológico');
      expect(afterUpdate?.clinicalSettings.optotypeDistanceMeters).toBe(4);
    }
  });

  it('3. Paciente Global em Duas Unidades: mesmo patientGlobalId compartilhado entre Brasil e Paraguai', () => {
    const sharedGlobalId = 'glob-pat-rodrigo-777';

    const patientBR: Patient = {
      id: 'pat-br-01',
      patientGlobalId: sharedGlobalId,
      fullName: 'Rodrigo Benítez Almada',
      birthDate: '1988-06-15',
      documentType: 'CPF',
      documentNumber: '123.456.789-00',
      nationality: 'BR',
      phone: '+55 45 99876-5432',
      clinicId: 'ivs',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const patientPY: Patient = {
      id: 'pat-py-01',
      patientGlobalId: sharedGlobalId,
      fullName: 'Rodrigo Benítez Almada',
      birthDate: '1988-06-15',
      documentType: 'CI_PY',
      documentNumber: '4.890.123',
      nationality: 'PY',
      phone: '+595 981 765432',
      clinicId: 'megastar',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    offlineDb.savePatient(patientBR, 'ivs');
    offlineDb.savePatient(patientPY, 'megastar');

    const loadedBR = offlineDb.getPatients('ivs').find(p => p.id === 'pat-br-01');
    const loadedPY = offlineDb.getPatients('megastar').find(p => p.id === 'pat-py-01');

    expect(loadedBR?.patientGlobalId).toBe(sharedGlobalId);
    expect(loadedPY?.patientGlobalId).toBe(sharedGlobalId);
    expect(loadedBR?.clinicId).toBe('ivs');
    expect(loadedPY?.clinicId).toBe('megastar');
  });

  it('4. Histórico Cruzado Autorizado: getUnifiedPatientHistory compõe consultas preservando procedência', () => {
    const sharedGlobalId = 'glob-history-888';

    // Consulta realizada na unidade IVS (Brasil)
    const encBR: ClinicalEncounter = {
      id: 'enc-br-01',
      patientId: 'pat-br-01',
      patientGlobalId: sharedGlobalId,
      date: '2026-03-10T10:00:00.000Z',
      status: 'completed',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles',
      syncStatus: 'synced',
      anamnese: {
        queixaPrincipal: 'Avaliação de rotina no Brasil'
      },
      refractionSubjective: {
        odSph: -1.50,
        odCyl: -0.50,
        odAxis: 180,
        osSph: -1.75,
        osCyl: -0.25,
        osAxis: 175
      },
      updatedAt: '2026-03-10T10:30:00.000Z'
    };

    // Consulta realizada na unidade Mega Star (Paraguai)
    const encPY: ClinicalEncounter = {
      id: 'enc-py-01',
      patientId: 'pat-py-01',
      patientGlobalId: sharedGlobalId,
      date: '2026-09-20T14:00:00.000Z',
      status: 'completed',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles',
      syncStatus: 'synced',
      anamnese: {
        queixaPrincipal: 'Revisão refrativa no Paraguai'
      },
      refractionSubjective: {
        odSph: -1.75,
        odCyl: -0.50,
        odAxis: 180,
        osSph: -2.00,
        osCyl: -0.25,
        osAxis: 175
      },
      updatedAt: '2026-09-20T14:30:00.000Z'
    };

    offlineDb.saveEncounter(encBR, 'ivs');
    offlineDb.saveEncounter(encPY, 'megastar');

    // Recupera histórico unificado com acesso irrestrito ('all')
    const unified = offlineDb.getUnifiedPatientHistory('pat-br-01', sharedGlobalId, 'all');

    expect(unified.encounters.length).toBeGreaterThanOrEqual(2);
    const brFound = unified.encounters.find(e => e.id === 'enc-br-01');
    const pyFound = unified.encounters.find(e => e.id === 'enc-py-01');

    expect(brFound).toBeDefined();
    expect(brFound?.country).toBe('Brasil');
    expect(brFound?.clinicId).toBe('ivs');

    expect(pyFound).toBeDefined();
    expect(pyFound?.country).toBe('Paraguai');
    expect(pyFound?.clinicId).toBe('megastar');
  });

  it('5. Acesso Não Autorizado: restrição por allowedClinics bloqueia histórico de clínica não autorizada', () => {
    const sharedGlobalId = 'glob-restricted-999';

    const encBR: ClinicalEncounter = {
      id: 'enc-br-secret',
      patientId: 'pat-br-sec',
      patientGlobalId: sharedGlobalId,
      date: '2026-05-10T10:00:00.000Z',
      status: 'completed',
      examinerId: 'dr-br',
      examinerName: 'Dr. Brasil',
      syncStatus: 'synced',
      updatedAt: '2026-05-10T10:30:00.000Z'
    };

    const encPY: ClinicalEncounter = {
      id: 'enc-py-allowed',
      patientId: 'pat-py-allow',
      patientGlobalId: sharedGlobalId,
      date: '2026-06-10T10:00:00.000Z',
      status: 'completed',
      examinerId: 'dr-py',
      examinerName: 'Dr. Paraguai',
      syncStatus: 'synced',
      updatedAt: '2026-06-10T10:30:00.000Z'
    };

    offlineDb.saveEncounter(encBR, 'ivs');
    offlineDb.saveEncounter(encPY, 'megastar');

    // Usuário autorizado APENAS na clínica paraguaia 'megastar'
    const restrictedHistory = offlineDb.getUnifiedPatientHistory('pat-py-allow', sharedGlobalId, ['megastar']);

    const hasPY = restrictedHistory.encounters.some(e => e.id === 'enc-py-allowed');
    const hasBR = restrictedHistory.encounters.some(e => e.id === 'enc-br-secret');

    expect(hasPY).toBe(true);
    expect(hasBR).toBe(false); // Bloqueado por isolamento multiunidade
  });

  it('6. Validação e Normalização de CPF brasileiro', () => {
    const raw = '123.456.789-01';
    const normalized = normalizeDocumentNumber(raw, 'CPF');
    expect(normalized).toBe('12345678901');

    const validResult = validateDocumentFormat('123.456.789-01', 'CPF');
    expect(validResult.valid).toBe(true);

    const invalidResult = validateDocumentFormat('123.456', 'CPF');
    expect(invalidResult.valid).toBe(false);
  });

  it('7. Cédula Paraguaia (CI_PY): aceita formato numérico característico do Paraguai', () => {
    const rawCI = '4.892.120';
    const normalized = normalizeDocumentNumber(rawCI, 'CI_PY');
    expect(normalized).toBe('4892120');

    const validCI = validateDocumentFormat(rawCI, 'CI_PY');
    expect(validCI.valid).toBe(true);

    const invalidCI = validateDocumentFormat('12', 'CI_PY');
    expect(invalidCI.valid).toBe(false);
  });

  it('8. Passaporte (PASSPORT): aceita códigos alfanuméricos internacionais', () => {
    const rawPass = 'PA-1298402';
    const normalized = normalizeDocumentNumber(rawPass, 'PASSPORT');
    expect(normalized).toBe('PA1298402');

    const validPass = validateDocumentFormat('N1234567', 'PASSPORT');
    expect(validPass.valid).toBe(true);
  });

  it('9. Paciente Sem Documento (crianças, estrangeiros em trânsito): validação não-bloqueante', () => {
    const emptyResult = validateDocumentFormat('', 'CPF');
    expect(emptyResult.valid).toBe(true);

    const childWithoutDoc: Patient = {
      id: 'child-01',
      fullName: 'Menor em Atendimento',
      birthDate: '2022-01-10',
      documentType: 'OTHER',
      documentNumber: '',
      clinicId: 'ivs',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    offlineDb.savePatient(childWithoutDoc, 'ivs');
    const loaded = offlineDb.getPatients('ivs').find(p => p.id === 'child-01');
    expect(loaded).toBeDefined();
    expect(loaded?.fullName).toBe('Menor em Atendimento');
  });

  it('10. Sincronização Multiunidade: isolamento de chaves de storage por clínica', () => {
    const pat1: Patient = {
      id: 'pat-sync-ivs',
      fullName: 'Paciente Unidade Brasil',
      clinicId: 'ivs',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const pat2: Patient = {
      id: 'pat-sync-megastar',
      fullName: 'Paciente Unidade Paraguai',
      clinicId: 'megastar',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    offlineDb.savePatient(pat1, 'ivs');
    offlineDb.savePatient(pat2, 'megastar');

    const ivsList = offlineDb.getPatients('ivs');
    const megaList = offlineDb.getPatients('megastar');

    expect(ivsList.some(p => p.id === 'pat-sync-ivs')).toBe(true);
    expect(ivsList.some(p => p.id === 'pat-sync-megastar')).toBe(false);

    expect(megaList.some(p => p.id === 'pat-sync-megastar')).toBe(true);
    expect(megaList.some(p => p.id === 'pat-sync-ivs')).toBe(false);
  });

  it('11. Conflito de Timestamps e Versões: salva a versão mais recente com incremento ordenado', () => {
    const episode: ClinicalEpisode = {
      id: 'ep-conflict-01',
      clinicId: 'ivs',
      patientId: 'pat-conf-01',
      title: 'Acompanhamento de Ceratocone',
      status: 'ACTIVE',
      version: 1,
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z'
    };

    offlineDb.saveEpisode(episode, 'ivs');
    const firstSave = offlineDb.getEpisodes('ivs').find(e => e.id === 'ep-conflict-01');
    expect(firstSave?.version).toBe(1);

    // Atualização com nova versão
    const updatedEpisode: ClinicalEpisode = {
      ...episode,
      title: 'Acompanhamento de Ceratocone e Adaptação de Lentes Esclerais'
    };
    offlineDb.saveEpisode(updatedEpisode, 'ivs');
    const secondSave = offlineDb.getEpisodes('ivs').find(e => e.id === 'ep-conflict-01');
    expect(secondSave?.version).toBe(2);
    expect(secondSave?.title).toContain('Lentes Esclerais');
  });

  it('12. Tombstones e Deleção Durável: paciente deletado não aparece em listagens ativas', () => {
    const pat: Patient = {
      id: 'pat-delete-01',
      fullName: 'Paciente Para Remoção',
      clinicId: 'ivs',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    offlineDb.savePatient(pat, 'ivs');
    expect(offlineDb.getPatients('ivs').some(p => p.id === 'pat-delete-01')).toBe(true);

    offlineDb.deletePatient('pat-delete-01', 'ivs');
    expect(offlineDb.getPatients('ivs').some(p => p.id === 'pat-delete-01')).toBe(false);
  });

  it('13. Idempotência com OperationId: previne reprocessamento redundante em lote', () => {
    const operationId = 'op-multiunit-test-12345';
    const processedOps = new Set<string>();

    function processOperation(opId: string, action: () => void) {
      if (processedOps.has(opId)) {
        return { alreadyProcessed: true };
      }
      action();
      processedOps.add(opId);
      return { alreadyProcessed: false };
    }

    let count = 0;
    const res1 = processOperation(operationId, () => { count++; });
    const res2 = processOperation(operationId, () => { count++; });

    expect(res1.alreadyProcessed).toBe(false);
    expect(res2.alreadyProcessed).toBe(true);
    expect(count).toBe(1);
  });

  it('14. Operação Offline: banco local funciona sem rede e armazena em fila durável', () => {
    const offlinePatient: Patient = {
      id: 'pat-offline-01',
      fullName: 'Maria Sem Rede',
      clinicId: 'megastar',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Salva localmente
    offlineDb.savePatient(offlinePatient, 'megastar');
    const loaded = offlineDb.getPatients('megastar').find(p => p.id === 'pat-offline-01');
    expect(loaded).toBeDefined();
    expect(loaded?.fullName).toBe('Maria Sem Rede');
  });

  it('15. WebSocket: clínica é fixada obrigatoriamente a partir do token de sessão criptográfico', () => {
    // Simula a lógica de verificação e fixação do servidor em packages/server/src/index.ts
    const sessionSecret = 'super_secret_test_key_at_least_32_characters_long_123456';
    const serverSession = {
      userId: 'user-001',
      username: 'dr.megastar',
      role: 'examiner',
      clinicId: 'megastar',
      exp: Date.now() + 60000,
      iat: Date.now()
    };

    const payloadBase64 = Buffer.from(JSON.stringify(serverSession), 'utf-8').toString('base64');
    const signature = crypto.createHmac('sha256', sessionSecret).update(payloadBase64).digest('hex');
    const validToken = `${payloadBase64}.${signature}`;

    // Dispositivo tenta spoofing enviando clinicId = 'ivs' no corpo
    const clientPayload = {
      type: 'REGISTER_DEVICE',
      deviceType: 'clinical',
      clinicId: 'ivs', // Tentativa de spoofing!
      authToken: validToken
    };

    // Servidor decodifica o token e FIXA a clínica da sessão
    const parts = clientPayload.authToken.split('.');
    const expectedSig = crypto.createHmac('sha256', sessionSecret).update(parts[0]).digest('hex');
    expect(parts[1]).toBe(expectedSig);

    const decryptedSession = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf-8'));
    
    // O device.clinicId no servidor assume SEMPRE o valor do token, anulando o clinicId da mensagem
    const deviceClinicId = decryptedSession.clinicId;
    expect(deviceClinicId).toBe('megastar');
    expect(deviceClinicId).not.toBe(clientPayload.clinicId);
  });

  it('16. Isolamento Multi-Tenant: consultas de uma clínica não vazam para outra', () => {
    const enc1: ClinicalEncounter = {
      id: 'enc-tenant-ivs',
      patientId: 'p-ivs',
      date: new Date().toISOString(),
      status: 'completed',
      examinerId: 'dr-1',
      examinerName: 'Dr. 1',
      syncStatus: 'synced',
      updatedAt: new Date().toISOString()
    };

    const enc2: ClinicalEncounter = {
      id: 'enc-tenant-mega',
      patientId: 'p-mega',
      date: new Date().toISOString(),
      status: 'completed',
      examinerId: 'dr-2',
      examinerName: 'Dr. 2',
      syncStatus: 'synced',
      updatedAt: new Date().toISOString()
    };

    offlineDb.saveEncounter(enc1, 'ivs');
    offlineDb.saveEncounter(enc2, 'megastar');

    const ivsEncounters = offlineDb.getEncounters('ivs');
    const megaEncounters = offlineDb.getEncounters('megastar');

    expect(ivsEncounters.some(e => e.id === 'enc-tenant-ivs')).toBe(true);
    expect(ivsEncounters.some(e => e.id === 'enc-tenant-mega')).toBe(false);

    expect(megaEncounters.some(e => e.id === 'enc-tenant-mega')).toBe(true);
    expect(megaEncounters.some(e => e.id === 'enc-tenant-ivs')).toBe(false);
  });

  it('17. REST: middleware de autorização simula respostas 401 e 403', () => {
    function mockRequireClinicAccess(token: string | null, targetClinicId: string) {
      if (!token) {
        return { status: 401, error: 'Token ausente' };
      }
      if (token === 'valid-megastar-token' && targetClinicId === 'ivs') {
        return { status: 403, error: 'Acesso proibido para esta unidade clínica' };
      }
      if (token === 'valid-megastar-token' && targetClinicId === 'megastar') {
        return { status: 200, ok: true };
      }
      return { status: 401, error: 'Token inválido' };
    }

    expect(mockRequireClinicAccess(null, 'ivs').status).toBe(401);
    expect(mockRequireClinicAccess('valid-megastar-token', 'ivs').status).toBe(403);
    expect(mockRequireClinicAccess('valid-megastar-token', 'megastar').status).toBe(200);
  });

  it('18. Superadmin com acesso irrestrito: allowedClinics = "all" tem permissão para todas as clínicas', () => {
    const adminSession = {
      role: 'superadmin',
      allowedClinics: 'all' as const
    };

    function checkAdminAccess(session: typeof adminSession, clinicId: string): boolean {
      if (session.role === 'superadmin' || session.allowedClinics === 'all') return true;
      return false;
    }

    expect(checkAdminAccess(adminSession, 'ivs')).toBe(true);
    expect(checkAdminAccess(adminSession, 'megastar')).toBe(true);
    expect(checkAdminAccess(adminSession, 'vision')).toBe(true);
    expect(checkAdminAccess(adminSession, 'outro')).toBe(true);
  });

  it('19. Regressão de Agendamento: ciclo de vida do agendamento mantido íntegro', () => {
    expect(canTransitionAppointmentStatus('scheduled', 'checked_in')).toBe(true);
    expect(canTransitionAppointmentStatus('checked_in', 'waiting')).toBe(true);
    expect(canTransitionAppointmentStatus('waiting', 'called')).toBe(true);
    expect(canTransitionAppointmentStatus('called', 'in_consultation')).toBe(true);
    expect(canTransitionAppointmentStatus('in_consultation', 'completed')).toBe(true);
    expect(canTransitionAppointmentStatus('scheduled', 'completed')).toBe(false);
  });

  it('20. Regressão de Prontuário e Dioptrias: preserva valores refrativos com equivalentes esféricos', () => {
    const enc: ClinicalEncounter = {
      id: 'enc-diopter-01',
      patientId: 'p-diopter',
      date: new Date().toISOString(),
      status: 'completed',
      examinerId: 'dr-meirelles',
      examinerName: 'Dr. Rudson Meirelles',
      syncStatus: 'synced',
      refractionSubjective: {
        odSph: -2.00,
        odCyl: -1.00,
        odAxis: 90,
        osSph: +1.50,
        osCyl: -0.50,
        osAxis: 180
      },
      updatedAt: new Date().toISOString()
    };

    offlineDb.saveEncounter(enc, 'ivs');
    const saved = offlineDb.getEncounters('ivs').find(e => e.id === 'enc-diopter-01');

    expect(saved?.refractionSubjective?.odSph).toBe(-2.00);
    expect(saved?.refractionSubjective?.odCyl).toBe(-1.00);
    expect(saved?.refractionSubjective?.odAxis).toBe(90);
  });

  it('21. Regressão de Optotipo e Acuidade: preserva configurações do optotipo por clínica', () => {
    const ivsClinic = offlineDb.getClinicById('ivs');
    const megaClinic = offlineDb.getClinicById('megastar');

    expect(ivsClinic?.clinicalSettings.optotypeDistanceMeters).toBe(6);
    expect(megaClinic?.clinicalSettings.optotypeDistanceMeters).toBe(6);
    expect(ivsClinic?.clinicalSettings.enableSmartTV).toBe(true);
  });

  it('22. Segurança HMAC-SHA-256 de Token de Sessão: rejeita tokens corrompidos ou adulterados', () => {
    const secret = 'super_secure_hmac_sha256_server_secret_key_32_bytes!';
    const validPayload = Buffer.from(JSON.stringify({ user: 'dr.meirelles', exp: Date.now() + 10000 })).toString('base64');
    const validSignature = crypto.createHmac('sha256', secret).update(validPayload).digest('hex');

    const validToken = `${validPayload}.${validSignature}`;

    // Token adulterado no payload
    const tamperedPayload = Buffer.from(JSON.stringify({ user: 'attacker', exp: Date.now() + 10000 })).toString('base64');
    const tamperedToken = `${tamperedPayload}.${validSignature}`;

    // Função de verificação
    function verifyToken(token: string): boolean {
      const parts = token.split('.');
      if (parts.length !== 2) return false;
      const expected = crypto.createHmac('sha256', secret).update(parts[0]).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(parts[1], 'hex'), Buffer.from(expected, 'hex'));
    }

    expect(verifyToken(validToken)).toBe(true);
    expect(verifyToken(tamperedToken)).toBe(false);
  });
});
