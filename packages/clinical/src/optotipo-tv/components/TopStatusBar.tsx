import React, { useState, useEffect } from 'react';
import { EyeTested } from '@optotipo/shared';
import { CheckCircle2, AlertTriangle, Wifi, WifiOff, Maximize, Minimize, ArrowLeft, ExternalLink } from 'lucide-react';

interface TopStatusBarProps {
  isCalibrated: boolean;
  distanceMeters: number;
  currentEye?: EyeTested;
  isLanConnected: boolean;
  roomName: string;
  isDisplayMode?: boolean;
  onBack?: () => void;
  isStandalone?: boolean;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  isCalibrated,
  distanceMeters,
  currentEye = 'AO',
  isLanConnected,
  roomName,
  isDisplayMode = false,
  onBack,
  isStandalone = false
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Durante a exibição dos testes clínicos, não exibe nenhuma barra para não obstruir os dados
  if (isDisplayMode) {
    return null;
  }

  // Barra de status limpa e discreta no topo do menu principal (fundo claro)
  return (
    <header className="w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-2 flex items-center justify-between text-xs select-none z-40 shadow-xs">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 font-bold transition-all cursor-pointer text-xs"
            title="Voltar ao Painel da Clínica"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Sistema</span>
          </button>
        )}
        <div className="flex items-center gap-2.5 text-slate-500 font-medium">
          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/60">{roomName}</span>
          <span>•</span>
          <span>Distância: <b className="text-slate-900">{distanceMeters.toFixed(1)}m</b></span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {!isStandalone && (
          <button
            onClick={() => window.open(window.location.origin + '/?optotype=1', '_blank')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold text-[11px] transition-colors cursor-pointer"
            title="Abrir a TV Optotipo em uma aba dedicada (ideal para TV/Segunda Tela)"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Abrir em Nova Aba</span>
          </button>
        )}
        {/* Status de Calibração */}
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
          isCalibrated 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          {isCalibrated ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Calibrado (100mm OK)</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span>Calibração Pendente</span>
            </>
          )}
        </div>

        {/* Status LAN */}
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
          isLanConnected 
            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
            : 'bg-slate-100 text-slate-500 border border-slate-200'
        }`}>
          {isLanConnected ? (
            <>
              <Wifi className="w-3 h-3 text-blue-600" />
              <span>Rede LAN Conectada</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-slate-400" />
              <span>Modo Offline</span>
            </>
          )}
        </div>

        {/* Botão de Tela Cheia */}
        <button
          onClick={toggleFullscreen}
          className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
        >
          {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};
