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
  RotateCcw,
  AlertTriangle,
  Filter,
  CalendarCheck,
  X
} from 'lucide-react';
import { 
  FinancialTransaction, 
  POSItem, 
  CashRegisterSession,
  CashRegisterSummary, 
  TransactionType, 
  TransactionCategory, 
  PaymentMethod,
  UserAccount,
  ClinicConfig,
  ProfessionalContractType,
  ProfessionalWorkSession,
  ProfessionalSettlementReport,
  ExaminerFixedPeriod,
  ExaminerSpecialPeriod,
  ExaminerAvulsoRule,
  ExaminerRemunerationRecord,
  ExaminerClosureRecord,
  RemunerationStatus,
  formatCurrencyValue
} from '@optotipo/shared';
import { offlineDb, generateUUID } from '../services/offlineDb';
import { examinerRemunerationService } from '../services/examinerRemunerationService';
import { licensingService } from '../services/licensingService';
import { printIsolatedElement } from '../services/printService';

interface FinancialManagementPageProps {
  currentUser: UserAccount;
  activeClinic: ClinicConfig;
  clinicId?: string;
  onUpgradePlan?: () => void;
}

export const FinancialManagementPage: React.FC<FinancialManagementPageProps> = ({
  currentUser,
  activeClinic,
  clinicId,
  onUpgradePlan
}) => {
  const effectiveClinicId = clinicId || (currentUser.clinicId !== 'all' ? currentUser.clinicId : activeClinic.id);
  const hasModuleAccess = licensingService.hasManagementModuleEnabled(effectiveClinicId);
  const [activeTab, setActiveTab] = useState<'cash_flow' | 'pos' | 'weekly_settlement' | 'examiner_remuneration' | 'examiner_periods'>('cash_flow');
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [posItems, setPosItems] = useState<POSItem[]>([]);
  const [summary, setSummary] = useState<CashRegisterSummary>(offlineDb.getCashRegisterSummary(undefined, effectiveClinicId));
  const [settlementReport, setSettlementReport] = useState<ProfessionalSettlementReport>(offlineDb.getProfessionalSettlementReport('Dr. Rudson Meirelles', effectiveClinicId));
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Estados do Motor de Remuneração dos Examinadores
  const [remunerationRecords, setRemunerationRecords] = useState<ExaminerRemunerationRecord[]>([]);
  const [examinerClosures, setExaminerClosures] = useState<ExaminerClosureRecord[]>([]);
  const [fixedPeriods, setFixedPeriods] = useState<ExaminerFixedPeriod[]>([]);
  const [specialPeriods, setSpecialPeriods] = useState<ExaminerSpecialPeriod[]>([]);
  const [avulsoRules, setAvulsoRules] = useState<ExaminerAvulsoRule[]>([]);
  
  // Filtros da Remuneração
  const [filterExaminer, setFilterExaminer] = useState<string>('all');
  const [filterPeriodKind, setFilterPeriodKind] = useState<string>('all');
  const [filterRemStatus, setFilterRemStatus] = useState<string>('all');
  const [filterDateStart, setFilterDateStart] = useState<string>('2026-10-01');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('2026-10-31');

  // Modais de Remuneração & Períodos
  const [selectedRemRecord, setSelectedRemRecord] = useState<ExaminerRemunerationRecord | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false);
  const [adjustAmountInput, setAdjustAmountInput] = useState<string>('');
  const [adjustReasonInput, setAdjustReasonInput] = useState<string>('');
  const [showFixedPeriodModal, setShowFixedPeriodModal] = useState<boolean>(false);
  const [showSpecialPeriodModal, setShowSpecialPeriodModal] = useState<boolean>(false);
  const [remunerationFeedback, setRemunerationFeedback] = useState<string | null>(null);

  // Formulário Novo Período Fixo
  const [fixedDayOfWeek, setFixedDayOfWeek] = useState<number>(2);
  const [fixedStartTime, setFixedStartTime] = useState<string>('13:00');
  const [fixedEndTime, setFixedEndTime] = useState<string>('17:30');
  const [fixedAmount, setFixedAmount] = useState<string>('500.00');
  const [fixedNotes, setFixedNotes] = useState<string>('Turno Recorrente Meia Diária (5h)');

  // Formulário Novo Período Extraordinário
  const [specialDate, setSpecialDate] = useState<string>('2026-10-10');
  const [specialStartTime, setSpecialStartTime] = useState<string>('08:00');
  const [specialEndTime, setSpecialEndTime] = useState<string>('12:00');
  const [specialAmount, setSpecialAmount] = useState<string>('350.00');
  const [specialNotes, setSpecialNotes] = useState<string>('Mutirão Especial de Sábado');
  
  // Modo de visualização do extrato: 'daily' (Dia Atual) ou 'monthly' (Extrato Mensal Completo)
  const [statementMode, setStatementMode] = useState<'daily' | 'monthly'>('daily');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showSettled, setShowSettled] = useState<boolean>(false);

  // Modalidade de Contrato Atual Selecionada para o Examinador
  const todayStr = new Date().toISOString().split('T')[0];
  const initialWorkSession = offlineDb.getWorkSessionForDate(todayStr, 'Dr. Rudson Meirelles', effectiveClinicId);
  const [contractType, setContractType] = useState<ProfessionalContractType>(initialWorkSession.contractType);
  
  // Modais
  const [showTransactionModal, setShowTransactionModal] = useState<boolean>(false);
  const [showPOSItemModal, setShowPOSItemModal] = useState<boolean>(false);
  const [showOpenRegisterModal, setShowOpenRegisterModal] = useState<boolean>(false);
  const [showCloseRegisterModal, setShowCloseRegisterModal] = useState<boolean>(false);
  const [openBalanceInput, setOpenBalanceInput] = useState<string>('0.00');
  const [openNotesInput, setOpenNotesInput] = useState<string>('');
  const [declaredBalanceInput, setDeclaredBalanceInput] = useState<string>('0.00');
  const [closeNotesInput, setCloseNotesInput] = useState<string>('');
  const [receiptTx, setReceiptTx] = useState<FinancialTransaction | null>(null);
  const [showSettlementPrintModal, setShowSettlementPrintModal] = useState<boolean>(false);
  const [txToDelete, setTxToDelete] = useState<FinancialTransaction | null>(null);

  // Parâmetros de Repasse Semanal ao Examinador (IVS)
  const [examinerRepasseSuccess, setExaminerRepasseSuccess] = useState<string | null>(null);


  // Formulário Nova Transação
  const [txType, setTxType] = useState<TransactionType>('income');
  const [txCategory, setTxCategory] = useState<TransactionCategory>('consulta');
  const [txDescription, setTxDescription] = useState<string>('');
  const [txAmount, setTxAmount] = useState<string>(() => effectiveClinicId === 'ivs' ? '50.00' : '150.00');
  const [txDiscount, setTxDiscount] = useState<string>('0.00');
  const [txPaymentMethod, setTxPaymentMethod] = useState<PaymentMethod>('pix');
  const [txPatientName, setTxPatientName] = useState<string>('');

  // Formulário Novo Item PDV
  const [posName, setPosName] = useState<string>('');
  const [posCategory, setPosCategory] = useState<'consulta' | 'exame' | 'produto' | 'servico'>('consulta');
  const [posPrice, setPosPrice] = useState<string>(() => effectiveClinicId === 'ivs' ? '50.00' : '150.00');

  const loadData = (shouldSettleOld = false) => {
    if (shouldSettleOld) {
      offlineDb.settleAllTransactionsUntilDate('2026-10-08', effectiveClinicId);

      // Limpeza de contingência: garante que qualquer despesa de repasse acumulado prévio do examinador
      // pertença ao período encerrado em 2026-10-08 e não conte como saída operacional de hoje (2026-10-09)
      const curTxs = offlineDb.getTransactions(effectiveClinicId);
      let changed = false;
      const sanitized = curTxs.map(t => {
        if (t.type === 'expense' && t.date === '2026-10-09' && (t.category === 'salario' || (t.description && t.description.toLowerCase().includes('repasse')))) {
          changed = true;
          return {
            ...t,
            date: '2026-10-08',
            isSettled: true,
            settledAt: '2026-10-08T18:00:00.000Z'
          };
        }
        return t;
      });

      if (changed) {
        offlineDb.saveTransactions(sanitized, effectiveClinicId);
      }
    }

    setTransactions(offlineDb.getTransactions(effectiveClinicId));
    setPosItems(offlineDb.getPOSItems(effectiveClinicId));
    setSummary(offlineDb.getCashRegisterSummary(undefined, effectiveClinicId));
    setSettlementReport(offlineDb.getProfessionalSettlementReport('Dr. Rudson Meirelles', effectiveClinicId));
    
    // Dados do motor de remuneração
    setRemunerationRecords(offlineDb.getExaminerRemunerations(effectiveClinicId));
    setExaminerClosures(offlineDb.getExaminerClosures(effectiveClinicId));
    setFixedPeriods(offlineDb.getExaminerFixedPeriods(effectiveClinicId));
    setSpecialPeriods(offlineDb.getExaminerSpecialPeriods(effectiveClinicId));
    setAvulsoRules(offlineDb.getExaminerAvulsoRules(effectiveClinicId));

    // Atualiza modalidade do examinador para a data atual
    const currentSession = offlineDb.getWorkSessionForDate(todayStr, 'Dr. Rudson Meirelles', effectiveClinicId);
    setContractType(currentSession.contractType);
  };

  const handleSelectContractType = (type: ProfessionalContractType) => {
    setContractType(type);
    let baseAmount = 50.00;
    let desc = 'Cobrança por Atendimento Realizado - R$ 50,00';
    if (type === 'period_half_day') {
      baseAmount = 500.00;
      desc = 'Atendimento por Período de 5h (Meia Diária) - R$ 500,00';
    } else if (type === 'period_full_day') {
      baseAmount = 1000.00;
      desc = 'Diária Completa de Atendimento - R$ 1.000,00';
    }

    const session: ProfessionalWorkSession = {
      id: `sess_${effectiveClinicId}_${todayStr.replace(/-/g, '')}`,
      clinicId: effectiveClinicId,
      examinerId: 'user-examinador',
      examinerName: 'Dr. Rudson Meirelles',
      date: todayStr,
      contractType: type,
      baseAmount,
      notes: desc,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    offlineDb.saveWorkSession(session, effectiveClinicId);
    loadData(false);
  };

  useEffect(() => {
    // Na inicialização, executa baixa de setembro e carrega dados
    loadData(true);

    // 1. Escuta eventos em tempo real quando ocorrem novos lançamentos
    const handleFinanceEvent = (ev?: any) => {
      if (ev?.detail?.clinicId && ev.detail.clinicId !== effectiveClinicId) return;
      loadData(false);
    };

    window.addEventListener('optomed_finance_updated', handleFinanceEvent);
    window.addEventListener('storage', handleFinanceEvent);

    // 2. Polling suave de fallback (8 segundos) evitando sobrecarga no loop de eventos
    const interval = setInterval(() => {
      loadData(false);
    }, 8000);

    return () => {
      window.removeEventListener('optomed_finance_updated', handleFinanceEvent);
      window.removeEventListener('storage', handleFinanceEvent);
      clearInterval(interval);
    };
  }, [effectiveClinicId]);

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

  // Abertura de Caixa
  const handleOpenRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const balance = parseFloat(openBalanceInput.replace(',', '.')) || 0;
    try {
      offlineDb.openCashRegisterSession(
        currentUser.id,
        currentUser.fullName,
        balance,
        openNotesInput.trim() || undefined,
        effectiveClinicId
      );
      setShowOpenRegisterModal(false);
      setOpenBalanceInput('0.00');
      setOpenNotesInput('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao abrir caixa.');
    }
  };

  // Fechamento de Caixa
  const handleCloseRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.activeSession) return;
    const declared = parseFloat(declaredBalanceInput.replace(',', '.')) || 0;
    try {
      offlineDb.closeCashRegisterSession(
        summary.activeSession.id,
        declared,
        closeNotesInput.trim() || undefined,
        effectiveClinicId
      );
      setShowCloseRegisterModal(false);
      setDeclaredBalanceInput('0.00');
      setCloseNotesInput('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao fechar caixa.');
    }
  };

  // Lançar Nova Transação Manual
  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const rawAmount = parseFloat(txAmount.replace(',', '.')) || 0;
    const discountVal = parseFloat(txDiscount.replace(',', '.')) || 0;
    if (rawAmount < 0) {
      alert('Por favor, informe um valor válido.');
      return;
    }

    const netAmount = Math.max(0, rawAmount - discountVal);
    const today = new Date().toISOString().split('T')[0];
    const newTx: FinancialTransaction = {
      id: generateUUID(),
      clinicId: effectiveClinicId,
      type: txType,
      category: txCategory,
      description: txDescription || `${txType === 'income' ? 'Recebimento' : 'Pagamento'} - ${txCategory}`,
      amount: netAmount,
      currency: activeClinic.currency || 'BRL',
      discount: discountVal > 0 ? discountVal : undefined,
      date: today,
      paymentMethod: txPaymentMethod,
      patientName: txPatientName || undefined,
      receiptNumber: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'completed',
      createdBy: currentUser.fullName,
      createdAt: new Date().toISOString()
    };

    offlineDb.saveTransaction(newTx, effectiveClinicId);
    setShowTransactionModal(false);
    setTxDescription('');
    setTxPatientName('');
    setTxAmount(effectiveClinicId === 'ivs' ? '50.00' : '150.00');
    setTxDiscount('0.00');
    loadData();
  };

  // Venda Rápida pelo PDV (com proteção contra duplo clique)
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const handleQuickPOSSale = (item: POSItem) => {
    if (isProcessingSale) return;
    const patientNamePrompt = prompt(`Cobrar "${item.name}" (${formatCurrencyValue(item.price, activeClinic.currency)})?\nInforme o nome do paciente (opcional):`);
    if (patientNamePrompt === null) return;

    setIsProcessingSale(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const newTx: FinancialTransaction = {
        id: generateUUID(),
        clinicId: effectiveClinicId,
        type: 'income',
        category: item.category === 'produto' ? 'venda_oculos' : 'consulta',
        description: `PDV: ${item.name}`,
        amount: item.price,
        currency: activeClinic.currency || 'BRL',
        date: today,
        paymentMethod: item.price === 0 ? 'cash' : 'pix',
        patientName: patientNamePrompt.trim() || undefined,
        receiptNumber: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'completed',
        createdBy: currentUser.fullName,
        createdAt: new Date().toISOString()
      };

      offlineDb.saveTransaction(newTx, effectiveClinicId);
      loadData();
      setReceiptTx(newTx);
    } finally {
      setTimeout(() => setIsProcessingSale(false), 500);
    }
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
      clinicId: effectiveClinicId,
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

    offlineDb.saveTransaction(newTx, effectiveClinicId);
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
    offlineDb.savePOSItem(newItem, effectiveClinicId);
    setShowPOSItemModal(false);
    setPosName('');
    setPosPrice(effectiveClinicId === 'ivs' ? '50.00' : '150.00');
    loadData();
  };

  // Excluir Lançamento (Apenas perfis administrativos ou financeiro autorizados)
  const handleDeleteTx = (id: string) => {
    if (currentUser.role === 'reception') {
      alert('Acesso restrito: operadores de recepção não possuem permissão para excluir lançamentos. Solicite ao administrador ou responsável financeiro.');
      return;
    }
    const tx = transactions.find(t => t.id === id);
    if (tx) {
      setTxToDelete(tx);
    } else {
      offlineDb.deleteTransaction(id, effectiveClinicId);
      loadData();
    }
  };

  const handleConfirmDeleteTx = () => {
    if (!txToDelete) return;
    offlineDb.deleteTransaction(txToDelete.id, effectiveClinicId);
    setTxToDelete(null);
    loadData();
  };

  // Dar Baixa / Liquidar Lançamento (ou reabrir)
  const handleToggleSettle = (id: string, currentSettled?: boolean) => {
    const nextSettled = !currentSettled;
    offlineDb.settleTransaction(id, nextSettled, effectiveClinicId);
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

        <div className="flex flex-wrap items-center gap-2.5">
          {summary.activeSession ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Caixa Aberto: {summary.activeSession.operatorName} (Início: {formatCurrencyValue(summary.activeSession.openingBalance, activeClinic.currency)})
              </span>
              <button
                onClick={() => setShowCloseRegisterModal(true)}
                className="px-3.5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" /> Fechar Caixa
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowOpenRegisterModal(true)}
              className="px-4 py-2.5 bg-blue-700 hover:bg-blue-600 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-blue-700/25 active:scale-95 transition-all cursor-pointer"
            >
              <Wallet className="w-4 h-4" /> Abrir Caixa do Dia
            </button>
          )}

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

      {/* 1.1 CARD DE AÇÃO IMEDIATA: "O QUE PRECISO FAZER AGORA?" (FINANCEIRO & CAIXA) */}
      {!summary.activeSession ? (
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-white p-5 rounded-3xl shadow-lg border border-amber-500/40 flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase tracking-wider">
                  O QUE PRECISO FAZER AGORA?
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-xs font-bold">
                  CAIXA FECHADO
                </span>
              </div>
              <h3 className="text-xl font-black tracking-tight text-white mt-0.5">
                Iniciar o Turno de Caixa
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Abra a sessão de caixa com o fundo de troco inicial para registrar recebimentos de consultas, exames e produtos.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end shrink-0">
            <button
              type="button"
              onClick={() => setShowOpenRegisterModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 rounded-2xl text-xs font-black flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Wallet className="w-4 h-4 text-slate-950" />
              <span>Abrir Caixa do Dia Agora</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white p-5 rounded-3xl shadow-lg border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <Receipt className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider">
                  CAIXA ATIVO EM OPERAÇÃO
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-mono text-xs font-bold">
                  Operador: {summary.activeSession.operatorName}
                </span>
              </div>
              <h3 className="text-xl font-black tracking-tight text-white mt-0.5">
                Pronto para Recebimentos e Vendas
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Sessão aberta às {new Date(summary.activeSession.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Registre pagamentos de consultas ou itens do balcão em 1 clique.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end shrink-0">
            <button
              type="button"
              onClick={() => {
                setTxType('income');
                setShowTransactionModal(true);
              }}
              className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Receber Pagamento</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCloseRegisterModal(true)}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Fechar</span>
            </button>
          </div>
        </div>
      )}

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
            <span className={`text-2xl font-black mt-0.5 block ${
              settlementReport.settlementStatus === 'settled' || settlementReport.totalPayableAmount <= 0
                ? 'text-emerald-600'
                : 'text-amber-600'
            }`}>
              {settlementReport.settlementStatus === 'settled' || settlementReport.totalPayableAmount <= 0
                ? 'R$ 0,00 (Quitado)'
                : `R$ ${settlementReport.totalPayableAmount.toFixed(2)}`}
            </span>
          </div>
          <div className={`p-3 rounded-xl ${
            settlementReport.settlementStatus === 'settled' || settlementReport.totalPayableAmount <= 0
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-amber-50 text-amber-600'
          }`}>
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
            <span>Informe & Espelho (Dr. Meirelles)</span>
          </button>

          <button
            onClick={() => setActiveTab('examiner_remuneration')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'examiner_remuneration' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'
            }`}
          >
            <Briefcase className="w-4 h-4 text-blue-200" />
            <span>Remuneração dos Examinadores</span>
          </button>

          <button
            onClick={() => setActiveTab('examiner_periods')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'examiner_periods' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'
            }`}
          >
            <CalendarCheck className="w-4 h-4 text-indigo-200" />
            <span>Períodos de Atendimento</span>
          </button>

          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'pos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'
            }`}
          >
            <ShoppingCart className="w-4 h-4 text-blue-600" />
            <span>PDV</span>
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
              <div className="flex items-center gap-2">
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
              </div>
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

                          {currentUser.role !== 'reception' && (
                            <button
                              onClick={() => handleDeleteTx(tx.id)}
                              title="Remover (Restrito a Administrador / Financeiro)"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
                onClick={() => handleSelectContractType('period_half_day')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  contractType === 'period_half_day'
                    ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-500/20'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-black tracking-wider text-amber-400">
                    {initialWorkSession.contractType === 'period_half_day' ? 'Padrão Automático de Hoje' : 'Meia Diária / Turno'}
                  </span>
                  {contractType === 'period_half_day' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <h3 className="text-base font-black text-white">Por Período (5h) / Meia Diária</h3>
                <p className="text-xs text-indigo-200 mt-1">Terça (13h-18h) ou Quarta (08h-13h) fixo R$ 500,00 ou turno pontual.</p>
                <div className="mt-3 text-xl font-black text-amber-300">R$ 500,00 <span className="text-xs font-normal text-indigo-200">/ período (5h)</span></div>
              </div>

              <div 
                onClick={() => handleSelectContractType('period_full_day')}
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
                onClick={() => handleSelectContractType('per_consultation')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  contractType === 'per_consultation'
                    ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400">
                    {initialWorkSession.contractType === 'per_consultation' ? 'Padrão Automático de Hoje' : 'Por Produção'}
                  </span>
                  {contractType === 'per_consultation' && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <h3 className="text-base font-black text-white">Por Atendimento Realizado</h3>
                <p className="text-xs text-indigo-200 mt-1">Valor fixo por consulta realizada (demais dias da semana).</p>
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
                  <p className="text-xs text-slate-500 mt-0.5">Período: {settlementReport.periodDescription} • IVS Instituto da Visão e Saúde</p>
                </div>
                <span className={`px-3 py-1 rounded-xl text-xs font-black border ${
                  settlementReport.settlementStatus === 'settled' || settlementReport.totalPayableAmount <= 0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {settlementReport.settlementStatus === 'settled' || settlementReport.totalPayableAmount <= 0
                    ? 'Total: R$ 0,00 (Quitado)'
                    : `Total: R$ ${settlementReport.totalPayableAmount.toFixed(2)}`}
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
                    
                    {/* Linha 1: Saldo Pendente da Semana Passada (apenas se houver saldo pendente) */}
                    {settlementReport.previousBalancePending > 0 && (
                      <tr className="bg-amber-50/50 hover:bg-amber-50 transition-colors">
                        <td className="p-3.5 font-bold text-amber-900">Semana Anterior</td>
                        <td className="p-3.5 font-bold text-amber-900">
                          Diferença pendente de pagamento da semana passada a ser pago
                        </td>
                        <td className="p-3.5 text-center font-mono">1</td>
                        <td className="p-3.5 text-right font-mono">R$ {settlementReport.previousBalancePending.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-black text-amber-700 font-mono text-sm">
                          R$ {settlementReport.previousBalancePending.toFixed(2)}
                        </td>
                      </tr>
                    )}

                    {/* Linhas dos atendimentos do período */}
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
                        SOMATÓRIA GERAL A REPASSAR {settlementReport.previousBalancePending > 0 ? '(COM SALDO ANTERIOR)' : ''}
                      </td>
                      <td className="p-4 text-center text-amber-400 font-mono">
                        {settlementReport.totalConsultationsCount} cons.
                      </td>
                      <td className="p-4 text-right text-slate-400 font-normal">
                        Total Líquido:
                      </td>
                      <td className="p-4 text-right text-emerald-400 text-base font-mono">
                        {settlementReport.settlementStatus === 'settled' || settlementReport.totalPayableAmount <= 0
                          ? 'R$ 0,00 (Quitado)'
                          : `R$ ${settlementReport.totalPayableAmount.toFixed(2)}`}
                      </td>
                    </tr>
                  </tfoot>

                </table>
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

                  {settlementReport.previousBalancePending > 0 && (
                    <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/60 flex items-center justify-between">
                      <span className="text-amber-900 font-bold">Saldo Anterior Pendente:</span>
                      <span className="font-black text-amber-700">
                        R$ {settlementReport.previousBalancePending.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="p-4 bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl shadow-sm space-y-1">
                    <span className="text-[10px] uppercase font-black text-amber-400 tracking-wider block">
                      {settlementReport.settlementStatus === 'settled' || settlementReport.totalPayableAmount <= 0
                        ? 'Status do Repasse'
                        : 'Valor Final a Pagar ao Examinador'}
                    </span>
                    <div className="text-2xl font-black text-emerald-400">
                      {settlementReport.settlementStatus === 'settled' || settlementReport.totalPayableAmount <= 0
                        ? 'R$ 0,00 (Quitado)'
                        : `R$ ${settlementReport.totalPayableAmount.toFixed(2)}`}
                    </div>
                    <span className="text-[10px] text-slate-300 block">
                      Dr. Rudson Meirelles • IVS
                    </span>
                  </div>

                </div>
              </div>

              <div className="space-y-2.5 pt-4">
                {settlementReport.settlementStatus === 'settled' || settlementReport.totalPayableAmount <= 0 ? (
                  <div className="w-full py-3.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-2xl font-black text-xs flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Repasse Quitado e Liquidado</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleExecuteRepasse('Dr. Rudson Meirelles', settlementReport.totalPayableAmount)}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Efetivar Pagamento (Lançar Saída de Caixa)</span>
                  </button>
                )}

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

      {/* ABA 4: MOTOR DE REMUNERAÇÃO DOS EXAMINADORES */}
      {activeTab === 'examiner_remuneration' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header & Ações */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-black text-slate-900">Remuneração dos Examinadores (Motor Financeiro)</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Apuração automática por períodos fixos, extraordinários e consultas avulsas com rastreabilidade completa.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {currentUser.role !== 'reception' && (
                <button
                  type="button"
                  onClick={() => {
                    const res = examinerRemunerationService.closeExaminerPeriod(
                      effectiveClinicId,
                      filterExaminer !== 'all' ? filterExaminer : 'user-examinador',
                      'Dr. Rudson Meirelles',
                      filterDateStart,
                      filterDateEnd,
                      currentUser.fullName
                    );
                    if (res.success) {
                      setRemunerationFeedback(res.message);
                      loadData();
                    } else {
                      alert(res.message);
                    }
                  }}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all active:scale-95"
                >
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Fechar Período Selecionado</span>
                </button>
              )}
            </div>
          </div>

          {remunerationFeedback && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center justify-between text-xs animate-fadeIn">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{remunerationFeedback}</span>
              </div>
              <button onClick={() => setRemunerationFeedback(null)} className="text-emerald-700 hover:text-emerald-900 font-black cursor-pointer">
                ✕
              </button>
            </div>
          )}

          {/* Cards de Resumo */}
          {(() => {
            const filtered = remunerationRecords.filter(r => {
              if (filterExaminer !== 'all' && r.examinerId !== filterExaminer) return false;
              if (filterPeriodKind !== 'all' && r.periodKind !== filterPeriodKind) return false;
              if (filterRemStatus !== 'all' && r.status !== filterRemStatus) return false;
              if (r.date < filterDateStart || r.date > filterDateEnd) return false;
              return true;
            });

            const totalFixed = filtered.filter(r => r.periodKind === 'fixed').reduce((acc, r) => acc + r.finalAmount, 0);
            const totalAvulso = filtered.filter(r => r.periodKind === 'avulso').reduce((acc, r) => acc + r.finalAmount, 0);
            const totalSpecial = filtered.filter(r => r.periodKind === 'extraordinary').reduce((acc, r) => acc + r.finalAmount, 0);
            const totalPending = filtered.filter(r => r.status === 'pending' || r.status === 'approved' || r.status === 'adjusted').reduce((acc, r) => acc + r.finalAmount, 0);
            const totalPaid = filtered.filter(r => r.status === 'paid').reduce((acc, r) => acc + r.finalAmount, 0);
            const totalGross = filtered.reduce((acc, r) => acc + r.finalAmount, 0);

            return (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Períodos Fixos</span>
                    <span className="text-lg font-black text-blue-600 font-mono mt-1 block">R$ {totalFixed.toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Avulsos</span>
                    <span className="text-lg font-black text-indigo-600 font-mono mt-1 block">R$ {totalAvulso.toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Extraordinários</span>
                    <span className="text-lg font-black text-purple-600 font-mono mt-1 block">R$ {totalSpecial.toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-amber-600 uppercase block">Total Pendente</span>
                    <span className="text-lg font-black text-amber-600 font-mono mt-1 block">R$ {totalPending.toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase block">Total Pago</span>
                    <span className="text-lg font-black text-emerald-600 font-mono mt-1 block">R$ {totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white p-4 rounded-2xl shadow-sm border border-slate-800">
                    <span className="text-[10px] font-black text-amber-400 uppercase block">Total Bruto Devido</span>
                    <span className="text-lg font-black text-white font-mono mt-1 block">R$ {totalGross.toFixed(2)}</span>
                  </div>
                </div>

                {/* Filtros */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-700">Filtros:</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">De:</span>
                    <input
                      type="date"
                      value={filterDateStart}
                      onChange={(e) => setFilterDateStart(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 font-mono text-slate-800 text-xs"
                    />
                    <span className="text-slate-500 font-medium">Até:</span>
                    <input
                      type="date"
                      value={filterDateEnd}
                      onChange={(e) => setFilterDateEnd(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 font-mono text-slate-800 text-xs"
                    />
                  </div>

                  <select
                    value={filterPeriodKind}
                    onChange={(e) => setFilterPeriodKind(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 font-bold text-slate-700 text-xs cursor-pointer"
                  >
                    <option value="all">Todos os Tipos</option>
                    <option value="fixed">Período Fixo</option>
                    <option value="extraordinary">Período Extraordinário</option>
                    <option value="avulso">Atendimento Avulso</option>
                  </select>

                  <select
                    value={filterRemStatus}
                    onChange={(e) => setFilterRemStatus(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 font-bold text-slate-700 text-xs cursor-pointer"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="pending">Pendente</option>
                    <option value="approved">Aprovado</option>
                    <option value="closed">Fechado</option>
                    <option value="paid">Pago</option>
                    <option value="adjusted">Ajustado</option>
                  </select>

                  <span className="text-slate-400 font-mono ml-auto">
                    {filtered.length} lançamentos encontrados
                  </span>
                </div>

                {/* Tabela de Lançamentos */}
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Data / Hora</th>
                          <th className="p-3.5">Examinador</th>
                          <th className="p-3.5">Paciente / Consulta</th>
                          <th className="p-3.5">Tipo de Regra</th>
                          <th className="p-3.5">Descrição da Regra</th>
                          <th className="p-3.5 text-right">Valor Calculado</th>
                          <th className="p-3.5 text-center">Status</th>
                          <th className="p-3.5 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filtered.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                              Nenhuma remuneração registrada para os filtros selecionados.
                            </td>
                          </tr>
                        ) : (
                          filtered.map((rem) => (
                            <tr key={rem.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-3.5 font-mono font-bold text-slate-900">
                                {rem.date.split('-').reverse().join('/')} às {rem.time}
                              </td>
                              <td className="p-3.5 font-bold text-slate-800">
                                {rem.examinerName}
                              </td>
                              <td className="p-3.5">
                                <span className="font-bold text-slate-900 block">{rem.patientName}</span>
                                <span className="text-[10px] text-slate-400 block font-mono">ID: {rem.appointmentId}</span>
                              </td>
                              <td className="p-3.5">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  rem.periodKind === 'extraordinary'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : rem.periodKind === 'fixed'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                }`}>
                                  {rem.periodKind === 'extraordinary' ? 'Extraordinário' : rem.periodKind === 'fixed' ? 'Fixo' : 'Avulso'}
                                </span>
                              </td>
                              <td className="p-3.5 text-slate-600 max-w-xs truncate" title={rem.ruleDescription}>
                                {rem.ruleDescription}
                              </td>
                              <td className="p-3.5 text-right font-black font-mono text-slate-900 text-sm">
                                R$ {rem.finalAmount.toFixed(2)}
                              </td>
                              <td className="p-3.5 text-center">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  rem.status === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : rem.status === 'closed'
                                    ? 'bg-slate-200 text-slate-800'
                                    : rem.status === 'adjusted'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-50 text-blue-800'
                                }`}>
                                  {rem.status}
                                </span>
                              </td>
                              <td className="p-3.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => setSelectedRemRecord(rem)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                                >
                                  Ver Detalhes
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Lista de Fechamentos Históricos */}
                {examinerClosures.length > 0 && (
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4 shadow-xs">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-slate-700" />
                      <h3 className="font-black text-slate-900 text-sm">Histórico de Fechamentos do Examinador</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {examinerClosures.map(cl => (
                        <div key={cl.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{cl.examinerName}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${cl.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {cl.status === 'paid' ? 'QUITADO' : 'FECHADO'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Período: {cl.startDate.split('-').reverse().join('/')} a {cl.endDate.split('-').reverse().join('/')}
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 font-mono">
                            <span className="text-slate-500">Valor Bruto:</span>
                            <span className="font-black text-slate-900 text-sm">R$ {cl.totalGrossAmount.toFixed(2)}</span>
                          </div>
                          {cl.status !== 'paid' && currentUser.role !== 'reception' && (
                            <button
                              type="button"
                              onClick={() => {
                                const res = examinerRemunerationService.settleClosurePayment(cl.id, currentUser.fullName, 'pix', effectiveClinicId);
                                if (res.success) {
                                  setRemunerationFeedback(res.message);
                                  loadData();
                                }
                              }}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[11px] cursor-pointer mt-2 shadow-xs transition-all active:scale-95"
                            >
                              Liquidar Pagamento no Caixa (PIX)
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ABA 5: PERÍODOS DE ATENDIMENTO (FIXOS & EXTRAORDINÁRIOS) */}
      {activeTab === 'examiner_periods' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-black text-slate-900">Configuração de Períodos de Atendimento</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Cadastre os turnos fixos semanais do examinador e datas extraordinárias (mutirões, campanhas e feriados).
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowFixedPeriodModal(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Período Fixo</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSpecialPeriodModal(true)}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Período Extraordinário</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bloco 1: Períodos Fixos Recorrentes */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <h3 className="font-black text-slate-900 text-sm">Períodos Fixos Recorrentes (Semanal)</h3>
                </div>
                <span className="text-xs text-slate-500 font-mono">{fixedPeriods.length} cadastrados</span>
              </div>

              <div className="space-y-3">
                {fixedPeriods.map((p) => {
                  const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                  return (
                    <div key={p.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{dayNames[p.dayOfWeek]}</span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                          {p.active ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </div>
                      <div className="text-slate-600 flex items-center gap-2 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Horário: <b>{p.startTime} às {p.endTime}</b></span>
                      </div>
                      <div className="text-slate-600 font-medium">
                        Regra: <b className="text-blue-700">R$ {(p.fixedAmount || 0).toFixed(2)}</b> ({p.notes || 'Contrato Fixo'})
                      </div>
                      <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                        <span>Vigência: {p.validFrom} {p.validUntil ? `a ${p.validUntil}` : '(indeterminada)'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Deseja remover este período fixo?')) {
                              offlineDb.deleteExaminerFixedPeriod(p.id, effectiveClinicId);
                              loadData();
                            }
                          }}
                          className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bloco 2: Períodos Extraordinários / Excepcionais */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <h3 className="font-black text-slate-900 text-sm">Períodos Extraordinários / Especiais</h3>
                </div>
                <span className="text-xs text-slate-500 font-mono">{specialPeriods.length} cadastrados</span>
              </div>

              <div className="space-y-3">
                {specialPeriods.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 font-bold text-xs">
                    Nenhum período extraordinário cadastrado no momento.
                  </p>
                ) : (
                  specialPeriods.map((p) => (
                    <div key={p.id} className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-950 text-sm font-mono">
                          📅 {p.date.split('-').reverse().join('/')}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${p.status === 'active' ? 'bg-purple-200 text-purple-900' : 'bg-slate-200 text-slate-700'}`}>
                          {p.status === 'active' ? 'VIGENTE' : 'CANCELADO'}
                        </span>
                      </div>
                      <div className="text-purple-900 flex items-center gap-2 font-medium">
                        <Clock className="w-3.5 h-3.5 text-purple-500" />
                        <span>Horário: <b>{p.startTime} às {p.endTime}</b></span>
                      </div>
                      <div className="text-purple-900 font-medium">
                        Motivo: <b>{p.notes || 'Atendimento Extraordinário'}</b> • Remuneração: <b className="text-emerald-700">R$ {(p.fixedAmount || 0).toFixed(2)}</b>
                      </div>
                      <div className="text-[11px] text-purple-600 pt-1 border-t border-purple-200/70 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Deseja cancelar este período extraordinário?')) {
                              offlineDb.deleteExaminerSpecialPeriod(p.id, effectiveClinicId);
                              loadData();
                            }
                          }}
                          className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))
                )}
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
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Valor Bruto ({activeClinic.currency || 'R$'}) *</label>
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
                  <label className="text-slate-700 font-bold block mb-1">Desconto ({activeClinic.currency || 'R$'})</label>
                  <input
                    type="text"
                    value={txDiscount}
                    onChange={(e) => setTxDiscount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-black text-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
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
                    <option value="transfer">Transferência Bancária</option>
                    <option value="outro">Outro</option>
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

      {/* MODAL: ABERTURA DE CAIXA */}
      {showOpenRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                  <Wallet className="w-4 h-4" />
                </div>
                <span>Abertura de Caixa Diário</span>
              </h3>
              <button onClick={() => setShowOpenRegisterModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleOpenRegister} className="space-y-3.5 text-xs">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-blue-900">
                <span className="font-bold block">Operador Responsável:</span>
                <span className="text-xs">{currentUser.fullName} ({activeClinic.name})</span>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Fundo de Troco / Saldo Inicial ({activeClinic.currency || 'R$'}) *</label>
                <input
                  type="text"
                  required
                  value={openBalanceInput}
                  onChange={(e) => setOpenBalanceInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-black text-lg focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Valor em dinheiro presente na gaveta no início do turno.</span>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Observações de Abertura (Opcional)</label>
                <input
                  type="text"
                  value={openNotesInput}
                  onChange={(e) => setOpenNotesInput(e.target.value)}
                  placeholder="Ex: Troco em notas de 5 e 10"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOpenRegisterModal(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Confirmar Abertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FECHAMENTO DE CAIXA */}
      {showCloseRegisterModal && summary.activeSession && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                  <Lock className="w-4 h-4" />
                </div>
                <span>Fechamento e Conferência de Caixa</span>
              </h3>
              <button onClick={() => setShowCloseRegisterModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCloseRegister} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Saldo Inicial:</span>
                  <span className="font-bold text-slate-800">{formatCurrencyValue(summary.activeSession.openingBalance, activeClinic.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Entradas:</span>
                  <span className="font-bold text-emerald-600">+{formatCurrencyValue(summary.totalIncome, activeClinic.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Saídas:</span>
                  <span className="font-bold text-rose-600">-{formatCurrencyValue(summary.totalExpense, activeClinic.currency)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-black">
                  <span className="text-slate-900">Saldo Esperado em Caixa:</span>
                  <span className="text-blue-700">{formatCurrencyValue(summary.currentBalance, activeClinic.currency)}</span>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Saldo Contado / Declarado em Gaveta ({activeClinic.currency || 'R$'}) *</label>
                <input
                  type="text"
                  required
                  value={declaredBalanceInput}
                  onChange={(e) => setDeclaredBalanceInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-black text-lg focus:outline-none focus:border-blue-500"
                />
                {declaredBalanceInput && (
                  <div className="mt-1 text-xs">
                    {(() => {
                      const decl = parseFloat(declaredBalanceInput.replace(',', '.')) || 0;
                      const diff = decl - summary.currentBalance;
                      if (Math.abs(diff) < 0.001) {
                        return <span className="text-emerald-600 font-bold">✓ Caixa balanceado sem divergências</span>;
                      }
                      if (diff > 0) {
                        return <span className="text-emerald-700 font-bold">Sobra de caixa: +{formatCurrencyValue(diff, activeClinic.currency)}</span>;
                      }
                      return <span className="text-rose-600 font-bold">Falta de caixa: -{formatCurrencyValue(Math.abs(diff), activeClinic.currency)}</span>;
                    })()}
                  </div>
                )}
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Observações do Fechamento</label>
                <input
                  type="text"
                  value={closeNotesInput}
                  onChange={(e) => setCloseNotesInput(e.target.value)}
                  placeholder="Ex: Turno encerrado com comprovantes anexados"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCloseRegisterModal(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Confirmar Fechamento
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
          <div id="financial-receipt-sheet" className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            
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
                onClick={() => {
                  const printEl = document.getElementById('financial-receipt-sheet');
                  if (printEl) {
                    printIsolatedElement(printEl, {
                      title: `Recibo_${receiptTx.receiptNumber}`,
                      orientation: 'thermal',
                      margins: '4mm 4mm'
                    });
                  } else {
                    window.print();
                  }
                }}
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
          <div id="settlement-report-sheet" className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
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
                  <span className="text-slate-900 font-bold text-sm block mt-0.5">{settlementReport.periodDescription}</span>
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
                    {settlementReport.previousBalancePending > 0 && (
                      <tr className="bg-amber-50/70">
                        <td className="p-3 font-bold text-amber-900">Semana Anterior</td>
                        <td className="p-3 text-amber-900">Diferença pendente semana passada a ser pago</td>
                        <td className="p-3 text-center font-mono">1</td>
                        <td className="p-3 text-right font-mono">R$ {settlementReport.previousBalancePending.toFixed(2)}</td>
                        <td className="p-3 text-right font-black text-amber-800 font-mono">R$ {settlementReport.previousBalancePending.toFixed(2)}</td>
                      </tr>
                    )}
                    {settlementReport.dailyEntries.map((entry, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-bold text-slate-900">{entry.dayLabel || entry.date}</td>
                        <td className="p-3 text-slate-700">{entry.description}</td>
                        <td className="p-3 text-center font-mono">{entry.quantity}</td>
                        <td className="p-3 text-right font-mono">R$ {entry.unitPrice.toFixed(2)}</td>
                        <td className="p-3 text-right font-black text-slate-900 font-mono">R$ {entry.totalAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-black text-sm">
                    <tr>
                      <td colSpan={3} className="p-3.5 uppercase text-xs">
                        {settlementReport.settlementStatus === 'settled' || settlementReport.totalPayableAmount <= 0
                          ? 'SITUAÇÃO DO REPASSE:'
                          : 'TOTAL GERAL A REPASSAR:'}
                      </td>
                      <td colSpan={2} className="p-3.5 text-right text-emerald-400 text-base font-mono">
                        {settlementReport.settlementStatus === 'settled' || settlementReport.totalPayableAmount <= 0
                          ? 'R$ 1.900,00 (QUITADO)'
                          : `R$ ${settlementReport.totalPayableAmount.toFixed(2)}`}
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
                onClick={() => {
                  const printEl = document.getElementById('settlement-report-sheet');
                  if (printEl) {
                    printIsolatedElement(printEl, {
                      title: `Demonstrativo_Repasse_${activeClinic.name}`,
                      orientation: 'portrait',
                      margins: '8mm 8mm'
                    });
                  } else {
                    window.print();
                  }
                }}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Espelho de Repasse (A4 / Cupom)</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FASE 29: Modal de Confirmação Acessível para Exclusão de Lançamento */}
      {txToDelete && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-tx-title"
          aria-describedby="delete-tx-desc"
        >
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-red-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-50 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 id="delete-tx-title" className="font-black text-sm text-slate-900 uppercase tracking-tight">
                  Confirmar Exclusão de Lançamento
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  Ação auditável e irreversível
                </span>
              </div>
            </div>

            <p id="delete-tx-desc" className="text-xs text-slate-600 leading-relaxed">
              Deseja realmente remover o lançamento <strong>"{txToDelete.description}"</strong> de <strong>{formatCurrencyValue(txToDelete.amount, txToDelete.currency || activeClinic.currency)}</strong>? Esta transação será removida do fluxo de caixa e gerará registro de auditoria.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                autoFocus
                onClick={() => setTxToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Cancelar (Não excluir)
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTx}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md shadow-red-600/25 transition-colors"
              >
                Sim, Excluir Lançamento
              </button>
            </div>
          </div>
        </div>
      )}


      {/* MODAL 1: DETALHAMENTO TRANSPARENTE DA REGRA & AUDITORIA */}
      {selectedRemRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 text-slate-900 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Origem e Composição do Cálculo</h3>
                  <span className="text-[11px] text-slate-500">Por que esse atendimento gerou esse valor?</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRemRecord(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Examinador:</span>
                  <span className="font-bold text-slate-900">{selectedRemRecord.examinerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paciente:</span>
                  <span className="font-bold text-slate-900">{selectedRemRecord.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data e Horário:</span>
                  <span className="font-bold font-mono text-slate-900">{selectedRemRecord.date.split('-').reverse().join('/')} às {selectedRemRecord.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tipo de Consulta:</span>
                  <span className="font-bold text-slate-900">{selectedRemRecord.appointmentType}</span>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-blue-900 font-bold uppercase text-[10px] tracking-wider">Regra Aplicada</span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-black text-[10px] uppercase">
                    {selectedRemRecord.periodKind}
                  </span>
                </div>
                <p className="text-xs text-blue-950 font-medium leading-relaxed">
                  {selectedRemRecord.calculationBasis}
                </p>
                <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between">
                  <span className="font-bold text-blue-900">Remuneração Devida:</span>
                  <span className="text-lg font-black font-mono text-emerald-600">
                    R$ {selectedRemRecord.finalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Snapshot congelado */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-700 block">Snapshot Congelado da Regra:</span>
                <p>• ID Regra: {selectedRemRecord.ruleSnapshot?.ruleId}</p>
                <p>• Modalidade: {selectedRemRecord.ruleSnapshot?.remunerationType}</p>
                <p>• Congelado em: {new Date(selectedRemRecord.ruleSnapshot?.snapshotAt).toLocaleString('pt-BR')}</p>
                <p className="text-slate-400 italic">Garante que alterações futuras de valor não modifiquem este lançamento retroativamente.</p>
              </div>

              {/* Trilha de Auditoria */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 block">Histórico de Auditoria:</span>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {selectedRemRecord.auditTrail.map((log, idx) => (
                    <div key={idx} className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] space-y-0.5">
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>{log.action} por {log.author}</span>
                        <span className="text-slate-400 font-mono">{new Date(log.timestamp).toLocaleTimeString('pt-BR')}</span>
                      </div>
                      {log.reason && <p className="text-slate-500">{log.reason}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {currentUser.role !== 'reception' && (
                <button
                  type="button"
                  onClick={() => {
                    setAdjustAmountInput(selectedRemRecord.finalAmount.toFixed(2));
                    setAdjustReasonInput('');
                    setShowAdjustModal(true);
                  }}
                  className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Ajuste Retroativo com Justificativa
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedRemRecord(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer ml-auto"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: AJUSTE RETROATIVO COM JUSTIFICATIVA OBRIGATÓRIA */}
      {showAdjustModal && selectedRemRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-slate-900 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-sm">Ajuste Retroativo de Remuneração</h3>
              <button type="button" onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
              Ajustes em períodos fechados são restritos e auditados com registro permanente de autor, data, valor anterior e justificativa.
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const amt = parseFloat(adjustAmountInput.replace(',', '.')) || 0;
                const res = examinerRemunerationService.adjustRemuneration(
                  selectedRemRecord.id,
                  amt,
                  adjustReasonInput.trim(),
                  currentUser.fullName,
                  effectiveClinicId
                );
                if (res.success) {
                  setShowAdjustModal(false);
                  setSelectedRemRecord(res.record || null);
                  loadData();
                } else {
                  alert(res.message);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="font-bold text-slate-700 block mb-1">NOVO VALOR (R$)</label>
                <input
                  type="text"
                  required
                  value={adjustAmountInput}
                  onChange={(e) => setAdjustAmountInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">MOTIVO / JUSTIFICATIVA OBRIGATÓRIA *</label>
                <textarea
                  required
                  rows={3}
                  value={adjustReasonInput}
                  onChange={(e) => setAdjustReasonInput(e.target.value)}
                  placeholder="Ex: Correção de turno extraordinário autorizada pela diretoria..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Confirmar e Auditar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: NOVO PERÍODO FIXO */}
      {showFixedPeriodModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-slate-900 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-sm">Cadastrar Período Fixo Recorrente</h3>
              <button type="button" onClick={() => setShowFixedPeriodModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const amt = parseFloat(fixedAmount.replace(',', '.')) || 0;
                const newFixed: ExaminerFixedPeriod = {
                  id: `efp_${effectiveClinicId}_${Date.now()}`,
                  clinicId: effectiveClinicId,
                  examinerId: 'user-examinador',
                  examinerName: 'Dr. Rudson Meirelles',
                  dayOfWeek: fixedDayOfWeek,
                  startTime: fixedStartTime,
                  endTime: fixedEndTime,
                  validFrom: '2026-10-01',
                  remunerationType: 'fixed_period',
                  fixedAmount: amt,
                  active: true,
                  notes: fixedNotes,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  createdBy: currentUser.fullName
                };
                offlineDb.saveExaminerFixedPeriod(newFixed, effectiveClinicId);
                setShowFixedPeriodModal(false);
                loadData();
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="font-bold text-slate-700 block mb-1">DIA DA SEMANA</label>
                <select
                  value={fixedDayOfWeek}
                  onChange={(e) => setFixedDayOfWeek(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 cursor-pointer"
                >
                  <option value={1}>Segunda-feira</option>
                  <option value={2}>Terça-feira</option>
                  <option value={3}>Quarta-feira</option>
                  <option value={4}>Quinta-feira</option>
                  <option value={5}>Sexta-feira</option>
                  <option value={6}>Sábado</option>
                  <option value={0}>Domingo</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">HORÁRIO INICIAL</label>
                  <input
                    type="time"
                    required
                    value={fixedStartTime}
                    onChange={(e) => setFixedStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">HORÁRIO FINAL</label>
                  <input
                    type="time"
                    required
                    value={fixedEndTime}
                    onChange={(e) => setFixedEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">VALOR POR PERÍODO (R$)</label>
                <input
                  type="text"
                  required
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">DESCRIÇÃO / OBSERVAÇÃO</label>
                <input
                  type="text"
                  value={fixedNotes}
                  onChange={(e) => setFixedNotes(e.target.value)}
                  placeholder="Ex: Turno Meia Diária de 5h"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFixedPeriodModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Salvar Período Fixo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: NOVO PERÍODO EXTRAORDINÁRIO */}
      {showSpecialPeriodModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-slate-900 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-sm">Cadastrar Período Extraordinário</h3>
              <button type="button" onClick={() => setShowSpecialPeriodModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const amt = parseFloat(specialAmount.replace(',', '.')) || 0;
                const newSpecial: ExaminerSpecialPeriod = {
                  id: `esp_${effectiveClinicId}_${Date.now()}`,
                  clinicId: effectiveClinicId,
                  examinerId: 'user-examinador',
                  examinerName: 'Dr. Rudson Meirelles',
                  date: specialDate,
                  startTime: specialStartTime,
                  endTime: specialEndTime,
                  remunerationType: 'fixed_period',
                  fixedAmount: amt,
                  status: 'active',
                  notes: specialNotes,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  createdBy: currentUser.fullName
                };
                offlineDb.saveExaminerSpecialPeriod(newSpecial, effectiveClinicId);
                setShowSpecialPeriodModal(false);
                loadData();
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="font-bold text-slate-700 block mb-1">DATA ESPECÍFICA</label>
                <input
                  type="date"
                  required
                  value={specialDate}
                  onChange={(e) => setSpecialDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">HORÁRIO INICIAL</label>
                  <input
                    type="time"
                    required
                    value={specialStartTime}
                    onChange={(e) => setSpecialStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">HORÁRIO FINAL</label>
                  <input
                    type="time"
                    required
                    value={specialEndTime}
                    onChange={(e) => setSpecialEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">VALOR DO PERÍODO EXTRAORDINÁRIO (R$)</label>
                <input
                  type="text"
                  required
                  value={specialAmount}
                  onChange={(e) => setSpecialAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">MOTIVO / DESCRIÇÃO</label>
                <input
                  type="text"
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="Ex: Mutirão Especial, Campanha de Saúde Visual, Feriado"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSpecialPeriodModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Salvar Período Extraordinário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
