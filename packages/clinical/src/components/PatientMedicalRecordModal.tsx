import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { ClinicalEncounter, Patient, calculateAge } from '@optotipo/shared';
import { 
  X, 
  Printer, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  Glasses, 
  ChevronRight, 
  ShieldCheck, 
  RotateCcw, 
  Stethoscope, 
  Activity, 
  CheckCircle2,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import { offlineDb } from '../services/offlineDb';

interface PatientMedicalRecordModalProps {
  isOpen: boolean;
  patient: Patient | null;
  encounters: ClinicalEncounter[];
  onClose: () => void;
  onSelectEncounterForReport?: (encounter: ClinicalEncounter) => void;
  onStartReturn?: (patient: Patient, previousEncounter?: ClinicalEncounter) => void;
}

export const PatientMedicalRecordModal: React.FC<PatientMedicalRecordModalProps> = ({
  isOpen,
  patient,
  encounters,
  onClose,
  onSelectEncounterForReport,
  onStartReturn
}) => {
  const activeClinic = offlineDb.getActiveClinic();
  const sortedEncounters = [...encounters].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>(
    sortedEncounters[0]?.id || ''
  );

  const activeEncounter = sortedEncounters.find(e => e.id === selectedEncounterId) || sortedEncounters[0];

  const formatDioptria = (eye?: { sphere?: number; cylinder?: number; axis?: number; visualAcuity?: string }) => {
    if (!eye || (eye.sphere === undefined && eye.cylinder === undefined)) return '0.00';
    const sph = eye.sphere !== undefined ? (eye.sphere > 0 ? `+${eye.sphere.toFixed(2)}` : eye.sphere.toFixed(2)) : '0.00';
    const cyl = eye.cylinder !== undefined && eye.cylinder !== 0 ? ` ${eye.cylinder > 0 ? `+${eye.cylinder.toFixed(2)}` : eye.cylinder.toFixed(2)}` : '';
    const ax = eye.axis ? ` x ${eye.axis}°` : '';
    const va = eye.visualAcuity ? ` (AV: ${eye.visualAcuity})` : '';
    return `${sph}${cyl}${ax}${va}`;
  };

  const ageInfo = patient ? (patient.birthDate ? calculateAge(patient.birthDate) : null) : null;

  if (!isOpen || !patient) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[94vh] text-slate-900 border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Cabeçalho do Prontuário */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-md">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base tracking-wide text-white">PRONTUÁRIO CLÍNICO DO PACIENTE</h2>
                <span className="text-[10px] uppercase font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
                  Histórico Completo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Acompanhamento evolutivo, histórico de dioptrias e condutas anteriores
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onStartReturn && sortedEncounters.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartReturn(patient, activeEncounter);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
                title="Iniciar nova consulta de retorno para este paciente"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Registrar Retorno</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Identificação do Paciente */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-sm shadow-xs ${
              patient.nationality === 'PY' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              {patient.nationality === 'PY' ? '🇵🇾' : '🇧🇷'}
            </div>
            <div>
              <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <span>{patient.fullName}</span>
                <span className="text-[10px] font-mono font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {patient.documentType || 'DOC'}: {patient.documentNumber || 'Sem doc'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                {patient.birthDate && (
                  <span>Nasc: {new Date(patient.birthDate).toLocaleDateString('pt-BR')} ({ageInfo?.formatted})</span>
                )}
                {patient.phone && <span>Tel: {patient.phone}</span>}
                {patient.city && <span>Cidade: {patient.city}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              Total de Consultas: <strong className="text-blue-600">{sortedEncounters.length}</strong>
            </span>
          </div>
        </div>

        {/* Corpo Principal: Linha do Tempo Lateral + Detalhes do Exame Selecionado */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Painel Esquerdo: Lista Cronológica de Atendimentos */}
          <div className="w-full md:w-72 bg-slate-50 border-r border-slate-200 overflow-y-auto p-3 space-y-2 shrink-0">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-2 py-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Consultas Realizadas</span>
            </div>

            {sortedEncounters.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                Nenhum atendimento clínico registrado até o momento.
              </div>
            ) : (
              sortedEncounters.map((enc, idx) => {
                const encDate = new Date(enc.date);
                const isSelected = (activeEncounter?.id || sortedEncounters[0]?.id) === enc.id;
                const isLatest = idx === 0;

                return (
                  <button
                    key={enc.id}
                    type="button"
                    onClick={() => setSelectedEncounterId(enc.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200/90'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isSelected 
                          ? 'bg-blue-700 text-white' 
                          : isLatest 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isLatest ? 'Mais Recente' : `Consulta #${sortedEncounters.length - idx}`}
                      </span>
                      <span className={`text-[10px] font-mono ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        {encDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <Calendar className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                      <span>{encDate.toLocaleDateString('pt-BR')}</span>
                    </div>

                    {enc.subjectiveRefraction && (
                      <div className={`mt-1 text-[10px] font-mono truncate ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        OD: {formatDioptria(enc.subjectiveRefraction.od)}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Painel Direito: Detalhamento Clínico Completo da Consulta Selecionada */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-white">
            {activeEncounter ? (
              <div className="space-y-5 animate-fadeIn">
                {/* Cabeçalho do Atendimento Selecionado */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base text-slate-900">
                        Atendimento em {new Date(activeEncounter.date).toLocaleDateString('pt-BR')} às {new Date(activeEncounter.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                        activeEncounter.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {activeEncounter.status === 'completed' ? 'Concluído' : 'Em Andamento'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Examinador: <strong className="text-slate-700">{activeEncounter.examinerName || 'Dr. Rudson Meirelles'}</strong> • Unidade: {activeClinic.name}
                    </p>
                  </div>

                  {onSelectEncounterForReport && (
                    <button
                      type="button"
                      onClick={() => onSelectEncounterForReport(activeEncounter)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-300 transition-colors cursor-pointer"
                      title="Abrir laudo / relatório para impressão"
                    >
                      <Printer className="w-3.5 h-3.5 text-blue-600" />
                      <span>Imprimir Laudo Clínico</span>
                    </button>
                  )}
                </div>

                {/* 1. Anamnese & Queixa Principal */}
                <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-2">
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Anamnese & Queixa Principal</span>
                  </div>
                  
                  <p className="text-xs text-slate-800 font-medium leading-relaxed">
                    {activeEncounter.anamnesis?.chiefComplaint || 'Consulta de rotina / avaliação refrativa geral.'}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                    {activeEncounter.anamnesis?.medicationsInUse && (
                      <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-500 block">Medicamentos em uso:</span>
                        <span className="text-slate-800">{activeEncounter.anamnesis.medicationsInUse}</span>
                      </div>
                    )}
                    {activeEncounter.anamnesis?.pathologicalHistory && (
                      <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-500 block">Histórico Patológico:</span>
                        <span className="text-slate-800">{activeEncounter.anamnesis.pathologicalHistory}</span>
                      </div>
                    )}
                    {activeEncounter.anamnesis?.allergies && (
                      <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-500 block">Alergias:</span>
                        <span className="text-slate-800">{activeEncounter.anamnesis.allergies}</span>
                      </div>
                    )}
                    {(activeEncounter.anamnesis?.bloodPressure || activeEncounter.anamnesis?.bloodGlucoseMgDl) && (
                      <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-500 block">Sinais Vitais:</span>
                        <span className="text-slate-800">
                          {activeEncounter.anamnesis.bloodPressure && `PA: ${activeEncounter.anamnesis.bloodPressure} `}
                          {activeEncounter.anamnesis.bloodGlucoseMgDl && `| Glicemia: ${activeEncounter.anamnesis.bloodGlucoseMgDl}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Refração Subjetiva & Acuidade Visual */}
                {activeEncounter.subjectiveRefraction && (
                  <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Glasses className="w-3.5 h-3.5 text-blue-600" />
                        <span>Refração Subjetiva & Grau Prescrito</span>
                      </div>
                      {activeEncounter.subjectiveRefraction.addition && (
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                          Adição: +{activeEncounter.subjectiveRefraction.addition.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Olho Direito */}
                      <div className="bg-white border-2 border-emerald-200/80 rounded-xl p-3.5 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-emerald-100 pb-2 mb-2">
                          <span className="font-black text-emerald-800 text-xs flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> OLHO DIREITO (OD)
                          </span>
                          <span className="text-xs font-bold text-slate-600 font-mono">
                            AV: {activeEncounter.subjectiveRefraction.od.visualAcuity || '20/20'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center font-mono">
                          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <span className="text-[9px] text-slate-400 block uppercase font-sans">Esférico</span>
                            <span className="font-bold text-xs text-slate-800">
                              {activeEncounter.subjectiveRefraction.od.sphere !== undefined
                                ? (activeEncounter.subjectiveRefraction.od.sphere > 0 ? `+${activeEncounter.subjectiveRefraction.od.sphere.toFixed(2)}` : activeEncounter.subjectiveRefraction.od.sphere.toFixed(2))
                                : '0.00'}
                            </span>
                          </div>
                          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <span className="text-[9px] text-slate-400 block uppercase font-sans">Cilíndrico</span>
                            <span className="font-bold text-xs text-slate-800">
                              {activeEncounter.subjectiveRefraction.od.cylinder
                                ? (activeEncounter.subjectiveRefraction.od.cylinder > 0 ? `+${activeEncounter.subjectiveRefraction.od.cylinder.toFixed(2)}` : activeEncounter.subjectiveRefraction.od.cylinder.toFixed(2))
                                : '0.00'}
                            </span>
                          </div>
                          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <span className="text-[9px] text-slate-400 block uppercase font-sans">Eixo</span>
                            <span className="font-bold text-xs text-slate-800">
                              {activeEncounter.subjectiveRefraction.od.axis ? `${activeEncounter.subjectiveRefraction.od.axis}°` : '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Olho Esquerdo */}
                      <div className="bg-white border-2 border-amber-200/80 rounded-xl p-3.5 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-amber-100 pb-2 mb-2">
                          <span className="font-black text-amber-800 text-xs flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> OLHO ESQUERDO (OE)
                          </span>
                          <span className="text-xs font-bold text-slate-600 font-mono">
                            AV: {activeEncounter.subjectiveRefraction.oe.visualAcuity || '20/20'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center font-mono">
                          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <span className="text-[9px] text-slate-400 block uppercase font-sans">Esférico</span>
                            <span className="font-bold text-xs text-slate-800">
                              {activeEncounter.subjectiveRefraction.oe.sphere !== undefined
                                ? (activeEncounter.subjectiveRefraction.oe.sphere > 0 ? `+${activeEncounter.subjectiveRefraction.oe.sphere.toFixed(2)}` : activeEncounter.subjectiveRefraction.oe.sphere.toFixed(2))
                                : '0.00'}
                            </span>
                          </div>
                          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <span className="text-[9px] text-slate-400 block uppercase font-sans">Cilíndrico</span>
                            <span className="font-bold text-xs text-slate-800">
                              {activeEncounter.subjectiveRefraction.oe.cylinder
                                ? (activeEncounter.subjectiveRefraction.oe.cylinder > 0 ? `+${activeEncounter.subjectiveRefraction.oe.cylinder.toFixed(2)}` : activeEncounter.subjectiveRefraction.oe.cylinder.toFixed(2))
                                : '0.00'}
                            </span>
                          </div>
                          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <span className="text-[9px] text-slate-400 block uppercase font-sans">Eixo</span>
                            <span className="font-bold text-xs text-slate-800">
                              {activeEncounter.subjectiveRefraction.oe.axis ? `${activeEncounter.subjectiveRefraction.oe.axis}°` : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Conduta Clínica & Instruções de Retorno */}
                <div className="bg-blue-50/50 border border-blue-200/80 rounded-2xl p-4 space-y-3">
                  <div className="text-[11px] font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                    <span>Conduta Clínica, Orientações & Retorno</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-blue-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Conduta Realizada:</span>
                    <p className="text-xs text-slate-900 font-medium">
                      {activeEncounter.conduct || 'Prescrição óptica de rotina emitida. Orientações de ergonomia visual.'}
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-blue-100 flex items-start gap-2">
                    <RotateCcw className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-indigo-800 uppercase block">Orientação de Retorno:</span>
                      <p className="text-xs text-slate-800 font-bold">
                        {activeEncounter.returnInstructions || (patient.nationality === 'PY' ? 'Control en 1 año para evaluación visual de rutina.' : 'Retorno em 1 ano para controle visual de rotina.')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <FileCheck2 className="w-12 h-12 mb-3 text-slate-300" />
                <p className="text-sm font-bold">Nenhum atendimento selecionado</p>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Selecione um atendimento na lista à esquerda para consultar a anamnese, dioptrias e conduta.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 font-mono text-[11px]">
            ID Paciente: {patient.id.slice(0, 8)} • OptoMed Cloud Sync Ativo
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Fechar Prontuário
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
