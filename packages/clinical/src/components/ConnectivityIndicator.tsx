import React, { useState, useEffect } from 'react';
import { lanController } from '../services/lanController';
import { offlineDb } from '../services/offlineDb';

/**
 * Indicador visual discreto de conectividade:
 * - Online (Verde): Conectado ao servidor e WebSocket ativo
 * - Conectando... (Amarelo): Tentando reconectar
 * - Offline - contingência (Laranja): Operando no cache local (IndexedDB/localStorage)
 * 
 * Exibe também badge discreto caso existam mutações pendentes na fila de contingência.
 */
export const ConnectivityIndicator: React.FC = () => {
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(() => lanController.isSocketConnected());
  const [isRegistered, setIsRegistered] = useState<boolean>(() => lanController.isRegisteredWithServer());
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => offlineDb.getPendingSyncCount());
  const [pingLatency, setPingLatency] = useState<number | null>(() => lanController.getPingLatencyMs());

  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleTvStatus = (e: any) => {
      if (e.detail && typeof e.detail.isSocketConnected === 'boolean') {
        setIsSocketConnected(e.detail.isSocketConnected);
      }
      if (e.detail && typeof e.detail.isRegistered === 'boolean') {
        setIsRegistered(e.detail.isRegistered);
      }
      if (e.detail && typeof e.detail.pingLatencyMs !== 'undefined') {
        setPingLatency(e.detail.pingLatencyMs);
      }
    };
    window.addEventListener('optomed_tv_status_changed', handleTvStatus);

    const handleSyncStatus = () => {
      setPendingSyncCount(offlineDb.getPendingSyncCount());
    };
    window.addEventListener('optomed_sync_status_changed', handleSyncStatus);
    window.addEventListener('storage', handleSyncStatus);

    // Verificação periódica suave de fallback espaçada (15s)
    const interval = setInterval(() => {
      setIsSocketConnected(lanController.isSocketConnected());
      setIsRegistered(lanController.isRegisteredWithServer());
      setIsBrowserOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
      setPendingSyncCount(offlineDb.getPendingSyncCount());
      setPingLatency(lanController.getPingLatencyMs());
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('optomed_tv_status_changed', handleTvStatus);
      window.removeEventListener('optomed_sync_status_changed', handleSyncStatus);
      window.removeEventListener('storage', handleSyncStatus);
      clearInterval(interval);
    };
  }, []);

  // Lógica de Estado rigorosa: só é considerado totalmente online se o WebSocket foi registrado com sucesso
  const isFullyOnline = isBrowserOnline && isSocketConnected && isRegistered;
  const isConnecting = isBrowserOnline && (!isSocketConnected || !isRegistered);

  if (isFullyOnline) {
    return (
      <div 
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-semibold select-none shadow-2xs"
        title={`Conexão Realtime ativa com o servidor LAN.${pingLatency !== null ? ` Ping: ${pingLatency}ms.` : ''}`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Online</span>
        {pingLatency !== null && (
          <span className="text-[10px] text-emerald-600 font-mono font-normal">
            {pingLatency}ms
          </span>
        )}
        {pendingSyncCount > 0 && (
          <span className="ml-1 px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-mono text-[9px] font-bold">
            {pendingSyncCount} pendente{pendingSyncCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div 
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-[11px] font-semibold select-none shadow-2xs"
        title="Tentando conectar ao servidor..."
      >
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
        <span>Conectando...</span>
      </div>
    );
  }

  return (
    <div 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-900 border border-orange-300/80 text-[11px] font-semibold select-none shadow-2xs"
      title="Sem conexão de rede. Operando em modo de contingência local offline."
    >
      <span className="w-2 h-2 rounded-full bg-orange-500" />
      <span>Offline - contingência</span>
      {pendingSyncCount > 0 && (
        <span className="ml-1 px-1.5 py-0.2 bg-orange-200 text-orange-950 border border-orange-400 rounded-full font-mono text-[9px] font-bold">
          {pendingSyncCount} salvo{pendingSyncCount > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
};
