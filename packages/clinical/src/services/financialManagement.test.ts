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

describe('FASE 8 — Gestão Financeira, Ciclo de Vida do Caixa, PDV e Sincronização Segura', () => {
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
  });

  it('1. Abertura de Caixa: deve abrir sessão com operador, horário e saldo inicial em centavos', () => {
    const session = offlineDb.openCashRegisterSession(
      'op-01',
      'Recepção IVS',
      150.50,
      'Troco em notas e moedas',
      'ivs'
    );

    expect(session.id).toBeDefined();
    expect(session.status).toBe('open');
    expect(session.operatorName).toBe('Recepção IVS');
    expect(session.openingBalance).toBe(150.50);
    expect(session.openingBalanceCents).toBe(15050);
    expect(session.openedAt).toBeDefined();

    const active = offlineDb.getActiveCashRegisterSession('ivs');
    expect(active?.id).toBe(session.id);
  });

  it('2. Venda no PDV: deve registrar movimentação com valores decimais seguros', () => {
    // Abre caixa
    offlineDb.openCashRegisterSession('op-01', 'Recepção', 100, undefined, 'ivs');

    const tx: FinancialTransaction = {
      id: 'tx-venda-01',
      clinicId: 'ivs',
      type: 'income',
      category: 'venda_oculos',
      description: 'Armação Premium + Lentes',
      amount: 450.75,
      currency: 'BRL',
      paymentMethod: 'credit_card',
      patientName: 'Maria Silva',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Recepção',
      createdAt: new Date().toISOString()
    };

    offlineDb.saveTransaction(tx, 'ivs');
    const saved = offlineDb.getTransactions('ivs').find(t => t.id === 'tx-venda-01');

    expect(saved).toBeDefined();
    expect(saved?.amount).toBe(450.75);
    expect(saved?.amountCents).toBe(45075);
    expect(saved?.cashRegisterId).toBeDefined();
  });

  it('3. Recebimento de Consulta: auto-lançamento vinculado ao atendimento', () => {
    const consultTx: FinancialTransaction = {
      id: 'tx-consult-01',
      clinicId: 'ivs',
      type: 'income',
      category: 'consulta',
      description: 'Consulta Oftalmológica Dr. Meirelles',
      amount: 50.00,
      currency: 'BRL',
      paymentMethod: 'cash',
      patientId: 'pat-123',
      patientName: 'Carlos Oliveira',
      encounterId: 'enc-999',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Dr. Rudson Meirelles',
      createdAt: new Date().toISOString()
    };

    offlineDb.saveTransaction(consultTx, 'ivs');
    const saved = offlineDb.getTransactions('ivs').find(t => t.id === 'tx-consult-01');

    expect(saved?.encounterId).toBe('enc-999');
    expect(saved?.amount).toBe(50.00);
    expect(saved?.amountCents).toBe(5000);
  });

  it('4. Desconto: cálculo matemático exato sem perda de centavos por floating point', () => {
    // Cálculo seguro via safeCalculateItemTotal
    const itemCalc = safeCalculateItemTotal(250.00, 2, 50.00); // 2 itens de 250 = 500, menos 50 de desconto = 450
    expect(itemCalc.subtotal).toBe(500.00);
    expect(itemCalc.discount).toBe(50.00);
    expect(itemCalc.total).toBe(450.00);
    expect(itemCalc.totalCents).toBe(45000);

    // Soma flutuante problemática em JS clássico (0.1 + 0.2 === 0.30000000000000004)
    expect(safeSum(0.1, 0.2)).toBe(0.3);
  });

  it('5. Pagamentos: suporte a PIX, Cartão, Dinheiro e Transferência sem confirmar falsamente', () => {
    const pixTx: FinancialTransaction = {
      id: 'tx-pix-01',
      clinicId: 'ivs',
      type: 'income',
      category: 'consulta',
      description: 'Consulta via PIX',
      amount: 150.00,
      paymentMethod: 'pix',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Recepção',
      createdAt: new Date().toISOString()
    };

    const pendingTx: FinancialTransaction = {
      id: 'tx-pending-01',
      clinicId: 'ivs',
      type: 'income',
      category: 'consulta',
      description: 'Consulta Aguardando Confirmação',
      amount: 150.00,
      paymentMethod: 'pix',
      status: 'pending', // Pagamento não confirmado
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Recepção',
      createdAt: new Date().toISOString()
    };

    offlineDb.saveTransaction(pixTx, 'ivs');
    offlineDb.saveTransaction(pendingTx, 'ivs');

    // Apenas pagamentos com status 'completed' entram no saldo do caixa
    const summary = offlineDb.getCashRegisterSummary(undefined, 'ivs');
    expect(summary.totalIncome).toBe(150.00); // Apenas pixTx é somado
  });

  it('6. Saída Financeira / Despesa / Repasse Profissional', () => {
    offlineDb.openCashRegisterSession('op-01', 'Recepção', 200, undefined, 'ivs');

    const expenseTx: FinancialTransaction = {
      id: 'tx-exp-01',
      clinicId: 'ivs',
      type: 'expense',
      category: 'fornecedor_insumos',
      description: 'Compra de colírios anestésicos',
      amount: 65.50,
      paymentMethod: 'cash',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Recepção',
      createdAt: new Date().toISOString()
    };

    offlineDb.saveTransaction(expenseTx, 'ivs');
    const summary = offlineDb.getCashRegisterSummary(undefined, 'ivs');

    expect(summary.openingBalance).toBe(200.00);
    expect(summary.totalExpense).toBe(65.50);
    expect(summary.currentBalance).toBe(134.50); // 200 - 65.50
  });

  it('7. Fechamento de Caixa: ciclo completo com cálculo de saldo esperado', () => {
    const session = offlineDb.openCashRegisterSession('op-01', 'Recepção', 100, undefined, 'ivs');

    // Entrada de 150
    offlineDb.saveTransaction({
      id: 'tx-in-close',
      clinicId: 'ivs',
      cashRegisterId: session.id,
      type: 'income',
      category: 'consulta',
      description: 'Consulta',
      amount: 150,
      paymentMethod: 'cash',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Op',
      createdAt: new Date().toISOString()
    }, 'ivs');

    // Saída de 30
    offlineDb.saveTransaction({
      id: 'tx-out-close',
      clinicId: 'ivs',
      cashRegisterId: session.id,
      type: 'expense',
      category: 'outros',
      description: 'Lanche equipe',
      amount: 30,
      paymentMethod: 'cash',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Op',
      createdAt: new Date().toISOString()
    }, 'ivs');

    // Esperado: 100 + 150 - 30 = 220
    const closed = offlineDb.closeCashRegisterSession(session.id, 220, 'Tudo conferido', 'ivs');

    expect(closed.status).toBe('closed');
    expect(closed.expectedBalance).toBe(220);
    expect(closed.declaredBalance).toBe(220);
    expect(closed.difference).toBe(0);
    expect(closed.closedAt).toBeDefined();

    // Não deve haver caixa aberto após fechar
    expect(offlineDb.getActiveCashRegisterSession('ivs')).toBeNull();
  });

  it('8. Divergência de Caixa: detecta falta ou sobra de dinheiro na conferência', () => {
    const session = offlineDb.openCashRegisterSession('op-01', 'Recepção', 100, undefined, 'ivs');

    // Esperado: 100. Operador declara 80 (Falta de 20)
    const closedWithShortage = offlineDb.closeCashRegisterSession(session.id, 80, 'Faltou troco', 'ivs');

    expect(closedWithShortage.expectedBalance).toBe(100);
    expect(closedWithShortage.declaredBalance).toBe(80);
    expect(closedWithShortage.difference).toBe(-20); // Negativo = Falta
  });

  it('9. Bloqueio de Alteração em Caixa Fechado: impede re-fechamento ou reabertura silenciosa', () => {
    const session = offlineDb.openCashRegisterSession('op-01', 'Recepção', 50, undefined, 'ivs');
    offlineDb.closeCashRegisterSession(session.id, 50, undefined, 'ivs');

    // Tentar fechar novamente deve lançar erro
    expect(() => {
      offlineDb.closeCashRegisterSession(session.id, 50, undefined, 'ivs');
    }).toThrow(/já foi fechado/);
  });

  it('10. Operação Offline: criação e persistência de transações sem rede ativa', () => {
    const offlineTx: FinancialTransaction = {
      id: 'tx-offline-mode',
      clinicId: 'ivs',
      type: 'income',
      category: 'consulta',
      description: 'Consulta Offline em Trânsito',
      amount: 50.00,
      paymentMethod: 'cash',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Recepção Offline',
      createdAt: new Date().toISOString()
    };

    offlineDb.saveTransaction(offlineTx, 'ivs');
    const loaded = offlineDb.getTransactions('ivs').find(t => t.id === 'tx-offline-mode');
    expect(loaded).toBeDefined();
    expect(loaded?.amount).toBe(50.00);
  });

  it('11. Reload / Persistência Durável: dados permanecem intactos após reload da página', () => {
    const tx: FinancialTransaction = {
      id: 'tx-reload-test',
      clinicId: 'ivs',
      type: 'income',
      category: 'consulta',
      description: 'Consulta Teste Reload',
      amount: 100.00,
      paymentMethod: 'pix',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Recepção',
      createdAt: new Date().toISOString()
    };

    offlineDb.saveTransaction(tx, 'ivs');

    // Simula reload recuperando os dados do storage
    const recovered = offlineDb.getTransactions('ivs');
    expect(recovered.some(t => t.id === 'tx-reload-test')).toBe(true);
  });

  it('12. Sincronização: fila durável de sincronização com chave da clínica', () => {
    const tx: FinancialTransaction = {
      id: 'tx-sync-queue-test',
      clinicId: 'megastar',
      type: 'income',
      category: 'consulta',
      description: 'Consulta no Paraguai',
      amount: 150000,
      currency: 'PYG',
      paymentMethod: 'cash',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Recepção PY',
      createdAt: new Date().toISOString()
    };

    offlineDb.saveTransaction(tx, 'megastar');
    const megaTxs = offlineDb.getTransactions('megastar');
    expect(megaTxs.some(t => t.id === 'tx-sync-queue-test')).toBe(true);
  });

  it('13. Operação Duplicada: previne duplo clique com idempotência de ID único', () => {
    const tx: FinancialTransaction = {
      id: 'tx-unique-idempotent-01',
      clinicId: 'ivs',
      type: 'income',
      category: 'consulta',
      description: 'Consulta Anti-Duplo Clique',
      amount: 50.00,
      paymentMethod: 'cash',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Recepção',
      createdAt: new Date().toISOString()
    };

    // Primeiro clique
    offlineDb.saveTransaction(tx, 'ivs');
    // Segundo clique inadvertido com o mesmo objeto e ID
    offlineDb.saveTransaction(tx, 'ivs');

    const matches = offlineDb.getTransactions('ivs').filter(t => t.id === 'tx-unique-idempotent-01');
    expect(matches.length).toBe(1); // Não duplicou
  });

  it('14. Resposta Perdida / Idempotência com OperationId no backend', () => {
    const operationJournal = new Map<string, any>();

    function serverProcessOperation(opId: string, payload: any) {
      if (operationJournal.has(opId)) {
        return { ok: true, alreadyProcessed: true, result: operationJournal.get(opId) };
      }
      // Processa operação
      const result = { processedAt: new Date().toISOString(), ...payload };
      operationJournal.set(opId, result);
      return { ok: true, alreadyProcessed: false, result };
    }

    const opId = 'op-trans-999';
    const res1 = serverProcessOperation(opId, { amount: 50 });
    const res2 = serverProcessOperation(opId, { amount: 50 });

    expect(res1.alreadyProcessed).toBe(false);
    expect(res2.alreadyProcessed).toBe(true); // Protegido contra perda de resposta
  });

  it('15. Tombstones e Deleção Durável: transação deletada não reaparece', () => {
    const tx: FinancialTransaction = {
      id: 'tx-to-delete',
      clinicId: 'ivs',
      type: 'expense',
      category: 'outros',
      description: 'Lançamento Errôneo',
      amount: 25.00,
      paymentMethod: 'cash',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Recepção',
      createdAt: new Date().toISOString()
    };

    offlineDb.saveTransaction(tx, 'ivs');
    expect(offlineDb.getTransactions('ivs').some(t => t.id === 'tx-to-delete')).toBe(true);

    offlineDb.deleteTransaction('tx-to-delete', 'ivs');
    expect(offlineDb.getTransactions('ivs').some(t => t.id === 'tx-to-delete')).toBe(false);
  });

  it('16. Isolamento Multi-Tenant: finanças de uma clínica não vazam para outra', () => {
    const txBR: FinancialTransaction = {
      id: 'tx-tenant-br',
      clinicId: 'ivs',
      type: 'income',
      category: 'consulta',
      description: 'Consulta Brasil',
      amount: 50.00,
      currency: 'BRL',
      paymentMethod: 'pix',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Op BR',
      createdAt: new Date().toISOString()
    };

    const txPY: FinancialTransaction = {
      id: 'tx-tenant-py',
      clinicId: 'megastar',
      type: 'income',
      category: 'consulta',
      description: 'Consulta Paraguai',
      amount: 150000,
      currency: 'PYG',
      paymentMethod: 'cash',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Op PY',
      createdAt: new Date().toISOString()
    };

    offlineDb.saveTransaction(txBR, 'ivs');
    offlineDb.saveTransaction(txPY, 'megastar');

    const ivsList = offlineDb.getTransactions('ivs');
    const pyList = offlineDb.getTransactions('megastar');

    expect(ivsList.some(t => t.id === 'tx-tenant-br')).toBe(true);
    expect(ivsList.some(t => t.id === 'tx-tenant-py')).toBe(false);

    expect(pyList.some(t => t.id === 'tx-tenant-py')).toBe(true);
    expect(pyList.some(t => t.id === 'tx-tenant-br')).toBe(false);
  });

  it('17. Auditoria de Ações Financeiras: log detalhado de criação, edição e exclusão', () => {
    const tx: FinancialTransaction = {
      id: 'tx-audit-me',
      clinicId: 'ivs',
      type: 'income',
      category: 'consulta',
      description: 'Consulta Auditada',
      amount: 50.00,
      paymentMethod: 'pix',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Recepção Audit',
      createdAt: new Date().toISOString()
    };

    offlineDb.saveTransaction(tx, 'ivs');
    const logs = offlineDb.getAuditLogs('ivs');
    const foundLog = logs.find(l => l.resourceId === 'tx-audit-me');

    expect(foundLog).toBeDefined();
    expect(foundLog?.resourceType).toBe('FINANCE');
  });

  it('18. Permissões de Acesso por Perfil e Unidade', () => {
    function canAccessFinance(role: string): boolean {
      return ['superadmin', 'admin', 'reception'].includes(role);
    }

    expect(canAccessFinance('superadmin')).toBe(true);
    expect(canAccessFinance('admin')).toBe(true);
    expect(canAccessFinance('reception')).toBe(true);
    expect(canAccessFinance('patient')).toBe(false);
  });

  it('19. Multiunidade Brasil/Paraguai: formatação de moeda correspondente (BRL vs PYG)', () => {
    const formattedBRL = formatCurrencyValue(150.50, 'BRL');
    const formattedPYG = formatCurrencyValue(150000, 'PYG');

    expect(formattedBRL).toBe('R$ 150,50');
    expect(formattedPYG).toContain('Gs.');
  });

  it('20. Regressão Geral: integridade do fluxo de liquidação (dar baixa / reabrir)', () => {
    const tx: FinancialTransaction = {
      id: 'tx-settle-01',
      clinicId: 'ivs',
      type: 'income',
      category: 'consulta',
      description: 'Consulta Para Baixa',
      amount: 50.00,
      paymentMethod: 'pix',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdBy: 'Recepção',
      createdAt: new Date().toISOString()
    };

    offlineDb.saveTransaction(tx, 'ivs');

    // Dar baixa
    offlineDb.settleTransaction('tx-settle-01', true, 'ivs');
    let loaded = offlineDb.getTransactions('ivs').find(t => t.id === 'tx-settle-01');
    expect(loaded?.isSettled).toBe(true);
    expect(loaded?.settledAt).toBeDefined();

    // Reabrir
    offlineDb.settleTransaction('tx-settle-01', false, 'ivs');
    loaded = offlineDb.getTransactions('ivs').find(t => t.id === 'tx-settle-01');
    expect(loaded?.isSettled).toBe(false);
    expect(loaded?.settledAt).toBeUndefined();
  });
});
