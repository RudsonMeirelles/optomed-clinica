import React, { useState, useEffect } from 'react';
import { ReportStats, ClinicConfig } from '@optotipo/shared';
import { 
  BarChart3, 
  Calendar, 
  Users, 
  FileText, 
  Printer, 
  TrendingUp, 
  PieChart, 
  Award, 
  Clock, 
  Baby, 
  UserCheck, 
  Glasses, 
  ShieldCheck,
  CheckCircle2,
  Download,
  Filter
} from 'lucide-react';
import { offlineDb } from '../services/offlineDb';

interface ReportsPageProps {
  onNavigate?: (page: string) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onNavigate }) => {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('monthly');
  const [customStart, setCustomStart] = useState<string>(new Date().toISOString().slice(0, 7) + '-01');
  const [customEnd, setCustomEnd] = useState<string>(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [activeClinic, setActiveClinic] = useState<ClinicConfig>(offlineDb.getActiveClinic());

  const loadStats = () => {
    setActiveClinic(offlineDb.getActiveClinic());
    const data = offlineDb.getReportStats(timeframe, customStart, customEnd);
    setStats(data);
  };

  useEffect(() => {
    loadStats();
  }, [timeframe, customStart, customEnd]);

  if (!stats) {
    return (
      <div className="p-8 text-center text-slate-400">
        Carregando estatísticas e relatórios...
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const totalAgeCount = 
    stats.ageDistribution.pediatric + 
    stats.ageDistribution.young + 
    stats.ageDistribution.presbyopic + 
    stats.ageDistribution.senior + 
    stats.ageDistribution.uninformed || 1;

  const totalNatCount = stats.nationalityDistribution.br + stats.nationalityDistribution.py + stats.nationalityDistribution.other || 1;

  const maxPeriodCount = Math.max(...stats.consultationsByPeriod.map(p => p.count), 1);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 select-none print:p-0 print:space-y-4">
      {/* Cabeçalho do Módulo de Relatórios */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-blue-600 print:hidden" />
              <span>RELATÓRIOS E ESTATÍSTICAS CLÍNICAS</span>
            </h1>
            <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full print:hidden">
              {activeClinic.name} ({activeClinic.code})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Análise quantitativa de atendimentos diários, semanais, mensais, anuais e perfil demográfico/faixa etária
          </p>
        </div>

        {/* Botão de Impressão e Filtros */}
        <div className="flex items-center gap-3 no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* Seletor de Período (Diário, Semanal, Mensal, Anual, Personalizado) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold w-full md:w-auto">
          <button
            onClick={() => setTimeframe('daily')}
            className={`px-4 py-2 rounded-xl transition-all ${
              timeframe === 'daily'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hoje / Diário
          </button>

          <button
            onClick={() => setTimeframe('weekly')}
            className={`px-4 py-2 rounded-xl transition-all ${
              timeframe === 'weekly'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Últimos 7 Dias (Semanal)
          </button>

          <button
            onClick={() => setTimeframe('monthly')}
            className={`px-4 py-2 rounded-xl transition-all ${
              timeframe === 'monthly'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Mês Atual (Mensal)
          </button>

          <button
            onClick={() => setTimeframe('yearly')}
            className={`px-4 py-2 rounded-xl transition-all ${
              timeframe === 'yearly'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ano Atual (Anual)
          </button>

          <button
            onClick={() => setTimeframe('custom')}
            className={`px-4 py-2 rounded-xl transition-all ${
              timeframe === 'custom'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Personalizado
          </button>
        </div>

        {timeframe === 'custom' && (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <span>De:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono text-slate-900 focus:outline-none"
            />
            <span>Até:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono text-slate-900 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Cabeçalho de Impressão (Exclusivo para papel) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-2 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black">{activeClinic.name}</h2>
            <p className="text-xs text-slate-600">{activeClinic.address} - {activeClinic.city} | Tel: {activeClinic.phone}</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">RELATÓRIO ESTATÍSTICO GERENCIAL</p>
            <p className="text-slate-500">Período: {stats.startDate} a {stats.endDate}</p>
          </div>
        </div>
      </div>

      {/* Cards de Métricas Principais (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total de Consultas</span>
            <div className="text-3xl font-black text-slate-900 mt-1">{stats.totalConsultations}</div>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" /> {stats.completedConsultations} concluídas
            </span>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Receitas Ópticas</span>
            <div className="text-3xl font-black text-indigo-600 mt-1">{stats.totalPrescriptions}</div>
            <span className="text-[10px] text-slate-500 font-medium mt-1 block">
              Emitidas e impressas
            </span>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <Glasses className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Média de Consultas</span>
            <div className="text-3xl font-black text-emerald-600 mt-1">{stats.averagePerDay}</div>
            <span className="text-[10px] text-slate-500 font-medium mt-1 block">
              Consultas por dia no período
            </span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Base de Pacientes</span>
            <div className="text-3xl font-black text-amber-600 mt-1">{stats.totalPatients}</div>
            <span className="text-[10px] text-slate-500 font-medium mt-1 block">
              Cadastrados no sistema
            </span>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Gráficos e Distribuições Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Distribuição por Faixa Etária (7 Colunas) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
              <Users className="w-4 h-4 text-blue-600" />
              <span>DISTRIBUIÇÃO DE ATENDIMENTOS POR FAIXA ETÁRIA</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Classificação Oftalmológica</span>
          </div>

          <div className="space-y-4">
            {/* Pediátrico */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5 text-sky-700">
                  <Baby className="w-4 h-4 text-sky-500" />
                  <span>👶 Pediátrico (0 a 12 anos)</span>
                </span>
                <span className="font-mono text-slate-900">
                  {stats.ageDistribution.pediatric} ({Math.round((stats.ageDistribution.pediatric / totalAgeCount) * 100)}%)
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sky-500 rounded-full transition-all duration-500"
                  style={{ width: `${(stats.ageDistribution.pediatric / totalAgeCount) * 100}%` }}
                />
              </div>
            </div>

            {/* Jovem / Adulto Jovem */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  <span>👤 Jovem / Adulto (13 a 39 anos)</span>
                </span>
                <span className="font-mono text-slate-900">
                  {stats.ageDistribution.young} ({Math.round((stats.ageDistribution.young / totalAgeCount) * 100)}%)
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${(stats.ageDistribution.young / totalAgeCount) * 100}%` }}
                />
              </div>
            </div>

            {/* Presbiopia / Meia Idade */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5 text-amber-700">
                  <Glasses className="w-4 h-4 text-amber-500" />
                  <span>🔬 Presbiopia / Adição (40 a 59 anos)</span>
                </span>
                <span className="font-mono text-slate-900">
                  {stats.ageDistribution.presbyopic} ({Math.round((stats.ageDistribution.presbyopic / totalAgeCount) * 100)}%)
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${(stats.ageDistribution.presbyopic / totalAgeCount) * 100}%` }}
                />
              </div>
            </div>

            {/* Terceira Idade */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5 text-purple-700">
                  <Award className="w-4 h-4 text-purple-500" />
                  <span>👵 Terceira Idade / Senil (60+ anos)</span>
                </span>
                <span className="font-mono text-slate-900">
                  {stats.ageDistribution.senior} ({Math.round((stats.ageDistribution.senior / totalAgeCount) * 100)}%)
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${(stats.ageDistribution.senior / totalAgeCount) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Perfil Binacional & Resumo (5 Colunas) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
              <PieChart className="w-4 h-4 text-emerald-600" />
              <span>PERFIL BINACIONAL DE PACIENTES</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Brasil 🇧🇷 / Paraguai 🇵🇾</span>
          </div>

          <div className="space-y-4 pt-2">
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🇧🇷</span>
                <div>
                  <div className="font-bold text-xs text-emerald-900">Pacientes Brasileiros (CPF / RG)</div>
                  <div className="text-[11px] text-emerald-700">Foz do Iguaçu e Região</div>
                </div>
              </div>
              <div className="font-black text-base font-mono text-emerald-950">
                {stats.nationalityDistribution.br} ({Math.round((stats.nationalityDistribution.br / totalNatCount) * 100)}%)
              </div>
            </div>

            <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🇵🇾</span>
                <div>
                  <div className="font-bold text-xs text-red-900">Pacientes Paraguaios (C.I. / RUC)</div>
                  <div className="text-[11px] text-red-700">Ciudad del Este e Região</div>
                </div>
              </div>
              <div className="font-black text-base font-mono text-red-950">
                {stats.nationalityDistribution.py} ({Math.round((stats.nationalityDistribution.py / totalNatCount) * 100)}%)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Barras: Volume de Consultas ao Longo do Período */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>VOLUME DE CONSULTAS POR PERÍODO ({stats.startDate} a {stats.endDate})</span>
          </div>
        </div>

        {stats.consultationsByPeriod.length > 0 ? (
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 items-end h-48 pt-6">
            {stats.consultationsByPeriod.map((item, idx) => {
              const heightPct = (item.count / maxPeriodCount) * 100;
              return (
                <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                  <span className="text-[10px] font-mono font-bold text-slate-500 group-hover:text-blue-600">
                    {item.count}
                  </span>
                  <div className="w-full bg-slate-100 rounded-t-lg h-36 flex items-end justify-center p-0.5">
                    <div
                      className="w-full bg-blue-600 group-hover:bg-blue-500 rounded-t-md transition-all duration-300 min-h-[4px]"
                      style={{ height: `${Math.max(4, heightPct)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 truncate w-full text-center">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">
            Nenhum dado registrado para o período selecionado.
          </div>
        )}
      </div>
    </div>
  );
};
