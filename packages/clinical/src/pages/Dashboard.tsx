import React, { useState, useEffect } from 'react';
import { Patient, ClinicalEncounter, UserAccount } from '@optotipo/shared';
import { 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Plus, 
  Tv, 
  FileText, 
  Activity,
  Search,
  Stethoscope,
  DollarSign,
  Monitor,
  CalendarCheck,
  Sparkles,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  Crown
} from 'lucide-react';
import { offlineDb } from '../services/offlineDb';
import { authService } from '../services/authService';

interface DashboardProps {
  onStartEncounter: (patient: Patient, encounter?: ClinicalEncounter) => void;
  onNavigate: (page: string) => void;
  clinicId?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartEncounter, onNavigate, clinicId }) => {
  const effectiveClinicId = (clinicId && clinicId !== 'all') ? clinicId : offlineDb.getActiveClinicId();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [encounters, setEncounters] = useState<ClinicalEncounter[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const currentUser = authService.getCurrentUser();
  const activeClinic = offlineDb.getActiveClinic();

  useEffect(() => {
    setPatients(offlineDb.getPatients(effectiveClinicId));
    setEncounters(offlineDb.getEncounters(effectiveClinicId));
  }, [effectiveClinicId]);

  const waitingEncounters = encounters.filter(e => e.status === 'waiting' || e.status === 'in_progress');
  const completedEncounters = encounters.filter(e => e.status === 'completed');

  const filteredPatients = patients.filter(p => {
    if (!p) return false;
    const name = (p.fullName || '').toLowerCase();
    const q = (searchQuery || '').toLowerCase();
    return name.includes(q) || (p.phone && p.phone.includes(searchQuery));
  });

  const isExaminer = currentUser?.role === 'examiner';
  const isReception = currentUser?.role === 'reception';
  const isSuperAdmin = currentUser?.role === 'superadmin';

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* 1. Cabeçalho Executivo de Boas-Vindas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white/80 backdrop-blur-md p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              PAINEL DO CONSULTÓRIO & ATENDIMENTOS
            </h1>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              {activeClinic.code || 'IVS'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Plataforma Clínica OPTOMED • Consultório Integrado & Gestão de Atendimento
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onNavigate('patients')}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 shadow-2xs hover:shadow-xs transition-all active:scale-98 cursor-pointer"
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>Pacientes</span>
          </button>

          <button
            onClick={() => onNavigate('pairing')}
            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs transition-all active:scale-98 cursor-pointer"
          >
            <Tv className="w-4 h-4 text-blue-600" />
            <span>Parear TV da Sala</span>
          </button>
        </div>
      </div>

      {/* 2. Grid de Atalhos Rápidos Interativos (Módulos de Acesso Frequente) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Atalhos Operacionais Rápidos
          </span>
          <span className="text-[11px] font-medium text-slate-400">Clique para abrir o módulo</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Atalho 1: Agenda */}
          <button
            onClick={() => onNavigate('schedule')}
            className="group p-4 bg-white/90 hover:bg-sky-50/50 border border-slate-200/80 hover:border-sky-300 rounded-2xl text-left shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 group-hover:bg-sky-100 flex items-center justify-center transition-colors">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <div className="font-extrabold text-xs text-slate-900 group-hover:text-sky-900">Agenda Médica</div>
              <div className="text-[11px] text-slate-500 font-normal mt-0.5">Grade diária, escala e consultas</div>
            </div>
          </button>

          {/* Atalho 2: Consultório / Recepção dependendo do perfil */}
          {!isReception ? (
            <button
              onClick={() => onNavigate('doctor_workspace')}
              className="group p-4 bg-white/90 hover:bg-emerald-50/50 border border-slate-200/80 hover:border-emerald-300 rounded-2xl text-left shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <div className="font-extrabold text-xs text-slate-900 group-hover:text-emerald-900">Painel do Examinador</div>
                <div className="text-[11px] text-slate-500 font-normal mt-0.5">Consultório e fila clínica direta</div>
              </div>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('patients')}
              className="group p-4 bg-white/90 hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-300 rounded-2xl text-left shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                  <Users className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <div className="font-extrabold text-xs text-slate-900 group-hover:text-blue-900">Recepção & Triagem</div>
                <div className="text-[11px] text-slate-500 font-normal mt-0.5">Cadastro rápido e fila presencial</div>
              </div>
            </button>
          )}

          {/* Atalho 3: Financeiro & Caixa */}
          <button
            onClick={() => onNavigate('finance')}
            className="group p-4 bg-white/90 hover:bg-teal-50/50 border border-slate-200/80 hover:border-teal-300 rounded-2xl text-left shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-100 flex items-center justify-center transition-colors">
                <DollarSign className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <div className="font-extrabold text-xs text-slate-900 group-hover:text-teal-900">Financeiro & PDV</div>
              <div className="text-[11px] text-slate-500 font-normal mt-0.5">Fechamento, caixa e repasse</div>
            </div>
          </button>

          {/* Atalho 4: TV Optotipo / Admin */}
          {isSuperAdmin ? (
            <button
              onClick={() => onNavigate('master_admin')}
              className="group p-4 bg-white/90 hover:bg-amber-50/50 border border-slate-200/80 hover:border-amber-300 rounded-2xl text-left shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-100 flex items-center justify-center transition-colors">
                  <Crown className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <div className="font-extrabold text-xs text-slate-900 group-hover:text-amber-900">Gestão Master SaaS</div>
                <div className="text-[11px] text-slate-500 font-normal mt-0.5">Clínicas, licenças e faturas</div>
              </div>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('optotipo_tv')}
              className="group p-4 bg-white/90 hover:bg-purple-50/50 border border-slate-200/80 hover:border-purple-300 rounded-2xl text-left shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-100 flex items-center justify-center transition-colors">
                  <Monitor className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <div className="font-extrabold text-xs text-slate-900 group-hover:text-purple-900">TV Optotipo</div>
                <div className="text-[11px] text-slate-500 font-normal mt-0.5">17 módulos de acuidade visual</div>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* 3. Cartões de Resumo Operacional do Dia */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aguardando / Em Exame</span>
            <div className="text-3xl font-black text-amber-600 mt-1">{waitingEncounters.length}</div>
            <span className="text-[10px] text-slate-400 font-medium">Fila presencial hoje</span>
          </div>
          <div className="p-3.5 bg-amber-50 rounded-2xl text-amber-600 border border-amber-100">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Consultas Concluídas</span>
            <div className="text-3xl font-black text-emerald-600 mt-1">{completedEncounters.length}</div>
            <span className="text-[10px] text-slate-400 font-medium">Atendimentos finalizados</span>
          </div>
          <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total de Pacientes</span>
            <div className="text-3xl font-black text-blue-600 mt-1">{patients.length}</div>
            <span className="text-[10px] text-slate-400 font-medium">Cadastrados na unidade</span>
          </div>
          <div className="p-3.5 bg-blue-50 rounded-2xl text-blue-600 border border-blue-100">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 4. Lista de Atendimentos em Andamento e Início Rápido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 e 2: Fila de Atendimento do Consultório */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Fila de Atendimento do Consultório
            </h2>
            <span className="text-[11px] text-slate-400 font-mono font-medium">Hoje</span>
          </div>

          <div className="space-y-2.5">
            {waitingEncounters.map((enc) => {
              const patient = patients.find(p => p.id === enc.patientId);
              if (!patient) return null;

              return (
                <div
                  key={enc.id}
                  className="p-3.5 bg-slate-50/80 hover:bg-blue-50/40 border border-slate-200/80 hover:border-blue-300 rounded-xl flex items-center justify-between transition-all"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{patient.fullName}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        enc.status === 'in_progress'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {enc.status === 'in_progress' ? 'Em Atendimento' : 'Aguardando'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      Queixa: {enc.anamnesis?.chiefComplaint || 'Avaliação Refrativa'}
                    </div>
                  </div>

                  <button
                    onClick={() => onStartEncounter(patient, enc)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-transform cursor-pointer"
                  >
                    <span>Abrir Exame</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {waitingEncounters.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Nenhum paciente aguardando na fila. Selecione um paciente ao lado para iniciar novo atendimento.
              </div>
            )}
          </div>
        </div>

        {/* Coluna 3: Início Rápido de Consulta */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900">Iniciar Novo Exame</h2>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar paciente por nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar">
            {filteredPatients.slice(0, 5).map((p) => (
              <div
                key={p.id}
                onClick={() => onStartEncounter(p)}
                className="p-2.5 bg-slate-50/80 hover:bg-blue-50/50 rounded-xl border border-slate-200/80 hover:border-blue-200 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900">{p.fullName}</div>
                  <div className="text-[10px] text-slate-500">{p.phone || 'Sem telefone cadastrado'}</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
            ))}
          </div>

          <button
            onClick={() => onNavigate('patients')}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Cadastrar Novo Paciente
          </button>
        </div>
      </div>
    </div>
  );
};

