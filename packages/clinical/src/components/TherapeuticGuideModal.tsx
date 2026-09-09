import React, { useState } from 'react';
import { Pill, Search, Plus, Check, Sparkles, BookOpen, X, ShieldAlert, HeartPulse } from 'lucide-react';
import { OPHTHALMIC_DRUGS_DATABASE, OphthalmicDrug } from '../services/ophthalmicDrugsDb';

interface TherapeuticGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDrug: (drug: OphthalmicDrug, customizedDosage?: string) => void;
}

const CATEGORY_LABELS: Record<OphthalmicDrug['category'], { label: string; color: string }> = {
  LUBRIFICANTE: { label: 'Lubrificantes & Lágrimas', color: 'bg-sky-100 text-sky-800 border-sky-300' },
  ANTIALERGICO: { label: 'Antialérgicos Oculares', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  ANTI_INFLAMATORIO: { label: 'Anti-inflamatórios', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  ANTIBIOTICO: { label: 'Antibióticos & Associações', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  HIPOTENSOR: { label: 'Hipotensores (Glaucoma)', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  MIDRIATICO_CICLOPLEGICO: { label: 'Midriáticos / Cicloplégicos', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  SUPLEMENTO: { label: 'Suplementos Retinianos (AREDS 2)', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
};

export const TherapeuticGuideModal: React.FC<TherapeuticGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectDrug
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredDrugs = OPHTHALMIC_DRUGS_DATABASE.filter(drug => {
    const matchesCategory = selectedCategory === 'all' || drug.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = !query || 
      drug.commercialName.toLowerCase().includes(query) ||
      drug.activePrinciple.toLowerCase().includes(query) ||
      drug.indication.toLowerCase().includes(query) ||
      drug.presentation.toLowerCase().includes(query);

    return matchesCategory && matchesQuery;
  });

  const handleApplyDrug = (drug: OphthalmicDrug) => {
    onSelectDrug(drug, drug.defaultPosology);
    setCopiedId(drug.id);
    setTimeout(() => {
      setCopiedId(null);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] text-slate-900 border border-slate-300 flex flex-col overflow-hidden">
        
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/30">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-sm sm:text-base tracking-wide text-white">
                  GUIA TERAPÊUTICO & BANCO DE FÁRMACOS OFTÁLMICOS
                </h2>
                <span className="px-2 py-0.5 bg-indigo-500/30 border border-indigo-400/40 rounded-full text-[10px] font-bold text-indigo-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-300" /> Sugestões Clínicas
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Posologias, protocolos baseados em literatura médica e condutas terapêuticas
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

        {/* Barra de Busca e Filtros por Categoria */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome comercial (ex: Hyabak, Patanol), princípio ativo (ex: Carmelose) ou indicação (ex: Olho Seco)..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-sm"
              autoFocus
            />
          </div>

          {/* Categorias */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todos ({OPHTHALMIC_DRUGS_DATABASE.length})
            </button>

            {(Object.keys(CATEGORY_LABELS) as OphthalmicDrug['category'][]).map((cat) => {
              const count = OPHTHALMIC_DRUGS_DATABASE.filter(d => d.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{CATEGORY_LABELS[cat].label}</span>
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista de Fármacos em Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDrugs.length === 0 ? (
            <div className="col-span-2 py-12 text-center text-slate-500 space-y-2">
              <Pill className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-sm">Nenhum medicamento encontrado para os termos pesquisados.</p>
              <p className="text-xs text-slate-400">Tente buscar por outro termo ou selecione todas as categorias.</p>
            </div>
          ) : (
            filteredDrugs.map((drug) => {
              const catInfo = CATEGORY_LABELS[drug.category];
              const isCopied = copiedId === drug.id;

              return (
                <div
                  key={drug.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all p-4 flex flex-col justify-between shadow-sm hover:shadow-md"
                >
                  <div className="space-y-2.5">
                    {/* Topo do Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-sm text-slate-900">{drug.commercialName}</h3>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catInfo.color}`}>
                            {catInfo.label}
                          </span>
                        </div>
                        <p className="text-xs text-indigo-700 font-semibold mt-0.5">
                          {drug.activePrinciple} ({drug.concentration}) &bull; <span className="text-slate-500 font-normal">{drug.presentation}</span>
                        </p>
                      </div>
                    </div>

                    {/* Indicação Clínica */}
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <span className="font-bold text-slate-700 block mb-0.5 text-[11px]">Indicação Principal:</span>
                      <p className="text-slate-600 leading-relaxed">{drug.indication}</p>
                    </div>

                    {/* Posologia Sugerida */}
                    <div className="p-2.5 bg-indigo-50/60 border border-indigo-200/80 rounded-xl text-xs space-y-1">
                      <span className="font-black text-indigo-950 uppercase text-[10px] tracking-wide flex items-center gap-1">
                        <HeartPulse className="w-3.5 h-3.5 text-indigo-600" /> Posologia Padrão Sugerida:
                      </span>
                      <p className="text-indigo-900 font-bold leading-relaxed">{drug.defaultPosology}</p>
                    </div>

                    {/* Notas Clínicas / Alertas se houver */}
                    {drug.clinicalNotes && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-start gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>{drug.clinicalNotes}</span>
                      </div>
                    )}
                  </div>

                  {/* Ações do Card */}
                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 font-medium">Literatura Médica Atualizada</span>
                    
                    <button
                      onClick={() => handleApplyDrug(drug)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Inserido com Sucesso!
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" /> Inserir na Conduta & Receita
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé Informativo */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Base farmacológica conforme CBO e diretrizes oftálmicas internacionais.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl"
          >
            Fechar Guia
          </button>
        </div>

      </div>
    </div>
  );
};
