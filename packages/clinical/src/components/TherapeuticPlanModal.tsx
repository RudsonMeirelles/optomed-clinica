import React, { useState } from 'react';
import { Sparkles, Compass, Check, ArrowRight, Pill, Calendar, ShieldCheck, HeartPulse, Search, X, BookOpen, AlertCircle } from 'lucide-react';
import { THERAPEUTIC_PROTOCOLS_DATABASE, TherapeuticProtocol, ClinicalProtocolDrug } from '../services/therapeuticProtocolsDb';

interface TherapeuticPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPlan: (protocol: TherapeuticProtocol) => void;
  onGenerateMedicalPrescription: (drugs: ClinicalProtocolDrug[]) => void;
}

const CATEGORY_TAGS: Record<TherapeuticProtocol['category'], { label: string; color: string }> = {
  SUPERFICIE_OCULAR: { label: 'Superfície Ocular & Córnea', color: 'bg-sky-100 text-sky-800 border-sky-300' },
  ALERGIA: { label: 'Alergia & Prurido', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  INFECCAO: { label: 'Infecções & Inflamações', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  PALPEBRAS: { label: 'Pálpebras & Meibomius', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  REFRAVAO_ASTENOPIA: { label: 'Astenopia & Telas (CVS)', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  RETINA_GLAUCOMA: { label: 'Retina & Prevenção', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
};

export const TherapeuticPlanModal: React.FC<TherapeuticPlanModalProps> = ({
  isOpen,
  onClose,
  onApplyPlan,
  onGenerateMedicalPrescription
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProtocol, setSelectedProtocol] = useState<TherapeuticProtocol>(THERAPEUTIC_PROTOCOLS_DATABASE[0]);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredProtocols = THERAPEUTIC_PROTOCOLS_DATABASE.filter(proto => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      proto.clinicalCondition.toLowerCase().includes(q) ||
      proto.summary.toLowerCase().includes(q) ||
      proto.suggestedDrugs.some(d => d.commercialName.toLowerCase().includes(q) || d.activePrinciple.toLowerCase().includes(q))
    );
  });

  const handleApply = (proto: TherapeuticProtocol) => {
    onApplyPlan(proto);
    setAppliedId(proto.id);
    setTimeout(() => {
      setAppliedId(null);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[94vh] text-slate-900 border border-slate-300 flex flex-col overflow-hidden">
        
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/30">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-sm sm:text-base tracking-wide text-white">
                  PLANOS TERAPÊUTICOS & PROTOCOLOS CLÍNICOS GUIADOS
                </h2>
                <span className="px-2 py-0.5 bg-blue-500/30 border border-blue-400/40 rounded-full text-[10px] font-bold text-blue-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-300" /> Sugestão Autônoma
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Selecione o quadro clínico para traçar automaticamente a conduta, prescrição farmacológica e retorno
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo: Lista Lateral de Quadros Clínicos + Painel Detalhado */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          
          {/* Coluna Esquerda: Lista de Quadros Clínicos (4 cols) */}
          <div className="md:col-span-4 bg-slate-50 border-r border-slate-200 flex flex-col overflow-hidden">
            
            {/* Campo de Busca */}
            <div className="p-3 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar quadro clínico ou queixa..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Lista com scroll */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {filteredProtocols.map(proto => {
                const isSelected = selectedProtocol.id === proto.id;
                const tag = CATEGORY_TAGS[proto.category];

                return (
                  <button
                    key={proto.id}
                    onClick={() => setSelectedProtocol(proto)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.01]'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        isSelected ? 'bg-blue-700 border-blue-500 text-blue-100' : tag.color
                      }`}>
                        {tag.label}
                      </span>
                    </div>

                    <h4 className={`font-black text-xs leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                      {proto.clinicalCondition}
                    </h4>

                    <p className={`text-[11px] mt-1 line-clamp-2 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                      {proto.summary}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coluna Direita: Detalhes do Plano Terapêutico Selecionado (8 cols) */}
          <div className="md:col-span-8 flex flex-col bg-white overflow-hidden">
            
            {/* Conteúdo com Scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-800">
              
              {/* Título e Resumo */}
              <div className="border-b border-slate-200 pb-4">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${CATEGORY_TAGS[selectedProtocol.category].color}`}>
                  {CATEGORY_TAGS[selectedProtocol.category].label}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2">
                  {selectedProtocol.clinicalCondition}
                </h3>
                <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                  {selectedProtocol.summary}
                </p>
              </div>

              {/* 1. Medidas Não Farmacológicas / Comportamentais */}
              <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-2">
                <h4 className="font-black text-sky-950 uppercase text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-600" /> 1. Medidas Não Farmacológicas & Higiene:
                </h4>
                <ul className="space-y-1.5 pl-1">
                  {selectedProtocol.nonPharmacologicalActions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2 text-sky-900 font-medium leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 2. Prescrição Farmacológica Sugerida */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-indigo-950 uppercase text-xs flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-indigo-600" /> 2. Prescrição Farmacológica Sugerida (Doses & Posologia):
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {selectedProtocol.suggestedDrugs.map((drug, i) => (
                    <div key={i} className="bg-white p-3 rounded-xl border border-indigo-200 shadow-xs space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <div className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span>{drug.commercialName}</span>
                          <span className="text-slate-500 font-normal text-[11px]">({drug.activePrinciple})</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                          {drug.route} &bull; Qtd: {drug.quantity}
                        </span>
                      </div>

                      <div className="pl-6 pt-1 text-slate-700 leading-relaxed font-medium">
                        <b>Posologia:</b> {drug.dosage}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Tempo e Indicação de Retorno */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1.5">
                <h4 className="font-black text-emerald-950 uppercase text-xs flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" /> 3. Tempo de Retorno Recomendado:
                </h4>
                <p className="text-emerald-900 font-bold leading-relaxed pl-1">
                  {selectedProtocol.recommendedReturn}
                </p>
              </div>

              {/* 4. Orientações ao Paciente */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-700">
                <span className="font-bold text-slate-900 block text-[11px]">Orientações Educativas ao Paciente:</span>
                <p className="leading-relaxed">{selectedProtocol.patientGuidance}</p>
              </div>

              {/* Alertas se houver */}
              {selectedProtocol.warnings && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed">{selectedProtocol.warnings}</span>
                </div>
              )}

            </div>

            {/* Barra Inferior de Ações com 1 Clique */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Baseado no Conselho Brasileiro de Oftalmologia (CBO).</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Botão 1: Gerar Receita Farmacológica Direta */}
                <button
                  type="button"
                  onClick={() => {
                    onGenerateMedicalPrescription(selectedProtocol.suggestedDrugs);
                    onClose();
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Pill className="w-4 h-4" />
                  <span>Emitir Receita de Medicamentos</span>
                </button>

                {/* Botão 2: Aplicar Plano Terapêutico no Prontuário */}
                <button
                  type="button"
                  onClick={() => handleApply(selectedProtocol)}
                  className={`px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer ${
                    appliedId === selectedProtocol.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                  }`}
                >
                  {appliedId === selectedProtocol.id ? (
                    <>
                      <Check className="w-4 h-4" /> Plano Aplicado com Sucesso!
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Aplicar Plano Completo na Conduta
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
