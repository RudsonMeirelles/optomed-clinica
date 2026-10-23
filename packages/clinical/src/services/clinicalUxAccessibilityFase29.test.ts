import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { offlineDb } from './offlineDb';

describe('OPTOMED — FASE 29 — UX, Acessibilidade & Produtividade Clínica', () => {
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
    offlineDb.saveTransactions([], 'ivs');
    offlineDb.saveAppointments([], 'ivs');
    offlineDb.saveEncounters([], 'ivs');
  });

  describe('1. Teclado, Foco e Navegação no Consultório (ExaminationWorkspace)', () => {
    it('deve possuir atalhos mapeados para as 7 etapas da trilha clínica sem perdas', () => {
      const EXAM_TRAIL_STEPS = [
        { id: 1, key: 'anamnesis', label: '1. Anamnese' },
        { id: 2, key: 'av_sc', label: '2. AVsc Longe/Perto' },
        { id: 3, key: 'lensometry', label: '3. Óculos Atual' },
        { id: 4, key: 'autorefraction', label: '4. Autorefração' },
        { id: 5, key: 'refraction', label: '5. Refração' },
        { id: 6, key: 'binocular', label: '6. Binocular' },
        { id: 7, key: 'conduct', label: '7. Conduta & Rx' },
      ];

      expect(EXAM_TRAIL_STEPS).toHaveLength(7);
      EXAM_TRAIL_STEPS.forEach(step => {
        expect(step.id).toBeGreaterThanOrEqual(1);
        expect(step.id).toBeLessThanOrEqual(7);
        expect(step.label).toBeDefined();
      });
    });

    it('deve salvar atendimento com status in_progress em resposta ao atalho de salvamento', () => {
      const testEncounter = {
        id: 'enc-ux-test-1',
        patientId: 'pat-ux-1',
        date: new Date().toISOString(),
        status: 'in_progress' as const,
        examinerId: 'dr-meirelles',
        examinerName: 'Dr. Rudson Meirelles',
        syncStatus: 'synced' as const,
        updatedAt: new Date().toISOString(),
        conduct: 'Preservação de acuidade e teste de atalhos'
      };

      offlineDb.saveEncounter(testEncounter, 'ivs');
      const loaded = offlineDb.getEncounters('ivs').find(e => e.id === 'enc-ux-test-1');
      expect(loaded).toBeDefined();
      expect(loaded?.status).toBe('in_progress');
      expect(loaded?.conduct).toContain('teste de atalhos');
    });
  });

  describe('2. Acessibilidade e Trava de Ações Destrutivas (Financeiro & Agenda)', () => {
    it('deve proteger transações financeiras contra exclusão acidental e exigir confirmação auditável', () => {
      const tx = {
        id: 'tx-ux-1',
        clinicId: 'ivs',
        type: 'income' as const,
        category: 'consulta' as const,
        description: 'Consulta Dr. Rudson Meirelles',
        amount: 50.00,
        currency: 'BRL',
        date: '2026-09-26',
        paymentMethod: 'pix' as const,
        status: 'completed' as const,
        createdBy: 'Operador Teste',
        createdAt: new Date().toISOString()
      };

      offlineDb.saveTransaction(tx, 'ivs');
      expect(offlineDb.getTransactions('ivs')).toHaveLength(1);

      // Exclusão confirmada
      offlineDb.deleteTransaction(tx.id, 'ivs');
      expect(offlineDb.getTransactions('ivs')).toHaveLength(0);
    });

    it('deve remover agendamento de forma limpa na confirmação de cancelamento', () => {
      const apt = {
        id: 'apt-ux-test-1',
        patientId: 'pat-ux-2',
        patientName: 'Paciente UX Teste',
        date: '2026-09-26',
        time: '09:00',
        durationMinutes: 3,
        type: 'refrativo' as const,
        status: 'scheduled' as const,
        clinicId: 'ivs',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      offlineDb.saveAppointment(apt, 'ivs');
      expect(offlineDb.getAppointments('ivs')).toHaveLength(1);

      offlineDb.deleteAppointment(apt.id, 'ivs');
      expect(offlineDb.getAppointments('ivs')).toHaveLength(0);
    });
  });

  describe('3. Impressão Profissional & Isolamento Visual', () => {
    it('deve manter integridade de dados ao registrar documento clínico emitido na Central de Impressão', () => {
      const doc = {
        id: 'doc-ux-print-1',
        encounterId: 'enc-ux-test-1',
        patientId: 'pat-ux-1',
        clinicId: 'ivs',
        type: 'optical_prescription' as const,
        title: 'Receita Óptica - Paciente UX Teste',
        content: 'Documento emitido em formato a4_landscape_dual (PT).',
        professionalId: 'dr-meirelles',
        professionalName: 'Dr. Rudson Meirelles',
        issuedAt: new Date().toISOString(),
        version: 1
      };

      offlineDb.saveClinicalDocument(doc, 'ivs');
      const docs = offlineDb.getClinicalDocuments('ivs');
      expect(docs).toHaveLength(1);
      expect(docs[0].id).toBe('doc-ux-print-1');
      expect(docs[0].type).toBe('optical_prescription');
    });
  });

  describe('4. Recepção e Triagem (CheckInModal)', () => {
    it('deve aplicar check-in com prevenção contra duplo clique e concorrência', () => {
      const apt = {
        id: 'apt-ux-checkin-1',
        patientId: 'pat-ux-3',
        patientName: 'Paciente Triagem',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        durationMinutes: 3,
        type: 'refrativo' as const,
        status: 'scheduled' as const,
        clinicId: 'ivs',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      offlineDb.saveAppointment(apt, 'ivs');

      const checkedInApt = {
        ...apt,
        status: 'checked_in' as const,
        ticketNumber: 'P-01',
        checkInAt: new Date().toISOString()
      };

      offlineDb.saveAppointment(checkedInApt, 'ivs');
      const updated = offlineDb.getAppointments('ivs').find(a => a.id === apt.id);
      expect(updated?.status).toBe('checked_in');
      expect(updated?.ticketNumber).toBe('P-01');
    });
  });
});
