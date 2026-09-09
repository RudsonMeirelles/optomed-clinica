import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { offlineDb } from '../services/offlineDb';

export const SyncStatusBadge: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const updatePending = () => {
      setPendingCount(offlineDb.getPendingSyncCount());
    };

    updatePending();
    const interval = setInterval(updatePending, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setPendingCount(0);
    }, 1200);
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
        isOnline 
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
          : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
      }`}>
        {isOnline ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sincronizado</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-amber-600" />
            <span>Modo Offline ({pendingCount} pendente)</span>
          </>
        )}
      </div>

      {pendingCount > 0 && (
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors"
          title="Sincronizar agora"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// NOVO LOGOTIPO E CONJUNTO COMPLETO DE ÍCONES OFICIAIS OPTOMED
// -------------------------------------------------------------

// 1. Logotipo Oficial OPTOMED (Ícone Olho Geométrico com Cruz Médica e Arco Protetor + Tipografia)
export const OptomedBrandLogo: React.FC<{ size?: 'sm' | 'md' | 'lg'; showText?: boolean; className?: string }> = ({
  size = 'md',
  showText = true,
  className = ''
}) => {
  const sizeMap = {
    sm: { icon: 28, textMain: 'text-sm', textSub: 'text-[8px]' },
    md: { icon: 38, textMain: 'text-base', textSub: 'text-[10px]' },
    lg: { icon: 54, textMain: 'text-2xl', textSub: 'text-xs' }
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Ícone Vetorial Oficial OPTOMED */}
      <div 
        className="relative shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-1.5 shadow-md shadow-blue-600/30 ring-1 ring-white/20"
        style={{ width: currentSize.icon + 8, height: currentSize.icon + 8 }}
      >
        <svg 
          viewBox="0 0 64 64" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Arco Protetor Superior em Escudo / Visão */}
          <path 
            d="M8 32C8 32 18 16 32 16C46 16 56 32 56 32C56 32 46 48 32 48C18 48 8 32 8 32Z" 
            stroke="#93C5FD" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          {/* Círculo da Íris */}
          <circle cx="32" cy="32" r="10" stroke="#FFFFFF" strokeWidth="3" />
          {/* Cruz Médica no Centro da Pupila */}
          <path d="M32 27V37" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
          <path d="M27 32H37" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
          {/* Detalhe Superior de Precisão */}
          <circle cx="48" cy="20" r="2.5" fill="#34D399" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`font-black tracking-tight text-white ${currentSize.textMain} flex items-center gap-1.5`}>
            OPTOMED
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          </span>
          <span className={`font-bold tracking-wider text-teal-300 uppercase font-mono ${currentSize.textSub}`}>
            Instituto de Visão e Saúde
          </span>
        </div>
      )}
    </div>
  );
};

// 2. CONJUNTO COMPLETO DE ÍCONES DE ALTA FIDELIDADE DO SISTEMA (2-TONE BLUE & TEAL)

// Ícone Agenda / Consultório (Calendário com Pulso de Compromisso)
export const IconAgendaCalendar: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="4" width="18" height="17" rx="3" stroke="#3B82F6" strokeWidth="1.8" />
    <path d="M16 2V6M8 2V6M3 9H21" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="7.5" cy="13.5" r="1" fill="#3B82F6" />
    <circle cx="11.5" cy="13.5" r="1" fill="#3B82F6" />
    <circle cx="7.5" cy="17.5" r="1" fill="#3B82F6" />
    <circle cx="17.5" cy="17.5" r="4.5" fill="#0D9488" stroke="#14B8A6" strokeWidth="1.2" />
    <path d="M15 17.5H16.2L17 15.5L18 19.5L18.8 17.5H20" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Ícone Recepção & Pacientes (Crachá com Perfil e Documento de Registro)
export const IconPatientProfile: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="5" width="16" height="15" rx="3" stroke="#3B82F6" strokeWidth="1.8" />
    <path d="M7 2H13" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="10" cy="11" r="3" stroke="#3B82F6" strokeWidth="1.6" />
    <path d="M5.5 17C6.5 15.2 8.2 14.5 10 14.5C11.8 14.5 13.5 15.2 14.5 17" stroke="#3B82F6" strokeWidth="1.6" strokeLinecap="round" />
    <rect x="14" y="11" width="8" height="10" rx="1.5" fill="#0D9488" stroke="#14B8A6" strokeWidth="1.2" />
    <path d="M16 14H20M16 17H19" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

// Ícone Gestão da Clínica & PDV (Caixa Registradora + Maquininha e Cartão)
export const IconClinicPOS: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 14H20L19 20H5L4 14Z" stroke="#3B82F6" strokeWidth="1.8" strokeLinejoin="round" />
    <rect x="7" y="6" width="10" height="8" rx="1.5" stroke="#3B82F6" strokeWidth="1.8" />
    <path d="M10 3V6M14 3V6M9 9H15" stroke="#3B82F6" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="12" cy="17" r="1.5" fill="#14B8A6" stroke="#0D9488" strokeWidth="1" />
    <path d="M7 11H8M10 11H11M13 11H14" stroke="#14B8A6" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// Ícone Relatórios & Estatísticas (Quadro Analítico com Gráfico de Barras e Linha de Tendência)
export const IconReportsAnalytics: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="3" stroke="#3B82F6" strokeWidth="1.8" />
    <rect x="6.5" y="13" width="2.5" height="5" rx="0.5" fill="#14B8A6" />
    <rect x="11" y="9" width="2.5" height="9" rx="0.5" fill="#14B8A6" />
    <rect x="15.5" y="11" width="2.5" height="7" rx="0.5" fill="#14B8A6" />
    <path d="M6.5 11L11 7L14.5 9.5L18 5" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="18" cy="5" r="1.2" fill="#3B82F6" />
  </svg>
);

// Ícone Pareamento TV (Monitor Moderno Slim)
export const IconMonitorTV: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="4" width="20" height="14" rx="2" stroke="#3B82F6" strokeWidth="1.8" />
    <path d="M9 21H15M12 18V21" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" />
    <rect x="5" y="7" width="14" height="8" rx="1" fill="#0F172A" stroke="#14B8A6" strokeWidth="1" strokeDasharray="2 2" />
  </svg>
);

// Ícone Configurações & Licença (Engrenagem com Documento de Certificado)
export const IconSettingsLicense: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5Z" stroke="#3B82F6" strokeWidth="1.8" />
    <path d="M19.4 15A1.65 1.65 0 0 0 20 16.3L20.8 17.5L18.8 19.5L17.5 18.7A1.65 1.65 0 0 0 16.2 19.3V21H13.4V19.3A1.65 1.65 0 0 0 12.1 18.7L10.8 19.5L8.8 17.5L9.6 16.2A1.65 1.65 0 0 0 9 14.9H7.3V12.1H9A1.65 1.65 0 0 0 9.6 10.8L8.8 9.5L10.8 7.5L12.1 8.3A1.65 1.65 0 0 0 13.4 7.7V6H16.2V7.7A1.65 1.65 0 0 0 17.5 8.3L18.8 7.5L20.8 9.5L20 10.8A1.65 1.65 0 0 0 19.4 12.1V15Z" stroke="#3B82F6" strokeWidth="1.6" />
    <rect x="13" y="11" width="9" height="11" rx="1.5" fill="#0D9488" stroke="#14B8A6" strokeWidth="1.2" />
    <path d="M15 14H19M15 17H18" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="19" cy="20" r="1.5" fill="#FBBF24" />
  </svg>
);

// Ícone Sair / Logout (Porta de Saída)
export const IconDoorLogout: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M9 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H9" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M16 17L21 12L16 7" stroke="#14B8A6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 12H9" stroke="#14B8A6" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
