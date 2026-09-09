import React, { useState, useEffect } from 'react';
import { EyeTested } from '@optotipo/shared';
import { CheckCircle2, AlertTriangle, Wifi, WifiOff, Maximize, Minimize } from 'lucide-react';

interface TopStatusBarProps {
  isCalibrated: boolean;
  distanceMeters: number;
  currentEye?: EyeTested;
  isLanConnected: boolean;
  roomName: string;
  isDisplayMode?: boolean;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  isCalibrated,
  distanceMeters,
  currentEye = 'AO',
  isLanConnected,
  roomName,
  isDisplayMode = false
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
    <header className="w-full bg-white/80 border-b border-slate-200/80 px-6 py-1.5 flex items-center justify-between text-xs select-none z-40">
      <div className="flex items-center gap-3 text-slate-500 font-medium">
        <span className="font-bold text-slate-700">{roomName}</span>
        <span>•</span>
        <span>Distância: <b className="text-slate-900">{distanceMeters.toFixed(1)}m</b></span>
      </div>

      <div className="flex items-center gap-3">
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
