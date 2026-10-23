import React, { useState } from 'react';
import { 
  ActiveModuleType, 
  EyeTested, 
  OptotypeType, 
  STANDARD_ACUITY_LEVELS 
} from '@optotipo/shared';
import { 
  Tv, 
  Shuffle, 
  Eye, 
  ChevronUp, 
  ChevronDown, 
  Check, 
  X, 
  HelpCircle, 
  Compass, 
  ShieldCheck, 
  SunMedium, 
  Grid, 
  Sparkles, 
  Moon, 
  Sun,
  Home,
  Type,
  Binary,
  Compass as CompassIcon,
  Smile,
  Flame,
  Smartphone,
  Play,
  Pause,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Focus
} from 'lucide-react';
import { lanController } from '../services/lanController';
import { FireTVPairingModal } from './FireTVPairingModal';

interface RemoteControlPanelProps {
  onAcuityRecorded?: (eye: EyeTested, acuitySnellen: string, correct: boolean, target?: 'av_sc' | 'refraction') => void;
  defaultRecordTarget?: 'av_sc' | 'refraction';
  isStandalone?: boolean;
}

export const RemoteControlPanel: React.FC<RemoteControlPanelProps> = ({ 
  onAcuityRecorded,
  defaultRecordTarget = 'refraction',
  isStandalone = false
}) => {
  const [recordTarget, setRecordTarget] = useState<'av_sc' | 'refraction'>(defaultRecordTarget);
  const [activeEye, setActiveEye] = useState<EyeTested>('OD');
  const [selectedAcuity, setSelectedAcuity] = useState<string>('20/20');
  const [selectedOptotype, setSelectedOptotype] = useState<OptotypeType>('sloan');
  const [isScreenSaver, setIsScreenSaver] = useState<boolean>(false);
  const [activeModule, setActiveModule] = useState<ActiveModuleType | 'menu'>('av_distance');
  const [lastSentFeedback, setLastSentFeedback] = useState<string | null>(null);
  const [isPairingOpen, setIsPairingOpen] = useState<boolean>(false);
  const [isTvOnline, setIsTvOnline] = useState<boolean>(lanController.isTvOnline());
  const [pairedRoom, setPairedRoom] = useState<string>(lanController.getPairedRoom());
  const [selectedDistance, setSelectedDistance] = useState<number>(3.5);

  // Escuta status de conectividade e presença da TV na sala
  React.useEffect(() => {
    const handleStatus = (e: any) => {
      if (e.detail) {
        setIsTvOnline(e.detail.isTvOnline);
        if (e.detail.pairedRoom) setPairedRoom(e.detail.pairedRoom);
      }
    };
    window.addEventListener('optomed_tv_status_changed', handleStatus);
    lanController.queryRoomDevices();
    return () => window.removeEventListener('optomed_tv_status_changed', handleStatus);
  }, []);

  // Atalhos Globais do Teclado para o Examinador no Consultório
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignora atalhos se o foco estiver dentro de um input ou textarea de texto
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'F1') {
        e.preventDefault();
        handleReturnToMenu();
      } else if (e.key === 'F2') {
        e.preventDefault();
        handleEyeChange('OD');
      } else if (e.key === 'F3') {
        e.preventDefault();
        handleEyeChange('OE');
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleEyeChange('AO');
      } else if (e.key === 'F5' || e.code === 'Space') {
        e.preventDefault();
        handleRandomize();
      } else if (e.key === 'PageUp' || e.key === 'ArrowUp') {
        e.preventDefault();
        lanController.prevLine();
        showFeedback('Linha Maior');
      } else if (e.key === 'PageDown' || e.key === 'ArrowDown') {
        e.preventDefault();
        lanController.nextLine();
        showFeedback('Linha Menor');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeEye]);

  const handleReturnToMenu = () => {
    setActiveModule('menu');
    lanController.returnToMenu();
    showFeedback('Menu Principal');
  };

  const handleSelectOptotype = (type: OptotypeType) => {
    setSelectedOptotype(type);
    setActiveModule('av_distance');
    lanController.setOptotypeType(type);
    showFeedback(`Tipo: ${type.toUpperCase()}`);
  };

  const handleSendSpecialTest = (module: ActiveModuleType) => {
    setActiveModule(module);
    lanController.setModule(module);
    lanController.setEye(activeEye);
    showFeedback(`Enviado: ${module.toUpperCase()}`);
  };

  const handleSetAcuity = (snellen: string) => {
    setSelectedAcuity(snellen);
    setActiveModule('av_distance');
    lanController.setAcuity(snellen);
    showFeedback(`AV ${snellen} (${activeEye})`);
  };

  const handleEyeChange = (eye: EyeTested) => {
    setActiveEye(eye);
    lanController.setEye(eye);
    showFeedback(`Olho: ${eye}`);
  };

  const handleDistanceChange = (meters: number) => {
    setSelectedDistance(meters);
    lanController.setDistance(meters);
    showFeedback(`Distância TV: ${meters.toFixed(1)}m`);
  };

  const handleRandomize = () => {
    lanController.randomize();
    showFeedback('Randomizado');
  };

  const handleToggleScreenSaver = () => {
    const next = !isScreenSaver;
    setIsScreenSaver(next);
    lanController.toggleScreenSaver(next);
    showFeedback(next ? 'Descanso Ativado' : 'Tela Ativa');
  };

  const handleRecordResponse = (status: 'correct' | 'incorrect' | 'unsure') => {
    if (onAcuityRecorded) {
      onAcuityRecorded(activeEye, selectedAcuity, status === 'correct', recordTarget);
    }
    const targetLabel = recordTarget === 'av_sc' ? 'AVsc' : 'Refração';
    showFeedback(`Gravado no prontuário [${targetLabel}]: ${activeEye} ${selectedAcuity} (${status.toUpperCase()})`);
  };

  const showFeedback = (text: string) => {
    setLastSentFeedback(text);
    setTimeout(() => setLastSentFeedback(null), 1800);
  };

  return (
    <div className={isStandalone ? "w-full min-h-screen bg-slate-950 text-slate-100 p-2 sm:p-4 overflow-y-auto" : "bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col select-none"}>
      {isStandalone && (
        <div className="max-w-md mx-auto mb-2 flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black tracking-wide text-white">CONTROLE REMOTO MÓVEL</h2>
              <span className="text-[10px] text-slate-400">Optotipo Meirelles • {pairedRoom}</span>
            </div>
          </div>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
            isTvOnline 
              ? 'bg-emerald-950 text-emerald-400 border-emerald-800' 
              : 'bg-rose-950 text-rose-400 border-rose-800'
          }`}>
            {isTvOnline ? 'TV CONECTADA' : 'TV OFFLINE'}
          </span>
        </div>
      )}
      <div className={isStandalone ? "max-w-md mx-auto bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col" : "contents"}>
        {/* 1. Header do Controle Remoto */}
        <div className="bg-slate-950 px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isTvOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="font-black tracking-wider text-xs text-slate-100 flex items-center gap-1.5">
              <Tv className={`w-3.5 h-3.5 ${isTvOnline ? 'text-blue-400' : 'text-slate-500'}`} />
              CONTROLE DA TV
            </span>
            <button 
              onClick={() => {
                const nextRoom = pairedRoom === 'Consultório Meirelles' ? 'Consultório 1' : 'Consultório Meirelles';
                setPairedRoom(nextRoom);
                lanController.setPairedRoom(nextRoom);
                lanController.queryRoomDevices();
              }}
              title="Clique para alternar sala (Consultório Meirelles / Consultório 1)"
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border cursor-pointer hover:opacity-80 active:scale-95 transition-all ${
                isTvOnline 
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80' 
                  : 'bg-rose-950/80 text-rose-400 border-rose-800/80'
              }`}
            >
              {pairedRoom}: {isTvOnline ? 'ONLINE' : 'OFFLINE'}
            </button>
          </div>

        <div className="flex items-center gap-1.5">
          {lastSentFeedback && (
            <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold px-2 py-0.5 rounded-full animate-fadeIn">
              {lastSentFeedback}
            </span>
          )}

          {/* Botão de Retornar ao Menu Principal da TV */}
          <button
            onClick={handleReturnToMenu}
            className="px-2 py-1 bg-blue-600/90 hover:bg-blue-600 text-white rounded-lg text-[10px] flex items-center gap-1 font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
            title="Retornar a TV ao Menu Principal"
          >
            <Home className="w-3 h-3" /> Início
          </button>

          {/* Botão Descanso */}
          <button
            onClick={handleToggleScreenSaver}
            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] flex items-center gap-1 font-bold cursor-pointer"
            title="Modo Descanso na TV"
          >
            {isScreenSaver ? <Sun className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3 text-purple-400" />}
          </button>

          {/* Botão Parear Android TV Box */}
          <button
            onClick={() => setIsPairingOpen(true)}
            className="px-2 py-1 bg-indigo-950/90 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/80 rounded-lg text-[10px] flex items-center gap-1 font-bold cursor-pointer"
            title="Parear Android TV Box & TV"
          >
            <Smartphone className="w-3 h-3 text-indigo-400" /> Parear TV
          </button>
        </div>
      </div>

      <FireTVPairingModal isOpen={isPairingOpen} onClose={() => setIsPairingOpen(false)} />

      <div className="p-3 space-y-3 text-xs">
        {/* 2. Seleção de Tipo de Teste (Letras, Números, E Direcional, Landolt C, Infantil) */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Tipo de Optotipo na TV:
          </span>
          <div className="grid grid-cols-5 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => handleSelectOptotype('sloan')}
              className={`py-1.5 px-0.5 rounded-lg font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 transition-all ${
                selectedOptotype === 'sloan' && activeModule === 'av_distance'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Letras Sloan / Snellen"
            >
              <Type className="w-3 h-3" />
              <span>Letras</span>
            </button>

            <button
              onClick={() => handleSelectOptotype('numbers')}
              className={`py-1.5 px-0.5 rounded-lg font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 transition-all ${
                selectedOptotype === 'numbers' && activeModule === 'av_distance'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Números"
            >
              <Binary className="w-3 h-3" />
              <span>Números</span>
            </button>

            <button
              onClick={() => handleSelectOptotype('tumbling_e')}
              className={`py-1.5 px-0.5 rounded-lg font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 transition-all ${
                selectedOptotype === 'tumbling_e' && activeModule === 'av_distance'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Tumbling E (Analfabetos)"
            >
              <span className="font-mono font-black text-xs leading-none">E</span>
              <span>Tumbling E</span>
            </button>

            <button
              onClick={() => handleSelectOptotype('landolt_c')}
              className={`py-1.5 px-0.5 rounded-lg font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 transition-all ${
                selectedOptotype === 'landolt_c' && activeModule === 'av_distance'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Anéis Landolt C"
            >
              <span className="font-mono font-black text-xs leading-none">C</span>
              <span>Landolt</span>
            </button>

            <button
              onClick={() => handleSelectOptotype('pediatric')}
              className={`py-1.5 px-0.5 rounded-lg font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 transition-all ${
                selectedOptotype === 'pediatric' && activeModule === 'av_distance'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Símbolos Infantis / Pediátrico"
            >
              <Smile className="w-3 h-3" />
              <span>Infantil</span>
            </button>
          </div>
        </div>

        {/* 3. Seletor de Olho: OD | OE | AO */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {(['OD', 'OE', 'AO'] as EyeTested[]).map((eye) => (
            <button
              key={eye}
              onClick={() => handleEyeChange(eye)}
              className={`py-1.5 rounded-lg font-black text-[11px] tracking-wide transition-all ${
                activeEye === eye
                  ? eye === 'OD'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : eye === 'OE'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                    : 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {eye === 'OD' ? 'OD (Direito)' : eye === 'OE' ? 'OE (Esquerdo)' : 'AO (Ambos)'}
            </button>
          ))}
        </div>

        {/* 3.1. Distância Clínica da Sala / TV (Metros) */}
        <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Distância:
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-400">
              {selectedDistance.toFixed(1)}m
            </span>
          </div>
          <div className="flex items-center gap-1">
            {[2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0].map((dist) => (
              <button
                key={dist}
                type="button"
                onClick={() => handleDistanceChange(dist)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                  selectedDistance === dist
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {dist.toFixed(1)}m
              </button>
            ))}
          </div>
        </div>

        {/* 4. Grade de Linhas Snellen */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Acuidade Visual (Snellen):
            </span>
            <span className="text-[10px] font-mono font-bold text-blue-400">
              Linha: {selectedAcuity}
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
            {STANDARD_ACUITY_LEVELS.slice(2, 14).map((lvl: any) => (
              <button
                key={lvl.id}
                onClick={() => handleSetAcuity(lvl.snellen20)}
                className={`py-1 px-0.5 rounded-lg text-[11px] font-mono font-black border transition-all text-center ${
                  selectedAcuity === lvl.snellen20 && activeModule === 'av_distance'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/40 scale-105 z-10'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {lvl.snellen20}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Ações Rápidas de Navegação (Maior / Randomizar / Menor) */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => {
              lanController.prevLine();
              showFeedback('Linha Maior');
            }}
            className="py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border border-slate-700 active:scale-95 transition-transform cursor-pointer"
          >
            <ChevronUp className="w-3.5 h-3.5 text-blue-400" /> Maior
          </button>

          <button
            onClick={handleRandomize}
            className="py-1.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-transform cursor-pointer"
          >
            <Shuffle className="w-3 h-3 text-indigo-400" /> Randomizar
          </button>

          <button
            onClick={() => {
              lanController.nextLine();
              showFeedback('Linha Menor');
            }}
            className="py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border border-slate-700 active:scale-95 transition-transform cursor-pointer"
          >
            <ChevronDown className="w-3.5 h-3.5 text-blue-400" /> Menor
          </button>
        </div>

        {/* 5.1. Controle de Execução (Iniciar / Pausar / Reiniciar / Isolar Optotipo) */}
        <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px]">
          <button
            onClick={() => {
              lanController.resumeExam();
              showFeedback('Exame Iniciado / Linha Aberta');
            }}
            className="py-1 px-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 rounded-lg font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
            title="Iniciar ou Retomar Exame com Linha Completa"
          >
            <Play className="w-3 h-3 text-emerald-400" /> Iniciar
          </button>

          <button
            onClick={() => {
              lanController.pauseExam();
              showFeedback('Exame Pausado (Optotipo Isolado)');
            }}
            className="py-1 px-1 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800/80 rounded-lg font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
            title="Pausar Exame"
          >
            <Pause className="w-3 h-3 text-amber-400" /> Pausar
          </button>

          <button
            onClick={() => {
              lanController.restartExam();
              setSelectedAcuity('20/20');
              showFeedback('Exame Reiniciado (20/20)');
            }}
            className="py-1 px-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
            title="Reiniciar Teste (Volta para 20/20)"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" /> Reiniciar
          </button>

          <button
            onClick={() => {
              lanController.toggleIsolated();
              showFeedback('Alternado Isolar / Linha');
            }}
            className="py-1 px-1 bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800/80 rounded-lg font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
            title="Isolar Estímulo"
          >
            <Focus className="w-3 h-3 text-blue-400" /> Isolar
          </button>
        </div>

        {/* 5.2. Direcionais Específicos para Tumbling E / Landolt C */}
        {(selectedOptotype === 'tumbling_e' || selectedOptotype === 'landolt_c') && (
          <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Direção Obrigatória ({selectedOptotype === 'tumbling_e' ? 'Tumbling E' : 'Landolt C'}):
            </span>
            <div className="grid grid-cols-4 gap-1">
              <button
                onClick={() => {
                  lanController.setDirection('up');
                  showFeedback('Direção: CIMA (▲)');
                }}
                className="py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
              >
                <ArrowUp className="w-3 h-3 text-emerald-400" /> Cima
              </button>
              <button
                onClick={() => {
                  lanController.setDirection('down');
                  showFeedback('Direção: BAIXO (▼)');
                }}
                className="py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
              >
                <ArrowDown className="w-3 h-3 text-amber-400" /> Baixo
              </button>
              <button
                onClick={() => {
                  lanController.setDirection('left');
                  showFeedback('Direção: ESQUERDA (◄)');
                }}
                className="py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3 text-blue-400" /> Esquerda
              </button>
              <button
                onClick={() => {
                  lanController.setDirection('right');
                  showFeedback('Direção: DIREITA (►)');
                }}
                className="py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
              >
                <ArrowRight className="w-3 h-3 text-purple-400" /> Direita
              </button>
            </div>
          </div>
        )}

        {/* 6. Testes Refrativos Especiais na TV */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Testes Especiais:
          </span>
          <div className="grid grid-cols-3 gap-1 text-[10px]">
            <button
              onClick={() => handleSendSpecialTest('bichromatic')}
              className={`p-1.5 rounded-lg font-bold flex items-center justify-center gap-1 border transition-all ${
                activeModule === 'bichromatic'
                  ? 'bg-red-600 text-white border-red-400 shadow-sm'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-red-400'
              }`}
            >
              <Compass className="w-3 h-3" /> Bicromático
            </button>

            <button
              onClick={() => handleSendSpecialTest('astigmatic_clock')}
              className={`p-1.5 rounded-lg font-bold flex items-center justify-center gap-1 border transition-all ${
                activeModule === 'astigmatic_clock'
                  ? 'bg-amber-600 text-white border-amber-400 shadow-sm'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-amber-400'
              }`}
            >
              <Compass className="w-3 h-3" /> Relógio Astig.
            </button>

            <button
              onClick={() => handleSendSpecialTest('jcc')}
              className={`p-1.5 rounded-lg font-bold flex items-center justify-center gap-1 border transition-all ${
                activeModule === 'jcc'
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-cyan-400'
              }`}
            >
              <Compass className="w-3 h-3" /> JCC Cruzado
            </button>

            <button
              onClick={() => handleSendSpecialTest('worth4dot')}
              className={`p-1.5 rounded-lg font-bold flex items-center justify-center gap-1 border transition-all ${
                activeModule === 'worth4dot'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-emerald-400'
              }`}
            >
              <ShieldCheck className="w-3 h-3" /> Worth 4 Dot
            </button>

            <button
              onClick={() => handleSendSpecialTest('amsler')}
              className={`p-1.5 rounded-lg font-bold flex items-center justify-center gap-1 border transition-all ${
                activeModule === 'amsler'
                  ? 'bg-rose-600 text-white border-rose-400 shadow-sm'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-rose-400'
              }`}
            >
              <Grid className="w-3 h-3" /> Grade Amsler
            </button>

            <button
              onClick={() => handleSendSpecialTest('contrast')}
              className={`p-1.5 rounded-lg font-bold flex items-center justify-center gap-1 border transition-all ${
                activeModule === 'contrast'
                  ? 'bg-yellow-600 text-white border-yellow-400 shadow-sm'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-yellow-400'
              }`}
            >
              <SunMedium className="w-3 h-3" /> Contraste
            </button>
          </div>
        </div>

        {/* 7. Registro Rápido da Resposta no Prontuário */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              Registrar Resposta ({activeEye} - {selectedAcuity}):
            </span>
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setRecordTarget('av_sc')}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                  recordTarget === 'av_sc'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Gravar no módulo de Acuidade Visual Sem Correção (AVsc)"
              >
                AVsc
              </button>
              <button
                type="button"
                onClick={() => setRecordTarget('refraction')}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                  recordTarget === 'refraction'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Gravar no exame de Refração Subjetiva"
              >
                Refração
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => handleRecordResponse('correct')}
              className="py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-black flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-transform cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Correto
            </button>

            <button
              onClick={() => handleRecordResponse('incorrect')}
              className="py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] font-black flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-transform cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Incorreto
            </button>

            <button
              onClick={() => handleRecordResponse('unsure')}
              className="py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 border border-slate-700 active:scale-95 transition-transform cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> Dúvida
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

