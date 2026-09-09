import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  QrCode, 
  Search, 
  Sparkles,
  Calendar,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Edit3,
  FileText,
  UserCheck,
  Award,
  Lock,
  Key,
  Trash2,
  Check,
  UserPlus
} from 'lucide-react';
import { ClinicConfig, BillingInvoice, SubscriptionPlan, SubscriptionStatus, UserAccount, UserRole } from '@optotipo/shared';
import { offlineDb } from '../services/offlineDb';
import { authService } from '../services/authService';
import { licensingService, SUBSCRIPTION_PLANS } from '../services/licensingService';
import { LicenseProposalModal } from '../components/LicenseProposalModal';

interface MasterAdminPageProps {
  currentUser: UserAccount;
}

export const MasterAdminPage: React.FC<MasterAdminPageProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'clinics' | 'users' | 'invoices'>('clinics');
  const [clinics, setClinics] = useState<ClinicConfig[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [users, setUsers] = useState<(UserAccount & { passwordHash?: string })[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Modais
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showProposalModal, setShowProposalModal] = useState<boolean>(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState<boolean>(false);
  const [selectedClinicForProposal, setSelectedClinicForProposal] = useState<ClinicConfig | null>(null);

  // Form de Criação de Clínica
  const [formClinicName, setFormClinicName] = useState('');
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formOwnerEmail, setFormOwnerEmail] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('123456');
  const [formCity, setFormCity] = useState('Foz do Iguaçu');
  const [formCountry, setFormCountry] = useState<'Brasil' | 'Paraguai'>('Brasil');
  const [formPlan, setFormPlan] = useState<'monthly' | 'semiannual' | 'annual' | 'trial'>('annual');
  const [createError, setCreateError] = useState<string | null>(null);

  // Form de Adição de Profissional / Examinador / Recepção
  const [staffClinicId, setStaffClinicId] = useState<string>('');
  const [staffFullName, setStaffFullName] = useState<string>('');
  const [staffUsername, setStaffUsername] = useState<string>('');
  const [staffRole, setStaffRole] = useState<UserRole>('examiner');
  const [staffRegistry, setStaffRegistry] = useState<string>('');
  const [staffEmail, setStaffEmail] = useState<string>('');
  const [staffPhone, setStaffPhone] = useState<string>('');
  const [staffPassword, setStaffPassword] = useState<string>('123456');
  const [staffError, setStaffError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadData = () => {
    const cls = offlineDb.getClinics();
    setClinics(cls);
    setInvoices(licensingService.getAllInvoices());
    setUsers(authService.getUsers());
    if (cls.length > 0 && !staffClinicId) {
      setStaffClinicId(cls[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  // Cálculos de KPIs Financeiros
  const activeClinicsCount = clinics.filter(c => {
    const status = licensingService.checkAccessStatus(c.id);
    return status.hasAccess && !status.isTrial;
  }).length;

  const trialClinicsCount = clinics.filter(c => {
    const status = licensingService.checkAccessStatus(c.id);
    return status.isTrial && status.hasAccess;
  }).length;

  const expiredClinicsCount = clinics.filter(c => {
    const status = licensingService.checkAccessStatus(c.id);
    return !status.hasAccess || status.isExpired;
  }).length;

  // Faturamento Total e Estimativa Mensal (MRR)
  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const totalRevenue = paidInvoices.reduce((acc, curr) => acc + curr.amount, 0);
  
  const estimatedMRR = clinics.reduce((acc, c) => {
    const plan = c.subscription?.plan;
    if (c.subscription?.status === 'active') {
      const planInfo = SUBSCRIPTION_PLANS.find(p => p.id === plan);
      return acc + (planInfo?.monthlyEquivalent || 149);
    }
    return acc;
  }, 0);

  const handleCreateClinicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const res = authService.registerNewClinic({
      clinicName: formClinicName,
      ownerName: formOwnerName,
      ownerEmail: formOwnerEmail,
      username: formUsername,
      password: formPassword,
      city: formCity,
      country: formCountry,
      plan: formPlan
    });

    if (!res.success) {
      setCreateError(res.error || 'Erro ao cadastrar clínica.');
      return;
    }

    if (formPlan !== 'trial' && res.clinic) {
      const months = formPlan === 'annual' ? 12 : formPlan === 'semiannual' ? 6 : 1;
      licensingService.setClinicSubscriptionManually(res.clinic.id, formPlan, months);
    }

    setShowCreateModal(false);
    setFormClinicName('');
    setFormOwnerName('');
    setFormOwnerEmail('');
    setFormUsername('');
    loadData();
  };

  const handleExtendLicense = (clinicId: string, months: number, plan: SubscriptionPlan = 'annual') => {
    licensingService.setClinicSubscriptionManually(clinicId, plan, months);
    loadData();
    showNotification(`Licença prorrogada com sucesso (+${months} meses)!`);
  };

  const handleOpenProposal = (clinic: ClinicConfig) => {
    setSelectedClinicForProposal(clinic);
    setShowProposalModal(true);
  };

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);

    const res = authService.addStaffMember({
      clinicId: staffClinicId,
      fullName: staffFullName,
      username: staffUsername,
      role: staffRole,
      registryNumber: staffRegistry,
      email: staffEmail,
      phone: staffPhone,
      password: staffPassword
    });

    if (!res.success) {
      setStaffError(res.error || 'Erro ao cadastrar profissional.');
      return;
    }

    setShowAddStaffModal(false);
    setStaffFullName('');
    setStaffUsername('');
    setStaffRegistry('');
    setStaffEmail('');
    setStaffPhone('');
    loadData();
    showNotification(`Profissional cadastrado com sucesso na clínica!`);
  };

  const handleToggleUserStatus = (userId: string) => {
    authService.toggleUserActive(userId);
    loadData();
    showNotification('Status de acesso do usuário atualizado.');
  };

  const handleDeleteUser = (userId: string, name: string) => {
    if (confirm(`Deseja realmente remover o acesso de "${name}"?`)) {
      authService.deleteUser(userId);
      loadData();
      showNotification('Usuário removido da plataforma.');
    }
  };

  const filteredClinics = clinics.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.ownerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.clinicName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.registryNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
      
      {/* Notificação Toast */}
      {actionSuccess && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xl animate-bounce">
          <Check className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Header Executivo Master */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-black uppercase tracking-wider">
              Super Administrador • Plataforma SaaS
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Gestão Master de Clínicas, Examinadores & Licenças
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Visão financeira global, onboarding isolado, controle de licenças e equipe multiprofissional.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowAddStaffModal(true)}
            className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>Novo Examinador / Equipe</span>
          </button>

          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Cadastrar Consultório</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Financeiros e Operacionais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Receita Recorrente Estimada (MRR) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">MRR Estimado</span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white mt-3">
            R$ {estimatedMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-emerald-400 font-semibold mt-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{activeClinicsCount} assinaturas ativas</span>
          </div>
        </div>

        {/* Total de Clínicas Ativas */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clínicas Pagantes</span>
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white mt-3">
            {activeClinicsCount} <span className="text-sm font-medium text-slate-500">/ {clinics.length} total</span>
          </div>
          <div className="text-xs text-blue-400 font-semibold mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Licenças em dia</span>
          </div>
        </div>

        {/* Profissionais / Examinadores Ativos */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Examinadores & Usuários</span>
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-purple-400 mt-3">
            {users.length}
          </div>
          <div className="text-xs text-purple-300 font-semibold mt-2">
            {users.filter(u => u.role === 'examiner').length} examinadores habilitados
          </div>
        </div>

        {/* Clínicas em Teste Grátis */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Em Teste Grátis</span>
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-400 mt-3">
            {trialClinicsCount}
          </div>
          <div className="text-xs text-amber-400/80 font-semibold mt-2">
            Potenciais novas licenças
          </div>
        </div>

      </div>

      {/* Navegação de Abas do Master Admin */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('clinics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'clinics'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Consultórios & Licenças ({clinics.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Examinadores & Equipe ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'invoices'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Faturas & PIX ({invoices.length})</span>
        </button>
      </div>

      {/* ================= ABA 1: CLÍNICAS E LICENÇAS ================= */}
      {activeTab === 'clinics' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                <span>Clínicas e Consultórios Licenciados</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cada consultório possui banco de dados estritamente isolado e chave única.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar consultório, médico ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Clínica / Consultório</th>
                  <th className="px-6 py-4">Chave de Licença Serial</th>
                  <th className="px-6 py-4">Plano Atual</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Validade</th>
                  <th className="px-6 py-4 text-right">Comercial & Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredClinics.map((clinic) => {
                  const statusInfo = licensingService.checkAccessStatus(clinic.id);
                  const sub = clinic.subscription;
                  const planDetails = SUBSCRIPTION_PLANS.find(p => p.id === sub?.plan);
                  const key = sub?.licenseKey || `OPTO-2026-${(sub?.plan || 'trial').slice(0, 3).toUpperCase()}-${clinic.code}`;

                  return (
                    <tr key={clinic.id} className="hover:bg-slate-800/40 transition-colors">
                      
                      {/* Nome da Clínica */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md"
                            style={{ backgroundColor: clinic.primaryColor || '#2563EB' }}
                          >
                            {clinic.code ? clinic.code.substring(0, 3) : 'CLI'}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{clinic.name}</div>
                            <div className="text-[11px] text-slate-400">
                              {clinic.city || 'Foz do Iguaçu'} • Resp: <span className="text-slate-300 font-semibold">{clinic.ownerName || 'Não informado'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Chave Serial */}
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs font-semibold text-blue-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 inline-flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-blue-400" />
                          <span>{key}</span>
                        </div>
                      </td>

                      {/* Plano */}
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-200">
                          {planDetails?.name?.split('(')[0] || (sub?.plan === 'trial' ? 'Teste Gratuito' : 'Mensal')}
                        </span>
                        {sub?.priceAmount ? (
                          <div className="text-[11px] text-emerald-400 font-semibold">
                            R$ {sub.priceAmount.toFixed(2)}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500">Gratuito</div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {statusInfo.isTrial ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                            <Clock className="w-3 h-3" /> Teste ({statusInfo.daysRemaining}d)
                          </span>
                        ) : statusInfo.hasAccess ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                            <AlertTriangle className="w-3 h-3" /> Suspenso
                          </span>
                        )}
                      </td>

                      {/* Validade */}
                      <td className="px-6 py-4">
                        <div className="text-slate-300 font-medium">
                          {sub?.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('pt-BR') : 'Indeterminado'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {statusInfo.daysRemaining > 0 ? `${statusInfo.daysRemaining} dias restantes` : 'Expirado'}
                        </div>
                      </td>

                      {/* Ações Comerciais */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenProposal(clinic)}
                            title="Gerar Proposta Comercial Timbrada & Termo com PIX"
                            className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Kit de Venda / PIX</span>
                          </button>

                          <button 
                            onClick={() => handleExtendLicense(clinic.id, 1, 'monthly')}
                            title="Liberar +1 Mês"
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs transition-all cursor-pointer"
                          >
                            +1 Mês
                          </button>

                          <button 
                            onClick={() => handleExtendLicense(clinic.id, 12, 'annual')}
                            title="Liberar +1 Ano (Anual)"
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow transition-all cursor-pointer"
                          >
                            +1 Ano
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= ABA 2: EXAMINADORES E USUÁRIOS ================= */}
      {activeTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span>Examinadores e Equipe por Consultório</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Controle de médicos oftalmologistas, optometristas (CRM/CROO) e atendentes cadastrados.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Buscar por nome, CRM ou login..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                onClick={() => setShowAddStaffModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Adicionar Profissional</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Profissional / Nome</th>
                  <th className="px-6 py-4">Papel / Função</th>
                  <th className="px-6 py-4">Registro Profissional</th>
                  <th className="px-6 py-4">Consultório Vinculado</th>
                  <th className="px-6 py-4">Login de Acesso</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredUsers.map((user) => {
                  const isExaminer = user.role === 'examiner';
                  const isSuper = user.role === 'superadmin';

                  return (
                    <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSuper 
                              ? 'bg-amber-600 text-white' 
                              : isExaminer 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-purple-600 text-white'
                          }`}>
                            {user.fullName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{user.fullName}</div>
                            <div className="text-[11px] text-slate-400">{user.email || 'Sem e-mail'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                          isSuper 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : isExaminer 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : user.role === 'admin'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}>
                          {user.role === 'superadmin' ? 'Super Administrador' : user.role === 'examiner' ? 'Examinador / Médico' : user.role === 'admin' ? 'Administrador' : 'Recepção'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {user.registryNumber ? (
                          <span className="font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded">
                            {user.registryNumber}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-200">
                          {user.clinicId === 'all' ? '🌐 Todas as Unidades' : user.clinicName}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {user.username}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {user.isActive !== false ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5" /> Inativo
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isSuper && (
                            <>
                              <button
                                onClick={() => handleToggleUserStatus(user.id)}
                                title={user.isActive !== false ? 'Desativar Acesso' : 'Ativar Acesso'}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                              >
                                {user.isActive !== false ? 'Desativar' : 'Ativar'}
                              </button>

                              <button
                                onClick={() => handleDeleteUser(user.id, user.fullName)}
                                title="Excluir Usuário"
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= ABA 3: FATURAS & PIX ================= */}
      {activeTab === 'invoices' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span>Histórico de Cobranças & Faturas PIX</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Total arrecadado: <span className="text-emerald-400 font-bold">R$ {totalRevenue.toFixed(2)}</span> em licenças pagas.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Fatura</th>
                  <th className="px-6 py-4">Consultório</th>
                  <th className="px-6 py-4">Plano</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Vencimento</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      Nenhuma fatura registrada no momento.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-mono font-bold text-slate-300">{inv.receiptNumber}</td>
                      <td className="px-6 py-4 font-bold text-white">{inv.clinicName}</td>
                      <td className="px-6 py-4 text-slate-300">{inv.plan}</td>
                      <td className="px-6 py-4 font-black text-emerald-400">R$ {inv.amount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-slate-400">{inv.dueDate}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                          inv.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {inv.status === 'paid' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {inv.status !== 'paid' && (
                          <button
                            onClick={() => {
                              licensingService.approveInvoiceAndActivate(inv.id);
                              loadData();
                              showNotification('Fatura confirmada e licença ativada!');
                            }}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                          >
                            Confirmar Pagamento
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: PROPOSTA COMERCIAL & TERMO DE LICENCIAMENTO COM PIX ================= */}
      {showProposalModal && selectedClinicForProposal && (
        <LicenseProposalModal
          clinic={selectedClinicForProposal}
          isOpen={showProposalModal}
          onClose={() => setShowProposalModal(false)}
          onLicenseActivated={() => {
            loadData();
            showNotification('Licença ativada com sucesso!');
          }}
        />
      )}

      {/* ================= MODAL: ADICIONAR PROFISSIONAL / EXAMINADOR ================= */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Adicionar Examinador ou Equipe</h3>
                  <p className="text-xs text-slate-400">Vincular novo profissional a um consultório</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddStaffModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {staffError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold">
                {staffError}
              </div>
            )}

            <form onSubmit={handleAddStaffSubmit} className="space-y-4 text-xs">
              
              <div>
                <label className="text-slate-300 font-bold block mb-1">Consultório de Atuação *</label>
                <select
                  value={staffClinicId}
                  onChange={(e) => setStaffClinicId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500 font-semibold"
                >
                  {clinics.map(c => (
                    <option key={c.id} value={c.id}>
                      🏥 {c.name} ({c.city || 'Sede'})
                    </option>
                  ))}
                  <option value="all">🌐 Todas as Unidades (Acesso Global)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Nome Completo *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Dr. Roberto Silva"
                    value={staffFullName}
                    onChange={(e) => setStaffFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Função / Perfil *</label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500 font-semibold"
                  >
                    <option value="examiner">Examinador (Oftalmo/Optometria)</option>
                    <option value="reception">Recepção / Secretária</option>
                    <option value="admin">Administrador Local</option>
                  </select>
                </div>
              </div>

              {staffRole === 'examiner' && (
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Nº Registro Profissional (CRM / CROO)</label>
                  <input 
                    type="text"
                    placeholder="CRM 12345 / CROO-PR 6789"
                    value={staffRegistry}
                    onChange={(e) => setStaffRegistry(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Login de Acesso *</label>
                  <input 
                    type="text"
                    required
                    placeholder="dr.roberto"
                    value={staffUsername}
                    onChange={(e) => setStaffUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Senha Inicial *</label>
                  <input 
                    type="text"
                    required
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">E-mail Profissional</label>
                  <input 
                    type="email"
                    placeholder="roberto@clinica.com"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">WhatsApp / Telefone</label>
                  <input 
                    type="text"
                    placeholder="+55 45 99999-9999"
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                >
                  Salvar Profissional
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ================= MODAL: CRIAÇÃO DE NOVA CLÍNICA ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Cadastrar Novo Consultório</h3>
                  <p className="text-xs text-slate-400">Gera um banco isolado e chave única para licenciamento</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateClinicSubmit} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Nome do Consultório / Clínica *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Clínica Olhos & Visão"
                    value={formClinicName}
                    onChange={(e) => setFormClinicName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Nome do Responsável / Médico *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Dr. Carlos Mendes"
                    value={formOwnerName}
                    onChange={(e) => setFormOwnerName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">E-mail do Responsável *</label>
                  <input 
                    type="email"
                    required
                    placeholder="carlos@clinicamendes.com"
                    value={formOwnerEmail}
                    onChange={(e) => setFormOwnerEmail(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Cidade / País</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text"
                      placeholder="Cidade"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    />
                    <select 
                      value={formCountry}
                      onChange={(e) => setFormCountry(e.target.value as any)}
                      className="px-2 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Brasil">Brasil 🇧🇷</option>
                      <option value="Paraguai">Paraguay 🇵🇾</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Usuário de Login *</label>
                  <input 
                    type="text"
                    required
                    placeholder="dr.carlos"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Senha Inicial *</label>
                  <input 
                    type="text"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Plano Inicial de Licença</label>
                <select 
                  value={formPlan}
                  onChange={(e) => setFormPlan(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="trial">⭐ Teste Grátis com Gestão Completa (14 dias)</option>
                  <option value="basic_monthly">Plano Básico sem Gestão (R$ 59,90/mês)</option>
                  <option value="monthly">Plano Mensal Completo com Gestão (R$ 149,00/mês)</option>
                  <option value="semiannual">Plano Semestral Completo (R$ 749,00 - 6 Meses)</option>
                  <option value="annual">Plano Anual Completo (R$ 1.299,00 - 12 Meses)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30"
                >
                  Salvar e Criar Consultório
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
