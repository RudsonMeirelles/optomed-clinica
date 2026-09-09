import React, { useState, useEffect } from 'react';
import { calculateOptotypeHeightMm, mmToPixels, STANDARD_ACUITY_LEVELS } from '@optotipo/shared';
import { OptotypeRenderer } from '../components/OptotypeRenderer';
import { lanPairingService } from '../services/lanPairingService';
import { ArrowLeft, Shuffle, ChevronUp, ChevronDown } from 'lucide-react';

interface BichromaticTestProps {
  distanceMeters?: number;
  pixelsPerMm?: number;
  onBackToMenu?: () => void;
}

export const BichromaticTest: React.FC<BichromaticTestProps> = ({ 
  distanceMeters = 3.5, 
  pixelsPerMm,
  onBackToMenu 
}) => {
  const [acuityIndex, setAcuityIndex] = useState<number>(10); // Padrão 20/30
  const [stimulusType, setStimulusType] = useState<'sloan' | 'numbers' | 'tumbling_e' | 'rings'>('sloan');
  const [seed, setSeed] = useState<number>(0);

  const currentAcuity = STANDARD_ACUITY_LEVELS[acuityIndex] || STANDARD_ACUITY_LEVELS[10];
  const safePpm = Math.max(1, pixelsPerMm || 2.5);
  const heightMm = calculateOptotypeHeightMm(currentAcuity.relativeScale, distanceMeters);
  const sizePx = Math.max(16, mmToPixels(heightMm, safePpm));

  const randomize = () => {
    setSeed(prev => prev + 1);
  };

  const increaseAcuity = () => {
    setAcuityIndex(prev => Math.min(STANDARD_ACUITY_LEVELS.length - 1, prev + 1));
  };

  const decreaseAcuity = () => {
    setAcuityIndex(prev => Math.max(0, prev - 1));
  };

  // Suporte a controle remoto da TV e teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        decreaseAcuity();
      } else if (e.key === 'ArrowDown') {
        increaseAcuity();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        setStimulusType(prev => {
          if (prev === 'sloan') return 'numbers';
          if (prev === 'numbers') return 'tumbling_e';
          if (prev === 'tumbling_e') return 'rings';
          return 'sloan';
        });
      } else if (e.key === 'Enter' || e.key === ' ') {
        randomize();
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        onBackToMenu?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBackToMenu]);

  // Suporte a comandos LAN
  useEffect(() => {
    const unsubscribe = lanPairingService.onMessage((msg) => {
      if (msg.type === 'SET_ACUITY') {
        const foundIdx = STANDARD_ACUITY_LEVELS.findIndex(l => l.snellen20 === msg.snellen);
        if (foundIdx !== -1) setAcuityIndex(foundIdx);
      } else if (msg.type === 'NEXT_LINE') {
        increaseAcuity();
      } else if (msg.type === 'PREV_LINE') {
        decreaseAcuity();
      } else if (msg.type === 'RANDOMIZE') {
        randomize();
      }
    });
    return () => unsubscribe();
  }, []);

  // Pares de optotipos
  const sloanPairs = [
    { red: ['C', 'O', 'E'], green: ['C', 'O', 'E'] },
    { red: ['D', 'F', 'Z'], green: ['D', 'F', 'Z'] },
    { red: ['H', 'K', 'N'], green: ['H', 'K', 'N'] },
    { red: ['P', 'R', 'V'], green: ['P', 'R', 'V'] }
  ];
  const currentPair = sloanPairs[seed % sloanPairs.length];

  const numberPairs = [
    { red: ['8', '5', '3'], green: ['8', '5', '3'] },
    { red: ['6', '9', '2'], green: ['6', '9', '2'] },
    { red: ['4', '7', '8'], green: ['4', '7', '8'] },
    { red: ['3', '6', '5'], green: ['3', '6', '5'] }
  ];
  const currentNumPair = numberPairs[seed % numberPairs.length];

  // Espaçamento de 2,0 cm (20 mm) físico na tela entre cada optotipo
  const gap2cmPx = Math.round(20 * safePpm);
  const bichromaticGapPx = Math.max(75, gap2cmPx);

  return (
    <div className="w-full h-full flex flex-col select-none bg-slate-950 text-white relative overflow-hidden">
      {/* Barra Superior de Controles Clicáveis */}
      <div className="w-full bg-slate-900 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between text-xs text-slate-300 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToMenu}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4 text-blue-400" />
            <span>Voltar</span>
          </button>
          <span className="font-black text-white text-sm">TESTE BICROMÁTICO (VERMELHO / VERDE)</span>
          
          <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700">
            {(['sloan', 'numbers', 'tumbling_e', 'rings'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setStimulusType(t)}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  stimulusType === t ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'sloan' ? 'Letras' : t === 'numbers' ? 'Números' : t === 'tumbling_e' ? 'Tumbling E' : 'Anéis'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Badge de Acuidade Atual */}
          <span className="font-mono font-black text-sm bg-blue-950 text-blue-300 border border-blue-800 px-3.5 py-1 rounded-xl shadow-inner">
            {currentAcuity.snellen20} ({currentAcuity.decimal.toFixed(2)})
          </span>

          {/* Botões de Alteração de Tamanho */}
          <div className="flex items-center gap-1.5 bg-slate-800 p-0.5 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={decreaseAcuity}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Aumentar tamanho do optotipo (Linha maior)"
            >
              <ChevronUp className="w-4 h-4 text-emerald-400" /> Letra Maior
            </button>
            <button
              type="button"
              onClick={increaseAcuity}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Diminuir tamanho do optotipo (Linha menor)"
            >
              <ChevronDown className="w-4 h-4 text-amber-400" /> Letra Menor
            </button>
          </div>

          <button
            type="button"
            onClick={randomize}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            <Shuffle className="w-3.5 h-3.5" /> Randomizar
          </button>
        </div>
      </div>

      {/* Painel Duplo Dividido: Vermelho (#DC2626) e Verde (#16A34A) */}
      <div className="flex-1 w-full flex relative overflow-hidden">
        {/* Painel Vermelho */}
        <div className="flex-1 bg-[#DC2626] flex items-center justify-center p-6 sm:p-8 transition-all overflow-hidden">
          <div 
            className="flex items-center justify-center flex-nowrap max-w-full"
            style={{ gap: `${bichromaticGapPx}px` }}
          >
            {stimulusType === 'rings' ? (
              <div
                style={{ 
                  width: `${sizePx}px`, 
                  height: `${sizePx}px`, 
                  minWidth: `${sizePx}px`, 
                  minHeight: `${sizePx}px`, 
                  borderWidth: `${Math.max(3, sizePx / 5)}px` 
                }}
                className="rounded-full border-black box-border flex-shrink-0"
              />
            ) : stimulusType === 'numbers' ? (
              currentNumPair.red.map((num, idx) => (
                <div key={`red-num-${idx}-${seed}`} className="flex items-center justify-center flex-shrink-0" style={{ width: `${sizePx}px`, height: `${sizePx}px` }}>
                  <OptotypeRenderer type="numbers" value={num} sizePx={sizePx} color="#000000" />
                </div>
              ))
            ) : stimulusType === 'tumbling_e' ? (
              <>
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: `${sizePx}px`, height: `${sizePx}px` }}>
                  <OptotypeRenderer type="tumbling_e" value="E" orientation={0} sizePx={sizePx} color="#000000" />
                </div>
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: `${sizePx}px`, height: `${sizePx}px` }}>
                  <OptotypeRenderer type="tumbling_e" value="E" orientation={90} sizePx={sizePx} color="#000000" />
                </div>
              </>
            ) : (
              currentPair.red.map((l, idx) => (
                <div key={`red-sloan-${idx}-${seed}`} className="flex items-center justify-center flex-shrink-0" style={{ width: `${sizePx}px`, height: `${sizePx}px` }}>
                  <OptotypeRenderer type="sloan" value={l} sizePx={sizePx} color="#000000" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Linha Divisória de Centro */}
        <div className="w-1.5 bg-black h-full z-10" />

        {/* Painel Verde */}
        <div className="flex-1 bg-[#16A34A] flex items-center justify-center p-6 sm:p-8 transition-all overflow-hidden">
          <div 
            className="flex items-center justify-center flex-nowrap max-w-full"
            style={{ gap: `${bichromaticGapPx}px` }}
          >
            {stimulusType === 'rings' ? (
              <div
                style={{ 
                  width: `${sizePx}px`, 
                  height: `${sizePx}px`, 
                  minWidth: `${sizePx}px`, 
                  minHeight: `${sizePx}px`, 
                  borderWidth: `${Math.max(3, sizePx / 5)}px` 
                }}
                className="rounded-full border-black box-border flex-shrink-0"
              />
            ) : stimulusType === 'numbers' ? (
              currentNumPair.green.map((num, idx) => (
                <div key={`green-num-${idx}-${seed}`} className="flex items-center justify-center flex-shrink-0" style={{ width: `${sizePx}px`, height: `${sizePx}px` }}>
                  <OptotypeRenderer type="numbers" value={num} sizePx={sizePx} color="#000000" />
                </div>
              ))
            ) : stimulusType === 'tumbling_e' ? (
              <>
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: `${sizePx}px`, height: `${sizePx}px` }}>
                  <OptotypeRenderer type="tumbling_e" value="E" orientation={180} sizePx={sizePx} color="#000000" />
                </div>
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: `${sizePx}px`, height: `${sizePx}px` }}>
                  <OptotypeRenderer type="tumbling_e" value="E" orientation={270} sizePx={sizePx} color="#000000" />
                </div>
              </>
            ) : (
              currentPair.green.map((l, idx) => (
                <div key={`green-sloan-${idx}-${seed}`} className="flex items-center justify-center flex-shrink-0" style={{ width: `${sizePx}px`, height: `${sizePx}px` }}>
                  <OptotypeRenderer type="sloan" value={l} sizePx={sizePx} color="#000000" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Guia Clínico Inferior */}
      <div className="w-full bg-slate-950 border-t border-slate-800 px-6 py-2 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-6 font-medium">
          <span><strong className="text-red-400">Mais nítido no Vermelho:</strong> Subcorrigido para miopia (Adicionar Esférico -)</span>
          <span><strong className="text-emerald-400">Mais nítido no Verde:</strong> Supercorrigido para miopia (Adicionar Esférico +)</span>
          <span className="text-white font-black bg-slate-800 px-2.5 py-0.5 rounded-full">Iguais = Equilíbrio Perfeito</span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">Use [▲ / ▼] no controle remoto para mudar o tamanho</span>
      </div>
    </div>
  );
};
