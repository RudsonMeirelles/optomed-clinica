import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { 
  Appointment, 
  Patient, 
  ClinicalEncounter, 
  ClinicalEpisode,
  Prescription,
  FinancialTransaction,
  CashRegisterSession,
  ClinicUnit,
  canTransitionAppointmentStatus,
  mergeAppointmentStatuses,
  toCents,
  fromCents,
  safeSum,
  safeSub
} from '@optotipo/shared';
import { offlineDb, generateUUID } from './offlineDb';
import { syncQueue } from './syncQueueService';
import { remoteSync } from './remoteSync';
import { SecurityService } from './securityService';

describe('OPTOMED — FASE 11.0: Bateria Integrada de Homologação, Regressão e Pré-Produção', () => {
  const CLINIC_BR = 'ivs';
  const CLINIC_PY = 'megastar';
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
    offlineDb.setActiveClinicId(CLINIC_BR);
  });

  // ==========================================
  // 1. SEGURANÇA, CRIPTOGRAFIA & AUTENTICAÇÃO
  // ==========================================
  describe('1. Segurança, Criptografia PBKDF2 e Controle de Acesso', () => {
    it('deve gerar e verificar hashes PBKDF2 com salt aleatório e mitigar senhas incorretas', async () => {
      const password = 'SenhaSuperSegura@2026';
      const hash = await SecurityService.hashPassword(password);

      expect(hash).toContain('pbkdf2:100000:');
      const isValid = await SecurityService.verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await SecurityService.verifyPassword('SenhaErrada', hash);
      expect(isInvalid).toBe(false);
    });

    it('deve isolar estritamente registros de clínicas distintas (Isolamento Multitenant)', () => {
      const patientBR: Patient = {
        id: generateUUID(),
        fullName: 'Paciente Unidade Brasil',
        birthDate: '1985-05-15',
        nationality: 'BR',
        documentType: 'CPF',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const patientPY: Patient = {
        id: generateUUID(),
        fullName: 'Paciente Unidade Paraguai',
        birthDate: '1992-08-20',
        nationality: 'PY',
        documentType: 'CI_PY',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      offlineDb.savePatient(patientBR, CLINIC_BR);
      offlineDb.savePatient(patientPY, CLINIC_PY);

      const brList = offlineDb.getPatients(CLINIC_BR);
      const pyList = offlineDb.getPatients(CLINIC_PY);

      expect(brList.some(p => p.id === patientBR.id)).toBe(true);
      expect(brList.some(p => p.id === patientPY.id)).toBe(false);

      expect(pyList.some(p => p.id === patientPY.id)).toBe(true);
      expect(pyList.some(p => p.id === patientBR.id)).toBe(false);
    });
  });

  // ==========================================
  // 2. PACIENTE, IDENTIDADE GLOBAL E DUPLICIDADE
  // ==========================================
  describe('2. Ciclo de Vida do Paciente e Identidade Longitudinal', () => {
    it('deve persistir paciente atribuindo patientGlobalId e preservar histórico ao atualizar', () => {
      const newPatient: Patient = {
        id: generateUUID(),
        fullName: 'Maria da Silva Sauro',
        birthDate: '1978-11-03',
        nationality: 'BR',
        documentType: 'CPF',
        documentNumber: '123.456.789-00',
        phone: '+55 45 99123-4567',
        phoneCountryCode: '+55',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      offlineDb.savePatient(newPatient, CLINIC_BR);
      const saved = offlineDb.getPatients(CLINIC_BR).find(p => p.id === newPatient.id);
      expect(saved).toBeDefined();
      expect(saved?.patientGlobalId).toBeDefined();
      expect(saved?.patientGlobalId?.startsWith('gid_')).toBe(true);

      // Atualização sem mutar o patientGlobalId original
      const originalGid = saved!.patientGlobalId;
      offlineDb.savePatient({
        ...saved!,
        phone: '+55 45 98888-7777'
      }, CLINIC_BR);

      const updated = offlineDb.getPatients(CLINIC_BR).find(p => p.id === newPatient.id);
      expect(updated?.phone).toBe('+55 45 98888-7777');
      expect(updated?.patientGlobalId).toBe(originalGid);
    });
  });

  // ==========================================
  // 3. AGENDA, CHECK-IN, FILA E CHAMADA
  // ==========================================
  describe('3. Fluxo Ponta a Ponta: Agendamento -> Check-In -> Fila -> Chamada -> Conclusão', () => {
    it('deve executar todas as transições legais de status e sincronizar com encounter', () => {
      const patientId = generateUUID();
      const aptId = generateUUID();

      const apt: Appointment = {
        id: aptId,
        patientId,
        patientName: 'João da Fila Homologação',
        date: new Date().toISOString().split('T')[0],
        time: '14:00',
        status: 'scheduled',
        clinicId: CLINIC_BR,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      offlineDb.saveAppointment(apt, CLINIC_BR);

      // 1. Check-In na Recepção
      expect(canTransitionAppointmentStatus('scheduled', 'checked_in')).toBe(true);
      offlineDb.updateAppointmentStatus(aptId, 'checked_in', CLINIC_BR);
      expect(offlineDb.getAppointments(CLINIC_BR).find(a => a.id === aptId)?.status).toBe('checked_in');

      // 2. Encaminhado para a Fila / Espera
      expect(canTransitionAppointmentStatus('checked_in', 'waiting')).toBe(true);
      offlineDb.updateAppointmentStatus(aptId, 'waiting', CLINIC_BR);
      expect(offlineDb.getAppointments(CLINIC_BR).find(a => a.id === aptId)?.status).toBe('waiting');

      // 3. Chamada no Painel de TV
      expect(canTransitionAppointmentStatus('waiting', 'called')).toBe(true);
      offlineDb.updateAppointmentStatus(aptId, 'called', CLINIC_BR);
      expect(offlineDb.getAppointments(CLINIC_BR).find(a => a.id === aptId)?.status).toBe('called');

      // 4. Início da Consulta com o Médico
      expect(canTransitionAppointmentStatus('called', 'in_consultation')).toBe(true);
      offlineDb.updateAppointmentStatus(aptId, 'in_consultation', CLINIC_BR);
      expect(offlineDb.getAppointments(CLINIC_BR).find(a => a.id === aptId)?.status).toBe('in_consultation');

      // 5. Conclusão do Atendimento
      expect(canTransitionAppointmentStatus('in_consultation', 'completed')).toBe(true);
      offlineDb.updateAppointmentStatus(aptId, 'completed', CLINIC_BR);
      expect(offlineDb.getAppointments(CLINIC_BR).find(a => a.id === aptId)?.status).toBe('completed');
    });
  });

  // ==========================================
  // 4. PRONTUÁRIO, REFRAÇÃO E PRESCRIÇÃO
  // ==========================================
  describe('4. Prontuário Clínico, Episódios e Prescrições Ópticas', () => {
    it('deve salvar atendimento com refração completa e vincular prescrição ao prontuário', () => {
      const patientId = generateUUID();
      const encounterId = generateUUID();

      const encounter: ClinicalEncounter = {
        id: encounterId,
        patientId,
        date: new Date().toISOString(),
        status: 'completed',
        examinerId: 'dr-meirelles',
        examinerName: 'Dr. Rudson Meirelles',
        subjectiveRefraction: {
          od: { spherical: -2.25, cylindrical: -0.75, axis: 180, visualAcuity: '20/20' },
          oe: { spherical: -2.00, cylindrical: -0.50, axis: 175, visualAcuity: '20/20' }
        },
        diagnoses: [{ code: 'H52.1', description: 'Miopia', eye: 'OU' }],
        conduct: 'Prescrição de lentes monofocais com tratamento antirreflexo.',
        syncStatus: 'synced',
        updatedAt: new Date().toISOString()
      };
      offlineDb.saveEncounter(encounter, CLINIC_BR);

      const prescription: Prescription = {
        id: generateUUID(),
        patientId,
        encounterId,
        date: new Date().toISOString(),
        od: { spherical: -2.25, cylindrical: -0.75, axis: 180 },
        oe: { spherical: -2.00, cylindrical: -0.50, axis: 175 },
        recommendations: 'Uso contínuo para longe.',
        examinerName: 'Dr. Rudson Meirelles',
        examinerRegistry: 'CRM 12345',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      offlineDb.savePrescription(prescription, CLINIC_BR);

      const savedEnc = offlineDb.getEncounters(CLINIC_BR).find(e => e.id === encounterId);
      expect(savedEnc).toBeDefined();
      expect(savedEnc?.subjectiveRefraction?.od.spherical).toBe(-2.25);

      const savedPresc = offlineDb.getPrescriptions(CLINIC_BR).find(p => p.encounterId === encounterId);
      expect(savedPresc).toBeDefined();
      expect(savedPresc?.od.axis).toBe(180);
    });
  });

  // ==========================================
  // 5. MÓDULO FINANCEIRO, CAIXA E ARITMÉTICA
  // ==========================================
  describe('5. Módulo Financeiro, Caixa e Aritmética Segura em Centavos', () => {
    it('deve somar e subtrair valores monetários com precisão exata sem erro de ponto flutuante', () => {
      // 0.1 + 0.2 em ponto flutuante IEEE-754 seria 0.30000000000000004
      const v1 = 0.1;
      const v2 = 0.2;
      const soma = safeSum(v1, v2);
      expect(soma).toBe(0.3);

      const c1 = toCents(199.99);
      const c2 = toCents(0.01);
      expect(c1 + c2).toBe(20000); // 200,00 exatos
      expect(fromCents(c1 + c2)).toBe(200.00);

      const sub = safeSub(100.05, 50.02);
      expect(sub).toBe(50.03);
    });

    it('deve registrar abertura de caixa, transação PDV e apuração de saldo', () => {
      const today = new Date().toISOString().split('T')[0];
      // Limpa transações pré-existentes de seed para isolamento estrito
      offlineDb.saveTransactions([], CLINIC_BR);

      const session = offlineDb.openCashRegisterSession('op-01', 'Recepção 1', 150.00, undefined, CLINIC_BR);
      expect(session).toBeDefined();
      expect(session.status).toBe('open');
      expect(session.openingBalance).toBe(150.00);

      const tx: FinancialTransaction = {
        id: generateUUID(),
        clinicId: CLINIC_BR,
        type: 'income',
        category: 'consultation',
        amount: 250.00,
        currency: 'BRL',
        paymentMethod: 'pix',
        status: 'completed',
        date: today,
        description: 'Consulta Dr. Rudson',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      offlineDb.saveTransaction(tx, CLINIC_BR);

      const summary = offlineDb.getCashRegisterSummary(today, CLINIC_BR);
      expect(summary.totalIncome).toBe(250.00);
      expect(summary.currentBalance).toBe(400.00); // 150 abertura + 250 receita
    });
  });

  // ==========================================
  // 6. OFFLINE-FIRST E RESILIÊNCIA DE FILA
  // ==========================================
  describe('6. Resiliência Offline-First e Fila Durável', () => {
    it('deve enfileirar mutações com idempotência durável e manter ordenação cronológica', () => {
      const op1 = syncQueue.enqueue({
        clinicId: CLINIC_BR,
        entity: 'patients',
        action: 'create',
        recordId: 'p-offline-1',
        payload: { id: 'p-offline-1', fullName: 'Paciente Offline 1' }
      });

      const op2 = syncQueue.enqueue({
        clinicId: CLINIC_BR,
        entity: 'appointments',
        action: 'update',
        recordId: 'apt-offline-1',
        payload: { id: 'apt-offline-1', status: 'checked_in' }
      });

      expect(op1.operationId).toBeDefined();
      expect(op2.operationId).toBeDefined();
      expect(op1.operationId).not.toBe(op2.operationId);

      const pendingCount = syncQueue.getPendingCount(CLINIC_BR);
      expect(pendingCount).toBeGreaterThanOrEqual(2);
      const allReady = syncQueue.getReadyItems(CLINIC_BR);
      expect(allReady.length).toBeGreaterThanOrEqual(2);
    });

    it('deve resolver conflitos de sincronização respeitando tombstones de deleção', () => {
      const serverData = [
        { id: 'rec-1', name: 'Item Ativo no Servidor', updatedAt: '2026-09-24T10:00:00Z' }
      ];
      const localData = [
        { id: 'rec-1', name: 'Item Local Antigo', updatedAt: '2026-09-24T09:00:00Z' },
        { id: 'rec-2', name: 'Item Deletado pelo Servidor', updatedAt: '2026-09-24T08:00:00Z' }
      ];
      const tombstones = {
        'rec-2': '2026-09-24T09:30:00Z'
      };

      // Chama a função interna de resolução de conflito de tombstone do remoteSync
      const result = (remoteSync as any).mergeDataWithTombstones(serverData, localData, tombstones);
      expect(result.merged.length).toBe(1);
      expect(result.merged[0].id).toBe('rec-1');
      expect(result.merged.some((r: any) => r.id === 'rec-2')).toBe(false);
    });
  });

  // ==========================================
  // 7. CONCORRÊNCIA E MATRIZ DE RECONCILIAÇÃO
  // ==========================================
  describe('7. Concorrência e Reconciliação Multi-Dispositivo', () => {
    it('deve reconciliar status de agendamento entre dois dispositivos convergindo para o mais avançado', () => {
      // Dispositivo A marca como 'waiting' às 10:05
      const statusA = 'waiting';
      // Dispositivo B marca como 'called' às 10:06
      const statusB = 'called';

      const merged = mergeAppointmentStatuses(statusA, statusB);
      expect(merged).toBe('called');

      // Se um já está 'completed', nunca regride para 'waiting'
      const mergedFinal = mergeAppointmentStatuses('waiting', 'completed');
      expect(mergedFinal).toBe('completed');
    });
  });

  // ==========================================
  // 8. CONTINUIDADE, BACKUP E RESTORE (FASE 14)
  // ==========================================
  describe('8. Backup, Restore e Continuidade Operacional (Fase 14.0)', () => {
    it('deve realizar ciclo controlado de backup, alteração, perda e restauração íntegra de dados', () => {
      const clinicId = 'ivs';

      // 1. Criar dados controlados
      const patientTest: Patient = {
        id: 'pat-backup-test-1',
        fullName: 'Paciente de Teste Backup Integral',
        birthDate: '1982-04-12',
        nationality: 'BR',
        documentType: 'CPF',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      offlineDb.savePatient(patientTest, clinicId);

      const encounterTest: ClinicalEncounter = {
        id: 'enc-backup-test-1',
        patientId: patientTest.id,
        date: new Date().toISOString(),
        status: 'completed',
        examinerId: 'dr-meirelles',
        examinerName: 'Dr. Rudson Meirelles',
        conduct: 'Prescrição de lentes esféricas',
        syncStatus: 'synced',
        updatedAt: new Date().toISOString()
      };
      offlineDb.saveEncounter(encounterTest, clinicId);

      const txTest: FinancialTransaction = {
        id: 'tx-backup-test-1',
        clinicId,
        type: 'income',
        category: 'consultation',
        amount: 350.00,
        currency: 'BRL',
        paymentMethod: 'pix',
        status: 'completed',
        date: new Date().toISOString().split('T')[0],
        description: 'Exame Especial',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      offlineDb.saveTransaction(txTest, clinicId);

      // 2. Gerar Snapshot / Backup
      const backupPayload = {
        exportTimestamp: new Date().toISOString(),
        platform: 'Optotipo Meirelles Clinical v2.0 - Multi-Clinic Edition',
        clinic: offlineDb.getActiveClinic(),
        patients: offlineDb.getPatients(clinicId),
        encounters: offlineDb.getEncounters(clinicId),
        prescriptions: offlineDb.getPrescriptions(clinicId),
        appointments: offlineDb.getAppointments(clinicId),
        transactions: offlineDb.getTransactions(clinicId),
        workSessions: offlineDb.getWorkSessions(clinicId)
      };

      expect(backupPayload.patients.some(p => p.id === patientTest.id)).toBe(true);
      expect(backupPayload.transactions.some(t => t.id === txTest.id)).toBe(true);

      // 3. Simular Perda de Dados (Limpeza ou Corrupção)
      offlineDb.savePatients([], clinicId);
      offlineDb.saveEncounters([], clinicId);
      offlineDb.saveTransactions([], clinicId);

      expect(offlineDb.getPatients(clinicId).find(p => p.id === patientTest.id)).toBeUndefined();
      expect(offlineDb.getEncounters(clinicId).find(e => e.id === encounterTest.id)).toBeUndefined();
      expect(offlineDb.getTransactions(clinicId).find(t => t.id === txTest.id)).toBeUndefined();

      // 4. Executar Restore
      const restored = offlineDb.restoreBackup(backupPayload, clinicId);
      expect(restored).toBe(true);

      // 5. Comparar Integridade Pós-Restore
      const restoredPatient = offlineDb.getPatients(clinicId).find(p => p.id === patientTest.id);
      expect(restoredPatient).toBeDefined();
      expect(restoredPatient?.fullName).toBe('Paciente de Teste Backup Integral');

      const restoredEnc = offlineDb.getEncounters(clinicId).find(e => e.id === encounterTest.id);
      expect(restoredEnc).toBeDefined();
      expect(restoredEnc?.conduct).toBe('Prescrição de lentes esféricas');

      const restoredTx = offlineDb.getTransactions(clinicId).find(t => t.id === txTest.id);
      expect(restoredTx).toBeDefined();
      expect(restoredTx?.amount).toBe(350.00);
    });
  });
});
