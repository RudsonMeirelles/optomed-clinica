import React, { useState, useEffect } from 'react';
import { 
  OptotypeType, 
  EyeTested, 
  PresentationDisplayMode, 
  STANDARD_ACUITY_LEVELS, 
  AcuityLevel,
  calculateOptotypeHeightMm,
  mmToPixels,
  getRandomSloan,
  getRandomTumblingE,
  getRandomLandoltC,
  getRandomNumbers,
  getRandomPediatric,
  SloanLetter,
  TumblingEOrientation,
  LandoltCOrientation,
  NumberOptotype,
  PediatricSymbol
} from '@optotipo/shared';
import { ChevronUp, ChevronDown, Shuffle, ArrowLeft } from 'lucide-react';
import { OptotypeRenderer } from '../components/OptotypeRenderer';
import { useDPad } from '../components/DPadNavigation';
import { lanPairingService } from '../services/lanPairingService';

interface VisualAcuityDistanceProps {
  distanceMeters: number;
  pixelsPerMm: number;
  initialType?: OptotypeType;
  initialEye?: EyeTested;
  onStateChange?: (state: any) => void;
  onBackToMenu?: () => void;
}

export const VisualAcuityDistance: React.FC<VisualAcuityDistanceProps> = ({
  distanceMeters = 3.5, // Padrão calibrado do consultório (3,5 metros)
  pixelsPerMm,
  initialType = 'sloan',
  initialEye = 'OD',
  onBackToMenu
}) => {
  const [optotypeType, setOptotypeType] = useState<OptotypeType>(initialType);
  const [currentEye, setCurrentEye] = useState<EyeTested>(initialEye);
  const [acuityIndex, setAcuityIndex] = useState<number>(12); // Padrão 20/20 (índice 12)
  const [displayMode, setDisplayMode] = useState<PresentationDisplayMode>('full_line');
  const [crowding, setCrowding] = useState<boolean>(false);

  // Estímulos gerados
  const [sloanItems, setSloanItems] = useState<SloanLetter[]>([]);
  const [tumblingItems, setTumblingItems] = useState<TumblingEOrientation[]>([]);
  const [landoltItems, setLandoltItems] = useState<LandoltCOrientation[]>([]);
  const [numberItems, setNumberItems] = useState<NumberOptotype[]>([]);
  const [pediatricItems, setPediatricItems] = useState<PediatricSymbol[]>([]);
  const [isolatedIndex, setIsolatedIndex] = useState<number>(0);

  const currentAcuity: AcuityLevel = STANDARD_ACUITY_LEVELS[acuityIndex] || STANDARD_ACUITY_LEVELS[12];

  // Cálculo óptico preciso da altura do optotipo em pixels a 3.5 metros
  const safePpm = Math.max(1, pixelsPerMm || 2.5);
  const heightMm = calculateOptotypeHeightMm(currentAcuity.relativeScale, distanceMeters);
  const sizePx = Math.max(16, mmToPixels(heightMm, safePpm));

  const generateRandomStimuli = () => {
    setSloanItems(getRandomSloan(5));
    setTumblingItems(getRandomTumblingE(5));
    setLandoltItems(getRandomLandoltC(5, 4));
    setNumberItems(getRandomNumbers(5));
    setPediatricItems(getRandomPediatric(4));
    setIsolatedIndex(0);
  };

  useEffect(() => {
    generateRandomStimuli();
  }, [optotypeType, acuityIndex]);

  useEffect(() => {
    if (initialType) setOptotypeType(initialType);
  }, [initialType]);

  useEffect(() => {
    if (initialEye) setCurrentEye(initialEye);
  }, [initialEye]);

  // Navegação de linhas
  const nextLine = () => {
    if (acuityIndex < STANDARD_ACUITY_LEVELS.length - 1) {
      setAcuityIndex(prev => prev + 1);
    }
  };

  const prevLine = () => {
    if (acuityIndex > 0) {
      setAcuityIndex(prev => prev - 1);
    }
  };

  // Suporte aos comandos remotos da rede (Clinical no PC/Tablet)
  useEffect(() => {
    const unsub = lanPairingService.onMessage((msg: any) => {
      if (msg.type === 'SET_OPTOTYPE_TYPE') {
        setOptotypeType(msg.optotypeType);
      } else if (msg.type === 'SET_ACUITY') {
        const foundIdx = STANDARD_ACUITY_LEVELS.findIndex((lvl: any) => lvl.snellen20 === msg.snellen);
        if (foundIdx !== -1) {
          setAcuityIndex(foundIdx);
        }
      } else if (msg.type === 'NEXT_LINE') {
        nextLine();
      } else if (msg.type === 'PREV_LINE') {
        prevLine();
      } else if (msg.type === 'RANDOMIZE') {
        generateRandomStimuli();
      } else if (msg.type === 'SET_EYE') {
        setCurrentEye(msg.eye);
      }
    });

    return () => unsub();
  }, []);

  // Controle Remoto Físico da TV Box (▲ ▼ para linha, OK / ◄ ► para randomizar, VOLTAR para menu)
  useDPad({
    onUp: () => prevLine(), // Linha maior (ex: 20/40 -> 20/50 -> 20/200)
    onDown: () => nextLine(), // Linha menor (ex: 20/40 -> 20/30 -> 20/20)
    onSelect: () => generateRandomStimuli(),
    onLeft: () => generateRandomStimuli(),
    onRight: () => generateRandomStimuli(),
    onBack: () => {
      if (onBackToMenu) onBackToMenu();
    }
  });

  const getItemsForCurrentAcuity = () => {
    let rawList: any[] = [];
    switch (optotypeType) {
      case 'tumbling_e':
        rawList = tumblingItems.map((val, idx) => ({ key: `e_${idx}`, type: 'tumbling_e' as const, value: 'E', orientation: val }));
        break;
      case 'landolt_c':
        rawList = landoltItems.map((val, idx) => ({ key: `c_${idx}`, type: 'landolt_c' as const, value: 'C', orientation: val }));
        break;
      case 'numbers':
        rawList = numberItems.map((val, idx) => ({ key: `n_${idx}`, type: 'numbers' as const, value: val }));
        break;
      case 'pediatric':
        rawList = pediatricItems.map((val, idx) => ({ key: `p_${idx}`, type: 'pediatric' as const, value: val }));
        break;
      case 'sloan':
      default:
        rawList = sloanItems.map((val, idx) => ({ key: `s_${idx}`, type: 'sloan' as const, value: val }));
        break;
    }

    if (displayMode === 'isolated' || displayMode === 'crowding') {
      return [rawList[isolatedIndex] || rawList[0]];
    }

    // Regras Clínicas de Contagem por Linha (ISO 8596 & ETDRS)
    if (currentAcuity.snellen20 === '20/200' || currentAcuity.snellen20 === '20/400' || currentAcuity.snellen20 === '20/150') {
      return rawList.slice(0, 1);
    }
    if (currentAcuity.snellen20 === '20/100' || currentAcuity.snellen20 === '20/125') {
      return rawList.slice(0, 2);
    }
    if (currentAcuity.snellen20 === '20/70' || currentAcuity.snellen20 === '20/80') {
      return rawList.slice(0, 3);
    }
    if (currentAcuity.snellen20 === '20/50' || currentAcuity.snellen20 === '20/60' || optotypeType === 'pediatric') {
      return rawList.slice(0, 4);
    }
    return rawList.slice(0, 5);
  };

  const visibleItems = getItemsForCurrentAcuity();
  
  // Espaçamento de 2,0 cm (20 mm) físico na tela entre cada optotipo (Letras, Números, Tumbling E, Landolt)
  const gap2cmPx = Math.round(20 * safePpm);
  const letterGapPx = Math.max(75, gap2cmPx);

  return (
    <div className="w-full h-full flex flex-col bg-white text-black relative select-none overflow-hidden">
      {/* Botão de Retorno Rápido ao Menu (Clicável na tela / mouse / touch) */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (onBackToMenu) onBackToMenu();
          }}
          className="flex items-center gap-2 bg-slate-900 hover:bg-black active:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg border border-slate-700 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-blue-400" />
          <span>Menu Principal</span>
        </button>

        {/* Tipo do Teste Clicável */}
        <div className="hidden sm:flex bg-slate-100 border border-slate-300 p-1 rounded-xl gap-1 shadow-sm">
          {(['sloan', 'numbers', 'tumbling_e', 'landolt_c', 'pediatric'] as OptotypeType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setOptotypeType(t)}
              className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                optotypeType === t 
                  ? 'bg-blue-600 text-white shadow' 
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t === 'sloan' ? 'Letras' : t === 'numbers' ? 'Números' : t === 'tumbling_e' ? 'Tumbling E' : t === 'landolt_c' ? 'Landolt' : 'Infantil'}
            </button>
          ))}
        </div>
      </div>

      {/* Botões Flutuantes de Navegação de Linha e Randomização (Clicáveis) */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={prevLine}
          disabled={acuityIndex === 0}
          className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 px-3 py-2 rounded-xl border border-slate-300 shadow font-bold flex items-center gap-1 disabled:opacity-30 cursor-pointer transition-all"
          title="Aumentar Linha [▲]"
        >
          <ChevronUp className="w-4 h-4 text-emerald-600" />
          <span className="text-xs">Maior</span>
        </button>
        <button
          type="button"
          onClick={nextLine}
          disabled={acuityIndex === STANDARD_ACUITY_LEVELS.length - 1}
          className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 px-3 py-2 rounded-xl border border-slate-300 shadow font-bold flex items-center gap-1 disabled:opacity-30 cursor-pointer transition-all"
          title="Diminuir Linha [▼]"
        >
          <ChevronDown className="w-4 h-4 text-amber-600" />
          <span className="text-xs">Menor</span>
        </button>
        <button
          type="button"
          onClick={generateRandomStimuli}
          className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-3.5 py-2 rounded-xl border border-indigo-700 shadow font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          title="Randomizar Letras [OK]"
        >
          <Shuffle className="w-4 h-4 text-white" />
          <span className="text-xs">Trocar</span>
        </button>
      </div>

      {/* Área Central dos Estímulos Visuais (Generosamente Espaçada, Sem Sobreposição e Perfeitamente Enquadrada para 1600x900) */}
      <div 
        onClick={generateRandomStimuli}
        className="flex-1 w-full flex items-center justify-center p-8 sm:p-12 overflow-hidden bg-white cursor-pointer select-none"
      >
        <div 
          className="flex flex-row items-center justify-center flex-nowrap max-w-[95vw] overflow-visible"
          style={{ gap: `${letterGapPx}px` }}
        >
          {visibleItems.map((item, idx) => (
            <div 
              key={item.key || idx} 
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
                type={item.type}
                value={item.value}
                orientation={(item as any).orientation}
                sizePx={sizePx}
                color="#000000"
                crowding={crowding || displayMode === 'crowding'}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Indicador Minimalista da Acuidade Visual Atual (Canto Inferior Direito) */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-2 rounded-2xl shadow-xl border border-slate-700 z-30">
        <span className={`text-xs font-black px-2 py-0.5 rounded-md uppercase ${
          currentEye === 'OD' ? 'bg-emerald-600' : currentEye === 'OE' ? 'bg-amber-600' : 'bg-blue-600'
        }`}>
          {currentEye}
        </span>
        <span className="font-mono font-black text-lg tracking-wider text-white">
          {currentAcuity.snellen20}
        </span>
      </div>
    </div>
  );
};
