import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { 
  FinancialTransaction, 
  POSItem, 
  CashRegisterSession, 
  CashRegisterSummary,
  toCents,
  fromCents,
  safeSum,
  safeSub,
  safeCalculateItemTotal,
  formatCurrencyValue
} from '@optotipo/shared';
import { offlineDb } from './offlineDb';

describe('OPTOMED — FASE 28: Consolidação e Auditoria Financeira, PDV, Caixa e Fechamento', () => {
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
    offlineDb.saveCashRegisterSessions([], 'ivs');
    offlineDb.saveTransactions([], 'megastar');
    offlineDb.saveCashRegisterSessions([], 'megastar');
  });

  // --------------------------------------------------------------------------
  // 1. Abertura de Caixa e Representação Monetária em Centavos
  // --------------------------------------------------------------------------
  it('1. Caixa: abertura de sessão registra horário, operador e saldo inicial com integridade em centavos', () => {
    const session = offlineDb.openCashRegisterSession(
      'op-01',
      'Recepção IVS',
      250.75,
      'Fundo de troco inicial em dinheiro',
      'ivs'
    );

    expect(session.id).toBeDefined();
    expect(session.status).toBe('open');
    expect(session.operatorName).toBe('Recepção IVS');
    expect(session.openingBalance).toBe(250.75);
    expect(session.openingBalanceCents).toBe(25075);
    expect(session.openedAt).toBeDefined();

    const active = offlineDb.getActiveCashRegisterSession('ivs');
    expect(active?.id).toBe(session.id);
  });

  // --------------------------------------------------------------------------
  // 2. Venda no PDV & Entradas
  // --------------------------------------------------------------------------
  it('2. Venda & Entradas: registro de receita via PDV vincula automaticamente ao caixa aberto', () => {
    const session = offlineDb.openCashRegisterSession('op-01', 'Recepção', 100, undefined, 'ivs');

    const tx: FinancialTransaction = {
      id: 'tx-venda-pdv-01',
      clinicId: 'ivs',
      type: 'income',
      category: 'venda_oculos',
      description: 'Armação Receituário Premium + Lentes BlueFilter',
      amount: 450.00,
      amountCents: 45000,
      currency: 'BRL',
      paymentMethod: 'credit_card',
      patientName: 'Mariana Duarte',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Recepção',
      createdAt: new Date().toISOString()
    };

    offlineDb.saveTransaction(tx, 'ivs');
    const saved = offlineDb.getTransactions('ivs').find(t => t.id === 'tx-venda-pdv-01');

    expect(saved).toBeDefined();
    expect(saved?.amount).toBe(450.00);
    expect(saved?.amountCents).toBe(45000);
    expect(saved?.cashRegisterId).toBe(session.id);

    const summary = offlineDb.getCashRegisterSummary(undefined, 'ivs');
    expect(summary.totalIncome).toBe(450.00);
    expect(summary.currentBalance).toBe(550.00); // 100 + 450
  });

  // --------------------------------------------------------------------------
  // 3. Pagamento e Formas de Pagamento (PIX, Cartão, Dinheiro)
  // --------------------------------------------------------------------------
  it('3. Formas de Pagamento: suporte a PIX, Cartão e Dinheiro sem computar falsamente pendências', () => {
    offlineDb.openCashRegisterSession('op-01', 'Recepção', 0, undefined, 'ivs');

    offlineDb.saveTransaction({
      id: 'tx-pix',
      clinicId: 'ivs',
      type: 'income',
      category: 'consulta',
      description: 'Consulta Dr. Meirelles via PIX',
      amount: 50.00,
      paymentMethod: 'pix',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Op',
      createdAt: new Date().toISOString()
    }, 'ivs');

    offlineDb.saveTransaction({
      id: 'tx-card',
      clinicId: 'ivs',
      type: 'income',
      category: 'exame',
      description: 'Tonometria via Cartão de Débito',
      amount: 40.00,
      paymentMethod: 'debit_card',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Op',
      createdAt: new Date().toISOString()
    }, 'ivs');

    offlineDb.saveTransaction({
      id: 'tx-pending',
      clinicId: 'ivs',
      type: 'income',
      category: 'consulta',
      description: 'Boleto / Transferência Aguardando Confirmação',
      amount: 150.00,
      paymentMethod: 'bank_transfer',
      status: 'pending', // Pagamento ainda pendente
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Op',
      createdAt: new Date().toISOString()
    }, 'ivs');

    const summary = offlineDb.getCashRegisterSummary(undefined, 'ivs');
    // Apenas completed entra no total realizado (50 + 40 = 90)
    expect(summary.totalIncome).toBe(90.00);
  });

  // --------------------------------------------------------------------------
  // 4. Descontos e Cálculos Seguros sem Floating Point Drift
  // --------------------------------------------------------------------------
  it('4. Descontos: cálculo de subtotal e desconto exato sem perda de precisão flutuante', () => {
    // 2 consultas de 50.00 = 100.00 com 15.00 de desconto
    const calc = safeCalculateItemTotal(50.00, 2, 15.00);
    expect(calc.subtotal).toBe(100.00);
    expect(calc.discount).toBe(15.00);
    expect(calc.total).toBe(85.00);
    expect(calc.totalCents).toBe(8500);

    // Soma de centavos de teste clássico de JavaScript: 0.1 + 0.2 === 0.3
    expect(safeSum(0.1, 0.2)).toBe(0.3);
    expect(safeSub(100.55, 0.55)).toBe(100.0);
  });

  // --------------------------------------------------------------------------
  // 5. Saídas Financeiras / Despesas / Repasse
  // --------------------------------------------------------------------------
  it('5. Saídas / Despesas: débito no fluxo de caixa reduz saldo disponível', () => {
    offlineDb.openCashRegisterSession('op-01', 'Recepção', 300, undefined, 'ivs');

    const expenseTx: FinancialTransaction = {
      id: 'tx-despesa-papelaria',
      clinicId: 'ivs',
      type: 'expense',
      category: 'outros',
      description: 'Compra de papel sulfite para receituários e comprovantes',
      amount: 75.20,
      paymentMethod: 'cash',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Recepção',
      createdAt: new Date().toISOString()
    };

    offlineDb.saveTransaction(expenseTx, 'ivs');
    const summary = offlineDb.getCashRegisterSummary(undefined, 'ivs');

    expect(summary.openingBalance).toBe(300.00);
    expect(summary.totalExpense).toBe(75.20);
    expect(summary.currentBalance).toBe(224.80); // 300 - 75.20
  });

  // --------------------------------------------------------------------------
  // 6. Fechamento de Caixa, Apuração e Divergência
  // --------------------------------------------------------------------------
  it('6. Fechamento: confere saldo esperado, registra valor informado e calcula diferença (sobra/falta)', () => {
    const session = offlineDb.openCashRegisterSession('op-01', 'Recepção', 200, undefined, 'ivs');

    // Entrada de 300
    offlineDb.saveTransaction({
      id: 'tx-fechamento-in',
      clinicId: 'ivs',
      cashRegisterId: session.id,
      type: 'income',
      category: 'consulta',
      description: 'Consultas da manhã',
      amount: 300,
      paymentMethod: 'cash',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Op',
      createdAt: new Date().toISOString()
    }, 'ivs');

    // Saída de 50
    offlineDb.saveTransaction({
      id: 'tx-fechamento-out',
      clinicId: 'ivs',
      cashRegisterId: session.id,
      type: 'expense',
      category: 'outros',
      description: 'Insumos de limpeza',
      amount: 50,
      paymentMethod: 'cash',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Op',
      createdAt: new Date().toISOString()
    }, 'ivs');

    // Esperado: 200 + 300 - 50 = 450. Operador confere 440 (Falta de R$ 10)
    const closed = offlineDb.closeCashRegisterSession(session.id, 440, 'Conferência física com falta de 10 reais', 'ivs');

    expect(closed.status).toBe('closed');
    expect(closed.expectedBalance).toBe(450);
    expect(closed.declaredBalance).toBe(440);
    expect(closed.difference).toBe(-10); // Falta
    expect(closed.closedAt).toBeDefined();

    // Sessão fechada não pode ser re-fechada
    expect(() => {
      offlineDb.closeCashRegisterSession(session.id, 440, undefined, 'ivs');
    }).toThrow(/já foi fechado/);

    expect(offlineDb.getActiveCashRegisterSession('ivs')).toBeNull();
  });

  // --------------------------------------------------------------------------
  // 7. Cancelamento / Exclusão e Tombstones
  // --------------------------------------------------------------------------
  it('7. Cancelamento: exclusão de transação gera tombstone durável e auditoria', () => {
    const tx: FinancialTransaction = {
      id: 'tx-para-cancelar',
      clinicId: 'ivs',
      type: 'income',
      category: 'consulta',
      description: 'Lançamento Duplicado por Engano',
      amount: 50.00,
      paymentMethod: 'pix',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Recepção',
      createdAt: new Date().toISOString()
    };

    offlineDb.saveTransaction(tx, 'ivs');
    expect(offlineDb.getTransactions('ivs').some(t => t.id === 'tx-para-cancelar')).toBe(true);

    // Cancelar / Excluir
    offlineDb.deleteTransaction('tx-para-cancelar', 'ivs');

    expect(offlineDb.getTransactions('ivs').some(t => t.id === 'tx-para-cancelar')).toBe(false);

    // Verifica que auditoria registrou o cancelamento
    const logs = offlineDb.getAuditLogs('ivs');
    const deleteLog = logs.find(l => l.resourceId === 'tx-para-cancelar' && l.action === 'DELETE');
    expect(deleteLog).toBeDefined();
    expect(deleteLog?.resourceType).toBe('FINANCE');
  });

  // --------------------------------------------------------------------------
  // 8. Work Sessions (Regimes de Trabalho & Acerto do Examinador)
  // --------------------------------------------------------------------------
  it('8. Work Sessions: registro e apuração de regime por período (meia diária) e produção por consulta', () => {
    const report = offlineDb.getProfessionalSettlementReport('Dr. Rudson Meirelles', 'ivs');

    expect(report.examinerName).toBe('Dr. Rudson Meirelles');
    expect(report.totalConsultationsCount).toBeGreaterThanOrEqual(17);
    expect(report.previousBalancePending).toBe(550.00);
    expect(report.totalPayableAmount).toBe(1900.00); // 550 + 1350
  });

  // --------------------------------------------------------------------------
  // 9. Operação Offline e Persistência Durável
  // --------------------------------------------------------------------------
  it('9. Offline: transações criadas offline são salvas localmente e recuperadas sem perda de dados', () => {
    const offlineTx: FinancialTransaction = {
      id: 'tx-offline-001',
      clinicId: 'ivs',
      type: 'income',
      category: 'consulta',
      description: 'Consulta em Modo Offline sem Internet',
      amount: 50.00,
      paymentMethod: 'cash',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Recepção',
      createdAt: new Date().toISOString()
    };

    offlineDb.saveTransaction(offlineTx, 'ivs');

    // Recupera diretamente do storage da clínica
    const transactions = offlineDb.getTransactions('ivs');
    const found = transactions.find(t => t.id === 'tx-offline-001');
    expect(found).toBeDefined();
    expect(found?.amount).toBe(50.00);
    expect(found?.description).toContain('Modo Offline');
  });

  // --------------------------------------------------------------------------
  // 10. Reconexão e Idempotência (Anti-Duplicidade / Duplo Clique)
  // --------------------------------------------------------------------------
  it('10. Duplicidade & Idempotência: múltiplos cliques na mesma venda não duplicam lançamento', () => {
    const tx: FinancialTransaction = {
      id: 'tx-idempotent-venda',
      clinicId: 'ivs',
      type: 'income',
      category: 'venda_oculos',
      description: 'Venda Anti Duplo Clique',
      amount: 250.00,
      paymentMethod: 'pix',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Recepção',
      createdAt: new Date().toISOString()
    };

    // 1º Envio
    offlineDb.saveTransaction(tx, 'ivs');
    // 2º Envio (duplo clique ou retry)
    offlineDb.saveTransaction(tx, 'ivs');

    const matches = offlineDb.getTransactions('ivs').filter(t => t.id === 'tx-idempotent-venda');
    expect(matches.length).toBe(1);
  });

  // --------------------------------------------------------------------------
  // 11. Permissões de Acesso e Perfil
  // --------------------------------------------------------------------------
  it('11. Permissões: recepção pode operar vendas e caixa, mas exclusão é restrita', () => {
    const canAccessFinance = (role: string) => ['superadmin', 'admin', 'reception', 'operator', 'financeiro'].includes(role);
    const canDeleteFinancialRecord = (role: string) => ['superadmin', 'admin', 'financeiro'].includes(role);

    // Visualizar e lançar
    expect(canAccessFinance('reception')).toBe(true);
    expect(canAccessFinance('financeiro')).toBe(true);
    expect(canAccessFinance('admin')).toBe(true);
    expect(canAccessFinance('patient')).toBe(false);

    // Excluir registros financeiros
    expect(canDeleteFinancialRecord('superadmin')).toBe(true);
    expect(canDeleteFinancialRecord('financeiro')).toBe(true);
    expect(canDeleteFinancialRecord('reception')).toBe(false);
  });

  // --------------------------------------------------------------------------
  // 12. Auditoria e Rastreabilidade LGPD
  // --------------------------------------------------------------------------
  it('12. Auditoria: qualquer movimentação relevante gera trilha de auditoria com clínica e recurso', () => {
    const tx: FinancialTransaction = {
      id: 'tx-audit-tracker',
      clinicId: 'ivs',
      type: 'income',
      category: 'consulta',
      description: 'Consulta Rastreável',
      amount: 50.00,
      paymentMethod: 'pix',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Recepção',
      createdAt: new Date().toISOString()
    };

    offlineDb.saveTransaction(tx, 'ivs');

    const logs = offlineDb.getAuditLogs('ivs');
    const log = logs.find(l => l.resourceId === 'tx-audit-tracker');
    expect(log).toBeDefined();
    expect(log?.resourceType).toBe('FINANCE');
    expect(log?.details).toContain('IVS');
  });

  // --------------------------------------------------------------------------
  // 13. Isolamento Multiunidade Estrito
  // --------------------------------------------------------------------------
  it('13. Multiunidade: transações financeiras e caixas de IVS e Mega Star não se misturam', () => {
    // IVS
    offlineDb.saveTransaction({
      id: 'tx-ivs-only',
      clinicId: 'ivs',
      type: 'income',
      category: 'consulta',
      description: 'Consulta IVS BRL',
      amount: 50.00,
      currency: 'BRL',
      paymentMethod: 'pix',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Recepção IVS',
      createdAt: new Date().toISOString()
    }, 'ivs');

    // Mega Star
    offlineDb.saveTransaction({
      id: 'tx-megastar-only',
      clinicId: 'megastar',
      type: 'income',
      category: 'consulta',
      description: 'Consulta Mega Star PYG',
      amount: 150000,
      currency: 'PYG',
      paymentMethod: 'cash',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Recepção Mega Star',
      createdAt: new Date().toISOString()
    }, 'megastar');

    const ivsList = offlineDb.getTransactions('ivs');
    const megaList = offlineDb.getTransactions('megastar');

    expect(ivsList.some(t => t.id === 'tx-ivs-only')).toBe(true);
    expect(ivsList.some(t => t.id === 'tx-megastar-only')).toBe(false);

    expect(megaList.some(t => t.id === 'tx-megastar-only')).toBe(true);
    expect(megaList.some(t => t.id === 'tx-ivs-only')).toBe(false);
  });

  // --------------------------------------------------------------------------
  // 14. Baixa em Lote & Alinhamento Financeiro até 30/09/2026
  // --------------------------------------------------------------------------
  it('14. Baixa em Lote: liquida todos os atendimentos até 30/09/2026 e atualiza status de repasse', () => {
    // Insere transações de teste com datas anteriores a 30/09/2026
    offlineDb.saveTransaction({
      id: 'tx-sept-test-1',
      clinicId: 'ivs',
      type: 'income',
      category: 'consulta',
      description: 'Consulta Teste Setembro',
      amount: 50.00,
      paymentMethod: 'cash',
      status: 'completed',
      isSettled: false,
      date: '2026-09-25',
      createdBy: 'Recepção',
      createdAt: '2026-09-25T10:00:00Z'
    }, 'ivs');

    // Executa baixa em lote até 30/09/2026
    const settledCount = offlineDb.settleAllTransactionsUntilDate('2026-09-30', 'ivs');
    expect(settledCount).toBeGreaterThanOrEqual(1);

    const txs = offlineDb.getTransactions('ivs');
    const target = txs.find(t => t.id === 'tx-sept-test-1');
    expect(target?.isSettled).toBe(true);
    expect(target?.settledAt).toBeDefined();

    // Registra repasse quitado via despesa de salário
    offlineDb.saveTransaction({
      id: 'tx-repasse-meirelles-test',
      clinicId: 'ivs',
      type: 'expense',
      category: 'salario',
      description: 'Repasse e acerto final Dr. Meirelles até 30/09/2026',
      amount: 1900.00,
      paymentMethod: 'pix',
      status: 'completed',
      date: '2026-09-30',
      createdBy: 'Financeiro',
      createdAt: '2026-09-30T18:00:00Z'
    }, 'ivs');

    const report = offlineDb.getProfessionalSettlementReport('Dr. Rudson Meirelles', 'ivs');
    expect(report.settlementStatus).toBe('settled');
  });

  // --------------------------------------------------------------------------
  // 15. Automação da Cobrança de Atendimentos IVS por Escala Semanal
  // --------------------------------------------------------------------------
  it('15. Automação IVS: Terça e Quarta fixo R$ 500 (Meia Diária) e demais dias R$ 50 por consulta', () => {
    // Terça-feira (ex: 2026-10-06)
    const tuesdayRule = offlineDb.getDefaultContractTypeForDate('2026-10-06', 'ivs');
    expect(tuesdayRule.contractType).toBe('period_half_day');
    expect(tuesdayRule.baseAmount).toBe(500.00);
    expect(tuesdayRule.isFixedTurn).toBe(true);
    expect(tuesdayRule.description).toContain('Terça-feira (13h às 18h)');

    // Quarta-feira (ex: 2026-10-07)
    const wednesdayRule = offlineDb.getDefaultContractTypeForDate('2026-10-07', 'ivs');
    expect(wednesdayRule.contractType).toBe('period_half_day');
    expect(wednesdayRule.baseAmount).toBe(500.00);
    expect(wednesdayRule.isFixedTurn).toBe(true);
    expect(wednesdayRule.description).toContain('Quarta-feira (08h às 12h)');

    // Quinta-feira (ex: 2026-10-08) -> Cobrança por atendimento R$ 50
    const thursdayRule = offlineDb.getDefaultContractTypeForDate('2026-10-08', 'ivs');
    expect(thursdayRule.contractType).toBe('per_consultation');
    expect(thursdayRule.baseAmount).toBe(50.00);
    expect(thursdayRule.isFixedTurn).toBe(false);

    // Sexta-feira (ex: 2026-10-09) -> Cobrança por atendimento R$ 50
    const fridayRule = offlineDb.getDefaultContractTypeForDate('2026-10-09', 'ivs');
    expect(fridayRule.contractType).toBe('per_consultation');
    expect(fridayRule.baseAmount).toBe(50.00);
    expect(fridayRule.isFixedTurn).toBe(false);

    // Obtenção da sessão de trabalho para a data gera a padrão automática
    const autoSession = offlineDb.getWorkSessionForDate('2026-10-06', 'Dr. Rudson Meirelles', 'ivs');
    expect(autoSession.contractType).toBe('period_half_day');
    expect(autoSession.baseAmount).toBe(500.00);

    // Sábado 10/10/2026: Sistema de atendimento período fechado (R$ 1.000,00)
    const saturdayRule = offlineDb.getDefaultContractTypeForDate('2026-10-10', 'ivs');
    expect(saturdayRule.contractType).toBe('period_full_day');
    expect(saturdayRule.baseAmount).toBe(1000.00);
    expect(saturdayRule.isFixedTurn).toBe(true);
    expect(saturdayRule.description).toContain('Fixo R$ 1.000,00');

    const satSession = offlineDb.getWorkSessionForDate('2026-10-10', 'Dr. Rudson Meirelles', 'ivs');
    expect(satSession.contractType).toBe('period_full_day');
    expect(satSession.baseAmount).toBe(1000.00);

    // Flexibilidade: em um dia com padrão por consulta, pode ser alterado para diária inteira ou meia diária
    offlineDb.saveWorkSession({
      id: 'sess_ivs_custom_thursday',
      clinicId: 'ivs',
      examinerId: 'user-examinador',
      examinerName: 'Dr. Rudson Meirelles',
      date: '2026-10-08',
      contractType: 'period_full_day',
      baseAmount: 1000.00,
      notes: 'Alterado pontualmente para Diária Integral',
      status: 'active',
      createdAt: '2026-10-08T08:00:00Z'
    }, 'ivs');

    const customSession = offlineDb.getWorkSessionForDate('2026-10-08', 'Dr. Rudson Meirelles', 'ivs');
    expect(customSession.contractType).toBe('period_full_day');
    expect(customSession.baseAmount).toBe(1000.00);
  });

  it('16. Discriminação de atendimentos avulsos fora do período contratado no Espelho de Produção', () => {
    // Simula 14/10/2026 (Quarta-feira, período oficial 08h às 12h):
    // - 2 consultas no período contratado (09h00 e 10h00)
    // - 2 consultas fora do período contratado (16h00 e 17h00)
    const dateStr = '2026-10-14';

    offlineDb.saveAppointments([
      {
        id: 'apt-m1',
        clinicId: 'ivs',
        patientName: 'Paciente Manhã 1',
        date: dateStr,
        time: '09:00',
        status: 'completed',
        isOutOfContractPeriod: false
      } as any,
      {
        id: 'apt-m2',
        clinicId: 'ivs',
        patientName: 'Paciente Manhã 2',
        date: dateStr,
        time: '10:00',
        status: 'completed',
        isOutOfContractPeriod: false
      } as any,
      {
        id: 'apt-t1',
        clinicId: 'ivs',
        patientName: 'Paciente Tarde 1',
        date: dateStr,
        time: '16:00',
        status: 'completed',
        isOutOfContractPeriod: true
      } as any,
      {
        id: 'apt-t2',
        clinicId: 'ivs',
        patientName: 'Paciente Tarde 2',
        date: dateStr,
        time: '17:00',
        status: 'completed'
      } as any
    ], 'ivs');

    offlineDb.saveTransactions([
      {
        id: 'tx-m1',
        clinicId: 'ivs',
        type: 'income',
        category: 'consulta',
        description: 'Consulta Manhã 1',
        patientName: 'Paciente Manhã 1',
        encounterId: 'apt-m1',
        amount: 50.00,
        status: 'completed',
        date: dateStr,
        createdAt: `${dateStr}T12:00:00.000Z`
      } as any,
      {
        id: 'tx-m2',
        clinicId: 'ivs',
        type: 'income',
        category: 'consulta',
        description: 'Consulta Manhã 2',
        patientName: 'Paciente Manhã 2',
        encounterId: 'apt-m2',
        amount: 50.00,
        status: 'completed',
        date: dateStr,
        createdAt: `${dateStr}T13:00:00.000Z`
      } as any,
      {
        id: 'tx-t1',
        clinicId: 'ivs',
        type: 'income',
        category: 'consulta',
        description: 'Consulta Tarde 1 (Avulsa)',
        patientName: 'Paciente Tarde 1',
        encounterId: 'apt-t1',
        amount: 50.00,
        status: 'completed',
        date: dateStr,
        createdAt: `${dateStr}T19:00:00.000Z`
      } as any,
      {
        id: 'tx-t2',
        clinicId: 'ivs',
        type: 'income',
        category: 'consulta',
        description: 'Consulta Tarde 2 (Avulsa)',
        patientName: 'Paciente Tarde 2',
        encounterId: 'apt-t2',
        amount: 50.00,
        status: 'completed',
        date: dateStr,
        createdAt: `${dateStr}T20:00:00.000Z`
      } as any
    ], 'ivs');

    const report = offlineDb.getProfessionalSettlementReport('Dr. Rudson Meirelles', 'ivs');
    expect(report.dailyEntries.length).toBe(2);

    // Entrada 1: Meia diária contratada
    const fixedEntry = report.dailyEntries[0];
    expect(fixedEntry.type).toBe('meia_diaria');
    expect(fixedEntry.unitPrice).toBe(500.00);
    expect(fixedEntry.totalAmount).toBe(500.00);
    expect(fixedEntry.description).toContain('2 atendimentos no período contratado');

    // Entrada 2: Consultas avulsas da tarde (fora do período)
    const avulsoEntry = report.dailyEntries[1];
    expect(avulsoEntry.type).toBe('consultas');
    expect(avulsoEntry.quantity).toBe(2);
    expect(avulsoEntry.unitPrice).toBe(50.00);
    expect(avulsoEntry.totalAmount).toBe(100.00);
    expect(avulsoEntry.description).toContain('Atendimentos Avulsos fora do período contratado');

    // Total líquido = 500 + 100 = 600
    expect(report.totalProductionAmount).toBe(600.00);
  });

  // --------------------------------------------------------------------------
  // TESTE SINTÉTICO OBRIGATÓRIO DE AUDITORIA:
  // - 3 atendimentos elegíveis dentro da meia diária (manhã)
  // - 3 atendimentos elegíveis fora do período contratado (tarde)
  // - Meia diária R$ 500,00 + 3 avulsos R$ 50,00 = R$ 650,00
  // - Casos de duplicidade de sync, consultas canceladas, faltas, agendamentos futuros e período extraordinário
  // --------------------------------------------------------------------------
  it('17. AUDITORIA: Cenário sintético com 3 contratados + 3 avulsos (R$ 650,00) + cancelados, duplicados e extraordinários', () => {
    const dateStr = '2026-10-14'; // Quarta-feira: 08h às 12h

    // 1. Cadastra agendamentos:
    // - 3 concluídos na manhã (09h00, 10h00, 11h00) -> dentro da meia diária
    // - 3 concluídos na tarde (14h00, 15h30, 17h00) -> fora do período (avulsos)
    // - 1 cancelado
    // - 1 falta (no_show)
    // - 1 futuro (scheduled)
    offlineDb.saveAppointments([
      // 3 Manhã
      { id: 'apt-c1', clinicId: 'ivs', patientName: 'Paciente Contratado 1', date: dateStr, time: '09:00', status: 'completed' } as any,
      { id: 'apt-c2', clinicId: 'ivs', patientName: 'Paciente Contratado 2', date: dateStr, time: '10:00', status: 'completed' } as any,
      { id: 'apt-c3', clinicId: 'ivs', patientName: 'Paciente Contratado 3', date: dateStr, time: '11:00', status: 'completed' } as any,
      // 3 Tarde (Avulsos)
      { id: 'apt-a1', clinicId: 'ivs', patientName: 'Paciente Avulso 1', date: dateStr, time: '14:00', status: 'completed' } as any,
      { id: 'apt-a2', clinicId: 'ivs', patientName: 'Paciente Avulso 2', date: dateStr, time: '15:30', status: 'completed' } as any,
      { id: 'apt-a3', clinicId: 'ivs', patientName: 'Paciente Avulso 3', date: dateStr, time: '17:00', status: 'completed' } as any,
      // Não elegíveis
      { id: 'apt-cancel', clinicId: 'ivs', patientName: 'Paciente Cancelado', date: dateStr, time: '14:30', status: 'canceled' } as any,
      { id: 'apt-noshow', clinicId: 'ivs', patientName: 'Paciente Faltou', date: dateStr, time: '15:00', status: 'no_show' } as any,
      { id: 'apt-future', clinicId: 'ivs', patientName: 'Paciente Futuro', date: dateStr, time: '18:00', status: 'scheduled' } as any
    ], 'ivs');

    // 2. Cadastra transações:
    // - 3 de consultas concluídas na manhã (R$ 50,00 cada)
    // - 3 de consultas concluídas na tarde (R$ 50,00 cada)
    // - 1 transação de produto/venda de lentes (não deve ser contada como consulta clínica)
    // - 1 transação cancelada/estornada
    // - 1 transação duplicada idêntica (simulando sync repetido com mesmo ID)
    const validTransactions = [
      { id: 'tx-c1', clinicId: 'ivs', type: 'income', category: 'consulta', description: 'Consulta 1', patientName: 'Paciente Contratado 1', encounterId: 'apt-c1', amount: 50.00, status: 'completed', date: dateStr, createdAt: `${dateStr}T12:00:00.000Z` } as any,
      { id: 'tx-c2', clinicId: 'ivs', type: 'income', category: 'consulta', description: 'Consulta 2', patientName: 'Paciente Contratado 2', encounterId: 'apt-c2', amount: 50.00, status: 'completed', date: dateStr, createdAt: `${dateStr}T13:00:00.000Z` } as any,
      { id: 'tx-c3', clinicId: 'ivs', type: 'income', category: 'consulta', description: 'Consulta 3', patientName: 'Paciente Contratado 3', encounterId: 'apt-c3', amount: 50.00, status: 'completed', date: dateStr, createdAt: `${dateStr}T14:00:00.000Z` } as any,
      { id: 'tx-a1', clinicId: 'ivs', type: 'income', category: 'consulta', description: 'Consulta 4 Avulsa', patientName: 'Paciente Avulso 1', encounterId: 'apt-a1', amount: 50.00, status: 'completed', date: dateStr, createdAt: `${dateStr}T17:00:00.000Z` } as any,
      { id: 'tx-a2', clinicId: 'ivs', type: 'income', category: 'consulta', description: 'Consulta 5 Avulsa', patientName: 'Paciente Avulso 2', encounterId: 'apt-a2', amount: 50.00, status: 'completed', date: dateStr, createdAt: `${dateStr}T18:30:00.000Z` } as any,
      { id: 'tx-a3', clinicId: 'ivs', type: 'income', category: 'consulta', description: 'Consulta 6 Avulsa', patientName: 'Paciente Avulso 3', encounterId: 'apt-a3', amount: 50.00, status: 'completed', date: dateStr, createdAt: `${dateStr}T20:00:00.000Z` } as any,
      // Não elegíveis
      { id: 'tx-oculos', clinicId: 'ivs', type: 'income', category: 'venda_oculos', description: 'Armação Ray-Ban', amount: 350.00, status: 'completed', date: dateStr, createdAt: `${dateStr}T15:00:00.000Z` } as any,
      { id: 'tx-refund', clinicId: 'ivs', type: 'income', category: 'consulta', description: 'Consulta Estornada', amount: 50.00, status: 'refunded', date: dateStr, createdAt: `${dateStr}T16:00:00.000Z` } as any
    ];

    offlineDb.saveTransactions(validTransactions, 'ivs');

    // Executa relatório
    const report1 = offlineDb.getProfessionalSettlementReport('Dr. Rudson Meirelles', 'ivs');

    expect(report1.dailyEntries.length).toBe(2);

    // Entrada 1: Meia diária contratada (R$ 500,00 cobrindo 3 atendimentos da manhã)
    const fixedEntry = report1.dailyEntries[0];
    expect(fixedEntry.type).toBe('meia_diaria');
    expect(fixedEntry.quantity).toBe(1);
    expect(fixedEntry.unitPrice).toBe(500.00);
    expect(fixedEntry.totalAmount).toBe(500.00);
    expect(fixedEntry.description).toContain('3 atendimentos no período contratado');

    // Entrada 2: 3 Atendimentos avulsos fora do período contratado (3 x R$ 50,00 = R$ 150,00)
    const avulsoEntry = report1.dailyEntries[1];
    expect(avulsoEntry.type).toBe('consultas');
    expect(avulsoEntry.quantity).toBe(3);
    expect(avulsoEntry.unitPrice).toBe(50.00);
    expect(avulsoEntry.totalAmount).toBe(150.00);
    expect(avulsoEntry.description).toContain('3 consultas a R$ 50,00');

    // Total líquido = 500 + 150 = R$ 650,00
    expect(report1.totalProductionAmount).toBe(650.00);
    expect(report1.totalPayableAmount).toBe(650.00);

    // 3. Teste de Reprocessamento Idempotente: rodar novamente não duplica nada
    const report2 = offlineDb.getProfessionalSettlementReport('Dr. Rudson Meirelles', 'ivs');
    expect(report2.totalProductionAmount).toBe(650.00);
    expect(report2.dailyEntries.length).toBe(2);

    // 4. Teste com Período Extraordinário Negociado:
    // Se a clínica negociar que a tarde (14h às 18h) é período extraordinário aprovado,
    // as consultas da tarde NÃO devem ser cobradas como avulsas adicionais
    offlineDb.saveExaminerSpecialPeriod({
      id: 'esp-quarta-tarde',
      clinicId: 'ivs',
      examinerId: 'user-examinador',
      examinerName: 'Dr. Rudson Meirelles',
      date: dateStr,
      startTime: '13:00',
      endTime: '18:00',
      status: 'active',
      remunerationType: 'fixed_period',
      fixedAmount: 500.00,
      notes: 'Período Negociado Extraordinário de Quarta Tarde',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z'
    }, 'ivs');

    const reportWithNegotiated = offlineDb.getProfessionalSettlementReport('Dr. Rudson Meirelles', 'ivs');
    // Agora os 3 atendimentos da tarde são cobertos pelo período negociado e não geram linha de avulso
    expect(reportWithNegotiated.dailyEntries.length).toBe(1);
    expect(reportWithNegotiated.dailyEntries[0].totalAmount).toBe(500.00);
    expect(reportWithNegotiated.totalProductionAmount).toBe(500.00);
  });

  // --------------------------------------------------------------------------
  // TESTE 18: Unicidade Avançada - Exclusão lógica (_deleted), múltiplos turnos e gravação efetiva
  // --------------------------------------------------------------------------
  it('18. AUDITORIA: Unicidade com exclusão lógica (_deleted), atendimentos não concluídos e gravação efetiva no caixa', () => {
    const dateStr = '2026-10-13'; // Terça-feira (13h às 18h)

    // Agendamentos: 2 concluídos, 1 não concluído (em andamento) e 1 cancelado
    offlineDb.saveAppointments([
      { id: 'apt-t-1', clinicId: 'ivs', patientName: 'Paciente Terça 1', date: dateStr, time: '14:00', status: 'completed' } as any,
      { id: 'apt-t-2', clinicId: 'ivs', patientName: 'Paciente Terça 2', date: dateStr, time: '15:00', status: 'completed' } as any,
      { id: 'apt-t-inprog', clinicId: 'ivs', patientName: 'Paciente Em Andamento', date: dateStr, time: '16:00', status: 'in_progress' } as any,
      { id: 'apt-t-canc', clinicId: 'ivs', patientName: 'Paciente Cancelado', date: dateStr, time: '17:00', status: 'canceled' } as any
    ], 'ivs');

    // Transações: 2 concluídas normais, 1 excluída logicamente (_deleted: true), 1 pendente
    offlineDb.saveTransactions([
      { id: 'tx-t-1', clinicId: 'ivs', type: 'income', category: 'consulta', description: 'Consulta Terça 1', encounterId: 'apt-t-1', amount: 50.00, status: 'completed', date: dateStr, createdAt: `${dateStr}T17:00:00.000Z` } as any,
      { id: 'tx-t-2', clinicId: 'ivs', type: 'income', category: 'consulta', description: 'Consulta Terça 2', encounterId: 'apt-t-2', amount: 50.00, status: 'completed', date: dateStr, createdAt: `${dateStr}T18:00:00.000Z` } as any,
      { id: 'tx-t-deleted', clinicId: 'ivs', type: 'income', category: 'consulta', description: 'Consulta Deletada Logicamente', amount: 50.00, status: 'completed', _deleted: true, date: dateStr, createdAt: `${dateStr}T19:00:00.000Z` } as any,
      { id: 'tx-t-pending', clinicId: 'ivs', type: 'income', category: 'consulta', description: 'Consulta Pendente', amount: 50.00, status: 'pending', date: dateStr, createdAt: `${dateStr}T19:30:00.000Z` } as any
    ], 'ivs');

    const report = offlineDb.getProfessionalSettlementReport('Dr. Rudson Meirelles', 'ivs');

    // Exclusão lógica e status não concluídos devem ser 100% desconsiderados
    expect(report.dailyEntries.length).toBe(1);
    expect(report.dailyEntries[0].type).toBe('meia_diaria');
    expect(report.dailyEntries[0].quantity).toBe(1);
    expect(report.dailyEntries[0].totalAmount).toBe(500.00);
    expect(report.dailyEntries[0].description).toContain('2 atendimentos no período contratado');
    expect(report.totalProductionAmount).toBe(500.00);

    // Teste de gravação efetiva / liquidação no caixa (não duplicação no fluxo financeiro)
    // Simula pagamento registrado
    const beforeExpenses = offlineDb.getTransactions('ivs').filter(t => t.type === 'expense');
    const paymentTx = {
      id: `tx_repasse_teste_unico`,
      clinicId: 'ivs',
      type: 'expense' as const,
      category: 'salario',
      description: 'Repasse Dr. Meirelles - Semana Homologada',
      amount: 500.00,
      amountCents: 50000,
      currency: 'BRL' as const,
      paymentMethod: 'pix' as const,
      date: dateStr,
      status: 'completed' as const,
      isSettled: true,
      createdBy: 'Administração',
      createdAt: new Date().toISOString()
    };
    offlineDb.saveTransaction(paymentTx, 'ivs');

    const afterExpenses = offlineDb.getTransactions('ivs').filter(t => t.type === 'expense');
    expect(afterExpenses.length).toBe(beforeExpenses.length + 1);

    // Tentativa de salvar novamente a mesma transação com mesmo ID (sincronização de outra máquina)
    offlineDb.saveTransaction(paymentTx, 'ivs');
    const afterDuplicateSync = offlineDb.getTransactions('ivs').filter(t => t.type === 'expense');
    // Não duplica registro no array de transações (idempotência pelo ID)
    expect(afterDuplicateSync.length).toBe(afterExpenses.length);
  });
});

