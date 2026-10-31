import React, { useState, useEffect } from 'react';
import { Sparkles, Compass, Check, ArrowRight, Pill, Calendar, ShieldCheck, HeartPulse, Search, X, BookOpen, AlertCircle, Trash2, Plus, CheckSquare, Square, RotateCcw } from 'lucide-react';
import { THERAPEUTIC_PROTOCOLS_DATABASE, TherapeuticProtocol, ClinicalProtocolDrug } from '../services/therapeuticProtocolsDb';
import { OPHTHALMIC_DRUGS_DATABASE, OphthalmicDrug } from '../services/ophthalmicDrugsDb';

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
  const [currentDrugs, setCurrentDrugs] = useState<ClinicalProtocolDrug[]>(THERAPEUTIC_PROTOCOLS_DATABASE[0].suggestedDrugs);
  const [selectedDrugIndices, setSelectedDrugIndices] = useState<Set<number>>(
    new Set(THERAPEUTIC_PROTOCOLS_DATABASE[0].suggestedDrugs.map((_, i) => i))
  );
  const [appliedId, setAppliedId] = useState<string | null>(null);

  // Modal interno para adicionar outro fármaco do banco
  const [isAddDrugModalOpen, setIsAddDrugModalOpen] = useState<boolean>(false);
  const [drugSearchQuery, setDrugSearchQuery] = useState<string>('');

  // Ao trocar de protocolo, reseta a lista de medicamentos e seleções
  useEffect(() => {
    setCurrentDrugs([...selectedProtocol.suggestedDrugs]);
    setSelectedDrugIndices(new Set(selectedProtocol.suggestedDrugs.map((_, i) => i)));
  }, [selectedProtocol]);

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

  // Alterna seleção individual de um fármaco (checkbox)
  const handleToggleDrug = (index: number) => {
    setSelectedDrugIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Excluir definitivamente o fármaco do tratamento sugerido
  const handleDeleteDrug = (index: number) => {
    const updated = currentDrugs.filter((_, i) => i !== index);
    setCurrentDrugs(updated);
    // Reajusta os índices selecionados
    setSelectedDrugIndices(prev => {
      const next = new Set<number>();
      Array.from(prev).forEach(idx => {
        if (idx < index) next.add(idx);
        else if (idx > index) next.add(idx - 1);
      });
      return next;
    });
  };

  // Restaurar fármacos padrão do protocolo original
  const handleResetDrugs = () => {
    setCurrentDrugs([...selectedProtocol.suggestedDrugs]);
    setSelectedDrugIndices(new Set(selectedProtocol.suggestedDrugs.map((_, i) => i)));
  };

  // Adicionar fármaco do catálogo oftálmico ao protocolo
  const handleAddDrugFromDatabase = (drug: OphthalmicDrug) => {
    const newDrug: ClinicalProtocolDrug = {
      commercialName: drug.commercialName,
      activePrinciple: drug.activePrinciple,
      concentration: drug.concentration,
      presentation: drug.presentation,
      dosage: drug.defaultPosology,
      route: drug.category === 'SUPLEMENTO' ? 'Uso Oral' : 'Uso Tópico Ocular',
      quantity: '1 frasco'
    };
    setCurrentDrugs(prev => {
      const updated = [...prev, newDrug];
      setSelectedDrugIndices(curr => new Set([...Array.from(curr), updated.length - 1]));
      return updated;
    });
    setIsAddDrugModalOpen(false);
    setDrugSearchQuery('');
  };

  // Obter apenas os fármacos que estão selecionados pelo examinador
  const getActiveDrugs = (): ClinicalProtocolDrug[] => {
    return currentDrugs.filter((_, idx) => selectedDrugIndices.has(idx));
  };

  const handleApply = (proto: TherapeuticProtocol) => {
    const effectiveProtocol: TherapeuticProtocol = {
      ...proto,
      suggestedDrugs: getActiveDrugs()
    };
    onApplyPlan(effectiveProtocol);
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-black text-indigo-950 uppercase text-xs flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-indigo-600" /> 2. Prescrição Farmacológica Sugerida ({getActiveDrugs().length} de {currentDrugs.length} selecionado{currentDrugs.length === 1 ? '' : 's'}):
                    </h4>
                    <p className="text-[11px] text-indigo-700 mt-0.5">
                      Marque/desmarque os fármacos desejados ou exclua os que não deseja prescrever.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddDrugModalOpen(true)}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                      title="Adicionar medicamento do catálogo oftálmico"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Fármaco
                    </button>
                    {currentDrugs.length !== selectedProtocol.suggestedDrugs.length || selectedDrugIndices.size !== currentDrugs.length ? (
                      <button
                        type="button"
                        onClick={handleResetDrugs}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        title="Restaurar lista original do protocolo"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Restaurar Padrão
                      </button>
                    ) : null}
                  </div>
                </div>

                {currentDrugs.length === 0 ? (
                  <div className="p-4 bg-white/80 border border-dashed border-indigo-300 rounded-xl text-center space-y-2">
                    <p className="text-xs text-indigo-900 font-medium">Nenhum fármaco na lista deste tratamento.</p>
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddDrugModalOpen(true)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                      >
                        Adicionar Medicamento
                      </button>
                      <button
                        type="button"
                        onClick={handleResetDrugs}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg cursor-pointer"
                      >
                        Restaurar Padrão
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {currentDrugs.map((drug, i) => {
                      const isChecked = selectedDrugIndices.has(i);

                      return (
                        <div
                          key={i}
                          className={`p-3 rounded-xl border transition-all ${
                            isChecked
                              ? 'bg-white border-indigo-200 shadow-xs'
                              : 'bg-slate-50/80 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            {/* Checkbox para selecionar/desmarcar */}
                            <button
                              type="button"
                              onClick={() => handleToggleDrug(i)}
                              className="flex items-start gap-2.5 text-left flex-1 cursor-pointer group"
                            >
                              <div className="mt-0.5 shrink-0 text-indigo-600 group-hover:scale-110 transition-transform">
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className={`font-black text-xs ${isChecked ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
                                    {drug.commercialName}
                                  </span>
                                  <span className="text-slate-500 font-normal text-[11px]">
                                    ({drug.activePrinciple})
                                  </span>
                                  {drug.presentation && (
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      &bull; {drug.presentation}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 text-slate-700 leading-relaxed font-medium text-xs">
                                  <b>Posologia:</b> {drug.dosage}
                                </div>
                              </div>
                            </button>

                            {/* Badge e Botão de Excluir */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                                {drug.route} &bull; Qtd: {drug.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteDrug(i)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Excluir este fármaco do tratamento sugerido"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                  disabled={getActiveDrugs().length === 0}
                  onClick={() => {
                    const active = getActiveDrugs();
                    if (active.length === 0) return;
                    onGenerateMedicalPrescription(active);
                    onClose();
                  }}
                  className={`px-4 py-2 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    getActiveDrugs().length === 0
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 active:scale-95'
                  }`}
                  title={getActiveDrugs().length === 0 ? 'Nenhum medicamento selecionado' : 'Gerar receita com os medicamentos selecionados'}
                >
                  <Pill className="w-4 h-4" />
                  <span>Emitir Receita ({getActiveDrugs().length})</span>
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

        {/* Modal Interno para Adicionar Fármaco do Catálogo Oftálmico */}
        {isAddDrugModalOpen && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
              {/* Cabeçalho */}
              <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-sm">Adicionar Medicamento ao Tratamento</h3>
                </div>
                <button
                  onClick={() => setIsAddDrugModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Busca */}
              <div className="p-3 border-b border-slate-200 bg-slate-50 shrink-0">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={drugSearchQuery}
                    onChange={(e) => setDrugSearchQuery(e.target.value)}
                    placeholder="Buscar por nome comercial, princípio ativo ou indicação..."
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                </div>
              </div>

              {/* Lista de Fármacos Disponíveis */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {OPHTHALMIC_DRUGS_DATABASE.filter(d => {
                  const q = drugSearchQuery.toLowerCase().trim();
                  if (!q) return true;
                  return (
                    d.commercialName.toLowerCase().includes(q) ||
                    d.activePrinciple.toLowerCase().includes(q) ||
                    d.indication.toLowerCase().includes(q)
                  );
                }).map(drug => (
                  <div
                    key={drug.id}
                    className="p-3 border border-slate-200 hover:border-indigo-300 rounded-xl hover:bg-indigo-50/40 transition-colors flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-black text-slate-900">{drug.commercialName}</span>
                        <span className="text-slate-500 text-[11px]">({drug.activePrinciple})</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {drug.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        <b>Apresentação:</b> {drug.presentation} &bull; {drug.concentration}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        <b>Posologia Padrão:</b> {drug.defaultPosology}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddDrugFromDatabase(drug)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  </div>
                ))}
              </div>

              {/* Rodapé */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddDrugModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
