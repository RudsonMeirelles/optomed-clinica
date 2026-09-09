import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  Plus, 
  CreditCard, 
  QrCode, 
  Calendar, 
  User, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Receipt, 
  Lock, 
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Clock,
  ChevronRight,
  Printer,
  Scale,
  Percent,
  Check,
  FileSpreadsheet,
  Briefcase,
  Layers,
  EyeOff,
  Archive,
  RotateCcw
} from 'lucide-react';
import { 
  FinancialTransaction, 
  POSItem, 
  CashRegisterSummary, 
  TransactionType, 
  TransactionCategory, 
  PaymentMethod,
  UserAccount,
  ClinicConfig,
  ProfessionalContractType,
  ProfessionalSettlementReport
} from '@optotipo/shared';
import { offlineDb, generateUUID } from '../services/offlineDb';
import { licensingService } from '../services/licensingService';

interface FinancialManagementPageProps {
  currentUser: UserAccount;
  activeClinic: ClinicConfig;
  onUpgradePlan?: () => void;
}

export const FinancialManagementPage: React.FC<FinancialManagementPageProps> = ({
  currentUser,
  activeClinic,
  onUpgradePlan
}) => {
  const hasModuleAccess = licensingService.hasManagementModuleEnabled(activeClinic.id);
  const [activeTab, setActiveTab] = useState<'cash_flow' | 'pos' | 'weekly_settlement'>('cash_flow');
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [posItems, setPosItems] = useState<POSItem[]>([]);
  const [summary, setSummary] = useState<CashRegisterSummary>(offlineDb.getCashRegisterSummary());
  const [settlementReport, setSettlementReport] = useState<ProfessionalSettlementReport>(offlineDb.getProfessionalSettlementReport());
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Modo de visualização do extrato: 'daily' (Dia Atual) ou 'monthly' (Extrato Mensal Completo)
  const [statementMode, setStatementMode] = useState<'daily' | 'monthly'>('daily');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showSettled, setShowSettled] = useState<boolean>(false);

  // Modalidade de Contrato Atual Selecionada para o Examinador
  const [contractType, setContractType] = useState<ProfessionalContractType>('period_half_day');
  
  // Modais
  const [showTransactionModal, setShowTransactionModal] = useState<boolean>(false);
  const [showPOSItemModal, setShowPOSItemModal] = useState<boolean>(false);
  const [receiptTx, setReceiptTx] = useState<FinancialTransaction | null>(null);
  const [showSettlementPrintModal, setShowSettlementPrintModal] = useState<boolean>(false);

  // Parâmetros de Repasse Semanal ao Examinador (IVS)
  const [examinerRepasseSuccess, setExaminerRepasseSuccess] = useState<string | null>(null);

  // Formulário Nova Transação
  const [txType, setTxType] = useState<TransactionType>('income');
  const [txCategory, setTxCategory] = useState<TransactionCategory>('consulta');
  const [txDescription, setTxDescription] = useState<string>('');
  const [txAmount, setTxAmount] = useState<string>(() => activeClinic.id === 'ivs' ? '50.00' : '150.00');
  const [txPaymentMethod, setTxPaymentMethod] = useState<PaymentMethod>('pix');
  const [txPatientName, setTxPatientName] = useState<string>('');

  // Formulário Novo Item PDV
  const [posName, setPosName] = useState<string>('');
  const [posCategory, setPosCategory] = useState<'consulta' | 'exame' | 'produto' | 'servico'>('consulta');
  const [posPrice, setPosPrice] = useState<string>(() => activeClinic.id === 'ivs' ? '50.00' : '150.00');

  const loadData = () => {
    setTransactions(offlineDb.getTransactions());
    setPosItems(offlineDb.getPOSItems());
    setSummary(offlineDb.getCashRegisterSummary());
    setSettlementReport(offlineDb.getProfessionalSettlementReport());
  };

  useEffect(() => {
    loadData();

    // 1. Escuta eventos locais de lançamentos em tempo real (ex: consulta concluída)
    const handleFinanceEvent = () => {
      loadData();
    };

    window.addEventListener('optomed_finance_updated', handleFinanceEvent);
    window.addEventListener('storage', handleFinanceEvent);

    // 2. Polling leve e contínuo a cada 3 segundos para sincronia instantânea entre abas
    const interval = setInterval(() => {
      loadData();
    }, 3000);

    return () => {
      window.removeEventListener('optomed_finance_updated', handleFinanceEvent);
      window.removeEventListener('storage', handleFinanceEvent);
      clearInterval(interval);
    };
  }, [activeClinic.id]);

  // Se a clínica não contratou o módulo de gestão financeira (Plano Básico de R$ 59,90)
  if (!hasModuleAccess && currentUser.role !== 'superadmin') {
    return (
      <div className="p-8 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[75vh] text-center">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-xl">
          <Lock className="w-10 h-10" />
        </div>
        
        <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black uppercase tracking-wider mb-2">
          Módulo Opcional de Gestão
        </span>

        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Módulo de Gestão da Clínica & Financeiro
        </h1>
        <p className="text-sm text-slate-600 max-w-lg mt-2 leading-relaxed">
          Sua clínica está utilizando o <b>Plano Básico (R$ 59,90/mês)</b>, focado em exames visuais e prontuário.
          Para habilitar <b>Fluxo de Caixa, Apuração Semanal ao Examinador, Modalidades de Trabalho (Diária / Período / Produção), PDV e Recibos</b>, faça o upgrade para o Plano Completo.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl w-full my-8 text-left text-xs">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Fluxo de Caixa & Fechamento Semanal
            </div>
            <p className="text-slate-500 text-[11px]">Controle diário e acerto financeiro (Diária R$ 1.000, Meia Diária R$ 500 ou R$ 50 por consulta).</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> PDV & Tabela de Preços Customizada
            </div>
            <p className="text-slate-500 text-[11px]">Cobrança com 1 clique de consultas (R$ 50 IVS / R$ 0 retorno) e emissão de recibos térmicos/A4.</p>
          </div>
        </div>

        <button
          onClick={onUpgradePlan}
          className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl text-xs shadow-xl shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer hover:scale-105"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Contratar Plano Completo (Apenas + R$ 89,10/mês)</span>
        </button>
      </div>
    );
  }

  // Lançar Nova Transação Manual
  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(txAmount.replace(',', '.')) || 0;
    if (amountNum < 0) {
      alert('Por favor, informe um valor válido.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const newTx: FinancialTransaction = {
      id: generateUUID(),
      clinicId: activeClinic.id,
      type: txType,
      category: txCategory,
      description: txDescription || `${txType === 'income' ? 'Recebimento' : 'Pagamento'} - ${txCategory}`,
      amount: amountNum,
      date: today,
      paymentMethod: txPaymentMethod,
      patientName: txPatientName || undefined,
      receiptNumber: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'completed',
      createdBy: currentUser.fullName,
      createdAt: new Date().toISOString()
    };

    offlineDb.saveTransaction(newTx);
    setShowTransactionModal(false);
    setTxDescription('');
    setTxPatientName('');
    setTxAmount(activeClinic.id === 'ivs' ? '50.00' : '150.00');
    loadData();
  };

  // Venda Rápida pelo PDV
  const handleQuickPOSSale = (item: POSItem) => {
    const patientNamePrompt = prompt(`Cobrar "${item.name}" (R$ ${item.price.toFixed(2)})?\nInforme o nome do paciente (opcional):`);
    if (patientNamePrompt === null) return;

    const today = new Date().toISOString().split('T')[0];
    const newTx: FinancialTransaction = {
      id: generateUUID(),
      clinicId: activeClinic.id,
      type: 'income',
      category: item.category === 'produto' ? 'venda_oculos' : 'consulta',
      description: `PDV: ${item.name}`,
      amount: item.price,
      date: today,
      paymentMethod: item.price === 0 ? 'cash' : 'pix',
      patientName: patientNamePrompt.trim() || undefined,
      receiptNumber: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'completed',
      createdBy: currentUser.fullName,
      createdAt: new Date().toISOString()
    };

    offlineDb.saveTransaction(newTx);
    loadData();
    setReceiptTx(newTx);
  };

  // Efetivar Pagamento / Repasse ao Dr. Meirelles
  const handleExecuteRepasse = (examinerName: string, amount: number) => {
    if (amount <= 0) {
      alert('Não há valor acumulado para efetivação.');
      return;
    }

    if (amount > summary.currentBalance) {
      if (!confirm(`Atenção: O valor do pagamento (R$ ${amount.toFixed(2)}) é superior à disponibilidade imediata de caixa (R$ ${summary.currentBalance.toFixed(2)}).\nDeseja efetivar a saída financeira mesmo assim?`)) {
        return;
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const newTx: FinancialTransaction = {
      id: generateUUID(),
      clinicId: activeClinic.id,
      type: 'expense',
      category: 'salario',
      description: `Repasse & Acerto Semanal de Atendimentos: ${examinerName} (Ref: Dif. R$ 550 + 17 Consultas + Meia Diária)`,
      amount,
      date: today,
      paymentMethod: 'pix',
      receiptNumber: `REP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'completed',
      createdBy: currentUser.fullName,
      createdAt: new Date().toISOString()
    };

    offlineDb.saveTransaction(newTx);
    loadData();
    setExaminerRepasseSuccess(`Pagamento de R$ ${amount.toFixed(2)} ao ${examinerName} efetivado com sucesso com emissão de comprovante!`);
    setTimeout(() => setExaminerRepasseSuccess(null), 5000);
  };

  // Cadastro de Novo Item no PDV
  const handleCreatePOSItem = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(posPrice.replace(',', '.')) || 0;
    const newItem: POSItem = {
      id: `pos_${Date.now()}`,
      name: posName.trim(),
      category: posCategory,
      price: priceNum,
      isActive: true
    };
    offlineDb.savePOSItem(newItem);
    setShowPOSItemModal(false);
    setPosName('');
    setPosPrice(activeClinic.id === 'ivs' ? '50.00' : '150.00');
    loadData();
  };

  // Excluir Lançamento
  const handleDeleteTx = (id: string) => {
    if (confirm('Deseja realmente excluir este lançamento do fluxo de caixa?')) {
      offlineDb.deleteTransaction(id);
      loadData();
    }
  };

  // Dar Baixa / Liquidar Lançamento (ou reabrir)
  const handleToggleSettle = (id: string, currentSettled?: boolean) => {
    const nextSettled = !currentSettled;
    offlineDb.settleTransaction(id, nextSettled);
    loadData();
  };

  // Filtragem de transações com regra de liquidação:
  // - Valores liquidados (isSettled) são OCULTADOS por padrão
  // - Aparecem apenas quando solicitado o Extrato Mensal ('monthly') OU na Pesquisa Específica (searchTerm) OU quando showSettled estiver ativo
  const filteredTransactions = transactions.filter(t => {
    // 1. Pesquisa textual específica (se houver busca, pesquisa em tudo, inclusive liquidados)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      return (
        t.description.toLowerCase().includes(q) ||
        (t.patientName && t.patientName.toLowerCase().includes(q)) ||
        (t.receiptNumber && t.receiptNumber.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q)
      );
    }

    // 2. No modo Extrato Mensal, filtra pelo mês selecionado (YYYY-MM)
    if (statementMode === 'monthly') {
      const txMonth = (t.date || t.createdAt).slice(0, 7);
      return txMonth === selectedMonth;
    }

    // 3. No modo Caixa do Dia ('daily'):
    // Ocultar liquidados por padrão, exceto se showSettled for explicitamente marcado
    if (t.isSettled && !showSettled) {
      return false;
    }

    return true;
  });

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6 select-none animate-fadeIn">
      
      {/* 1. Header com Título e Ações Rápidas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              GESTÃO FINANCEIRA & PDV
            </h1>
            <span className="text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-emerald-600 -ml-3.5" />
              <span>Tempo Real Ativo</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Lançamentos automáticos ao vivo, Fechamento de Caixa, PDV e Repasses ({activeClinic.name})
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setTxType('income');
              setShowTransactionModal(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nova Entrada
          </button>

          <button
            onClick={() => {
              setTxType('expense');
              setShowTransactionModal(true);
            }}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nova Saída
          </button>
        </div>
      </div>

      {/* 2. Cards de Balanço e Caixa do Dia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Entradas de Hoje</span>
            <span className="text-2xl font-black text-emerald-600 mt-0.5 block">
              + R$ {summary.totalIncome.toFixed(2)}
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Saídas / Despesas</span>
            <span className="text-2xl font-black text-rose-600 mt-0.5 block">
              - R$ {summary.totalExpense.toFixed(2)}
            </span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl p-4 shadow-md flex items-center justify-between border border-blue-900/50">
          <div>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">Disponibilidade em Caixa</span>
            <span className="text-2xl font-black text-white mt-0.5 block">
              R$ {summary.currentBalance.toFixed(2)}
            </span>
          </div>
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total a Pagar ao Examinador</span>
            <span className="text-2xl font-black text-amber-600 mt-0.5 block">
              R$ {settlementReport.totalPayableAmount.toFixed(2)}
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* 3. Navegação por Abas */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('cash_flow')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'cash_flow' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Extrato de Caixa</span>
          </button>

          <button
            onClick={() => setActiveTab('weekly_settlement')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'weekly_settlement' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'
            }`}
          >
            <Scale className="w-4 h-4 text-amber-400" />
            <span>Informe & Espelho de Pagamento (Dr. Meirelles)</span>
          </button>

          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'pos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'
            }`}
          >
            <ShoppingCart className="w-4 h-4 text-blue-600" />
            <span>PDV / Frente de Caixa</span>
          </button>
        </div>

        {activeTab === 'cash_flow' && (
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Seletor Diário vs Extrato Mensal */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-2xl shadow-xs">
              <button
                type="button"
                onClick={() => setStatementMode('daily')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statementMode === 'daily'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Caixa do Dia
              </button>

              <button
                type="button"
                onClick={() => setStatementMode('monthly')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statementMode === 'monthly'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Extrato Mensal</span>
              </button>
            </div>

            {/* Seletor do Mês quando no modo Extrato Mensal */}
            {statementMode === 'monthly' && (
              <div className="flex items-center gap-1.5 bg-white border border-blue-200 px-3 py-1.5 rounded-xl shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Mês:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="text-xs font-black text-blue-900 bg-transparent focus:outline-none cursor-pointer"
                />
              </div>
            )}

            {/* Toggle Ocultar/Exibir Liquidados no Caixa Diário */}
            {statementMode === 'daily' && (
              <button
                type="button"
                onClick={() => setShowSettled(!showSettled)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  showSettled
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title={showSettled ? 'Ocultar valores já liquidados da tela' : 'Exibir valores já baixados/liquidados'}
              >
                {showSettled ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Archive className="w-3.5 h-3.5 text-slate-500" />}
                <span>{showSettled ? 'Ocultar Baixados' : 'Ver Baixados'}</span>
              </button>
            )}

            {/* Busca textual */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquisar recibo, paciente ou item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* ABA 1: FLUXO DE CAIXA / EXTRATO DO DIA & EXTRATO MENSAL */}
      {activeTab === 'cash_flow' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          
          {/* Banner explicativo de modo de extrato */}
          <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">
                {statementMode === 'monthly' ? `Extrato Mensal Consolidado (${selectedMonth.split('-').reverse().join('/')})` : 'Lançamentos em Aberto (Caixa do Dia)'}
              </span>
              <span className="text-[11px] text-slate-400">
                • {filteredTransactions.length} registro(s) exibido(s)
              </span>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Valores pagos/baixados saem da visualização do dia
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Data / Hora</th>
                  <th className="px-6 py-3.5">Tipo / Status</th>
                  <th className="px-6 py-3.5">Descrição / Paciente</th>
                  <th className="px-6 py-3.5">Categoria</th>
                  <th className="px-6 py-3.5">Forma de Pagamento</th>
                  <th className="px-6 py-3.5">Valor (R$)</th>
                  <th className="px-6 py-3.5 text-right">Ações & Baixa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 space-y-2">
                      <Archive className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="font-bold text-slate-600">
                        {statementMode === 'daily'
                          ? 'Nenhuma pendência ativa no caixa do dia (valores liquidados foram baixados).'
                          : 'Nenhum lançamento encontrado para o período selecionado.'}
                      </p>
                      {statementMode === 'daily' && (
                        <p className="text-xs text-slate-400">
                          Clique em <strong className="text-slate-700">"Extrato Mensal"</strong> ou <strong className="text-slate-700">"Ver Baixados"</strong> para consultar o histórico completo.
                        </p>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr 
                      key={tx.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${tx.isSettled ? 'bg-slate-50/40 opacity-75' : ''}`}
                    >
                      
                      <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500">
                        {tx.date ? tx.date.split('-').reverse().join('/') : new Date(tx.createdAt).toLocaleDateString('pt-BR')} {new Date(tx.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="px-6 py-3.5">
                        <div className="flex flex-col gap-1">
                          {tx.type === 'income' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] w-fit">
                              <ArrowUpRight className="w-3 h-3" /> Entrada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] w-fit">
                              <ArrowDownRight className="w-3 h-3" /> Saída
                            </span>
                          )}

                          {tx.isSettled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold text-[9px] w-fit">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Liquidado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[9px] w-fit">
                              <Clock className="w-2.5 h-2.5 text-amber-600" /> Em Aberto
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-3.5">
                        <div className="font-bold text-slate-900">{tx.description}</div>
                        {tx.patientName && (
                          <div className="text-[11px] text-blue-600 flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3" /> {tx.patientName}
                          </div>
                        )}
                        {tx.receiptNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">{tx.receiptNumber}</div>
                        )}
                      </td>

                      <td className="px-6 py-3.5 text-slate-600 capitalize">
                        {tx.category.replace('_', ' ')}
                      </td>

                      <td className="px-6 py-3.5">
                        <span className="font-semibold text-slate-700 uppercase text-[11px]">
                          {tx.paymentMethod === 'pix' ? '💠 PIX' : tx.paymentMethod === 'credit_card' ? '💳 Cartão Crédito' : tx.paymentMethod === 'cash' ? '💵 Dinheiro' : tx.paymentMethod}
                        </span>
                      </td>

                      <td className={`px-6 py-3.5 font-black text-sm ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Botão Dar Baixa / Liquidar */}
                          <button
                            type="button"
                            onClick={() => handleToggleSettle(tx.id, tx.isSettled)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              tx.isSettled
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                            }`}
                            title={tx.isSettled ? 'Reabrir lançamento no caixa diário' : 'Dar baixa e ocultar da tela do dia'}
                          >
                            {tx.isSettled ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline text-[11px]">Reabrir</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Dar Baixa</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => setReceiptTx(tx)}
                            title="Ver Recibo"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteTx(tx.id)}
                            title="Remover"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 2: INFORME & ESPELHO DE PAGAMENTO (DR. MEIRELLES / IVS) */}
      {activeTab === 'weekly_settlement' && (
        <div className="space-y-6">
          {examinerRepasseSuccess && (
            <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{examinerRepasseSuccess}</span>
            </div>
          )}

          {/* 1. SELETOR DE MODALIDADE DE CONTRATO DO PROFISSIONAL */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-500/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-700/50 pb-5">
              <div>
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/30">
                  Modalidade Acordada ao Iniciar Atendimento
                </span>
                <h2 className="text-xl font-black mt-2 text-white">
                  Regime de Trabalho do Profissional: Dr. Rudson Meirelles
                </h2>
                <p className="text-xs text-indigo-200 mt-1">
                  Valores acordados contabilizados diariamente para somatória e plano de pagamento periódico.
                </p>
              </div>

              <button
                onClick={() => setShowSettlementPrintModal(true)}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Imprimir Espelho / Informe</span>
              </button>
            </div>

            {/* Opções de Modalidade */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              
              <div 
                onClick={() => setContractType('period_half_day')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  contractType === 'period_half_day'
                    ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-500/20'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-black tracking-wider text-amber-400">Modalidade de Hoje (05/09)</span>
                  {contractType === 'period_half_day' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <h3 className="text-base font-black text-white">Por Período (5h) / Meia Diária</h3>
                <p className="text-xs text-indigo-200 mt-1">Acordo fixo por turno de 5 horas de atendimento.</p>
                <div className="mt-3 text-xl font-black text-amber-300">R$ 500,00 <span className="text-xs font-normal text-indigo-200">/ período</span></div>
              </div>

              <div 
                onClick={() => setContractType('period_full_day')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  contractType === 'period_full_day'
                    ? 'bg-blue-500/20 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-black tracking-wider text-blue-400">Diária Completa</span>
                  {contractType === 'period_full_day' && <Check className="w-4 h-4 text-blue-400" />}
                </div>
                <h3 className="text-base font-black text-white">Diária Integral (8h)</h3>
                <p className="text-xs text-indigo-200 mt-1">Acordo de diária completa de atendimento na clínica.</p>
                <div className="mt-3 text-xl font-black text-blue-300">R$ 1.000,00 <span className="text-xs font-normal text-indigo-200">/ dia</span></div>
              </div>

              <div 
                onClick={() => setContractType('per_consultation')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  contractType === 'per_consultation'
                    ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400">Por Produção</span>
                  {contractType === 'per_consultation' && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <h3 className="text-base font-black text-white">Por Atendimento Realizado</h3>
                <p className="text-xs text-indigo-200 mt-1">Valor fixo por consulta oftalmológica concluída.</p>
                <div className="mt-3 text-xl font-black text-emerald-300">R$ 50,00 <span className="text-xs font-normal text-indigo-200">/ consulta</span></div>
              </div>

            </div>
          </div>

          {/* 2. DEMONSTRATIVO & INFORME DETALHADO DA SEMANA PARA O DR. MEIRELLES */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Tabela do Espelho da Semana */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-slate-900 text-base">Espelho de Produção da Semana (Dr. Meirelles)</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Período: 31/08/2026 a 05/09/2026 • IVS Instituto da Visão e Saúde</p>
                </div>
                <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-black">
                  Total: R$ {settlementReport.totalPayableAmount.toFixed(2)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Dia / Data</th>
                      <th className="p-3.5">Descrição dos Atendimentos</th>
                      <th className="p-3.5 text-center">Qtd</th>
                      <th className="p-3.5 text-right">Valor Unitário</th>
                      <th className="p-3.5 text-right">Total (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    
                    {/* Linha 1: Saldo Pendente da Semana Passada */}
                    <tr className="bg-amber-50/50 hover:bg-amber-50 transition-colors">
                      <td className="p-3.5 font-bold text-amber-900">Semana Anterior</td>
                      <td className="p-3.5 font-bold text-amber-900">
                        Diferença pendente de pagamento da semana passada a ser pago
                      </td>
                      <td className="p-3.5 text-center font-mono">1</td>
                      <td className="p-3.5 text-right font-mono">R$ 550,00</td>
                      <td className="p-3.5 text-right font-black text-amber-700 font-mono text-sm">
                        R$ 550,00
                      </td>
                    </tr>

                    {/* Linhas dos dias da semana */}
                    {settlementReport.dailyEntries.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{entry.dayLabel}</td>
                        <td className="p-3.5 text-slate-700">
                          {entry.description}
                        </td>
                        <td className="p-3.5 text-center font-bold text-blue-700 font-mono">{entry.quantity}</td>
                        <td className="p-3.5 text-right text-slate-600 font-mono">R$ {entry.unitPrice.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-black text-slate-900 font-mono text-sm">
                          R$ {entry.totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    ))}

                  </tbody>
                  
                  {/* Rodapé com Somatória */}
                  <tfoot className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-900">
                    <tr>
                      <td colSpan={2} className="p-4 uppercase tracking-wider text-[11px]">
                        SOMATÓRIA GERAL A REPASSAR (COM SALDO ANTERIOR)
                      </td>
                      <td className="p-4 text-center text-amber-400 font-mono">
                        17 cons. + 1 per.
                      </td>
                      <td className="p-4 text-right text-slate-400 font-normal">
                        Total Líquido:
                      </td>
                      <td className="p-4 text-right text-emerald-400 text-base font-mono">
                        R$ {settlementReport.totalPayableAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>

                </table>
              </div>

              <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200/80 text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-blue-950">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Resumo do Acordo de Repasse Dr. Meirelles:</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  • Diferença semana anterior: <b>R$ 550,00</b><br />
                  • 03/09/2026: <b>12 consultas × R$ 50,00 = R$ 600,00</b><br />
                  • 04/09/2026: <b>5 consultas × R$ 50,00 = R$ 250,00</b><br />
                  • 05/09/2026: <b>Meia diária / período de 5h = R$ 500,00</b><br />
                  • <b>Total Calculado: R$ 550 + R$ 600 + R$ 250 + R$ 500 = R$ 1.900,00</b>
                </p>
              </div>

            </div>

            {/* Card Lateral de Efetivação do Pagamento & Saldo de Caixa */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5 flex flex-col justify-between">
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Efetivação de Pagamento</h3>
                    <p className="text-[11px] text-slate-500">Conforme disponibilidade de caixa IVS</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Disponibilidade em Caixa:</span>
                    <span className={`font-black text-sm ${summary.currentBalance >= settlementReport.totalPayableAmount ? 'text-emerald-600' : 'text-amber-600'}`}>
                      R$ {summary.currentBalance.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Produção desta Semana:</span>
                    <span className="font-bold text-slate-900">
                      R$ {settlementReport.totalProductionAmount.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/60 flex items-center justify-between">
                    <span className="text-amber-900 font-bold">Saldo Anterior Pendente:</span>
                    <span className="font-black text-amber-700">
                      R$ {settlementReport.previousBalancePending.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl shadow-sm space-y-1">
                    <span className="text-[10px] uppercase font-black text-amber-400 tracking-wider block">
                      Valor Final a Pagar ao Examinador
                    </span>
                    <div className="text-2xl font-black text-emerald-400">
                      R$ {settlementReport.totalPayableAmount.toFixed(2)}
                    </div>
                    <span className="text-[10px] text-slate-300 block">
                      Dr. Rudson Meirelles • IVS
                    </span>
                  </div>

                </div>
              </div>

              <div className="space-y-2.5 pt-4">
                <button
                  onClick={() => handleExecuteRepasse('Dr. Rudson Meirelles', settlementReport.totalPayableAmount)}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Efetivar Pagamento (Lançar Saída de Caixa)</span>
                </button>

                <button
                  onClick={() => setShowSettlementPrintModal(true)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Visualizar Recibo de Repasse Completo</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ABA 3: PDV / FRENTE DE CAIXA RÁPIDO */}
      {activeTab === 'pos' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Catálogo de Cobrança Rápida (1 Clique)</h2>
              <p className="text-xs text-slate-500">Clique em qualquer item para gerar recebimento imediato e emitir comprovante.</p>
            </div>
            <button
              onClick={() => setShowPOSItemModal(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Novo Item / Exame</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {posItems.map((item) => (
              <div 
                key={item.id}
                onClick={() => handleQuickPOSSale(item)}
                className="bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md rounded-2xl p-5 flex flex-col justify-between transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                      {item.category}
                    </span>
                    <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 font-bold transition-opacity">
                      Cobrar ➔
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-blue-600 transition-colors">
                    {item.name}
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-lg font-black text-slate-900">
                    {item.price === 0 ? (
                      <span className="text-emerald-600 text-sm font-black">Gratuito (R$ 0)</span>
                    ) : (
                      `R$ ${item.price.toFixed(2)}`
                    )}
                  </div>
                  <button className="px-3 py-1.5 bg-blue-50 group-hover:bg-blue-600 text-blue-700 group-hover:text-white rounded-lg text-xs font-bold transition-colors">
                    Lançar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: NOVA TRANSAÇÃO */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {txType === 'income' ? (
                  <>
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <span>Lançar Entrada (Recebimento)</span>
                  </>
                ) : (
                  <>
                    <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                      <TrendingDown className="w-4 h-4" />
                    </div>
                    <span>Lançar Saída (Despesa / Repasse)</span>
                  </>
                )}
              </h3>
              <button onClick={() => setShowTransactionModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateTransaction} className="space-y-3.5 text-xs">
              
              <div>
                <label className="text-slate-700 font-bold block mb-1">Valor (R$) *</label>
                <input
                  type="text"
                  required
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  placeholder="50.00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-black text-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Descrição do Lançamento *</label>
                <input
                  type="text"
                  required
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  placeholder="Ex: Consulta Dr. Meirelles / Insumos"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Categoria</label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="consulta">Consulta</option>
                    <option value="exame">Exame</option>
                    <option value="venda_oculos">Venda Óculos</option>
                    <option value="venda_lentes">Venda Lentes</option>
                    <option value="salario">Repasse / Salário</option>
                    <option value="fornecedor_insumos">Insumos / Fornecedor</option>
                    <option value="aluguel">Aluguel / Estrutura</option>
                    <option value="energia_agua_internet">Energia/Água/Net</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">Forma de Pagamento</label>
                  <select
                    value={txPaymentMethod}
                    onChange={(e) => setTxPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="pix">PIX</option>
                    <option value="credit_card">Cartão de Crédito</option>
                    <option value="debit_card">Cartão de Débito</option>
                    <option value="cash">Dinheiro</option>
                    <option value="boleto">Boleto</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Paciente (Opcional)</label>
                <input
                  type="text"
                  value={txPatientName}
                  onChange={(e) => setTxPatientName(e.target.value)}
                  placeholder="Nome do paciente atendido"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white font-bold rounded-xl shadow-md ${
                    txType === 'income' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  Confirmar Lançamento
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: NOVO ITEM NO PDV */}
      {showPOSItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Novo Item no Catálogo PDV</h3>
              <button onClick={() => setShowPOSItemModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreatePOSItem} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Nome do Item / Procedimento *</label>
                <input
                  type="text"
                  required
                  value={posName}
                  onChange={(e) => setPosName(e.target.value)}
                  placeholder="Ex: Campimetria Computadorizada"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Preço de Venda (R$) *</label>
                  <input
                    type="text"
                    required
                    value={posPrice}
                    onChange={(e) => setPosPrice(e.target.value)}
                    placeholder="50.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">Tipo / Categoria</label>
                  <select
                    value={posCategory}
                    onChange={(e) => setPosCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="consulta">Consulta</option>
                    <option value="exame">Exame</option>
                    <option value="servico">Serviço</option>
                    <option value="produto">Produto</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPOSItemModal(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md"
                >
                  Salvar Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COMPROVANTE INDIVIDUAL DE PAGAMENTO */}
      {receiptTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">COMPROVANTE DE PAGAMENTO</span>
              <h3 className="text-xl font-black text-slate-900 mt-0.5">{activeClinic.name}</h3>
              <p className="text-[11px] text-slate-500">{activeClinic.address || 'Consultório Oftalmológico'}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Recibo Nº:</span>
                <span className="font-mono font-bold text-slate-900">{receiptTx.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Data / Hora:</span>
                <span className="font-medium text-slate-800">{new Date(receiptTx.createdAt).toLocaleString('pt-BR')}</span>
              </div>
              {receiptTx.patientName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Paciente:</span>
                  <span className="font-bold text-slate-900">{receiptTx.patientName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Descrição:</span>
                <span className="font-medium text-slate-800">{receiptTx.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Forma:</span>
                <span className="font-bold uppercase text-slate-800">{receiptTx.paymentMethod}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="font-bold text-slate-900">Total:</span>
                <span className="font-black text-lg text-emerald-600">R$ {receiptTx.amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setReceiptTx(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Recibo</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: IMPRESSÃO DO ESPELHO & INFORME DE PAGAMENTO COMPLETO (A4 / TÉRMICA) */}
      {showSettlementPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black">
                  IVS
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{activeClinic.name}</h3>
                  <p className="text-xs text-slate-500">INFORME & DEMONSTRATIVO DE REPASSE AO EXAMINADOR</p>
                </div>
              </div>
              <button onClick={() => setShowSettlementPrintModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Profissional / Examinador:</span>
                  <span className="text-slate-900 font-bold text-sm block mt-0.5">Dr. Rudson Meirelles</span>
                  <span className="text-slate-500 text-[11px]">CRM / CROO Especialista</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Período de Apuração:</span>
                  <span className="text-slate-900 font-bold text-sm block mt-0.5">31/08/2026 a 05/09/2026</span>
                  <span className="text-slate-500 text-[11px]">Fechamento Semanal</span>
                </div>
              </div>

              {/* Tabela Resumo */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-3">Item / Data</th>
                      <th className="p-3">Detalhamento</th>
                      <th className="p-3 text-center">Qtd</th>
                      <th className="p-3 text-right">Unitário</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    <tr className="bg-amber-50/70">
                      <td className="p-3 font-bold text-amber-900">Semana Anterior</td>
                      <td className="p-3 text-amber-900">Diferença pendente semana passada a ser pago</td>
                      <td className="p-3 text-center font-mono">1</td>
                      <td className="p-3 text-right font-mono">R$ 550,00</td>
                      <td className="p-3 text-right font-black text-amber-800 font-mono">R$ 550,00</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">03/09/2026</td>
                      <td className="p-3 text-slate-700">12 Consultas Clínicas / Refração (R$ 50 cada)</td>
                      <td className="p-3 text-center font-mono">12</td>
                      <td className="p-3 text-right font-mono">R$ 50,00</td>
                      <td className="p-3 text-right font-black text-slate-900 font-mono">R$ 600,00</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">04/09/2026</td>
                      <td className="p-3 text-slate-700">5 Consultas Clínicas / Refração (R$ 50 cada)</td>
                      <td className="p-3 text-center font-mono">5</td>
                      <td className="p-3 text-right font-mono">R$ 50,00</td>
                      <td className="p-3 text-right font-black text-slate-900 font-mono">R$ 250,00</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">05/09/2026</td>
                      <td className="p-3 text-slate-700">Atendimento por Período (5h) / Meia Diária</td>
                      <td className="p-3 text-center font-mono">1</td>
                      <td className="p-3 text-right font-mono">R$ 500,00</td>
                      <td className="p-3 text-right font-black text-slate-900 font-mono">R$ 500,00</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-black text-sm">
                    <tr>
                      <td colSpan={3} className="p-3.5 uppercase text-xs">TOTAL GERAL A REPASSAR:</td>
                      <td colSpan={2} className="p-3.5 text-right text-emerald-400 text-base font-mono">
                        R$ 1.900,00
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Assinaturas */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
                <div className="border-t border-slate-300 pt-2">
                  <span className="font-bold text-slate-800 block">Dr. Rudson Meirelles</span>
                  <span className="text-slate-400 text-[10px]">Examinador / Profissional</span>
                </div>
                <div className="border-t border-slate-300 pt-2">
                  <span className="font-bold text-slate-800 block">{activeClinic.name}</span>
                  <span className="text-slate-400 text-[10px]">Direção Administrativa / Financeiro</span>
                </div>
              </div>

            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowSettlementPrintModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
              >
                Fechar
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Espelho de Repasse (A4 / Cupom)</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
