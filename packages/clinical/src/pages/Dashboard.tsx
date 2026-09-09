import React, { useState, useEffect } from 'react';
import { Patient, ClinicalEncounter } from '@optotipo/shared';
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
  Search
} from 'lucide-react';
import { offlineDb } from '../services/offlineDb';

interface DashboardProps {
  onStartEncounter: (patient: Patient, encounter?: ClinicalEncounter) => void;
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartEncounter, onNavigate }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [encounters, setEncounters] = useState<ClinicalEncounter[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setPatients(offlineDb.getPatients());
    setEncounters(offlineDb.getEncounters());
  }, []);

  const waitingEncounters = encounters.filter(e => e.status === 'waiting' || e.status === 'in_progress');
  const completedEncounters = encounters.filter(e => e.status === 'completed');

  const filteredPatients = patients.filter(p => 
    p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.phone && p.phone.includes(searchQuery))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Cabeçalho do Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            PAINEL DO CONSULTÓRIO & ATENDIMENTOS
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Plataforma Clínica Conectada ao Optotipo Meirelles v2.0
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('patients')}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 shadow-sm transition-colors"
          >
            <Users className="w-4 h-4 text-blue-600" /> Pacientes
          </button>

          <button
            onClick={() => onNavigate('pairing')}
            className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <Tv className="w-4 h-4 text-blue-600" /> Parear TV da Sala
          </button>
        </div>
      </div>

      {/* Cartões com Resumo do Dia */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aguardando / Em Exame</span>
            <div className="text-3xl font-black text-amber-600 mt-1">{waitingEncounters.length}</div>
          </div>
          <div className="p-3.5 bg-amber-50 rounded-2xl text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Consultas Concluídas</span>
            <div className="text-3xl font-black text-emerald-600 mt-1">{completedEncounters.length}</div>
          </div>
          <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Pacientes</span>
            <div className="text-3xl font-black text-blue-600 mt-1">{patients.length}</div>
          </div>
          <div className="p-3.5 bg-blue-50 rounded-2xl text-blue-600">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Lista de Atendimentos em Andamento e Início Rápido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna 1 e 2: Fila de Atendimento do Dia */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Fila de Atendimento do Consultório
            </h2>
            <span className="text-xs text-slate-400 font-medium">Hoje</span>
          </div>

          <div className="space-y-3">
            {waitingEncounters.map((enc) => {
              const patient = patients.find(p => p.id === enc.patientId);
              if (!patient) return null;

              return (
                <div
                  key={enc.id}
                  className="p-4 bg-slate-50 hover:bg-blue-50/40 border border-slate-200 hover:border-blue-300 rounded-xl flex items-center justify-between transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{patient.fullName}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase">
                        {enc.status === 'in_progress' ? 'Em Atendimento' : 'Aguardando'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Queixa: {enc.anamnesis?.chiefComplaint || 'Avaliação Refrativa'}
                    </div>
                  </div>

                  <button
                    onClick={() => onStartEncounter(patient, enc)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 transition-transform"
                  >
                    <span>Abrir Exame</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {waitingEncounters.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Nenhum paciente aguardando na fila. Selecione um paciente abaixo para iniciar novo atendimento.
              </div>
            )}
          </div>
        </div>

        {/* Coluna 3: Início Rápido de Consulta */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Iniciar Novo Exame</h2>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar paciente por nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filteredPatients.slice(0, 5).map((p) => (
              <div
                key={p.id}
                onClick={() => onStartEncounter(p)}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900">{p.fullName}</div>
                  <div className="text-[11px] text-slate-500">{p.phone || 'Sem telefone'}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
            ))}
          </div>

          <button
            onClick={() => onNavigate('patients')}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> Cadastrar Novo Paciente
          </button>
        </div>
      </div>
    </div>
  );
};
