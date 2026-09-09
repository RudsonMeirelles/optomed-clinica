import React, { useState } from 'react';
import { DEFAULT_CLINICAL_PROTOCOLS, ClinicalProtocol, ProtocolStep } from '@optotipo/shared';
import { Workflow, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';

interface QuickProtocolsProps {
  onSelectModule: (module: any) => void;
}

export const QuickProtocols: React.FC<QuickProtocolsProps> = ({ onSelectModule }) => {
  const [selectedProtocol, setSelectedProtocol] = useState<ClinicalProtocol>(DEFAULT_CLINICAL_PROTOCOLS[0]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const step: ProtocolStep = selectedProtocol.steps[currentStepIndex] || selectedProtocol.steps[0];

  const handleNext = () => {
    if (currentStepIndex < selectedProtocol.steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      onSelectModule(selectedProtocol.steps[nextIdx].module);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      onSelectModule(selectedProtocol.steps[prevIdx].module);
    }
  };

  const handleJumpToStep = (idx: number) => {
    setCurrentStepIndex(idx);
    onSelectModule(selectedProtocol.steps[idx].module);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 text-slate-100 select-none">
      {/* Barra Superior */}
      <div className="w-full bg-slate-950 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <Workflow className="w-5 h-5 text-blue-400" />
          <span className="font-bold text-slate-100 text-sm">PROTOCOLOS RÁPIDOS DE ATENDIMENTO</span>
        </div>

        <div className="flex items-center gap-2">
          {DEFAULT_CLINICAL_PROTOCOLS.map((proto: ClinicalProtocol) => (
            <button
              key={proto.id}
              onClick={() => {
                setSelectedProtocol(proto);
                setCurrentStepIndex(0);
              }}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                selectedProtocol.id === proto.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {proto.name}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo do Protocolo Atual */}
      <div className="flex-1 w-full p-8 flex flex-col items-center justify-center max-w-4xl mx-auto">
        <div className="w-full bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col">
          {/* Cabeçalho do Protocolo */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div>
              <h2 className="text-2xl font-black text-white">{selectedProtocol.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{selectedProtocol.description}</p>
            </div>

            <div className="bg-blue-950/60 border border-blue-800 px-3 py-1 rounded-full text-blue-300 font-mono text-xs font-bold">
              ETAPA {currentStepIndex + 1} DE {selectedProtocol.steps.length}
            </div>
          </div>

          {/* Destaque da Etapa Atual */}
          <div className="p-6 bg-slate-900 border-2 border-blue-500/80 rounded-2xl mb-8 flex items-center justify-between">
            <div>
              <span className="text-xs text-blue-400 font-bold uppercase tracking-wider block mb-1">
                AÇÃO EM EXECUÇÃO:
              </span>
              <h3 className="text-xl font-bold text-white mb-1">{step.title}</h3>
              <p className="text-sm text-slate-300">{step.description}</p>
            </div>

            <button
              onClick={() => onSelectModule(step.module)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 text-sm active:scale-95 transition-transform"
            >
              Abrir Teste na TV
            </button>
          </div>

          {/* Lista de Todas as Etapas do Protocolo */}
          <div className="space-y-2 mb-8">
            {selectedProtocol.steps.map((s: ProtocolStep, idx: number) => (
              <div
                key={s.stepNumber}
                onClick={() => handleJumpToStep(idx)}
                className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                  currentStepIndex === idx
                    ? 'bg-blue-600/20 border border-blue-500 text-white'
                    : idx < currentStepIndex
                    ? 'bg-slate-900/40 text-slate-500 border border-slate-800/50'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx < currentStepIndex ? 'bg-emerald-600 text-white' : currentStepIndex === idx ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {idx < currentStepIndex ? <CheckCircle className="w-4 h-4" /> : s.stepNumber}
                  </div>
                  <span className="font-semibold text-sm">{s.title}</span>
                </div>

                <span className="text-xs font-mono text-slate-500 uppercase">{s.module.replace('_', ' ')}</span>
              </div>
            ))}
          </div>

          {/* Navegação Anterior / Próximo */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-5">
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-xl text-sm font-bold flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Etapa Anterior
            </button>

            <button
              onClick={handleNext}
              disabled={currentStepIndex === selectedProtocol.steps.length - 1}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30"
            >
              Próxima Etapa <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
