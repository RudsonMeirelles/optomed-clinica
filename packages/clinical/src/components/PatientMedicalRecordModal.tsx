import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { ClinicalEncounter, Patient, calculateAge, calculateSphericalEquivalent, formatDiopter } from '@optotipo/shared';
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
  AlertCircle,
  BarChart2,
  Filter,
  SlidersHorizontal,
  ArrowLeftRight,
  Plus,
  Send,
  AlertTriangle,
  FileBadge,
  ExternalLink,
  Pill,
  Eye,
  Lock
} from 'lucide-react';
import { offlineDb } from '../services/offlineDb';

interface PatientMedicalRecordModalProps {
  isOpen: boolean;
  patient: Patient | null;
  encounters: ClinicalEncounter[];
  onClose: () => void;
  onSelectEncounterForReport?: (encounter: ClinicalEncounter) => void;
  onStartReturn?: (patient: Patient, previousEncounter?: ClinicalEncounter) => void;
  clinicId?: string;
}

export const PatientMedicalRecordModal: React.FC<PatientMedicalRecordModalProps> = ({
  isOpen,
  patient,
  encounters,
  onClose,
  onSelectEncounterForReport,
  onStartReturn,
  clinicId
}) => {
  const activeClinic = offlineDb.getActiveClinic();
  const effectiveClinicId = (clinicId && clinicId !== 'all') ? clinicId : activeClinic.id;
  
  // Recupera histórico estritamente da clínica autorizada na sessão atual
  const unifiedHistory = patient?.id 
    ? offlineDb.getUnifiedPatientHistory(patient.id, patient.patientGlobalId, [effectiveClinicId])
    : { encounters: [] };

  // Combina encontros recebidos como prop com os encontros multiunidades (evitando duplicatas por id)
  const combinedMap = new Map<string, any>();
  unifiedHistory.encounters.forEach(e => combinedMap.set(e.id, e));
  encounters.forEach(e => {
    if (!combinedMap.has(e.id)) {
      combinedMap.set(e.id, {
        ...e,
        clinicId: (e as any).clinicId || effectiveClinicId,
        clinicName: (e as any).clinicName || activeClinic.name,
        country: activeClinic.country || 'Brasil'
      });
    }
  });

  const sortedEncounters = Array.from(combinedMap.values()).sort(
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

  const [viewMode, setViewMode] = useState<'details' | 'compare'>('details');
  const [compareEncounterAId, setCompareEncounterAId] = useState<string>(
    sortedEncounters[0]?.id || ''
  );
  const [compareEncounterBId, setCompareEncounterBId] = useState<string>(
    sortedEncounters[1]?.id || sortedEncounters[0]?.id || ''
  );

  // Estado para inserção de Nova Evolução / Adendo Retificador
  const [showAddEvolution, setShowAddEvolution] = useState(false);
  const [evolutionType, setEvolutionType] = useState<'evolution' | 'amendment'>('evolution');
  const [evolutionText, setEvolutionText] = useState('');
  const [amendmentReason, setAmendmentReason] = useState('');
  const [selectedOriginalEvoId, setSelectedOriginalEvoId] = useState<string>('');
  const [evolutionFeedback, setEvolutionFeedback] = useState<string | null>(null);

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
                {patient.patientGlobalId && (
                  <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full" title="Identidade Global Longitudinal do Paciente">
                    ID Global: {patient.patientGlobalId.substring(0, 16)}...
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5 flex-wrap">
                {patient.birthDate && (
                  <span>Nasc: {new Date(patient.birthDate).toLocaleDateString('pt-BR')} ({ageInfo?.formatted})</span>
                )}
                {patient.phone && <span>Tel: {patient.phone}</span>}
                {patient.city && <span>Cidade: {patient.city}</span>}
                {patient.country && <span>País: {patient.country}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sortedEncounters.length >= 2 && (
              <div className="bg-slate-200/80 p-0.5 rounded-xl flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode('details')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'details' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Prontuário
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('compare')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    viewMode === 'compare' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Comparativo Longitudinal</span>
                </button>
              </div>
            )}
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
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isSelected 
                            ? 'bg-blue-700 text-white' 
                            : isLatest 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isLatest ? 'Mais Recente' : `Consulta #${sortedEncounters.length - idx}`}
                        </span>
                        {enc.country && (
                          <span className="text-[11px]" title={`Unidade: ${enc.clinicName || enc.clinicId} (${enc.country})`}>
                            {enc.country === 'Paraguai' ? '🇵🇾' : '🇧🇷'}
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-mono ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        {encDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="font-bold text-xs flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Calendar className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                        <span>{encDate.toLocaleDateString('pt-BR')}</span>
                      </div>
                      {enc.clinicName && (
                        <span className={`text-[9px] font-extrabold uppercase truncate max-w-[110px] ${
                          isSelected ? 'text-blue-200' : 'text-slate-500'
                        }`}>
                          {enc.clinicName}
                        </span>
                      )}
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

          {/* Painel Direito: Detalhamento Clínico Completo da Consulta Selecionada ou Comparativo Longitudinal */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-white">
            {viewMode === 'compare' ? (
              <div className="space-y-5 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-600 rounded-xl text-white">
                      <ArrowLeftRight className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-base text-slate-900">
                        COMPARAÇÃO CLÍNICA LONGITUDINAL
                      </h3>
                      <p className="text-xs text-slate-500">
                        Comparativo direto de parâmetros refrativos e biométricos entre duas datas (sem interpretação automática)
                      </p>
                    </div>
                  </div>

                  {/* Seletores de Datas para Comparação */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-xs">
                      <span className="font-bold text-slate-500">Data Anterior (A):</span>
                      <select
                        value={compareEncounterAId}
                        onChange={(e) => setCompareEncounterAId(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 text-xs focus:outline-none"
                      >
                        {sortedEncounters.map((enc, idx) => (
                          <option key={enc.id} value={enc.id}>
                            {new Date(enc.date).toLocaleDateString('pt-BR')} (Consulta #{sortedEncounters.length - idx})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-blue-50 p-1.5 rounded-xl border border-blue-200 text-xs">
                      <span className="font-bold text-blue-700">Data Atual / Recente (B):</span>
                      <select
                        value={compareEncounterBId}
                        onChange={(e) => setCompareEncounterBId(e.target.value)}
                        className="bg-white border border-blue-300 rounded-lg px-2 py-1 font-bold text-blue-900 text-xs focus:outline-none"
                      >
                        {sortedEncounters.map((enc, idx) => (
                          <option key={enc.id} value={enc.id}>
                            {new Date(enc.date).toLocaleDateString('pt-BR')} (Consulta #{sortedEncounters.length - idx})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tabela Comparativa de Parâmetros */}
                {(() => {
                  const encA = sortedEncounters.find(e => e.id === compareEncounterAId) || sortedEncounters[1] || sortedEncounters[0];
                  const encB = sortedEncounters.find(e => e.id === compareEncounterBId) || sortedEncounters[0];
                  const dateALabel = encA ? new Date(encA.date).toLocaleDateString('pt-BR') : 'Data A';
                  const dateBLabel = encB ? new Date(encB.date).toLocaleDateString('pt-BR') : 'Data B';

                  const encAClinicName = encA?.clinicName || encA?.clinicId || 'Clínica de Origem (A)';
                  const encBClinicName = encB?.clinicName || encB?.clinicId || 'Clínica de Origem (B)';
                  const encACountry = encA?.country ? (encA.country === 'Paraguai' ? '🇵🇾' : '🇧🇷') : '';
                  const encBCountry = encB?.country ? (encB.country === 'Paraguai' ? '🇵🇾' : '🇧🇷') : '';

                  const rxA = encA?.subjectiveRefraction || encA?.finalRefraction;
                  const rxB = encB?.subjectiveRefraction || encB?.finalRefraction;

                  // Acuidade visual OD / OE
                  const avOdA = encA?.visualAcuity?.entries?.find((e: any) => e.eye === 'OD')?.uncorrected 
                    || encA?.visualAcuity?.entries?.find((e: any) => e.eye === 'OD')?.corrected 
                    || rxA?.od?.visualAcuity 
                    || 'não registrado';
                  const avOeA = encA?.visualAcuity?.entries?.find((e: any) => e.eye === 'OE')?.uncorrected 
                    || encA?.visualAcuity?.entries?.find((e: any) => e.eye === 'OE')?.corrected 
                    || rxA?.oe?.visualAcuity 
                    || 'não registrado';

                  const avOdB = encB?.visualAcuity?.entries?.find((e: any) => e.eye === 'OD')?.uncorrected 
                    || encB?.visualAcuity?.entries?.find((e: any) => e.eye === 'OD')?.corrected 
                    || rxB?.od?.visualAcuity 
                    || 'não registrado';
                  const avOeB = encB?.visualAcuity?.entries?.find((e: any) => e.eye === 'OE')?.uncorrected 
                    || encB?.visualAcuity?.entries?.find((e: any) => e.eye === 'OE')?.corrected 
                    || rxB?.oe?.visualAcuity 
                    || 'não registrado';

                  const formatRefValue = (val?: number, isSph?: boolean) => {
                    if (val === undefined || val === null) return 'não registrado';
                    if (val > 0) return `+${val.toFixed(2)} D`;
                    if (val === 0) return isSph ? 'Plano (0.00)' : '0.00 D';
                    return `${val.toFixed(2)} D`;
                  };

                  const formatAxisValue = (axis?: number) => {
                    if (axis === undefined || axis === null) return 'não registrado';
                    return `${axis}°`;
                  };

                  const formatPrismValue = (prism?: number, base?: string) => {
                    if (!prism) return 'não registrado';
                    return `${prism.toFixed(2)}Δ ${base ? `Base ${base.toUpperCase()}` : ''}`.trim();
                  };

                  const seOdA = (rxA?.od?.sphere !== undefined || rxA?.od?.cylinder !== undefined) ? calculateSphericalEquivalent(rxA?.od?.sphere || 0, rxA?.od?.cylinder || 0) : null;
                  const seOeA = (rxA?.oe?.sphere !== undefined || rxA?.oe?.cylinder !== undefined) ? calculateSphericalEquivalent(rxA?.oe?.sphere || 0, rxA?.oe?.cylinder || 0) : null;
                  const seOdB = (rxB?.od?.sphere !== undefined || rxB?.od?.cylinder !== undefined) ? calculateSphericalEquivalent(rxB?.od?.sphere || 0, rxB?.od?.cylinder || 0) : null;
                  const seOeB = (rxB?.oe?.sphere !== undefined || rxB?.oe?.cylinder !== undefined) ? calculateSphericalEquivalent(rxB?.oe?.sphere || 0, rxB?.oe?.cylinder || 0) : null;

                  // Extração segura de biomicroscopia, tonometria e fundo
                  const extractField = (enc: any, eye: 'OD' | 'OE', fieldType: 'pio' | 'cdRatio' | 'anterior' | 'fundus') => {
                    if (!enc) return 'não registrado';
                    
                    // 1. structuredData de evoluções
                    if (enc.evolutions && Array.isArray(enc.evolutions)) {
                      for (const evo of enc.evolutions) {
                        const sData = evo.structuredData || {};
                        if (fieldType === 'pio') {
                          const pioVal = eye === 'OD' ? (sData.iopOD || sData.pioOD) : (sData.iopOE || sData.pioOE);
                          if (pioVal) return `${pioVal} mmHg`;
                        }
                        if (fieldType === 'cdRatio') {
                          const cdVal = eye === 'OD' ? (sData.cdRatioOD || sData.escavacaoOD) : (sData.cdRatioOE || sData.escavacaoOE);
                          if (cdVal) return String(cdVal);
                        }
                        if (fieldType === 'anterior') {
                          const antVal = eye === 'OD' ? (sData.anteriorSegmentOD || sData.biomicroscopiaOD) : (sData.anteriorSegmentOE || sData.biomicroscopiaOE);
                          if (antVal) return String(antVal);
                        }
                        if (fieldType === 'fundus') {
                          const fVal = eye === 'OD' ? (sData.fundusOD || sData.fundoscopiaOD) : (sData.fundusOE || sData.fundoscopiaOE);
                          if (fVal) return String(fVal);
                        }
                      }
                    }

                    // 2. Anamnese ou notas clínicas livres
                    const notes = [
                      enc.clinicalNotes,
                      enc.anamnesis?.clinicalNotes,
                      enc.anamnesis?.observations,
                      enc.conduct
                    ].filter(Boolean).join(' ');

                    if (notes) {
                      if (fieldType === 'pio') {
                        const regex = eye === 'OD' 
                          ? /(?:PIO|pressão|tonometria)\s*(?:OD|olho direito)?[:=\s]*([0-9]{1,2}(?:\.[0-9])?)\s*(?:mmHg)?/i
                          : /(?:PIO|pressão|tonometria)\s*(?:OE|olho esquerdo)?[:=\s]*([0-9]{1,2}(?:\.[0-9])?)\s*(?:mmHg)?/i;
                        const match = notes.match(regex);
                        if (match && match[1]) return `${match[1]} mmHg`;
                      }
                      if (fieldType === 'cdRatio') {
                        const regex = eye === 'OD'
                          ? /(?:escavação|E\/D|disco|papila)\s*(?:OD)?[:=\s]*([0-9](?:[.,][0-9]+)?)/i
                          : /(?:escavação|E\/D|disco|papila)\s*(?:OE)?[:=\s]*([0-9](?:[.,][0-9]+)?)/i;
                        const match = notes.match(regex);
                        if (match && match[1]) return match[1];
                      }
                    }

                    return 'não registrado';
                  };

                  const formatDiags = (enc: any) => {
                    if (!enc?.diagnoses || enc.diagnoses.length === 0) return 'não registrado';
                    return enc.diagnoses.map((d: any) => {
                      const eyeTag = d.eye && d.eye !== 'unspecified' ? ` [${d.eye}]` : '';
                      const codeTag = d.code ? ` (${d.code})` : '';
                      return `${d.description}${codeTag}${eyeTag}`;
                    }).join('; ');
                  };

                  const formatConductSummary = (enc: any) => {
                    const parts: string[] = [];
                    if (enc?.conduct) parts.push(`Conduta: ${enc.conduct}`);
                    if (enc?.structuredConduct?.treatmentPlan) parts.push(`Plano: ${enc.structuredConduct.treatmentPlan}`);
                    if (enc?.structuredConduct?.orientations) parts.push(`Orientações: ${enc.structuredConduct.orientations}`);
                    if (enc?.structuredConduct?.referrals) parts.push(`Encaminhamento: ${enc.structuredConduct.referrals}`);
                    if (enc?.structuredConduct?.requestedExams?.length) parts.push(`Exames: ${enc.structuredConduct.requestedExams.join(', ')}`);
                    if (enc?.returnInstructions) parts.push(`Retorno: ${enc.returnInstructions}`);
                    return parts.length > 0 ? parts.join(' | ') : 'não registrado';
                  };

                  const comparisonRows = [
                    // Identificação e Rastreabilidade
                    { category: 'Unidade & Data', param: 'Data do Atendimento', a: dateALabel, b: dateBLabel },
                    { category: 'Unidade & Data', param: 'Clínica de Origem', a: `${encACountry} ${encAClinicName}`, b: `${encBCountry} ${encBClinicName}` },
                    { category: 'Unidade & Data', param: 'Examinador Responsável', a: encA?.examinerName || 'não registrado', b: encB?.examinerName || 'não registrado' },

                    // Olho Direito (OD x OD)
                    { category: 'Olho Direito (OD × OD)', param: 'Acuidade Visual (OD)', a: avOdA, b: avOdB },
                    { category: 'Olho Direito (OD × OD)', param: 'Esférico (OD)', a: formatRefValue(rxA?.od?.sphere, true), b: formatRefValue(rxB?.od?.sphere, true) },
                    { category: 'Olho Direito (OD × OD)', param: 'Cilíndrico (OD)', a: formatRefValue(rxA?.od?.cylinder), b: formatRefValue(rxB?.od?.cylinder) },
                    { category: 'Olho Direito (OD × OD)', param: 'Eixo (OD)', a: formatAxisValue(rxA?.od?.axis), b: formatAxisValue(rxB?.od?.axis) },
                    { category: 'Olho Direito (OD × OD)', param: 'Equivalente Esférico (OD)', a: seOdA !== null ? `${formatDiopter(seOdA)} D` : 'não registrado', b: seOdB !== null ? `${formatDiopter(seOdB)} D` : 'não registrado' },
                    { category: 'Olho Direito (OD × OD)', param: 'Prisma (OD)', a: formatPrismValue(rxA?.od?.prism, rxA?.od?.prismBase), b: formatPrismValue(rxB?.od?.prism, rxB?.od?.prismBase) },
                    { category: 'Olho Direito (OD × OD)', param: 'Pressão Intraocular - PIO (OD)', a: extractField(encA, 'OD', 'pio'), b: extractField(encB, 'OD', 'pio') },
                    { category: 'Olho Direito (OD × OD)', param: 'Relação Escavação/Disco (OD)', a: extractField(encA, 'OD', 'cdRatio'), b: extractField(encB, 'OD', 'cdRatio') },
                    { category: 'Olho Direito (OD × OD)', param: 'Achados Segmento Anterior (OD)', a: extractField(encA, 'OD', 'anterior'), b: extractField(encB, 'OD', 'anterior') },
                    { category: 'Olho Direito (OD × OD)', param: 'Fundo de Olho (OD)', a: extractField(encA, 'OD', 'fundus'), b: extractField(encB, 'OD', 'fundus') },

                    // Olho Esquerdo (OE x OE)
                    { category: 'Olho Esquerdo (OE × OE)', param: 'Acuidade Visual (OE)', a: avOeA, b: avOeB },
                    { category: 'Olho Esquerdo (OE × OE)', param: 'Esférico (OE)', a: formatRefValue(rxA?.oe?.sphere, true), b: formatRefValue(rxB?.oe?.sphere, true) },
                    { category: 'Olho Esquerdo (OE × OE)', param: 'Cilíndrico (OE)', a: formatRefValue(rxA?.oe?.cylinder), b: formatRefValue(rxB?.oe?.cylinder) },
                    { category: 'Olho Esquerdo (OE × OE)', param: 'Eixo (OE)', a: formatAxisValue(rxA?.oe?.axis), b: formatAxisValue(rxB?.oe?.axis) },
                    { category: 'Olho Esquerdo (OE × OE)', param: 'Equivalente Esférico (OE)', a: seOeA !== null ? `${formatDiopter(seOeA)} D` : 'não registrado', b: seOeB !== null ? `${formatDiopter(seOeB)} D` : 'não registrado' },
                    { category: 'Olho Esquerdo (OE × OE)', param: 'Prisma (OE)', a: formatPrismValue(rxA?.oe?.prism, rxA?.oe?.prismBase), b: formatPrismValue(rxB?.oe?.prism, rxB?.oe?.prismBase) },
                    { category: 'Olho Esquerdo (OE × OE)', param: 'Pressão Intraocular - PIO (OE)', a: extractField(encA, 'OE', 'pio'), b: extractField(encB, 'OE', 'pio') },
                    { category: 'Olho Esquerdo (OE × OE)', param: 'Relação Escavação/Disco (OE)', a: extractField(encA, 'OE', 'cdRatio'), b: extractField(encB, 'OE', 'cdRatio') },
                    { category: 'Olho Esquerdo (OE × OE)', param: 'Achados Segmento Anterior (OE)', a: extractField(encA, 'OE', 'anterior'), b: extractField(encB, 'OE', 'anterior') },
                    { category: 'Olho Esquerdo (OE × OE)', param: 'Fundo de Olho (OE)', a: extractField(encA, 'OE', 'fundus'), b: extractField(encB, 'OE', 'fundus') },

                    // Parâmetros Binoculares e Perto
                    { category: 'Binocular & Perto', param: 'Adição para Perto', a: rxA?.addition ? `+${rxA.addition.toFixed(2)} D` : 'não registrado', b: rxB?.addition ? `+${rxB.addition.toFixed(2)} D` : 'não registrado' },
                    { category: 'Binocular & Perto', param: 'Distância Nasopupilar (DNP / DP)', a: rxA?.pdDistanceMm ? `${rxA.pdDistanceMm} mm` : 'não registrado', b: rxB?.pdDistanceMm ? `${rxB.pdDistanceMm} mm` : 'não registrado' },

                    // Diagnósticos e Condutas
                    { category: 'Diagnóstico & Conduta', param: 'Diagnósticos Clínicos', a: formatDiags(encA), b: formatDiags(encB) },
                    { category: 'Diagnóstico & Conduta', param: 'Condutas e Orientações', a: formatConductSummary(encA), b: formatConductSummary(encB) }
                  ];

                  return (
                    <div className="space-y-4">
                      {/* Banner Informativo de Comparação Segura */}
                      <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-900">
                        <div className="flex items-center gap-2">
                          <ArrowLeftRight className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>
                            <strong>Comparação Fidedigna Longitudinal:</strong> Parâmetros estritamente compatíveis pareados olho a olho (OD × OD e OE × OE). Ausências de dados são expressas como <em>"não registrado"</em> para evitar falsas normalidades.
                          </span>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-slate-300 shadow-sm">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-900 text-white font-bold">
                              <th className="p-3 text-left w-1/3">PARÂMETRO CLÍNICO</th>
                              <th className="p-3 text-center w-1/3 bg-slate-800">
                                <div>DATA ANTERIOR (A): {dateALabel}</div>
                                <div className="text-[10px] font-normal text-slate-300 font-sans mt-0.5">
                                  {encACountry} {encAClinicName}
                                </div>
                              </th>
                              <th className="p-3 text-center w-1/3 bg-blue-700">
                                <div>DATA ATUAL / RECENTE (B): {dateBLabel}</div>
                                <div className="text-[10px] font-normal text-blue-200 font-sans mt-0.5">
                                  {encBCountry} {encBClinicName}
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {comparisonRows.map((row, idx) => {
                              const isCategoryHeader = idx === 0 || comparisonRows[idx - 1].category !== row.category;
                              const isUnregisteredA = row.a === 'não registrado';
                              const isUnregisteredB = row.b === 'não registrado';

                              return (
                                <React.Fragment key={idx}>
                                  {isCategoryHeader && (
                                    <tr className="bg-slate-100 font-black text-slate-600 uppercase text-[10px] tracking-wider">
                                      <td colSpan={3} className="py-2 px-3 bg-slate-200/70 text-slate-700">
                                        {row.category}
                                      </td>
                                    </tr>
                                  )}
                                  <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                    <td className="p-3 font-bold text-slate-800">{row.param}</td>
                                    <td className={`p-3 text-center font-mono text-xs ${
                                      isUnregisteredA ? 'text-slate-400 italic bg-slate-50/80 font-sans' : 'font-medium text-slate-800 bg-slate-50/40'
                                    }`}>
                                      {row.a}
                                    </td>
                                    <td className={`p-3 text-center font-mono text-xs ${
                                      isUnregisteredB ? 'text-slate-400 italic bg-blue-50/20 font-sans' : 'font-bold text-blue-900 bg-blue-50/40'
                                    }`}>
                                      {row.b}
                                    </td>
                                  </tr>
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          <strong>Nota Assistencial:</strong> O sistema apresenta a comparação neutra e fidedigna dos parâmetros documentados. A interpretação da evolução clínica e a conduta são de responsabilidade soberana do profissional.
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : activeEncounter ? (
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
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>Examinador: <strong className="text-slate-700">{activeEncounter.examinerName || 'Dr. Rudson Meirelles'}</strong></span>
                      <span>•</span>
                      <span>Unidade: <strong className="text-blue-700">{activeEncounter.clinicName || activeClinic.name}</strong></span>
                      {activeEncounter.country && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                          {activeEncounter.country === 'Paraguai' ? '🇵🇾 Paraguai' : '🇧🇷 Brasil'}
                        </span>
                      )}
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
                    <b>QP:</b> {activeEncounter.anamnesis?.chiefComplaint || 'Consulta de rotina / avaliação refrativa geral.'}
                  </p>

                  {activeEncounter.anamnesis?.historyOfPresentIllness && (
                    <p className="text-xs text-slate-700 bg-white p-2 rounded-xl border border-slate-200/60">
                      <b>HDA:</b> {activeEncounter.anamnesis.historyOfPresentIllness}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                    {(activeEncounter.anamnesis?.medicationsInUse || activeEncounter.anamnesis?.medications) && (
                      <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-500 block">Medicamentos em uso:</span>
                        <span className="text-slate-800">{activeEncounter.anamnesis.medicationsInUse || activeEncounter.anamnesis.medications}</span>
                      </div>
                    )}
                    {(activeEncounter.anamnesis?.pathologicalHistory || activeEncounter.anamnesis?.systemicHistory) && (
                      <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-500 block">Histórico Patológico / Sistêmico:</span>
                        <span className="text-slate-800">{activeEncounter.anamnesis.pathologicalHistory || activeEncounter.anamnesis.systemicHistory}</span>
                      </div>
                    )}
                    {(activeEncounter.anamnesis?.surgicalHistory || activeEncounter.anamnesis?.previousSurgeries) && (
                      <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-500 block">Cirurgias Prévias:</span>
                        <span className="text-slate-800">{activeEncounter.anamnesis.surgicalHistory || activeEncounter.anamnesis.previousSurgeries}</span>
                      </div>
                    )}
                    {activeEncounter.anamnesis?.traumaHistory && (
                      <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-500 block">Traumatismos:</span>
                        <span className="text-slate-800">{activeEncounter.anamnesis.traumaHistory}</span>
                      </div>
                    )}
                    {activeEncounter.anamnesis?.allergies && (
                      <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-500 block">Alergias:</span>
                        <span className="text-slate-800">{activeEncounter.anamnesis.allergies}</span>
                      </div>
                    )}
                    {(activeEncounter.anamnesis?.occupationalHistory || activeEncounter.anamnesis?.screenExposure) && (
                      <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-500 block">Ocupação / Telas:</span>
                        <span className="text-slate-800">
                          {activeEncounter.anamnesis.occupationalHistory && `Profissão: ${activeEncounter.anamnesis.occupationalHistory} `}
                          {activeEncounter.anamnesis.screenExposure && `| Telas: ${activeEncounter.anamnesis.screenExposure}`}
                        </span>
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

                {/* 2. Refração Subjetiva / Final & Acuidade Visual */}
                {(activeEncounter.finalRefraction || activeEncounter.subjectiveRefraction) && (() => {
                  const refData = activeEncounter.finalRefraction || activeEncounter.subjectiveRefraction!;
                  const isFinal = !!activeEncounter.finalRefraction;
                  const odSe = calculateSphericalEquivalent(refData.od.sphere || 0, refData.od.cylinder || 0);
                  const oeSe = calculateSphericalEquivalent(refData.oe.sphere || 0, refData.oe.cylinder || 0);

                  return (
                    <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Glasses className="w-3.5 h-3.5 text-blue-600" />
                          <span>{isFinal ? 'Refração Final Homologada' : 'Refração Subjetiva'} & Grau Prescrito</span>
                          {isFinal && (
                            <span className="text-[9px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> HOMOLOGADA
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {refData.addition && (
                            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                              Adição: +{refData.addition.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Olho Direito */}
                        <div className="bg-white border-2 border-emerald-200/80 rounded-xl p-3.5 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                            <span className="font-black text-emerald-800 text-xs flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> OLHO DIREITO (OD)
                            </span>
                            <span className="text-xs font-bold text-slate-600 font-mono">
                              AV: {refData.od.visualAcuity || '20/20'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center font-mono">
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <span className="text-[9px] text-slate-400 block uppercase font-sans">Esférico</span>
                              <span className="font-bold text-xs text-slate-800">
                                {refData.od.sphere !== undefined
                                  ? (refData.od.sphere > 0 ? `+${refData.od.sphere.toFixed(2)}` : refData.od.sphere.toFixed(2))
                                  : '0.00'}
                              </span>
                            </div>
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <span className="text-[9px] text-slate-400 block uppercase font-sans">Cilíndrico</span>
                              <span className="font-bold text-xs text-slate-800">
                                {refData.od.cylinder
                                  ? (refData.od.cylinder > 0 ? `+${refData.od.cylinder.toFixed(2)}` : refData.od.cylinder.toFixed(2))
                                  : '0.00'}
                              </span>
                            </div>
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <span className="text-[9px] text-slate-400 block uppercase font-sans">Eixo</span>
                              <span className="font-bold text-xs text-slate-800">
                                {refData.od.axis ? `${refData.od.axis}°` : '-'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-600 border-t border-slate-100">
                            <span>SE: <strong className="text-indigo-600">{formatDiopter(odSe)} D</strong></span>
                            {refData.od.prism ? (
                              <span className="text-indigo-700 font-bold">Prisma: {refData.od.prism.toFixed(2)}Δ {refData.od.prismBase ? `Base ${refData.od.prismBase.toUpperCase()}` : ''}</span>
                            ) : null}
                          </div>
                        </div>

                        {/* Olho Esquerdo */}
                        <div className="bg-white border-2 border-amber-200/80 rounded-xl p-3.5 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                            <span className="font-black text-amber-800 text-xs flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> OLHO ESQUERDO (OE)
                            </span>
                            <span className="text-xs font-bold text-slate-600 font-mono">
                              AV: {refData.oe.visualAcuity || '20/20'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center font-mono">
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <span className="text-[9px] text-slate-400 block uppercase font-sans">Esférico</span>
                              <span className="font-bold text-xs text-slate-800">
                                {refData.oe.sphere !== undefined
                                  ? (refData.oe.sphere > 0 ? `+${refData.oe.sphere.toFixed(2)}` : refData.oe.sphere.toFixed(2))
                                  : '0.00'}
                              </span>
                            </div>
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <span className="text-[9px] text-slate-400 block uppercase font-sans">Cilíndrico</span>
                              <span className="font-bold text-xs text-slate-800">
                                {refData.oe.cylinder
                                  ? (refData.oe.cylinder > 0 ? `+${refData.oe.cylinder.toFixed(2)}` : refData.oe.cylinder.toFixed(2))
                                  : '0.00'}
                              </span>
                            </div>
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <span className="text-[9px] text-slate-400 block uppercase font-sans">Eixo</span>
                              <span className="font-bold text-xs text-slate-800">
                                {refData.oe.axis ? `${refData.oe.axis}°` : '-'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-600 border-t border-slate-100">
                            <span>SE: <strong className="text-indigo-600">{formatDiopter(oeSe)} D</strong></span>
                            {refData.oe.prism ? (
                              <span className="text-indigo-700 font-bold">Prisma: {refData.oe.prism.toFixed(2)}Δ {refData.oe.prismBase ? `Base ${refData.oe.prismBase.toUpperCase()}` : ''}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 2.1 Achados Clínicos e Biomicroscopia / PIO / Fundo de Olho */}
                {(() => {
                  const getDetailField = (eye: 'OD' | 'OE', fieldType: 'pio' | 'cdRatio' | 'anterior' | 'fundus') => {
                    if (!activeEncounter) return 'não registrado';
                    
                    if (activeEncounter.evolutions && Array.isArray(activeEncounter.evolutions)) {
                      for (const evo of activeEncounter.evolutions) {
                        const sData = evo.structuredData || {};
                        if (fieldType === 'pio') {
                          const pioVal = eye === 'OD' ? (sData.iopOD || sData.pioOD) : (sData.iopOE || sData.pioOE);
                          if (pioVal) return `${pioVal} mmHg`;
                        }
                        if (fieldType === 'cdRatio') {
                          const cdVal = eye === 'OD' ? (sData.cdRatioOD || sData.escavacaoOD) : (sData.cdRatioOE || sData.escavacaoOE);
                          if (cdVal) return String(cdVal);
                        }
                        if (fieldType === 'anterior') {
                          const antVal = eye === 'OD' ? (sData.anteriorSegmentOD || sData.biomicroscopiaOD) : (sData.anteriorSegmentOE || sData.biomicroscopiaOE);
                          if (antVal) return String(antVal);
                        }
                        if (fieldType === 'fundus') {
                          const fVal = eye === 'OD' ? (sData.fundusOD || sData.fundoscopiaOD) : (sData.fundusOE || sData.fundoscopiaOE);
                          if (fVal) return String(fVal);
                        }
                      }
                    }

                    const notes = [
                      activeEncounter.clinicalNotes,
                      activeEncounter.anamnesis?.clinicalNotes,
                      activeEncounter.anamnesis?.observations,
                      activeEncounter.conduct
                    ].filter(Boolean).join(' ');

                    if (notes) {
                      if (fieldType === 'pio') {
                        const regex = eye === 'OD' 
                          ? /(?:PIO|pressão|tonometria)\s*(?:OD|olho direito)?[:=\s]*([0-9]{1,2}(?:\.[0-9])?)\s*(?:mmHg)?/i
                          : /(?:PIO|pressão|tonometria)\s*(?:OE|olho esquerdo)?[:=\s]*([0-9]{1,2}(?:\.[0-9])?)\s*(?:mmHg)?/i;
                        const match = notes.match(regex);
                        if (match && match[1]) return `${match[1]} mmHg`;
                      }
                      if (fieldType === 'cdRatio') {
                        const regex = eye === 'OD'
                          ? /(?:escavação|E\/D|disco|papila)\s*(?:OD)?[:=\s]*([0-9](?:[.,][0-9]+)?)/i
                          : /(?:escavação|E\/D|disco|papila)\s*(?:OE)?[:=\s]*([0-9](?:[.,][0-9]+)?)/i;
                        const match = notes.match(regex);
                        if (match && match[1]) return match[1];
                      }
                    }

                    return 'não registrado';
                  };

                  return (
                    <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                      <div className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-blue-600" />
                          <span>Tonometria & Biomicroscopia Ocular (OD × OE)</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-sans">
                          Valores não preenchidos constam como "não registrado"
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* OD */}
                        <div className="bg-white p-3 rounded-xl border border-emerald-200/70 shadow-2xs space-y-1.5">
                          <span className="text-[11px] font-black text-emerald-800 flex items-center gap-1 border-b border-emerald-100 pb-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> OLHO DIREITO (OD)
                          </span>
                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-400 block">Pressão (PIO):</span>
                              <span className="font-mono font-bold text-slate-800">{getDetailField('OD', 'pio')}</span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-400 block">Escavação / Disco:</span>
                              <span className="font-mono font-bold text-slate-800">{getDetailField('OD', 'cdRatio')}</span>
                            </div>
                          </div>
                          <div className="pt-1.5 border-t border-slate-100 text-[11px]">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Segmento Anterior:</span>
                            <span className="text-slate-800 font-medium">{getDetailField('OD', 'anterior')}</span>
                          </div>
                          <div className="pt-1 text-[11px]">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Fundo de Olho:</span>
                            <span className="text-slate-800 font-medium">{getDetailField('OD', 'fundus')}</span>
                          </div>
                        </div>

                        {/* OE */}
                        <div className="bg-white p-3 rounded-xl border border-amber-200/70 shadow-2xs space-y-1.5">
                          <span className="text-[11px] font-black text-amber-800 flex items-center gap-1 border-b border-amber-100 pb-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500" /> OLHO ESQUERDO (OE)
                          </span>
                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-400 block">Pressão (PIO):</span>
                              <span className="font-mono font-bold text-slate-800">{getDetailField('OE', 'pio')}</span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-400 block">Escavação / Disco:</span>
                              <span className="font-mono font-bold text-slate-800">{getDetailField('OE', 'cdRatio')}</span>
                            </div>
                          </div>
                          <div className="pt-1.5 border-t border-slate-100 text-[11px]">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Segmento Anterior:</span>
                            <span className="text-slate-800 font-medium">{getDetailField('OE', 'anterior')}</span>
                          </div>
                          <div className="pt-1 text-[11px]">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Fundo de Olho:</span>
                            <span className="text-slate-800 font-medium">{getDetailField('OE', 'fundus')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Diagnósticos Clínicos (CID-10 / CID-11) */}
                {activeEncounter.diagnoses && activeEncounter.diagnoses.length > 0 && (
                  <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-2">
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                        <span>Diagnósticos Registrados</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {activeEncounter.diagnoses.length} diagnósticos
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeEncounter.diagnoses.map((diag: any, i: number) => (
                        <div key={diag.id || i} className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between gap-1.5 shadow-2xs">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {diag.primary && (
                                <span className="text-[8px] font-black uppercase bg-blue-600 text-white px-1.5 py-0.2 rounded-full">
                                  Principal
                                </span>
                              )}
                              {diag.code && (
                                <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                  {diag.code}
                                </span>
                              )}
                              <span className="font-bold text-xs text-slate-800">{diag.description}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                              <span>Olho: <strong>{diag.eye}</strong></span>
                              <span>•</span>
                              <span>Status: <strong>{diag.status}</strong></span>
                            </div>
                            {diag.notes && (
                              <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100 mt-1 italic">
                                Obs: {diag.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Evoluções Clínicas Longitudinais & Adendos (FASE 3.8 / 24) */}
                {(() => {
                  const encounterEvolutions = offlineDb.getEvolutionsByEncounter(activeEncounter.id);

                  return (
                    <div className="bg-purple-50/60 border border-purple-200/80 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="text-[11px] font-black uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-purple-600" />
                          <span>Evolução Clínica Longitudinal & Adendos</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-purple-200/60 text-purple-900 font-bold px-2 py-0.5 rounded-full">
                            {encounterEvolutions.length} registros
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddEvolution(!showAddEvolution);
                              setEvolutionFeedback(null);
                            }}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                          >
                            <Plus className="w-3 h-3" />
                            <span>{showAddEvolution ? 'Fechar' : 'Nova Evolução / Adendo'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Mensagem de Feedback */}
                      {evolutionFeedback && (
                        <div className="p-2.5 bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2 animate-fadeIn">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{evolutionFeedback}</span>
                        </div>
                      )}

                      {/* Formulário Interativo de Nova Evolução / Adendo Retificador */}
                      {showAddEvolution && (
                        <div className="p-3.5 bg-white border-2 border-purple-300 rounded-xl space-y-3 shadow-md animate-fadeIn">
                          <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                            <span className="font-black text-xs text-purple-950 uppercase">
                              Registrar Evolução Clínica ou Adendo Retificador
                            </span>
                            <div className="flex items-center gap-2">
                              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name="evoType"
                                  value="evolution"
                                  checked={evolutionType === 'evolution'}
                                  onChange={() => setEvolutionType('evolution')}
                                  className="text-purple-600"
                                />
                                Nova Evolução
                              </label>
                              <label className="text-[11px] font-bold text-amber-800 flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name="evoType"
                                  value="amendment"
                                  checked={evolutionType === 'amendment'}
                                  onChange={() => setEvolutionType('amendment')}
                                  className="text-amber-600"
                                />
                                Adendo / Retificação
                              </label>
                            </div>
                          </div>

                          {evolutionType === 'amendment' && (
                            <div className="space-y-2 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200 text-xs">
                              <div>
                                <label className="block font-bold text-amber-900 mb-1 text-[11px]">
                                  Registro a Retificar (Preserva histórico sem sobrescrever):
                                </label>
                                <select
                                  value={selectedOriginalEvoId}
                                  onChange={(e) => setSelectedOriginalEvoId(e.target.value)}
                                  className="w-full bg-white border border-amber-300 rounded-lg p-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                                >
                                  <option value="">-- Atendimento Geral #{activeEncounter.id.slice(0, 8)} --</option>
                                  {encounterEvolutions.map(e => (
                                    <option key={e.id} value={e.id}>
                                      v{e.version} ({new Date(e.timestamp).toLocaleDateString('pt-BR')}): {e.text.slice(0, 45)}...
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block font-bold text-amber-900 mb-1 text-[11px]">
                                  Motivo da Retificação / Adendo (Obrigatório):
                                </label>
                                <input
                                  type="text"
                                  value={amendmentReason}
                                  onChange={(e) => setAmendmentReason(e.target.value)}
                                  placeholder="Ex: Retificação de acuidade visual corrigida após reexame"
                                  className="w-full bg-white border border-amber-300 rounded-lg p-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                                />
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                              Conteúdo da Evolução / Observações Clínicas:
                            </label>
                            <textarea
                              rows={3}
                              value={evolutionText}
                              onChange={(e) => setEvolutionText(e.target.value)}
                              placeholder="Descreva a evolução do quadro clínico, resposta terapêutica ou notas complementares..."
                              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddEvolution(false);
                                setEvolutionText('');
                                setAmendmentReason('');
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!evolutionText.trim()) return;
                                if (evolutionType === 'amendment' && !amendmentReason.trim()) {
                                  alert('Por favor informe o motivo do adendo retificador.');
                                  return;
                                }

                                const now = new Date().toISOString();
                                const examiner = activeEncounter.examinerName || 'Dr. Rudson Meirelles';

                                if (evolutionType === 'amendment') {
                                  offlineDb.createAmendment({
                                    originalEvolutionId: selectedOriginalEvoId || activeEncounter.id,
                                    encounterId: activeEncounter.id,
                                    patientId: patient.id,
                                    newText: evolutionText.trim(),
                                    reason: amendmentReason.trim(),
                                    professionalId: activeEncounter.examinerId || 'user-doc',
                                    professionalName: examiner,
                                    clinicId: activeEncounter.clinicId || activeClinic.id
                                  });
                                  setEvolutionFeedback('✓ Adendo retificador registrado com versionamento e histórico preservado!');
                                } else {
                                  offlineDb.saveEvolution({
                                    id: 'evo-' + Math.random().toString(36).substr(2, 9),
                                    encounterId: activeEncounter.id,
                                    patientId: patient.id,
                                    clinicId: activeEncounter.clinicId || activeClinic.id,
                                    professionalId: activeEncounter.examinerId || 'user-doc',
                                    professionalName: examiner,
                                    timestamp: now,
                                    text: evolutionText.trim(),
                                    type: 'evolution',
                                    version: 1,
                                    createdAt: now,
                                    createdBy: examiner
                                  }, activeEncounter.clinicId || activeClinic.id);
                                  setEvolutionFeedback('✓ Evolução clínica registrada com sucesso no encontro!');
                                }

                                setEvolutionText('');
                                setAmendmentReason('');
                                setShowAddEvolution(false);
                                setTimeout(() => setEvolutionFeedback(null), 3000);
                              }}
                              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Salvar Registro Imutável</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {encounterEvolutions.length === 0 ? (
                        <p className="text-xs text-slate-500 italic p-2 bg-white/70 rounded-xl border border-purple-100">
                          Nenhuma evolução complementar registrada para este encontro até o momento.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {encounterEvolutions.map((evo) => (
                            <div
                              key={evo.id}
                              className={`p-3 rounded-xl border text-xs ${
                                evo.type === 'amendment'
                                  ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                                  : 'bg-white border-purple-200 text-slate-900'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-100">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  evo.type === 'amendment'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-purple-600 text-white'
                                }`}>
                                  {evo.type === 'amendment' ? 'Adendo / Retificação' : 'Evolução Clínica'} (v{evo.version})
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {new Date(evo.timestamp).toLocaleDateString('pt-BR')} às {new Date(evo.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {evo.professionalName || evo.createdBy}
                                </span>
                              </div>

                              {evo.amendmentReason && (
                                <div className="mb-1 text-[11px] font-bold text-amber-800 bg-amber-100/70 p-1.5 rounded-lg border border-amber-200">
                                  Motivo do Adendo: {evo.amendmentReason}
                                  {evo.previousContent && (
                                    <div className="text-[10px] font-normal text-slate-600 mt-0.5 line-through">
                                      Texto anterior: {evo.previousContent}
                                    </div>
                                  )}
                                </div>
                              )}

                              <p className="text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                                {evo.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 5. Conduta Clínica Estruturada & Instruções de Retorno */}
                <div className="bg-blue-50/50 border border-blue-200/80 rounded-2xl p-4 space-y-3">
                  <div className="text-[11px] font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                    <span>Conduta Clínica, Orientações & Retorno</span>
                  </div>

                  {/* Conduta Geral */}
                  <div className="bg-white p-3 rounded-xl border border-blue-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Conduta Realizada (Orientações ao Paciente):</span>
                    <p className="text-xs text-slate-900 font-medium whitespace-pre-wrap">
                      {activeEncounter.conduct || 'Prescrição óptica de rotina emitida. Orientações de ergonomia visual.'}
                    </p>
                  </div>

                  {/* Observação Interna da Conduta (Sigilo Clínico) */}
                  {(activeEncounter.internalConductNotes || activeEncounter.structuredConduct?.internalNotes) && (
                    <div className="bg-amber-50/90 p-3 rounded-xl border border-amber-200/90 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-amber-900 uppercase flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-700" />
                          <span>Observação Interna de Conduta (Sigilo Clínico / Uso Interno):</span>
                        </span>
                        <span className="text-[8px] font-bold bg-amber-200/80 text-amber-800 px-1.5 py-0.2 rounded">
                          Não emitido na receita
                        </span>
                      </div>
                      <p className="text-xs text-amber-950 font-medium whitespace-pre-wrap">
                        {activeEncounter.internalConductNotes || activeEncounter.structuredConduct?.internalNotes}
                      </p>
                    </div>
                  )}

                  {/* Campos Estruturados (Plano Terapêutico, Orientações, Encaminhamentos, Exames) */}
                  {activeEncounter.structuredConduct && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {activeEncounter.structuredConduct.treatmentPlan && (
                        <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                          <span className="text-[9px] uppercase font-bold text-blue-700 block">Plano de Tratamento:</span>
                          <p className="text-slate-800 font-medium mt-0.5">{activeEncounter.structuredConduct.treatmentPlan}</p>
                        </div>
                      )}
                      {activeEncounter.structuredConduct.orientations && (
                        <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                          <span className="text-[9px] uppercase font-bold text-blue-700 block">Orientações ao Paciente:</span>
                          <p className="text-slate-800 font-medium mt-0.5">{activeEncounter.structuredConduct.orientations}</p>
                        </div>
                      )}
                      {activeEncounter.structuredConduct.referrals && (
                        <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                          <span className="text-[9px] uppercase font-bold text-indigo-700 block">Encaminhamento Especializado:</span>
                          <p className="text-slate-800 font-medium mt-0.5">{activeEncounter.structuredConduct.referrals}</p>
                        </div>
                      )}
                      {activeEncounter.structuredConduct.requestedExams && activeEncounter.structuredConduct.requestedExams.length > 0 && (
                        <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                          <span className="text-[9px] uppercase font-bold text-purple-700 block">Exames Solicitados:</span>
                          <p className="text-slate-800 font-medium mt-0.5">{activeEncounter.structuredConduct.requestedExams.join(', ')}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Orientação de Retorno */}
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

                {/* 6. Documentos Emitidos do Atendimento (FASE 26) */}
                {(() => {
                  const encounterClinicDocs = offlineDb.getClinicalDocumentsByEncounter(activeEncounter.id);
                  const encounterPrescriptions = offlineDb.getPrescriptionsByEncounter(activeEncounter.id);
                  const hasDocuments = encounterClinicDocs.length > 0 || encounterPrescriptions.length > 0;

                  return (
                    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                          <FileBadge className="w-3.5 h-3.5 text-blue-600" />
                          <span>Documentos Clínicos & Prescrições Emitidas</span>
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-100 text-blue-800">
                            {encounterClinicDocs.length + encounterPrescriptions.length}
                          </span>
                        </div>
                      </div>

                      {!hasDocuments ? (
                        <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-center text-xs text-slate-400 italic">
                          Nenhum documento ou receita formalmente arquivado para esta consulta.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {/* Prescrições Ópticas Registradas */}
                          {encounterPrescriptions.map(rx => (
                            <div key={rx.id} className="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
                                  <Glasses className="w-3 h-3" />
                                  <span>Receita Óptica (v{rx.version || 1})</span>
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {new Date(rx.date).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              <div className="text-[11px] font-mono text-slate-700 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                <div>OD: {rx.od?.sphere ? (rx.od.sphere > 0 ? `+${rx.od.sphere.toFixed(2)}` : rx.od.sphere.toFixed(2)) : '0.00'} {rx.od?.cylinder ? `${rx.od.cylinder > 0 ? `+${rx.od.cylinder.toFixed(2)}` : rx.od.cylinder.toFixed(2)} x ${rx.od.axis || 0}°` : ''}</div>
                                <div>OE: {rx.oe?.sphere ? (rx.oe.sphere > 0 ? `+${rx.oe.sphere.toFixed(2)}` : rx.oe.sphere.toFixed(2)) : '0.00'} {rx.oe?.cylinder ? `${rx.oe.cylinder > 0 ? `+${rx.oe.cylinder.toFixed(2)}` : rx.oe.cylinder.toFixed(2)} x ${rx.oe.axis || 0}°` : ''}</div>
                                {rx.addition && <div>Adição: +{rx.addition.toFixed(2)} ({rx.lensType || 'Multifocal'})</div>}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center justify-between">
                                <span>Por: {rx.examinerName || 'Dr. Rudson Meirelles'}</span>
                                {rx.supersedesId && (
                                  <span className="text-amber-600 font-bold" title={`Substitui ${rx.supersedesId}`}>
                                    Substitui anterior
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Documentos Clínicos Gerais (Laudos, Atestados, Encaminhamentos, Exames) */}
                          {encounterClinicDocs.map(doc => {
                            const badgeColor = 
                              doc.type === 'medical_prescription' ? 'bg-purple-100 text-purple-800' :
                              doc.type === 'exam_request' ? 'bg-indigo-100 text-indigo-800' :
                              doc.type === 'referral_letter' ? 'bg-amber-100 text-amber-800' :
                              doc.type === 'medical_certificate' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800';

                            return (
                              <div key={doc.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${badgeColor}`}>
                                    {doc.type === 'medical_prescription' ? 'Receituário Farmacológico' :
                                     doc.type === 'exam_request' ? 'Solicitação de Exames' :
                                     doc.type === 'referral_letter' ? 'Encaminhamento' :
                                     doc.type === 'medical_certificate' ? 'Atestado / Declaração' : 'Relatório Clínico'} (v{doc.version || 1})
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    {new Date(doc.issuedAt).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                <strong className="text-xs text-slate-900 block truncate">{doc.title}</strong>
                                <p className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100 whitespace-pre-wrap">
                                  {doc.content}
                                </p>
                                <div className="text-[10px] text-slate-500 flex items-center justify-between">
                                  <span>Assinado por: {doc.professionalName}</span>
                                  <span className="text-emerald-600 font-bold">✓ Auditado</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
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
