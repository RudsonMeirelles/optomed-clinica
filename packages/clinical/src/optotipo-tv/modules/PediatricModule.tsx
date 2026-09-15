import React, { useState, useEffect } from 'react';
import { 
  STANDARD_ACUITY_LEVELS, 
  calculateOptotypeHeightMm, 
  mmToPixels, 
  getRandomPediatric, 
  PediatricSymbol 
} from '@optotipo/shared';
import { OptotypeRenderer } from '../components/OptotypeRenderer';
import { Sparkles, Shuffle, Eye, ChevronUp, ChevronDown, ArrowLeft } from 'lucide-react';
import { useDPad } from '../components/DPadNavigation';

interface PediatricModuleProps {
  distanceMeters?: number;
  pixelsPerMm?: number;
  onBackToMenu?: () => void;
}

export const PediatricModule: React.FC<PediatricModuleProps> = ({ 
  distanceMeters = 3.5, 
  pixelsPerMm,
  onBackToMenu 
}) => {
  const [acuityIndex, setAcuityIndex] = useState<number>(8); // Padrão 20/50
  const [symbols, setSymbols] = useState<PediatricSymbol[]>([]);
  const [mode, setMode] = useState<'line' | 'isolated' | 'crowding'>('line');
  const [eye, setEye] = useState<'OD' | 'OE' | 'AO'>('AO');

  const currentAcuity = STANDARD_ACUITY_LEVELS[acuityIndex] || STANDARD_ACUITY_LEVELS[8];
  const safePpm = Math.max(1, pixelsPerMm || 2.5);
  const heightMm = calculateOptotypeHeightMm(currentAcuity.relativeScale, distanceMeters);
  const sizePx = Math.max(20, mmToPixels(heightMm, safePpm));

  const randomize = () => {
    setSymbols(getRandomPediatric(4));
  };

  useEffect(() => {
    randomize();
  }, [acuityIndex]);

  const increaseAcuity = () => {
    setAcuityIndex(prev => Math.min(STANDARD_ACUITY_LEVELS.length - 1, prev + 1));
  };

  const decreaseAcuity = () => {
    setAcuityIndex(prev => Math.max(0, prev - 1));
  };

  useDPad({
    onUp: () => decreaseAcuity(), // Linha maior
    onDown: () => increaseAcuity(), // Linha menor
    onSelect: () => randomize(),
    onLeft: () => randomize(),
    onRight: () => randomize(),
    onBack: () => {
      if (onBackToMenu) onBackToMenu();
    }
  });

  const visibleSymbols = (mode === 'isolated' || mode === 'crowding') ? [symbols[0] || 'house'] : symbols;
  // Espaçamento de 2,0 cm (20 mm) físico na tela entre cada figura infantil
  const gap2cmPx = Math.round(20 * safePpm);
  const gapPx = Math.max(75, gap2cmPx);

  return (
    <div className="w-full h-full flex flex-col bg-sky-50 text-slate-900 select-none overflow-hidden relative">
      {/* Barra Superior Lúdica */}
      <div className="w-full bg-white border-b border-sky-200 px-6 py-2.5 flex items-center justify-between text-xs shadow-sm z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToMenu}
            className="flex items-center gap-1.5 bg-sky-100 hover:bg-sky-200 text-sky-900 px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-sky-700" />
            <span>Voltar</span>
          </button>
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span className="font-black text-sky-950 text-base tracking-wide">AVALIAÇÃO PEDIÁTRICA INFANTIL</span>
          <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[11px]">LÚDICO</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setEye(prev => prev === 'OD' ? 'OE' : prev === 'OE' ? 'AO' : 'OD')}
            className={`px-3 py-1 rounded-full font-bold flex items-center gap-1 text-xs text-white cursor-pointer ${
              eye === 'OD' ? 'bg-emerald-500' : eye === 'OE' ? 'bg-amber-500' : 'bg-blue-500'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{eye}</span>
          </button>

          <span className="font-mono font-black text-sm bg-sky-100 text-sky-900 px-3 py-1 rounded-lg">
            {currentAcuity.snellen20}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={decreaseAcuity}
              className="px-2.5 py-1 bg-sky-100 hover:bg-sky-200 text-sky-900 rounded-lg font-bold flex items-center gap-0.5 cursor-pointer"
              title="Figura Maior [▲]"
            >
              <ChevronUp className="w-4 h-4" /> Maior
            </button>
            <button
              type="button"
              onClick={increaseAcuity}
              className="px-2.5 py-1 bg-sky-100 hover:bg-sky-200 text-sky-900 rounded-lg font-bold flex items-center gap-0.5 cursor-pointer"
              title="Figura Menor [▼]"
            >
              <ChevronDown className="w-4 h-4" /> Menor
            </button>
          </div>

          <button
            type="button"
            onClick={randomize}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold flex items-center gap-1 shadow cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" /> Trocar Figuras
          </button>

          <div className="flex bg-sky-100 p-0.5 rounded-lg border border-sky-200">
            {(['line', 'isolated', 'crowding'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-md font-bold capitalize text-xs transition-colors cursor-pointer ${
                  mode === m ? 'bg-sky-600 text-white shadow-sm' : 'text-sky-800 hover:bg-sky-200'
                }`}
              >
                {m === 'line' ? 'Linha' : m === 'isolated' ? 'Isolado' : 'Crowding'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Área Central com Símbolos Geométricos Infantis Sem Sobreposição */}
      <div 
        onClick={randomize}
        className="flex-1 w-full flex items-center justify-center p-8 bg-white overflow-hidden cursor-pointer"
      >
        <div 
          className="flex flex-row items-center justify-center flex-nowrap max-w-[95vw] overflow-visible"
          style={{ gap: `${gapPx}px` }}
        >
          {visibleSymbols.map((sym, idx) => (
            <div 
              key={idx} 
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: `${sizePx}px`,
                height: `${sizePx}px`,
                minWidth: `${sizePx}px`,
                minHeight: `${sizePx}px`,
                maxWidth: `${sizePx}px`,
                maxHeight: `${sizePx}px`,
                boxSizing: 'border-box'
              }}
            >
              <OptotypeRenderer
                type="pediatric"
                value={sym}
                sizePx={sizePx}
                color="#000000"
                crowding={mode === 'crowding'}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Barra Inferior com Dica de Uso */}
      <div className="w-full bg-sky-100 border-t border-sky-200 px-6 py-2 flex items-center justify-between text-xs text-sky-900 font-medium">
        <span>Símbolos Padrão Internacional Lea (Casa, Maçã, Círculo, Quadrado)</span>
        <span className="font-mono text-slate-500">Controle Remoto: [▲ / ▼] Muda tamanho • [OK] Troca figuras • [VOLTAR] Menu</span>
      </div>
    </div>
  );
};
