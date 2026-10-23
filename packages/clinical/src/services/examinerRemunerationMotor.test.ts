import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { offlineDb } from './offlineDb';
import { examinerRemunerationService } from './examinerRemunerationService';
import { Appointment, ExaminerFixedPeriod, ExaminerSpecialPeriod } from '@optotipo/shared';

describe('Motor de Regras de Remuneração dos Examinadores (Optomed Clinical)', () => {
  const CLINIC_ID = 'ivs_motor_test';
  const EXAMINER_ID = 'dr_test';
  const EXAMINER_NAME = 'Dr. Teste Motor';
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
  });

  // --------------------------------------------------------------------------
  // TESTE 1: Consulta dentro de período fixo -> PERÍODO_FIXO
  // --------------------------------------------------------------------------
  it('TESTE 1: Consulta dentro de período fixo recorrente -> aplica regra do PERÍODO FIXO', () => {
    // Terça-feira (dia da semana = 2), 13:00 às 17:30, R$ 500,00
    const fixedPeriod: ExaminerFixedPeriod = {
      id: 'efp_tuesday',
      clinicId: CLINIC_ID,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      dayOfWeek: 2, // Terça
      startTime: '13:00',
      endTime: '17:30',
      validFrom: '2026-10-01',
      remunerationType: 'fixed_period',
      fixedAmount: 500.00,
      active: true,
      notes: 'Terça-feira fixa',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z'
    };
    offlineDb.saveExaminerFixedPeriod(fixedPeriod, CLINIC_ID);

    // 06/10/2026 é Terça-feira. Horário: 14:00 (dentro de 13:00-17:30)
    const preview = examinerRemunerationService.previewExaminerRemuneration({
      clinicId: CLINIC_ID,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-06',
      time: '14:00'
    });

    expect(preview.applicable).toBe(true);
    expect(preview.ruleType).toBe('fixed');
    expect(preview.ruleId).toBe('efp_tuesday');
    expect(preview.amount).toBe(500.00);
    expect(preview.conflict).toBe(false);
  });

  // --------------------------------------------------------------------------
  // TESTE 2: Consulta fora do período fixo -> AVULSO
  // --------------------------------------------------------------------------
  it('TESTE 2: Consulta fora de qualquer período fixo ou extraordinário -> aplica regra AVULSO', () => {
    // Regra avulsa de R$ 100 por consulta
    offlineDb.saveExaminerAvulsoRule({
      id: 'avulso_rule_1',
      clinicId: CLINIC_ID,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      perAppointmentAmount: 100.00,
      active: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z'
    }, CLINIC_ID);

    // Quinta-feira (08/10/2026) às 14:00 (sem período fixo cadastrado para quinta)
    const preview = examinerRemunerationService.previewExaminerRemuneration({
      clinicId: CLINIC_ID,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-08',
      time: '14:00'
    });

    expect(preview.applicable).toBe(true);
    expect(preview.ruleType).toBe('avulso');
    expect(preview.amount).toBe(100.00);
    expect(preview.conflict).toBe(false);
  });

  // --------------------------------------------------------------------------
  // TESTE 3: Consulta dentro de período extraordinário -> EXTRAORDINÁRIO
  // --------------------------------------------------------------------------
  it('TESTE 3: Consulta dentro de período extraordinário -> prioridade para EXTRAORDINÁRIO', () => {
    // Cadastra extraordinário para 10/10/2026 das 08:00 às 12:00, R$ 350,00
    const special: ExaminerSpecialPeriod = {
      id: 'esp_mutirao',
      clinicId: CLINIC_ID,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-10',
      startTime: '08:00',
      endTime: '12:00',
      remunerationType: 'fixed_period',
      fixedAmount: 350.00,
      status: 'active',
      notes: 'Mutirão Especial',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z'
    };
    offlineDb.saveExaminerSpecialPeriod(special, CLINIC_ID);

    const preview = examinerRemunerationService.previewExaminerRemuneration({
      clinicId: CLINIC_ID,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-10',
      time: '09:30'
    });

    expect(preview.applicable).toBe(true);
    expect(preview.ruleType).toBe('extraordinary');
    expect(preview.ruleId).toBe('esp_mutirao');
    expect(preview.amount).toBe(350.00);
    expect(preview.conflict).toBe(false);
  });

  // --------------------------------------------------------------------------
  // TESTE 4: Extraordinário sobrepondo outro período de forma ambígua -> CONFLITO
  // --------------------------------------------------------------------------
  it('TESTE 4: Sobreposição de regras extraordinárias concorrentes -> detecta CONFLITO e bloqueia geração silenciosa', () => {
    // Cadastra 2 extraordinários concorrentes no mesmo dia e horário
    offlineDb.saveExaminerSpecialPeriod({
      id: 'esp_1',
      clinicId: CLINIC_ID,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-15',
      startTime: '08:00',
      endTime: '12:00',
      remunerationType: 'fixed_period',
      fixedAmount: 300.00,
      status: 'active',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z'
    }, CLINIC_ID);

    offlineDb.saveExaminerSpecialPeriod({
      id: 'esp_2',
      clinicId: CLINIC_ID,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-15',
      startTime: '10:00',
      endTime: '14:00',
      remunerationType: 'fixed_period',
      fixedAmount: 400.00,
      status: 'active',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z'
    }, CLINIC_ID);

    // Consulta às 11:00 cai nos dois extraordinários simultaneamente
    const preview = examinerRemunerationService.previewExaminerRemuneration({
      clinicId: CLINIC_ID,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-15',
      time: '11:00'
    });

    expect(preview.conflict).toBe(true);
    expect(preview.status).toBe('CONFLICT');
    expect(preview.amount).toBe(0);
  });

  // --------------------------------------------------------------------------
  // TESTE 5: Consulta cancelada -> SEM_REMUNERAÇÃO
  // --------------------------------------------------------------------------
  it('TESTE 5: Consulta cancelada ou no-show não gera remuneração para o examinador', () => {
    const canceledApt: Appointment = {
      id: 'apt_cancel_1',
      clinicId: CLINIC_ID,
      patientId: 'pat_1',
      patientName: 'Paciente Cancelado',
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-06',
      time: '14:00',
      status: 'canceled',
      type: 'consulta_geral',
      durationMinutes: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = examinerRemunerationService.generateRemunerationOnAppointmentCompletion(canceledApt, CLINIC_ID);
    expect(res.success).toBe(false);
    expect(res.message).toContain('SEM_REMUNERAÇÃO');
  });

  // --------------------------------------------------------------------------
  // TESTE 6: Consulta realizada -> REMUNERAÇÃO GERADA
  // --------------------------------------------------------------------------
  it('TESTE 6: Consulta realizada (status completed) -> remuneração gerada automaticamente com snapshot', () => {
    const completedApt: Appointment = {
      id: 'apt_done_1',
      clinicId: CLINIC_ID,
      patientId: 'pat_2',
      patientName: 'Paciente Atendido',
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-08',
      time: '14:00',
      status: 'completed',
      type: 'refrativo',
      durationMinutes: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = examinerRemunerationService.generateRemunerationOnAppointmentCompletion(completedApt, CLINIC_ID);
    expect(res.success).toBe(true);
    expect(res.record).toBeDefined();
    expect(res.record?.appointmentId).toBe('apt_done_1');
    expect(res.record?.finalAmount).toBeGreaterThan(0);
    expect(res.record?.ruleSnapshot).toBeDefined();
    expect(res.record?.ruleSnapshot.snapshotAt).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // TESTE 7: Idempotência: mesmo evento processado duas vezes -> DUPLICIDADE BLOQUEADA
  // --------------------------------------------------------------------------
  it('TESTE 7: Tentativa de gerar remuneração repetida para a mesma consulta -> DUPLICIDADE BLOQUEADA', () => {
    const completedApt: Appointment = {
      id: 'apt_idempotent_1',
      clinicId: CLINIC_ID,
      patientId: 'pat_3',
      patientName: 'Paciente Único',
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-08',
      time: '15:00',
      status: 'completed',
      type: 'consulta_geral',
      durationMinutes: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res1 = examinerRemunerationService.generateRemunerationOnAppointmentCompletion(completedApt, CLINIC_ID);
    expect(res1.success).toBe(true);

    const res2 = examinerRemunerationService.generateRemunerationOnAppointmentCompletion(completedApt, CLINIC_ID);
    expect(res2.success).toBe(true);
    expect(res2.message).toContain('DUPLICIDADE BLOQUEADA');

    const records = offlineDb.getExaminerRemunerations(CLINIC_ID).filter(r => r.appointmentId === 'apt_idempotent_1');
    expect(records).toHaveLength(1);
  });

  // --------------------------------------------------------------------------
  // TESTE 8: Período fechado -> ALTERAÇÃO BLOQUEADA OU AUDITADA
  // --------------------------------------------------------------------------
  it('TESTE 8: Período fechado -> edição sem justificativa bloqueada; ajuste com justificativa auditado', () => {
    const apt: Appointment = {
      id: 'apt_closure_1',
      clinicId: CLINIC_ID,
      patientId: 'pat_4',
      patientName: 'Paciente Fechamento',
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-02',
      time: '10:00',
      status: 'completed',
      type: 'consulta_geral',
      durationMinutes: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const gen = examinerRemunerationService.generateRemunerationOnAppointmentCompletion(apt, CLINIC_ID);
    expect(gen.success).toBe(true);

    // Fecha o período
    const closeRes = examinerRemunerationService.closeExaminerPeriod(
      CLINIC_ID,
      EXAMINER_ID,
      EXAMINER_NAME,
      '2026-10-01',
      '2026-10-05',
      'Admin Geral'
    );
    expect(closeRes.success).toBe(true);
    expect(closeRes.closure?.status).toBe('closed');

    // Tentativa de alteração sem justificativa em período fechado
    const blockedRes = examinerRemunerationService.adjustRemuneration(
      gen.record!.id,
      150.00,
      '', // Sem justificativa
      'Operador',
      CLINIC_ID
    );
    expect(blockedRes.success).toBe(false);
    expect(blockedRes.message).toContain('ALTERAÇÃO BLOQUEADA');

    // Ajuste com justificativa administrativa válida
    const adjustRes = examinerRemunerationService.adjustRemuneration(
      gen.record!.id,
      150.00,
      'Acréscimo de procedimento autorizado pela direção',
      'Admin Geral',
      CLINIC_ID
    );
    expect(adjustRes.success).toBe(true);
    expect(adjustRes.record?.finalAmount).toBe(150.00);
    expect(adjustRes.record?.isRetroactiveAdjusted).toBe(true);
    expect(adjustRes.record?.auditTrail.some(a => a.action === 'ADJUST')).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TESTE 9: Regra alterada posteriormente -> HISTÓRICO ANTERIOR PRESERVADO
  // --------------------------------------------------------------------------
  it('TESTE 9: Alteração posterior de regras de remuneração preserva o snapshot dos atendimentos passados', () => {
    // Cadastra regra inicial de R$ 80
    offlineDb.saveExaminerAvulsoRule({
      id: 'avulso_rule_history',
      clinicId: CLINIC_ID,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      perAppointmentAmount: 80.00,
      active: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z'
    }, CLINIC_ID);

    const aptPast: Appointment = {
      id: 'apt_past_1',
      clinicId: CLINIC_ID,
      patientId: 'pat_past',
      patientName: 'Paciente Passado',
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-03',
      time: '11:00',
      status: 'completed',
      type: 'consulta_geral',
      durationMinutes: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const gen = examinerRemunerationService.generateRemunerationOnAppointmentCompletion(aptPast, CLINIC_ID);
    expect(gen.record?.finalAmount).toBe(80.00);

    // Administrador altera o valor da regra avulsa posteriormente para R$ 120
    offlineDb.saveExaminerAvulsoRule({
      id: 'avulso_rule_history',
      clinicId: CLINIC_ID,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      perAppointmentAmount: 120.00,
      active: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: new Date().toISOString()
    }, CLINIC_ID);

    // O lançamento passado permanece intacto em R$ 80 graças ao snapshot congelado
    const stored = offlineDb.getExaminerRemunerations(CLINIC_ID).find(r => r.appointmentId === 'apt_past_1');
    expect(stored?.finalAmount).toBe(80.00);
    expect(stored?.ruleSnapshot.remunerationValue).toBe(80.00);
  });

  // --------------------------------------------------------------------------
  // TESTE 10: Operação Offline e sincronização posterior sem duplicação
  // --------------------------------------------------------------------------
  it('TESTE 10: Atendimento concluído offline é salvo localmente e sincronização não duplica o registro', () => {
    const aptOffline: Appointment = {
      id: 'apt_offline_test',
      clinicId: CLINIC_ID,
      patientId: 'pat_offline',
      patientName: 'Paciente Offline',
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-07',
      time: '16:00',
      status: 'completed',
      type: 'refrativo',
      durationMinutes: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Gera localmente (modo offline)
    const genOffline = examinerRemunerationService.generateRemunerationOnAppointmentCompletion(aptOffline, CLINIC_ID);
    expect(genOffline.success).toBe(true);

    // Recupera diretamente do storage local
    const localRecords = offlineDb.getExaminerRemunerations(CLINIC_ID);
    const found = localRecords.find(r => r.appointmentId === 'apt_offline_test');
    expect(found).toBeDefined();

    // Simula recebimento de pacote de sincronização com o mesmo evento
    const syncRes = examinerRemunerationService.generateRemunerationOnAppointmentCompletion(aptOffline, CLINIC_ID);
    expect(syncRes.message).toContain('DUPLICIDADE BLOQUEADA');

    // Permanece com exatamente 1 registro
    const all = offlineDb.getExaminerRemunerations(CLINIC_ID).filter(r => r.appointmentId === 'apt_offline_test');
    expect(all).toHaveLength(1);
  });

  // --------------------------------------------------------------------------
  // TESTE 11: Análise de Limites de Horário (Início, Meio, Final e Exatamente Fora)
  // --------------------------------------------------------------------------
  it('TESTE 11: Limites de Horário: exatamente no início (13:00) e fim (17:30) é FIXO; 17:31 é AVULSO', () => {
    offlineDb.saveExaminerFixedPeriod({
      id: 'efp_boundary_test',
      clinicId: CLINIC_ID,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      dayOfWeek: 2, // Terça
      startTime: '13:00',
      endTime: '17:30',
      validFrom: '2026-10-01',
      remunerationType: 'fixed_period',
      fixedAmount: 500.00,
      active: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z'
    }, CLINIC_ID);

    offlineDb.saveExaminerAvulsoRule({
      id: 'avulso_boundary_rule',
      clinicId: CLINIC_ID,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      perAppointmentAmount: 100.00,
      active: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z'
    }, CLINIC_ID);

    // 12:59 -> Fora (AVULSO)
    const prevBefore = examinerRemunerationService.previewExaminerRemuneration({
      clinicId: CLINIC_ID,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-06',
      time: '12:59'
    });
    expect(prevBefore.ruleType).toBe('avulso');
    expect(prevBefore.amount).toBe(100.00);

    // 13:00 -> Exatamente no início (FIXO)
    const prevStart = examinerRemunerationService.previewExaminerRemuneration({
      clinicId: CLINIC_ID,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-06',
      time: '13:00'
    });
    expect(prevStart.ruleType).toBe('fixed');
    expect(prevStart.amount).toBe(500.00);

    // 17:30 -> Exatamente no final (FIXO)
    const prevEnd = examinerRemunerationService.previewExaminerRemuneration({
      clinicId: CLINIC_ID,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-06',
      time: '17:30'
    });
    expect(prevEnd.ruleType).toBe('fixed');
    expect(prevEnd.amount).toBe(500.00);

    // 17:31 -> 1 minuto após o fim (AVULSO)
    const prevAfter = examinerRemunerationService.previewExaminerRemuneration({
      clinicId: CLINIC_ID,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-06',
      time: '17:31'
    });
    expect(prevAfter.ruleType).toBe('avulso');
    expect(prevAfter.amount).toBe(100.00);
  });

  // --------------------------------------------------------------------------
  // TESTE 12: Extraordinário sobrepondo Período Fixo -> Extraordinário Prevalece sem conflito
  // --------------------------------------------------------------------------
  it('TESTE 12: Extraordinário em dia de Período Fixo tem prioridade natural e não gera conflito falso', () => {
    // Terça-feira Fixo: 13:00-17:30, R$ 500
    offlineDb.saveExaminerFixedPeriod({
      id: 'efp_tuesday_fixed',
      clinicId: CLINIC_ID,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      dayOfWeek: 2, // Terça
      startTime: '13:00',
      endTime: '17:30',
      validFrom: '2026-10-01',
      remunerationType: 'fixed_period',
      fixedAmount: 500.00,
      active: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z'
    }, CLINIC_ID);

    // Mutirão Especial extraordinário para a mesma terça-feira (06/10/2026) das 14:00 às 16:00, R$ 700
    offlineDb.saveExaminerSpecialPeriod({
      id: 'esp_mutirao_tuesday',
      clinicId: CLINIC_ID,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-06',
      startTime: '14:00',
      endTime: '16:00',
      remunerationType: 'fixed_period',
      fixedAmount: 700.00,
      status: 'active',
      notes: 'Mutirão Excepcional de Terça',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z'
    }, CLINIC_ID);

    // Consulta às 15:00 cai dentro do extraordinário (que está dentro da janela do fixo)
    const prev = examinerRemunerationService.previewExaminerRemuneration({
      clinicId: CLINIC_ID,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-06',
      time: '15:00'
    });

    expect(prev.conflict).toBe(false);
    expect(prev.ruleType).toBe('extraordinary');
    expect(prev.amount).toBe(700.00);
    expect(prev.ruleId).toBe('esp_mutirao_tuesday');
  });

  // --------------------------------------------------------------------------
  // TESTE 13: Isolamento Multiunidade estrito (Clínica IVS vs Clínica Megastar)
  // --------------------------------------------------------------------------
  it('TESTE 13: Isolamento Multiunidade: Regra da Clínica A não vaza nem afeta consultas da Clínica B', () => {
    const CLINIC_A = 'ivs';
    const CLINIC_B = 'megastar';

    // Regra avulsa da Clínica A = R$ 100
    offlineDb.saveExaminerAvulsoRule({
      id: 'avulso_clinic_a',
      clinicId: CLINIC_A,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      perAppointmentAmount: 100.00,
      active: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z'
    }, CLINIC_A);

    // Regra avulsa da Clínica B = R$ 150
    offlineDb.saveExaminerAvulsoRule({
      id: 'avulso_clinic_b',
      clinicId: CLINIC_B,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      perAppointmentAmount: 150.00,
      active: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z'
    }, CLINIC_B);

    // Consulta realizada na Clínica A
    const prevA = examinerRemunerationService.previewExaminerRemuneration({
      clinicId: CLINIC_A,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-08',
      time: '10:00'
    });
    expect(prevA.clinicId).toBe(CLINIC_A);
    expect(prevA.amount).toBe(100.00);

    // Consulta realizada na Clínica B
    const prevB = examinerRemunerationService.previewExaminerRemuneration({
      clinicId: CLINIC_B,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-08',
      time: '10:00'
    });
    expect(prevB.clinicId).toBe(CLINIC_B);
    expect(prevB.amount).toBe(150.00);
  });

  // --------------------------------------------------------------------------
  // TESTE 14: Liquidação de Fechamento gera Transação de Despesa Rastreável no Caixa
  // --------------------------------------------------------------------------
  it('TESTE 14: Fechamento e Liquidação: Gera despesa no fluxo de caixa com metadados rastreáveis', () => {
    const apt: Appointment = {
      id: 'apt_settle_trace_1',
      clinicId: CLINIC_ID,
      patientId: 'pat_trace',
      patientName: 'Paciente Rastreável',
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      date: '2026-10-05',
      time: '09:00',
      status: 'completed',
      type: 'consulta_geral',
      durationMinutes: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    offlineDb.saveExaminerAvulsoRule({
      id: 'avulso_trace_rule',
      clinicId: CLINIC_ID,
      examinerId: EXAMINER_ID,
      examinerName: EXAMINER_NAME,
      perAppointmentAmount: 120.00,
      active: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z'
    }, CLINIC_ID);

    const gen = examinerRemunerationService.generateRemunerationOnAppointmentCompletion(apt, CLINIC_ID);
    expect(gen.success).toBe(true);
    expect(gen.record?.finalAmount).toBe(120.00);

    // Fecha o período
    const closeRes = examinerRemunerationService.closeExaminerPeriod(
      CLINIC_ID,
      EXAMINER_ID,
      EXAMINER_NAME,
      '2026-10-01',
      '2026-10-07',
      'Diretoria Financeira'
    );
    expect(closeRes.success).toBe(true);
    const closureId = closeRes.closure!.id;

    // Liquida o pagamento
    const payRes = examinerRemunerationService.settleClosurePayment(
      closureId,
      'Responsável Financeiro',
      'pix',
      CLINIC_ID
    );
    expect(payRes.success).toBe(true);

    // Verifica se a remuneração foi atualizada para 'paid'
    const updatedRem = offlineDb.getExaminerRemunerations(CLINIC_ID).find(r => r.id === gen.record!.id);
    expect(updatedRem?.status).toBe('paid');
    expect(updatedRem?.paymentMethod).toBe('pix');

    // Verifica se gerou transação no fluxo de caixa com metadados rastreáveis
    const txs = offlineDb.getTransactions(CLINIC_ID);
    const repasseTx = txs.find(t => (t as any).closureId === closureId);
    expect(repasseTx).toBeDefined();
    expect(repasseTx?.type).toBe('expense');
    expect(repasseTx?.category).toBe('salario');
    expect(repasseTx?.amount).toBe(120.00);
    expect((repasseTx as any).examinerId).toBe(EXAMINER_ID);
    expect((repasseTx as any).closureId).toBe(closureId);
  });
});
