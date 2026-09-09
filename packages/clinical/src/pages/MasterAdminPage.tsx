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
  Edit3
} from 'lucide-react';
import { ClinicConfig, BillingInvoice, SubscriptionPlan, SubscriptionStatus, UserAccount } from '@optotipo/shared';
import { offlineDb } from '../services/offlineDb';
import { authService } from '../services/authService';
import { licensingService, SUBSCRIPTION_PLANS } from '../services/licensingService';

interface MasterAdminPageProps {
  currentUser: UserAccount;
}

export const MasterAdminPage: React.FC<MasterAdminPageProps> = ({ currentUser }) => {
  const [clinics, setClinics] = useState<ClinicConfig[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);
  const [selectedClinic, setSelectedClinic] = useState<ClinicConfig | null>(null);

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

  const loadData = () => {
    setClinics(offlineDb.getClinics());
    setInvoices(licensingService.getAllInvoices());
    setUsers(authService.getUsers());
  };

  useEffect(() => {
    loadData();
  }, []);

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
  };

  const filteredClinics = clinics.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.ownerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 overflow-y-auto">
      
      {/* Header Executivo Master */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-black uppercase tracking-wider">
              Super Administrador • Plataforma SaaS
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Gestão Master de Clínicas & Licenças
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Visão financeira global, licenciamento autônomo, controle de assinaturas e faturamento.
          </p>
        </div>

        <button 
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>Cadastrar Nova Clínica</span>
        </button>
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

        {/* Clínicas em Avaliação Gratuita (Trial) */}
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
            Potenciais novos assinantes
          </div>
        </div>

        {/* Clínicas Expiradas / Bloqueadas */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inadimplentes / Vencidas</span>
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-400 mt-3">
            {expiredClinicsCount}
          </div>
          <div className="text-xs text-rose-400/80 font-semibold mt-2">
            Acesso suspenso
          </div>
        </div>

      </div>

      {/* Tabela de Clínicas Cadastradas & Licenças */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              <span>Clínicas e Consultórios Licenciados</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Cada clínica possui banco de dados estritamente isolado sem interação mútua.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Buscar clínica, cidade ou médico..."
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
                <th className="px-6 py-4">Localização</th>
                <th className="px-6 py-4">Plano Atual</th>
                <th className="px-6 py-4">Status da Licença</th>
                <th className="px-6 py-4">Validade</th>
                <th className="px-6 py-4 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredClinics.map((clinic) => {
                const statusInfo = licensingService.checkAccessStatus(clinic.id);
                const sub = clinic.subscription;
                const planDetails = SUBSCRIPTION_PLANS.find(p => p.id === sub?.plan);

                return (
                  <tr key={clinic.id} className="hover:bg-slate-800/40 transition-colors">
                    
                    {/* Nome da Clínica */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0"
                          style={{ backgroundColor: clinic.primaryColor || '#2563EB' }}
                        >
                          {clinic.code ? clinic.code.substring(0, 3) : 'CLI'}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{clinic.name}</div>
                          <div className="text-[11px] text-slate-400">
                            ID: <span className="font-mono text-slate-500">{clinic.id}</span> • {clinic.ownerName || 'Sem responsável'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Localização */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-200">{clinic.city || 'Não informada'}</div>
                      <div className="text-[11px] text-slate-500">{clinic.country || 'Brasil'}</div>
                    </td>

                    {/* Plano */}
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-200">
                        {planDetails?.name || (sub?.plan === 'trial' ? 'Teste Gratuito' : 'Mensal')}
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

                    {/* Ações */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleExtendLicense(clinic.id, 1, 'monthly')}
                          title="Liberar +1 Mês"
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-[11px] transition-all"
                        >
                          +1 Mês
                        </button>

                        <button 
                          onClick={() => handleExtendLicense(clinic.id, 12, 'annual')}
                          title="Liberar +1 Ano (Anual)"
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[11px] shadow transition-all"
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

      {/* Modal de Criação de Nova Clínica */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Cadastrar Nova Clínica</h3>
                  <p className="text-xs text-slate-400">Criará um banco isolado e usuário administrador</p>
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
                  <label className="text-slate-300 font-bold block mb-1">Nome da Clínica / Consultório *</label>
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
                  Salvar e Criar Clínica
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
